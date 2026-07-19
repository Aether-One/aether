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

**Source**: `package.json`, `src/cli/index.ts` → `VERSION`.