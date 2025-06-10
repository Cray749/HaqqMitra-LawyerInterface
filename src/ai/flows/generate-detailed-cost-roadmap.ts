
'use server';

/**
 * @fileOverview Generates a detailed cost estimation roadmap with case stages and costs in INR using Perplexity API.
 *
 * - generateDetailedCostRoadmap - A function that generates the detailed cost roadmap.
 * - GenerateDetailedCostRoadmapInput - The input type for the function.
 * - DetailedCostRoadmapOutput - The return type for the function (from types/index.ts).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { DetailedCostRoadmapOutput, CaseStageCost } from '@/types'; // Re-using the type

const GenerateDetailedCostRoadmapInputSchema = z.object({
  caseDetails: z.string().describe('Detailed information about the case as a JSON string.'),
  uploadedDocuments: z.array(z.string()).describe('List of uploaded document names or data URIs. If data URIs, text content will be considered. Optional.').optional(),
});
export type GenerateDetailedCostRoadmapInput = z.infer<typeof GenerateDetailedCostRoadmapInputSchema>;

// Schema for the expected output from Perplexity (array of stages)
const CaseStageCostSchema = z.object({
  stageName: z.string().describe('The name of the case stage.'),
  description: z.string().describe('A brief description of the stage.'),
  estimatedCostINR: z.string().describe('Estimated cost for this stage in Indian Rupees (INR).'),
});

const PerplexityResponseSchema = z.array(CaseStageCostSchema);

const GenerateDetailedCostRoadmapOutputSchema = z.object({
  stages: z.array(
    CaseStageCostSchema.extend({ id: z.string() }) // Add id client-side
  ).describe("An array of case stages with their descriptions and estimated costs in INR."),
  citations: z.array(z.any()).optional().describe('Citations from Perplexity.'),
  searchResults: z.array(z.any()).optional().describe('Search results from Perplexity.'),
  error: z.string().optional().describe('An error message if generation or parsing failed.'),
});


export async function generateDetailedCostRoadmap(input: GenerateDetailedCostRoadmapInput): Promise<DetailedCostRoadmapOutput> {
  return generateDetailedCostRoadmapFlow(input);
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

const generateDetailedCostRoadmapFlow = ai.defineFlow(
  {
    name: 'generateDetailedCostRoadmapFlowPerplexity',
    inputSchema: GenerateDetailedCostRoadmapInputSchema,
    outputSchema: GenerateDetailedCostRoadmapOutputSchema, // Using the more specific schema for Genkit definition
  },
  async (input): Promise<DetailedCostRoadmapOutput> => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set for Detailed Cost Roadmap.');
      return { stages: [], error: 'API key for Perplexity is not configured.' };
    }

    const systemPrompt = `You are an expert legal cost analyst specializing in Indian law. Based on the provided case details and document summaries, generate a detailed roadmap of the typical stages this case might go through, from initiation to potential conclusion. For each stage, provide a brief description and an estimated cost range or approximate cost *in Indian Rupees (INR)*.
Your response MUST be a JSON array of objects. Each object in the array should represent a stage and have the following three properties EXACTLY:
1. "stageName": A concise name for the stage (e.g., "Initial Consultation & Case Filing", "Discovery & Evidence Gathering", "Pre-Trial Negotiations", "Trial Proceedings", "Appeal Process (if applicable)").
2. "description": A brief 1-2 sentence explanation of what typically happens in this stage.
3. "estimatedCostINR": A string representing the estimated cost for this stage in Indian Rupees (e.g., "₹10,000 - ₹20,000", "Approx. ₹50,000").

Example of a single stage object:
{
  "stageName": "Example Stage Name",
  "description": "This is what happens in this example stage.",
  "estimatedCostINR": "₹5,000 - ₹8,000"
}
Provide at least 3-5 relevant stages for the given case type and details. If the case details are too generic, provide a general roadmap for a typical civil/criminal case in India. Ensure the output is ONLY the JSON array string and nothing else. Do not add any introductory text or explanations outside the JSON structure.`;

    let userPromptContent = `Case Details (JSON format):
${input.caseDetails}
`;

    if (input.uploadedDocuments && input.uploadedDocuments.length > 0) {
      userPromptContent += "\nUploaded Documents Overview (content from data URIs, if text-based):";
      input.uploadedDocuments.forEach(docDataUri => {
        if (docDataUri.startsWith('data:')) {
            try {
                const commaIndex = docDataUri.indexOf(',');
                if (commaIndex === -1) { userPromptContent += `\n- Document (format error)`; return; }
                const meta = docDataUri.substring(0, commaIndex);
                const data = docDataUri.substring(commaIndex + 1);
                let docInfo = "Document (non-text or error processing).";
                if (meta.includes('text/plain') || meta.includes('application/json') || meta.includes('text/html') || meta.includes('text/csv')) {
                    const textContent = Buffer.from(data, 'base64').toString('utf-8');
                    docInfo = `Text Document Snippet: ${textContent.substring(0, 300)}${textContent.length > 300 ? '...' : ''}`;
                } else if (meta.includes('application/pdf')) {
                    docInfo = `PDF Document (context).`;
                }
                userPromptContent += `\n- ${docInfo}`;
            } catch (e) {
                userPromptContent += `\n- Document (error processing data URI)`;
            }
        } else {
            userPromptContent += `\n- Document reference: ${docDataUri}`;
        }
      });
    } else {
      userPromptContent += "\nNo documents uploaded.";
    }
    userPromptContent += "\n\nPlease generate the detailed cost roadmap as a JSON array based on all the above information, adhering strictly to the requested output format.";

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
        body: JSON.stringify({ model: PERPLEXITY_MODEL, messages: messages }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Perplexity API Error for detailed cost roadmap:', response.status, errorBody);
        return { stages: [], error: `Perplexity API request failed: ${response.status} - ${errorBody}` };
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content?.trim() || "";
      
      const citations = responseData.choices[0]?.message?.citations;
      const searchResults = responseData.choices[0]?.search_results;

      let parsedStages: Omit<CaseStageCost, 'id'>[] = [];
      try {
        // Attempt to find JSON array within the content if it's not the only thing.
        const jsonMatch = content.match(/(\[[\s\S]*\])/);
        if (jsonMatch && jsonMatch[0]) {
            parsedStages = JSON.parse(jsonMatch[0]);
        } else {
            parsedStages = JSON.parse(content); // Assume content is pure JSON if no array match
        }

        // Validate with Zod schema
        const validationResult = PerplexityResponseSchema.safeParse(parsedStages);
        if (!validationResult.success) {
          console.error("Perplexity response validation error for cost roadmap:", validationResult.error.flatten());
          return { stages: [], error: `AI response format is incorrect. Details: ${validationResult.error.flatten().fieldErrors}`, citations, searchResults };
        }
        
        const stagesWithIds: CaseStageCost[] = validationResult.data.map((stage, index) => ({
          ...stage,
          id: `stage-${index}-${Date.now()}`, // Generate a unique ID
        }));

        return { stages: stagesWithIds, citations, searchResults };

      } catch (jsonError) {
        console.error('Error parsing JSON response from Perplexity for cost roadmap:', jsonError, "\nRaw content:", content);
        return { stages: [], error: 'Failed to parse cost roadmap from AI. The response was not valid JSON.', citations, searchResults };
      }

    } catch (error) {
      console.error('Error calling Perplexity API or processing response in generateDetailedCostRoadmapFlow:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { stages: [], error: `Failed to generate detailed cost roadmap: ${message}` };
    }
  }
);
