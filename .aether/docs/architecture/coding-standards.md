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
| **Regex literals** | Used in `src/genesis/digest.ts` (`ROUTE_RE`, `DOMAIN_RE`, `TEST_RE`, `SYMBOL_RE`), `src/genesis/exclude.ts`, `src/genesis/sync.ts` (`H2_RE`), `src/ui/prompt.ts` (`REMOVE_RE`, `CLEANCODE_RE`), `src/genesis/cleancode-heuristics.ts` (`LONG_FUNCTION_RE`, `DEEP_NESTING_RE`, `MAGIC_NUMBER_RE`, `NAMING_RE`, `DUPLICATION_RE`, `DEAD_CODE_RE`, `ERROR_HANDLING_RE`, `COMPLEXITY_RE`) |
| **Async generators** | `chatStream` in `src/providers/types.ts`, `OpenAICompatibleProvider`, `AnthropicProvider`; `distillFilesIncremental` in `src/genesis/distill.ts` |
| **Async iterators** | `for await (const chunk of ...)` in `src/providers/openai-compatible.ts`, `src/providers/anthropic.ts`, `src/genesis/distill.ts` |
| **AbortController with idle timeout** | `src/providers/openai-compatible.ts`, `src/providers/anthropic.ts` reset timeout on each chunk |
| **SSE parsing** | Manual parsing in `src/providers/openai-compatible.ts` and `src/providers/anthropic.ts` (handling `data:`, `[DONE]`, comments) |
| **JSON extraction from LLM output** | `extractJsonArray` in `src/genesis/planner.ts`, `src/genesis/sync.ts` (handles markdown fences, finds first `[`/`{`) |
| **Git via `execFileSync`** | `src/genesis/fingerprint.ts` uses `execFileSync('git', ...)` for `rev-parse`, `status`, `log` |
| **SHA-256 via `node:crypto`** | `src/util/hash.ts` uses `createHash('sha256')` |
| **SHA-1 for project ID** | `src/config/index.ts` uses `createHash('sha1')` |
| **Token estimation heuristic** | `src/util/tokens.ts` uses `Math.ceil(text.length / 4)` |
| **Cost estimation with token math** | `src/genesis/estimate.ts` uses `tokensFromChars = Math.ceil(chars / 4)` and pricing per 1M tokens |
| **Cost formatting** | `src/ui/cost.ts` formats USD with 4 decimals for <$0.01, 2 decimals otherwise |
| **Token formatting** | `src/ui/cost.ts` formats with commas (e.g., `1,234`) |
| **Spinner animation** | `src/ui/steps.ts` uses `SPINNER_FRAMES` array with 80ms interval |
| **ANSI cursor control** | `src/ui/steps.ts` uses `\x1b[1A\x1b[2K` for line up/clear |
| **Raw mode stdin for keypress** | `src/ui/cancel.ts`, `src/ui/confirm.ts`, `src/ui/prompt.ts` use `stdin.setRawMode(true)` |
| **Readline completer with dropdown** | `src/ui/prompt.ts` uses `@clack/core` `TextPrompt` with custom `frame()` rendering dropdowns |
| **Path picker with `@` trigger** | `src/ui/prompt.ts` `ChatPrompt` shows path dropdown when `@` typed |
| **Tab completion for slash commands** | `src/ui/prompt.ts` `completeSlash()` returns completion or common prefix |
| **Rotating tips in REPL** | `src/ui/prompt.ts` `TIPS` array printed every 4 messages |
| **Concurrent step runner with pool** | `src/ui/steps.ts` `StepRunner.runPooled(limit, fn)` runs up to `limit` concurrent steps |
| **AbortSignal propagation** | `ChatRequest.signal` in `src/providers/types.ts`; passed through `chatWithRetry`, providers, `MeteredProvider` |
| **Cancellation handler** | `src/ui/cancel.ts` `setupCancelHandler()` sets up SIGINT/SIGTERM and raw mode ESC/q/Ctrl+C |
| **Confirmation prompt** | `src/ui/confirm.ts` `confirm()` uses raw mode for y/n/ESC/Ctrl+C |
| **Cost estimation before AI calls** | `src/commands/cleancode.ts` calls `estimateCleanCode()` and prompts for confirmation |
| **Heuristic + hybrid clean code scan** | `src/genesis/cleancode-heuristics.ts` (regex heuristics) + `src/genesis/cleancode.ts` (AI hybrid) |
| **Clean code paradigms** | `src/prompts/pipeline/cleancode.ts` defines `CleanCodeParadigm` enum and `PARADIGMS` specs |
| **Ignore patterns for clean code** | `src/genesis/exclude.ts` `loadCleanCodeIgnore`/`addCleanCodeIgnorePattern` with glob patterns |
| **Distill cache with model key** | `src/genesis/scope.ts` `DistillCache` includes `model` field; invalidated on model change |
| **Git fingerprinting** | `src/genesis/fingerprint.ts` `buildFingerprint` hashes file contents; `getGitInfo` gets commit/branch/dirty |
| **Distill incremental with concurrency** | `src/genesis/distill.ts` `distillFilesIncremental` processes chunks with `p-limit` style concurrency |
| **Pricing catalog with TTL cache** | `src/pricing/index.ts` `loadCatalog()` caches OpenRouter models for 24h |
| **Static pricing fallback** | `src/pricing/index.ts` `STATIC_PER_MTOK` fallback for 10 models |
| **Provider factory** | `src/providers/factory.ts` `createProvider()` switches on `config.provider` |
| **Provider inheritance** | `OpenRouterProvider` extends `OpenAICompatibleProvider` and overrides `providerParams()` |
| **Provider wrapper for metering** | `MeteredProvider` wraps any `LLMProvider` and tracks token usage |
| **Retry with rate-limit detection** | `src/providers/retry.ts` `chatWithRetry` detects 429/rate-limit and switches to longer backoff |
| **Error sanitization for logging** | `src/providers/retry.ts` `formatRetryLine` truncates to 80 chars, single line |
| **Config precedence** | `src/config/index.ts` `loadConfig()`: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Config validation** | `src/config/index.ts` `validateConfig()` checks provider, model, baseUrl, apiKey |
| **API key masking** | `src/commands/config.ts` `maskKey()` shows first 4 + `••••` + last 4 |
| **Project ID from path hash** | `src/config/index.ts` `projectId()` uses `basename + '-' + sha1(abs).slice(0,12)` |
| **Global config dir** | `src/config/index.ts` `getGlobalDir()` returns `~/.aether` |
| **Project cache dir** | `src/config/index.ts` `getProjectCacheDir()` returns `~/.aether/cache/<projectId>/` |
| **Distill cache path** | `src/genesis/scope.ts` `distillCachePath()` returns `<projectCacheDir>/distill-cache.json` |
| **Pricing cache path** | `src/pricing/index.ts` `cachePath()` returns `~/.aether/cache/pricing.json` |
| **Exclude file path** | `src/genesis/exclude.ts` `excludeFilePath()` returns `.aether/settings/exclude.json` |
| **Clean code ignore path** | `src/genesis/cleancode.ts` `cleanCodeIgnorePath()` returns `.aether/cleancode-ignore.json` |
| **Clean code paradigm path** | `src/genesis/cleancode.ts` `cleanCodeParadigmPath()` returns `.aether/cleancode-paradigm.json` |
| **Clean code report path** | `src/genesis/cleancode.ts` `cleanCodeReportPath()` returns `.aether/cleancode-report.md` |
| **Snapshot path** | `src/genesis/sync.ts` `snapshotPath()` returns `.aether/settings/context.json` |
| **Legacy snapshot path** | `src/genesis/sync.ts` `resolveSnapshotPath()` checks `.aether/context.json` |
| **Project readme scaffold** | `src/config/scaffold.ts` `ensureProjectReadme()` writes `.aether/README.md` |
| **Global readme content** | `src/config/readme.ts` `AETHER_README` constant |
| **Command registry** | `src/commands/registry.ts` `CommandRegistry` with `register`, `get`, `getAll`, `execute` |
| **Command registration functions** | Each `src/commands/*.ts` exports `registerXCommand()` calling `registry.register()` |
| **CLI entry registers all commands** | `src/cli/index.ts` calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, `registerCleanCommand()`, `registerCleanCodeCommand()`, `registerExcludeCommand()`, `registerPromptCommand()` |
| **Startup animation** | `src/cli/index.ts` calls `playStartupAnimation()` if TTY and not `--no-animation` |
| **Banner fallback** | `src/cli/index.ts` calls `printBanner()` if not interactive or `--no-animation` |
| **Chat REPL** | `src/cli/index.ts` calls `startChat()` from `src/ui/prompt.ts` |
| **Version flag** | `src/cli/index.ts` checks `--version`, `-v`, `-version` and prints `__AETHER_VERSION__` or `0.0.0-dev` |
| **Top-level error handling** | `src/cli/index.ts` `main().catch(err => { stderr.write(err + '\n'); process.exit(1); })` |
| **ESM import assertions for JSON** | `scripts/build-sea.mjs` uses `assert { type: 'json' }` for `sea-config.json` and `package.json` |
| **SEA build with esbuild + postject** | `scripts/build-sea.mjs` bundles with esbuild, injects blob with postject |
| **No test framework detected** | Not in `package.json` devDependencies |
| **No lint/formatter config detected** | Not in provided files |
| **Node engine >=20** | `package.json` `"engines": { "node": ">=20.0.0" }` |
| **Runtime deps**: `@clack/core`, `chalk` | `package.json` dependencies |
| **Dev deps**: `@types/node`, `esbuild`, `postject`, `tsx`, `typescript` | `package.json` devDependencies |

## 2. Naming Conventions

| Category | Convention | Examples |
|----------|------------|----------|
| **Files** | kebab-case | `build-sea.mjs`, `ai-context.ts`, `openai-compatible.ts`, `cli/index.ts`, `openrouter.ts`, `metered.ts`, `estimate.ts`, `cancel.ts`, `confirm.ts`, `cost.ts`, `anthropic.ts`, `tokens.ts`, `cleancode-heuristics.ts`, `cleancode.ts`, `cleancode.ts` (command), `prompt.ts` (command) |
| **Directories** | kebab-case | `src/commands/`, `src/genesis/`, `src/providers/`, `src/pricing/`, `src/ui/`, `src/prompts/pipeline/`, `src/prompts/docs/` |
| **Classes** | PascalCase | `CommandRegistry`, `StepRunner`, `LineSpinner`, `OpenAICompatibleProvider`, `OpenRouterProvider`, `AnthropicProvider`, `MeteredProvider`, `ChatPrompt` |
| **Interfaces** | PascalCase | `AetherConfig`, `ChatMessage`, `LLMProvider`, `ProjectContext`, `FileFingerprint`, `ModelPricing`, `OpenRouterModel`, `UsageTotals`, `PingResult`, `CleanCodeIssue`, `CleanCodeReport`, `CleanCodeIgnoreList`, `CleanCodeParadigm`, `ParadigmSpec` |
| **Type aliases** | PascalCase | `FileContent`, `DocSection`, `DistillCache`, `SyncPlan`, `CostEstimate`, `DistillPlan`, `DistillJob`, `CustomDocSpec`, `DocIndexEntry`, `DocMeta`, `FileDiff`, `SyncPlan`, `SectionPatch`, `AssembleHooks`, `DistillHooks`, `ParsedPlan`, `RawSection`, `SectionPatch` |
| **Union types (enum-like)** | PascalCase | `DocSection = "Guides" | "Architecture" | ...`, `CleanCodeParadigm = "clean-code" | "solid" | "functional" | "google-style"` |
| **Functions / variables** | camelCase | `buildPlannerDigest`, `createProvider`, `getProjectCacheDir`, `hashContent`, `getModelPricing`, `estimateGenesis`, `estimateSync`, `buildFingerprint`, `getGitInfo`, `buildSharedProjectContext`, `chatWithRetry`, `formatRetryLine`, `hashContent`, `envInt`, `tokensFromChars`, `sharedContextChars`, `distillPlan`, `assemble`, `clamp`, `scanCleanCodeHeuristics`, `flaggedFiles`, `scanCleanCodeHybrid`, `buildCleanCodeReport`, `buildCleanCodeMarkdown`, `writeCleanCodeMarkdown`, `cleanCodeMarkdownRelPath`, `loadCleanCodeIgnore`, `addCleanCodeIgnorePattern`, `loadCleanCodeParadigm`, `setCleanCodeParadigm` |
| **Constants (module-level)** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `SPINNER_FRAMES`, `OPENROUTER_MODELS_URL`, `CACHE_TTL_MS`, `STATIC_PER_MTOK`, `REFRESH_OUT_LOW`, `REFRESH_OUT_HIGH`, `NEW_DOC_OUT_LOW`, `NEW_DOC_OUT_HIGH`, `GENESIS_OUT_LOW`, `GENESIS_OUT_HIGH`, `DISTILL_OUTPUT_PER_CHUNK`, `PROMPT_OVERHEAD_CHARS`, `GENESIS_DOC_CONTEXT_RATIO`, `GENESIS_DOC_CHARS_MIN`, `GENESIS_DOC_CHARS_MAX`, `DEFAULT_DOC_CHARS`, `MAX_PLAN_ATTEMPTS`, `MAX_CUSTOM_DOCS`, `CORE_IDS`, `SECTION_ORDER`, `DOC_DEFINITIONS`, `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `PROVIDER_HOSTS`, `MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`, `DOC_CONTEXT_BUDGET`, `GEN_CONCURRENCY`, `DISTILL_CONCURRENCY`, `CLEANCODE_CONTEXT_BUDGET`, `LONG_FUNCTION_THRESHOLD`, `DEEP_NESTING_THRESHOLD`, `MAGIC_NUMBER_RE`, `NAMING_RE`, `DUPLICATION_RE`, `DEAD_CODE_RE`, `ERROR_HANDLING_RE`, `COMPLEXITY_RE`, `ROUTE_RE`, `DOMAIN_RE`, `TEST_RE`, `SYMBOL_RE`, `H2_RE`, `REMOVE_RE`, `CLEANCODE_RE`, `TIPS`, `MAX_DROPDOWN`, `MAX_PATH_DROPDOWN`, `PARADIGMS`, `DEFAULT_PARADIGM`, `OPTIMIZE_PROMPT`, `PLANNER_PROMPT`, `SYNC_PLANNER_PROMPT`, `SECTION_PATCH_INSTRUCTIONS`, `DOC_UPDATE_INSTRUCTIONS`, `BASE_PROMPT`, `PROMPT_SUFFIX`, `HUMAN_BASE_PROMPT`, `HUMAN_PROMPT_SUFFIX` |
| **Enum-like constants** | UPPER_SNAKE_CASE | `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `SECTION_ORDER`, `CORE_IDS`, `PROVIDER_HOSTS`, `PARADIGMS` |
| **Private class members** | No leading underscore observed | `CommandRegistry#register`, `StepRunner#startSpinner`, `MeteredProvider#inner`, `MeteredProvider#totals`, `ChatPrompt#dirs`, `ChatPrompt#files`, `ChatPrompt#excluded` |
| **Type parameters** | Single uppercase letter | `AsyncGenerator<StreamChunk>`, `Promise<ChatResponse>`, `Record<string, FileFingerprint>` |
| **Regex constants** | UPPER_SNAKE_CASE with `_RE` suffix | `ROUTE_RE`, `DOMAIN_RE`, `TEST_RE`, `SYMBOL_RE`, `H2_RE`, `REMOVE_RE`, `CLEANCODE_RE`, `LONG_FUNCTION_RE`, `DEEP_NESTING_RE`, `MAGIC_NUMBER_RE`, `NAMING_RE`, `DUPLICATION_RE`, `DEAD_CODE_RE`, `ERROR_HANDLING_RE`, `COMPLEXITY_RE` |

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
| **Prompt templates as constants** | `src/prompts/docs/*.ts` export `*_PROMPT` string constants; `src/prompts/pipeline/*.ts` export planner/sync/cleancode/optimize prompts |
| **Provider-specific behavior via inheritance** | `OpenRouterProvider` extends `OpenAICompatibleProvider` and overrides `providerParams()` to disable reasoning tokens in `src/providers/openrouter.ts` |
| **Usage metering wrapper** | `MeteredProvider` wraps any `LLMProvider` and tracks token usage in `src/providers/metered.ts` |
| **Pricing catalog with caching** | `loadCatalog()` fetches from OpenRouter with 24h TTL cache in `src/pricing/index.ts` |
| **Cost estimation** | `estimateGenesis()` and `estimateSync()` in `src/genesis/estimate.ts` compute token/cost estimates; `estimateCleanCode()` in `src/genesis/cleancode.ts` |
| **UI cancellation handling** | `setupCancelHandler()` in `src/ui/cancel.ts` sets up SIGINT/SIGTERM handlers |
| **UI confirmation prompts** | `confirm()` in `src/ui/confirm.ts` for interactive confirmations |
| **Cost display formatting** | `formatCost()`, `formatTokens()` in `src/ui/cost.ts` for CLI cost display |
| **Token counting utility** | `countTokens()` in `src/util/tokens.ts` using GPT tokenizer approximation |
| **Heuristic + hybrid clean code scan** | `src/genesis/cleancode-heuristics.ts` (regex heuristics) + `src/genesis/cleancode.ts` (AI hybrid) |
| **Clean code paradigms** | `src/prompts/pipeline/cleancode.ts` defines `CleanCodeParadigm` enum and `PARADIGMS` specs |
| **Ignore patterns for clean code** | `src/genesis/exclude.ts` `loadCleanCodeIgnore`/`addCleanCodeIgnorePattern` with glob patterns |
| **Distill cache with model key** | `src/genesis/scope.ts` `DistillCache` includes `model` field; invalidated on model change |
| **Git fingerprinting** | `src/genesis/fingerprint.ts` `buildFingerprint` hashes file contents; `getGitInfo` gets commit/branch/dirty |
| **Distill incremental with concurrency** | `src/genesis/distill.ts` `distillFilesIncremental` processes chunks with `p-limit` style concurrency |
| **Pricing catalog with TTL cache** | `src/pricing/index.ts` `loadCatalog()` caches OpenRouter models for 24h |
| **Static pricing fallback** | `src/pricing/index.ts` `STATIC_PER_MTOK` fallback for 10 models |
| **Provider factory** | `src/providers/factory.ts` `createProvider()` switches on `config.provider` |
| **Provider inheritance** | `OpenRouterProvider` extends `OpenAICompatibleProvider` and overrides `providerParams()` |
| **Provider wrapper for metering** | `MeteredProvider` wraps any `LLMProvider` for usage tracking |
| **Retry with rate-limit detection** | `src/providers/retry.ts` `chatWithRetry` detects 429/rate-limit and switches to longer backoff |
| **Error sanitization for logging** | `src/providers/retry.ts` `formatRetryLine` truncates to 80 chars, single line |
| **Config precedence** | `src/config/index.ts` `loadConfig()`: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Config validation** | `src/config/index.ts` `validateConfig()` checks provider, model, baseUrl, apiKey |
| **API key masking** | `src/commands/config.ts` `maskKey()` shows first 4 + `••••` + last 4 |
| **Project ID from path hash** | `src/config/index.ts` `projectId()` uses `basename + '-' + sha1(abs).slice(0,12)` |
| **Global config dir** | `src/config/index.ts` `getGlobalDir()` returns `~/.aether` |
| **Project cache dir** | `src/config/index.ts` `getProjectCacheDir()` returns `~/.aether/cache/<projectId>/` |
| **Distill cache path** | `src/genesis/scope.ts` `distillCachePath()` returns `<projectCacheDir>/distill-cache.json` |
| **Pricing cache path** | `src/pricing/index.ts` `cachePath()` returns `~/.aether/cache/pricing.json` |
| **Exclude file path** | `src/genesis/exclude.ts` `excludeFilePath()` returns `.aether/settings/exclude.json` |
| **Clean code ignore path** | `src/genesis/cleancode.ts` `cleanCodeIgnorePath()` returns `.aether/cleancode-ignore.json` |
| **Clean code paradigm path** | `src/genesis/cleancode.ts` `cleanCodeParadigmPath()` returns `.aether/cleancode-paradigm.json` |
| **Clean code report path** | `src/genesis/cleancode.ts` `cleanCodeReportPath()` returns `.aether/cleancode-report.md` |
| **Snapshot path** | `src/genesis/sync.ts` `snapshotPath()` returns `.aether/settings/context.json` |
| **Legacy snapshot path** | `src/genesis/sync.ts` `resolveSnapshotPath()` checks `.aether/context.json` |
| **Project readme scaffold** | `src/config/scaffold.ts` `ensureProjectReadme()` writes `.aether/README.md` |
| **Global readme content** | `src/config/readme.ts` `AETHER_README` constant |
| **Command registry** | `src/commands/registry.ts` `CommandRegistry` with `register`, `get`, `getAll`, `execute` |
| **Command registration functions** | Each `src/commands/*.ts` exports `registerXCommand()` calling `registry.register()` |
| **CLI entry registers all commands** | `src/cli/index.ts` calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, `registerCleanCommand()`, `registerCleanCodeCommand()`, `registerExcludeCommand()`, `registerPromptCommand()` |
| **Startup animation** | `src/cli/index.ts` calls `playStartupAnimation()` if TTY and not `--no-animation` |
| **Banner fallback** | `src/cli/index.ts` calls `printBanner()` if not interactive or `--no-animation` |
| **Chat REPL** | `src/cli/index.ts` calls `startChat()` from `src/ui/prompt.ts` |
| **Version flag** | `src/cli/index.ts` checks `--version`, `-v`, `-version` and prints `__AETHER_VERSION__` or `0.0.0-dev` |
| **Top-level error handling** | `src/cli/index.ts` `main().catch(err => { stderr.write(err + '\n'); process.exit(1); })` |
| **ESM import assertions for JSON** | `scripts/build-sea.mjs` uses `assert { type: 'json' }` for `sea-config.json` and `package.json` |
| **SEA build with esbuild + postject** | `scripts/build-sea.mjs` bundles with esbuild, injects blob with postject |
| **No test framework detected** | Not in `package.json` devDependencies |
| **No lint/formatter config detected** | Not in provided files |
| **Node engine >=20** | `package.json` `"engines": { "node": ">=20.0.0" }` |
| **Runtime deps**: `@clack/core`, `chalk` | `package.json` dependencies |
| **Dev deps**: `@types/node`, `esbuild`, `postject`, `tsx`, `typescript` | `package.json` devDependencies |

## 4. File Organization

 
src/
├── cli/           # Entry point only (index.ts)
├── commands/      # One file per command + registry
├── config/        # Config types, loading, scaffolding, readme
├── genesis/       # Core analysis: context, digest, distill, scope, sync, fingerprint, estimate, exclude, cleancode
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
- New domains get their own directory (`pricing/`, `ui/cancel.ts`, `ui/confirm.ts`, `ui/cost.ts`, `providers/anthropic.ts`, `providers/openrouter.ts`, `providers/metered.ts`, `util/tokens.ts`, `genesis/exclude.ts`, `genesis/cleancode-heuristics.ts`, `genesis/cleancode.ts`, `prompts/pipeline/cleancode.ts`, `prompts/pipeline/optimize.ts`, `commands/cleancode.ts`, `commands/prompt.ts`).
- Pipeline prompts organized in `src/prompts/pipeline/` (planner, sync, cleancode, optimize).
- Document prompts organized in `src/prompts/docs/` (13 files).
- Clean code heuristics in `src/genesis/cleancode-heuristics.ts`.
- Clean code hybrid scan in `src/genesis/cleancode.ts`.
- Clean code command in `src/commands/cleancode.ts`.
- Prompt command in `src/commands/prompt.ts`.
- Builtin commands registered in `src/commands/builtins.ts`.

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
| **Clean code imports** | `import { scanCleanCodeHeuristics, flaggedFiles } from '../genesis/cleancode-heuristics.js'` in `src/commands/cleancode.ts` |
| **Clean code hybrid imports** | `import { scanCleanCodeHybrid, buildCleanCodeReport, buildCleanCodeMarkdown, writeCleanCodeMarkdown, cleanCodeMarkdownRelPath } from '../genesis/cleancode.js'` in `src/commands/cleancode.ts` |
| **Clean code ignore/paradigm imports** | `import { loadCleanCodeIgnore, addCleanCodeIgnorePattern, loadCleanCodeParadigm, setCleanCodeParadigm } from '../genesis/cleancode.js'` in `src/commands/cleancode.ts` |
| **Estimate imports** | `import { estimateCleanCode } from '../genesis/estimate.js'` in `src/commands/cleancode.ts` |
| **Pricing imports** | `import { getModelPricing } from '../pricing/index.js'` in `src/commands/cleancode.ts` |
| **Config imports** | `import { loadConfig, saveConfig, getGlobalDir, getGlobalConfigPath } from '../config/index.js'` in `src/commands/clean.ts` and `src/commands/cleancode.ts` |
| **UI theme imports** | `import { ACCENT, DIM, SUCCESS, WARN } from '../ui/theme.js'` in `src/commands/clean.ts` and `src/commands/cleancode.ts` |
| **Retry imports** | `import { chatWithRetry, formatRetryLine } from '../providers/retry.js'` in `src/commands/cleancode.ts` |
| **Provider imports** | `import { createProvider, PingResult } from '../providers/index.js'` in `src/commands/cleancode.ts` |
| **Context imports** | `import { scanContext } from '../genesis/context.js'` in `src/commands/cleancode.ts` |
| **Filter imports** | `import { filterIgnored } from '../genesis/exclude.js'` in `src/commands/cleancode.ts` |
| **Prompt pipeline imports** | `import { buildCleanCodeScanPrompt, listParadigms, paradigmLabel, paradigmFocus, DEFAULT_PARADIGM } from '../prompts/pipeline/cleancode.js'` in `src/commands/cleancode.ts` |
| **Prompt base imports** | `import { BASE_PROMPT, PROMPT_SUFFIX } from '../prompts/base.js'` in `src/genesis/planner.ts` and `src/genesis/sync.ts` |
| **Prompt docs imports** | `import { GETTING_STARTED_PROMPT, ONBOARDING_PROMPT, ... } from '../prompts/docs/*.js'` in `src/prompts/index.ts` |
| **Prompt pipeline imports** | `import { PLANNER_PROMPT } from '../prompts/pipeline/planner.js'` in `src/genesis/planner.ts` |
| **Sync prompt imports** | `import { SYNC_PLANNER_PROMPT, DOC_UPDATE_INSTRUCTIONS, SECTION_PATCH_INSTRUCTIONS } from '../prompts/pipeline/sync.js'` in `src/genesis/sync.ts` |
| **Optimize prompt imports** | `import { OPTIMIZE_PROMPT, buildOptimizePrompt } from '../prompts/pipeline/optimize.js'` in `src/commands/prompt.ts` |
| **Clean code prompt imports** | `import { buildCleanCodeScanPrompt } from '../prompts/pipeline/cleancode.js'` in `src/genesis/cleancode.ts` |

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
| **Cost estimation confirmation** | `src/commands/cleancode.ts` calls `estimateCleanCode()` and prompts for confirmation before AI review |
| **Error formatting for CLI output** | `formatError()` in `src/commands/cleancode.ts` truncates error message to 120 chars |
| **Ping error formatting** | `formatPingError()` in `src/commands/cleancode.ts` formats provider connection errors |
| **Graceful cache write failures** | `saveDistillCache()`, `saveCleanCodeIgnore()`, `saveCleanCodeParadigm()` all use best-effort writes |
| **AbortSignal propagation in clean code** | `scanCleanCodeHybrid` accepts `signal` and passes to `chatWithRetry` |
| **AbortSignal in distill** | `distillFilesIncremental` accepts `signal` and passes to provider calls |
| **AbortSignal in sync** | `refreshDoc` and `fullUpdate` accept `signal` and pass to `chatWithRetry` |

## 7. Type Patterns

| Pattern | Example |
|---------|---------|
| **Interface for config/contracts** | `AetherConfig`, `LLMProvider`, `ChatRequest`, `ChatResponse`, `PingResult`, `ModelPricing`, `OpenRouterModel`, `UsageTotals`, `CleanCodeIssue`, `CleanCodeReport`, `CleanCodeIgnoreList`, `CleanCodeParadigm`, `ParadigmSpec` |
| **Type alias for data shapes** | `FileContent`, `ProjectContext`, `FileFingerprint`, `DistillCache`, `CostEstimate`, `DistillPlan`, `DistillJob`, `CustomDocSpec`, `DocIndexEntry`, `DocMeta`, `FileDiff`, `SyncPlan`, `SectionPatch`, `AssembleHooks`, `DistillHooks`, `ParsedPlan`, `RawSection` |
| **Union of string literals for enums** | `type DocSection = "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific"`, `type CleanCodeParadigm = "clean-code" | "solid" | "functional" | "google-style"` |
| **Generic async generators** | `chatStream(request): AsyncGenerator<StreamChunk>` in `LLMProvider` |
| **Optional properties with `?`** | `apiKey?: string`, `timeout?: number` in `AetherConfig`; `reason?: "timeout" | "network" | "http"` in `PingResult` |
| **`Pick` / `Record` utility types** | `DocIndexEntry = Pick<DocDefinition, ...>`, `Record<string, FileFingerprint>` |
| **No `type` exports for classes** | Classes exported as values (`export class StepRunner`) |
| **No `namespace` or `declare module`** | Not observed |
| **Re-export types from domain index** | `src/providers/index.ts` re-exports `LLMProvider`, `ChatMessage`, etc. from `./types.js` |
| **Provider-specific types** | `OpenRouterModel` in `src/pricing/index.ts` with `id`, `pricing.prompt`, `pricing.completion` |
| **Clean code types** | `CleanCodeIssue`, `CleanCodeReport`, `CleanCodeIgnoreList`, `CleanCodeParadigm`, `ParadigmSpec` in `src/genesis/types.ts` |
| **Prompt pipeline types** | `ParsedPlan` in `src/genesis/planner.ts` with `catalogIds` and `customDocs` |
| **Sync types** | `RawSection`, `SectionPatch` in `src/genesis/sync.ts` |
| **Estimate types** | `CostEstimate`, `DistillPlan`, `DistillJob` in `src/genesis/estimate.ts` |
| **Pricing types** | `ModelPricing`, `OpenRouterModel` in `src/pricing/index.ts` |

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
- **Estimate costs before expensive operations** (e.g., `estimateGenesis`, `estimateSync`, `estimateCleanCode`).
- **Handle cancellation signals** via `AbortSignal` in async operations.
- **Prompt for confirmation** before destructive operations.
- **Format costs and tokens** for human-readable CLI output.
- **Approximate token counts** with utility functions when exact counts unavailable.
- **Use regex constants** with `_RE` suffix for pattern matching.
- **Extract JSON from LLM output** with `extractJsonArray` handling markdown fences.
- **Use incremental distillation** with concurrency control for large contexts.
- **Fingerprint files with SHA-256** for change detection.
- **Track git commit/branch/dirty state** for snapshots.
- **Mask API keys** in CLI output (first 4 + `••••` + last 4).
- **Validate config** before saving (provider, model, baseUrl, apiKey).
- **Detect provider from baseUrl** for auto-configuration.
- **Use project ID from path hash** for cache isolation.
- **Scaffold project readme** on first run.
- **Register all commands at CLI startup** in defined order.
- **Show startup animation** in interactive TTY mode.
- **Fall back to static banner** when not interactive.
- **Run chat REPL** after startup.
- **Handle version flag** before command processing.
- **Build SEA binary** with esbuild + postject for distribution.
- **Use import assertions** for JSON imports in build scripts.
| **Heuristic + hybrid clean code review** | `scanCleanCodeHeuristics` (regex) + `scanCleanCodeHybrid` (AI) in `src/genesis/cleancode.ts` |
| **Clean code paradigms** | `PARADIGMS` in `src/prompts/pipeline/cleancode.ts` defines 4 paradigms with categories |
| **Ignore patterns for clean code** | `loadCleanCodeIgnore`/`addCleanCodeIgnorePattern` with glob patterns in `src/genesis/cleancode.ts` |
| **Distill cache invalidation on model change** | `DistillCache` includes `model` field in `src/genesis/scope.ts` |
| **Concurrent distill with chunking** | `distillFilesIncremental` processes chunks with configurable concurrency |
| **Pricing catalog with live + static fallback** | `loadCatalog` fetches OpenRouter, falls back to `STATIC_PER_MTOK` |
| **Provider factory with inheritance** | `createProvider` switches on provider; `OpenRouterProvider` extends base |
| **Metered provider wrapper** | `MeteredProvider` tracks usage across any `LLMProvider` |
| **Retry with rate-limit upgrade** | `chatWithRetry` detects 429 and switches to `RATE_LIMIT_OPTIONS` |
| **Error sanitization** | `formatRetryLine` truncates to 80 chars for logging |
| **Config precedence** | `loadConfig`: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **API key masking** | `maskKey` shows first 4 + `••••` + last 4 |
| **Project ID from path hash** | `projectId()` uses `basename + '-' + sha1(abs).slice(0,12)` |
| **Global config dir** | `getGlobalDir()` returns `~/.aether` |
| **Project cache dir** | `getProjectCacheDir()` returns `~/.aether/cache/<projectId>/` |
| **Distill cache path** | `distillCachePath()` returns `<projectCacheDir>/distill-cache.json` |
| **Pricing cache path** | `cachePath()` returns `~/.aether/cache/pricing.json` |
| **Exclude file path** | `excludeFilePath()` returns `.aether/settings/exclude.json` |
| **Clean code ignore path** | `cleanCodeIgnorePath()` returns `.aether/cleancode-ignore.json` |
| **Clean code paradigm path** | `cleanCodeParadigmPath()` returns `.aether/cleancode-paradigm.json` |
| **Clean code report path** | `cleanCodeReportPath()` returns `.aether/cleancode-report.md` |
| **Snapshot path** | `snapshotPath()` returns `.aether/settings/context.json` |
| **Legacy snapshot path** | `resolveSnapshotPath()` checks `.aether/context.json` |
| **Project readme scaffold** | `ensureProjectReadme()` writes `.aether/README.md` |
| **Global readme content** | `AETHER_README` constant in `src/config/readme.ts` |
| **Command registry** | `CommandRegistry` with `register`, `get`, `getAll`, `execute` |
| **Command registration functions** | Each `src/commands/*.ts` exports `registerXCommand()` calling `registry.register()` |
| **CLI entry registers all commands** | `src/cli/index.ts` calls all `registerXCommand()` functions |
| **Startup animation** | `playStartupAnimation()` if TTY and not `--no-animation` |
| **Banner fallback** | `printBanner()` if not interactive or `--no-animation` |
| **Chat REPL** | `startChat()` from `src/ui/prompt.ts` |
| **Version flag** | Checks `--version`, `-v`, `-version` prints `__AETHER_VERSION__` or `0.0.0-dev` |
| **Top-level error handling** | `main().catch(err => { stderr.write(err + '\n'); process.exit(1); })` |
| **ESM import assertions for JSON** | `scripts/build-sea.mjs` uses `assert { type: 'json' }` |
| **SEA build with esbuild + postject** | `scripts/build-sea.mjs` bundles and injects blob |
| **No test framework detected** | Not in `package.json` devDependencies |
| **No lint/formatter config detected** | Not in provided files |
| **Node engine >=20** | `package.json` `"engines": { "node": ">=20.0.0" }` |
| **Runtime deps**: `@clack/core`, `chalk` | `package.json` dependencies |
| **Dev deps**: `@types/node`, `esbuild`, `postject`, `tsx`, `typescript` | `package.json` devDependencies |

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
- **Don't use leading underscore for private members** — not observed in codebase.
- **Don't use `any` type** — strict mode prevents it.
- **Don't use default exports** — not observed in any file.
- **Don't omit `.js` extension** on relative imports.
- **Don't use `require` or `module.exports`** — ESM only.
- **Don't hardcode provider URLs** — use `DEFAULT_CONFIGS` and `detectProviderFromBaseUrl`.
- **Don't skip git error handling** — `getGitInfo`/`getGitLog` return `null` on failure.
- **Don't write cache files without error handling** — all cache writes are best-effort.
- **Don't run AI review without cost confirmation** — `estimateCleanCode` + `confirm()` in `src/commands/cleancode.ts` |
| **Don't skip heuristic scan** | `scanCleanCodeHeuristics` runs first, then `scanCleanCodeHybrid` for flagged files |
| **Don't ignore clean code paradigms** | `PARADIGMS` defines categories per paradigm; `buildCleanCodeScanPrompt` uses them |
| **Don't hardcode clean code categories** | Categories come from `PARADIGMS[paradigm].categories` |
| **Don't forget distill cache model key** | `DistillCache` includes `model`; cache invalidated on model change |
| **Don't estimate clean code cost without pricing** | `estimateCleanCode` uses `getModelPricing` with live/static fallback |
| **Don't run clean code review without provider** | `runReview` checks `config` and `ping` before AI phase |
| **Don't write clean code report without issues** | `writeCleanCodeMarkdown` only writes if issues exist |
| **Don't ignore exclude patterns in clean code** | `filterIgnored` removes excluded files before scanning |
| **Don't forget to load paradigm preference** | `loadCleanCodeParadigm` reads `.aether/cleancode-paradigm.json` |
| **Don't forget to save paradigm preference** | `setCleanCodeParadigm` writes `.aether/cleancode-paradigm.json` |

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
| **Clean code ignore file** | `.aether/cleancode-ignore.json` via `cleanCodeIgnorePath()` in `src/genesis/cleancode.ts` |
| **Clean code paradigm file** | `.aether/cleancode-paradigm.json` via `cleanCodeParadigmPath()` in `src/genesis/cleancode.ts` |
| **Clean code report file** | `.aether/cleancode-report.md` via `cleanCodeReportPath()` in `src/genesis/cleancode.ts` |
| **Exclude settings file** | `.aether/settings/exclude.json` via `excludeFilePath()` in `src/genesis/exclude.ts` |
| **Snapshot file** | `.aether/settings/context.json` via `snapshotPath()` in `src/genesis/sync.ts` |
| **Legacy snapshot file** | `.aether/context.json` checked by `resolveSnapshotPath()` |
| **Project readme file** | `.aether/README.md` via `ensureProjectReadme()` in `src/config/scaffold.ts` |
| **Global readme content** | `AETHER_README` constant in `src/config/readme.ts` |
| **Pricing static fallback** | `STATIC_PER_MTOK` in `src/pricing/index.ts` for 10 models |
| **Pricing catalog TTL** | `CACHE_TTL_MS = 24 * 60 * 60 * 1000` in `src/pricing/index.ts` |
| **Max file size for scan** | `MAX_FILE_SIZE = envInt("AETHER_MAX_FILE_SIZE", 128_000)` in `src/genesis/constants.ts` |
| **Max total chars for scan** | `MAX_TOTAL_CHARS = envInt("AETHER_MAX_TOTAL_CHARS", 2_000_000)` in `src/genesis/constants.ts` |
| **Max files walked** | `MAX_FILES_WALKED = envInt("AETHER_MAX_FILES_WALKED", 10_000)` in `src/genesis/constants.ts` |
| **Max walk depth** | `MAX_WALK_DEPTH = envInt("AETHER_MAX_WALK_DEPTH", 12)` in `src/genesis/constants.ts` |
| **Doc context budget** | `DOC_CONTEXT_BUDGET = envInt("AETHER_DOC_CONTEXT_CHARS", 48_000)` in `src/genesis/constants.ts` |
| **Genesis concurrency** | `GEN_CONCURRENCY = envInt("AETHER_GEN_CONCURRENCY", 4)` in `src/genesis/constants.ts` |
| **Distill concurrency** | `DISTILL_CONCURRENCY = envInt("AETHER_DISTILL_CONCURRENCY", 4)` in `src/genesis/constants.ts` |
| **Clean code context budget** | `CLEANCODE_CONTEXT_BUDGET = envInt("AETHER_CLEANCODE_CONTEXT_CHARS", 48_000)` in `src/genesis/constants.ts` |
| **Clean code heuristic thresholds** | `LONG_FUNCTION_THRESHOLD = 50`, `DEEP_NESTING_THRESHOLD = 4` in `src/genesis/cleancode-heuristics.ts` |
| **Clean code regex patterns** | `LONG_FUNCTION_RE`, `DEEP_NESTING_RE`, `MAGIC_NUMBER_RE`, `NAMING_RE`, `DUPLICATION_RE`, `DEAD_CODE_RE`, `ERROR_HANDLING_RE`, `COMPLEXITY_RE` in `src/genesis/cleancode-heuristics.ts` |
| **Clean code paradigms** | `PARADIGMS` in `src/prompts/pipeline/cleancode.ts` with 4 paradigms and categories |
| **Default clean code paradigm** | `DEFAULT_PARADIGM = "clean-code"` in `src/prompts/pipeline/cleancode.ts` |
| **Max plan attempts** | `MAX_PLAN_ATTEMPTS = 3` in `src/genesis/planner.ts` and `src/genesis/sync.ts` |
| **Max custom docs** | `MAX_CUSTOM_DOCS = 5` in `src/genesis/planner.ts` |
| **Core doc IDs** | `CORE_IDS` in `src/genesis/planner.ts` (6 always-generated docs) |
| **Anchor doc IDs** | `ANCHOR_IDS` in `src/genesis/sync.ts` (4 docs regenerated on structural changes) |
| **Max listed files in sync** | `MAX_LISTED_FILES = 60` in `src/genesis/sync.ts` |
| **Section order for docs** | `SECTION_ORDER` in `src/genesis/sync.ts` defines section precedence |
| **Doc definitions catalog** | `DOC_DEFINITIONS` in `src/genesis/sync.ts` maps IDs to `DocDefinition` |
| **Refresh output multipliers** | `REFRESH_OUT_LOW = 0.15`, `REFRESH_OUT_HIGH = 0.35` in `src/genesis/estimate.ts` |
| **New doc output multipliers** | `NEW_DOC_OUT_LOW = 0.18`, `NEW_DOC_OUT_HIGH = 0.38` in `src/genesis/estimate.ts` |
| **Genesis output multipliers** | `GENESIS_OUT_LOW = 0.18`, `GENESIS_OUT_HIGH = 0.38` in `src/genesis/estimate.ts` |
| **Distill output per chunk** | `DISTILL_OUTPUT_PER_CHUNK = 800` in `src/genesis/estimate.ts` |
| **Prompt overhead chars** | `PROMPT_OVERHEAD_CHARS = 2000` in `src/genesis/estimate.ts` |
| **Genesis doc context ratio** | `GENESIS_DOC_CONTEXT_RATIO = 0.18` in `src/genesis/estimate.ts` |
| **Genesis doc chars min/max** | `GENESIS_DOC_CHARS_MIN = 10000`, `GENESIS_DOC_CHARS_MAX = 30000` in `src/genesis/estimate.ts` |
| **Default doc chars** | `DEFAULT_DOC_CHARS = 15000` in `src/genesis/estimate.ts` |
| **Retry default options** | `DEFAULT_OPTIONS = { maxRetries: 3, baseDelay: 2000 }` in `src/providers/retry.ts` |
| **Retry rate limit options** | `RATE_LIMIT_OPTIONS = { maxRetries: 6, baseDelay: 15000 }` in `src/providers/retry.ts` |
| **Provider hosts for detection** | `PROVIDER_HOSTS` in `src/config/index.ts` (4 hosts) |
| **Default provider configs** | `DEFAULT_CONFIGS` in `src/config/index.ts` (4 providers) |
| **OpenRouter models URL** | `OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"` in `src/pricing/index.ts` |
| **Static pricing per 1M tokens** | `STATIC_PER_MTOK` in `src/pricing/index.ts` (10 models) |
| **Idle timeout default** | `120_000` ms in `OpenAICompatibleProvider` and `AnthropicProvider` constructors |
| **Ping timeout** | `10_000` ms in `OpenAICompatibleProvider.ping()` and `AnthropicProvider.ping()` |
| **Max tokens default** | `8192` in `AnthropicProvider.chat()` |
| **Temperature default** | `0.7` in `OpenAICompatibleProvider.streamRaw()` |
| **Spinner interval** | `80` ms in `src/ui/steps.ts` |
| **Spinner frames** | `SPINNER_FRAMES` array (10 frames) in `src/ui/steps.ts` |
| **Max dropdown items** | `MAX_DROPDOWN = 6` in `src/ui/prompt.ts` |
| **Max path dropdown items** | `MAX_PATH_DROPDOWN = 10` in `src/ui/prompt.ts` |
| **Tips rotation interval** | Every 4 messages in `src/ui/prompt.ts` |
| **Clean code report relative path** | `cleanCodeMarkdownRelPath()` returns `.aether/cleancode-report.md` |
| **Clean code ignore patterns** | Stored as array of glob strings in `.aether/cleancode-ignore.json` |
| **Clean code paradigm storage** | Stored as string in `.aether/cleancode-paradigm.json` |
| **Exclude patterns storage** | Stored as deduplicated normalized array in `.aether/settings/exclude.json` |
| **Config file paths** | `.aether/config.json` and `.aether/settings/config.json` checked by `projectConfigPaths()` |
| **Global config file** | `~/.aether/config.json` via `getGlobalConfigPath()` |
| **Global config structure** | `GlobalConfigFile` with `default` and `projects` record in `src/config/index.ts` |
| **Legacy global config migration** | `readGlobalFile()` handles flat config format |
| **Config save strategy** | First config becomes `default`; later per-project saves update only their entry |
| **Env var for API key** | `AETHER_API_KEY` checked in `loadConfig()` |
| **Node version requirement** | `>=20.0.0` in `package.json` engines |

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
- `src/prompts/pipeline/*.ts` → planner/sync/cleancode/optimize prompt constants
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
- `src/commands/cleancode.ts` → `registerCleanCodeCommand`
- `src/commands/prompt.ts` → `registerPromptCommand`
- `src/genesis/cleancode-heuristics.ts` → `scanCleanCodeHeuristics`, `flaggedFiles`, regex patterns
- `src/genesis/cleancode.ts` → `scanCleanCodeHybrid`, `buildCleanCodeReport`, `buildCleanCodeMarkdown`, `writeCleanCodeMarkdown`, `cleanCodeMarkdownRelPath`, `loadCleanCodeIgnore`, `addCleanCodeIgnorePattern`, `loadCleanCodeParadigm`, `setCleanCodeParadigm`, `cleanCodeIgnorePath`, `cleanCodeParadigmPath`, `cleanCodeReportPath`
- `src/prompts/pipeline/cleancode.ts` → `PARADIGMS`, `DEFAULT_PARADIGM`, `paradigmLabel`, `listParadigms`, `paradigmFocus`, `buildCleanCodeScanPrompt`
- `src/prompts/pipeline/optimize.ts` → `OPTIMIZE_PROMPT`, `buildOptimizePrompt`
- `src/genesis/estimate.ts` → `estimateCleanCode`
