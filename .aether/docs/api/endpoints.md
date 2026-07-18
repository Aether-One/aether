# API Documentation — aether

This project is a CLI tool. The public interface consists of CLI commands (registered via `registry.register` in `src/commands/`) and exported modules from `src/`.

## CLI Commands

### `/help`
- **Command:** `/help`
- **Options/Flags:** None
- **Examples:** `/help`
- **Behavior:** Registered in `src/commands/help.ts` via `registerHelpCommand()`. Prints all registered commands (name, description, and usage if present) to stdout using `registry.getAll()`.

### `/genesis`
- **Command:** `/genesis [path]` (also `--force`, `--help`/`-h`/`help`)
- **Options/Flags:**
  - `[path]` — Directory to analyze (defaults to `process.cwd()`)
  - `--force` — Regenerate even if `.aether/docs` already exists
  - `--help` / `-h` / `help` — Show genesis help
- **Examples:** `/genesis`, `/genesis ./my-project`, `/genesis --force`
- **Behavior:** Registered in `src/commands/builtins.ts` via `registerBuiltinCommands()`.
  1. If args are `--help`/`-h`/`help`, calls `showGenesisHelp()`.
  2. Validates target directory exists and is a directory (uses `existsSync`, `statSync`).
  3. If `.aether/docs` exists and `--force` not passed, prints notice pointing to planned `/sync` (not available).
  4. Loads config via `loadConfig(process.cwd())`; if none, errors.
  5. Creates provider via `createProvider(config)`, calls `provider.ping()`.
  6. Scans project via `scanContext(targetDir)`, builds prompt via `buildPrompt(context)`.
  7. Plans docs via `planDocs(contextPrompt, provider, config.model)`.
  8. Uses `StepRunner` to generate each doc: calls `chatWithRetry`, writes files to `.aether/<doc.outputPath>`.
  9. Writes `.aether/context.json` with generatedAt, provider, model, docs list.

### `/sync`
- **Command:** `/sync [path]`
- **Options/Flags:** None implemented
- **Examples:** `/sync`
- **Behavior:** Registered in `src/commands/builtins.ts`. Prints message that it is "Still under development — not available yet." No functional implementation.

### `/exit`
- **Command:** `/exit`
- **Options/Flags:** None
- **Examples:** `/exit`
- **Behavior:** Registered in `src/commands/builtins.ts`. Prints "✦ Goodbye." and calls `process.exit(0)`.

### `/clear`
- **Command:** `/clear`
- **Options/Flags:** None
- **Examples:** `/clear`
- **Behavior:** Registered in `src/commands/builtins.ts`. Writes `\x1Bc` to stdout (clears screen).

### `/config`
- **Command:** `/config [--provider <name>] [--model <model>] [--url <baseUrl>] [--key <apiKey>]` (also `show`, `set <key> <value>`, quick provider names)
- **Options/Flags:**
  - No args or `show` — show current config
  - `--help` / `-h` / `help` — show config help
  - `set <key> <value>` — set key (provider, model, url/baseurl, key/apikey)
  - `openai` | `anthropic` | `gemini` | `openrouter` — quick setup
- **Examples:** `/config gemini`, `/config set model gpt-4o`, `/config set key AIza...`
- **Behavior:** Registered in `src/commands/config.ts` via `registerConfigCommand()`.
  1. Help: prints provider/key usage.
  2. Show: loads config via `loadConfig(process.cwd())`, prints or "No config found."
  3. `set`: parses key/value, maps to `AetherConfig` field, auto-detects provider from baseUrl via `detectProviderFromBaseUrl`, validates via `validateConfig`, saves via `saveConfig`.
  4. Quick setup: uses `getDefaultConfig(provider)`, merges existing apiKey, saves.

### CLI Binary Entry (`aether`)
- **Command:** `aether` (bin in `package.json` → `./dist/cli/index.js`)
- **Options/Flags:**
  - `--version` / `-v` — prints `aether v<VERSION>`
  - `--no-animation` — skips startup animation
- **Behavior:** `src/cli/index.ts` `main()`:
  1. If `--version`/`-v`, writes version and exits.
  2. Registers help, builtin, config commands.
  3. If `process.stdin.isTTY` and not `--no-animation`, `playStartupAnimation()`; else `printBanner()`.
  4. Calls `startChat()` (from `src/ui/prompt.ts`).

## Library Exports (Public API)

### `src/config/index.ts`
- `interface AetherConfig` — `{ provider: "openai"|"anthropic"|"gemini"|"openrouter", model: string, baseUrl: string, apiKey?: string }`
- `getDefaultConfig(provider: string): Partial<AetherConfig>`
- `detectProviderFromBaseUrl(baseUrl: string): AetherConfig["provider"] | null`
- `getConfigPath(rootDir: string): string`
- `loadConfig(rootDir: string): Promise<AetherConfig | null>`
- `saveConfig(rootDir: string, config: AetherConfig): Promise<void>`
- `validateConfig(config: AetherConfig): string[]`

### `src/commands/registry.ts`
- `interface Command` — `{ name: string, description: string, usage?: string, handler: (args: string) => Promise<void> | void }`
- `class CommandRegistry` — methods: `register`, `get`, `getAll`, `has`, `execute`
- `export const registry = new CommandRegistry()`

### `src/providers/index.ts`
- `type LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk` (from `types.ts`)
- `class OpenAICompatibleProvider` (from `openai-compatible.ts`)
- `createProvider(config: AetherConfig): LLMProvider` (from `factory.ts`)

### `src/providers/types.ts`
- `interface ChatMessage` — `{ role: "system"|"user"|"assistant", content: string }`
- `interface ChatRequest` — `{ messages: ChatMessage[], model: string, temperature?: number, maxTokens?: number }`
- `interface ChatResponse` — `{ content: string, model: string, usage?: { promptTokens, completionTokens, totalTokens } }`
- `interface StreamChunk` — `{ content: string, done: boolean }`
- `interface LLMProvider` — `{ name: string, chat(request): Promise<ChatResponse>, chatStream(request): AsyncGenerator<StreamChunk>, ping(): Promise<boolean> }`

### `src/providers/retry.ts`
- `chatWithRetry(provider: LLMProvider, request: ChatRequest, options?: Partial<RetryOptions>): Promise<ChatResponse>`
- `createRetryLogger(): RetryOptions["onRetry"]`
- `interface RetryOptions` — `{ maxRetries: number, baseDelay: number, onRetry?: (attempt, maxRetries, error) => void }`

### `src/genesis/context.ts`
- `scanContext(rootDir: string): Promise<ProjectContext>`
- `buildPrompt(context: ProjectContext): string`
- `interface ProjectContext` — `{ name, description?, rootDir, configFiles, visionFiles, entryPoints, sourceFiles, directoryTree, omittedFiles }`

### `src/genesis/docs.ts`
- `interface DocDefinition` — `{ id, outputPath, label, buildPrompt: (context: string) => string }`
- `interface CustomDocSpec` — `{ path, title, focus }`
- `DOC_DEFINITIONS: DocDefinition[]`
- `buildCustomDocDefinition(spec: CustomDocSpec): DocDefinition`

### `src/genesis/planner.ts`
- `planDocs(contextPrompt: string, provider: LLMProvider, model: string): Promise<DocDefinition[]>`

### `src/prompts/index.ts`
- Exports: `BASE_PROMPT`, `PROMPT_SUFFIX`, `SYSTEM_OVERVIEW_PROMPT`, `FOLDER_STRUCTURE_PROMPT`, `TECH_STACK_PROMPT`, `CODING_STANDARDS_PROMPT`, `MODULES_PROMPT`, `API_PROMPT`, `BUSINESS_RULES_PROMPT`, `DIAGRAMS_PROMPT`, `AI_CONTEXT_PROMPT`, `GLOSSARY_PROMPT`, `PLANNER_PROMPT`, `buildCustomDocPrompt`

### `src/ui/steps.ts`
- `class StepRunner` — constructor `(title: string)`, methods: `addStep`, `start`, `runStep`, `setWriting`, `finish`, `error`
- `interface Step` — `{ label, status: "pending"|"running"|"writing"|"done"|"error" }`

### `src/ui/animation.ts`
- `playStartupAnimation(): Promise<void>`
- `printBanner(): void`

### `src/ui/prompt.ts`
- `startChat(): void`

## Notes
- No REST/GraphQL endpoints exist in this project.
- `/sync` is registered but explicitly prints "not available yet" (see `src/commands/builtins.ts`).
- The `anthropic` provider in `createProvider` (`src/providers/factory.ts`) returns an `OpenAICompatibleProvider` with a `TODO` comment that it needs its own provider format.