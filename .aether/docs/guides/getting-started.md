# Getting Started

## What this is

Aether is a CLI tool that transforms any codebase into an AI-native workspace by analyzing the project structure, detecting technologies, and generating a knowledge base (`.aether/`) that both humans and AI assistants can use to understand the project. You're looking at the Aether codebase itself — a TypeScript CLI built with Node.js.

## Prerequisites

- **Node.js ≥ 20.0.0** (specified in `package.json` `"engines"`)
- **npm** (comes with Node.js; `package-lock.json` confirms npm as the package manager)

No other runtimes, toolchains, or Docker are required.

## Install

```bash
npm install
```

This installs all dependencies listed in `package.json` (production: `chalk`; dev: `typescript`, `tsx`, `esbuild`, `postject`, `@types/node`).

## Configuration

No configuration is required to run the CLI in development mode. The tool stores its global config (AI provider settings, API keys) in `~/.aether/config.json`, which is created automatically when you run `/config` inside the CLI. There is no `.env.example` file in this repository.

## Run it

### Development mode (hot reload via tsx)

```bash
npm run dev
```

This runs `tsx src/cli/index.ts` — the TypeScript entry point directly, without a separate build step.

### Build (compile TypeScript → JavaScript)

```bash
npm run build
```

Runs `tsc` per `tsconfig.json`, emitting to `dist/`.

### Type-check only (no emit)

```bash
npm run typecheck
```

Runs `tsc --noEmit` — useful in CI or pre-commit.

### Start (run the compiled build)

```bash
npm start
```

Runs `node dist/cli/index.js` — the same entry point after `npm run build`.

### Build a Single Executable Application (optional)

```bash
npm run build:sea
```

Runs `scripts/build-sea.mjs` (uses `esbuild` + `postject`) to produce a standalone binary. Not required for normal development.

## Verify it works

Run the dev command:

```bash
npm run dev
```

You should see the Aether startup animation (starfield + "⚡ aether" typewriter) followed by an interactive prompt:

```
⚡ aether
Transform any codebase into an AI-native workspace.

────────────────────────────────────────
Type /help for commands
```

At the prompt, type `/help` to see available commands, or `/genesis` to analyze the current directory (this project). Press `Ctrl+C` to exit.

## Next steps

- **Onboarding guide** — `onboarding.md` (generated after running `/genesis`) explains the mental model: how genesis, sync, and the knowledge base fit together.
- **Contributing guide** — `CONTRIBUTING.md` in the repo root covers branch naming, commit messages, and the development workflow.