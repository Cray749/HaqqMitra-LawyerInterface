// src/ai/flows/generate-weak-points-summary.ts
'use server';

/**
 * @fileOverview Generates a summary of the weak points of a case based on uploaded documents and case details.
 *
 * - generateWeakPointsSummary - A function that generates the weak points summary.
 * - GenerateWeakPointsSummaryInput - The input type for the generateWeakPointsSummary function.
 * - GenerateWeakPointsSummaryOutput - The return type for the generateWeakPointsSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeakPointsSummaryInputSchema = z.object({
  caseDetails: z.string().describe('Detailed information about the case.'),
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names.'),
});
export type GenerateWeakPointsSummaryInput = z.infer<typeof GenerateWeakPointsSummaryInputSchema>;

const GenerateWeakPointsSummaryOutputSchema = z.object({
  weakPointsSummary: z.string().describe('A summary of the weak points of the case.'),
});
export type GenerateWeakPointsSummaryOutput = z.infer<typeof GenerateWeakPointsSummaryOutputSchema>;

export async function generateWeakPointsSummary(input: GenerateWeakPointsSummaryInput): Promise<GenerateWeakPointsSummaryOutput> {
  return generateWeakPointsSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeakPointsSummaryPrompt',
  input: {schema: GenerateWeakPointsSummaryInputSchema},
  output: {schema: GenerateWeakPointsSummaryOutputSchema},
  prompt: `You are an AI assistant helping lawyers prepare for their cases. Based on the case details and uploaded documents,
you will generate a summary of the weak points of the case.

Case Details: {{{caseDetails}}}
Uploaded Documents: {{#each uploadedDocuments}}{{{this}}}, {{/each}}

Summary of Weak Points:`,
});

const generateWeakPointsSummaryFlow = ai.defineFlow(
  {
    name: 'generateWeakPointsSummaryFlow',
    inputSchema: GenerateWeakPointsSummaryInputSchema,
    outputSchema: GenerateWeakPointsSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
