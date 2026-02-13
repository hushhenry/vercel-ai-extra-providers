import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1CallStep,
} from '@ai-sdk/provider';
import {
  FetchFunction,
} from '@ai-sdk/provider-utils';

export interface GoogleAntigravityConfig {
  projectId: string;
  accessToken: string;
  baseUrl?: string;
  fetch?: FetchFunction;
}

const DEFAULT_ENDPOINT = "https://cloudcode-pa.googleapis.com";

export class GoogleAntigravityLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = undefined;

  constructor(
    readonly modelId: string,
    readonly settings: any,
    readonly config: GoogleAntigravityConfig,
  ) {}

  get provider(): string {
    return 'google-antigravity';
  }

  async doGenerate(options: any): Promise<any> {
    throw new Error('Not implemented. Use doStream.');
  }

  async doStream(options: any): Promise<any> {
    const { messages, stopSequences, ...settings } = options;

    const requestHeaders = {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "User-Agent": "antigravity/1.15.8 darwin/arm64",
      "X-Goog-Api-Client": "gl-node/22.17.0",
    };

    const baseUrl = this.config.baseUrl || DEFAULT_ENDPOINT;
    const url = `${baseUrl}/v1internal:streamGenerateContent?alt=sse`;

    // Mapping logic for Vercel messages to Google parts
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: m.content.map((c: any) => {
        if (c.type === 'text') return { text: c.text };
        if (c.type === 'tool-call') return { functionCall: { name: c.toolName, args: c.args, id: c.toolCallId } };
        if (c.type === 'tool-result') return { functionResponse: { name: c.toolName, response: c.result } };
        return {};
      })
    }));

    const requestBody = {
      project: this.config.projectId,
      model: this.modelId,
      request: {
        contents,
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        },
      },
      requestType: "agent",
      userAgent: "antigravity",
    };

    const response = await (this.config.fetch || fetch)(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Antigravity error (${response.status}): ${errorText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                if (!jsonStr) continue;
                const chunk = JSON.parse(jsonStr);
                const parts = chunk.response?.candidates?.[0]?.content?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.text) {
                      controller.enqueue({ type: 'text-delta', textDelta: part.text });
                    }
                    if (part.functionCall) {
                      controller.enqueue({
                        type: 'tool-call',
                        toolCallType: 'function',
                        toolCallId: part.functionCall.id || `call_${Date.now()}`,
                        toolName: part.functionCall.name,
                        args: JSON.stringify(part.functionCall.args),
                      });
                    }
                  }
                }
              }
            }
            controller.enqueue({ type: 'finish', finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } });
          } catch (e) {
            controller.error(e);
          } finally {
            controller.close();
          }
        },
      }),
      rawCall: { rawPrompt: messages, rawSettings: settings },
    };
  }
}
