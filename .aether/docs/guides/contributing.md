# Contributing to Aether

## Development setup

See `getting-started.md` for install, configure, and run steps. This project requires Node.js 20+ (per `engines` in `package.json`) and uses `npm` (evidenced by `package-lock.json` and `npm` scripts in `package.json`).

## Project conventions

- Written in TypeScript (verified by `tsconfig.json` and `.ts` files under `src/`).
- ESM modules: `"type": "module"` in `package.json`; imports use `.js` extension (e.g. `src/cli/index.ts` imports `../ui/animation.js`).
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`).
- Module resolution is `NodeNext` (`tsconfig.json`).
- Single production dependency: `chalk` (`package.json` `dependencies`).
- Dev tooling: `typescript`, `tsx`, `esbuild`, `postject`, `@types/node` (`package.json` `devDependencies`).
- No linter or formatter is configured in `package.json` scripts or any config file present in the context.

## Quality gates before a PR

From `package.json` `scripts`:
- Build: `npm run build` (runs `tsc`)
- Type check: `npm run typecheck` (runs `tsc --noEmit`)
- Dev mode: `npm run dev` (runs `tsx src/cli/index.ts`)

There is **no test suite configured** — `package.json` defines no `test` script, and no test files or test framework appear in the provided context.

## Commit & branch conventions

The repo contains a `CONTRIBUTING.md` with explicit conventions:
- Branch naming prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/` (table in `CONTRIBUTING.md`).
- Commit messages: descriptive, e.g. `feat: add dependency detection for Python projects` (examples in `CONTRIBUTING.md`).

## Submitting changes

`CONTRIBUTING.md` describes the flow:
1. Fork the repository
2. Create a branch from `main` using the prefix rules above
3. Make changes
4. Run `npm run build` and `npm run typecheck`
5. Commit with a clear message
6. Push and open a Pull Request

No CI workflow, PR template, or `.github/` directory is present in the provided context.