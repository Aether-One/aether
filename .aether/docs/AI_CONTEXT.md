# AI Context — aether

You are an AI assistant working on **aether**, a TypeScript CLI project. The instructions below are derived strictly from the code and config files present in this repository. Follow them exactly.

## 1. Project Identity
Aether is a TypeScript/Node.js CLI tool (bin: `aether`) that provides an interactive chat interface and a `/genesis` command to scan a project and generate AI-assisted documentation via configurable LLM providers.

## 2. Always Follow
- Write all source code in TypeScript under `src/`, compiled with `tsc` to `dist/` per `tsconfig.json` (`module: NodeNext`, `target: ES2022`, `rootDir: ./src`, `outDir: ./dist`).
- Use ESM import syntax with explicit `.js` extensions for relative imports (e.g. `import { registry } from "./registry.js"` in `src/commands/help.ts`, `src/commands/config.ts`).
- Register CLI commands exclusively through the `registry` instance from `src/commands/registry.ts` using `registry.register({ name, description, handler })`.
- Use `chalk.hex("#895bf4")` as the primary accent color and `chalk.dim` for secondary text, as done in `src/ui/animation.ts`, `src/commands/help.ts`, `src/commands/builtins.ts`.
- When adding LLM provider support, implement the `LLMProvider` interface from `src/providers/types.ts` and wire it in `createProvider` in `src/providers/factory.ts`.
- Reuse the anti-hallucination prompt constants `BASE_PROMPT` and `PROMPT_SUFFIX` from `src/prompts/base.ts` for any LLM call (see `withBase` in `src/genesis/docs.ts` and `planDocs` in `src/genesis/planner.ts`).

## 3. Never Do
- Do NOT invent files, functions, commands, or technologies not present in the repository.
- Do NOT add external prompt/CLI libraries — `src/ui/prompt.ts` uses native `node:readline` only (per `docs/architecture.md` and `src/ui/prompt.ts`).
- Do NOT use `any` in TypeScript code; the project guidelines in `CONTRIBUTING.md` forbid it and `tsconfig.json` sets `strict: true`.
- Do NOT silently drop files from generated context — `src/genesis/context.ts` pushes omitted files to `omittedFiles` and reports them in `buildPrompt`.
- Do NOT trust LLM-proposed doc paths without sanitization — `sanitizeDocPath` in `src/genesis/planner.ts` rejects traversal/absolute paths.

## 4. Key Decisions
- The CLI entry point is `src/cli/index.ts`, which calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, then plays startup animation or prints banner based on `process.stdin.isTTY` and `--no-animation`, then `startChat()`.
- Provider configuration is stored at `.aether/config.json` via `saveConfig`/`loadConfig` in `src/config/index.ts`; supported providers are `openai`, `anthropic`, `gemini`, `openrouter` (see `DEFAULT_CONFIGS` and `validateConfig` in `src/config/index.ts`).
- All LLM calls for docs go through `chatWithRetry` in `src/providers/retry.ts` (default 3 retries, exponential backoff).
- The `/genesis` command (`src/commands/builtins.ts`) scans with `scanContext` (`src/genesis/context.ts`), plans with `planDocs` (`src/genesis/planner.ts`), and writes outputs to `.aether/docs/` per `DOC_DEFINITIONS` in `src/genesis/docs.ts`.
- `OpenAICompatibleProvider` in `src/providers/openai-compatible.ts` is used for all four providers; `src/providers/factory.ts` has a TODO noting Anthropic needs its own format.

## 5. Conventions
- Command modules live in `src/commands/` and export a `registerXCommand()` function called from `src/cli/index.ts`.
- Prompt strings are stored as exported constants in `src/prompts/*.ts` and aggregated in `src/prompts/index.ts`; they are never inlined in generation logic (see header comment in `src/genesis/docs.ts`).
- UI helpers are split: `src/ui/animation.ts` (banner/startup), `src/ui/prompt.ts` (chat loop), `src/ui/steps.ts` (`StepRunner` class for progress).
- Error output goes to `process.stderr`; user-facing status to `process.stdout` (see `src/cli/index.ts` catch block and command handlers).
- Config keys map: `provider`, `model`, `url`→`baseUrl`, `key`→`apiKey` (see `keyMap` in `src/commands/config.ts`).

## 6. File Patterns
- New CLI commands: add a file in `src/commands/` with a `registerXCommand()` function and call it in `src/cli/index.ts`; define the command via `registry.register`.
- New LLM prompt templates: add a constant in `src/prompts/` and export from `src/prompts/index.ts`; consume via `buildPrompt` in `src/genesis/docs.ts`.
- New provider logic: edit `src/providers/factory.ts` and add classes in `src/providers/` implementing `LLMProvider` from `src/providers/types.ts`.
- Generated docs are written under `.aether/docs/` with fixed paths from `DOC_DEFINITIONS` (e.g. `docs/architecture/system-overview.md`, `docs/AI_CONTEXT.md`); custom docs use `docs/<sanitized-path>` via `buildCustomDocDefinition`.
- Build script `scripts/build-sea.mjs` exists for `npm run build:sea` (per `package.json`); do not remove it.