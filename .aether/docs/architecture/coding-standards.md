# Coding Standards

Based on the provided codebase, here are the observed coding standards and patterns.

---

## 1. Code Style

**Formatting**
- **Indentation**: 2 spaces (observed in all `.ts` files)
- **Quotes**: Single quotes for strings (observed in all `.ts` files)
- **Semicolons**: Always used (observed in all `.ts` files)
- **Trailing commas**: Used in multi-line objects/arrays (observed in `tsconfig.json`, `package.json`, and source files)
- **Line endings**: LF (inferred from file content)

**TypeScript Configuration** (from `tsconfig.json`)
- `target`: ES2022
- `module`: NodeNext
- `moduleResolution`: NodeNext
- `strict`: true
- `esModuleInterop`: true
- `skipLibCheck`: true
- `forceConsistentCasingInFileNames`: true
- `resolveJsonModule`: true
- `declaration`: true
- `declarationMap`: true
- `sourceMap`: true

**File Encoding**: UTF-8 (observed in `writeFile` calls with `"utf-8"` encoding)

---

## 2. Naming Conventions

| Element | Convention | Examples |
|---------|------------|----------|
| **Files** | kebab-case | `build-sea.mjs`, `openai-compatible.ts`, `build-sea.mjs` |
| **Directories** | kebab-case | `cli/`, `commands/`, `genesis/`, `providers/` |
| **Classes** | PascalCase | `CommandRegistry`, `OpenAICompatibleProvider`, `StepRunner`, `LineSpinner` |
| **Interfaces** | PascalCase | `Command`, `AetherConfig`, `LLMProvider`, `ChatRequest`, `Step` |
| **Types** | PascalCase | `DocSection`, `FileContent`, `ProjectContext`, `RetryOptions` |
| **Functions** | camelCase | `registerConfigCommand`, `createProvider`, `buildFingerprint`, `chatWithRetry` |
| **Variables** | camelCase | `baseUrl`, `apiKey`, `idleTimeout`, `maxRetries` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_OPTIONS`, `ACCENT_HEX`, `SPINNER_FRAMES` |
| **Enums/Const Objects** | PascalCase or UPPER_SNAKE_CASE | `DEFAULT_CONFIGS`, `PROVIDER_HOSTS`, `SECTION_ORDER` |
| **Private Methods** | camelCase with leading underscore | `_render()`, `_startSpinner()`, `_stopSpinner()` |
| **Type Parameters** | Single uppercase letter | `<T, R>` in `mapPool<T, R>` |

---

## 3. Architecture Patterns

**Command Pattern**
- `CommandRegistry` class manages registered commands (`src/commands/registry.ts`)
- Each command implements `Command` interface: `{ name, description, usage?, handler }`
- Commands registered via `registry.register()` in individual command files
- CLI entry point (`src/cli/index.ts`) registers commands in order: help, builtins, config, clean

**Provider Pattern (Strategy)**
- `LLMProvider` interface defines contract: `chat()`, `chatStream()`, `ping()`
- `OpenAICompatibleProvider` implements `LLMProvider` for OpenAI-compatible APIs
- `createProvider(config)` factory function returns provider instance based on `config.provider`

**Pipeline/Stage Pattern (Genesis)**
- Distinct phases: `scan` → `digest` → `distill` → `plan` → `generate` → `sync`
- Each phase in separate module: `context.ts`, `digest.ts`, `distill.ts`, `planner.ts`, `docs.ts`, `sync.ts`
- Shared context passed through pipeline: `ProjectContext`, `DistillCache`, `Snapshot`

**Concurrency Control**
- `mapPool(items, limit, fn)` utility for bounded concurrency (used in `distill.ts`, `steps.ts`)
- `StepRunner.runPooled(limit, fn)` for parallel step execution with concurrency limit

**Retry with Exponential Backoff**
- `chatWithRetry()` wraps provider calls with configurable retries
- Rate-limit detection (429 / "rate limit") triggers extended retry policy
- `onRetry` callback for progress reporting

**REPL/Interactive CLI**
- `readline` with custom completer for `/` command autocomplete
- Real-time dropdown rendering via ANSI escape codes
- Command delegation to `CommandRegistry.execute()`

---

## 4. File Organization

**Module Structure**
```
src/
├── cli/           # Entry point only (index.ts)
├── commands/      # One file per command + registry
├── config/        # Config types, loading, saving, scaffolding
├── genesis/       # Core pipeline: context, digest, distill, planner, docs, sync, fingerprint, scope
├── prompts/       # Prompt templates organized by domain (docs/, pipeline/, base.ts)
├── providers/     # LLM provider abstraction + implementations
├── ui/            # CLI UI: animation, prompt, steps, theme
└── util/          # Utilities (env.ts)
```

**Per-File Organization**
- Imports first (external, then internal with `.js` extension)
- Type/interface definitions
- Constants
- Internal helper functions (prefixed with `_` or not exported)
- Exported functions/classes last
- Re-exports at top of index files (e.g., `src/prompts/index.ts`, `src/providers/index.ts`)

**Index Files as Public API**
- `src/commands/registry.ts` exports `Command`, `CommandRegistry`, `registry`
- `src/providers/index.ts` re-exports types, `OpenAICompatibleProvider`, `createProvider`
- `src/prompts/index.ts` re-exports all prompt constants/functions
- `src/config/index.ts` re-exports `AetherConfig` and config functions
- `src/genesis/types.ts` exports all genesis-related types

---

## 5. Import Conventions

**ESM Imports Only** (package.json: `"type": "module"`)
- All imports use `.js` extension for internal modules: `from "../commands/help.js"`
- External packages: bare specifiers (`chalk`, `node:fs/promises`)
- Node built-ins: `node:` prefix (`node:fs`, `node:path`, `node:crypto`, `node:os`, `node:child_process`)

**Import Patterns**
```typescript
// External
import chalk from "chalk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Internal (always .js extension)
import { registry } from "./registry.js";
import { loadConfig, saveConfig, AetherConfig } from "../config/index.js";
import { LLMProvider, ChatRequest } from "../providers/types.js";
```

**Re-export Pattern** (index files)
```typescript
export { LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk } from "./types.js";
export { OpenAICompatibleProvider } from "./openai-compatible.js";
export { createProvider } from "./factory.js";
```

---

## 6. Error Handling

**Top-Level CLI Error Handling** (`src/cli/index.ts`)
```typescript
main().catch((err) => {
  process.stderr.write(`\n${err?.message ?? err}\n`);
  process.exit(1);
});
```

**Async Function Error Handling**
- `try/catch` with early return on error (e.g., `ensureProjectReadme`, `loadDistillCache`)
- Errors caught and swallowed for best-effort operations (cache writes, README creation)
- `chatWithRetry` throws after exhausting retries; caller handles or propagates

**Validation Errors**
- `validateConfig(config)` returns `string[]` of errors (empty = valid)
- Caller checks array length and displays warnings/errors

**Provider Errors**
- `OpenAICompatibleProvider` throws `Error` on non-OK HTTP response with status + body
- Malformed SSE chunks silently skipped

**Git Operations**
- `getGitInfo()` returns `null` on any error (not a repo, git unavailable)
- `getGitLog()` returns `null` on error/empty output

---

## 7. Type Patterns

**Strict TypeScript** (`strict: true` in tsconfig)
- No `any` observed in provided code
- Explicit return types on exported functions
- Interfaces for object shapes, type aliases for unions/primitives

**Interface vs Type**
- `interface` for object contracts intended to be implemented/extended: `LLMProvider`, `Command`, `AetherConfig`
- `type` for unions, mapped types, utility types: `DocSection`, `DocIndexEntry`, `PlanSyncOptions`

**Generic Utilities**
- `mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]>`
- `Pick<DocDefinition, "outputPath" | "title" | "section" | "summary">` for `DocIndexEntry`

**Discriminated Unions** (not observed — enums not used; string literal unions used instead)
```typescript
type DocSection = "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific";
type StepStatus = "pending" | "running" | "writing" | "done" | "error";
```

**Nullable Returns**
- Functions returning `T | null` for "not found" cases: `loadConfig()`, `getGitInfo()`, `loadSnapshot()`, `detectProviderFromBaseUrl()`

**Configuration as Data**
- `DEFAULT_CONFIGS: Record<string, Partial<AetherConfig>>` — provider defaults as data
- `PROVIDER_HOSTS: Array<{ host: string; provider: AetherConfig["provider"] }>` — host-to-provider mapping as data

---

## 8. Do / Don't

### Do

| Rule | Evidence |
|------|----------|
| Use ESM imports with `.js` extension for internal modules | All internal imports in source files |
| Use `node:` prefix for Node built-ins | `node:fs/promises`, `node:path`, `node:crypto`, etc. |
| Export types and functions from index files as public API | `src/providers/index.ts`, `src/prompts/index.ts`, `src/config/index.ts` |
| Use `strict: true` TypeScript with explicit types | `tsconfig.json`, all exported functions have return types |
| Use single quotes for strings | All source files |
| Use 2-space indentation | All source files |
| Use camelCase for functions/variables, PascalCase for types/classes | Consistent across codebase |
| Use UPPER_SNAKE_CASE for module-level constants | `MAX_FILE_SIZE`, `DEFAULT_OPTIONS`, `SPINNER_FRAMES` |
| Handle errors at top level in CLI entry point | `main().catch()` in `src/cli/index.ts` |
| Return `null` for "not found" instead of throwing | `loadConfig()`, `getGitInfo()`, `detectProviderFromBaseUrl()` |
| Use bounded concurrency for parallel async work | `mapPool()` in `distill.ts`, `runPooled()` in `steps.ts` |
| Implement retry with exponential backoff for external APIs | `chatWithRetry()` in `retry.ts` |
| Use ANSI escape codes for terminal UI (spinners, dropdowns) | `animation.ts`, `prompt.ts`, `steps.ts` |
| Separate prompt templates into domain-specific files | `src/prompts/docs/*.ts`, `src/prompts/pipeline/*.ts` |
| Use sandwich prompt technique (rules at start and end) | `BASE_PROMPT` + `PROMPT_SUFFIX` in `base.ts` |
| Validate config and return errors array | `validateConfig()` in `config/index.ts` |
| Store secrets only in global config or env, never in repo | `config/index.ts` comments, `config.ts` command |
| Use `existsSync` before writing to avoid overwriting | `ensureProjectReadme()` in `scaffold.ts` |
| Sanitize user input for file paths | `buildCustomDocDefinition()` sanitizes `spec.path` |

### Don't

| Rule | Evidence |
|------|----------|
| Don't use `require()` or CommonJS syntax | Package.json: `"type": "module"`, all imports are `import` |
| Don't omit `.js` extension on internal imports | All internal imports include `.js` |
| Don't use `any` type | No `any` observed in provided code |
| Don't throw for expected "not found" cases | `loadConfig()`, `getGitInfo()` return `null` |
| Don't write secrets to project directory | Config saved to `~/.aether/config.json`, not `.aether/` |
| Don't mutate shared state without synchronization | `mapPool` preserves order, `StepRunner` uses internal state |
| Don't hardcode magic numbers | Constants in `constants.ts` with `envInt` overrides |
| Don't skip error handling on external calls | `chatWithRetry` wraps all provider calls |
| Don't use `console.log` for UI output | Uses `process.stdout.write` with theme constants |
| Don't invent technologies not in package.json | Only `chalk` as runtime dependency |
| Don't use enums | String literal unions used instead (`DocSection`, `StepStatus`) |
| Don't export internal helpers | Private functions not exported (e.g., `detectSignals`, `extractSymbols`, `mapPool` in `distill.ts`) |
| Don't hardcode provider logic in factory | `createProvider` switches on `config.provider` string |
| Don't assume git is available | `getGitInfo()` returns `null` gracefully |

---

## 9. Observed Technologies (Only What's in Context)

**Runtime**: Node.js >= 20.0.0 (package.json engines)

**Dependencies** (package.json):
- `chalk` ^5.4.1 — terminal styling

**Dev Dependencies**:
- `@types/node` ^22.15.21
- `esbuild` ^0.28.1 — SEA build
- `postject` ^1.0.0-alpha.6 — SEA injection
- `tsx` ^4.19.4 — dev runner
- `typescript` ^5.8.3

**Node Built-ins Used**:
- `node:fs`, `node:fs/promises`
- `node:path`
- `node:os`
- `node:crypto`
- `node:child_process` (`execFileSync`)
- `node:readline`

**No other frameworks, libraries, or tools detected** (no React, Express, MongoDB, etc.)