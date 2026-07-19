# System Overview

## Goal
Aether is a CLI tool (bin: `aether` → `./dist/cli/index.js`) that transforms a codebase into an AI-native workspace by scanning the repository and generating documentation via static analysis and optional LLM providers. Its description in `package.json` is "Transform any codebase into an AI-native workspace."

## Architecture
The project is a Node.js CLI application written in TypeScript. No frontend, database, or network server components are present in the provided context. The runtime flow is:

- `src/cli/index.ts` is the entry point (`#!/usr/bin/env node`), parses flags (`--version`, `-v`, `--no-animation`), registers commands, and starts a chat loop.
- Command implementations live in `src/commands/` and are registered in a `CommandRegistry` (`src/commands/registry.ts`).
- `genesis` and `sync` commands (`src/commands/builtins.ts`) orchestrate project analysis using modules in `src/genesis/`.
- LLM access is abstracted via `src/providers/` (OpenAI-compatible HTTP calls).
- User interaction uses `src/ui/` (readline chat, animation, step rendering).

## System Components
- **`src/cli/index.ts`** — CLI entry point; handles `--version`/`-v`/`--no-animation`, calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, and `startChat()`.
- **`src/commands/registry.ts`** — Defines `Command` interface and `CommandRegistry` class with `register`, `get`, `getAll`, `has`, `execute`; exports `const registry`.
- **`src/commands/help.ts`** — `registerHelpCommand()` lists all commands from `registry.getAll()`.
- **`src/commands/config.ts`** — `registerConfigCommand()` handles `/config` for provider/model/url/key via `loadConfig`/`saveConfig`/`validateConfig`.
- **`src/commands/builtins.ts`** — Registers `genesis`, `sync`, `exit`, `clear`; `genesis` runs `scanContext`, `planDocs`, `buildSharedProjectContext`, doc writing; `sync` uses `loadSnapshot` and `diffFingerprint`.
- **`src/config/index.ts`** — `AetherConfig` interface, `DEFAULT_CONFIGS`, `loadConfig`, `saveConfig`, `validateConfig`, `detectProviderFromBaseUrl`.
- **`src/config/scaffold.ts`** — `ensureAetherScaffold()` writes `.gitignore` entry and `.aether/README.md`.
- **`src/genesis/context.ts`** — `scanContext()` builds `ProjectContext` (config/vision/entry/source files, directory tree, omitted files).
- **`src/genesis/digest.ts`** — `buildPlannerDigest()` extracts signals/symbols for planning.
- **`src/genesis/distill.ts`** — `distillFiles()` uses LLM to compress files under budget via `chatWithRetry`.
- **`src/genesis/docs.ts`** — `DOC_DEFINITIONS` array of 13 `DocDefinition`s; `buildDocsIndex()` groups by section.
- **`src/genesis/fingerprint.ts`** — `buildFingerprint()` (sha256 per file), `getGitInfo()`, `getGitLog()`.
- **`src/genesis/planner.ts`** — `planDocs()` calls LLM with `PLANNER_PROMPT`, parses JSON plan, falls back to `CORE_IDS`.
- **`src/genesis/scope.ts`** — `buildSharedProjectContext()` respects `DOC_CONTEXT_BUDGET` (env `AETHER_DOC_CONTEXT_CHARS`, default 48_000).
- **`src/genesis/sync.ts`** — Referenced by `builtins.ts` for `sync` (uses `diffFingerprint`, `mergeDocMetas`, `loadSnapshot`).
- **`src/prompts/`** — Multiple modules exporting prompt strings (`BASE_PROMPT`, `PLANNER_PROMPT`, `GETTING_STARTED_PROMPT`, etc.) re-exported via `src/prompts/index.ts`.
- **`src/providers/types.ts`** — `LLMProvider`, `ChatMessage`, `ChatRequest`, `ChatResponse`, `StreamChunk` interfaces.
- **`src/providers/openai-compatible.ts`** — `OpenAICompatibleProvider` POSTs to `${baseUrl}/chat/completions` and GETs `${baseUrl}/models`.
- **`src/providers/factory.ts`** — `createProvider()` returns `OpenAICompatibleProvider` for `openai`/`gemini`/`anthropic`/`openrouter`.
- **`src/providers/retry.ts`** — `chatWithRetry()` with exponential backoff; `createRetryLogger()`.
- **`src/ui/animation.ts`** — `playStartupAnimation()` / `printBanner()` using `chalk`.
- **`src/ui/prompt.ts`** — `startChat()` readline loop with command dropdown and `completer`.
- **`src/ui/steps.ts`** — `StepRunner` and `LineSpinner` for progress display.
- **`scripts/build-sea.mjs`** — Referenced by `build:sea` npm script; not detailed in context.

## Communication Patterns
- CLI commands communicate in-process by calling registered handler functions via `registry.execute()` (`src/commands/registry.ts`).
- `genesis`/`sync` commands call `src/genesis/*` functions directly (e.g., `scanContext`, `planDocs`, `buildSharedProjectContext`).
- LLM communication: `OpenAICompatibleProvider` (`src/providers/openai-compatible.ts`) makes HTTP POST to `${baseUrl}/chat/completions` (SSE stream) and GET to `${baseUrl}/models` for `ping()`. Retries handled by `chatWithRetry` in `src/providers/retry.ts`.
- No REST/WebSocket/event-bus between internal components beyond direct function calls and LLM HTTP requests.

## Authentication & Authorization
- LLM provider auth uses an API key passed as `apiKey` in `AetherConfig` (`src/config/index.ts`) and sent in HTTP requests by `OpenAICompatibleProvider` (constructor stores `apiKey`, used in POST headers). `validateConfig()` requires `apiKey` for saved configs.
- No user/auth system for the CLI itself is present.

## Deployment
- `package.json` defines `bin: { "aether": "./dist/cli/index.js" }` and `scripts.build: "tsc"` (compiles `src/` to `dist/` per `tsconfig.json` `outDir`).
- `build:sea` script runs `node scripts/build-sea.mjs` (using `esbuild` and `postject` devDependencies) but the script content is not provided.
- `engines.node` requires `>=20.0.0`.
- No container, cloud, or CI deployment config is present in the provided context.