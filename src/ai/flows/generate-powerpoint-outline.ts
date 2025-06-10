
'use server';

/**
 * @fileOverview Generates a PowerPoint outline for a case based on case details and uploaded documents, using Perplexity API.
 *
 * - generatePowerpointOutline - A function that generates the PowerPoint outline.
 * - GeneratePowerpointOutlineInput - The input type for the generatePowerpointOutline function.
 * - GeneratePowerpointOutlineOutput - The return type for the generatePowerpointOutline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePowerpointOutlineInputSchema = z.object({
  caseTitle: z.string().describe('The title of the case.'),
  courtTribunal: z.string().describe('The court or tribunal where the case is being heard.'),
  jurisdiction: z.string().describe('The jurisdiction of the case.'),
  caseType: z.string().describe('The type of case (e.g., Criminal, Civil, Patent).'),
  plaintiffsDefendants: z.string().describe('The names of the plaintiffs and defendants in the case.'),
  briefDescription: z.string().describe('A brief description of the case.'),
  keyDates: z.string().describe('Key dates related to the case (e.g., Filing Date, Next Hearing).'),
  uploadedDocuments: z
    .array(z.string())
    .describe(
      "List of uploaded documents for the case, as data URIs. Their content (if text) will be summarized or referred to."
    ).optional(),
});
export type GeneratePowerpointOutlineInput = z.infer<
  typeof GeneratePowerpointOutlineInputSchema
>;

const GeneratePowerpointOutlineOutputSchema = z.object({
  powerpointOutline: z.string().describe('The generated PowerPoint outline for the case.'),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
});
export type GeneratePowerpointOutlineOutput = z.infer<
  typeof GeneratePowerpointOutlineOutputSchema
>;

export async function generatePowerpointOutline(
  input: GeneratePowerpointOutlineInput
): Promise<GeneratePowerpointOutlineOutput> {
  return generatePowerpointOutlineFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro'; // Corrected model name

const generatePowerpointOutlineFlow = ai.defineFlow(
  {
    name: 'generatePowerpointOutlineFlowPerplexity',
    inputSchema: GeneratePowerpointOutlineInputSchema,
    outputSchema: GeneratePowerpointOutlineOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set.');
      throw new Error('PERPLEXITY_API_KEY is not set. Please set it in your .env.local file.');
    }

    const systemPrompt = `You are an expert legal assistant tasked with generating a PowerPoint outline for a case.
Based on the provided case details and any uploaded documents, create a comprehensive and compelling PowerPoint outline that a lawyer can use for their presentation in court.
Consider the following elements when creating the outline:
- Case Title
- Court/Tribunal
- Jurisdiction
- Case Type
- Plaintiffs/Defendants
- Brief Description
- Key Dates
- Key arguments derived from the description and documents.
The output should be a list of suggested slide titles and bullet points for each slide. Be concise, clear, and persuasive.`;

    let userPromptContent = `Case Details:
Title: ${input.caseTitle}
Court/Tribunal: ${input.courtTribunal}
Jurisdiction: ${input.jurisdiction}
Case Type: ${input.caseType}
Plaintiffs/Defendants: ${input.plaintiffsDefendants}
Brief Description: ${input.briefDescription}
Key Dates: ${input.keyDates}`;

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      userPromptContent += "\n\nUploaded Documents Overview (content from data URIs):";
      input.uploadedDocuments.forEach(docDataUri => {
        try {
          const commaIndex = docDataUri.indexOf(',');
          if (commaIndex === -1) {
            userPromptContent += `\n- Document (format error: no comma in data URI)`;
            return;
          }
          const meta = docDataUri.substring(0, commaIndex); // e.g. data:text/plain;base64
          const data = docDataUri.substring(commaIndex + 1);
          let docInfo = "Document reference (unable to extract text or not a text file).";

          // Attempt to decode text content if it's a known text type
          if (meta.includes('text/plain') || meta.includes('application/json') || meta.includes('text/html') || meta.includes('text/csv')) {
            const textContent = Buffer.from(data, 'base64').toString('utf-8');
            // Include a snippet of the text content. Be mindful of token limits for the API.
            docInfo = `Text Document Snippet: ${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}`;
          } else if (meta.includes('application/pdf')) {
             // For PDFs, we can't easily extract text here without a library.
             // The prompt should instruct the model that a PDF was uploaded and it might be relevant.
            docInfo = `PDF Document named in upload (content not directly included in this prompt, but consider its relevance for arguments).`;
          } else if (meta.includes('image/')) {
            docInfo = `Image Document named in upload (visual content not processable by this text model).`;
          }
          // Add more specific MIME type handling or document name extraction if available
          userPromptContent += `\n- ${docInfo}`;
        } catch (e) {
          console.error("Error processing document data URI for prompt:", e);
          userPromptContent += `\n- Document (error processing data URI for prompt inclusion)`;
        }
      });
    } else {
      userPromptContent += "\n\nNo documents uploaded.";
    }
    userPromptContent += "\n\nPlease generate the PowerPoint outline based on all the above information.";


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
          // e.g., return_citations, return_search_results
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error:', response.status, errorBody);
        throw new Error(`Perplexity API request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const powerpointOutline = responseData.choices[0]?.message?.content || "Could not generate PowerPoint outline.";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      return {
        powerpointOutline,
        citations: citations,
        searchResults: searchResults,
      };

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generatePowerpointOutlineFlow:', error);
      // Re-throw or handle as appropriate for your application
      if (error instanceof Error) {
        throw new Error(`Failed to generate PowerPoint outline: ${error.message}`);
      }
      throw new Error('An unknown error occurred while generating the PowerPoint outline.');
    }
  }
);
