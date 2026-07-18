import type { AetherConfig } from "../config/index.js";
import type { LLMProvider } from "./types.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

export function createProvider(config: AetherConfig): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, undefined, "openai");

    case "gemini":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, undefined, "gemini");

    case "anthropic":
      // TODO: Anthropic has a different API format, needs its own provider
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, undefined, "anthropic");

    case "openrouter":
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, undefined, "openrouter");

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
