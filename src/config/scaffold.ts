import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AETHER_README } from "./readme.js";

/** Writes the .aether/ layout README if it's missing. Best-effort. */
export async function ensureProjectReadme(rootDir: string): Promise<void> {
  const readmePath = join(rootDir, ".aether", "README.md");
  try {
    if (existsSync(readmePath)) return;
    await mkdir(join(rootDir, ".aether"), { recursive: true });
    await writeFile(readmePath, AETHER_README, "utf-8");
  } catch {
    /* best-effort */
  }
}
