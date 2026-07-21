import type { AetherConfig } from "../config/index.js";
import type { LLMProvider } from "./types.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { OpenRouterProvider } from "./openrouter.js";
import { AnthropicProvider } from "./anthropic.js";

export function createProvider(config: AetherConfig): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.timeout, "openai");

    case "gemini":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.timeout, "gemini");

    case "anthropic":
      // Native Messages API — Anthropic is not OpenAI-compatible.
      return new AnthropicProvider(config.baseUrl, config.apiKey, config.timeout);

    case "openrouter":
      return new OpenRouterProvider(config.baseUrl, config.apiKey, config.timeout);

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
