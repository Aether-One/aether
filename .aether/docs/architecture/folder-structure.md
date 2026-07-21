# Folder Structure

## Overview

Aether is a TypeScript-based CLI tool built with Node.js (ESM) that transforms codebases into AI-native workspaces. The project follows a modular architecture with clear separation between CLI entry points, command implementations, core domain logic (genesis), AI provider abstractions, prompt templates, UI components, and utilities. The codebase uses strict TypeScript with ES modules and targets Node.js 20+.

## Root Structure

 
aether/
├── scripts/                 # Build and utility scripts
│   ├── build-sea.mjs        # Single Executable Application build script (uses esbuild + postject)
│   ├── install.ps1          # Windows PowerShell installer
│   └── install.sh           # macOS/Linux shell installer
├── src/                     # TypeScript source code (rootDir for tsc)
├── dist/                    # Compiled output (outDir, gitignored)
├── node_modules/            # Dependencies (gitignored)
├── .aether/                 # Generated knowledge base output (gitignored, created at runtime)
├── CONTRIBUTING.md          # Contribution guidelines
├── LICENSE                  # MIT license
├── package.json             # Package manifest (name: "aether", version: "0.1.8")
├── package-lock.json        # Lockfile
├── README.md                # Project documentation
├── sea-config.json          # SEA (Single Executable Application) config
└── tsconfig.json            # TypeScript configuration (ES2022, NodeNext, strict)

## Source Structure

 
src/
├── cli/
│   └── index.ts             # CLI entry point (main(), version flag, command registration, startup animation)
├── commands/
│   ├── builtins.ts          # Registers built-in commands (genesis, sync, doctor, explain, export)
│   ├── clean.ts             # /clean command implementation
│   ├── config.ts            # /config command (provider/model/key/url configuration)
│   ├── exclude.ts           # /exclude command (skip large paths during genesis/sync)
│   ├── help.ts              # /help command (lists registered commands)
│   └── registry.ts          # CommandRegistry class + global registry instance
├── config/
│   ├── index.ts             # Config loading/saving/validation (global + per-project)
│   ├── readme.ts            # AETHER_README constant for .aether/README.md
│   ├── scaffold.ts          # ensureProjectReadme() writes .aether/README.md
│   └── types.ts             # AetherConfig interface (provider, model, baseUrl, apiKey, timeout)
├── genesis/
│   ├── constants.ts         # Env-overridable constants (MAX_FILE_SIZE, MAX_TOTAL_CHARS, etc.)
│   ├── context.ts           # ProjectContext, FileContent, buildPrompt()
│   ├── digest.ts            # buildPlannerDigest(), detectSignals(), extractSymbols()
│   ├── distill.ts           # distillFilesIncremental(), distill cache logic
│   ├── docs.ts              # DocDefinition[], DOC_DEFINITIONS (13 docs), buildDocPrompt(), buildDocsIndex()
│   ├── estimate.ts          # estimateGenesis(), estimateSync(), CostEstimate interface
│   ├── exclude.ts           # Exclude list management (loadExcludes, addExclude, removeExclude, isExcluded)
│   ├── fingerprint.ts       # buildFingerprint(), getGitInfo(), getGitLog()
│   ├── planner.ts           # planDocs(), parsePlan(), CORE_IDS, MAX_CUSTOM_DOCS
│   ├── scope.ts             # buildSharedProjectContext(), distill cache load/save
│   ├── sync.ts              # Sync logic (planned, not fully implemented)
│   └── types.ts             # Core types: ProjectContext, FileFingerprint, GitInfo, DocDefinition, Snapshot, SyncPlan
├── pricing/
│   └── index.ts             # Model pricing catalog (OpenRouter + static fallback), getModelPricing()
├── prompts/
│   ├── base.ts              # BASE_PROMPT, PROMPT_SUFFIX, HUMAN_BASE_PROMPT, HUMAN_PROMPT_SUFFIX
│   ├── index.ts             # Barrel export for all prompts
│   ├── docs/                # Per-document prompt templates (13 files)
│   │   ├── ai-context.ts
│   │   ├── api.ts
│   │   ├── business.ts
│   │   ├── coding-standards.ts
│   │   ├── contributing.ts
│   │   ├── custom-doc.ts
│   │   ├── diagrams.ts
│   │   ├── folder-structure.ts
│   │   ├── getting-started.ts
│   │   ├── glossary.ts
│   │   ├── modules.ts
│   │   ├── onboarding.ts
│   │   ├── system-overview.ts
│   │   └── tech-stack.ts
│   └── pipeline/
│       ├── planner.ts       # PLANNER_PROMPT
│       └── sync.ts          # SYNC_PLANNER_PROMPT, DOC_UPDATE_INSTRUCTIONS, SECTION_PATCH_INSTRUCTIONS
├── providers/
│   ├── anthropic.ts         # AnthropicProvider (extends OpenAICompatibleProvider)
│   ├── factory.ts           # createProvider(config) → LLMProvider
│   ├── index.ts             # Barrel export (types, OpenAICompatibleProvider, createProvider)
│   ├── metered.ts           # MeteredProvider (usage tracking), UsageTotals
│   ├── openai-compatible.ts # OpenAICompatibleProvider (OpenAI, Gemini, Anthropic, OpenRouter base)
│   ├── openrouter.ts        # OpenRouterProvider (extends OpenAICompatibleProvider, disables reasoning)
│   ├── retry.ts             # chatWithRetry() with exponential backoff, rate-limit handling
│   └── types.ts             # LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk, PingResult
├── ui/
│   ├── animation.ts         # playStartupAnimation(), printBanner()
│   ├── cancel.ts            # Cancellation token / AbortSignal helpers
│   ├── confirm.ts           # Confirmation prompts
│   ├── cost.ts              # Cost display formatting
│   ├── prompt.ts            # startChat(), readline interface with slash-command dropdown
│   ├── steps.ts             # StepRunner, LineSpinner (concurrent step rendering)
│   └── theme.ts             # Chalk theme constants (ACCENT, DIM, SUCCESS, WARN, ERROR)
└── util/
    ├── env.ts               # envInt() helper for env-overridable integers
    ├── hash.ts              # hashContent() → SHA-256 hex (normalizes CRLF)
    └── tokens.ts            # Token estimation utilities

## Naming Conventions

| Pattern | Example | Source |
|---------|---------|--------|
| **Directories** | kebab-case | `src/commands/`, `src/prompts/docs/`, `src/ui/` |
| **TypeScript files** | kebab-case + `.ts` | `src/cli/index.ts`, `src/genesis/constants.ts`, `src/providers/openrouter.ts` |
| **Barrel exports** | `index.ts` | `src/prompts/index.ts`, `src/providers/index.ts` |
| **Type definitions** | `types.ts` | `src/genesis/types.ts`, `src/config/types.ts`, `src/providers/types.ts` |
| **Constants** | `constants.ts` | `src/genesis/constants.ts` |
| **Interfaces** | PascalCase | `AetherConfig`, `ProjectContext`, `LLMProvider`, `Command`, `CostEstimate` |
| **Functions** | camelCase | `buildPlannerDigest()`, `createProvider()`, `hashContent()`, `getModelPricing()` |
| **Constants (values)** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `ACCENT_HEX`, `MAX_CUSTOM_DOCS` |
| **Prompt constants** | UPPER_SNAKE_CASE + `_PROMPT` | `GETTING_STARTED_PROMPT`, `PLANNER_PROMPT`, `SYNC_PLANNER_PROMPT` |
| **Config keys** | camelCase | `provider`, `model`, `baseUrl`, `apiKey`, `timeout` |
| **Pricing constants** | UPPER_SNAKE_CASE | `OPENROUTER_MODELS_URL`, `CACHE_TTL_MS`, `STATIC_PER_MTOK` |
| **UI components** | PascalCase + suffix | `StepRunner`, `LineSpinner`, `MeteredProvider` |
| **Utility functions** | camelCase + verb | `envInt()`, `hashContent()`, `tokensFromChars()` |
| **Type definitions** | PascalCase + suffix | `CostEstimate`, `UsageTotals`, `DistillCache`, `SyncPlan` |

## Key Files

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | **CLI entry point** — `main()` handles version flag, command registration order, interactive detection, startup animation, chat loop |
| `package.json` | **Package manifest** — name, version, bin entry (`aether` → `dist/cli/index.js`), scripts (`build`, `dev`, `build:sea`), dependencies (`chalk`, `@clack/core`), devDependencies (`typescript`, `tsx`, `esbuild`, `postject`) |
| `tsconfig.json` | **TypeScript config** — ES2022, NodeNext modules, strict mode, declaration maps, source maps, outDir `./dist` |
| `src/commands/registry.ts` | **CommandRegistry** — registers `/genesis`, `/sync`, `/config`, `/clean`, `/help`, `/exclude`; parses `/command args` input |
| `src/config/index.ts` | **Config system** — `loadConfig()` (precedence: project global → global default → in-repo → env), `saveConfig()`, `validateConfig()`, `getGlobalDir()` (`~/.aether`) |
| `src/genesis/types.ts` | **Core domain types** — `ProjectContext`, `FileFingerprint`, `DocDefinition`, `Snapshot`, `SyncPlan`, `DocSection` enum |
| `src/genesis/docs.ts` | **Document catalog** — 13 `DocDefinition` constants in `DOC_DEFINITIONS` (Guides: 3, Architecture: 5, Reference: 4, AI Context: 1) |
| `src/genesis/planner.ts` | **AI planning** — `planDocs()` calls LLM to select docs, falls back to `CORE_IDS` (6 core docs), limits custom docs to 5 |
| `src/providers/factory.ts` | **Provider factory** — `createProvider()` switches on `config.provider` (openai, gemini, anthropic, openrouter) → `OpenAICompatibleProvider` |
| `src/providers/retry.ts` | **Retry logic** — `chatWithRetry()` with exponential backoff, rate-limit detection (429), provider-suggested delays |
| `src/ui/prompt.ts` | **Interactive REPL** — `startChat()` with readline, slash-command dropdown (`/genesis`, `/config`, `/exclude`, etc.), keyword responses |
| `src/ui/steps.ts` | **Step rendering** — `StepRunner` (sequential/pooled steps with spinners), `LineSpinner` (braille animation frames) |
| `src/genesis/scope.ts` | **Shared context builder** — `buildSharedProjectContext()` builds/distills project context once for all docs, uses distill cache |
| `src/genesis/estimate.ts` | **Cost estimation** — `estimateGenesis()`, `estimateSync()`, `CostEstimate` interface with token/cost breakdown |
| `src/pricing/index.ts` | **Model pricing** — `getModelPricing()` fetches from OpenRouter catalog (24h cache) with static fallback for 10 models |
| `src/providers/metered.ts` | **Usage tracking** — `MeteredProvider` wraps providers, tracks `UsageTotals` (prompt/completion tokens, calls, estimated cost) |
| `scripts/build-sea.mjs` | **SEA build** — esbuild bundles to `dist/sea-prep.js`, postject injects into Node binary → `dist/aether` (single executable) |
| `src/commands/exclude.ts` | **Exclude command** — `/exclude <path>` to skip large paths during genesis/sync, stores in `.aether/settings/exclude.json` |
| `src/genesis/exclude.ts` | **Exclude logic** — `loadExcludes()`, `addExclude()`, `removeExclude()`, `isExcluded()` for path filtering during scan |
| `src/genesis/context.ts` | **Project scanning** — `scanContext()` builds `ProjectContext` with config/vision/entry/source files, respects excludes |
| `src/commands/builtins.ts` | **Built-in commands** — registers `genesis`, `sync`, `exit`, `clear` with handlers, cost estimation, confirmation, parallel generation |
| `src/ui/prompt.ts` | **Interactive REPL** — `startChat()` with readline, slash-command dropdown (`/genesis`, `/config`, `/exclude`, etc.), keyword responses |
| `src/genesis/scope.ts` | **Shared context builder** — `buildSharedProjectContext()` builds/distills project context once for all docs, uses distill cache |
| `src/genesis/estimate.ts` | **Cost estimation** — `estimateGenesis()`, `estimateSync()`, `CostEstimate` interface with token/cost breakdown |
| `src/pricing/index.ts` | **Model pricing** — `getModelPricing()` fetches from OpenRouter catalog (24h cache) with static fallback for 10 models |
| `src/providers/metered.ts` | **Usage tracking** — `MeteredProvider` wraps providers, tracks `UsageTotals` (prompt/completion tokens, calls, estimated cost) |
| `scripts/build-sea.mjs` | **SEA build** — esbuild bundles to `dist/sea-prep.js`, postject injects into Node binary → `dist/aether` (single executable) |
