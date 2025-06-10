
import { config } from 'dotenv';
config({ path: '.env.local' }); // Ensure .env.local is loaded for dev CLI

import '@/ai/flows/generate-weak-points-summary.ts';
import '@/ai/flows/generate-powerpoint-outline.ts';
import '@/ai/flows/generate-chatbot-response.ts'; // Added this import
