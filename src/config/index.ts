import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface AetherConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  baseUrl: string;
  apiKey?: string;
}

const DEFAULT_CONFIGS: Record<string, Partial<AetherConfig>> = {
  openai: {
    provider: "openai",
    model: "gpt-4o",
    baseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    baseUrl: "https://api.anthropic.com/v1",
  },
  gemini: {
    provider: "gemini",
    model: "gemini-2.0-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  openrouter: {
    provider: "openrouter",
    model: "openrouter/auto",
    baseUrl: "https://openrouter.ai/api/v1",
  },
};

export function getDefaultConfig(provider: string): Partial<AetherConfig> {
  return DEFAULT_CONFIGS[provider] || DEFAULT_CONFIGS.openai;
}

// Recognized hosts per provider, used to keep `provider` honest when the user
// edits `baseUrl` directly (e.g. /config set url ...) instead of switching
// providers — otherwise the label silently drifts from what's actually being called.
const PROVIDER_HOSTS: Array<{ host: string; provider: AetherConfig["provider"] }> = [
  { host: "openrouter.ai", provider: "openrouter" },
  { host: "api.openai.com", provider: "openai" },
  { host: "api.anthropic.com", provider: "anthropic" },
  { host: "generativelanguage.googleapis.com", provider: "gemini" },
];

export function detectProviderFromBaseUrl(baseUrl: string): AetherConfig["provider"] | null {
  const match = PROVIDER_HOSTS.find(({ host }) => baseUrl.includes(host));
  return match ? match.provider : null;
}

export function getConfigPath(rootDir: string): string {
  return join(rootDir, ".aether", "config.json");
}

export async function loadConfig(rootDir: string): Promise<AetherConfig | null> {
  const configPath = getConfigPath(rootDir);
  if (!existsSync(configPath)) return null;

  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as AetherConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(rootDir: string, config: AetherConfig): Promise<void> {
  const aetherDir = join(rootDir, ".aether");
  await mkdir(aetherDir, { recursive: true });

  const configPath = getConfigPath(rootDir);
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function validateConfig(config: AetherConfig): string[] {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push("provider is required (openai, anthropic, gemini, openrouter)");
  } else if (!["openai", "anthropic", "gemini", "openrouter"].includes(config.provider)) {
    errors.push("provider must be one of: openai, anthropic, gemini, openrouter");
  }

  if (!config.model) {
    errors.push("model is required");
  }

  if (!config.baseUrl) {
    errors.push("baseUrl is required");
  }

  if (!config.apiKey) {
    errors.push(`apiKey is required for ${config.provider}`);
  }

  return errors;
}
