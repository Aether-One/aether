# Coding Standards

Rules below are derived only from the files present in this project's context. Every rule cites a specific file or module that proves it.

## 1. Code Style

- **2-space indentation** is used consistently across all `.ts` files (e.g. `src/config/index.ts`, `src/commands/registry.ts`, `src/genesis/context.ts`).
- **Double quotes** are used for all string literals (e.g. `"openai"` in `src/config/index.ts`, `"\n"` in `src/ui/animation.ts`).
- **Semicolons** terminate statements (e.g. `export const VERSION = ...;` in `src/cli/index.ts`).
- **Trailing commas** appear in multi-line object/array literals (e.g. `DEFAULT_CONFIGS` in `src/config/index.ts`, `DOC_DEFINITIONS` in `src/genesis/docs.ts`).
- `package.json` sets `"type": "module"` and `tsconfig.json` uses `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`.

## 2. Naming Conventions

- **Files**: kebab-case for command/config files (`config.ts`, `registry.ts`, `builtins.ts`); camelCase for provider/types (`openai-compatible.ts`, `types.ts`); PascalCase is not used for file names.
- **Interfaces**: PascalCase, e.g. `AetherConfig` (`src/config/index.ts`), `LLMProvider`, `ChatRequest` (`src/providers/types.ts`), `Command` (`src/commands/registry.ts`), `Step` (`src/ui/steps.ts`).
- **Classes**: PascalCase, e.g. `CommandRegistry` (`src/commands/registry.ts`), `OpenAICompatibleProvider` (`src/providers/openai-compatible.ts`), `StepRunner` (`src/ui/steps.ts`).
- **Functions**: camelCase, e.g. `scanContext`, `buildPrompt` (`src/genesis/context.ts`), `planDocs` (`src/genesis/planner.ts`), `createProvider` (`src/providers/factory.ts`).
- **Constants**: UPPER_SNAKE_CASE for fixed config values, e.g. `MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `MAX_FILES_WALKED`, `MAX_WALK_DEPTH` (`src/genesis/context.ts`); `SPINNER_FRAMES` (`src/ui/steps.ts`); `DEFAULT_OPTIONS` (`src/providers/retry.ts`).
- **Enum-like string unions**: `provider` type is `"openai" | "anthropic" | "gemini" | "openrouter"` (`src/config/index.ts`).

## 3. Architecture Patterns

- **Registry pattern**: `CommandRegistry` class with `register`, `get`, `getAll`, `has`, `execute`; a single exported `registry` instance is used by `registerHelpCommand`, `registerBuiltinCommands`, `registerConfigCommand` (`src/commands/registry.ts`, `src/cli/index.ts`).
- **Provider abstraction**: `LLMProvider` interface (`chat`, `chatStream`, `ping`) in `src/providers/types.ts`; single implementation `OpenAICompatibleProvider` returned by `createProvider` factory (`src/providers/factory.ts`).
- **Prompt separation**: all LLM prompt strings live in `src/prompts/*.ts` and are re-exported from `src/prompts/index.ts`; doc generation logic imports them, does not inline them (`src/genesis/docs.ts`).
- **Modular command registration**: each command file exports a `registerXCommand()` function called from `src/cli/index.ts`.
- **Step runner UI**: `StepRunner` class manages visual step states (`pending`/`running`/`writing`/`done`/`error`) in `src/ui/steps.ts`.

## 4. File Organization

- Source is rooted at `src/` with subfolders: `cli/`, `commands/`, `config/`, `genesis/`, `prompts/`, `providers/`, `ui/` (per directory tree in context).
- Each command lives in its own file under `src/commands/` and registers itself via a `register*Command` function.
- Provider types, implementation, factory, and retry are split across `types.ts`, `openai-compatible.ts`, `factory.ts`, `retry.ts`, `index.ts` under `src/providers/`.
- Genesis logic is split into `context.ts` (scan/build), `planner.ts` (plan), `docs.ts` (definitions/index) under `src/genesis/`.
- UI concerns separated: `animation.ts`, `prompt.ts`, `steps.ts` under `src/ui/`.

## 5. Import Conventions

- ESM relative imports use explicit `.js` extension despite TS source (e.g. `import { startChat } from "../ui/prompt.js"` in `src/cli/index.ts`; `import { registry } from "./registry.js"` in `src/commands/config.ts`).
- Node built-ins imported via `node:` prefix (e.g. `import { readFile, writeFile, mkdir } from "node:fs/promises"` in `src/config/index.ts`; `import * as readline from "node:readline"` in `src/ui/prompt.ts`).
- Third-party import: `import chalk from "chalk";` (e.g. `src/commands/config.ts`, `src/ui/steps.ts`).
- Type-only imports use `import type` (e.g. `import type { AetherConfig } from "../config/index.js"` in `src/providers/factory.ts`; `import type { LLMProvider, ChatRequest, ChatResponse } from "../providers/types.js"` in `src/providers/retry.ts`).
- Barrel file `src/prompts/index.ts` re-exports all prompt constants/functions; `src/providers/index.ts` re-exports types and classes.

## 6. Error Handling

- `src/cli/index.ts` wraps `main()` in `.catch` that writes to `stderr` and `process.exit(1)`.
- `src/commands/builtins.ts` defines `formatError(err)` mapping known substrings (`429`, `401`/`403`, `abort`/`timeout`, `ECONNREFUSED`) to friendly messages; genesis handler catches and prints via `formatError`.
- `src/providers/openai-compatible.ts` uses `try/finally` to `clearTimeout` on `AbortController`; `ping()` returns `false` on catch instead of throwing.
- `src/providers/retry.ts` `chatWithRetry` loops up to `maxRetries + 1`, uses exponential backoff (`baseDelay * Math.pow(2, attempt - 1)`), and rethrows last error.
- `safeReadFile` in `src/genesis/context.ts` returns `null` on stat/read failure and pushes to `omitted` list rather than throwing.
- `src/config/index.ts` `loadConfig` returns `null` on missing file or parse error.

## 7. Type Patterns

- `tsconfig.json` has `"strict": true`; code avoids `any` except one cast in `src/commands/config.ts`: `(config as any)[configKey] = value;` with an eslint-disable comment.
- Interfaces used for data shapes: `ProjectContext`, `FileContent` (`src/genesis/context.ts`); `DocDefinition`, `CustomDocSpec`, `DocSection` (`src/genesis/docs.ts`); `RetryOptions` (`src/providers/retry.ts`).
- Exported `type` re-exports: `export type { LLMProvider, ChatMessage, ... } from "./types.js"` (`src/providers/index.ts`).
- Function return types annotated (e.g. `export async function scanContext(rootDir: string): Promise<ProjectContext>` in `src/genesis/context.ts`).
- `declare const __AETHER_VERSION__: string;` in `src/cli/index.ts` for build-injected constant.

## 8. Do / Don't

**Do**
- Use `.js` extension in relative ESM imports from `.ts` files (proven in `src/cli/index.ts`).
- Put LLM prompt text in `src/prompts/` files, not inline in logic (proven in `src/genesis/docs.ts`).
- Register commands via `registry.register({ name, description, usage?, handler })` (proven in `src/commands/help.ts`, `config.ts`, `builtins.ts`).
- Use `node:` prefixed imports for built-in modules (proven in `src/config/index.ts`).
- Keep `provider` in sync with `baseUrl` using `detectProviderFromBaseUrl` when url changes (proven in `src/config/index.ts` and `src/commands/config.ts`).

**Don't**
- Don't use `any` except the one explicitly cast in `src/commands/config.ts`.
- Don't throw from `ping()` — return `boolean` (proven in `src/providers/openai-compatible.ts`).
- Don't inline prompt strings in generation code — use `src/prompts/index.ts` exports (proven in `src/genesis/docs.ts`).
- Don't crash on missing config; return `null` and let caller inform user (proven in `src/config/index.ts` `loadConfig`).