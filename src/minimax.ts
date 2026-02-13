import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';

export interface MiniMaxConfig {
  apiKey: string;
  region?: 'global' | 'cn';
}

/**
 * MiniMax Provider (Anthropic Compatible)
 * pi-ai uses the /anthropic endpoint for MiniMax
 */
export function createMiniMax(config: MiniMaxConfig): AnthropicProvider {
  const baseUrl = config.region === 'cn' 
    ? 'https://api.minimaxi.com/anthropic' 
    : 'https://api.minimax.io/anthropic';
    
  return createAnthropic({
    apiKey: config.apiKey,
    baseURL: baseUrl,
  });
}
