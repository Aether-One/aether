# Aether CLI — API Documentation

## Overview

Aether is a CLI tool that transforms codebases into AI-native workspaces. The primary interface is an interactive chat REPL with slash-commands.

---

## CLI Entry Point

### `aether` (or `npx aether`)

**Entry point:** `src/cli/index.ts` → `main()`

**Usage:**
```bash
aether [options]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--version`, `-v` | Print version (`aether v{version}`) and exit |
| `--no-animation` | Disable startup animation |

**Behavior:**
1. Reads version from injected `__AETHER_VERSION__` (fallback: `0.0.0-dev`)
2. Registers commands in order: `help`, `builtins` (genesis, sync, doctor, explain, export), `config`, `clean`
3. Detects TTY: `process.stdin.isTTY ?? false`
4. If TTY and not `--no-animation`: plays startup animation (`playStartupAnimation()`)
5. Otherwise: prints static banner (`printBanner()`)
6. Starts interactive chat REPL (`startChat()`)

**Error handling:** Uncaught errors → stderr + `process.exit(1)`

---

## Slash Commands (Interactive REPL)

All commands are prefixed with `/` and handled by `CommandRegistry` (`src/commands/registry.ts`).

### `/help` — Show help

**Registered by:** `registerHelpCommand()` in `src/commands/help.ts`

**Usage:**
```
/help
```

**Behavior:** Lists all registered commands with descriptions.

---

### `/genesis` — Analyze and prepare project (Genesis phase)

**Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`

**Usage:**
```
/genesis
```

**Behavior (from vision/docs):**
- Scans repository (static analysis)
- Detects frameworks, technologies, structure
- Identifies entry points and key modules
- Generates documentation to `.aether/docs/`
- Creates knowledge base (`.aether/context.json`, `.aether/settings/context.json`)

**Note:** Implementation details in `src/genesis/` (context, digest, distill, planner, sync, etc.) — the command handler is registered in `builtins.ts` but handler implementation not shown in provided context.

---

### `/sync` — Keep knowledge up to date (Sync phase)

**Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`

**Usage:**
```
/sync
```

**Behavior (from vision/docs & `src/genesis/sync.ts`):**
- Loads previous snapshot (`.aether/settings/context.json`)
- Computes file diff via fingerprint comparison
- Uses LLM to plan which docs to regenerate/add
- Applies section-level patches to existing docs
- Writes updated snapshot

**Note:** Handler implementation in `src/genesis/sync.ts` (`planSync`, `refreshDoc`, `writeSnapshot`, `applySectionPatch`).

---

### `/doctor` — Validate project health (Doctor phase)

**Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`

**Usage:**
```
/doctor
```

**Status:** Roadmap item (README: `[ ] doctor` — not yet implemented)

---

### `/explain` — Query knowledge (Explain phase)

**Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`

**Usage:**
```
/explain <question>
```

**Status:** Roadmap item (README: `[ ] explain` — not yet implemented)

---

### `/export` — Export knowledge (Export phase)

**Registered by:** `registerBuiltinCommands()` in `src/commands/builtins.ts`

**Usage:**
```
/export <format>
```

**Status:** Roadmap item (README: `[ ] export` — not yet implemented)

---

### `/config` — Configure AI provider

**Registered by:** `registerConfigCommand()` in `src/commands/config.ts`

**Usage:**
```
/config                    # Show current config
/config show               # Show current config
/config --help             # Show help
/config help               # Show help
/config <provider>         # Quick setup: openai | anthropic | gemini | openrouter
/config set <key> <value>  # Set specific key
```

**Config keys (for `set`):**
| Key | Aliases | Description |
|-----|---------|-------------|
| `provider` | — | `openai` \| `anthropic` \| `gemini` \| `openrouter` |
| `model` | — | Model identifier |
| `url` \| `baseUrl` | — | API base URL |
| `key` \| `apiKey` | — | API key (stored in global config only) |

**Config file:** `~/.aether/config.json` (global, per-project entries keyed by project ID)

**Provider defaults (from `src/config/index.ts`):**
| Provider | Model | Base URL |
|----------|-------|----------|
| `openai` | `gpt-4o` | `https://api.openai.com/v1` |
| `anthropic` | `claude-sonnet-4-20250514` | `https://api.anthropic.com/v1` |
| `gemini` | `gemini-2.0-flash` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `openrouter` | `openrouter/auto` | `https://openrouter.ai/api/v1` |

**Validation (`validateConfig`):**
- `provider` required, must be one of four
- `model` required
- `baseUrl` required
- `apiKey` required (unless `AETHER_API_KEY` env var set)

**API key masking:** Shows first 4 + last 4 chars (`sk-ab••••cd`)

**Auto-detection:** Setting `baseUrl` auto-detects `provider` via `detectProviderFromBaseUrl()`

---

### `/clean` — Manage global data

**Registered by:** `registerCleanCommand()` in `src/commands/clean.ts`

**Usage:**
```
/clean
```

**Behavior (from `src/config/readme.ts`):**
- Manages global caches, configs, projects in `~/.aether/`
- Subcommands not shown in provided context

---

## Interactive Chat REPL

**Entry:** `startChat()` in `src/ui/prompt.ts`

**Behavior:**
- Requires TTY (`process.stdin.isTTY`)
- Tab completion for `/` commands (via `readline` completer)
- Real-time dropdown autocomplete on keypress (shows up to 6 matches)
- Non-command input → keyword-based responses:
  - `help|ajuda|comando` → lists `/genesis`, `/help`
  - `hello|oi|hey|ola` → greeting
  - `genesis|analisa|documenta` → suggests `/genesis`
  - Default → "not connected to AI model yet"
- Tips shown every 4 messages (rotating `TIPS` array)
- Graceful exit on Ctrl+C / Ctrl+D

**No LLM connection in current implementation** — `respond()` only does keyword matching.

---

## Configuration API (Programmatic)

**Module:** `src/config/index.ts`

### Types

```typescript
interface AetherConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number; // ms
}
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getDefaultConfig` | `(provider: string) => Partial<AetherConfig>` | Returns provider defaults |
| `detectProviderFromBaseUrl` | `(baseUrl: string) => AetherConfig["provider"] \| null` | Infers provider from URL |
| `getGlobalDir` | `() => string` | Returns `~/.aether` |
| `getGlobalConfigPath` | `() => string` | Returns `~/.aether/config.json` |
| `getProjectCacheDir` | `(rootDir: string) => string` | Returns `~/.aether/cache/{projectId}/` |
| `loadConfig` | `(rootDir: string) => Promise<AetherConfig \| null>` | Loads config with precedence |
| `saveConfig` | `(rootDir: string, config: AetherConfig) => Promise<void>` | Saves to global config |
| `validateConfig` | `(config: AetherConfig) => string[]` | Returns validation errors |

**Config precedence (highest first):**
1. Project global entry (`projects[projectId]` in global config)
2. Shared global default (`default` in global config)
3. In-repo override (`.aether/config.json` or `.aether/settings/config.json`) — non-secret only
4. `AETHER_API_KEY` environment variable

**Secrets:** `apiKey` stored only in global config or `AETHER_API_KEY` env — never in repo.

---

## Provider API (LLM Integration)

**Module:** `src/providers/`

### Types (`src/providers/types.ts`)

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface StreamChunk {
  content: string;
  done: boolean;
}

interface LLMProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;
  ping(): Promise<boolean>;
}
```

### Factory (`src/providers/factory.ts`)

```typescript
function createProvider(config: AetherConfig): LLMProvider
```

Returns `OpenAICompatibleProvider` for all four providers (OpenAI, Anthropic, Gemini, OpenRouter). **Note:** Anthropic case has TODO — different API format.

### OpenAI-Compatible Provider (`src/providers/openai-compatible.ts`)

```typescript
class OpenAICompatibleProvider implements LLMProvider {
  constructor(baseUrl: string, apiKey?: string, idleTimeout?: number, name?: string);
  async chat(request: ChatRequest): Promise<ChatResponse>;
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;
  async ping(): Promise<boolean>;
}
```

- POST `/chat/completions` with `stream: true` for streaming
- SSE parsing with idle timeout (default 120s, resets on any byte)
- Handles `[DONE]` sentinel, usage tokens

### Retry Logic (`src/providers/retry.ts`)

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  onRetry?: (attempt: number, maxRetries: number, error: string) => void;
}

async function chatWithRetry(
  provider: LLMProvider,
  request: ChatRequest,
  options?: Partial<RetryOptions>
): Promise<ChatResponse>
```

- Default: 3 retries, 2s base delay (exponential backoff)
- Rate limit (429 / "rate limit"): 6 retries, 15s base delay
- Extracts `retry-after` / `retry_in` from error message
- `createRetryLogger()` → writes formatted retry lines to stdout

---

## Genesis Pipeline (Internal API)

**Module:** `src/genesis/`

### Types (`src/genesis/types.ts`)

```typescript
interface ProjectContext {
  name: string;
  description?: string;
  rootDir: string;
  configFiles: FileContent[];
  visionFiles: FileContent[];
  entryPoints: FileContent[];
  sourceFiles: FileContent[];
  directoryTree: string;
  omittedFiles: string[];
}

interface FileContent { path: string; content: string; }
interface FileFingerprint { hash: string; size: number; }
interface GitInfo { commit: string; branch: string; dirty: boolean; }
interface DistillCache { model: string; files: Record<string, { hash: string; notes: string }>; }
interface DocDefinition { id: string; outputPath: string; label: string; title: string; section: DocSection; summary: string; prompt: string; human?: boolean; }
interface Snapshot { generatedAt: string; provider: string; model: string; git?: GitInfo; files: Record<string, FileFingerprint>; docs: DocMeta[]; }
interface SyncPlan { regenerate: DocDefinition[]; add: DocDefinition[]; }
interface SectionPatch { heading: string; content: string; after?: string; }
```

### Key Functions

| Function | Module | Description |
|----------|--------|-------------|
| `buildPlannerDigest` | `digest.ts` | Builds deterministic project map for planner |
| `distillFilesIncremental` | `distill.ts` | Incrementally extracts factual notes from source files via LLM |
| `buildFingerprint` | `fingerprint.ts` | Computes SHA256+size for all context files |
| `getGitInfo` | `fingerprint.ts` | Returns `{commit, branch, dirty}` or `null` |
| `buildSharedProjectContext` | `scope.ts` | Builds shared context (full or distilled) for doc generation |
| `planDocs` | `planner.ts` | LLM plans which docs to generate (catalog + custom) |
| `planSync` | `sync.ts` | LLM plans sync actions from diff + git log |
| `applySectionPatch` | `sync.ts` | Applies section-level patches to existing docs |
| `writeSnapshot` | `sync.ts` | Writes `.aether/settings/context.json` |

### Constants (`src/genesis/constants.ts`)

| Constant | Default | Env Override |
|----------|---------|--------------|
| `MAX_FILE_SIZE` | 128,000 | `AETHER_MAX_FILE_SIZE` |
| `MAX_TOTAL_CHARS` | 2,000,000 | `AETHER_MAX_TOTAL_CHARS` |
| `MAX_FILES_WALKED` | 10,000 | `AETHER_MAX_FILES_WALKED` |
| `MAX_WALK_DEPTH` | 12 | `AETHER_MAX_WALK_DEPTH` |
| `DOC_CONTEXT_BUDGET` | 48,000 | `AETHER_DOC_CONTEXT_CHARS` |
| `GEN_CONCURRENCY` | 4 | `AETHER_GEN_CONCURRENCY` |
| `DISTILL_CONCURRENCY` | 4 | `AETHER_DISTILL_CONCURRENCY` |

---

## Prompt Templates (Internal)

**Module:** `src/prompts/`

### Base (`src/prompts/base.ts`)
- `BASE_PROMPT` — Anti-hallucination rules (sandwich: prepended + appended via `PROMPT_SUFFIX`)
- `PROMPT_SUFFIX` — Reinforces: only document what exists in context
- `HUMAN_BASE_PROMPT` / `HUMAN_PROMPT_SUFFIX` — Human-facing guide contracts (explain WHY, lead with goals)

### Document Prompts (`src/prompts/docs/`)
| Prompt | Output File | Section |
|--------|-------------|---------|
| `GETTING_STARTED_PROMPT` | `docs/getting-started.md` | Guides |
| `ONBOARDING_PROMPT` | `docs/onboarding.md` | Guides |
| `CONTRIBUTING_PROMPT` | `docs/contributing.md` | Guides |
| `SYSTEM_OVERVIEW_PROMPT` | `docs/system-overview.md` | Architecture |
| `FOLDER_STRUCTURE_PROMPT` | `docs/folder-structure.md` | Architecture |
| `TECH_STACK_PROMPT` | `docs/tech-stack.md` | Architecture |
| `CODING_STANDARDS_PROMPT` | `docs/architecture/coding-standards.md` | Reference |
| `MODULES_PROMPT` | `docs/modules.md` | Architecture |
| `API_PROMPT` | `docs/api/endpoints.md` | Reference |
| `BUSINESS_RULES_PROMPT` | `docs/business/rules.md` | Reference |
| `DIAGRAMS_PROMPT` | `docs/diagrams.md` | Architecture |
| `AI_CONTEXT_PROMPT` | `docs/AI_CONTEXT.md` | AI Context |
| `GLOSSARY_PROMPT` | `docs/glossary.md` | Reference |
| `buildCustomDocPrompt(title, focus)` | `docs/{path}` | Project-specific |

### Pipeline Prompts (`src/prompts/pipeline/`)
- `PLANNER_PROMPT` — Plans which docs to generate
- `SYNC_PLANNER_PROMPT` — Plans sync actions
- `DOC_UPDATE_INSTRUCTIONS` / `SECTION_PATCH_INSTRUCTIONS` — Sync patching

---

## UI Components (Internal)

**Module:** `src/ui/`

| Module | Exports |
|--------|---------|
| `animation.ts` | `playStartupAnimation()`, `printBanner()` |
| `prompt.ts` | `startChat()` — interactive REPL |
| `steps.ts` | `StepRunner` (multi-step progress with spinner), `LineSpinner` |
| `theme.ts` | `ACCENT`, `ACCENT_BOLD`, `DIM`, `SUCCESS`, `WARN`, `ERROR` (chalk styles) |

---

## Project Structure (Generated)

```
.aether/
├── README.md              # Generated by ensureProjectReadme()
├── docs/                  # Generated documentation
│   ├── getting-started.md
│   ├── onboarding.md
│   ├── contributing.md
│   ├── system-overview.md
│   ├── folder-structure.md
│   ├── tech-stack.md
│   ├── architecture/
│   │   └── coding-standards.md
│   ├── modules.md
│   ├── api/
│   │   └── endpoints.md
│   ├── business/
│   │   └── rules.md
│   ├── diagrams.md
│   ├── AI_CONTEXT.md
│   └── glossary.md
├── settings/
│   └── context.json       # Snapshot (fingerprints, git, docs meta)
└── cache/
    └── {projectId}/
        └── distill-cache.json
```

---

## Build & Development

**Scripts (`package.json`):**
| Script | Command |
|--------|---------|
| `build` | `tsc` |
| `build:sea` | `node scripts/build-sea.mjs` |
| `dev` | `tsx src/cli/index.ts` |
| `start` | `node dist/cli/index.js` |
| `typecheck` | `tsc --noEmit` |

**Dependencies:**
- Runtime: `chalk@^5.4.1`
- Dev: `typescript@^5.8.3`, `tsx@^4.19.4`, `esbuild@^0.28.1`, `postject@^1.0.0-alpha.6`, `@types/node@^22.15.21`

**Requirements:** Node.js ≥ 20.0.0

---

## Notes

- **No REST/GraphQL API** — this is a CLI-only tool
- **No MCP server, VS Code extension, or web UI** — roadmap items only (README)
- **LLM integration** uses OpenAI-compatible `/chat/completions` endpoint for all providers (Anthropic noted as TODO for native format)
- **Interactive REPL** currently has no LLM connection — only keyword responses
- **Genesis/Sync pipeline** implemented in `src/genesis/` but command handlers in `builtins.ts` not fully visible in provided context