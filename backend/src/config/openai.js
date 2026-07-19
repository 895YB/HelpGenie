import OpenAI from 'openai';
import { env } from './env.js';

// Singleton client — shared across all services
const openaiClient = new OpenAI({
  apiKey: env.openaiApiKey,
  maxRetries: 3,          // built-in retry on 429 / 5xx
  timeout: 60_000,        // 60 s timeout for long completions
});

export default openaiClient;
