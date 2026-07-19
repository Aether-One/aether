# Folder Structure

## Overview

Aether follows a modular, domain-driven architecture where each top-level directory under `src/` represents a distinct capability. The project is organized around the CLI command lifecycle: configuration → scanning → analysis → generation → output. Shared utilities and cross-cutting concerns (UI, providers, config) live in dedicated directories, while command-specific logic resides in `commands/` and the core analysis pipeline lives in `genesis/`.

## Root Structure

```
aether/
├── scripts/              # Build-time scripts (Single Executable Application)
├── src/                  # Main source code
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # MIT license
├── package-lock.json     # Locked dependency tree
├── package.json          # Project manifest, scripts, dependencies
├── README.md             # Project documentation
├── sea-config.json       # SEA (Single Executable Application) config
└── tsconfig.json         # TypeScript configuration
```

| Directory/File | Purpose |
|----------------|---------|
| `scripts/` | Contains `build-sea.mjs` for creating a single executable binary |
| `src/` | All TypeScript source code |
| `CONTRIBUTING.md` | Contribution guidelines and project structure overview |
| `package.json` | Defines entry point (`dist/cli/index.js`), scripts, and dependencies |
| `tsconfig.json` | Strict TypeScript config targeting ES2022/NodeNext |
| `sea-config.json` | Configuration for Single Executable Application build |

## Source Structure

```
src/
├── cli/                    # CLI entry point and argument parsing
│   └── index.ts            # main() — version, command registration, startup animation, REPL
├── commands/               # Slash-command implementations
│   ├── builtins.ts         # /genesis, /sync, /exit, /clear
│   ├── clean.ts            # /clean — manage global cache/config
│   ├── config.ts           # /config — provider setup and key management
│   ├── help.ts             # /help — command reference
│   └── registry.ts         # CommandRegistry class and Command interface
├── config/                 # Configuration loading, validation, scaffolding
│   ├── index.ts            # loadConfig, saveConfig, getDefaultConfig, validation
│   ├── readme.ts           # AETHER_README template for .aether/README.md
│   ├── scaffold.ts         # ensureProjectReadme() — writes .aether/README.md
│   └── types.ts            # AetherConfig interface (provider, model, baseUrl, apiKey)
├── genesis/                # Core analysis and documentation pipeline
│   ├── constants.ts        # Limits (file size, char budget, concurrency) with env overrides
│   ├── context.ts          # scanContext() — reads project, builds ProjectContext
│   ├── digest.ts           # buildPlannerDigest() — compact project map for planner LLM
│   ├── distill.ts          # distillFilesIncremental() — LLM-based source fact extraction
│   ├── docs.ts             # DocDefinition catalog, prompt builders, index generator
│   ├── fingerprint.ts      # buildFingerprint(), getGitInfo() — change detection
│   ├── planner.ts          # planDocs() — LLM decides which docs to generate
│   ├── scope.ts            # buildSharedProjectContext() — shared context with distillation cache
│   ├── sync.ts             # planSync(), refreshDoc(), writeSnapshot() — incremental updates
│   └── types.ts            # All genesis types: ProjectContext, DocDefinition, Snapshot, etc.
├── prompts/                # LLM prompt templates
│   ├── base.ts             # BASE_PROMPT, PROMPT_SUFFIX, HUMAN_BASE_PROMPT, HUMAN_PROMPT_SUFFIX
│   ├── index.ts            # Re-exports all prompt constants
│   ├── docs/               # Per-document prompts (13 files)
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
│   └── pipeline/           # Pipeline-stage prompts
│       ├── planner.ts      # PLANNER_PROMPT
│       └── sync.ts         # SYNC_PLANNER_PROMPT, DOC_UPDATE_INSTRUCTIONS, SECTION_PATCH_INSTRUCTIONS
├── providers/              # LLM provider abstraction
│   ├── factory.ts          # createProvider() — returns OpenAICompatibleProvider
│   ├── index.ts            # Re-exports types, OpenAICompatibleProvider, createProvider
│   ├── openai-compatible.ts # OpenAICompatibleProvider class (chat, chatStream, ping)
│   ├── retry.ts            # chatWithRetry(), rate-limit handling, retry logging
│   └── types.ts            # LLMProvider interface, ChatMessage, ChatRequest, ChatResponse
├── ui/                     # Terminal UI components
│   ├── animation.ts        # playStartupAnimation(), printBanner()
│   ├── prompt.ts           # startChat() — REPL with tab completion and dropdown
│   ├── steps.ts            # StepRunner (multi-step progress), LineSpinner
│   └── theme.ts            # Color constants (ACCENT, DIM, SUCCESS, WARN, ERROR)
└── util/                   # Shared utilities
    └── env.ts              # envInt() — safe integer env var parsing with fallback
```

## Naming Conventions

| Pattern | Example | Scope |
|---------|---------|-------|
| **kebab-case directories** | `genesis/`, `prompts/docs/` | All directories |
| **kebab-case files** | `build-sea.mjs`, `openai-compatible.ts` | All files |
| **PascalCase classes** | `CommandRegistry`, `OpenAICompatibleProvider`, `StepRunner` | Classes |
| **camelCase functions** | `scanContext`, `buildPlannerDigest`, `createProvider` | Functions, variables |
| **UPPER_SNAKE_CASE constants** | `MAX_FILE_SIZE`, `DOC_CONTEXT_BUDGET`, `SPINNER_FRAMES` | Module-level constants |
| **Interface suffix** | `AetherConfig`, `LLMProvider`, `Command`, `ProjectContext` | TypeScript interfaces |
| **Type suffix** | `PlanDocsOptions`, `ParsedPlan`, `RetryOptions` | Type aliases |
| **Command prefix** | `/genesis`, `/sync`, `/config`, `/clean`, `/help`, `/exit`, `/clear` | CLI slash commands |

## Key Files

### Entry Points
| File | Role |
|------|------|
| `src/cli/index.ts` | CLI entry point — `main()` registers commands, detects TTY, runs animation, starts REPL |
| `package.json` | Defines `bin.aether = ./dist/cli/index.js`, scripts (`build`, `dev`, `build:sea`, `typecheck`) |

### Configuration
| File | Role |
|------|------|
| `src/config/index.ts` | Config loading/saving/validation, provider defaults, global/project config merge |
| `src/config/types.ts` | `AetherConfig` interface — provider, model, baseUrl, apiKey, timeout |
| `src/config/scaffold.ts` | `ensureProjectReadme()` — writes `.aether/README.md` on first genesis |
| `sea-config.json` | SEA build configuration for single executable output |

### Core Pipeline (genesis)
| File | Role |
|------|------|
| `src/genesis/context.ts` | `scanContext()` — reads project files, builds `ProjectContext` |
| `src/genesis/digest.ts` | `buildPlannerDigest()` — deterministic project map for planner LLM |
| `src/genesis/planner.ts` | `planDocs()` — LLM selects docs to generate from catalog + custom |
| `src/genesis/distill.ts` | `distillFilesIncremental()` — extracts factual notes from source files via LLM |
| `src/genesis/scope.ts` | `buildSharedProjectContext()` — builds shared context with distillation cache |
| `src/genesis/docs.ts` | 13 `DocDefinition` constants, prompt builders, index generator |
| `src/genesis/sync.ts` | `planSync()`, `refreshDoc()`, `writeSnapshot()` — incremental updates |
| `src/genesis/fingerprint.ts` | `buildFingerprint()`, `getGitInfo()` — change detection via SHA256 + git |
| `src/genesis/constants.ts` | All size/concurrency limits with `AETHER_*` env var overrides |

### Providers & Prompts
| File | Role |
|------|------|
| `src/providers/openai-compatible.ts` | `OpenAICompatibleProvider` — implements `LLMProvider` for OpenAI-compatible APIs |
| `src/providers/factory.ts` | `createProvider()` — instantiates provider based on `config.provider` |
| `src/providers/retry.ts` | `chatWithRetry()` — exponential backoff, rate-limit (429) handling |
| `src/prompts/base.ts` | `BASE_PROMPT`, `PROMPT_SUFFIX` — anti-hallucination sandwich for all LLM calls |
| `src/prompts/docs/*.ts` | 13 document-specific prompt templates |
| `src/prompts/pipeline/*.ts` | Planner and sync prompt templates |

### UI & Commands
| File | Role |
|------|------|
| `src/ui/prompt.ts` | `startChat()` — REPL with readline, tab completion, live dropdown |
| `src/ui/steps.ts` | `StepRunner` (multi-step progress), `LineSpinner` (single-line spinner) |
| `src/ui/animation.ts` | `playStartupAnimation()`, `printBanner()` — startup visuals |
| `src/ui/theme.ts` | Color constants using `chalk` |
| `src/commands/builtins.ts` | `/genesis`, `/sync`, `/exit`, `/clear` implementations |
| `src/commands/config.ts` | `/config` — provider setup, key management, validation |
| `src/commands/clean.ts` | `/clean` — cache/config/project removal |
| `src/commands/registry.ts` | `CommandRegistry` — command registration and execution |

### Utilities
| File | Role |
|------|------|
| `src/util/env.ts` | `envInt(name, fallback)` — safe integer env var parsing |