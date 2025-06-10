
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

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const GenerateDevilsAdvocateResponseInputSchema = z.object({
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

export const GenerateDevilsAdvocateResponseOutputSchema = z.object({
  devilReply: z.string().describe("The Devil's Advocate counter-argument or challenge."),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity if any.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity if any.'),
});
export type GenerateDevilsAdvocateResponseOutput = z.infer<
  typeof GenerateDevilsAdvocateResponseOutputSchema
>;

export async function generateDevilsAdvocateResponse(
  input: GenerateDevilsAdvocateResponseInput
): Promise<GenerateDevilsAdvocateResponseOutput> {
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
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set for Devil\'s Advocate.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    const systemPrompt = `You are the "Devil's Advocate" AI. Your role is to critically challenge the user's statements, arguments, and case strategy.
Act as a skilled opposing counsel. Your goal is to find weaknesses, unstated assumptions, potential counter-arguments, and logical fallacies in the user's input.
Be direct, incisive, and skeptical. Do not agree with the user. Your responses should provoke deeper thinking and help the user strengthen their case by anticipating opposition.
Base your counter-arguments on the provided case details, document summaries, and the ongoing conversation history.
If the user makes a statement, find a way to argue against it or point out its flaws from an adversarial perspective.`;

    const messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
        { role: 'system', content: systemPrompt }
    ];

    if (input.chatHistory) {
        input.chatHistory.forEach(histMsg => {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role !== histMsg.role) { // Maintain alternating roles
                messages.push({role: histMsg.role, content: histMsg.content});
            }
        });
    }
    
    let currentChallengePrompt = `User's statement/argument: "${input.userStatement}"`;

    if (input.caseDetails && input.caseDetails.trim() !== '{}' && input.caseDetails.trim() !== '') {
        currentChallengePrompt += `\n\nContextual Case Details (JSON format):\n${input.caseDetails}`;
    }

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      currentChallengePrompt += "\n\nContextual Uploaded Documents Overview (summaries from data URIs if text):";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) {
                    currentChallengePrompt += `\n- Document (format error)`; return;
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
                currentChallengePrompt += `\n- ${docInfo}`;
            } catch (e) {
                console.error("Error processing document data URI for Devil's Advocate prompt:", e);
                currentChallengePrompt += `\n- Document (error processing data URI)`;
            }
        } else {
            currentChallengePrompt += `\n- Document reference: ${docDataUri}`;
        }
      });
    }
    currentChallengePrompt += "\n\nAs the Devil's Advocate, provide your counter-argument or challenge to the user's statement based on all available information.";
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
        throw new Error(`Perplexity API request for Devil's Advocate failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const devilReply = responseData.choices[0]?.message?.content || "I'm having trouble formulating a challenge right now. Perhaps your argument is too perfect... or I'm momentarily stumped.";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      return {
        devilReply,
        citations: citations,
        searchResults: searchResults,
      };

    } catch (error) {
      console.error('Error in generateDevilsAdvocateResponseFlow:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get Devil's Advocate response: ${error.message}`);
      }
      throw new Error('An unknown error occurred while getting the Devil\'s Advocate response.');
    }
  }
);
