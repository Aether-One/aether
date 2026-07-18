# System Overview

## Goal

Aether is an open-source TypeScript CLI that transforms any codebase into an AI-native workspace by analyzing a repository and generating a knowledge base (documentation) using LLM providers via an OpenAI-compatible API.

## Architecture

The project is a Node.js CLI application (ESM, TypeScript). No frontend, database, or persistent storage backend is present in the code. The relevant architectural layers evidenced in the source are:

- **CLI entry & interactive prompt** — `src/cli/index.ts` registers commands and starts `startChat()` from `src/ui/prompt.ts`.
- **Command system** — `src/commands/registry.ts` defines `CommandRegistry` (case-insensitive lookup via `execute()`); builtins and config/help commands register themselves.
- **Configuration** — `src/config/index.ts` loads/saves `.aether/config.json` (`AetherConfig` with `provider`, `model`, `baseUrl`, `apiKey`).
- **Provider layer** — `src/providers/` exposes `LLMProvider` interface, `OpenAICompatibleProvider` (used for all providers including anthropic via TODO note), and `createProvider()` factory.
- **Genesis pipeline** — `src/genesis/context.ts` (`scanContext`, `buildPrompt`), `src/genesis/planner.ts` (`planDocs`), `src/genesis/docs.ts` (`DOC_DEFINITIONS`, `buildCustomDocDefinition`, `buildDocsIndex`).
- **Prompts** — `src/prompts/` contains `BASE_PROMPT`, `PROMPT_SUFFIX`, and per-doc prompts (e.g. `SYSTEM_OVERVIEW_PROMPT`, `PLANNER_PROMPT`).
- **UI** — `src/ui/animation.ts` (startup banner), `src/ui/steps.ts` (`StepRunner` with ANSI states), `src/ui/prompt.ts` (readline interface with dropdown).

## System Components

| Component | File(s) | Role |
|-----------|---------|------|
| CLI entry | `src/cli/index.ts` | Parses `--version`/`--no-animation`, registers commands, starts prompt or prints banner |
| Command registry | `src/commands/registry.ts` | Stores commands in a `Map`, resolves by lowercased name, executes handlers |
| Builtin commands | `src/commands/builtins.ts` | Implements `/genesis`, `/sync` (stub), `/exit`, `/clear` |
| Config command | `src/commands/config.ts` | Implements `/config` (quick setup, `set`, `show`, help) |
| Help command | `src/commands/help.ts` | Implements `/help` listing registered commands |
| Config model | `src/config/index.ts` | `AetherConfig` type, `loadConfig`/`saveConfig`/`validateConfig`, `detectProviderFromBaseUrl` |
| Provider interface | `src/providers/types.ts` | `LLMProvider` with `chat`, `chatStream`, `ping` |
| OpenAI-compatible provider | `src/providers/openai-compatible.ts` | `fetch` to `/chat/completions` and `/models`, Bearer auth |
| Provider factory | `src/providers/factory.ts` | `createProvider()` returns `OpenAICompatibleProvider` per config |
| Retry wrapper | `src/providers/retry.ts` | `chatWithRetry` (3 retries, exponential backoff), `createRetryLogger` |
| Context scanner | `src/genesis/context.ts` | `scanContext()` reads config/vision/entry/source files; `buildPrompt()` assembles context string |
| Planner | `src/genesis/planner.ts` | `planDocs()` calls LLM with `PLANNER_PROMPT`, parses JSON array, enforces `CORE_IDS` |
| Doc catalog | `src/genesis/docs.ts` | `DOC_DEFINITIONS`, `buildCustomDocDefinition`, `buildDocsIndex` |
| Prompts | `src/prompts/*.ts` | Exported prompt constants and `buildCustomDocPrompt` |
| UI animation | `src/ui/animation.ts` | `playStartupAnimation`, `printBanner` |
| Step runner | `src/ui/steps.ts` | `StepRunner` class rendering `○ ⠹ ✎ ✓ ✗` states |
| Interactive prompt | `src/ui/prompt.ts` | `startChat()` readline loop, tab completion, dropdown, `respond()` |

## Communication Patterns

- The CLI process communicates with external LLM APIs over HTTPS using `fetch` in `src/providers/openai-compatible.ts` (`/chat/completions` POST, `/models` GET).
- Internal communication is direct function calls: `src/commands/builtins.ts` calls `loadConfig`, `createProvider`, `scanContext`, `planDocs`, `chatWithRetry`, `StepRunner` methods, and `buildDocsIndex`.
- The interactive prompt (`src/ui/prompt.ts`) dispatches input to `registry.execute()` which invokes the matched command handler.
- No REST/WebSocket/event-bus internal protocols are present in the code.

## Authentication & Authorization

`OpenAICompatibleProvider` sends `Authorization: Bearer <apiKey>` on every request (`src/providers/openai-compatible.ts`). The `apiKey` is stored in `.aether/config.json` via `saveConfig` (`src/config/index.ts`). No user-level authorization or role system exists in the code.

## Deployment

Not detected from provided context. No Dockerfile, CI config, or deployment script is present in the listed project files (the `scripts/build-sea.mjs` file is listed in the directory tree but its contents are not provided, so its purpose is not verifiable). `package.json` defines `bin: { "aether": "./dist/cli/index.js" }` and a `build` script (`tsc`), indicating compilation to `dist/` via TypeScript, but no deployment target or runtime hosting is evidenced.