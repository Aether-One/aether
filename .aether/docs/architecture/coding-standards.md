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
| **File extension for ES modules**: `.mjs` used for build scripts | `scripts/build-sea.mjs` |
| **ESM import of JSON**: `import ... assert { type: 'json' }` | `scripts/build-sea.mjs` imports `sea-config.json` and `package.json` with `assert { type: 'json' }` |

## 2. Naming Conventions

| Category | Convention | Examples |
|----------|------------|----------|
| **Files** | kebab-case | `build-sea.mjs`, `ai-context.ts`, `openai-compatible.ts`, `cli/index.ts`, `openrouter.ts`, `metered.ts`, `estimate.ts`, `cancel.ts`, `confirm.ts`, `cost.ts`, `anthropic.ts`, `tokens.ts` |
| **Directories** | kebab-case | `src/commands/`, `src/genesis/`, `src/providers/`, `src/pricing/`, `src/ui/` |
| **Classes** | PascalCase | `CommandRegistry`, `StepRunner`, `LineSpinner`, `OpenAICompatibleProvider`, `OpenRouterProvider`, `AnthropicProvider`, `MeteredProvider`, `StepRunner` |
| **Interfaces** | PascalCase | `AetherConfig`, `ChatMessage`, `LLMProvider`, `ProjectContext`, `FileFingerprint`, `ModelPricing`, `OpenRouterModel`, `UsageTotals`, `PingResult` |
| **Type aliases** | PascalCase | `FileContent`, `DocSection`, `DistillCache`, `SyncPlan`, `CostEstimate`, `DistillPlan`, `DistillJob`, `CustomDocSpec`, `DocIndexEntry`, `DocMeta`, `FileDiff`, `SyncPlan`, `SectionPatch`, `AssembleHooks`, `DistillHooks` |
| **Union types (enum-like)** | PascalCase | `DocSection = "Guides" \| "Architecture" \| ...`, `DocSection = "Guides" \| "Architecture" \| "Reference" \| "AI Context" \| "Project-specific"` |
| **Functions / variables** | camelCase | `buildPlannerDigest`, `createProvider`, `getProjectCacheDir`, `hashContent`, `getModelPricing`, `estimateGenesis`, `estimateSync`, `buildFingerprint`, `getGitInfo`, `buildSharedProjectContext`, `chatWithRetry`, `formatRetryLine`, `hashContent`, `envInt`, `tokensFromChars`, `sharedContextChars`, `distillPlan`, `assemble`, `clamp` |
| **Constants (module-level)** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `SPINNER_FRAMES`, `OPENROUTER_MODELS_URL`, `CACHE_TTL_MS`, `STATIC_PER_MTOK`, `REFRESH_OUT_LOW`, `REFRESH_OUT_HIGH`, `NEW_DOC_OUT_LOW`, `NEW_DOC_OUT_HIGH`, `GENESIS_OUT_LOW`, `GENESIS_OUT_HIGH`, `DISTILL_OUTPUT_PER_CHUNK`, `PROMPT_OVERHEAD_CHARS`, `GENESIS_DOC_CONTEXT_RATIO`, `GENESIS_DOC_CHARS_MIN`, `GENESIS_DOC_CHARS_MAX`, `DEFAULT_DOC_CHARS`, `MAX_PLAN_ATTEMPTS`, `MAX_CUSTOM_DOCS`, `CORE_IDS`, `SECTION_ORDER`, `DOC_DEFINITIONS`, `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `PROVIDER_HOSTS` |
| **Enum-like constants** | UPPER_SNAKE_CASE | `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `SECTION_ORDER`, `CORE_IDS`, `PROVIDER_HOSTS` |
| **Private class members** | No leading underscore observed | `CommandRegistry#register`, `StepRunner#startSpinner`, `MeteredProvider#inner`, `MeteredProvider#totals` |
| **Type parameters** | Single uppercase letter | `AsyncGenerator<StreamChunk>`, `Promise<ChatResponse>`, `Record<string, FileFingerprint>` |

## 3. Architecture Patterns

| Pattern | Where Observed |
|---------|----------------|
| **Command pattern** | `CommandRegistry` + `Command` interface in `src/commands/registry.ts`; each command in `src/commands/*.ts` registers via `registerXCommand()` |
| **Provider pattern** | `LLMProvider` interface in `src/providers/types.ts`; `OpenAICompatibleProvider` implements it; `OpenRouterProvider` extends `OpenAICompatibleProvider`; `AnthropicProvider` implements it; `createProvider` factory in `src/providers/factory.ts` |
| **Factory pattern** | `createProvider(config)` switches on `config.provider` in `src/providers/factory.ts` |
| **Registry pattern** | `CommandRegistry` holds `Map<string, Command>`; `registry.execute(input)` parses `/name args` |
| **Pipeline / Step runner** | `StepRunner` runs steps sequentially or pooled (`runPooled`); `LineSpinner` for per-step animation in `src/ui/steps.ts` |
| **Barrel exports** | Every `src/*/index.ts` re-exports from sibling modules |
| **Configuration precedence** | `loadConfig()` in `src/config/index.ts`: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Caching with fingerprints** | `buildFingerprint()` in `src/genesis/fingerprint.ts`; distill cache in `src/genesis/scope.ts`; pricing cache in `src/pricing/index.ts` |
| **Git integration** | `getGitInfo()`, `getGitLog()` in `src/genesis/fingerprint.ts` using `execFileSync` |
| **Retry with backoff** | `chatWithRetry()` in `src/providers/retry.ts` with rate-limit detection and exponential backoff |
| **Prompt templates as constants** | `src/prompts/docs/*.ts` export `*_PROMPT` string constants; `src/prompts/pipeline/*.ts` export planner/sync prompts |
| **Provider-specific behavior via inheritance** | `OpenRouterProvider` extends `OpenAICompatibleProvider` and overrides `providerParams()` to disable reasoning tokens in `src/providers/openrouter.ts` |
| **Usage metering wrapper** | `MeteredProvider` wraps any `LLMProvider` and tracks token usage in `src/providers/metered.ts` |
| **Pricing catalog with caching** | `loadCatalog()` fetches from OpenRouter with 24h TTL cache in `src/pricing/index.ts` |
| **Cost estimation** | `estimateGenesis()` and `estimateSync()` in `src/genesis/estimate.ts` compute token/cost estimates |
| **UI cancellation handling** | `setupCancelHandler()` in `src/ui/cancel.ts` sets up SIGINT/SIGTERM handlers |
| **UI confirmation prompts** | `confirm()` in `src/ui/confirm.ts` for interactive confirmations |
| **Cost display formatting** | `formatCost()`, `formatTokens()` in `src/ui/cost.ts` for CLI cost display |
| **Token counting utility** | `countTokens()` in `src/util/tokens.ts` using GPT tokenizer approximation |

## 4. File Organization

 
src/
├── cli/           # Entry point only (index.ts)
├── commands/      # One file per command + registry
├── config/        # Config types, loading, scaffolding, readme
├── genesis/       # Core analysis: context, digest, distill, scope, sync, fingerprint, estimate, exclude
├── pricing/       # Pricing catalog, caching, cost estimation
├── prompts/       # Prompt templates (docs/, pipeline/, base.ts, index.ts)
├── providers/     # LLM provider abstraction + factory + retry + metered + anthropic + openrouter
├── ui/            # CLI UX: animation, prompt (readline), steps, theme, cancel, confirm, cost
└── util/          # Pure utilities: env, hash, tokens
 

**Rules observed:**
- One primary concern per file.
- Types often co-located in `types.ts` within a domain (`genesis/types.ts`, `config/types.ts`, `providers/types.ts`).
- Constants in `constants.ts` (`genesis/constants.ts`).
- Barrel `index.ts` re-exports everything intended as public API.
- New domains get their own directory (`pricing/`, `ui/cancel.ts`, `ui/confirm.ts`, `ui/cost.ts`, `providers/anthropic.ts`, `providers/openrouter.ts`, `providers/metered.ts`, `util/tokens.ts`, `genesis/exclude.ts`).

## 5. Import Conventions

| Rule | Example |
|------|---------|
| **Relative imports use `.js` extension** | `import { playStartupAnimation } from '../ui/animation.js'` |
| **Node built-ins use `node:` prefix** | `import { execFileSync } from 'node:child_process'` |
| **Named imports only** | `import { AetherConfig } from '../config/index.js'` |
| **Barrel imports from domain index** | `import { registry } from './registry.js'` (from `commands/`) |
| **No path aliases** | Not configured in `tsconfig.json`; all relative |
| **JSON imports with import assertions** | `import seaConfig from '../sea-config.json' assert { type: 'json' }` in `scripts/build-sea.mjs` |
| **Package.json imports with assertions** | `import pkg from '../package.json' assert { type: 'json' }` in `scripts/build-sea.mjs` |
| **Sibling module imports in commands** | `import { loadExcludes, addExclude, removeExclude } from '../genesis/exclude.js'` in `src/commands/exclude.ts` |
| **Sibling module imports in genesis** | `import { loadExcludes, addExclude, removeExclude } from './exclude.js'` in `src/genesis/context.ts` |
| **UI prompt imports from genesis** | `import { loadExcludes } from '../genesis/exclude.js'` in `src/ui/prompt.ts` |

## 6. Error Handling

| Pattern | Where Seen |
|---------|------------|
| **Top-level CLI try/catch** | `src/cli/index.ts`: `main()` wraps all logic, logs to `stderr`, `process.exit(1)` |
| **Swallowed errors for non-critical ops** | `saveDistillCache()` in `src/genesis/scope.ts`: `try { ... } catch { /* best effort */ }` |
| **Git commands return `null` on failure** | `getGitInfo()`, `getGitLog()` in `src/genesis/fingerprint.ts` |
| **Retry with exponential backoff** | `chatWithRetry()` in `src/providers/retry.ts`; rate-limit detection upgrades retry budget |
| **Error sanitization for logging** | `formatRetryLine()` truncates to 80 chars, single-line in `src/providers/retry.ts` |
| **No `throw` of raw strings** | Errors are `Error` instances or caught from APIs |
| **Provider ping returns structured error info** | `PingResult` in `src/providers/types.ts` includes `reason`, `status`, `message` |
| **AbortSignal support for cancellation** | `ChatRequest` includes optional `signal?: AbortSignal` in `src/providers/types.ts` |
| **Cancellation handler setup** | `setupCancelHandler()` in `src/ui/cancel.ts` registers SIGINT/SIGTERM handlers |
| **Confirmation prompts for destructive actions** | `confirm()` in `src/ui/confirm.ts` prompts user before destructive operations |

## 7. Type Patterns

| Pattern | Example |
|---------|---------|
| **Interface for config/contracts** | `AetherConfig`, `LLMProvider`, `ChatRequest`, `ChatResponse`, `PingResult`, `ModelPricing`, `OpenRouterModel`, `UsageTotals` |
| **Type alias for data shapes** | `FileContent`, `ProjectContext`, `FileFingerprint`, `DistillCache`, `CostEstimate`, `DistillPlan`, `DistillJob`, `CustomDocSpec`, `DocIndexEntry`, `DocMeta`, `FileDiff`, `SyncPlan`, `SectionPatch`, `AssembleHooks`, `DistillHooks` |
| **Union of string literals for enums** | `type DocSection = "Guides" \| "Architecture" \| "Reference" \| "AI Context" \| "Project-specific"` |
| **Generic async generators** | `chatStream(request): AsyncGenerator<StreamChunk>` in `LLMProvider` |
| **Optional properties with `?`** | `apiKey?: string`, `timeout?: number` in `AetherConfig`; `reason?: "timeout" \| "network" \| "http"` in `PingResult` |
| **`Pick` / `Record` utility types** | `DocIndexEntry = Pick<DocDefinition, ...>`, `Record<string, FileFingerprint>` |
| **No `type` exports for classes** | Classes exported as values (`export class StepRunner`) |
| **No `namespace` or `declare module`** | Not observed |
| **Re-export types from domain index** | `src/providers/index.ts` re-exports `LLMProvider`, `ChatMessage`, etc. from `./types.js` |
| **Provider-specific types** | `OpenRouterModel` in `src/pricing/index.ts` with `id`, `pricing.prompt`, `pricing.completion` |

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
- **Write pure utilities** in `src/util/` (e.g., `hash.ts`, `env.ts`, `tokens.ts`).
- **Extend base providers for provider-specific behavior** (e.g., `OpenRouterProvider` extends `OpenAICompatibleProvider`).
- **Wrap providers for cross-cutting concerns** (e.g., `MeteredProvider` wraps any `LLMProvider` for usage tracking).
- **Cache external catalogs with TTL** (e.g., OpenRouter pricing catalog with 24h TTL).
- **Estimate costs before expensive operations** (e.g., `estimateGenesis`, `estimateSync`).
- **Handle cancellation signals** via `AbortSignal` in async operations.
- **Prompt for confirmation** before destructive operations.
- **Format costs and tokens** for human-readable CLI output.
- **Approximate token counts** with utility functions when exact counts unavailable.

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
- **Don't hardcode provider-specific logic in base classes** — override in subclasses (e.g., `OpenRouterProvider.providerParams()`).
- **Don't skip caching for expensive external calls** — use TTL-based file caches.
- **Don't estimate costs without pricing data** — fall back to static tables when live catalog unavailable.
- **Don't ignore rate limit signals** — detect and extend retry budget.
- **Don't log raw error objects** — sanitize first.
- **Don't omit `AbortSignal` support** in long-running async operations.
- **Don't perform destructive actions without confirmation** in interactive mode.
- **Don't show raw token counts** — format for readability.

## 9. Configuration & Environment

| Pattern | Source |
|---------|--------|
| **Env overrides for constants** | `envInt(name, fallback)` in `src/util/env.ts` used in `genesis/constants.ts` |
| **Global config dir** | `~/.aether/` via `getGlobalDir()` in `src/config/index.ts` |
| **Project cache dir** | `~/.aether/cache/<projectId>/` via `getProjectCacheDir()` |
| **Project ID** | `basename(abs) + "-" + sha1(abs).slice(0,12)` in `projectId()` |
| **Provider defaults** | `DEFAULT_CONFIGS` record in `src/config/index.ts` |
| **API key from env** | `AETHER_API_KEY` checked in `loadConfig()` |
| **Pricing cache** | `~/.aether/cache/pricing.json` with 24h TTL in `src/pricing/index.ts` |
| **Distill cache** | `<projectCacheDir>/distill-cache.json` in `src/genesis/scope.ts` |
| **Provider-specific defaults** | `DEFAULT_CONFIGS` includes `openai`, `anthropic`, `gemini`, `openrouter` with model/baseUrl defaults |
| **Provider detection from baseUrl** | `detectProviderFromBaseUrl()` matches hostnames in `src/config/index.ts` |
| **Config validation** | `validateConfig()` checks provider, model, baseUrl, apiKey in `src/config/index.ts` |
| **API key masking in output** | `maskKey()` shows first 4 + `••••` + last 4 in `src/commands/config.ts` |

## 10. Testing & Quality (Observed Config)

| Tool | Config |
|------|--------|
| **TypeScript** | `tsc --noEmit` via `npm run typecheck` |
| **Build** | `tsc` via `npm run build` |
| **Dev run** | `tsx src/cli/index.ts` via `npm run dev` |
| **SEA build** | `node scripts/build-sea.mjs` via `npm run build:sea` |
| **Node engine** | `>=20.0.0` in `package.json` |
| **Dependencies** | `@clack/core`, `chalk` (runtime); `@types/node`, `esbuild`, `postject`, `tsx`, `typescript` (dev) |

> **Note**: No test framework, linting, or formatting config detected in provided files. Do not assume their existence.

## 11. References to Actual Files

Every rule above maps to at least one file in the provided context. Examples:

- `tsconfig.json` → strict, ES2022, NodeNext
- `package.json` → `"type": "module"`, scripts, deps
- `src/cli/index.ts` → CLI entry, command registration, error handling
- `src/commands/registry.ts` → `CommandRegistry`, `Command` interface
- `src/providers/types.ts` → `LLMProvider`, `ChatMessage`, `ChatRequest`, `ChatResponse`, `PingResult`, `StreamChunk`
- `src/providers/factory.ts` → `createProvider` factory
- `src/providers/retry.ts` → `chatWithRetry`, `formatRetryLine`
- `src/providers/openrouter.ts` → `OpenRouterProvider` extends `OpenAICompatibleProvider`
- `src/providers/anthropic.ts` → `AnthropicProvider` implements `LLMProvider`
- `src/providers/metered.ts` → `MeteredProvider` wraps `LLMProvider`
- `src/providers/openai-compatible.ts` → `OpenAICompatibleProvider` base class
- `src/genesis/constants.ts` → `envInt` constants
- `src/genesis/fingerprint.ts` → `buildFingerprint`, `getGitInfo`
- `src/genesis/scope.ts` → `buildSharedProjectContext`, distill cache
- `src/genesis/estimate.ts` → `estimateGenesis`, `estimateSync`, cost estimation
- `src/genesis/sync.ts` → `syncProject`, `SyncPlan`, `SectionPatch`
- `src/genesis/exclude.ts` → `loadExcludes`, `addExclude`, `removeExclude`
- `src/genesis/context.ts` → `collectDirectories`, `buildProjectContext`
- `src/config/index.ts` → config precedence, `loadConfig`, `saveConfig`
- `src/ui/steps.ts` → `StepRunner`, `LineSpinner`
- `src/ui/prompt.ts` → `startChat`, readline completer
- `src/ui/cancel.ts` → `setupCancelHandler`
- `src/ui/confirm.ts` → `confirm`
- `src/ui/cost.ts` → `formatCost`, `formatTokens`
- `src/util/hash.ts` → `hashContent` (SHA-256)
- `src/util/env.ts` → `envInt`
- `src/util/tokens.ts` → `countTokens`
- `src/pricing/index.ts` → `getModelPricing`, `loadCatalog`, pricing cache
- `scripts/build-sea.mjs` → SEA build with esbuild + postject
- `src/prompts/index.ts` → barrel export of all prompt templates
- `src/prompts/docs/*.ts` → per-document prompt constants
- `src/prompts/pipeline/*.ts` → planner/sync prompt constants
- `src/config/readme.ts` → `AETHER_README` constant
- `src/config/scaffold.ts` → `ensureProjectReadme`
- `src/config/types.ts` → `AetherConfig` interface
- `src/genesis/types.ts` → core domain types
- `src/genesis/digest.ts` → `buildPlannerDigest`
- `src/genesis/distill.ts` → `distillFilesIncremental`
- `src/genesis/planner.ts` → `planDocs`, `parsePlan`, `extractJsonArray`
- `src/commands/config.ts` → `registerConfigCommand`, config helpers
- `src/commands/help.ts` → `registerHelpCommand`
- `src/commands/builtins.ts` → `registerBuiltinCommands`
- `src/commands/clean.ts` → `registerCleanCommand`
- `src/commands/exclude.ts` → `registerExcludeCommand`
