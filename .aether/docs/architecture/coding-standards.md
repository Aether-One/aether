# Coding Standards — Aether

This document codifies the patterns observed in the Aether codebase. Every rule below is verifiable from the provided source files. Do not extrapolate beyond what is shown.

---

## 1. Code Style

| Rule | Evidence |
|------|----------|
| **Language**: TypeScript with `"strict": true` | `tsconfig.json` |
| **Target**: ES2022, NodeNext modules | `tsconfig.json` |
| **Module system**: ES modules (`"type": "module"` in `package.json`) | `package.json` |
| **Imports**: Relative imports **must** include `.js` extension | All source files (e.g., `from '../ui/animation.js'`) |
| **Node built-ins**: Use `node:` prefix | `node:fs/promises`, `node:child_process`, `node:crypto` |
| **Exports**: Named exports only; barrel `index.ts` files re-export | Every `src/*/index.ts` |
| **No default exports** | Not observed in any provided file |
| **No `any`** | `tsconfig.json` has `"strict": true`; no `any` in provided code |
| **Semicolons**: Used consistently | All provided `.ts` files |
| **Quotes**: Single quotes for strings | All provided `.ts` files |
| **Indentation**: 2 spaces (inferred) | Consistent across files |
| **Trailing commas**: Used in multiline objects/arrays | Observed in `package.json`, `tsconfig.json`, source objects |

---

## 2. Naming Conventions

| Category | Convention | Examples |
|----------|------------|----------|
| **Files** | kebab-case | `build-sea.mjs`, `ai-context.ts`, `openai-compatible.ts`, `cli/index.ts` |
| **Directories** | kebab-case | `src/commands/`, `src/genesis/`, `src/providers/` |
| **Classes** | PascalCase | `CommandRegistry`, `StepRunner`, `LineSpinner`, `OpenAICompatibleProvider` |
| **Interfaces** | PascalCase | `AetherConfig`, `ChatMessage`, `LLMProvider`, `ProjectContext`, `FileFingerprint` |
| **Type aliases** | PascalCase | `FileContent`, `DocSection`, `DistillCache`, `SyncPlan` |
| **Union types (enum-like)** | PascalCase | `DocSection = "Guides" \| "Architecture" \| ...` |
| **Functions / variables** | camelCase | `buildPlannerDigest`, `createProvider`, `getProjectCacheDir`, `hashContent` |
| **Constants (module-level)** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `SPINNER_FRAMES` |
| **Enum-like constants** | UPPER_SNAKE_CASE | `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `SECTION_ORDER` |
| **Private class members** | No leading underscore observed | `CommandRegistry#register`, `StepRunner#startSpinner` |
| **Type parameters** | Single uppercase letter | `AsyncGenerator<StreamChunk>`, `Promise<ChatResponse>` |

---

## 3. Architecture Patterns

| Pattern | Where Observed |
|---------|----------------|
| **Command pattern** | `CommandRegistry` + `Command` interface in `src/commands/registry.ts`; each command in `src/commands/*.ts` registers via `registerXCommand()` |
| **Provider pattern** | `LLMProvider` interface in `src/providers/types.ts`; `OpenAICompatibleProvider` implements it; `createProvider` factory in `src/providers/factory.ts` |
| **Factory pattern** | `createProvider(config)` switches on `config.provider` |
| **Registry pattern** | `CommandRegistry` holds `Map<string, Command>`; `registry.execute(input)` parses `/name args` |
| **Pipeline / Step runner** | `StepRunner` runs steps sequentially or pooled (`runPooled`); `LineSpinner` for per-step animation |
| **Barrel exports** | Every `src/*/index.ts` re-exports from sibling modules |
| **Configuration precedence** | `loadConfig()` in `src/config/index.ts`: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Caching with fingerprints** | `buildFingerprint()` in `src/genesis/fingerprint.ts`; distill cache in `src/genesis/scope.ts` |
| **Git integration** | `getGitInfo()`, `getGitLog()` in `src/genesis/fingerprint.ts` using `execFileSync` |
| **Retry with backoff** | `chatWithRetry()` in `src/providers/retry.ts` with rate-limit detection and exponential backoff |
| **Prompt templates as constants** | `src/prompts/docs/*.ts` export `*_PROMPT` string constants; `src/prompts/pipeline/*.ts` export planner/sync prompts |

---

## 4. File Organization

```
src/
├── cli/           # Entry point only (index.ts)
├── commands/      # One file per command + registry
├── config/        # Config types, loading, scaffolding, readme
├── genesis/       # Core analysis: context, digest, distill, scope, sync, fingerprint
├── prompts/       # Prompt templates (docs/, pipeline/, base.ts, index.ts)
├── providers/     # LLM provider abstraction + factory + retry
├── ui/            # CLI UX: animation, prompt (readline), steps, theme
└── util/          # Pure utilities: env, hash
```

**Rules observed:**
- One primary concern per file.
- Types often co-located in `types.ts` within a domain (`genesis/types.ts`, `config/types.ts`, `providers/types.ts`).
- Constants in `constants.ts` (`genesis/constants.ts`).
- Barrel `index.ts` re-exports everything intended as public API.

---

## 5. Import Conventions

| Rule | Example |
|------|---------|
| **Relative imports use `.js` extension** | `import { playStartupAnimation } from '../ui/animation.js'` |
| **Node built-ins use `node:` prefix** | `import { execFileSync } from 'node:child_process'` |
| **Named imports only** | `import { AetherConfig } from '../config/index.js'` |
| **Barrel imports from domain index** | `import { registry } from './registry.js'` (from `commands/`) |
| **No path aliases** | Not configured in `tsconfig.json`; all relative |

---

## 6. Error Handling

| Pattern | Where Seen |
|---------|------------|
| **Top-level CLI try/catch** | `src/cli/index.ts`: `main()` wraps all logic, logs to `stderr`, `process.exit(1)` |
| **Swallowed errors for non-critical ops** | `saveDistillCache()` in `src/genesis/scope.ts`: `try { ... } catch { /* best effort */ }` |
| **Git commands return `null` on failure** | `getGitInfo()`, `getGitLog()` in `src/genesis/fingerprint.ts` |
| **Retry with exponential backoff** | `chatWithRetry()` in `src/providers/retry.ts`; rate-limit detection upgrades retry budget |
| **Error sanitization for logging** | `formatRetryLine()` truncates to 80 chars, single-line |
| **No `throw` of raw strings** | Errors are `Error` instances or caught from APIs |

---

## 7. Type Patterns

| Pattern | Example |
|---------|---------|
| **Interface for config/contracts** | `AetherConfig`, `LLMProvider`, `ChatRequest`, `ChatResponse` |
| **Type alias for data shapes** | `FileContent`, `ProjectContext`, `FileFingerprint`, `DistillCache` |
| **Union of string literals for enums** | `type DocSection = "Guides" \| "Architecture" \| "Reference" \| "AI Context" \| "Project-specific"` |
| **Generic async generators** | `chatStream(request): AsyncGenerator<StreamChunk>` |
| **Optional properties with `?`** | `apiKey?: string`, `timeout?: number` in `AetherConfig` |
| **`Pick` / `Record` utility types** | `DocIndexEntry = Pick<DocDefinition, ...>`, `Record<string, FileFingerprint>` |
| **No `type` exports for classes** | Classes exported as values (`export class StepRunner`) |
| **No `namespace` or `declare module`** | Not observed |

---

## 8. Do / Don't

### ✅ Do

- **Use ES modules** with `.js` extensions in imports.
- **Enable strict TypeScript** (`"strict": true` in `tsconfig.json`).
- **Export named constants** for prompts, config defaults, limits.
- **Use barrel `index.ts`** to define public API of each domain.
- **Implement provider interfaces** (`LLMProvider`) for external services.
- **Register commands** via `CommandRegistry.register()` in `registerXCommand()` functions.
- **Use `StepRunner`** for multi-step CLI operations with spinners.
- **Cache with content hashes** (`hashContent` using SHA-256) for incremental work.
- **Detect git state** via `execFileSync` for version tracking.
- **Retry LLM calls** with `chatWithRetry`; handle rate limits specially.
- **Sanitize error messages** before logging (single line, length limit).
- **Use `node:` prefix** for built-in modules.
- **Define config precedence** explicitly (global default → global project → local override → env).
- **Write pure utilities** in `src/util/` (e.g., `hash.ts`, `env.ts`).

### ❌ Don't

- **Don't use CommonJS** (`require`, `module.exports`).
- **Don't omit `.js`** on relative imports.
- **Don't use default exports**.
- **Don't use `any`** (strict mode forbids it).
- **Don't throw strings** — throw `Error` instances.
- **Don't skip error handling** on external calls (git, network, FS).
- **Don't hardcode magic numbers** — use constants in `constants.ts` or module-level `UPPER_SNAKE_CASE`.
- **Don't couple domains** — `genesis` doesn't import `cli` or `ui`; `providers` doesn't import `genesis`.
- **Don't put logic in `index.ts` barrels** — only re-exports.
- **Don't use `namespace` or `declare global`**.
- **Don't mutate config objects** — `loadConfig` returns new object; `saveConfig` writes fresh.

---

## 9. Configuration & Environment

| Pattern | Source |
|---------|--------|
| **Env overrides for constants** | `envInt(name, fallback)` in `src/util/env.ts` used in `genesis/constants.ts` |
| **Global config dir** | `~/.aether/` via `getGlobalDir()` in `src/config/index.ts` |
| **Project cache dir** | `~/.aether/cache/<projectId>/` via `getProjectCacheDir()` |
| **Project ID** | `basename(abs) + "-" + sha1(abs).slice(0,12)` in `projectId()` |
| **Provider defaults** | `DEFAULT_CONFIGS` record in `src/config/index.ts` |
| **API key from env** | `AETHER_API_KEY` checked in `loadConfig()` |

---

## 10. Testing & Quality (Observed Config)

| Tool | Config |
|------|--------|
| **TypeScript** | `tsc --noEmit` via `npm run typecheck` |
| **Build** | `tsc` via `npm run build` |
| **Dev run** | `tsx src/cli/index.ts` via `npm run dev` |
| **SEA build** | `node scripts/build-sea.mjs` via `npm run build:sea` |
| **Node engine** | `>=20.0.0` in `package.json` |

> **Note**: No test framework, linting, or formatting config detected in provided files. Do not assume their existence.

---

## 11. References to Actual Files

Every rule above maps to at least one file in the provided context. Examples:

- `tsconfig.json` → strict, ES2022, NodeNext
- `package.json` → `"type": "module"`, scripts, deps
- `src/cli/index.ts` → CLI entry, command registration, error handling
- `src/commands/registry.ts` → `CommandRegistry`, `Command` interface
- `src/providers/types.ts` → `LLMProvider`, `ChatMessage`, `ChatRequest`, `ChatResponse`
- `src/providers/factory.ts` → `createProvider` factory
- `src/providers/retry.ts` → `chatWithRetry`, `formatRetryLine`
- `src/genesis/constants.ts` → `envInt` constants
- `src/genesis/fingerprint.ts` → `buildFingerprint`, `getGitInfo`
- `src/genesis/scope.ts` → `buildSharedProjectContext`, distill cache
- `src/config/index.ts` → config precedence, `loadConfig`, `saveConfig`
- `src/ui/steps.ts` → `StepRunner`, `LineSpinner`
- `src/ui/prompt.ts` → `startChat`, readline completer
- `src/util/hash.ts` → `hashContent` (SHA-256)
- `src/util/env.ts` → `envInt`

---

**End of Coding Standards** — derived exclusively from the provided project context.