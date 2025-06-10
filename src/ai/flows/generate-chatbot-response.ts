
'use server';

/**
 * @fileOverview Generates a chatbot response using Perplexity API based on user message, chat history, case details, and documents.
 *
 * - generateChatbotResponse - A function that generates the chatbot response.
 * - GenerateChatbotResponseInput - The input type for the generateChatbotResponse function.
 * - GenerateChatbotResponseOutput - The return type for the generateChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const GenerateChatbotResponseInputSchema = z.object({
  userMessage: z.string().describe('The latest message from the user.'),
  chatHistory: z.array(ChatMessageSchema).describe('The history of the conversation so far.'),
  caseDetails: z.string().describe('Detailed information about the case as a JSON string. Optional.'),
  uploadedDocuments: z
    .array(z.string())
    .describe(
      "List of uploaded documents relevant to the case, as data URIs. Their content (if text) will be summarized or referred to. Optional."
    ).optional(),
});
export type GenerateChatbotResponseInput = z.infer<
  typeof GenerateChatbotResponseInputSchema
>;

const GenerateChatbotResponseOutputSchema = z.object({
  botReply: z.string().describe('The generated response from the chatbot.'),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});
export type GenerateChatbotResponseOutput = z.infer<
  typeof GenerateChatbotResponseOutputSchema
>;

export async function generateChatbotResponse(
  input: GenerateChatbotResponseInput
): Promise<GenerateChatbotResponseOutput> {
  return generateChatbotResponseFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

const generateChatbotResponseFlow = ai.defineFlow(
  {
    name: 'generateChatbotResponseFlowPerplexity',
    inputSchema: GenerateChatbotResponseInputSchema,
    outputSchema: GenerateChatbotResponseOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    let systemPromptContent = `You are a helpful legal assistant chatbot named Case Companion.
Your goal is to answer the user's questions accurately and concisely based on the provided context.
The context includes:
1. Current Case Details (if available).
2. Content from Uploaded Documents (if available and text-based).
3. The ongoing Chat History.
Refer to this context when formulating your answers. If the information is not in the context, say you don't have that information.
Be polite and professional.`;

    const messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
        { role: 'system', content: systemPromptContent }
    ];

    // Add existing chat history
    input.chatHistory.forEach(histMsg => {
        messages.push({role: histMsg.role, content: histMsg.content});
    });
    
    // Add current user message with context
    let currentMessageContent = `User asks: ${input.userMessage}`;

    if (input.caseDetails && input.caseDetails.trim() !== '{}' && input.caseDetails.trim() !== '') {
        currentMessageContent += `\n\nRelevant Case Details (JSON format):\n${input.caseDetails}`;
    }

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      currentMessageContent += "\n\nUploaded Documents Overview (content from data URIs, if text-based):";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) {
                    currentMessageContent += `\n- Document (format error: no comma in data URI)`;
                    return;
                }
                const meta = docDataUri.substring(0, commaIndex);
                const data = docDataUri.substring(commaIndex + 1);
                let docInfo = "Document (non-text or error processing).";

                if (meta.includes('text/plain') || meta.includes('application/json') || meta.includes('text/html') || meta.includes('text/csv')) {
                    const textContent = Buffer.from(data, 'base64').toString('utf-8');
                    docInfo = `Text Document Snippet: ${textContent.substring(0, 300)}${textContent.length > 300 ? '...' : ''}`;
                } else if (meta.includes('application/pdf')) {
                    docInfo = `PDF Document (content not directly included, but note its presence for context).`;
                } else if (meta.includes('image/')) {
                    docInfo = `Image Document (visual content, not processed as text).`;
                }
                currentMessageContent += `\n- ${docInfo}`;
            } catch (e) {
                console.error("Error processing document data URI for chatbot prompt:", e);
                currentMessageContent += `\n- Document (error processing data URI for prompt inclusion)`;
            }
        } else {
            currentMessageContent += `\n- Document reference: ${docDataUri}`;
        }
      });
    }
    currentMessageContent += "\n\nPlease provide your answer based on all the above information and the chat history.";

    messages.push({role: 'user', content: currentMessageContent});

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
          // return_citations: true, // Enable if you want to process citations
          // return_search_results: true, // Enable for search results
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error for chatbot:', response.status, errorBody);
        throw new Error(`Perplexity API request for chatbot failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const botReply = responseData.choices[0]?.message?.content || "Sorry, I couldn't generate a response at this moment.";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      return {
        botReply,
        citations: citations,
        searchResults: searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateChatbotResponseFlow:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate chatbot response: ${error.message}`);
      }
      throw new Error('An unknown error occurred while generating the chatbot response.');
    }
  }
);
