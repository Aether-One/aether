/** Content of the `.aether/README.md` explainer written into each project. */
export const AETHER_README = `# .aether/

Generated and managed by [Aether](https://github.com/aether-one/aether) — it turns your
codebase into an AI-native workspace. Everything in this folder is safe to commit.

## What's here (commit it)

- \`docs/\` — the generated knowledge base (guides, architecture, AI context, ...).
  Commit it so your team and your AI assistants share the same understanding.
- \`docs.html\` — optional single-file viewer for \`docs/\` (sidebar, search, links).
  Open it in any browser; regenerate anytime with \`/html\` — it's free, no AI calls.
- \`settings/\` — internal metadata used by Aether (snapshot, fingerprints).
  **Do not delete** — \`/sync\` depends on this to know what changed since the last run.
  Removing it forces a full \`/genesis --force\` regeneration.

## What's NOT here

Your provider config and **API key** live globally in \`~/.aether/config.json\` (set with
\`/config\`), never in the repo — so nothing here is secret. The distill cache lives in
\`~/.aether/cache/\`. You can also point the key at the \`AETHER_API_KEY\` environment variable.

## Commands

- \`/genesis\` — scan the project and generate \`docs/\` from scratch.
- \`/sync\` — refresh only the docs affected by what changed since the last run.
  Also refreshes \`docs.html\` automatically if it exists.
- \`/html\` — build (or rebuild) the \`docs.html\` viewer from the current docs.
- \`/config\` — configure the AI provider (saved globally).
- \`/clean\` — manage global data (caches, configs, projects).
`;
