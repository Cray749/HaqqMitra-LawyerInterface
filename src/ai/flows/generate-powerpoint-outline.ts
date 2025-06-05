'use server';

/**
 * @fileOverview Generates a PowerPoint outline for a case based on case details and uploaded documents.
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
      'List of uploaded documents for the case, as data URIs that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ).optional(),
});
export type GeneratePowerpointOutlineInput = z.infer<
  typeof GeneratePowerpointOutlineInputSchema
>;

const GeneratePowerpointOutlineOutputSchema = z.object({
  powerpointOutline: z.string().describe('The generated PowerPoint outline for the case.'),
});
export type GeneratePowerpointOutlineOutput = z.infer<
  typeof GeneratePowerpointOutlineOutputSchema
>;

export async function generatePowerpointOutline(
  input: GeneratePowerpointOutlineInput
): Promise<GeneratePowerpointOutlineOutput> {
  return generatePowerpointOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePowerpointOutlinePrompt',
  input: {schema: GeneratePowerpointOutlineInputSchema},
  output: {schema: GeneratePowerpointOutlineOutputSchema},
  prompt: `You are an expert legal assistant tasked with generating a PowerPoint outline for a case.

  Based on the provided case details and uploaded documents, create a comprehensive and compelling PowerPoint outline that a lawyer can use for their presentation in court.

  Consider the following elements when creating the outline:
  - Case Title
  - Court/Tribunal
  - Jurisdiction
  - Case Type
  - Plaintiffs/Defendants
  - Brief Description
  - Key Dates
  - Key arguments

  The output should be a list of suggested slide titles and bullet points for each slide. Be concise, clear, and persuasive.

  Here are the case details:
  Case Title: {{{caseTitle}}}
  Court/Tribunal: {{{courtTribunal}}}
  Jurisdiction: {{{jurisdiction}}}
  Case Type: {{{caseType}}}
  Plaintiffs/Defendants: {{{plaintiffsDefendants}}}
  Brief Description: {{{briefDescription}}}
  Key Dates: {{{keyDates}}}
  {{~#if uploadedDocuments}}
  Uploaded Documents:
  {{~#each uploadedDocuments}}
  - {{media url=this}}
  {{~/each}}
  {{~/if}}
  `,
});

const generatePowerpointOutlineFlow = ai.defineFlow(
  {
    name: 'generatePowerpointOutlineFlow',
    inputSchema: GeneratePowerpointOutlineInputSchema,
    outputSchema: GeneratePowerpointOutlineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
