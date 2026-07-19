# AI Context — Aether

## Project Identity
Aether is an open-source CLI that transforms any codebase into an AI-native workspace by building a complete knowledge base through static analysis and optional LLM enrichment, outputting to a `.aether/` directory.

---

## Always Follow

### Architecture Patterns
- **CLI entry point**: `src/cli/index.ts` exports `main()`; registers commands in order: `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, `registerCleanCommand()`; starts interactive chat via `startChat()` after banner/animation.
- **Command registry**: `src/commands/registry.ts` exports `CommandRegistry` class and singleton `registry`; commands implement `{ name, description, usage?, handler: (args: string) => Promise<void> | void }`; executed via `registry.execute(input)` parsing `/name args`.
- **Provider factory**: `src/providers/factory.ts` exports `createProvider(config: AetherConfig)` returning `LLMProvider`; switches on `config.provider` (`openai` | `anthropic` | `gemini` | `openrouter`) instantiating `OpenAICompatibleProvider` (anthropic has TODO for different API format).
- **Retry wrapper**: `src/providers/retry.ts` exports `chatWithRetry(provider, request, options?)` with exponential backoff, rate-limit (429) detection, provider-suggested delay extraction, and `createRetryLogger()` for stdout progress.
- **Distillation cache**: `src/genesis/scope.ts` uses `distillFilesIncremental` with cache at `~/.aether/cache/<project-id>/distill-cache.json` keyed by model; `DOC_CONTEXT_BUDGET = 48_000` chars; `DISTILL_CONCURRENCY = 4`.
- **Project identity**: `projectId(rootDir)` = `basename(abs)-sha1(abs).slice(0,12)`; global dir `~/.aether/`; project cache `~/.aether/cache/<project-id>/`.
- **Config precedence** (`src/config/index.ts`): project global entry → global default → in-repo override → `AETHER_API_KEY` env.
- **Genesis pipeline**: `ProjectContext` built from scanned files → `buildPlannerDigest` → `planDocs` (LLM) → `DOC_DEFINITIONS` (13 built-in) → generate docs via prompts.
- **Document definitions**: 13 `DocDefinition` constants in `src/genesis/docs.ts` grouped by `SECTION_ORDER`: Guides (human), Architecture, Reference, AI Context, Project-specific; each has `id`, `outputPath`, `label`, `title`, `section`, `summary`, `prompt`, `human?`.
- **Interactive CLI**: `src/ui/prompt.ts` uses `node:readline` with completer for `/` commands, dropdown suggestions (ANSI cursor save/restore), rotating tips, pattern-matched responses.
- **Step runner**: `src/ui/steps.ts` exports `StepRunner` (sequential/pooled steps with spinners) and `LineSpinner` (braille frames, succeed/fail).
- **Theme**: `src/ui/theme.ts` exports `ACCENT_HEX = "#895bf4"`, `ACCENT`, `ACCENT_BOLD`, `DIM`, `SUCCESS`, `WARN`, `ERROR` via `chalk`.
- **Constants via env**: `src/genesis/constants.ts` uses `envInt(name, fallback)` for `MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `DISTILL_CONCURRENCY`.
- **Hashing**: `src/util/hash.ts` exports `hashContent(content)` normalizing CRLF→LF, returning SHA-256 hex.
- **Git integration**: `src/genesis/fingerprint.ts` uses `execFileSync` for `git rev-parse`, `git status --porcelain`, `git log`.

### Coding Standards
- **TypeScript only** (`"type": "module"`, `"strict": true` in `tsconfig.json`); no `any`.
- **ES modules** with `.js` extensions in imports (e.g., `from '../ui/animation.js'`).
- **Small, focused functions**; types exported from co-located `types.ts` files.
- **Chalk for all terminal output**: `ACCENT`, `ACCENT_BOLD`, `DIM`, `SUCCESS`, `WARN`, `ERROR` from `src/ui/theme.js`.
- **Error handling**: `try/catch` with `process.stderr.write` and `process.exit(1)` in `main()`; best-effort writes swallow errors (e.g., `ensureProjectReadme`, `saveDistillCache`).
- **Concurrency limits**: `GEN_CONCURRENCY = 4`, `DISTILL_CONCURRENCY = 4` via `StepRunner.runPooled`.
- **Retry defaults**: `maxRetries: 3`, `baseDelay: 2000`; rate limit upgrades to `maxRetries: 6`, `baseDelay: 15000`.
- **Planner retries**: `MAX_PLAN_ATTEMPTS = 3`, temperature 0 on retry, falls back to `CORE_IDS` (6 hardcoded doc IDs).
- **Custom docs limit**: `MAX_CUSTOM_DOCS = 5` via `dedupeCustomDocs().slice(0, 5)`.

---

## Never Do

- **Never use `any`** — strict TypeScript enforced.
- **Never use CommonJS `require`** — only ES `import` with `.js` extensions.
- **Never invent providers** — only `openai`, `anthropic`, `gemini`, `openrouter` via `OpenAICompatibleProvider`.
- **Never skip config validation** — `validateConfig` checks `provider` (enum), `model`, `baseUrl`, `apiKey`.
- **Never write to `dist/` directly** — build via `npm run build` (`tsc`).
- **Never hardcode paths** — use `getGlobalDir()`, `getProjectCacheDir(rootDir)`, `projectConfigPaths(rootDir)`.
- **Never bypass retry logic** — use `chatWithRetry` for all LLM calls.
- **Never exceed context budget** — `buildSharedProjectContext` distills when `buildPrompt(context).length > DOC_CONTEXT_BUDGET`.
- **Never add commands without registry** — all commands via `registry.register()` in `registerXxxCommand()` functions.
- **Never use untyped config** — `AetherConfig` interface required; `DEFAULT_CONFIGS` provides per-provider defaults.
- **Never ignore git errors** — `getGitInfo`/`getGitLog` return `null` on failure, callers handle gracefully.
- **Never skip deduplication** — `dedupe(files)` by path before distillation; `dedupeCustomDocs()` by path before planning.
- **Never use `chalk` directly without theme** — import `ACCENT`, `DIM`, etc. from `../ui/theme.js`.
- **Never block event loop** — `sleep(ms)` helper wraps `setTimeout`; spinners use intervals.

---

## Key Decisions

| Decision | Evidence |
|----------|----------|
| **Hybrid analysis: static first, AI second** | README: "Aether uses a hybrid approach: static analysis first, AI second." |
| **CLI-first with interactive chat** | `src/cli/index.ts` calls `startChat()` after banner; `src/ui/prompt.ts` implements readline loop with `/` commands. |
| **Command registry for extensibility** | `src/commands/registry.ts` `CommandRegistry` class; commands registered in `cli/index.ts`. |
| **All LLM providers via OpenAI-compatible wrapper** | `src/providers/factory.ts` switches on provider, all instantiate `OpenAICompatibleProvider`; anthropic has TODO. |
| **Distillation cache per-project, per-model** | `src/genesis/scope.ts` `distillCachePath`, `loadDistillCache`, `saveDistillCache`; `DistillCache` has `model` and `chunks`. |
| **Global config at `~/.aether/config.json`** | `src/config/index.ts` `getGlobalConfigPath()`, `GlobalConfigFile` with `default` and `projects` entries. |
| **Project config at `.aether/config.json` or `.aether/settings/config.json`** | `projectConfigPaths(rootDir)` returns both; `loadConfig` reads in precedence order. |
| **13 built-in document types, fixed sections** | `src/genesis/docs.ts` `DOC_DEFINITIONS` array, `SECTION_ORDER = ["Guides","Architecture","Reference","AI Context","Project-specific"]`. |
| **Planner LLM selects docs, falls back to 6 core** | `src/genesis/planner.ts` `planDocs` retries 3×, falls back to `CORE_IDS`. |
| **Startup animation optional (`--no-animation`)** | `src/cli/index.ts` checks flag, calls `playStartupAnimation()` or `printBanner()`. |
| **Version from `__AETHER_VERSION__` or dev fallback** | `src/cli/index.ts` `VERSION = __AETHER_VERSION__ ?? "0.0.0-dev"`. |
| **SEA build for single executable** | `package.json` `build:sea` script, `scripts/build-sea.mjs` uses esbuild + postject. |
| **No test framework, no linting, no CI config detected** | `package.json` devDeps only: `@types/node`, `esbuild`, `postject`, `tsx`, `typescript`. |
| **Node ≥ 20 required** | `package.json` `"engines": { "node": ">=20.0.0" }`. |
| **Only runtime dependency is `chalk`** | `package.json` `dependencies: { "chalk": "^5.4.1" }`. |

---

## Conventions

### Naming
- **Files**: kebab-case (`build-sea.mjs`, `ai-context.ts`, `openai-compatible.ts`).
- **Exports**: named exports; default export only for `CommandRegistry` instance (`registry`).
- **Types**: PascalCase interfaces (`AetherConfig`, `ProjectContext`, `LLMProvider`); type aliases for unions (`DocSection`).
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `ACCENT_HEX`, `SECTION_ORDER`).
- **Functions**: camelCase (`buildPlannerDigest`, `createProvider`, `chatWithRetry`).
- **Command names**: lowercase with slash prefix in usage (`/config`, `/genesis`, `/help`, `/clean`).

### Imports
- **Relative imports with `.js` extension**: `from '../ui/animation.js'`, `from './types.js'`.
- **Node built-ins with `node:` prefix**: `node:fs/promises`, `node:child_process`, `node:crypto`, `node:readline`.
- **Re-export barrels**: `src/prompts/index.ts`, `src/providers/index.ts`, `src/config/index.ts` aggregate submodules.

### Error Handling
- **Top-level**: `main()` wraps in `try/catch`, writes to `stderr`, exits `1`.
- **Best-effort writes**: `ensureProjectReadme`, `saveDistillCache`, `saveConfig` swallow errors.
- **Git commands**: return `null` on failure; callers check.
- **Retry**: `chatWithRetry` loops, calls `onRetry` callback, throws last error after `maxRetries`.

### Async Patterns
- **`async/await` throughout**; no raw promises.
- **Concurrency**: `StepRunner.runPooled(limit, fn)` runs up to `limit` concurrent steps.
- **Streams**: `LLMProvider.chatStream` returns `AsyncGenerator<StreamChunk>`.
- **Readline**: `promptUser` recursive async loop.

### Configuration
- **Env overrides for constants**: `envInt(name, fallback)` in `src/util/env.ts`.
- **Provider defaults**: `DEFAULT_CONFIGS` object keyed by provider with `model`, `baseUrl`.
- **Auto-detect provider from baseUrl**: `PROVIDER_HOSTS` array maps host substrings to provider names.
- **API key masking**: `maskKey(key)` shows first 4 + `••••` + last 4.

---

## File Patterns

| Purpose | Location | Pattern |
|---------|----------|---------|
| CLI entry | `src/cli/index.ts` | `main()` function, command registration order |
| Command implementation | `src/commands/<name>.ts` | `register<Name>Command()` export, uses `registry` |
| Command registry | `src/commands/registry.ts` | `CommandRegistry` class, `registry` singleton |
| Genesis pipeline | `src/genesis/<name>.ts` | `context.ts`, `digest.ts`, `fingerprint.ts`, `scope.ts`, `planner.ts`, `docs.ts`, `distill.ts`, `sync.ts`, `types.ts`, `constants.ts` |
| Document prompts | `src/prompts/docs/<name>.ts` | One per doc type (e.g., `getting-started.ts`, `api.ts`), exports `*_PROMPT` const |
| Pipeline prompts | `src/prompts/pipeline/<name>.ts` | `planner.ts` (`PLANNER_PROMPT`), `sync.ts` (`SYNC_PLANNER_PROMPT`, etc.) |
| Prompt barrel | `src/prompts/index.ts` | Re-exports all prompts, base prompts, `buildCustomDocPrompt` |
| LLM providers | `src/providers/<name>.ts` | `openai-compatible.ts`, `factory.ts`, `retry.ts`, `types.ts`, `index.ts` |
| Config system | `src/config/<name>.ts` | `index.ts` (main), `types.ts`, `readme.ts`, `scaffold.ts` |
| UI components | `src/ui/<name>.ts` | `animation.ts`, `prompt.ts`, `steps.ts`, `theme.ts` |
| Utilities | `src/util/<name>.ts` | `env.ts`, `hash.ts` |
| Build script | `scripts/build-sea.mjs` | ES module, uses esbuild + postject |
| TypeScript config | `tsconfig.json` | `NodeNext`, `ES2022`, `strict`, `declarationMap`, `sourceMap` |
| Package config | `package.json` | `"type": "module"`, `bin.aether`, scripts, engines, deps |
| Generated output | `.aether/` (runtime) | `architecture.md`, `context.json`, `docs/`, `diagrams/` |
| Global config | `~/.aether/config.json` | `GlobalConfigFile` with `default` and `projects` |
| Project cache | `~/.aether/cache/<project-id>/` | `distill-cache.json` per model |
| Project README | `.aether/README.md` | Written by `ensureProjectReadme` from `AETHER_README` constant |

---

## Critical Files to Know

- `src/cli/index.ts` — entry point, command registration, startup flow
- `src/commands/registry.ts` — command system foundation
- `src/genesis/docs.ts` — 13 built-in document definitions, generation order
- `src/genesis/planner.ts` — LLM-driven doc selection, fallback logic
- `src/genesis/scope.ts` — shared context building, distillation cache
- `src/providers/factory.ts` + `retry.ts` — provider creation, resilient LLM calls
- `src/config/index.ts` — config loading, precedence, validation, paths
- `src/ui/prompt.ts` — interactive chat, command completion, dropdown
- `src/ui/steps.ts` — multi-step progress with spinners
- `src/util/hash.ts` — content hashing for fingerprints
- `src/genesis/constants.ts` — all tunable limits via env vars

---

## Technologies (Verified)

- **Runtime**: Node.js ≥ 20.0.0
- **Language**: TypeScript 5.8.3 (ES2022, NodeNext modules)
- **Dev runner**: tsx 4.19.4
- **Build**: tsc (outputs `dist/`), esbuild + postject for SEA
- **Terminal UI**: chalk 5.4.1 (only runtime dependency)
- **Types**: @types/node 22.15.21
- **No test framework, linter, formatter, CI, database, or web framework detected**