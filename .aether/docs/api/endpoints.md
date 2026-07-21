# Aether CLI — API Documentation

This project is a **CLI tool** (`aether`). It does not expose a REST/GraphQL API or a library API. The public interface is the **command-line interface** defined in `src/commands/`.

---

## Commands

### `/help`

**Syntax**
```
/help
```

**Description**
Lists all registered commands with their descriptions and usage.

**Behavior**
1. Retrieves all commands from the global `CommandRegistry`.
2. Prints each command as:
   ```
   /name                    description
     usage: /name [args]
   ```
   - Command name in accent color, padded to 32 characters.
   - Description in dim color.
   - Usage line indented by 2 spaces.

**Source**: `src/commands/help.ts` → `registerHelpCommand()`

---

### `/config`

**Syntax**
```
/config [--provider <name>] [--model <model>] [--url <baseUrl>] [--key <apiKey>]
/config show
/config set <key> <value>
/config <provider>          # quick setup for openai | anthropic | gemini | openrouter
/config help
```

**Description**
Configure the AI provider, model, base URL, and API key. Configuration is stored globally at `~/.aether/config.json` with per-project overrides.

**Subcommands / Flags**

| Flag / Subcommand | Description |
|-------------------|-------------|
| `--help`, `-h`, `help` | Show usage and provider details. |
| `show` (or no args) | Display current effective config (provider, model, baseUrl, masked API key). |
| `set <key> <value>` | Set a single config key. Keys: `provider`, `model`, `url`/`baseurl`, `key`/`apikey`. |
| `openai` \| `anthropic` \| `gemini` \| `openrouter` | Quick-setup: writes default config for that provider (merges existing `apiKey` if present). |

**Key Mapping (`set` subcommand)**
| Input Key | Config Field |
|-----------|--------------|
| `provider` | `provider` |
| `model` | `model` |
| `url`, `baseurl` | `baseUrl` |
| `key`, `apikey` | `apiKey` |

**Provider Auto-Detection**
If `baseUrl` is set via `set url`, the provider is auto-detected from the host:
- `api.openai.com` → `openai`
- `api.anthropic.com` → `anthropic`
- `generativelanguage.googleapis.com` → `gemini`
- `openrouter.ai` → `openrouter`

**Validation**
`validateConfig(config)` enforces:
- `provider` ∈ {`openai`, `anthropic`, `gemini`, `openrouter`}
- `model` (non-empty string)
- `baseUrl` (non-empty string)
- `apiKey` (non-empty string)

**Config Precedence** (highest → lowest)
1. Project override: `.aether/config.json` or `.aether/settings/config.json`
2. Global per-project entry: `~/.aether/config.json` → `projects[<projectId>]`
3. Global default: `~/.aether/config.json` → `default`
4. Environment variable: `AETHER_API_KEY` (only fills `apiKey` if missing)

**Config File Structure** (`~/.aether/config.json`)
```json
{
  "default": { "provider": "openai", "model": "gpt-4o", "baseUrl": "https://api.openai.com/v1", "apiKey": "sk-..." },
  "projects": {
    "myproject-a1b2c3d4e5f6": { "model": "gpt-4o-mini" }
  }
}
```

**Project ID**
Stable ID = `basename(absPath) + "-" + sha1(absPath).slice(0,12)` (see `projectId()` in `src/config/index.ts`).

**Source**: `src/commands/config.ts` → `registerConfigCommand()`, `src/config/index.ts` → `loadConfig()`, `saveConfig()`, `validateConfig()`, `getDefaultConfig()`, `detectProviderFromBaseUrl()`.

---

### `/clean`

**Syntax**
```
/clean
```

**Description**
Registered via `registerCleanCommand()` in `src/commands/clean.ts`. Implementation details not shown in provided context.

**Source**: `src/commands/clean.ts` (registered in `src/cli/index.ts`)

---

### `/genesis`

**Syntax**
```
/genesis
```

**Description**
Registered via `registerBuiltinCommands()` in `src/commands/builtins.ts`. Implementation resides in `src/genesis/` (not fully shown in context). Per README: "Initialize — analyze and prepare your project". Generates `.aether/` knowledge base.

**Source**: `src/commands/builtins.ts`, `src/genesis/`

---

## Global CLI Options

| Flag | Description |
|------|-------------|
| `--version`, `-v` | Print version (`aether v<version>`) and exit. |
| `--no-animation` | Disable startup animation. |

**Source**: `src/cli/index.ts` → `main()`

---

## Interactive Mode

When `stdin` is a TTY and `--no-animation` is **not** set:
1. Plays startup animation (`playStartupAnimation()` from `src/ui/animation.ts`).
2. Prints banner (`printBanner()`).
3. Enters interactive chat via `startChat()` (`src/ui/prompt.ts`).

**Interactive Features**
- **Tab completion** for `/` commands (via readline completer).
- **Dropdown suggestions** when typing `/` (shows up to 6 matching commands).
- **Free-text responses** for non-command input (pattern-matched for help, greetings, genesis keywords).
- **Rotating tips** every 4 messages.

**Source**: `src/ui/prompt.ts` → `startChat()`, `showDropdown()`, `completer()`, `promptUser()`, `respond()`.

---

## Configuration Types

### `AetherConfig` (`src/config/types.ts`)
```ts
interface AetherConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number; // idle timeout in ms
}
```

### `GlobalConfigFile` (`src/config/index.ts`)
```ts
interface GlobalConfigFile {
  default?: Partial<AetherConfig>;
  projects?: Record<string, Partial<AetherConfig>>;
}
```

---

## Environment Variables

| Variable | Used For |
|----------|----------|
| `AETHER_API_KEY` | Fallback API key if not set in config. |
| `MAX_FILE_SIZE` | Override `MAX_FILE_SIZE` (default 128,000). |
| `MAX_TOTAL_CHARS` | Override `MAX_TOTAL_CHARS` (default 2,000,000). |
| `MAX_FILES_WALKED` | Override `MAX_FILES_WALKED` (default 10,000). |
| `MAX_WALK_DEPTH` | Override `MAX_WALK_DEPTH` (default 12). |
| `DOC_CONTEXT_BUDGET` | Override `DOC_CONTEXT_BUDGET` (default 48,000). |
| `GEN_CONCURRENCY` | Override `GEN_CONCURRENCY` (default 4). |
| `DISTILL_CONCURRENCY` | Override `DISTILL_CONCURRENCY` (default 4). |

**Source**: `src/genesis/constants.ts` → `envInt()`, `src/config/index.ts` → `loadConfig()`.

---

## Project Structure Generated (`.aether/`)

Per `src/config/readme.ts` (`AETHER_README`):
```
.aether/
├── README.md           # This file (auto-generated)
├── docs/               # Generated documentation (commit to git)
├── settings/           # Project settings (commit to git, needed for /sync)
└── cache/              # Local cache (gitignored)
```

Global config: `~/.aether/config.json`  
Global cache: `~/.aether/cache/<project-id>/`

**Source**: `src/config/readme.ts`, `src/config/scaffold.ts` → `ensureProjectReadme()`.

---

## LLM Provider Interface (Internal)

Not a public CLI command, but the provider interface used by `/genesis` and future `/sync`.

### `LLMProvider` (`src/providers/types.ts`)
```ts
interface LLMProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;
  ping(): Promise<boolean>;
}
```

### `ChatRequest`
```ts
interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}
```

### `ChatMessage`
```ts
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### `ChatResponse`
```ts
interface ChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}
```

### `StreamChunk`
```ts
interface StreamChunk {
  content: string;
  done: boolean;
}
```

### Provider Factory (`src/providers/factory.ts`)
```ts
function createProvider(config: AetherConfig): LLMProvider
```
- `openai` → `OpenAICompatibleProvider` (baseUrl, apiKey, timeout, "openai")
- `gemini` → `OpenAICompatibleProvider` (baseUrl, apiKey, timeout, "gemini")
- `anthropic` → `OpenAICompatibleProvider` (baseUrl, apiKey, timeout, "anthropic") — *TODO: different API format*
- `openrouter` → `OpenAICompatibleProvider` (baseUrl, apiKey, timeout, "openrouter")

**Source**: `src/providers/types.ts`, `src/providers/factory.ts`, `src/providers/openai-compatible.ts`.

---

## Retry Logic (Internal)

`chatWithRetry(provider, request, options?)` (`src/providers/retry.ts`):
- Default: 3 retries, 2s base delay, exponential backoff.
- On rate limit (429 / "rate limit"): upgrades to 6 retries, 15s base delay, respects `retry-after` header if parsed.
- Calls `onRetry(attempt, maxRetries, error)` callback for UI.

**Source**: `src/providers/retry.ts`.

---

## Version

`aether v0.1.4` (from `package.json` version, injected as `__AETHER_VERSION__` at build).

**Source**: `package.json`, `src/cli/index.ts` → `VERSION`.## src/cli/index.ts
- **Entry point**: `main()` function (async, called at bottom)
- **Version flag**: `--version` / `-v` prints `aether v${VERSION}` and exits (VERSION from `__AETHER_VERSION__` or `0.0.0-dev`)
- **Command registration order**:
  - `registerHelpCommand()` from `../commands/help.js`
  - `registerBuiltinCommands()` from `../commands/builtins.js`
  - `registerConfigCommand()` from `../commands/config.js`
  - `registerCleanCommand()` from `../commands/clean.js`
  - `registerExcludeCommand()` from `../commands/exclude.js`
- **Startup UI**:
  - `isInteractive = process.stdin.isTTY ?? false`
  - `noAnimation = process.argv.includes("--no-animation")`
  - If interactive and not `--no-animation`: `await playStartupAnimation()` from `../ui/animation.js`
  - Else: `printBanner()` from `../ui/animation.js`
- **Chat entry**: `await startChat()` from `../ui/prompt.js`
- **Error handling**: Catches errors, writes to stderr, exits with code 1

## src/commands/builtins.ts
- **Exported function: `registerBuiltinCommands()`** — Registers four built-in CLI commands with the global `registry`.
- **Command: `genesis`**
  - Description: "Analyze and document your project with AI"
  - Usage: `/genesis [path]`
  - Flags: `--force` (regenerate even if `.aether/docs` exists), `--yes` / `-y` (skip cost confirmation)
  - Handler flow:
    - Validates target directory exists and is a directory.
    - Loads config via `loadConfig(process.cwd())`; exits if missing.
    - Creates `MeteredProvider` wrapping `createProvider(config)`.
    - Pings provider; on failure, prints cause-specific error via `formatPingError()`.
    - Scans project context via `scanContext(targetDir)`; logs omitted file count.
    - Plans docs via `planDocs(buildPlannerDigest(context), provider, config.model)` with retry spinner.
    - Prints exclude hint via `printExcludeHint()`.
    - Estimates cost via `estimateGenesis(context, docsToGenerate.length, pricing)` and prints via `formatEstimate()`.
    - Prompts confirmation via `promptConfirm()` unless `--yes`.
    - Sets up `AbortController` + `watchCancelKey()` for ESC cancellation.
    - Builds shared project context via `buildSharedProjectContext(context, provider, config.model)` with distill progress callbacks.
    - Generates docs in parallel via `StepRunner.runPooled(GEN_CONCURRENCY, ...)`:
      - Each doc: builds prompt via `buildDocPrompt(doc, sharedContext)`, calls `chatWithRetry()` with temperature 0.3.
      - Writes output to `.aether/<doc.outputPath>`.
    - Writes docs index via `buildDocsIndex(context.name, docsToGenerate)` to `.aether/docs/README.md`.
    - Writes snapshot via `writeSnapshot(targetDir, {provider, model}, context, docsToGenerate.map(metaFromDefinition))`.
    - Ensures project README via `ensureProjectReadme(targetDir)`.
    - Prints elapsed time.
- **Command: `sync`**
  - Description: "Refresh only the docs affected by what changed since the last run"
  - Usage: `/sync [path]`
  - Flags: `--yes` / `-y` (skip cost confirmation)
  - Handler flow:
    - Loads snapshot via `loadSnapshot(targetDir)`; exits if missing (prompts `/genesis` first).
    - Loads config; creates `MeteredProvider`; pings provider.
    - Scans context via `scanContext(targetDir)`; diffs fingerprint via `diffFingerprint(snapshot.files, context)`.
    - If `hasChanges(diff)` false, prints up-to-date message and exits.
    - Gets git log via `getGitLog(targetDir, snapshot.git.commit)` if snapshot has git commit.
    - Plans sync via `planSync(buildPlannerDigest(context), diff, snapshot.docs, gitLog, provider, config.model)` with retry spinner.
    - Builds jobs: `plan.regenerate` (update=true) + `plan.add` (update=false).
    - If no jobs, advances snapshot via `writeSnapshot()` and exits.
    - Prints exclude hint.
    - Estimates cost via `estimateSync(context, refreshDocChars, plan.add.length, pricing)` using existing doc sizes for refresh estimates.
    - Prompts confirmation unless `--yes`.
    - Sets up abort controller + cancel key watcher.
    - Builds shared context via `buildSharedProjectContext()` (same as genesis).
    - Formats changes via `formatChanges(diff, gitLog)`.
    - Runs jobs in parallel via `StepRunner.runPooled(GEN_CONCURRENCY, ...)`:
      - For updates: reads existing doc, calls `refreshDoc(doc, sharedContext, existing, changeText, provider, config.model, signal)`.
      - For new: calls `chatWithRetry()` with `buildDocPrompt(doc, sharedContext)`.
      - Writes output.
    - Merges doc metas via `mergeDocMetas(snapshot.docs, plan.add)`.
    - Rebuilds index via `buildDocsIndex(context.name, mergedDocs)`.
    - Writes new snapshot via `writeSnapshot(targetDir, {provider, model}, context, mergedDocs)`.
    - Ensures project README.
- **Command: `exit`**
  - Description: "Exit Aether"
  - Usage: `/exit`
  - Handler: prints goodbye message, calls `process.exit(0)`.
- **Command: `clear`**
  - Description: "Clear the screen"
  - Usage: `/clear`
  - Handler: writes ANSI escape `\x1Bc` to stdout.
- **Internal helper: `formatPingError(config, ping)`** — Returns cause-specific error string for ping failures (timeout, HTTP 401/403, other).
- **Internal helper: `printExcludeHint()`** — Prints yellow hint about `/exclude <path>` to reduce scan size/cost.
- **Internal helper: `showGenesisHelp()`** — Prints detailed usage, flags, requirements, generated doc structure (always/conditional), planner behavior.
- **Internal helper: `showSyncHelp()`** — Prints usage, flags, how sync works (diff against snapshot, incremental update, never deletes).
- **Internal helper: `readFileSafe(path)`** — Returns file content or null on error.
- **Internal helper: `formatError(err)`** — Normalizes error messages: rate limit (429), auth (401/403), timeout/abort, network (ECONNREFUSED/ENOTFOUND), generic fallback (first line, truncated to 120 chars).
- **Dependencies used** (imported and invoked):
  - `chalk`, `registry`, `loadConfig`, `ensureProjectReadme`, `GEN_CONCURRENCY`, `createProvider`, `MeteredProvider`, `PingResult`, `chatWithRetry`, `formatRetryLine`, `scanContext`, `buildPlannerDigest`, `planDocs`, `buildSharedProjectContext`, `buildDocsIndex`, `buildDocPrompt`, `getGitLog`, `getModelPricing`, `estimateGenesis`, `estimateSync`, `formatEstimate`, `promptConfirm`, `watchCancelKey`, `loadSnapshot`, `diffFingerprint`, `hasChanges`, `planSync`, `refreshDoc`, `writeSnapshot`, `metaFromDefinition`, `mergeDocMetas`, `formatChanges`, `StepRunner`, `LineSpinner`, `mkdir`, `writeFile`, `readFile`, `existsSync`, `statSync`, `join`, `dirname`, `ACCENT`, `DIM`, `SUCCESS`.

## src/genesis/context.ts
- **Exported**: `ProjectContext` type (re-exported from `./types.js`), `collectDirectories(rootDir, excludes, maxDepth?)`, `scanContext(rootDir)`, `buildPrompt(context)`.
- **Constants**:
  - `CONFIG_FILES` — 13 known config filenames (e.g., `package.json`, `tsconfig.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `pom.xml`, `docker-compose.yml`, `Dockerfile`, `.env.example`, `README.md`).
  - `VISION_FILE_CANDIDATES` — `["CONTEXT.md", "CONTRIBUTING.md", "ARCHITECTURE.md", "VISION.md"]`.
  - `IGNORED_DIRS` — Set of 18 directory names to skip (e.g., `node_modules`, `.git`, `dist`, `build`, `.next`, `.nuxt`, `.cache`, `coverage`, `target`, `.aether`, `__pycache__`, `.venv`, `venv`, `vendor`, `.turbo`, `.vercel`).
  - `SOURCE_EXTENSIONS` — Set of 16 source file extensions (e.g., `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, `.go`, `.java`, `.kt`, `.rb`, `.ex`, `.exs`, `.php`, `.swift`, `.vue`, `.svelte`).
- **`collectDirectories`** — walks `rootDir` up to `maxDepth` (default 6), skips ignored/dot/excluded dirs, returns sorted relative directory paths.
- **`scanContext(rootDir)`** — returns `ProjectContext` with fields: `name`, `rootDir`, `configFiles[]`, `visionFiles[]`, `entryPoints[]`, `sourceFiles[]`, `directoryTree`, `omittedFiles[]`.
  - Steps: loads excludes; reads config files (extracts name/description from `package.json`); reads vision files (candidates + `docs/*.md`); builds directory tree; finds entry points (predefined candidate paths); finds all source files ranked by importance, adds until `MAX_TOTAL_CHARS` budget exceeded.
- **`buildPrompt(context)`** — constructs a markdown prompt with sections: Project Context header, Directory Structure, Product Vision (if any), Configuration Files, Entry Points, Key Source Files, Omitted Files, and a final reminder.
- **Helpers**:
  - `safeReadFile(filePath, label, omitted)` — reads file if size ≤ `MAX_FILE_SIZE`, else records in `omitted`.
  - `buildDirectoryTree(rootDir, maxDepth, excludes)` — ASCII tree with `├──`/`└──` connectors, respects ignores/excludes.
  - `findVisionFiles(rootDir, excludes)` — checks candidates + `docs/*.md`.
  - `findEntryPoints(rootDir, excludes)` — checks 20 predefined candidate paths.
  - `findSourceFiles(rootDir, omitted, excludes)` — walks entire tree (max `MAX_WALK_DEPTH`, max `MAX_FILES_WALKED`), collects files with `SOURCE_EXTENSIONS`, ranks by `getImportanceScore`.
  - `getImportanceScore(filePath, size)` — scores based on filename keywords (`index`, `main`, `app`, `server`, `router`, `routes`, `config`, `setup`, `types`, `schema`), depth (shallower = higher), size (500–5000 bytes sweet spot).
- **Dependencies**: `node:fs/promises` (`readFile`, `readdir`, `stat`), `node:fs` (`existsSync`), `node:path` (`join`, `relative`, `extname`, `basename`), `./types.js` (`ProjectContext`), `./constants.js` (`MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`, `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`), `./exclude.js` (`loadExcludes`, `isExcluded`).

## src/ui/prompt.ts
- **Exported**: `startChat()` — async function that starts the interactive chat loop.
- **Behavior**:
  - Loads config via `loadConfig(process.cwd())`; exits with error if missing.
  - Creates provider via `createProvider(config)` wrapped in `MeteredProvider`.
  - Pings provider; on failure prints error via `formatPingError()` and exits.
  - Prints welcome banner with provider/model info.
  - Enters REPL loop:
    - Prompts user via `promptInput()` with `>` prompt.
    - Handles `/exit`, `/clear`, `/help` as built-in commands.
    - For other input: builds context via `buildChatContext()` (loads `.aether/settings/context.json` if exists), sends to provider via `chatWithRetry()` with temperature 0.7.
    - Streams response via `chatStream()` with `LineSpinner` for thinking animation.
    - Prints response with `ACCENT` color.
    - Handles abort via `AbortController` + `watchCancelKey()`.
    - Catches errors, formats via `formatError()`, prints in `ERROR` color.
- **Dependencies**: `chalk`, `loadConfig`, `createProvider`, `MeteredProvider`, `chatWithRetry`, `chatStream`, `formatPingError`, `formatError`, `promptInput`, `watchCancelKey`, `LineSpinner`, `ACCENT`, `DIM`, `ERROR`, `SUCCESS`, `buildChatContext`, `loadSnapshot`, `formatError`.
