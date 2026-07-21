import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getGlobalDir } from "../config/index.js";
import type { AetherConfig } from "../config/index.js";

// USD per single token, matching OpenRouter's pricing shape.
export interface ModelPricing {
  inputPerToken: number;
  outputPerToken: number;
  source: "openrouter" | "static";
  free: boolean;
}

// OpenRouter's catalog is public and prices OpenAI/Anthropic/Google models too, so it
// works as a universal price oracle even for direct providers.
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Last-resort prices (USD per 1M tokens) when the catalog can't be reached/matched.
const STATIC_PER_MTOK: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4.1": { in: 2, out: 8 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "claude-sonnet-4": { in: 3, out: 15 },
  "claude-opus-4": { in: 15, out: 75 },
  "claude-3-5-haiku": { in: 0.8, out: 4 },
  "gemini-2.0-flash": { in: 0.1, out: 0.4 },
  "gemini-1.5-pro": { in: 1.25, out: 5 },
};

interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

function cachePath(): string {
  return join(getGlobalDir(), "cache", "pricing.json");
}

async function loadCatalog(): Promise<OpenRouterModel[] | null> {
  const path = cachePath();
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(await readFile(path, "utf-8"));
      if (parsed?.fetchedAt && Date.now() - parsed.fetchedAt < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        return parsed.data as OpenRouterModel[];
      }
    } catch {
      /* fall through to refetch */
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(OPENROUTER_MODELS_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: OpenRouterModel[] };
    const data = body.data ?? [];
    try {
      await mkdir(join(getGlobalDir(), "cache"), { recursive: true });
      await writeFile(path, JSON.stringify({ fetchedAt: Date.now(), data }), "utf-8");
    } catch {
      /* cache is best-effort */
    }
    return data;
  } catch {
    return null;
  }
}

function candidateIds(config: Pick<AetherConfig, "provider" | "model">): string[] {
  const lower = config.model.trim().toLowerCase();
  if (config.provider === "openrouter") return [lower];

  const prefix =
    config.provider === "anthropic" ? "anthropic" :
    config.provider === "gemini" ? "google" :
    "openai";

  const ids = new Set<string>();
  ids.add(`${prefix}/${lower}`);
  // OpenRouter drops date suffixes, e.g. claude-sonnet-4-20250514 → anthropic/claude-sonnet-4.
  const noDate = lower.replace(/-\d{6,8}$/, "");
  if (noDate !== lower) ids.add(`${prefix}/${noDate}`);
  return [...ids];
}

function priceOf(match: OpenRouterModel | undefined): ModelPricing | null {
  if (!match?.pricing) return null;
  const inputPerToken = Number(match.pricing.prompt ?? "");
  const outputPerToken = Number(match.pricing.completion ?? "");
  if (!Number.isFinite(inputPerToken) || !Number.isFinite(outputPerToken)) return null;
  return { inputPerToken, outputPerToken, source: "openrouter", free: inputPerToken === 0 && outputPerToken === 0 };
}

function fromCatalog(catalog: OpenRouterModel[], ids: string[]): ModelPricing | null {
  // Exact id wins.
  for (const id of ids) {
    const hit = priceOf(catalog.find((m) => m.id.toLowerCase() === id));
    if (hit) return hit;
  }
  // Else the shortest id starting with the candidate — catches dated variants.
  for (const id of ids) {
    const variants = catalog
      .filter((m) => m.id.toLowerCase().startsWith(`${id}-`))
      .sort((a, b) => a.id.length - b.id.length);
    const hit = priceOf(variants[0]);
    if (hit) return hit;
  }
  return null;
}

function fromStatic(config: Pick<AetherConfig, "model">): ModelPricing | null {
  const lower = config.model.toLowerCase();
  const key = Object.keys(STATIC_PER_MTOK).find((k) => lower.includes(k));
  if (!key) return null;
  const p = STATIC_PER_MTOK[key];
  return { inputPerToken: p.in / 1e6, outputPerToken: p.out / 1e6, source: "static", free: false };
}

// Live catalog first, then static table, then null (unknown → callers show tokens only).
export async function getModelPricing(config: Pick<AetherConfig, "provider" | "model">): Promise<ModelPricing | null> {
  const catalog = await loadCatalog();
  if (catalog) {
    const hit = fromCatalog(catalog, candidateIds(config));
    if (hit) return hit;
  }
  return fromStatic(config);
}
