
import { config } from 'dotenv';
config({ path: '.env.local' }); // Ensure .env.local is loaded for dev CLI

import '@/ai/flows/generate-weak-points-summary.ts';
import '@/ai/flows/generate-powerpoint-outline.ts';
import '@/ai/flows/generate-chatbot-response.ts';
import '@/ai/flows/generate-case-analysis.ts'; 
import '@/ai/flows/generate-strategy-snapshot.ts';
import '@/ai/flows/generate-devils-advocate-response.ts'; // Added import for devil's advocate flow
