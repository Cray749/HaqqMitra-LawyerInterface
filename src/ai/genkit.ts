
import {genkit} from 'genkit';

// Configure Genkit without default model plugins, as Perplexity will be called directly.
// Flows will still be defined using ai.defineFlow for structure.
export const ai = genkit({
  plugins: [
    // googleAI() // Removed
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed, model will be specified in Perplexity API calls
});
