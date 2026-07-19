# Genesis Knowledge Pipeline

This document describes the static-analysis and AI-augmented flow implemented in `src/genesis/*` that builds the `.aether/` knowledge base. All statements are based on the verified source facts for the files `context.ts`, `digest.ts`, `fingerprint.ts`, `scope.ts`, `distill.ts`, `planner.ts`, `docs.ts`, and `sync.ts`.

## Entry Point

The `/genesis` command is registered in `src/commands/builtins.ts` and invokes the following `src/genesis/*` modules in order:

1. `scanContext(targetDir)` — `context.ts`
2. `buildPlannerDigest(context)` — `digest.ts`
3. `planDocs(...)` — `planner.ts`
4. `buildSharedProjectContext(context, provider, model)` — `scope.ts`
5. `writeSnapshot` and doc writing via `docs.ts` definitions
6. `buildDocsIndex(...)` — `docs.ts`

The `/sync` command uses `fingerprint.ts` (`diffFingerprint`, `getGitLog`) and `sync.ts` (`loadSnapshot`, `planSync`, `mergeDocMetas`) instead of full re-scan.

## Module Responsibilities

| Module | File | Verified Responsibility |
|--------|------|------------------------|
| Context scan | `src/genesis/context.ts` | `scanContext(rootDir)` returns `ProjectContext` with config/vision/entry/source files, directory tree, omitted files. `buildPrompt(context)` serializes it. |
| Digest | `src/genesis/digest.ts` | `buildPlannerDigest(context)` builds a condensed string; `detectSignals` counts routes/domain/tests; `extractSymbols` pulls symbol names. |
| Fingerprint | `src/genesis/fingerprint.ts` | `buildFingerprint` SHA-256 per file; `getGitInfo` and `getGitLog` use `execFileSync("git", ...)`. |
| Scope | `src/genesis/scope.ts` | `buildSharedProjectContext` returns full prompt if under `DOC_CONTEXT_BUDGET` (48,000 chars env-overridable) else distills via `distillFiles`. |
| Distill | `src/genesis/distill.ts` | `distillFiles` chunks files and calls LLM via `chatWithRetry` to produce notes under budget. |
| Planner | `src/genesis/planner.ts` | `planDocs` asks LLM for catalog IDs + custom docs; falls back to `CORE_IDS` after `MAX_PLAN_ATTEMPTS`. |
| Docs | `src/genesis/docs.ts` | `DOC_DEFINITIONS` array maps doc IDs to output paths/sections; `buildDocsIndex` groups by `SECTION_ORDER`. |
| Sync | `src/genesis/sync.ts` | Referenced by `builtins.ts` for `loadSnapshot`, `diffFingerprint`, `planSync`, `mergeDocMetas` (no further internals provided). |

## Static Analysis Flow (context.ts)

`scanContext` performs the following, verified by constants and helpers:

- Reads `CONFIG_FILES`: `package.json`, `tsconfig.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `pom.xml`, `docker-compose.yml`, `Dockerfile`, `.env.example`, `README.md`.
- Finds vision files from `VISION_FILE_CANDIDATES` (`CONTEXT.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `VISION.md`) plus `docs/*.md`.
- Builds directory tree skipping `IGNORED_DIRS` (e.g. `node_modules`, `.git`, `.aether`, `dist`) up to `AETHER_MAX_WALK_DEPTH` (default 12).
- Finds entry points from a hardcoded candidate list (e.g. `src/index.ts`, `main.go`, `manage.py`).
- Reads source files by `SOURCE_EXTENSIONS` (`.ts`, `.py`, `.rs`, etc.) ranked by `getImportanceScore` within `AETHER_MAX_TOTAL_CHARS` (default 2,000,000). Files over `AETHER_MAX_FILE_SIZE` (default 128,000) go to `omittedFiles`.

## AI-Augmented Flow

### Planner
`planDocs` (planner.ts) sends `BASE_PROMPT` + context + `PLANNER_PROMPT` + `PROMPT_SUFFIX` to the LLM via `chatWithRetry`. It parses a JSON array of `catalogIds` and `customDocs`. If parsing fails `MAX_PLAN_ATTEMPTS` (3) times, it falls back to `CORE_IDS`: `getting-started`, `onboarding`, `system-overview`, `folder-structure`, `tech-stack`, `ai-context`.

### Scope / Distill
`buildSharedProjectContext` (scope.ts) checks `buildPrompt(context).length` against `DOC_CONTEXT_BUDGET` (env `AETHER_DOC_CONTEXT_CHARS`, default 48,000). If larger, it calls `distillFiles` (distill.ts), which:
- Splits files via `chunkFiles` under `chunkBudget` (75% of budget, min 4,000)
- Runs with concurrency `AETHER_DISTILL_CONCURRENCY` (default 4) using `mapPool`
- Calls LLM with `temperature: 0` via `chatWithRetry`

### Docs Generation
`docs.ts` defines `DOC_DEFINITIONS` with output paths under `.aether/docs/` (e.g. `docs/guides/getting-started.md`, `docs/architecture/system-overview.md`). Each `buildPrompt` wraps context with `withBase` (`BASE_PROMPT` + context + specific prompt + `PROMPT_SUFFIX`). `genesis` command writes docs to `join(targetDir, ".aether", doc.outputPath)` and index to `.aether/docs/README.md`.

## Pipeline Diagram

```mermaid
flowchart TD
    A[/genesis command] --> B[scanContext - context.ts]
    B --> C[buildPlannerDigest - digest.ts]
    C --> D[planDocs - planner.ts]
    D --> E[buildSharedProjectContext - scope.ts]
    E -->|under budget| F[full prompt]
    E -->|over budget| G[distillFiles - distill.ts]
    F --> H[write docs via DOC_DEFINITIONS - docs.ts]
    G --> H
    H --> I[writeSnapshot + buildDocsIndex]
```

## Sync Flow (Partial)

`/sync` (builtins.ts) requires `loadSnapshot(targetDir)` at `.aether/settings/context.json`, then uses `diffFingerprint` and `getGitLog` (fingerprint.ts) and `planSync` / `mergeDocMetas` (sync.ts). It never deletes docs; it merges via `mergeDocMetas(snapshot.docs, plan.add)`.

## Environment Variables Used

| Variable | Module | Default | Effect |
|----------|--------|---------|--------|
| `AETHER_DOC_CONTEXT_CHARS` | scope.ts | 48,000 | Doc context budget |
| `AETHER_MAX_FILE_SIZE` | context.ts | 128,000 | Per-file size cap |
| `AETHER_MAX_TOTAL_CHARS` | context.ts | 2,000,000 | Total chars walked |
| `AETHER_MAX_FILES_WALKED` | context.ts | 10,000 | Max files |
| `AETHER_MAX_WALK_DEPTH` | context.ts | 12 | Dir tree depth |
| `AETHER_DISTILL_CONCURRENCY` | distill.ts | 4 | Distill workers |
| `AETHER_GEN_CONCURRENCY` | builtins.ts | 4 | Genesis doc concurrency |