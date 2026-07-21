# Getting Started with Aether

## What this is

Aether is a CLI tool that analyzes a codebase and builds an AI-ready knowledge layer — documentation, architecture maps, and context files that help both humans and AI assistants understand the project. You run it *against* a repository (including this one) to generate a `.aether/` knowledge base. This guide covers running Aether itself for development.

## Prerequisites

- **Node.js 20+** (from `engines` in `package.json`)
- **npm** (a `package-lock.json` is present, so npm is the expected package manager)

No other runtimes, databases, or Docker are required.

## Install

 bash
# Clone the repository
git clone https://github.com/aether-one/aether.git
cd aether

# Install dependencies
npm install

## Configuration

No configuration is required to run the CLI in development mode. The tool reads project configuration from a global `~/.aether/config.json` (created via the `/config` command) and from per-project `.aether/config.json` or `.aether/settings/config.json`. An `AETHER_API_KEY` environment variable can also supply an API key, but it's optional — the CLI works without AI providers for static analysis.

If you want to use AI-powered documentation generation, you'll need an API key from one of the supported providers (OpenAI, Anthropic, Gemini, OpenRouter) and run `/config` inside the CLI to save it.

## Run it

### Development mode (hot reload via tsx)
 bash
npm run dev
 

This starts the interactive CLI directly from TypeScript source. You'll see a startup animation (unless you pass `--no-animation`), then a prompt where you can type `/genesis`, `/config`, `/help`, `/exclude`, `/clean`, `/exit`, `/clear`, etc.

### Type-check only
 bash
npm run typecheck
 

Runs `tsc --noEmit` — useful before committing.

### Production build
 bash
npm run build
 

Compiles TypeScript to `dist/`. The binary entry point is `dist/cli/index.js`.

### Run built CLI
 bash
npm start
 

Runs `node dist/cli/index.js` — same interactive CLI, but from compiled output.

### Build Single Executable Application (optional)
 bash
npm run build:sea
 

Produces a standalone binary via Node's SEA (Single Executable Application) using `scripts/build-sea.mjs`.

## Verify it works

Run the development CLI:
 bash
npm run dev
 

You should see:
1. A short animated logo with the tagline "Transform any codebase into an AI-native workspace"
2. A help hint: `Type /help for commands`
3. An interactive prompt: `›`

Try a command:
 
/help
 

You'll see the list of available commands (`/genesis`, `/sync`, `/config`, `/clean`, `/exclude`, `/exit`, `/clear`).

Exit with:
 
/exit

## Next steps

- **Onboarding guide** — See `onboarding.md` (generated after running `/genesis` on a project) for the mental model of how Aether understands a codebase.
- **Contributing guide** — See `CONTRIBUTING.md` in the repository root for branch naming, commit conventions, and the PR process.
- **Try it on a project** — Run `/genesis` inside any codebase to generate its `.aether/` knowledge base.
- **Exclude paths** — Use `/exclude <path>` (or type `@` in the prompt to pick one) to skip large directories that don't need documenting during `/genesis` or `/sync`. Excludes are stored in `.aether/settings/exclude.json`.
