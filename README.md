# Aether

> Transform any codebase into an AI-native workspace.

🚀 Visit our documentation site [click here](https://aether-docs-sigma.vercel.app/)

---

AI coding assistants are changing software development, but they all share the same limitation: **they only know what you tell them.**

Aether exists to bridge that gap.

We believe every codebase should be self-explanatory — not only for developers, but for AI as well. Our mission is to transform repositories into living knowledge systems that remain understandable, maintainable, and AI-native throughout their entire lifecycle.

**Documentation is the output. Understanding is the product.**

---

## What is Aether?

Aether is an open-source CLI that helps developers and AI understand any software project.

Instead of only generating documentation, Aether builds a **complete knowledge base** from your repository by analyzing its architecture, business logic, infrastructure, tests, APIs, and dependencies.

The result is a project that is easier for both humans and AI assistants to understand and evolve.

## Why?

Most repositories have:

- Outdated documentation
- Hidden business rules
- Unknown architecture decisions
- Poor onboarding experience

Modern AI tools are only as good as the context they receive. Aether solves this by automatically building and maintaining an **AI-ready knowledge layer** for your project.

## How it works

Aether uses a **hybrid approach**: static analysis first, AI second.

```
1. Scan (static)        → detects structure, dependencies, frameworks
2. Extract context      → identifies key files and patterns
3. AI analysis (opt.)   → generates deep documentation with LLM
4. Output              → writes knowledge base to .aether/
```

### Without AI (default)

Aether scans your project using parsers and heuristics. It detects technologies, maps the structure, identifies entry points, and generates documentation based on patterns. No API key required.

### With AI

Aether sends optimized context to an LLM provider. The AI understands your business logic, explains complex modules, and generates rich documentation that goes far beyond what static analysis can do.

Supported providers:

| Provider | Command | Notes |
|----------|------|-------|
| OpenAI | `/config openai` | Requires `OPENAI_API_KEY` |
| Anthropic | `/config anthropic` | Requires `ANTHROPIC_API_KEY` |
| OpenRouter | `/config openrouter` | Requires `OPENROUTER_API_KEY` |


## What happens?

- ✓ Scans the repository
- ✓ Detects frameworks and technologies
- ✓ Analyzes project structure
- ✓ Identifies entry points and key modules
- ✓ Understands business logic (with AI)
- ✓ Generates architecture documentation
- ✓ Builds AI-ready context
- ✓ Creates knowledge base

## Generated Structure

```
.aether/
├── architecture.md      # Architecture overview
├── context.json         # Machine-readable project context
├── docs/                # Module documentation
└── diagrams/            # Generated diagrams
```

## Commands

| Command | Description |
|---------|-------------|
| `/genesis` | Initialize — analyze and prepare your project |

More commands coming soon: `sync`, `doctor`, `explain`, `export`.

## Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/aether-one/aether/main/scripts/install.sh | sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/aether-one/aether/main/scripts/install.ps1 | iex
```

### Verify

```bash
aether --version
```

> For manual installation and other options, visit our [documentation](https://aether-docs-sigma.vercel.app/docs/getting-started).

Requires Node.js 20+ (only for development, not needed for the binary).

## Roadmap

- [X] `genesis` — Analyze and prepare a project
- [ ] `sync` — Keep knowledge up to date
- [ ] `doctor` — Validate project health
- [ ] MCP Server — Expose knowledge to Claude, Cursor, Gemini
- [ ] VS Code Extension

## Philosophy

Aether is designed as a **universe**, not a tool.

`genesis` is the moment a project is born into the Aether ecosystem. Like a galaxy forming — first comes structure, then understanding, then intelligence.

Each command represents a phase in that lifecycle:

- **Genesis** → the project is born (analysis, documentation)
- **Sync** → the project evolves (continuous updates)
- **Doctor** → the project is healthy (validation)
- **Explain** → the project speaks (knowledge queries)
- **Export** → the project connects (AI integrations)

## Contributing

Contributions are welcome! This project is in its early stages.

## License

[MIT](./LICENSE)
