import { OpenAICompatibleProvider } from "./openai-compatible.js";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(baseUrl: string, apiKey?: string, idleTimeout?: number) {
    super(baseUrl, apiKey, idleTimeout, "openrouter");
  }

  // Disable and exclude reasoning — billed tokens we strip before saving anyway.
  protected override providerParams(): Record<string, unknown> {
    return { reasoning: { enabled: false, exclude: true } };
  }
}
