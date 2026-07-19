# Aether — API Documentation

Aether is a CLI tool. The public interface consists of CLI commands registered in the command registry and the exported TypeScript modules (library surface) used by those commands. No REST/GraphQL endpoints exist in the provided context.

---

## CLI Commands

Commands are parsed by `CommandRegistry.execute` in `src/commands/registry.ts`, which splits input on `/command args`, lowercases the name, and calls the registered handler.

### `/help`

- **Command:** `/help`
- **Registered by:** `registerHelpCommand()` in `src/commands/help.ts`
- **Options/Flags:** None defined in code.
- **Behavior:**
  - Lists all commands from `registry.getAll()` with their names and descriptions.
  - Uses `chalk` for output.
- **Examples:** `/help`

### `/config`

- **Command:** `/config [--provider <name>] [--model <model>] [--url <baseUrl>] [--key <apiKey>]`
- **Registered by:** `registerConfigCommand()` in `src/commands/config.ts`
- **Options/Flags:**
  - `--provider <name>` — set provider (keyMap: `provider`)
  - `--model <model>` — set model (keyMap: `model`)
  - `--url <baseUrl>` / `--baseurl <baseUrl>` — set baseUrl; on set, calls `detectProviderFromBaseUrl` and syncs `provider` if matched (keyMap: `url`/`baseurl` → `baseUrl`)
  - `--key <apiKey>` / `--apikey <apiKey>` — set apiKey (keyMap: `key`/`apikey` → `apiKey`)
  - `--help` / `-h` / `help` — show help
  - empty or `show` — show current config
  - `set` — e.g. `set model gpt-4o` sets a field
  - direct provider name (`openai`, `anthropic`, `gemini`, `openrouter`) — select provider
- **Behavior:**
  - Loads config via `loadConfig(process.cwd())`.
  - Applies args, validates via `validateConfig`, saves via `saveConfig(process.cwd(), config)`.
  - Supported provider names from `AetherConfig`: `"openai" | "anthropic" | "gemini" | "openrouter"`.
- **Examples:**
  - `/config openai`
  - `/config set model gpt-4o`
  - `/config --key sk-...`

### `/genesis`

- **Command:** `/genesis [path]`
- **Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`
- **Options/Flags:**
  - `--help` / `-h` / `help` — show genesis help (`showGenesisHelp()`)
  - `--force` — force regeneration even if `.aether/docs` exists
  - `[path]` — target directory; defaults to `process.cwd()`
- **Behavior (step by step):**
  1. Validates `existsSync(targetDir)` and `statSync(targetDir).isDirectory()`.
  2. If not `--force` and `.aether/docs` exists, prompts to use `/sync`.
  3. Requires config via `loadConfig(process.cwd())`.
  4. Creates provider via `createProvider(config)`, calls `provider.ping()`.
  5. Calls `scanContext(targetDir)` → `buildPlannerDigest` → `planDocs` → `buildSharedProjectContext`.
  6. Runs doc generation using `StepRunner`, `LineSpinner`, `chatWithRetry` (temperature `0.3`), concurrency from `AETHER_GEN_CONCURRENCY` (default 4).
  7. Writes docs to `join(targetDir, ".aether", doc.outputPath)` and index to `.aether/docs/README.md`.
  8. Calls `writeSnapshot` and `metaFromDefinition`.
- **Examples:** `/genesis ./my-project`, `/genesis --force`

### `/sync`

- **Command:** `/sync [path]`
- **Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`
- **Options/Flags:**
  - `--help` / `-h` / `help` — show sync help (`showSyncHelp()`)
  - `[path]` — target directory; defaults to `process.cwd()`
- **Behavior (step by step):**
  1. Requires `loadSnapshot(targetDir)` at `.aether/settings/context.json`.
  2. Uses `diffFingerprint`, `hasChanges`, `getGitLog`.
  3. Calls `planSync`, `buildSharedProjectContext`, `mergeDocMetas`, `buildDocsIndex`, `writeSnapshot`.
  4. Never deletes docs; merges with `mergeDocMetas(snapshot.docs, plan.add)`.
- **Examples:** `/sync ./my-project`

### `/exit`

- **Command:** `/exit`
- **Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`
- **Behavior:** Calls `process.exit(0)`.

### `/clear`

- **Command:** `/clear`
- **Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`
- **Behavior:** Writes `"\x1Bc"` (clears screen).

### CLI Entry Flags (`src/cli/index.ts`)

- `--version` / `-v` — prints `aether v${VERSION}` (from `declare const __AETHER_VERSION__`, fallback `"0.0.0-dev"`) and exits.
- `--no-animation` — disables startup animation (uses `printBanner()` instead of `playStartupAnimation()` based on `process.stdin.isTTY`).

---

## Library Public API

### `src/config/index.ts`

- `interface AetherConfig { provider: "openai" | "anthropic" | "gemini" | "openrouter"; model: string; baseUrl: string; apiKey?: string; timeout?: number; }`
- `getDefaultConfig(provider: string): Partial<AetherConfig>` — returns defaults per provider, falls back to openai.
- `detectProviderFromBaseUrl(baseUrl: string): AetherConfig["provider"] | null`
- `getSettingsDir(rootDir): string` — `join(rootDir, ".aether", "settings")`
- `getConfigPath(rootDir): string` — `join(getSettingsDir(rootDir), "config.json")`
- `getLegacyConfigPath(rootDir): string` — `join(rootDir, ".aether", "config.json")`
- `loadConfig(rootDir): Promise<AetherConfig | null>`
- `saveConfig(rootDir, config): Promise<void>` — writes config, calls `ensureAetherScaffold(rootDir)`
- `validateConfig(config): string[]` — returns errors; requires provider (enum), model, baseUrl, apiKey

### `src/commands/registry.ts`

- `interface Command { name: string; description: string; usage?: string; handler: (args: string) => Promise<void> | void; }`
- `class CommandRegistry` — `register`, `get`, `getAll`, `has`, `execute(input)`
- `const registry = new CommandRegistry()`

### `src/providers/types.ts`

- `interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }`
- `interface ChatRequest { messages: ChatMessage[]; model: string; temperature?: number; maxTokens?: number; }`
- `interface ChatResponse { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number; }; }`
- `interface StreamChunk { content: string; done: boolean; }`
- `interface LLMProvider { name: string; chat(request: ChatRequest): Promise<ChatResponse>; chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>; ping(): Promise<boolean>; }`

### `src/providers/index.ts`

- Re-exports `LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk` from `./types.js`
- Re-exports `OpenAICompatibleProvider` from `./openai-compatible.js`
- Re-exports `createProvider` from `./factory.js`

### `src/providers/factory.ts`

- `createProvider(config: AetherConfig): LLMProvider` — switch on `config.provider` (`"openai"`, `"gemini"`, `"anthropic"`, `"openrouter"`) returns `new OpenAICompatibleProvider(...)`; default throws `Error(\`Unknown provider: ${config.provider}\`)`.

### `src/providers/retry.ts`

- `interface RetryOptions { maxRetries: number; baseDelay: number; onRetry?: (attempt: number, maxRetries: number, error: string) => void }`
- `DEFAULT_OPTIONS: RetryOptions` = `{ maxRetries: 3, baseDelay: 2000 }`
- `chatWithRetry(provider, request, options?): Promise<ChatResponse>`
- `formatRetryLine(attempt, maxRetries, error): string`
- `createRetryLogger(): RetryOptions["onRetry"]`

### `src/providers/openai-compatible.ts`

- `class OpenAICompatibleProvider implements LLMProvider`
  - `constructor(baseUrl: string, apiKey?: string, idleTimeout?: number, name?: string)`
  - `chat(request: ChatRequest): Promise<ChatResponse>`
  - `chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>`
  - `ping(): Promise<boolean>`

### `src/genesis/context.ts`

- `interface ProjectContext` — `{ name, description?, rootDir, configFiles: FileContent[], visionFiles: FileContent[], entryPoints: FileContent[], sourceFiles: FileContent[], directoryTree: string, omittedFiles: string[] }`
- `scanContext(rootDir: string): Promise<ProjectContext>`
- `buildPrompt(context: ProjectContext): string`

### `src/genesis/docs.ts`

- `type DocSection = "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific"`
- `const SECTION_ORDER: DocSection[]`
- `interface DocDefinition { id: string; outputPath: string; label: string; title: string; section: DocSection; summary: string; buildPrompt: (context: string) => string; }`
- `interface CustomDocSpec { path: string; title: string; focus: string; }`
- `const DOC_DEFINITIONS: DocDefinition[]`
- `buildCustomDocDefinition(spec: CustomDocSpec): DocDefinition`
- `type DocIndexEntry = Pick<DocDefinition, "outputPath" | "title" | "section" | "summary">`
- `buildDocsIndex(projectName: string, docs: DocIndexEntry[]): string`

### `src/genesis/planner.ts`

- `async function planDocs(contextPrompt: string, provider: LLMProvider, model: string, options?: PlanDocsOptions): Promise<DocDefinition[]>`
- `function parsePlan(content: string): ParsedPlan`
- `function extractJsonArray(content: string): unknown[] | null`
- `interface ParsedPlan { catalogIds: string[]; customDocs: CustomDocSpec[]; }`
- `interface PlanDocsOptions { onRetry?: RetryOptions["onRetry"]; onResolved?: (docs: DocDefinition[]) => void; }`

### `src/genesis/digest.ts`

- `interface FileContent { path: string; content: string; }`
- `interface DistillHooks { onStart?: (batches: number) => void; onBatch?: (index: number, total: number) => void; }`
- `async function distillFiles(files: FileContent[], provider: LLMProvider, model: string, budget: number, hooks?: DistillHooks, purpose?: string): Promise<string>`

### `src/genesis/fingerprint.ts`

- `interface FileFingerprint { hash: string; size: number; }`
- `interface GitInfo { commit: string; branch: string; dirty: boolean; }`
- `buildFingerprint(context: ProjectContext): Record<string, FileFingerprint>`
- `getGitInfo(rootDir): GitInfo | null`
- `getGitLog(rootDir, sinceCommit): string | null`

### `src/genesis/scope.ts`

- `DOC_CONTEXT_BUDGET` from `envInt("AETHER_DOC_CONTEXT_CHARS", 48_000)`
- `buildSharedProjectContext(context, provider, model, hooks?): Promise<string>`

### `src/prompts/index.ts`

- Re-exports prompt string constants from `./base.js`, `./getting-started.js`, etc.
- `buildCustomDocPrompt(title: string, focus: string): string` from `./custom-doc.js`

### `src/ui/steps.ts`

- `interface Step { label: string; status: "pending"|"running"|"writing"|"done"|"error"; detail?: string }`
- `class StepRunner` — `addStep`, `start`, `runStep`, `runPooled`, `setWriting`, `setDetail`, `finish`, `error`
- `class LineSpinner` — `start`, `setLabel`, `log`, `succeed`, `fail`

### `src/ui/prompt.ts`

- `startChat(): void` — readline loop; routes `/`-prefixed input to `registry.execute`.

### `src/ui/animation.ts`

- `playStartupAnimation(): Promise<void>`
- `printBanner(): void`

---

## Technologies (detected from package.json / imports)

- Runtime: Node.js (engines `>=20.0.0`), TypeScript (`typescript@^5.8.3`), `tsx@^4.19.4`
- Dependency: `chalk@^5.4.1`
- Build/dev: `esbuild@^0.28.1`, `postject@^1.0.0-alpha.6`, `@types/node@^22.15.21`
- Module system: ESM (`"type": "module"`, `module: NodeNext`)

No REST/GraphQL endpoints, no database, no framework (e.g. Express) are present in the provided context.