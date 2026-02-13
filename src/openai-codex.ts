import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';

export interface OpenAICodexConfig {
  apiKey: string;
}

export function createOpenAICodex(config: OpenAICodexConfig): OpenAIProvider {
  return createOpenAI({
    apiKey: config.apiKey,
    headers: {
      'Openai-Intent': 'conversation-edits',
    },
  });
}
