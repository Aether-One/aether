import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureAetherScaffold } from "./scaffold.js";

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

/** Machine state lives in `.aether/settings/`: config.json (local) and context.json (snapshot). */
export function getSettingsDir(rootDir: string): string {
  return join(rootDir, ".aether", "settings");
}

export function getConfigPath(rootDir: string): string {
  return join(getSettingsDir(rootDir), "config.json");
}

// Pre-settings/ layout kept config at .aether/config.json — read it as a fallback.
function getLegacyConfigPath(rootDir: string): string {
  return join(rootDir, ".aether", "config.json");
}

export async function loadConfig(rootDir: string): Promise<AetherConfig | null> {
  const configPath = getConfigPath(rootDir);
  const readPath = existsSync(configPath)
    ? configPath
    : existsSync(getLegacyConfigPath(rootDir))
      ? getLegacyConfigPath(rootDir)
      : null;
  if (!readPath) return null;

  try {
    return JSON.parse(await readFile(readPath, "utf-8")) as AetherConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(rootDir: string, config: AetherConfig): Promise<void> {
  await mkdir(getSettingsDir(rootDir), { recursive: true });
  await writeFile(getConfigPath(rootDir), JSON.stringify(config, null, 2), "utf-8");
  await ensureAetherScaffold(rootDir);
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
