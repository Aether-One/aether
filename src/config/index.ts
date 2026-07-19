import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import type { AetherConfig } from "./types.js";

export type { AetherConfig } from "./types.js";

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

/** Global user dir — config (with the API key) and caches live here, never in the repo. */
export function getGlobalDir(): string {
  return join(homedir(), ".aether");
}

export function getGlobalConfigPath(): string {
  return join(getGlobalDir(), "config.json");
}

/** Stable id for a project (its folder name + a hash of its absolute path). */
function projectId(rootDir: string): string {
  const abs = resolve(rootDir);
  return `${basename(abs)}-${createHash("sha1").update(abs).digest("hex").slice(0, 12)}`;
}

/** Per-project cache dir under the global tree. */
export function getProjectCacheDir(rootDir: string): string {
  return join(getGlobalDir(), "cache", projectId(rootDir));
}

/**
 * The global config file holds a shared `default` plus per-project entries — one machine,
 * many projects, each able to use a different provider/model/key without touching the repo.
 */
interface GlobalConfigFile {
  default?: Partial<AetherConfig>;
  projects?: Record<string, Partial<AetherConfig>>;
}

// Optional committed, NON-secret per-project overrides (provider/model), and legacy
// in-repo locations, read for back-compat. Merged over the resolved global config.
function projectConfigPaths(rootDir: string): string[] {
  return [
    join(rootDir, ".aether", "config.json"),
    join(rootDir, ".aether", "settings", "config.json"),
  ];
}

async function readJsonConfig(path: string): Promise<Partial<AetherConfig> | null> {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8")) as Partial<AetherConfig>;
  } catch {
    return null;
  }
}

async function readGlobalFile(): Promise<GlobalConfigFile> {
  const path = getGlobalConfigPath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    if (parsed && typeof parsed === "object") {
      // New keyed shape, or a legacy flat config (treat the whole thing as the default).
      return parsed.projects || parsed.default ? (parsed as GlobalConfigFile) : { default: parsed };
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Resolves config in precedence order: this project's global entry → the shared global
 * default → a committed in-repo override (non-secret prefs) → AETHER_API_KEY env. The
 * secret lives in the global file or the env, never in the repo.
 */
export async function loadConfig(rootDir: string): Promise<AetherConfig | null> {
  const globalFile = await readGlobalFile();
  const base = globalFile.projects?.[projectId(rootDir)] ?? globalFile.default ?? null;

  let override: Partial<AetherConfig> | null = null;
  for (const path of projectConfigPaths(rootDir)) {
    override = await readJsonConfig(path);
    if (override) break;
  }

  const merged: Partial<AetherConfig> = { ...(base ?? {}), ...(override ?? {}) };
  if (process.env.AETHER_API_KEY) merged.apiKey = process.env.AETHER_API_KEY;

  return Object.keys(merged).length > 0 ? (merged as AetherConfig) : null;
}

/**
 * Saves config for THIS project into the global file. The first config also becomes the
 * shared `default` that not-yet-configured projects inherit; later per-project saves only
 * update their own entry, so configuring one project never disturbs another.
 */
export async function saveConfig(rootDir: string, config: AetherConfig): Promise<void> {
  const globalFile = await readGlobalFile();
  const next: GlobalConfigFile = {
    default: globalFile.default ?? config,
    projects: { ...(globalFile.projects ?? {}), [projectId(rootDir)]: config },
  };

  await mkdir(getGlobalDir(), { recursive: true });
  await writeFile(getGlobalConfigPath(), JSON.stringify(next, null, 2), "utf-8");
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
