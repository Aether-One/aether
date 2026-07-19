# .aether/

This folder is generated and managed by [Aether](https://github.com/aether-one/aether).
It turns your codebase into an AI-native workspace.

## Layout

- **`settings/`** — machine state for Aether.
  - `config.json` — your provider, model, and **API key**. This is **local and secret**:
    it is git-ignored and must never be committed or shared. Set it with `/config`.
  - `context.json` — a snapshot of the last `/genesis` run: provider/model, timestamp,
    a fingerprint of every file that was read, and the list of generated docs. `/sync`
    diffs this against the current project to know what changed. Safe to commit.
- **`docs/`** — the generated knowledge base (guides, architecture, AI context, ...).
  Commit this so your team and your AI assistants share the same understanding of the project.
- **`README.md`** — this file.

## Commands

- `/genesis` — scan the project and generate `docs/` from scratch.
- `/sync` — refresh only the docs affected by what changed since the last run.
- `/config` — configure the AI provider used to generate the docs.
