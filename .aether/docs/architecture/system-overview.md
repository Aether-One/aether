# System Overview

## Goal

Aether is a CLI tool that transforms a codebase into an AI-native workspace by analyzing the project and generating documentation via an interactive chat interface and AI providers.

## Architecture

No Frontend, Backend server, Database, or Storage services are implemented in this project beyond local filesystem writes. The CLI runs as a Node.js process and writes generated documentation to a local `.aether/` directory.

## System Components

- **`src/cli/index.ts`** — CLI entry point. Parses `--version`/`-v` and `--no-animation` flags, registers commands (`registerHelpCommand`, `registerBuiltinCommands`, `registerConfigCommand`), plays startup animation or prints banner, and starts the chat loop.
- **`src/ui/animation.ts`** — Provides `playStartupAnimation` (typing effect with particles) and `printBanner` using chalk with the `#895bf4` accent color.
- **`src/ui/prompt.ts`** — Implements `startChat` using native `readline`. Handles `/` dropdown autocomplete, Tab completion via `completer`, and routes `/` input to `registry.execute` or free text to `respond`.
- **`src/ui/steps.ts`** — Exports `StepRunner` class that renders a spinner-based step list (`addStep`, `runStep`, `setWriting`, `finish`, `error`) for progress display.
- **`src/commands/registry.ts`** — Defines `Command` interface and `CommandRegistry` class with `register`, `get`, `getAll`, `has`, `execute`. Exports singleton `registry`.
- **`src/commands/help.ts`** — `registerHelpCommand` registers `/help` which lists all registered commands via `registry.getAll`.
- **`src/commands/builtins.ts`** — `registerBuiltinCommands` registers `/genesis`, `/sync`, `/exit`, `/clear`. `/genesis` scans a target dir, loads config, pings provider, plans docs, and writes them to `.aether/docs`. `/sync` prints a "still under development" message.
- **`src/commands/config.ts`** — `registerConfigCommand` registers `/config` for showing, quick-setting, or flag-setting AI provider config; uses `loadConfig`, `saveConfig`, `getDefaultConfig`, `validateConfig`, `detectProviderFromBaseUrl` from `src/config/index.ts`.
- **`src/config/index.ts`** — Defines `AetherConfig` interface (provider, model, baseUrl, apiKey). Provides `DEFAULT_CONFIGS` for openai/anthropic/gemini/openrouter, `loadConfig`, `saveConfig` (writes to `.aether/config.json`), `validateConfig`, `detectProviderFromBaseUrl`.
- **`src/genesis/context.ts`** — `scanContext` walks the project (respecting `IGNORED_DIRS`, `SOURCE_EXTENSIONS`, size/depth limits) and returns `ProjectContext`. `buildPrompt` assembles the project context string with directory tree, vision files, config, entry points, source files, and omitted notes.
- **`src/genesis/docs.ts`** — Defines `DocDefinition` and `CustomDocSpec`. Exports `DOC_DEFINITIONS` (10 fixed docs) and `buildCustomDocDefinition`.
- **`src/genesis/planner.ts`** — `planDocs` calls the LLM with `PLANNER_PROMPT`, parses the JSON plan, enforces `CORE_IDS`, and returns `DocDefinition[]`.
- **`src/prompts/`** — Contains `base.ts` (`BASE_PROMPT`, `PROMPT_SUFFIX`), `planner.ts` (`PLANNER_PROMPT`), and one module per doc type (e.g. `system-overview.ts`, `tech-stack.ts`) plus `custom-doc.ts` (`buildCustomDocPrompt`). `index.ts` re-exports all.
- **`src/providers/types.ts`** — Defines `ChatMessage`, `ChatRequest`, `ChatResponse`, `StreamChunk`, `LLMProvider` interfaces.
- **`src/providers/openai-compatible.ts`** — `OpenAICompatibleProvider` implements `LLMProvider` with `chat`, `chatStream`, `ping` using `fetch` to `${baseUrl}/chat/completions` and `${baseUrl}/models`.
- **`src/providers/factory.ts`** — `createProvider` returns `OpenAICompatibleProvider` for openai/gemini/anthropic/openrouter based on `AetherConfig`.
- **`src/providers/retry.ts`** — `chatWithRetry` wraps `provider.chat` with exponential backoff; `createRetryLogger` prints retry notices.

## Communication Patterns

- The CLI process communicates with AI providers over HTTP using the native `fetch` API. `OpenAICompatibleProvider.chat` and `chatStream` POST to `${baseUrl}/chat/completions`; `ping` GETs `${baseUrl}/models`.
- Within the CLI, `src/commands/builtins.ts` imports and calls `scanContext`/`buildPrompt` (`src/genesis/context.ts`), `planDocs` (`src/genesis/planner.ts`), `createProvider` (`src/providers/factory.ts`), `chatWithRetry` (`src/providers/retry.ts`), and `StepRunner` (`src/ui/steps.ts`) as direct function calls.
- User input is handled by `readline` in `src/ui/prompt.ts`, which invokes `registry.execute` for slash commands.

## Authentication & Authorization

No application-level auth is implemented. AI provider access uses an `apiKey` field in `AetherConfig` sent as `Authorization: Bearer ${this.apiKey}` in `OpenAICompatibleProvider` requests. `validateConfig` requires `apiKey` for the configured provider.

## Deployment

No deployment configuration (Docker, CI/CD, hosting) is present in the provided context. `package.json` defines `bin` as `aether` pointing to `./dist/cli/index.js` and scripts `build` (`tsc`), `build:sea` (`node scripts/build-sea.mjs`), `dev` (`tsx src/cli/index.ts`), `start` (`node dist/cli/index.js`), `typecheck` (`tsc --noEmit`). `sea-config.json` exists but its contents are not provided.