# Folder Structure

## Overview

Aether is a TypeScript-based CLI tool built with Node.js (ESM) that transforms codebases into AI-native workspaces. The project follows a modular architecture with clear separation between CLI entry points, command implementations, core domain logic (genesis), AI provider abstractions, prompt templates, UI components, and utilities. The codebase uses strict TypeScript with ES modules and targets Node.js 20+.

## Root Structure

```
aether/
├── scripts/                 # Build and utility scripts
│   └── build-sea.mjs        # Single Executable Application build script (uses esbuild + postject)
├── src/                     # TypeScript source code (rootDir for tsc)
├── dist/                    # Compiled output (outDir, gitignored)
├── node_modules/            # Dependencies (gitignored)
├── .aether/                 # Generated knowledge base output (gitignored, created at runtime)
├── CONTRIBUTING.md          # Contribution guidelines
├── LICENSE                  # MIT license
├── package.json             # Package manifest (name: "aether", version: "0.1.4")
├── package-lock.json        # Lockfile
├── README.md                # Project documentation
├── sea-config.json          # SEA (Single Executable Application) config
└── tsconfig.json            # TypeScript configuration (ES2022, NodeNext, strict)
```

## Source Structure

```
src/
├── cli/
│   └── index.ts             # CLI entry point (main(), version flag, command registration, startup animation)
├── commands/
│   ├── builtins.ts          # Registers built-in commands (genesis, sync, doctor, explain, export)
│   ├── clean.ts             # /clean command implementation
│   ├── config.ts            # /config command (provider/model/key/url configuration)
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
│   ├── fingerprint.ts       # buildFingerprint(), getGitInfo(), getGitLog()
│   ├── planner.ts           # planDocs(), parsePlan(), CORE_IDS, MAX_CUSTOM_DOCS
│   ├── scope.ts             # buildSharedProjectContext(), distill cache load/save
│   ├── sync.ts              # Sync logic (planned, not fully implemented)
│   └── types.ts             # Core types: ProjectContext, FileFingerprint, GitInfo, DocDefinition, Snapshot, SyncPlan
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
│   ├── factory.ts           # createProvider(config) → LLMProvider
│   ├── index.ts             # Barrel export (types, OpenAICompatibleProvider, createProvider)
│   ├── openai-compatible.ts # OpenAICompatibleProvider (OpenAI, Gemini, Anthropic, OpenRouter)
│   ├── retry.ts             # chatWithRetry(), retry logic with rate-limit handling
│   └── types.ts             # LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk
├── ui/
│   ├── animation.ts         # playStartupAnimation(), printBanner()
│   ├── prompt.ts            # startChat(), readline interface with slash-command dropdown
│   ├── steps.ts             # StepRunner, LineSpinner (concurrent step rendering)
│   └── theme.ts             # Chalk theme constants (ACCENT, DIM, SUCCESS, WARN, ERROR)
└── util/
    ├── env.ts               # envInt() helper for env-overridable integers
    └── hash.ts              # hashContent() → SHA-256 hex (normalizes CRLF)
```

## Naming Conventions

| Pattern | Example | Source |
|---------|---------|--------|
| **Directories** | kebab-case | `src/commands/`, `src/prompts/docs/` |
| **TypeScript files** | kebab-case + `.ts` | `src/cli/index.ts`, `src/genesis/constants.ts` |
| **Barrel exports** | `index.ts` | `src/commands/index.ts` (not present), `src/prompts/index.ts` |
| **Type definitions** | `types.ts` | `src/genesis/types.ts`, `src/config/types.ts`, `src/providers/types.ts` |
| **Constants** | `constants.ts` | `src/genesis/constants.ts` |
| **Interfaces** | PascalCase | `AetherConfig`, `ProjectContext`, `LLMProvider`, `Command` |
| **Functions** | camelCase | `buildPlannerDigest()`, `createProvider()`, `hashContent()` |
| **Constants (values)** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `ACCENT_HEX` |
| **Prompt constants** | UPPER_SNAKE_CASE + `_PROMPT` | `GETTING_STARTED_PROMPT`, `PLANNER_PROMPT` |
| **Config keys** | camelCase | `provider`, `model`, `baseUrl`, `apiKey`, `timeout` |

## Key Files

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | **CLI entry point** — `main()` handles version flag, command registration order, interactive detection, startup animation, chat loop |
| `package.json` | **Package manifest** — name, version, bin entry (`aether` → `dist/cli/index.js`), scripts (`build`, `dev`, `build:sea`), dependencies (`chalk`), devDependencies (`typescript`, `tsx`, `esbuild`, `postject`) |
| `tsconfig.json` | **TypeScript config** — ES2022, NodeNext modules, strict mode, declaration maps, source maps, outDir `./dist` |
| `src/commands/registry.ts` | **CommandRegistry** — registers `/genesis`, `/sync`, `/config`, `/clean`, `/help`; parses `/command args` input |
| `src/config/index.ts` | **Config system** — `loadConfig()` (precedence: project global → global default → in-repo → env), `saveConfig()`, `validateConfig()`, `getGlobalDir()` (`~/.aether`) |
| `src/genesis/types.ts` | **Core domain types** — `ProjectContext`, `FileFingerprint`, `DocDefinition`, `Snapshot`, `SyncPlan`, `DocSection` enum |
| `src/genesis/docs.ts` | **Document catalog** — 13 `DocDefinition` constants in `DOC_DEFINITIONS` (Guides: 3, Architecture: 5, Reference: 4, AI Context: 1) |
| `src/genesis/planner.ts` | **AI planning** — `planDocs()` calls LLM to select docs, falls back to `CORE_IDS` (6 core docs), limits custom docs to 5 |
| `src/providers/factory.ts` | **Provider factory** — `createProvider()` switches on `config.provider` (openai, gemini, anthropic, openrouter) → `OpenAICompatibleProvider` |
| `src/providers/retry.ts` | **Retry logic** — `chatWithRetry()` with exponential backoff, rate-limit detection (429), provider-suggested delays |
| `src/ui/prompt.ts` | **Interactive REPL** — `startChat()` with readline, slash-command dropdown (`/genesis`, `/config`, etc.), keyword responses |
| `src/ui/steps.ts` | **Step rendering** — `StepRunner` (sequential/pooled steps with spinners), `LineSpinner` (braille animation frames) |
| `src/genesis/scope.ts` | **Shared context builder** — `buildSharedProjectContext()` builds/distills project context once for all docs, uses distill cache |
| `scripts/build-sea.mjs` | **SEA build** — esbuild bundles to `dist/sea-prep.js`, postject injects into Node binary → `dist/aether` (single executable) |