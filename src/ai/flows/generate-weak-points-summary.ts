
'use server';

/**
 * @fileOverview Generates a summary of the strong and weak points of a case based on case details and uploaded documents, using Perplexity API.
 *
 * - generateWeakPointsSummary - A function that generates the strong and weak points summary.
 * - GenerateWeakPointsSummaryInput - The input type for the generateWeakPointsSummary function.
 * - GenerateWeakPointsSummaryOutput - The return type for the generateWeakPointsSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeakPointsSummaryInputSchema = z.object({
  caseDetails: z.string().describe('Detailed information about the case as a JSON string.'),
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names or data URIs. If data URIs, text content will be considered.'),
});
export type GenerateWeakPointsSummaryInput = z.infer<typeof GenerateWeakPointsSummaryInputSchema>;

const GenerateWeakPointsSummaryOutputSchema = z.object({
  strongPointsSummary: z.string().describe('A summary of the strong points of the case, as a bulleted list.'),
  weakPointsSummary: z.string().describe('A summary of the weak points of the case, as a bulleted list.'),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});
export type GenerateWeakPointsSummaryOutput = z.infer<typeof GenerateWeakPointsSummaryOutputSchema>;

export async function generateWeakPointsSummary(input: GenerateWeakPointsSummaryInput): Promise<GenerateWeakPointsSummaryOutput> {
  return generateWeakPointsSummaryFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro'; // Corrected model name

const generateWeakPointsSummaryFlow = ai.defineFlow(
  {
    name: 'generateWeakPointsSummaryFlowPerplexity',
    inputSchema: GenerateWeakPointsSummaryInputSchema,
    outputSchema: GenerateWeakPointsSummaryOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    const systemPrompt = `You are an AI assistant helping lawyers prepare for their cases.
Based on the case details and content from any uploaded text documents, you will generate a summary of the strong points of the case and a summary of the weak points of the case.
Present each summary as a bulleted list.
Your response should be structured EXACTLY as follows, with no extra preamble or explanation:
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
                console.error("Error processing document data URI for weak points summary prompt:", e);
                userPromptContent += `\n- Document (error processing data URI)`;
            }
        } else {
            // If it's not a data URI, treat it as a name/placeholder
            userPromptContent += `\n- Document reference: ${docDataUri}`;
        }
      });
    } else {
      userPromptContent += "\nNo documents uploaded.";
    }
    userPromptContent += "\n\nPlease generate the strong and weak points summary.";


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
          // You can add other Perplexity-specific parameters here if needed
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error:', response.status, errorBody);
        throw new Error(`Perplexity API request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content || "";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      let strongPointsSummary = "";
      let weakPointsSummary = "";

      const strongPointsHeader = "STRONG POINTS:";
      const weakPointsHeader = "WEAK POINTS:";

      const strongPointsStartIndex = content.indexOf(strongPointsHeader);
      const weakPointsStartIndex = content.indexOf(weakPointsHeader);

      if (strongPointsStartIndex !== -1) {
        const endOfStrongPoints = weakPointsStartIndex !== -1 ? weakPointsStartIndex : content.length;
        strongPointsSummary = content.substring(strongPointsStartIndex + strongPointsHeader.length, endOfStrongPoints).trim();
      }

      if (weakPointsStartIndex !== -1) {
        weakPointsSummary = content.substring(weakPointsStartIndex + weakPointsHeader.length).trim();
      }
      
      if (!strongPointsSummary && !weakPointsSummary && content.length > 0 && (!content.includes(strongPointsHeader) || !content.includes(weakPointsHeader))) {
        console.warn("Could not parse strong/weak points from Perplexity response using headers. Output may be incomplete. Raw content:", content);
        // Fallback: If headers aren't found, and content exists, assign the whole content to strong points as a last resort, or handle as error.
        // This might indicate the model didn't follow the structured output format.
        // For now, we'll leave them potentially empty if parsing fails, to avoid incorrect assignments.
      }


      return {
        strongPointsSummary,
        weakPointsSummary,
        citations,
        searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateWeakPointsSummaryFlow:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate weak points summary: ${error.message}`);
      }
      throw new Error('An unknown error occurred while generating the weak points summary.');
    }
  }
);
