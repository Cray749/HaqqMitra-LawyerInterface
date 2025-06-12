
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
import type { GenerateChatbotResponseOutput as AppGenerateChatbotResponseOutput } from '@/types';


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
  botReply: z.string().describe('The generated response from the chatbot, potentially using simple HTML for structure.'),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
  error: z.string().optional().describe('An error message if generation failed.'),
});
export type GenerateChatbotResponseOutput = z.infer<
  typeof GenerateChatbotResponseOutputSchema
>;

export async function generateChatbotResponse(
  input: GenerateChatbotResponseInput
): Promise<AppGenerateChatbotResponseOutput> { // Use the more specific type from @/types
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
  async (input): Promise<AppGenerateChatbotResponseOutput> => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set.');
      return { botReply: "<p>Sorry, I cannot process your request at the moment. The API key is missing.</p>", error: 'PERPLEXITY_API_KEY is not set.' };
    }

    let systemPromptContent = `You are a helpful legal assistant chatbot named Case Companion.
Your goal is to answer the user's questions accurately and concisely based on the provided context.
Format your response using simple HTML tags for enhanced readability and structure. You can use tags like:
- <p> for paragraphs (use these as the primary way to structure distinct thoughts).
- <ul> for unordered lists and <li> for list items.
- <strong> for important terms or to highlight key information.
- <em> for emphasis.
- <br> for line breaks if absolutely necessary within a paragraph, but prefer separate <p> tags.
Do NOT use complex HTML, any CSS styling (e.g., style attributes), or any <script> tags.
The context includes:
1. Current Case Details (if available).
2. Content from Uploaded Documents (if available and text-based).
3. The ongoing Chat History.
Refer to this context when formulating your answers. If the information is not in the context, say you don't have that information.
Be polite and professional. Ensure your entire response is wrapped in appropriate HTML, starting with a <p> tag or similar.`;

    const messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
        { role: 'system', content: systemPromptContent }
    ];

    input.chatHistory.forEach(histMsg => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role !== histMsg.role) {
            messages.push({role: histMsg.role, content: histMsg.content});
        }
    });
    
    let currentMessageContent = `<p>User asks: ${input.userMessage}</p>`;

    if (input.caseDetails && input.caseDetails.trim() !== '{}' && input.caseDetails.trim() !== '') {
        currentMessageContent += `<p><strong>Relevant Case Details (JSON format):</strong><br><pre><code>${input.caseDetails}</code></pre></p>`;
    }

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      currentMessageContent += "<p><strong>Uploaded Documents Overview:</strong></p><ul>";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) {
                    currentMessageContent += `<li>Document (format error: no comma in data URI)</li>`;
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
                currentMessageContent += `<li>${docInfo}</li>`;
            } catch (e) {
                console.error("Error processing document data URI for chatbot prompt:", e);
                currentMessageContent += `<li>Document (error processing data URI for prompt inclusion)</li>`;
            }
        } else {
            currentMessageContent += `<li>Document reference: ${docDataUri}</li>`;
        }
      });
      currentMessageContent += "</ul>";
    }
    currentMessageContent += "<p>Please provide your answer in simple HTML format based on all the above information and the chat history.</p>";

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
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error for chatbot:', response.status, errorBody);
        return { botReply: `<p>Sorry, an API error occurred: ${errorBody}</p>`, error: `Perplexity API request failed: ${response.status}` };
      }

      const responseData = await response.json();
      const botReply = responseData.choices[0]?.message?.content || "<p>Sorry, I couldn't generate a response at this moment.</p>";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      return {
        botReply,
        citations: citations,
        searchResults: searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateChatbotResponseFlow:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { botReply: `<p>An unexpected error occurred: ${message}</p>`, error: `Failed to generate chatbot response: ${message}` };
    }
  }
);

    