
'use server';

/**
 * @fileOverview Generates a Devil's Advocate response using Perplexity API.
 *
 * - generateDevilsAdvocateResponse - A function that generates the Devil's Advocate response.
 * - GenerateDevilsAdvocateResponseInput - The input type for the function.
 * - GenerateDevilsAdvocateResponseOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateDevilsAdvocateResponseOutput as AppGenerateDevilsAdvocateResponseOutput } from '@/types';


const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const GenerateDevilsAdvocateResponseInputSchema = z.object({
  userStatement: z.string().describe("The user's current statement or argument to be challenged."),
  chatHistory: z.array(ChatMessageSchema).describe("The history of the Devil's Advocate conversation so far. Optional.").optional(),
  caseDetails: z.string().describe('Detailed information about the case as a JSON string. Optional.'),
  uploadedDocuments: z
    .array(z.string())
    .describe(
      "List of uploaded documents relevant to the case, as data URIs. Their content (if text) will be summarized or referred to. Optional."
    ).optional(),
});
export type GenerateDevilsAdvocateResponseInput = z.infer<
  typeof GenerateDevilsAdvocateResponseInputSchema
>;

// Zod schema for Genkit internal validation
const GenerateDevilsAdvocateResponseOutputSchema = z.object({
  devilReply: z.string().describe("The Devil's Advocate counter-argument or challenge, potentially using simple HTML for structure."),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity if any.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity if any.'),
  error: z.string().optional().describe('An error message if generation failed.'),
});
// Type for the actual function signature, might be slightly different due to how we handle errors
export type GenerateDevilsAdvocateResponseOutput = z.infer<
  typeof GenerateDevilsAdvocateResponseOutputSchema
>;


export async function generateDevilsAdvocateResponse(
  input: GenerateDevilsAdvocateResponseInput
): Promise<AppGenerateDevilsAdvocateResponseOutput> { // Use the more specific type from @/types
  return generateDevilsAdvocateResponseFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

const generateDevilsAdvocateResponseFlow = ai.defineFlow(
  {
    name: 'generateDevilsAdvocateResponseFlowPerplexity',
    inputSchema: GenerateDevilsAdvocateResponseInputSchema,
    outputSchema: GenerateDevilsAdvocateResponseOutputSchema,
  },
  async (input): Promise<AppGenerateDevilsAdvocateResponseOutput> => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set for Devil\'s Advocate.');
      return { devilReply: "<p>I'm unable to challenge you right now. The API key is missing.</p>", error: 'PERPLEXITY_API_KEY is not set.' };
    }

    const systemPrompt = `You are an AI acting as a skilled opposing lawyer in a court setting. Your primary objective is to represent your assigned side (Plaintiff or Defendant) and argue fiercely for victory.

Your core functions are:
1.  **Act as Opposing Counsel:** Adopt the persona of a lawyer completely, adhering to court procedures and language.
2.  **Strive for Victory:** Your responses must be strategic counter-arguments designed to undermine the opponent's position and strengthen your own.
3.  **Initiate as Opposing Side:** If the scenario implies you are the Defendant's lawyer, you will be provided the first argument from the user(plaintiff's) side. If you are the Plaintiff's lawyer, then you will make the first argument.
4.  **Be Specific and Factual:** Always include precise dates, times, and locations when relevant to an argument. Avoid vague or general statements.
5.  **Provide Citations:** If your argument relies on information from provided documents, cite the document (e.g., "As stated in Exhibit A, page 3...") or refer to the source of the information if known.
6.  **Maintain Objectivity:** Present arguments based on facts, evidence, and legal principles. Absolutely avoid personal opinions, emotional language, or speculative remarks not grounded in the case details or potential legal strategy.
7.  **Utilize Case Details and Documents:** Base your counter-arguments on the detailed case information and the content of any uploaded documents. Point out discrepancies or inconsistencies in the user's statements compared to these materials.

Format your counter-argument or challenge using simple HTML tags for enhanced readability and structure. You can use tags like:
- <p> for paragraphs (use these as the primary way to structure distinct thoughts).
- <ul> for unordered lists and <li> for list items.
- <strong> for important terms, case citations, or key points of contention.
- <em> for emphasis or rhetorical effect.
- <br> for line breaks if absolutely necessary within a paragraph, but prefer separate <p> tags.
Do NOT use complex HTML, any CSS styling (e.g., style attributes), or any <script> tags.
Ensure your entire response is wrapped in appropriate HTML, starting with a <p> tag or similar.
Your responses should be direct, professional, and legally oriented. You are here to challenge, scrutinize, and dismantle the user's position from the perspective of the opposing side, always with the goal of winning the case.`;

    const messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
        { role: 'system', content: systemPrompt }
    ];

    if (input.chatHistory) {
        input.chatHistory.forEach(histMsg => {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role !== histMsg.role) { 
                messages.push({role: histMsg.role, content: histMsg.content});
            }
        });
    }
    
    let currentChallengePrompt = `<p>User's statement/argument: "${input.userStatement}"</p>`;

    if (input.caseDetails && input.caseDetails.trim() !== '{}' && input.caseDetails.trim() !== '') {
        currentChallengePrompt += `<p><strong>Contextual Case Details (JSON format):</strong><br><pre><code>${input.caseDetails}</code></pre></p>`;
    }

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      currentChallengePrompt += "<p><strong>Contextual Uploaded Documents Overview:</strong></p><ul>";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) {
                    currentChallengePrompt += `<li>Document (format error)</li>`; return;
                }
                const meta = docDataUri.substring(0, commaIndex);
                const data = docDataUri.substring(commaIndex + 1);
                let docInfo = "Document (non-text or error processing).";
                if (meta.includes('text/plain') || meta.includes('application/json') || meta.includes('text/html') || meta.includes('text/csv')) {
                    const textContent = Buffer.from(data, 'base64').toString('utf-8');
                    docInfo = `Text Document Snippet: ${textContent.substring(0, 300)}${textContent.length > 300 ? '...' : ''}`;
                } else if (meta.includes('application/pdf')) {
                    docInfo = `PDF Document (context).`;
                } else if (meta.includes('image/')) {
                    docInfo = `Image Document (visual context).`;
                }
                currentChallengePrompt += `<li>${docInfo}</li>`;
            } catch (e) {
                console.error("Error processing document data URI for Devil's Advocate prompt:", e);
                currentChallengePrompt += `<li>Document (error processing data URI)</li>`;
            }
        } else {
            currentChallengePrompt += `<li>Document reference: ${docDataUri}</li>`;
        }
      });
      currentChallengePrompt += "</ul>";
    }
    currentChallengePrompt += "\n\n<p>As the Devil's Advocate, provide your counter-argument or challenge to the user's statement in simple HTML format based on all available information.</p>";
    messages.push({role: 'user', content: currentChallengePrompt});

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
        console.error('Perplexity API Error (Devil\'s Advocate):', response.status, errorBody);
        return { devilReply: `<p>My apologies, I encountered an API issue: ${errorBody}</p>`, error: `Perplexity API request failed: ${response.status}` };
      }

      const responseData = await response.json();
      const devilReply = responseData.choices[0]?.message?.content || "<p>I'm having trouble formulating a challenge right now. Perhaps your argument is too perfect... or I'm momentarily stumped.</p>";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      return {
        devilReply,
        citations: citations,
        searchResults: searchResults,
      };

    } catch (error) {
      console.error('Error in generateDevilsAdvocateResponseFlow:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { devilReply: `<p>An unexpected error occurred while preparing my argument: ${message}</p>`, error: `Failed to get Devil's Advocate response: ${message}` };
    }
  }
);

    