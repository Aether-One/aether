import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const GITIGNORE_HEADER = "# Aether local config (contains API keys)";
const GITIGNORE_ENTRY = ".aether/settings/config.json";

const AETHER_README = `# .aether/

This folder is generated and managed by [Aether](https://github.com/aether-one/aether).
It turns your codebase into an AI-native workspace.

## Layout

- **\`settings/\`** — machine state for Aether.
  - \`config.json\` — your provider, model, and **API key**. Local and secret:
    it is git-ignored and must never be committed. Set it with \`/config\`.
  - \`context.json\` — a snapshot of the last \`/genesis\` run: provider/model, timestamp,
    a fingerprint of every file that was read, and the generated docs. \`/sync\` diffs
    this against the current project to know what changed. Safe to commit.
- **\`docs/\`** — the generated knowledge base (guides, architecture, AI context, ...).
  Commit it so your team and your AI assistants share the same understanding.
- **\`README.md\`** — this file.

## Commands

- \`/genesis\` — scan the project and generate \`docs/\` from scratch.
- \`/sync\` — refresh only the docs affected by what changed since the last run.
- \`/config\` — configure the AI provider used to generate the docs.
`;

/** Ensures the API key is git-ignored and a layout README exists. Best-effort. */
export async function ensureAetherScaffold(rootDir: string): Promise<void> {
  await Promise.allSettled([ensureGitignore(rootDir), ensureAetherReadme(rootDir)]);
}

async function ensureGitignore(rootDir: string): Promise<void> {
  const gitignorePath = join(rootDir, ".gitignore");
  const block = `${GITIGNORE_HEADER}\n${GITIGNORE_ENTRY}\n`;

  try {
    if (!existsSync(gitignorePath)) {
      await writeFile(gitignorePath, block, "utf-8");
      return;
    }

    const current = await readFile(gitignorePath, "utf-8");
    if (current.split(/\r?\n/).some((line) => line.trim() === GITIGNORE_ENTRY)) return;

    const prefix = current.endsWith("\n") ? "" : "\n";
    await writeFile(gitignorePath, `${current}${prefix}\n${block}`, "utf-8");
  } catch {
    /* best-effort */
  }
}

async function ensureAetherReadme(rootDir: string): Promise<void> {
  const readmePath = join(rootDir, ".aether", "README.md");
  try {
    if (existsSync(readmePath)) return;
    await mkdir(join(rootDir, ".aether"), { recursive: true });
    await writeFile(readmePath, AETHER_README, "utf-8");
  } catch {
    /* best-effort */
  }
}
