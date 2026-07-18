# Coding Standards — aether

The following rules are derived only from the source files present in the provided project context (`src/`, `package.json`, `tsconfig.json`, `sea-config.json`, and docs). No conventions were inferred from external knowledge.

## 1. Code Style

- **Indentation**: 2 spaces are used consistently (e.g. `src/commands/registry.ts`, `src/genesis/context.ts`).
- **Quotes**: Single quotes are used for all string literals (e.g. `src/cli/index.ts`: `import { ... } from "../ui/animation.js";`).
- **Semicolons**: Every statement ends with a semicolon (visible across `src/**/*.ts`).
- **Trailing commas**: Object and array literals use trailing commas (e.g. `src/config/index.ts` `DEFAULT_CONFIGS`, `src/providers/types.ts` interfaces).
- **Line length / wrapping**: Long function calls and object literals are wrapped with 2-space continuation indent (e.g. `src/commands/builtins.ts` `registry.register({ ... })`).
- **File ending**: Source files use `\n` line endings and no visible BOM.

## 2. Naming Conventions

- **Files**: `kebab-case.ts` for most modules (`animation.ts`, `registry.ts`, `planner.ts`); `index.ts` used as barrel/entry per directory (`src/commands/index` not present, but `src/cli/index.ts`, `src/config/index.ts`, `src/prompts/index.ts`, `src/providers/index.ts` exist).
- **Directories**: `kebab-case` (`commands/`, `genesis/`, `providers/`, `ui/`, `prompts/`).
- **Functions**: `camelCase` (`playStartupAnimation`, `startChat`, `scanContext`, `buildPrompt`, `planDocs`).
- **Classes**: `PascalCase` (`CommandRegistry` in `src/commands/registry.ts`, `OpenAICompatibleProvider` in `src/providers/openai-compatible.ts`, `StepRunner` in `src/ui/steps.ts`).
- **Interfaces / Types**: `PascalCase` (`Command`, `LLMProvider`, `ChatRequest`, `ProjectContext`, `AetherConfig`, `DocDefinition`).
- **Constants**: `UPPER_SNAKE_CASE` for module-level constants (`MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `SPINNER_FRAMES` in `src/ui/steps.ts`; `CONFIG_FILES`, `IGNORED_DIRS` in `src/genesis/context.ts`).
- **Enum-like unions**: String-literal union types for providers (`"openai" | "anthropic" | "gemini" | "openrouter"` in `src/config/index.ts`).

## 3. Architecture Patterns

- **Command Registry pattern**: `src/commands/registry.ts` exports a singleton `registry` (`CommandRegistry` instance) with `register`, `get`, `getAll`, `has`, `execute`. Commands self-register via `registry.register({ name, description, usage?, handler })`.
- **Provider abstraction**: `src/providers/types.ts` defines `LLMProvider` interface; `src/providers/factory.ts` `createProvider(config)` returns an `OpenAICompatibleProvider` for all four provider strings.
- **Separation of concerns**: 
  - `src/genesis/context.ts` scans/project context building.
  - `src/genesis/planner.ts` decides docs via LLM.
  - `src/genesis/docs.ts` defines doc catalog.
  - `src/prompts/*` hold prompt strings only.
  - `src/ui/*` handles terminal I/O.
- **Singleton config module**: `src/config/index.ts` exposes pure functions (`loadConfig`, `saveConfig`, `validateConfig`) operating on a passed `rootDir`.
- **Step runner UI**: `src/ui/steps.ts` `StepRunner` class manages a live terminal step list with spinner.

## 4. File Organization

- **Barrel exports**: `src/prompts/index.ts` re-exports all prompt constants/functions; `src/providers/index.ts` re-exports types and classes.
- **One public class/primary export per file** where applicable (`OpenAICompatibleProvider` in `openai-compatible.ts`, `StepRunner` in `steps.ts`).
- **Top-of-file imports**, then type/interface declarations, then function implementations (e.g. `src/genesis/context.ts`: imports → `ProjectContext` interface → `scanContext` → `buildPrompt` → helpers).
- **Inline interface definitions** appear adjacent to usage (`FileContent` in `src/genesis/context.ts`, `RetryOptions` in `src/providers/retry.ts`).

## 5. Import Conventions

- **Node built-ins** imported via `node:` prefix: `import { readFile } from "node:fs/promises";`, `import * as readline from "node:readline";` (`src/ui/prompt.ts`), `import { join } from "node:path";`.
- **Relative imports with `.js` extension** required by `NodeNext` (`import { registry } from "./registry.js";` in `src/commands/help.ts`).
- **Third-party**: `import chalk from "chalk";` (default import, ESM) in `src/commands/help.ts`, `src/ui/animation.ts`, etc.
- **Type-only imports**: `import type { LLMProvider } from "../providers/types.js";` (`src/genesis/planner.ts`), `import type { AetherConfig } from "../config/index.js";` (`src/providers/factory.ts`).
- **Named re-exports** grouped at top of barrel files (`src/prompts/index.ts`).

## 6. Error Handling

- **Try/catch with silent fallback**: `safeReadFile` in `src/genesis/context.ts` returns `null` on stat/read failure and pushes to `omitted` array.
- **`catch { }` empty blocks** used to ignore non-fatal errors (`src/genesis/context.ts` `JSON.parse(pkg)` catch, `findVisionFiles` catch).
- **Explicit error objects**: `throw new Error(\`Unknown provider: ${config.provider}\`)` in `src/providers/factory.ts`.
- **Retry wrapper**: `chatWithRetry` in `src/providers/retry.ts` wraps `provider.chat` with exponential backoff (`baseDelay * Math.pow(2, attempt -1)`), max 3 retries.
- **Top-level catch in CLI**: `main().catch(...)` in `src/cli/index.ts` writes to `stderr` and `process.exit(1)`.
- **User-facing errors** written via `process.stdout.write` with `chalk.red("  ✗")` prefix (e.g. `src/commands/builtins.ts` directory-not-found check).
- **AbortController timeouts** in `OpenAICompatibleProvider` (`chat`, `chatStream`, `ping`) with `finally { clearTimeout }`.

## 7. Type Patterns

- **Strict TypeScript**: `tsconfig.json` has `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`.
- **Explicit interface annotations** for function params/returns (`scanContext(rootDir: string): Promise<ProjectContext>`).
- **Union types** for constrained strings (`Command["status"]` in `src/ui/steps.ts`: `"pending" | "running" | "writing" | "done" | "error"`).
- **Type assertions** used sparingly: `as AetherConfig`, `as OpenAIChatResponse` (`src/providers/openai-compatible.ts`), `as unknown as { line: string }` (`src/ui/prompt.ts`).
- **Generic async generators**: `async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>` in `src/providers/openai-compatible.ts`.
- **Optional properties**: `apiKey?: string` in `AetherConfig`; `usage?` in `ChatResponse`.
- **`declare const`** for build-injected globals: `declare const __AETHER_VERSION__: string;` in `src/cli/index.ts`.

## 8. Do / Don't

**Do**
- Use `node:` prefixed imports for built-in modules (proven in `src/genesis/context.ts`, `src/ui/prompt.ts`).
- Append `.js` to relative TypeScript imports (required by `NodeNext` in `tsconfig.json`).
- Register CLI commands through `registry.register(...)` in `src/commands/*.ts` and call registration from `src/cli/index.ts`.
- Use `chalk.hex("#895bf4")` for the project accent color (visible in `src/commands/config.ts`, `src/ui/animation.ts`, `src/ui/steps.ts`).
- Keep prompt strings isolated in `src/prompts/` and import them (see `src/genesis/docs.ts` importing from `../prompts/index.js`).
- Report omitted files explicitly instead of silent drops (`omittedFiles` array in `src/genesis/context.ts`).

**Don't**
- Don't use `any` without explicit escape hatch comment — only one `(config as any)[configKey]` appears in `src/commands/config.ts` with an eslint-disable comment; avoid elsewhere.
- Don't use external prompt/readline libraries — `src/docs/architecture.md` states native `readline` is used (`src/ui/prompt.ts` confirms).
- Don't assume providers other than the four in `AetherConfig` (`openai`, `anthropic`, `gemini`, `openrouter`) — `validateConfig` rejects others.
- Don't write files outside `docs/` for custom docs — `sanitizeDocPath` in `src/genesis/planner.ts` rejects `..` and absolute paths.
- Don't use JavaScript — `CONTRIBUTING.md` and `tsconfig.json` confirm TypeScript only; all source is `.ts`.