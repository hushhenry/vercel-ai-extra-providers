import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { type LanguageModelV1 } from '@ai-sdk/provider';

export interface GitHubCopilotConfig {
  accessToken: string;
}

export function createGitHubCopilot(config: GitHubCopilotConfig): OpenAIProvider {
  return createOpenAI({
    apiKey: config.accessToken,
    baseURL: 'https://api.githubcopilot.com',
    headers: {
      'Editor-Version': 'vscode/1.95.3',
      'Editor-Plugin-Version': 'copilot/1.241.0',
      'User-Agent': 'GithubCopilot/1.241.0',
      'X-GitHub-Api-Version': '2023-07-07',
    },
  });
}

/**
 * Enhanced GitHub Copilot Model that automatically adds X-Initiator headers
 */
export class GitHubCopilotModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  private baseModel: LanguageModelV1;

  constructor(model: LanguageModelV1) {
    this.baseModel = model;
  }

  get modelId() { return this.baseModel.modelId; }
  get provider() { return 'github-copilot'; }
  get defaultObjectGenerationMode() { return this.baseModel.defaultObjectGenerationMode; }

  async doGenerate(options: any) {
    const initiator = this.inferInitiator(options.messages);
    options.headers = { ...options.headers, 'X-Initiator': initiator };
    return this.baseModel.doGenerate(options);
  }

  async doStream(options: any) {
    const initiator = this.inferInitiator(options.messages);
    options.headers = { ...options.headers, 'X-Initiator': initiator };
    return this.baseModel.doStream(options);
  }

  private inferInitiator(messages: any[]): 'user' | 'agent' {
    const last = messages[messages.length - 1];
    return last && last.role !== 'user' ? 'agent' : 'user';
  }
}
