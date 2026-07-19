# System Overview

## Goal

Aether is a CLI tool that transforms any codebase into an AI-native workspace by scanning the repository, analyzing its structure and code, and generating a comprehensive knowledge base (documentation, architecture diagrams, AI context) stored in a `.aether/` directory. It uses static analysis first, then optionally enhances with LLM providers to produce deeper documentation.

## Architecture

### Backend (CLI Application)
- **Runtime**: Node.js ≥20 (ESM, TypeScript)
- **Entry point**: `src/cli/index.ts` → `main()` function
- **Build**: TypeScript compilation (`tsc`) to `dist/`; optional Single Executable Application via `scripts/build-sea.mjs` (esbuild + postject)
- **Dependencies**: `chalk` (terminal colors), `tsx` (dev runner), `esbuild`/`postject` (SEA build)

### LLM Provider Layer
- **Interface**: `LLMProvider` (`src/providers/types.ts`) — `chat`, `chatStream`, `ping`
- **Implementation**: `OpenAICompatibleProvider` (`src/providers/openai-compatible.ts`) — single class handling all providers via OpenAI-compatible API
- **Supported providers** (configured via `/config`): OpenAI, Anthropic, Gemini, OpenRouter
- **Retry logic**: Exponential backoff with rate-limit handling (`src/providers/retry.ts`)

### Configuration System
- **Global config**: `~/.aether/config.json` — stores default provider/model and per-project overrides
- **Project config**: `.aether/config.json` or `.aether/settings/config.json` (non-secret overrides only)
- **Secrets**: API keys stored only in global config or `AETHER_API_KEY` env var
- **Validation**: `validateConfig()` enforces provider ∈ {openai, anthropic, gemini, openrouter}, model, baseUrl, apiKey

### Knowledge Generation Pipeline (Genesis)
1. **Scan** (`src/genesis/context.ts`): Walks project (respecting `IGNORED_DIRS`, `MAX_WALK_DEPTH`, `MAX_FILES_WALKED`), collects config files, vision files, entry points, source files up to `MAX_TOTAL_CHARS`
2. **Digest** (`src/genesis/digest.ts`): Builds deterministic project map (directory tree, config content, detected signals, public symbols)
3. **Plan** (`src/genesis/planner.ts`): LLM selects which documents to generate from catalog + custom proposals
4. **Distill** (`src/genesis/distill.ts`): Incrementally extracts factual notes from source files (cached by content hash)
5. **Assemble** (`src/genesis/scope.ts`): Builds shared context (full prompt or distilled notes + orientation)
6. **Generate** (`src/commands/builtins.ts`): Parallel doc generation via `StepRunner.runPooled(GEN_CONCURRENCY)`
7. **Persist**: Writes docs to `.aether/docs/`, index to `.aether/docs/README.md`, snapshot to `.aether/settings/context.json`

### Sync Pipeline
- Loads previous snapshot, diffs fingerprints (`src/genesis/fingerprint.ts`), plans incremental updates (`src/genesis/sync.ts`), regenerates only affected docs via section patching or full rewrite.

### UI Layer
- **Animation**: `playStartupAnimation()` / `printBanner()` (`src/ui/animation.ts`)
- **Interactive REPL**: `startChat()` with readline, tab completion, live dropdown (`src/ui/prompt.ts`)
- **Progress**: `StepRunner` (multi-step with spinner) and `LineSpinner` (`src/ui/steps.ts`)
- **Theme**: Chalk-based color constants (`src/ui/theme.ts`)

## System Components

| Component | Location | Role |
|-----------|----------|------|
| CLI Entry | `src/cli/index.ts` | Argument parsing, version flag, command registration, startup animation, REPL launch |
| Command Registry | `src/commands/registry.ts` | Maps `/command` names to handlers; `execute(input)` parses and dispatches |
| Built-in Commands | `src/commands/builtins.ts` | `genesis`, `sync`, `exit`, `clear` handlers |
| Config Command | `src/commands/config.ts` | `/config` subcommands (show, set, provider quick-setup) |
| Clean Command | `src/commands/clean.ts` | `/clean` cache/config/project management |
| Config Module | `src/config/index.ts` | Load/save/validate config, provider defaults, project cache dirs |
| Scaffold | `src/config/scaffold.ts` | Ensures `.aether/README.md` exists |
| Genesis Context | `src/genesis/context.ts` | `scanContext()` — file discovery, importance ranking, budget enforcement |
| Genesis Digest | `src/genesis/digest.ts` | `buildPlannerDigest()` — deterministic project map for planner |
| Genesis Planner | `src/genesis/planner.ts` | `planDocs()` — LLM-driven doc selection from catalog + custom |
| Genesis Distill | `src/genesis/distill.ts` | `distillFilesIncremental()` — cached per-file factual extraction |
| Genesis Scope | `src/genesis/scope.ts` | `buildSharedProjectContext()` — shared context for all doc generation |
| Genesis Docs | `src/genesis/docs.ts` | Doc definitions (13 catalog docs), prompt builders, index generator |
| Genesis Sync | `src/genesis/sync.ts` | Snapshot load/diff, sync planning, section patching, snapshot write |
| Fingerprint | `src/genesis/fingerprint.ts` | `buildFingerprint()`, `getGitInfo()`, `getGitLog()` |
| Provider Factory | `src/providers/factory.ts` | `createProvider(config)` → `OpenAICompatibleProvider` |
| Provider Core | `src/providers/openai-compatible.ts` | Streaming chat/completions, idle timeout, SSE parsing |
| Provider Retry | `src/providers/retry.ts` | `chatWithRetry()` with rate-limit backoff, retry logger |
| UI Animation | `src/ui/animation.ts` | Starfield animation, banner, typewriter logo |
| UI Prompt | `src/ui/prompt.ts` | Interactive REPL, command autocomplete dropdown |
| UI Steps | `src/ui/steps.ts` | Multi-step progress runner, pooled execution, line spinner |
| UI Theme | `src/ui/theme.ts` | Color constants (ACCENT, DIM, SUCCESS, WARN, ERROR) |
| Prompts Base | `src/prompts/base.ts` | `BASE_PROMPT`, `PROMPT_SUFFIX`, `HUMAN_BASE_PROMPT`, `HUMAN_PROMPT_SUFFIX` |
| Prompt Catalog | `src/prompts/docs/*.ts` | 13 document-specific prompt templates |
| Pipeline Prompts | `src/prompts/pipeline/*.ts` | `PLANNER_PROMPT`, `SYNC_PLANNER_PROMPT`, patch/update instructions |
| Util Env | `src/util/env.ts` | `envInt()` — safe integer env var parsing |

## Communication Patterns

- **CLI → User**: Stdout/stderr with ANSI styling (chalk), readline for interactive input
- **CLI → LLM Providers**: HTTPS POST to `baseUrl/chat/completions` (OpenAI-compatible), streaming via SSE
- **CLI → File System**: Node `fs/promises` for reading project files, writing `.aether/` output
- **CLI → Git**: `child_process.execFileSync` for `git rev-parse`, `git log`, `git status`
- **Internal**: Direct TypeScript module imports; command registry uses string-based dispatch (`/command`)

## Authentication & Authorization

Not detected from provided context. The CLI operates with local file system permissions and user-provided API keys (stored in `~/.aether/config.json` or `AETHER_API_KEY` env). No multi-user auth, tokens, or RBAC system exists in the codebase.

## Deployment

- **Distribution**: npm package (`"bin": { "aether": "./dist/cli/index.js" }`)
- **Install**: `npm install -g aether` or `npx aether`
- **Build**: `npm run build` (TypeScript → `dist/`); `npm run build:sea` produces single executable via `scripts/build-sea.mjs` (esbuild bundle + postject)
- **Runtime requirement**: Node.js ≥20 (or SEA binary)
- **Configuration**: User runs `/config <provider>` once to store API key globally; per-project settings optional
- **No container/Docker/Kubernetes configs detected** in the provided context.