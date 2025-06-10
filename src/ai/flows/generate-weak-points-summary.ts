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
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names or data URIs.'),
});
export type GenerateWeakPointsSummaryInput = z.infer<typeof GenerateWeakPointsSummaryInputSchema>;

const GenerateWeakPointsSummaryOutputSchema = z.object({
  strongPointsSummary: z.string().describe('A summary of the strong points of the case, as a bulleted list.'),
  weakPointsSummary: z.string().describe('A summary of the weak points of the case, as a bulleted list.'),
  // Future: Add citations and search_results if needed
  // citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  // searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});
export type GenerateWeakPointsSummaryOutput = z.infer<typeof GenerateWeakPointsSummaryOutputSchema>;

export async function generateWeakPointsSummary(input: GenerateWeakPointsSummaryInput): Promise<GenerateWeakPointsSummaryOutput> {
  return generateWeakPointsSummaryFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-medium-online'; // Example Perplexity model

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
      throw new Error('PERPLEXITY_API_KEY is not set.');
    }

    const systemPrompt = `You are an AI assistant helping lawyers prepare for their cases.
Based on the case details and uploaded documents, you will generate a summary of the strong points of the case and a summary of the weak points of the case.
Present each summary as a bulleted list.
Your response should be structured EXACTLY as follows, with no extra preamble or explanation:
STRONG POINTS:
- [bulleted list of strong points]

WEAK POINTS:
- [bulleted list of weak points]`;

    const userPrompt = `Case Details:
${input.caseDetails}

Uploaded Documents:
${input.uploadedDocuments.length > 0 ? input.uploadedDocuments.map(doc => `- ${doc.startsWith('data:') ? 'Uploaded Document (content provided in context)' : doc}`).join('\n') : 'No documents provided.'}

Please generate the strong and weak points summary.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
        console.error('Perplexity API Error:', response.status, errorBody);
        throw new Error(`Perplexity API request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content || "";
      
      // TODO: Extract citations and search_results if needed
      // const citations = responseData.choices[0]?.message?.citations;
      // const searchResults = responseData.choices[0]?.search_results;

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
      
      if (!strongPointsSummary && !weakPointsSummary && content.length > 0) {
        console.warn("Could not parse strong/weak points from Perplexity response. Output may be incomplete. Raw content:", content);
        // Fallback: if parsing fails, consider how to handle. For now, might return empty or partial.
        // If only one part is found, it will be populated. If neither, both empty.
      }

      return {
        strongPointsSummary,
        weakPointsSummary,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response:', error);
      throw error; // Re-throw to be caught by caller
    }
  }
);
