import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// User-chosen paths to skip when scanning — lives with the repo so it's shareable.
function excludeFilePath(rootDir: string): string {
  return join(rootDir, ".aether", "settings", "exclude.json");
}

export function normalizeExclude(raw: string): string {
  return raw.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
}

export async function loadExcludes(rootDir: string): Promise<string[]> {
  const path = excludeFilePath(rootDir);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    return Array.isArray(parsed) ? [...new Set(parsed.map(String).map(normalizeExclude).filter(Boolean))] : [];
  } catch {
    return [];
  }
}

export async function addExclude(rootDir: string, raw: string): Promise<{ added: boolean; entry: string }> {
  const entry = normalizeExclude(raw);
  if (!entry) return { added: false, entry: "" };

  const current = await loadExcludes(rootDir);
  if (current.includes(entry)) return { added: false, entry };

  await mkdir(join(rootDir, ".aether", "settings"), { recursive: true });
  await writeFile(excludeFilePath(rootDir), JSON.stringify([...current, entry], null, 2), "utf-8");
  return { added: true, entry };
}

export async function removeExclude(rootDir: string, raw: string): Promise<{ removed: boolean; entry: string }> {
  const entry = normalizeExclude(raw);
  const current = await loadExcludes(rootDir);
  if (!current.includes(entry)) return { removed: false, entry };

  await mkdir(join(rootDir, ".aether", "settings"), { recursive: true });
  await writeFile(excludeFilePath(rootDir), JSON.stringify(current.filter((e) => e !== entry), null, 2), "utf-8");
  return { removed: true, entry };
}

// A path is excluded if it equals an entry, sits under one, or (bare-name entries)
// matches any directory segment — so "dist" excludes every dist/ in the tree.
export function isExcluded(relPath: string, excludes: string[]): boolean {
  if (excludes.length === 0) return false;
  const p = relPath.replace(/\\/g, "/");
  const segments = p.split("/");
  for (const e of excludes) {
    if (p === e || p.startsWith(`${e}/`)) return true;
    if (!e.includes("/") && segments.includes(e)) return true;
  }
  return false;
}
