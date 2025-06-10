
'use server';

/**
 * @fileOverview Generates a "Strategy Snapshot" for a case using Perplexity API.
 *
 * - generateStrategySnapshot - A function that generates the strategy snapshot.
 * - GenerateStrategySnapshotInput - The input type for the generateStrategySnapshot function.
 * - GenerateStrategySnapshotOutput (StrategySnapshotData) - The return type from types/index.ts.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { StrategySnapshotData } from '@/types'; // Re-using the type

const GenerateStrategySnapshotInputSchema = z.object({
  caseDetails: z.string().describe('Detailed information about the case as a JSON string.'),
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names or data URIs. If data URIs, text content will be considered. Optional.').optional(),
});
export type GenerateStrategySnapshotInput = z.infer<typeof GenerateStrategySnapshotInputSchema>;

// Output schema reuses StrategySnapshotData from types, but we define it for Genkit too
const GenerateStrategySnapshotOutputSchema = z.object({
  openingStatementHook: z.string().describe("A compelling opening sentence or two for court arguments based on the case's core."),
  topStrengths: z.string().describe("Top 3 strengths of the case to emphasize, as a bulleted list."),
  topWeaknesses: z.string().describe("Top 3 weaknesses of the case to mitigate (possibly with brief suggestions), as a bulleted list."),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});

export async function generateStrategySnapshot(input: GenerateStrategySnapshotInput): Promise<StrategySnapshotData> {
  return generateStrategySnapshotFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

const generateStrategySnapshotFlow = ai.defineFlow(
  {
    name: 'generateStrategySnapshotFlowPerplexity',
    inputSchema: GenerateStrategySnapshotInputSchema,
    outputSchema: GenerateStrategySnapshotOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set for Strategy Snapshot.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    const systemPrompt = `You are an expert legal AI assistant specializing in case strategy. Based on the provided case details and any uploaded document summaries, generate a concise strategy snapshot.
Your response MUST be structured EXACTLY as follows, with each item on a new line and clearly labeled:
OPENING STATEMENT HOOK: [Your compelling opening sentence or two here]
TOP STRENGTHS TO EMPHASIZE:
- [Strength 1]
- [Strength 2]
- [Strength 3]
TOP WEAKNESSES TO MITIGATE:
- [Weakness 1, and if possible, a brief suggestion on how to address it]
- [Weakness 2, and if possible, a brief suggestion on how to address it]
- [Weakness 3, and if possible, a brief suggestion on how to address it]

Focus on actionable insights. Be direct and use bullet points for strengths and weaknesses. Ensure there are exactly three bullet points for strengths and three for weaknesses.`;

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
                console.error("Error processing document data URI for strategy snapshot prompt:", e);
                userPromptContent += `\n- Document (error processing data URI)`;
            }
        } else {
            userPromptContent += `\n- Document reference: ${docDataUri}`;
        }
      });
    } else {
      userPromptContent += "\nNo documents uploaded.";
    }
    userPromptContent += "\n\nPlease generate the strategy snapshot based on all the above information, adhering strictly to the requested output format.";

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
        console.error('Perplexity API Error for strategy snapshot:', response.status, errorBody);
        throw new Error(`Perplexity API request for strategy snapshot failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content || "";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      const extractValue = (header: string, text: string): string => {
        const regex = new RegExp(`^${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*(.+?)(?=\\n[A-Z\\s]+:|$)`, "im");
        const match = text.match(regex);
        return match && match[1] ? match[1].trim() : "Not specified";
      };
      
      const extractList = (header: string, text: string): string => {
        const upperText = text.toUpperCase();
        const upperHeader = header.toUpperCase();
        const headerIndex = upperText.indexOf(upperHeader);
        if (headerIndex === -1) return "Not specified";

        let nextHeaderIndex = -1;
        const headersToSearchForNext = ["OPENING STATEMENT HOOK:", "TOP STRENGTHS TO EMPHASIZE:", "TOP WEAKNESSES TO MITIGATE:"];
        const currentHeaderPosInSearchList = headersToSearchForNext.indexOf(upperHeader);
        
        for (let i = currentHeaderPosInSearchList + 1; i < headersToSearchForNext.length; i++) {
            const tempIdx = upperText.indexOf(headersToSearchForNext[i]);
            if (tempIdx > headerIndex) { // Ensure next header is after current one
                nextHeaderIndex = tempIdx;
                break;
            }
        }
        
        const startIndex = headerIndex + header.length +1; // +1 for the colon potentially
        const relevantText = nextHeaderIndex !== -1 ? text.substring(startIndex, nextHeaderIndex) : text.substring(startIndex);
        
        // Clean up list items
        return relevantText.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || /^\d+\./.test(line)) // Keep only lines starting with '-' or '1.' etc.
          .join('\n')
          .trim() || "Not specified";
      };

      const openingStatementHook = extractValue("OPENING STATEMENT HOOK", content);
      const topStrengths = extractList("TOP STRENGTHS TO EMPHASIZE", content);
      const topWeaknesses = extractList("TOP WEAKNESSES TO MITIGATE", content);
      
      return {
        openingStatementHook,
        topStrengths,
        topWeaknesses,
        citations,
        searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateStrategySnapshotFlow:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate strategy snapshot: ${error.message}`);
      }
      throw new Error('An unknown error occurred while generating the strategy snapshot.');
    }
  }
);
