# Contributing to Aether

First off, thank you for considering contributing to Aether! 🎉

This project is in its early stages, and every contribution matters — whether it's code, documentation, ideas, or bug reports.

## How to contribute

### Reporting bugs

Open an [issue](https://github.com/aether-one/aether/issues) with:

- A clear title
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node.js version)

### Suggesting features

Open an issue with the `enhancement` label. Describe:

- What problem it solves
- How you imagine it working
- Any alternatives you considered

### Submitting code

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/your-feature`
3. Make your changes
4. Run the build: `npm run build`
5. Run type checking: `npm run typecheck`
6. Commit with a clear message (see below)
7. Push and open a Pull Request

### Branch naming

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code changes that don't fix bugs or add features |
| `test/` | Adding or updating tests |

### Commit messages

Use clear, descriptive commit messages:

```
feat: add dependency detection for Python projects
fix: handle empty directories in scanner
docs: update roadmap with new commands
refactor: extract technology detection into separate module
```

## Project structure

```
aether/
├── src/
│   ├── cli/            ← CLI entry point and argument parsing
│   ├── commands/       ← Command implementations (genesis, sync, etc.)
│   ├── analyzers/      ← Modules that analyze code (scanner, deps, frameworks)
│   ├── generators/     ← Modules that produce output (docs, diagrams, context)
│   ├── core/           ← Shared types and interfaces
│   └── utils/          ← Helper functions
├── package.json
├── tsconfig.json
└── README.md
```

## Development setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aether.git
cd aether

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Type check without emitting
npm run typecheck
```

## Guidelines

- Write TypeScript, not JavaScript
- Keep functions small and focused
- Add types — avoid `any`
- Follow the existing code style
- Test your changes before submitting

## Code of conduct

Be respectful, be constructive, be kind. We're all here to build something great together.

## Questions?

Open an issue or start a discussion. No question is too small.
