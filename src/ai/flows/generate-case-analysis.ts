
'use server';

/**
 * @fileOverview Generates a comprehensive case analysis including costs, duration, win/loss probabilities, and strong/weak points using Perplexity API.
 *
 * - generateCaseAnalysis - A function that generates the case analysis.
 * - GenerateCaseAnalysisInput - The input type for the generateCaseAnalysis function.
 * - GenerateCaseAnalysisOutput - The return type for the generateCaseAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCaseAnalysisInputSchema = z.object({
  caseDetails: z.string().describe('Detailed information about the case as a JSON string.'),
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names or data URIs. If data URIs, text content will be considered.'),
});
export type GenerateCaseAnalysisInput = z.infer<typeof GenerateCaseAnalysisInputSchema>;

const GenerateCaseAnalysisOutputSchema = z.object({
  estimatedCost: z.string().describe('Estimated legal costs for the case in Indian Rupees (INR) (e.g., "₹10,000 - ₹20,000").'),
  expectedDuration: z.string().describe('Expected duration of the case (e.g., "6-12 months").'),
  winProbability: z.number().describe('Estimated win probability as a percentage (0-100).'),
  lossProbability: z.number().describe('Estimated loss probability as a percentage (0-100).'),
  strongPointsSummary: z.string().describe('A summary of the strong points of the case, as a bulleted list.'),
  weakPointsSummary: z.string().describe('A summary of the weak points of the case, as a bulleted list.'),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});
export type GenerateCaseAnalysisOutput = z.infer<typeof GenerateCaseAnalysisOutputSchema>;

export async function generateCaseAnalysis(input: GenerateCaseAnalysisInput): Promise<GenerateCaseAnalysisOutput> {
  return generateCaseAnalysisFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

const generateCaseAnalysisFlow = ai.defineFlow(
  {
    name: 'generateCaseAnalysisFlowPerplexity',
    inputSchema: GenerateCaseAnalysisInputSchema,
    outputSchema: GenerateCaseAnalysisOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    const systemPrompt = `You are an expert legal AI assistant. Based on the provided case details and any uploaded document summaries, analyze the case thoroughly.
Provide the following information in a structured format:
1.  Estimated Legal Costs in Indian Rupees (INR) (e.g., "₹X,XXX - ₹Y,YYY" or "Approximately ₹Z,ZZZ").
2.  Expected Case Duration (e.g., "X-Y months" or "Approx. Z weeks").
3.  Win Probability (as a percentage, e.g., "Win Probability: 75%").
4.  Loss Probability (as a percentage, e.g., "Loss Probability: 25%").
5.  Strong Points (as a bulleted list).
6.  Weak Points (as a bulleted list).

Your response should be structured EXACTLY as follows, with each item on a new line and clearly labeled:
ESTIMATED COST (INR): [Your estimation here, e.g., ₹10,000 - ₹20,000]
EXPECTED DURATION: [Your estimation here]
WIN PROBABILITY: [Percentage]%
LOSS PROBABILITY: [Percentage]%
STRONG POINTS:
- [bulleted list of strong points]
WEAK POINTS:
- [bulleted list of weak points]`;

    let userPromptContent = `Case Details (JSON format):
${input.caseDetails}
`;

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      userPromptContent += "\nUploaded Documents Overview (content from data URIs, if text-based):";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) {
                    userPromptContent += `\n- Document (format error: no comma in data URI)`;
                    return;
                }
                const meta = docDataUri.substring(0, commaIndex);
                const data = docDataUri.substring(commaIndex + 1);
                let docInfo = "Document (non-text or error processing).";

                if (meta.includes('text/plain') || meta.includes('application/json') || meta.includes('text/html') || meta.includes('text/csv')) {
                    const textContent = Buffer.from(data, 'base64').toString('utf-8');
                    docInfo = `Text Document Snippet: ${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}`;
                } else if (meta.includes('application/pdf')) {
                    docInfo = `PDF Document (content not directly included, but note its presence).`;
                } else if (meta.includes('image/')) {
                    docInfo = `Image Document (visual content, not processed as text).`;
                }
                userPromptContent += `\n- ${docInfo}`;
            } catch (e) {
                console.error("Error processing document data URI for case analysis prompt:", e);
                userPromptContent += `\n- Document (error processing data URI)`;
            }
        } else {
            userPromptContent += `\n- Document reference: ${docDataUri}`;
        }
      });
    } else {
      userPromptContent += "\nNo documents uploaded.";
    }
    userPromptContent += "\n\nPlease generate the comprehensive case analysis based on all the above information, adhering strictly to the requested output format.";

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPromptContent },
    ];

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: PERPLEXITY_MODEL,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error for case analysis:', response.status, errorBody);
        throw new Error(`Perplexity API request for case analysis failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content || "";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      const extractValue = (header: string, text: string, isNumericPercent: boolean = false): string | number => {
        const regex = new RegExp(`^${header.replace('(INR)', '\\(INR\\)')}:?\\s*(.+?)(%?)$`, "im");
        const match = text.match(regex);
        if (match && match[1]) {
          let value = match[1].trim();
          if (isNumericPercent) {
            const numericValue = parseFloat(value);
            return isNaN(numericValue) ? 0 : numericValue;
          }
          return value;
        }
        return isNumericPercent ? 0 : "Not specified";
      };
      
      const extractList = (header: string, text: string): string => {
        const headerIndex = text.toUpperCase().indexOf(header.toUpperCase());
        if (headerIndex === -1) return "Not specified";

        let nextHeaderIndex = -1;
        const headers = ["ESTIMATED COST (INR):", "EXPECTED DURATION:", "WIN PROBABILITY:", "LOSS PROBABILITY:", "STRONG POINTS:", "WEAK POINTS:"];
        const currentHeaderPos = headers.indexOf(header.toUpperCase());
        for (let i = currentHeaderPos + 1; i < headers.length; i++) {
            const tempIdx = text.toUpperCase().indexOf(headers[i]);
            if (tempIdx !== -1) {
                nextHeaderIndex = tempIdx;
                break;
            }
        }
        
        const startIndex = headerIndex + header.length;
        const relevantText = nextHeaderIndex !== -1 ? text.substring(startIndex, nextHeaderIndex) : text.substring(startIndex);
        return relevantText.trim() || "Not specified";
      };

      const estimatedCost = extractValue("ESTIMATED COST (INR)", content) as string;
      const expectedDuration = extractValue("EXPECTED DURATION", content) as string;
      const winProbability = extractValue("WIN PROBABILITY", content, true) as number;
      const lossProbability = extractValue("LOSS PROBABILITY", content, true) as number;
      const strongPointsSummary = extractList("STRONG POINTS", content);
      const weakPointsSummary = extractList("WEAK POINTS", content);
      
      return {
        estimatedCost,
        expectedDuration,
        winProbability,
        lossProbability,
        strongPointsSummary,
        weakPointsSummary,
        citations,
        searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateCaseAnalysisFlow:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate case analysis: ${error.message}`);
      }
      throw new Error('An unknown error occurred while generating the case analysis.');
    }
  }
);
