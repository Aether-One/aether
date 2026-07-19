# Contributing to Aether

Thank you for considering a contribution. This guide reflects what actually exists in the repository today — no invented processes, no aspirational tooling.

---

## Development Setup

**Requirements:** Node.js 20+ (enforced in `package.json` engines).

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aether.git
cd aether

# Install dependencies
npm install

# Run in development mode (uses tsx for direct TS execution)
npm run dev

# Build (compiles to dist/ via tsc)
npm run build

# Type-check without emitting
npm run typecheck
```

The `dev` script runs `tsx src/cli/index.ts` — useful for rapid iteration. The `build:sea` script produces a single executable via `scripts/build-sea.mjs` (esbuild + postject), but isn't required for typical development.

---

## Project Conventions

**Language & Style**
- TypeScript, strict mode (`tsconfig.json`: `strict: true`, `noImplicitAny: true`).
- ESM only (`"type": "module"` in `package.json`).
- Keep functions small and focused; avoid `any`.
- Follow the existing code style — the codebase is small enough to learn by reading.

**Formatting & Linting**
- **No formatter configured** (no Prettier, no `format` script).
- **No linter configured** (no ESLint, no `lint` script).
- Consistency is maintained by convention and code review.

**Naming & Structure**
- Branch prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/` (from `CONTRIBUTING.md`).
- Source lives in `src/` with feature-based subdirectories (`cli/`, `commands/`, `genesis/`, `providers/`, `prompts/`, `ui/`, `config/`, `util/`).
- Barrel exports via `index.ts` files are used throughout.

---

## Quality Gates Before a PR

Run these locally — they are the only automated checks in the repository:

| Command | Purpose |
|---------|---------|
| `npm run build` | Compiles TypeScript; catches type errors and emit issues |
| `npm run typecheck` | Fast type-only check (`tsc --noEmit`) |

**There is no test suite.** No `test` script exists in `package.json`, no test files in the source tree, and no CI pipeline runs tests. If you add tests, you'll also need to add the tooling and scripts to run them.

**There is no lint step.** Code style is enforced manually in review.

---

## Commit & Branch Conventions

The project documents these conventions in `CONTRIBUTING.md`:

**Branches**
```
feat/your-feature     # new features
fix/your-fix          # bug fixes
docs/your-update      # documentation only
refactor/your-change  # code changes that don't fix bugs or add features
test/your-tests       # adding or updating tests
```

**Commit Messages**
Use clear, descriptive messages with a type prefix:
```
feat: add dependency detection for Python projects
fix: handle empty directories in scanner
docs: update roadmap with new commands
refactor: extract technology detection into separate module
```

No automated commit linting (no `commitlint`, no Husky hooks).

---

## Submitting Changes

1. Fork the repository
2. Create a branch from `main` using the prefixes above
3. Make your changes
4. Run `npm run build` and `npm run typecheck` — both must pass
5. Commit with a clear message (see conventions above)
6. Push and open a Pull Request

**Review Process**
- No documented PR template (`.github/pull_request_template.md` does not exist).
- No CI workflow (`.github/workflows/` does not exist).
- Reviews are manual; maintainers will run the build and typecheck themselves.
- Be responsive to feedback; keep PRs focused.

---

## Questions?

Open an issue or start a discussion. No question is too small.