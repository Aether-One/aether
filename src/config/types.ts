export interface AetherConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  baseUrl: string;
  apiKey?: string;
  /**
   * Idle timeout in ms — abort a request only after this long with no data.
   * Optional; the provider picks a sensible default. Raise it for very slow
   * free-tier models with long queue times.
   */
  timeout?: number;
}
