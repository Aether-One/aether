# API Documentation — aether

This project is a CLI tool. The public interface is its command set and the program entry behavior. No REST/GraphQL endpoints or library exports are defined in the provided code.

## CLI Commands

All commands are registered via `registry.register(...)` in `src/commands/registry.ts` and executed through `CommandRegistry.execute()` in `src/commands/registry.ts`. Commands are case-insensitive (matched via `.toLowerCase()` in `execute`).

### `/config`

- **Syntax:** `/config [options]`
- **Options/Flags:**
  - (no args or `show`) — show current config from `.aether/config.json` (`src/commands/config.ts` `showCurrentConfig`)
  - `--help`, `-h`, `help` — print config help (`showConfigHelp`)
  - `<provider>` where provider ∈ `openai`, `anthropic`, `gemini`, `openrouter` — quick setup (`quickSetup`)
  - `set <key> <value>` — set a config key. Valid keys (from `keyMap` in `src/commands/config.ts`): `provider`, `model`, `url`/`baseurl` (→ `baseUrl`), `key`/`apikey` (→ `apiKey`)
- **Examples:**
  - `/config gemini`
  - `/config set model gpt-4o`
  - `/config set key AIza...`
- **Behavior:** Loads/saves `.aether/config.json` via `loadConfig`/`saveConfig` from `src/config/index.ts`. On `set url`, calls `detectProviderFromBaseUrl()` (`src/config/index.ts`) to resync `provider` if host is known. Validates via `validateConfig`.

### `/genesis`

- **Syntax:** `/genesis [path] [--force]`
- **Options/Flags:**
  - `[path]` — target directory (defaults to `process.cwd()`)
  - `--force` — regenerate even if `.aether/docs` exists
  - `--help`, `-h`, `help` — print genesis help (`showGenesisHelp`)
- **Examples:**
  - `/genesis`
  - `/genesis /some/path`
  - `/genesis --force`
- **Behavior (from `src/commands/builtins.ts`):**
  1. Validate path exists and is a directory (`existsSync`, `statSync`).
  2. If `.aether/docs` exists and not `--force`, point user to `/sync` (not yet available).
  3. Load config via `loadConfig`; if none, error.
  4. `createProvider(config)` from `src/providers/factory.ts`.
  5. `provider.ping()` — GET `{baseUrl}/models`.
  6. `scanContext(targetDir)` + `buildPrompt()` from `src/genesis/context.ts`.
  7. `planDocs()` from `src/genesis/planner.ts` → returns `DocDefinition[]`.
  8. For each doc: `chatWithRetry` (`src/providers/retry.ts`) → write to `.aether/docs/...`.
  9. Write `docs/README.md` via `buildDocsIndex` and `.aether/context.json`.

### `/sync`

- **Syntax:** `/sync [path]`
- **Behavior:** Registered in `src/commands/builtins.ts` as a stub. Prints "Still under development — not available yet" and suggests `/genesis --force`. No incremental logic implemented.

### `/exit`

- **Syntax:** `/exit`
- **Behavior:** Prints "Goodbye." and calls `process.exit(0)` (`src/commands/builtins.ts`).

### `/clear`

- **Syntax:** `/clear`
- **Behavior:** Writes `\x1Bc` (clear screen ANSI) (`src/commands/builtins.ts`).

### `/help`

- **Syntax:** `/help`
- **Behavior:** Prints all registered commands with description and usage from `registry.getAll()` (`src/commands/help.ts`).

## Entry Point Behavior

From `src/cli/index.ts`:
- `--version` / `-v` → prints `aether v{VERSION}` and exits.
- Registers `help`, builtin, and config commands.
- If `process.stdin.isTTY` and no `--no-animation`: `playStartupAnimation()` from `src/ui/animation.ts`; else `printBanner()`.
- Calls `startChat()` from `src/ui/prompt.ts` (interactive readline loop with command autocomplete dropdown).

## Provider Interface (used internally by `/genesis`)

Defined in `src/providers/types.ts` as `LLMProvider`:
- `chat(request: ChatRequest): Promise<ChatResponse>`
- `chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>`
- `ping(): Promise<boolean>`

Implemented only by `OpenAICompatibleProvider` (`src/providers/openai-compatible.ts`), constructed via `createProvider` in `src/providers/factory.ts` for `openai`, `gemini`, `anthropic`, `openrouter`. All use `Authorization: Bearer <apiKey>` against `{baseUrl}/chat/completions` and `{baseUrl}/models`.

## Errors

From `formatError` in `src/commands/builtins.ts`:
- `429` → rate limit message
- `401`/`403` → auth failure, suggests `/config set key`
- `abort`/`timeout`/`ETIMEDOUT` → request timed out
- `ECONNREFUSED`/`ENOTFOUND`/`fetch failed` → connection failed
- otherwise → first line truncated to 120 chars

No endpoints, parameters, or response schemas beyond the above CLI surface are defined in the provided code.