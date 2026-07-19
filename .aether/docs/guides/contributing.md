# Contributing to Aether

Aether is an open-source CLI that turns a codebase into an AI-native workspace by analyzing its structure and (optionally) using an LLM to write documentation into a local `.aether/` knowledge base. If you're here to change the project, the most important thing to understand is that **the code is organized around a lifecycle metaphor**: `genesis` is the moment a project is "born" into Aether, and later phases like `sync` are meant to keep that knowledge alive. The commands you'll work on live in `src/commands/`, while the analysis and document-generation machinery lives under `src/genesis/` and `src/prompts/`. Your change will almost always touch one of those areas, or the provider/config layer that feeds them.

The project is young — `package.json` puts it at version `0.1.3` — and the existing `CONTRIBUTING.md` says plainly that it is in early stages. That means the process is light, but the expectations around code quality are not.

## Development setup

Full setup steps (clone, `npm install`, dev commands) are covered in the project's Getting Started guide at `getting-started.md`. In short: install dependencies with `npm install`, run the CLI in dev mode via `npm run dev` (which calls `tsx src/cli/index.ts`), and build with `npm run build`.

## Project conventions

Aether is written in **TypeScript**, not JavaScript. The `tsconfig.json` is strict (`"strict": true`), and the existing `CONTRIBUTING.md` asks contributors to keep functions small and focused, add types, and avoid `any`. Follow the existing code style in whatever file you edit — there is no separate formatter or linter configured beyond `tsc` itself (no ESLint or Prettier appears in `package.json` or the tree).

The CLI entry point is `src/cli/index.ts`; it wires up the command registry (`src/commands/registry.ts`) and drops the user into a chat loop (`src/ui/prompt.ts`). If you add a command, you register it through that registry rather than modifying the entry point directly — `registerBuiltinCommands()` and `registerConfigCommand()` are the patterns to follow in `src/commands/builtins.ts` and `src/commands/config.ts`.

## Quality gates before a PR

There is **no test suite configured** in this project — `package.json` defines no `test` script and no test dependency, and no CI workflow is present in the provided tree. Do not invent one.

Before submitting, the real gates are the ones in `package.json` `scripts`:

- `npm run build` — compiles TypeScript via `tsc` into `dist/`.
- `npm run typecheck` — runs `tsc --noEmit` to verify types without emitting.

Run both locally. The `CONTRIBUTING.md` also lists `npm run dev` for manual testing of your change against a real or sample repo.

## Commit & branch conventions

The existing `CONTRIBUTING.md` defines a clear convention — follow it:

Branch naming uses prefixes:

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code changes that don't fix bugs or add features |
| `test/` | Adding or updating tests |

Commit messages should be clear and descriptive, for example:

```
feat: add dependency detection for Python projects
fix: handle empty directories in scanner
docs: update roadmap with new commands
refactor: extract technology detection into separate module
```

## Submitting changes

The flow described in `CONTRIBUTING.md` is:

1. Fork the repository.
2. Create a branch from `main` using the prefix rules above.
3. Make your changes.
4. Run `npm run build` and `npm run typecheck`.
5. Commit with a descriptive message.
6. Push and open a Pull Request.

Bug reports and feature suggestions go through GitHub issues (the repo URL is `https://github.com/aether-one/aether`). The `CONTRIBUTING.md` asks for a clear title, reproduction steps, and environment details on bugs, and a problem statement plus imagined behavior on features. There is no documented review SLA or CODEOWNERS file in the context — the `CONTRIBUTING.md` simply asks that contributors be respectful and constructive.

One thing to keep in mind while changing code: the `README.md` describes `sync`, `doctor`, `explain`, and `export` as **planned** ("More commands coming soon"). The `src/commands/builtins.ts` file already registers a `sync` command, but `doctor`/`explain`/`export` are not implemented in the provided code. If you pick up one of those, you're building from the vision, not patching something that exists.