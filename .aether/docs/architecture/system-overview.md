# System Overview

## Goal

Aether is a CLI tool that transforms any codebase into an AI-native workspace by automatically analyzing repository structure, detecting technologies, and generating a comprehensive knowledge base (`.aether/`) that helps both developers and AI assistants understand the project. It uses a hybrid approach: static analysis first, optional LLM-powered deep analysis second.

## Architecture

**Type**: Node.js/TypeScript command-line application  
**Runtime**: Node.js ≥20 (ESM)  
**Distribution**: npm package with global binary (`aether`); optional Single Executable Application (SEA) build via `esbuild` + `postject`

### Layers

| Layer | Responsibility |
|-------|----------------|
| **CLI Entry** | Argument parsing, version flag, interactive/non-interactive mode detection, startup animation/banner |
| **Command Registry** | Slash-command routing (`/genesis`, `/sync`, `/config`, `/clean`, `/exclude`, `/help`, `/exit`, `/clear`) |
| **Genesis Pipeline** | Project scanning → context building → doc planning → distillation → parallel doc generation → snapshot |
| **Provider Abstraction** | Unified interface for OpenAI-compatible APIs (OpenAI, Anthropic, Gemini, OpenRouter) with retry/rate-limit handling |
| **Configuration** | Global (`~/.aether/config.json`) + per-project overrides; env var `AETHER_API_KEY` fallback |
| **UI System** | Animated startup, interactive readline chat with dropdown completion, step runners with spinners, cancellation/confirmation prompts |
| **File System Ops** | Repository walking, fingerprinting (SHA-256), git integration, cache management, output writing |
| **Cost Estimation** | Token/cost estimation for genesis/sync using live OpenRouter catalog or static fallback pricing |
| **Usage Metering** | Tracks prompt/completion tokens and call counts per provider session |
| **Pricing Catalog** | 24h-cached OpenRouter model pricing with static fallback for 10 common models |
| **Token Utilities** | Token estimation helpers for cost calculations |
| **Anthropic Provider** | Native Anthropic API support via OpenAI-compatible adapter with custom headers |
| **OpenRouter Provider** | OpenRouter-specific provider with reasoning tokens disabled |
| **Retry Logic** | Exponential backoff; rate-limit (429) detection with provider-suggested delay upgrade |
| **Interactive Prompt** | Readline loop with `/` command dropdown, keyword responses, rotating tips |
| **Step Runner** | `StepRunner` (sequential/pooled steps with spinners), `LineSpinner` (braille animation) |
| **Theme** | Chalk styles: `ACCENT` (#895bf4), `DIM`, `SUCCESS`, `WARN`, `ERROR` |
| **Config Loader** | Precedence: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Fingerprinting** | SHA-256 hashes of tracked files; git commit/branch/dirty; git log since last snapshot |
| **Utilities** | SHA-256 content hashing (CRLF-normalized); safe env int parsing |
| **Exclude Management** | Per-project path exclusions stored in `.aether/settings/exclude.json`; reduces scan size and cost |
| **Path Mention Completion** | `@` inline dropdown in chat for quick path selection and exclusion

## System Components

| Component | File(s) | Role |
|-----------|---------|------|
| **CLI Entry** | `src/cli/index.ts` | Bootstraps app, registers commands, starts animation or banner, launches interactive chat |
| **Command Registry** | `src/commands/registry.ts` | Maps slash commands to handlers; parses `/name args` input |
| **Genesis Command** | `src/commands/builtins.ts` | Orchestrates full analysis: scan → plan → distill → generate → index → snapshot |
| **Sync Command** | `src/commands/builtins.ts` | Incremental update: diff fingerprints → plan affected docs → regenerate/add → merge snapshot |
| **Config Command** | `src/commands/config.ts` | Manages provider/model/URL/key; quick-setup for 4 providers; show/set subcommands |
| **Clean Command** | `src/commands/clean.ts` | Removes global config, cache, or per-project data; lists projects with sizes |
| **Exclude Command** | `src/commands/exclude.ts` | Manages per-project path exclusions (add/remove/list) stored in `.aether/settings/exclude.json` |
| **Context Scanner** | `src/genesis/context.ts` | Walks repo (max 10k files, depth 12), collects config/vision/entry/source files, builds directory tree |
| **Exclude Manager** | `src/genesis/exclude.ts` | Loads, adds, removes, and checks path exclusions against scanned files |
| **Digest Builder** | `src/genesis/digest.ts` | Extracts signals (routes, domain logic, tests) and symbols for planner context |
| **Planner** | `src/genesis/planner.ts` | Asks LLM which docs to generate (6 core + conditional + up to 5 custom); falls back to core set |
| **Distiller** | `src/genesis/distill.ts` | Incrementally summarizes large file sets into budgeted notes with chunk caching (SHA-256) |
| **Doc Generator** | `src/genesis/docs.ts` | 13 predefined `DocDefinition`s across 5 sections; builds prompts from `src/prompts/`; writes markdown |
| **Sync Engine** | `src/genesis/sync.ts` | Diffs fingerprints, plans refreshes/additions, supports section-level patches, merges metadata |
| **Provider Factory** | `src/providers/factory.ts` | Creates `OpenAICompatibleProvider` for `openai`/`gemini`/`anthropic`/`openrouter` |
| **OpenAI-Compatible Provider** | `src/providers/openai-compatible.ts` | Implements `LLMProvider` interface: `chat`, `chatStream`, `ping` |
| **Anthropic Provider** | `src/providers/anthropic.ts` | Native Anthropic API support via OpenAI-compatible adapter with custom headers |
| **OpenRouter Provider** | `src/providers/openrouter.ts` | OpenRouter-specific provider with reasoning tokens disabled |
| **Retry Logic** | `src/providers/retry.ts` | Exponential backoff; rate-limit (429) detection with provider-suggested delay upgrade |
| **Metered Provider** | `src/providers/metered.ts` | Wraps any `LLMProvider` to track token usage and call counts per session |
| **Pricing Catalog** | `src/pricing/index.ts` | 24h-cached OpenRouter model pricing with static fallback for 10 common models |
| **Cost Estimation** | `src/genesis/estimate.ts` | Token/cost estimation for genesis/sync using live or static pricing |
| **Token Utilities** | `src/util/tokens.ts` | Token estimation helpers for cost calculations |
| **Interactive Prompt** | `src/ui/prompt.ts` | Readline loop with `/` command dropdown, keyword responses, rotating tips, `@` path mentions |
| **Step Runner** | `src/ui/steps.ts` | `StepRunner` (sequential/pooled steps with spinners), `LineSpinner` (braille animation) |
| **Theme** | `src/ui/theme.ts` | Chalk styles: `ACCENT` (#895bf4), `DIM`, `SUCCESS`, `WARN`, `ERROR` |
| **Config Loader** | `src/config/index.ts` | Precedence: project global → global default → in-repo override → `AETHER_API_KEY` env |
| **Fingerprinting** | `src/genesis/fingerprint.ts` | SHA-256 hashes of tracked files; git commit/branch/dirty; git log since last snapshot |
| **Utilities** | `src/util/hash.ts`, `src/util/env.ts` | SHA-256 content hashing (CRLF-normalized); safe env int parsing |
| **Cancellation Watcher** | `src/ui/cancel.ts` | Raw-mode stdin listener for ESC/q/Ctrl+C to abort long-running operations |
| **Confirmation Prompt** | `src/ui/confirm.ts` | Single-key y/n confirmation with raw-mode TTY support and fallback |
| **Cost Formatting** | `src/ui/cost.ts` | USD formatting and multi-line cost estimate display for genesis/sync confirmation |

## Communication Patterns

| Pattern | Usage |
|---------|-------|
| **Slash Commands** | Primary CLI interaction: `/genesis`, `/sync`, `/config`, `/clean`, `/exclude`, `/help`, `/exit`, `/clear` |
| **Interactive Chat** | Readline-based REPL with tab completion and dropdown suggestions for commands and `@` path mentions |
| **LLM Request/Response** | `LLMProvider.chat(request)` → `ChatResponse`; `chatStream` for streaming; all via OpenAI-compatible HTTP |
| **File System** | Synchronous/async reads for scanning; writes for `.aether/docs/`, `.aether/docs/README.md`, snapshots, cache |
| **Git Subprocess** | `execFileSync` for `git rev-parse`, `git status`, `git log` (fingerprinting, sync diffs) |
| **Inter-Process (SEA)** | Single executable bundles Node + script via `esbuild` + `postject` (optional distribution) |
| **Cost Estimation Flow** | `estimateGenesis`/`estimateSync` → `getModelPricing` (live OpenRouter catalog → static fallback) → `formatEstimate` for user confirmation |
| **Usage Metering** | `MeteredProvider` wraps inner provider; tracks `promptTokens`, `completionTokens`, `calls`; exposes `usage` totals |
| **Cancellation Signal** | `AbortController` + `watchCancelKey` (ESC/q/Ctrl+C) → injects `signal` into LLM requests via `MeteredProvider.setSignal` |
| **Confirmation Gate** | `promptConfirm` (raw-mode y/n) gates genesis/sync execution after cost estimate display |
| **Retry with Backoff** | `chatWithRetry` wraps `provider.chat`; on 429 upgrades to `RATE_LIMIT_OPTIONS` (6 retries, 15s base); respects abort signals |
| **Pricing Cache** | `loadCatalog` fetches OpenRouter models (8s timeout), caches to `~/.aether/cache/pricing.json` for 24h |
| **Token Estimation** | `estimateTokens` (chars/4) used when provider doesn't return usage; feeds into `MeteredProvider` and cost estimates |
| **Exclude Filtering** | `isExcluded()` checks scanned paths against `.aether/settings/exclude.json` before adding to context |
| **Path Mention Resolution** | `@partial` in chat triggers dropdown of project directories; `/exclude remove @` shows excluded paths instead

## Authentication & Authorization

- **LLM Provider API Keys**: Stored in global config (`~/.aether/config.json`) per provider/project; masked on display (first 4 + `••••` + last 4)
- **Environment Variable Fallback**: `AETHER_API_KEY` read by `loadConfig()` if no config entry exists
- **Supported Providers**: `openai` (requires `OPENAI_API_KEY`), `anthropic` (requires `ANTHROPIC_API_KEY`), `gemini`, `openrouter` (requires `OPENROUTER_API_KEY`)
- **No Project-Level Auth**: Aether itself has no user authentication; it operates on local repository files
- **Provider-Specific Headers**: Anthropic provider sends `anthropic-version: 2023-06-01` and `anthropic-dangerous-direct-browser-access: true` headers
- **OpenRouter Reasoning Control**: OpenRouter provider explicitly disables reasoning tokens via `reasoning: { enabled: false, exclude: true }`

## Deployment

- **Installation**: `npm install -g aether` (bin entry `./dist/cli/index.js`)
- **Build**: `npm run build` → TypeScript → `dist/` (declaration maps, source maps)
- **Development**: `npm run dev` → `tsx src/cli/index.ts`
- **SEA Build**: `npm run build:sea` → `scripts/build-sea.mjs` uses `esbuild` + `postject` to produce single binary
- **Requirements**: Node.js ≥20 (enforced in `package.json` `engines`)
- **Configuration Persistence**: Global directory `~/.aether/` (config.json, cache/ per project)
- **Project Output**: `.aether/` in repository root (docs/, README.md, snapshots) — intended for version control
