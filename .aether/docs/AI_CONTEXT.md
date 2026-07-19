# AI Context

> **Direct instructions for AI assistants working on the Aether codebase.**  
> Only reference patterns, files, and conventions explicitly present in the provided source code. Do not invent.

---

## Project Identity

**Aether** is a Node.js CLI (TypeScript, ES modules, Node ≥20) that transforms any codebase into an AI-native workspace by scanning, analyzing, and generating a knowledge base in `.aether/`. The CLI entry point is `src/cli/index.ts` (compiled to `dist/cli/index.js`), invoked as `aether` via the `bin` field in `package.json`.

---

## Always Follow

### Architecture Patterns
- **ES modules only** — `package.json` declares `"type": "module"`; all imports use `.js` extensions (e.g., `from "../commands/help.js"`).
- **Strict TypeScript** — `tsconfig.json` has `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`. No `any`; prefer explicit types.
- **Node.js built-ins only** — Dependencies in `package.json`: `chalk` (runtime), `esbuild` + `postject` + `tsx` + `typescript` (dev). All file I/O, crypto, process, path, os, child_process, readline use `node:` prefixes (e.g., `node:fs/promises`, `node:crypto`).
- **Command registry pattern** — `src/commands/registry.ts` exports `CommandRegistry` class and singleton `registry`. Commands register via `registry.register({ name, description, usage, handler })` in `src/commands/*.ts`. CLI entry (`src/cli/index.ts`) calls registration functions in order: `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, `registerCleanCommand()`.
- **Provider factory** — `src/providers/factory.ts` exports `createProvider(config: AetherConfig): LLMProvider`. Switches on `config.provider` (`"openai" | "anthropic" | "gemini" | "openrouter"`) and returns `new OpenAICompatibleProvider(...)` for all cases (Anthropic has a TODO comment for native support).
- **OpenAI-compatible streaming** — `src/providers/openai-compatible.ts` implements `LLMProvider` with SSE streaming, idle timeout (default 120s), and `chat()`/`chatStream()`/`ping()`.
- **Retry with exponential backoff** — `src/providers/retry.ts` exports `chatWithRetry(provider, request, options?)`. Rate-limit errors (429 / "rate limit") upgrade to `RATE_LIMIT_OPTIONS` (6 retries, 15s base delay). `createRetryLogger()` writes formatted retry lines to stdout using theme colors.
- **Prompt sandwich** — Every LLM call wraps the specific prompt with `BASE_PROMPT` (prepended) and `PROMPT_SUFFIX` (appended) from `src/prompts/base.ts`. Human-facing prompts use `HUMAN_BASE_PROMPT` + `HUMAN_PROMPT_SUFFIX`.
- **Distillation with incremental caching** — `src/genesis/distill.ts` exports `distillFilesIncremental(files, provider, model, budget, prevCache, hooks?)`. Reuses `DistillCache` entries where `model` matches and file hash unchanged; processes stale files concurrently via `mapPool(limit, fn)` (default `DISTILL_CONCURRENCY = 4` from `src/genesis/constants.ts`).
- **Fingerprinting with SHA-256** — `src/genesis/fingerprint.ts` exports `buildFingerprint(context)` producing `Record<string, FileFingerprint>` (`{ hash: string; size: number }`). Git info via `git rev-parse` / `git status` / `git log` (child_process.execFileSync).
- **Sync with diff + section patching** — `src/genesis/sync.ts` exports `planSync()`, `applySectionPatch()`, `refreshDoc()`. `diffFingerprint()` compares previous vs current fingerprints. `applySectionPatch()` splits on `## ` headings, replaces/inserts sections by heading anchor.
- **Global config in `~/.aether/config.json`** — `src/config/index.ts` manages `GlobalConfigFile = { default?: Partial<AetherConfig>; projects?: Record<string, Partial<AetherConfig>> }`. First `saveConfig()` seeds `default`; subsequent saves update `projects[projectId]`. `projectId = `${basename}-${sha1(abs).slice(0,12)}``.
- **Project cache in `~/.aether/cache/{projectId}/`** — `getProjectCacheDir(rootDir)` returns this path. Distill cache stored at `distill-cache.json` inside it.
- **Project config in `.aether/config.json` or `.aether/settings/config.json`** — Non-secret overrides (provider, model) only; secrets (`apiKey`) only in global config or `AETHER_API_KEY` env.
- **CLI animation + step runner** — `src/ui/animation.ts` exports `playStartupAnimation()` (starfield + typewriter) and `printBanner()`. `src/ui/steps.ts` exports `StepRunner` (multi-step with spinner) and `LineSpinner` (single-line spinner). Both use `src/ui/theme.ts` constants (`ACCENT_HEX = "#895bf4"`, `ACCENT`, `ACCENT_BOLD`, `DIM`, `SUCCESS`, `WARN`, `ERROR`).
- **Interactive REPL with readline** — `src/ui/prompt.ts` exports `startChat()`. Creates `readline.Interface` with custom `completer` for `/` commands, real-time dropdown via ANSI escape codes (`\x1B[s`, `\x1B[u`, `\x1B[2K`, `\x1B[${n}A`). Delegates `/` commands to `registry.execute(input)`.

### Coding Standards
- **Named exports only** — No default exports in `src/` (verified across all listed files).
- **Async/await** — All async functions use `async`/`await`; no bare promises.
- **Error handling** — Top-level `main()` in `src/cli/index.ts` catches and logs to stderr, exits 1. `saveDistillCache()` and `ensureProjectReadme()` swallow errors (best-effort).
- **Env overrides with defaults** — `src/util/env.ts` exports `envInt(name, fallback)` used in `src/genesis/constants.ts` for all limits (`MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `DISTILL_CONCURRENCY`).
- **Constants as `const` objects** — `DEFAULT_CONFIGS`, `PROVIDER_HOSTS` in `src/config/index.ts`; `DOC_DEFINITIONS`, `SECTION_ORDER` in `src/genesis/docs.ts`; `ANCHOR_IDS` in `src/genesis/sync.ts`.
- **Type-first interfaces** — `AetherConfig`, `LLMProvider`, `ChatRequest`, `ChatResponse`, `StreamChunk`, `ProjectContext`, `FileContent`, `DocDefinition`, `Snapshot`, `SyncPlan`, `SectionPatch`, etc. defined in respective `types.ts` or inline.
- **No external test framework detected** — No test files in directory structure; no test script in `package.json`.

### Naming Conventions
- **Files**: kebab-case (`build-sea.mjs`, `openai-compatible.ts`, `ai-context.ts`).
- **Classes**: PascalCase (`CommandRegistry`, `OpenAICompatibleProvider`, `StepRunner`, `LineSpinner`).
- **Functions/variables**: camelCase (`registerConfigCommand`, `buildFingerprint`, `distillFilesIncremental`, `createProvider`).
- **Types/interfaces**: PascalCase (`AetherConfig`, `ProjectContext`, `DocDefinition`, `SyncPlan`).
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_CONFIGS`, `ACCENT_HEX`, `SPINNER_FRAMES`).
- **Command names**: lowercase with `/` prefix (`/genesis`, `/config`, `/clean`, `/help`).

---

## Never Do

- **Do not use CommonJS** — No `require()`, no `module.exports`, no `__dirname`/`__filename` without `import.meta.url`.
- **Do not add runtime dependencies** — Only `chalk` is a production dependency. New deps require `package.json` update.
- **Do not use `any`** — `tsconfig.json` has `"strict": true`; all files pass type checking.
- **Do not invent LLM providers** — `createProvider()` only handles `"openai" | "anthropic" | "gemini" | "openrouter"`. Anthropic falls back to `OpenAICompatibleProvider` with a TODO comment.
- **Do not skip the prompt sandwich** — Every LLM call must wrap the specific prompt with `BASE_PROMPT` + `PROMPT_SUFFIX` (or human variants). See `src/genesis/planner.ts`, `src/genesis/sync.ts`, `src/genesis/distill.ts`, `src/genesis/scope.ts`.
- **Do not write secrets to repo** — `apiKey` only stored in `~/.aether/config.json` or `AETHER_API_KEY` env. `src/config/index.ts` validates and `src/commands/config.ts` masks keys in output.
- **Do not mutate global config on project save** — `saveConfig()` only updates `projects[projectId]` after the first call seeds `default`.
- **Do not delete docs on sync** — `SyncPlan` only has `regenerate` and `add`; no delete operation (see `src/genesis/sync.ts`).
- **Do not bypass distillation cache** — `distillFilesIncremental()` reuses cached notes when `model` and file `hash` match.
- **Do not use `console.log` for UI** — Use `process.stdout.write()` with theme constants (`ACCENT`, `DIM`, `SUCCESS`, `WARN`, `ERROR`) from `src/ui/theme.ts`.
- **Do not hardcode limits** — Use `envInt()` constants from `src/genesis/constants.ts` (`MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, etc.).
- **Do not add default exports** — All exports are named (`export function`, `export const`, `export class`, `export interface`).

---

## Key Decisions

1. **Single executable via SEA** — `package.json` has `"build:sea": "node scripts/build-sea.mjs"` using `esbuild` + `postject` to inject compiled JS into Node binary. Version injected via `__AETHER_VERSION__` global (read in `src/cli/index.ts`).
2. **Genesis = one-time analysis, Sync = incremental** — `genesis/` pipeline scans, digests, distills, plans, generates. `sync.ts` diffs fingerprints, plans minimal updates, patches sections.
3. **Prompt catalog is fixed + extensible** — `DOC_DEFINITIONS` in `src/genesis/docs.ts` defines 13 built-in docs (system-overview, folder-structure, tech-stack, getting-started, onboarding, contributing, coding-standards, modules, api, business, glossary, ai-context, diagrams). Planner can add up to 5 custom docs via `CustomDocSpec`.
4. **Global config + per-project overrides** — `~/.aether/config.json` holds shared `default` + per-project entries. Project `.aether/config.json` only for non-secret overrides. `loadConfig()` merges: global default → global project → in-repo → `AETHER_API_KEY` env.
5. **CLI is interactive-first** — `src/cli/index.ts` detects `process.stdin.isTTY`, runs animation unless `--no-animation`, then starts REPL via `startChat()`. Commands are `/`-prefixed, handled by registry.
6. **No test infrastructure** — No test files, no test script, no test deps. Verification via `npm run typecheck` and `npm run build` only.
7. **Node ≥20 required** — `package.json` `"engines": { "node": ">=20.0.0" }`. Uses modern `fetch`, `AbortController`, `TextDecoder`, `node:` protocol imports.

---

## Conventions

### File Organization
```
src/
├── cli/index.ts           # Entry point, version, command registration, REPL startup
├── commands/              # One file per command group
│   ├── builtins.ts        # /genesis, /sync, /doctor, /explain, /export (stubs)
│   ├── clean.ts           # /clean (global cache/config management)
│   ├── config.ts          # /config (provider setup, show, set)
│   ├── help.ts            # /help
│   └── registry.ts        # CommandRegistry, singleton registry
├── config/                # Config loading, saving, validation, scaffolding
├── genesis/               # Core pipeline: scan → digest → distill → plan → generate → sync
├── prompts/               # Prompt templates (base + 13 doc types + pipeline)
├── providers/             # LLM provider abstraction + OpenAI-compatible impl + retry
├── ui/                    # CLI animation, REPL, step runner, theme
└── util/env.ts            # envInt() helper
```

### Import Style
```typescript
// Node built-ins with node: prefix
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createInterface, emitKeypressEvents } from "node:readline";

// Local imports with .js extension
import { registry } from "./registry.js";
import { loadConfig, saveConfig, validateConfig } from "../config/index.js";
import { ACCENT, DIM, SUCCESS } from "../ui/theme.js";
```

### Error Handling
```typescript
// Top-level
main().catch((err) => {
  process.stderr.write(`${ERROR(err.message)}\n`);
  process.exit(1);
});

// Best-effort writes (cache, readme)
try { await writeFile(path, content); } catch { /* ignore */ }

// Validation returns string[] errors
const errors = validateConfig(config);
if (errors.length) { /* warn but allow save */ }
```

### Concurrency Control
```typescript
// mapPool in distill.ts - preserves order, limits concurrency
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}
```

### Theme Usage
```typescript
import { ACCENT, ACCENT_BOLD, DIM, SUCCESS, WARN, ERROR } from "./theme.js";
process.stdout.write(`${ACCENT_BOLD("⚡ aether")}\n`);
process.stdout.write(`${DIM("  Transform any codebase into an AI-native workspace.")}\n`);
```

---

## File Patterns

### New Commands
**Location**: `src/commands/<name>.ts`  
**Pattern**: Export `register<Name>Command()` that calls `registry.register({ name, description, usage, handler })`.  
**Example**: `src/commands/config.ts` → `registerConfigCommand()`.

### New Prompt Templates
**Location**: `src/prompts/docs/<name>.ts` (for doc types) or `src/prompts/pipeline/<name>.ts` (for planner/sync).  
**Pattern**: Export `const <NAME>_PROMPT = \`...\`.trim();` or `export function build<Name>Prompt(...): string`.  
**Re-export**: Add to `src/prompts/index.ts`.

### New LLM Provider
**Location**: `src/providers/<name>.ts` implementing `LLMProvider` from `src/providers/types.ts`.  
**Register**: Add case to `createProvider()` in `src/providers/factory.ts`.

### New Genesis Pipeline Step
**Location**: `src/genesis/<step>.ts`  
**Types**: Define/extend in `src/genesis/types.ts`  
**Constants**: Add limits to `src/genesis/constants.ts` using `envInt()`.

### Config Keys
**Valid keys** (from `src/commands/config.ts`): `provider`, `model`, `url`/`baseUrl`, `key`/`apiKey`.  
**Valid providers**: `"openai" | "anthropic" | "gemini" | "openrouter"`.  
**Defaults**: Defined in `DEFAULT_CONFIGS` in `src/config/index.ts`.

### CLI Command Registration
**Order in `src/cli/index.ts`**:
1. `registerHelpCommand()`
2. `registerBuiltinCommands()`
3. `registerConfigCommand()`
4. `registerCleanCommand()`

Add new command registration in this sequence.

---

## Verification Checklist

Before considering any change complete, verify:
- [ ] `npm run typecheck` passes (strict TypeScript)
- [ ] `npm run build` emits to `dist/` without errors
- [ ] No new runtime dependencies added to `package.json` without justification
- [ ] All imports use `.js` extensions and `node:` prefixes for built-ins
- [ ] No `any` types introduced
- [ ] No default exports added
- [ ] Secrets never written to repository (only `~/.aether/config.json` or env)
- [ ] Prompt sandwich used for all LLM calls (`BASE_PROMPT` + specific + `PROMPT_SUFFIX`)
- [ ] Distillation cache respected (hash + model match)
- [ ] Sync plans never delete docs (only `regenerate` + `add`)