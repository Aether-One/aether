# Contributing to Aether

This guide reflects how the project actually works today, based on the codebase and configuration you'll find in the repository.

---

## Development Setup

 bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aether.git
cd aether

# Install dependencies (Node.js 20+ required)
npm install

# Run in development mode (uses tsx for TypeScript execution)
npm run dev

# Build the project (TypeScript compilation)
npm run build

# Type-check without emitting files
npm run typecheck

# Build the Single Executable Application (SEA)
npm run build:sea
 

**Requirements:** Node.js ≥ 20.0.0 (enforced in `package.json` engines field).

## Project Structure (Actual)

The `CONTRIBUTING.md` file describes an older structure. The actual `src/` layout is:

 
src/
├── cli/              # CLI entry point (index.ts)
├── commands/         # Slash-command implementations (genesis, config, help, clean, exclude)
├── config/           # Configuration loading, scaffolding, types
├── genesis/          # Core analysis pipeline (scan, context, distill, plan, docs, sync, estimate, exclude)
├── pricing/          # Model pricing lookup (OpenRouter catalog + static fallback)
├── prompts/          # Prompt templates for AI-generated docs
├── providers/        # LLM provider abstractions (OpenAI-compatible, Anthropic, OpenRouter, retry logic, metered usage)
├── ui/               # Terminal UI (animation, prompts, steppers, theme, cancel/confirm, cost formatting)
└── util/             # Small utilities (env parsing, hashing, token estimation)
 

Key architectural pieces:
- **Commands** register via `src/commands/registry.ts` (`CommandRegistry`)
- **Genesis pipeline** (`genesis/`) runs: scan → context → distill → plan → generate docs
- **Providers** (`providers/`) wrap OpenAI-compatible APIs with retry logic and usage metering
- **Prompts** (`prompts/`) are string templates imported by the genesis pipeline
- **CLI entry** (`cli/index.ts`) boots animation, registers commands, starts REPL
- **Pricing** (`pricing/`) fetches live model prices from OpenRouter with 24h cache, falls back to static table
- **Estimation** (`genesis/estimate.ts`) computes token/cost estimates for genesis and sync operations
- **Exclude** (`genesis/exclude.ts`, `commands/exclude.ts`) manages excluded paths for genesis/sync

## Coding Conventions

Enforced by the TypeScript configuration (`tsconfig.json`):

- **Strict TypeScript** — `strict: true`, no `any`, explicit types
- **ES2022 / NodeNext modules** — `import`/`export` syntax, `.js` extensions in imports
- **Small, focused functions** — prefer pure functions over classes where practical
- **No `any`** — use `unknown` or proper types
- **Explicit imports** — `import { foo } from "./foo.js"` (`.js` extension required by `moduleResolution: NodeNext`)

No ESLint, Prettier, or other formatters are configured. Follow the existing code style in the repository.

## Quality Gates Before a PR

Run these locally before opening a PR:

 bash
# 1. Type-check (strict, no emit)
npm run typecheck

# 2. Build (emits to dist/)
npm run build

# 3. Test manually in dev mode
npm run dev
 

**There is no test suite configured.** The `package.json` has no `test` script, and no test files exist in the repository. Do not invent a test command — manual verification via `npm run dev` is the current validation path.

## Branch & Commit Conventions

From `CONTRIBUTING.md` (this matches the project's stated convention):

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code changes that don't fix bugs or add features |
| `test/` | Adding or updating tests (when tests exist) |

**Commit message format:**
 
feat: add dependency detection for Python projects
fix: handle empty directories in scanner
docs: update roadmap with new commands
refactor: extract technology detection into separate module
 

Branch from `main`. Keep commits focused and messages descriptive.

## Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` using the prefix convention above
3. **Make your changes** — keep functions small, add types, follow existing patterns
4. **Run quality gates** — `npm run typecheck && npm run build`
5. **Test manually** — `npm run dev` and exercise your change
6. **Commit** with a clear message
7. **Push** and open a Pull Request against `main`

The project is in early stages. There is no formal CI pipeline, no PR template, and no required review process documented. PRs are reviewed by maintainers when capacity allows.

---

## Project Vision Context

Aether's goal is to **transform any codebase into an AI-native workspace** by building a living knowledge base (`.aether/`) through static analysis first, then optional AI enrichment. The `genesis` command is the only implemented command today; `sync`, `doctor`, `explain`, `export`, MCP server, and VS Code extension are on the roadmap (see `README.md`).

When contributing, consider how your change fits into the **genesis → sync → doctor → explain → export** lifecycle described in the README's philosophy section.

---

## Questions?

Open an issue or start a discussion on GitHub. No question is too small.
