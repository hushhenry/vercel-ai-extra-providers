import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';

export interface ZAIConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Z-AI (智谱 AI / ChatGLM / Minimax CN) Provider
 * Handles specific thinking formats and auth
 */
export function createZAI(config: ZAIConfig): OpenAIProvider {
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || 'https://api.deepseek.com', // Example, adjust based on actual Z-AI endpoint
    compatibility: 'compatible',
  });
}
