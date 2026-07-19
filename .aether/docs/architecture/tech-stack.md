# Tech Stack

## Languages

| Language | Version/Config | Why |
|----------|----------------|-----|
| **TypeScript** | 5.8.3 (tsconfig.json: target ES2022, module NodeNext, strict mode) | Primary language; strict typing catches errors early, enables self-documenting code, and works well with LLM-generated code |
| **JavaScript (ESM)** | Node.js 20+ (package.json: `"type": "module"`, engines `>=20.0.0`) | Runtime for the CLI; native ESM support, top-level await, modern standard library |

## Frameworks

| Framework | Version | Why |
|-----------|---------|-----|
| **None detected** | — | This is a standalone CLI tool with no web framework, backend framework, or UI framework. All logic is custom TypeScript. |

## Build Tools

| Tool | Version | Why |
|------|---------|-----|
| **TypeScript Compiler (tsc)** | 5.8.3 | Primary build (`npm run build`); emits declaration files, source maps, and ES2022 modules to `dist/` |
| **tsx** | 4.19.4 | Development runner (`npm run dev`); executes TypeScript directly without pre-compilation |
| **esbuild** | 0.28.1 | Used in `scripts/build-sea.mjs` to bundle the CLI into a single executable (Single Executable Application) |
| **postject** | 1.0.0-alpha.6 | Injects the esbuild bundle into a Node.js binary to produce a standalone `aether` executable |

## Testing

| Tool | Status |
|------|--------|
| **None detected** | No test framework, test scripts, or test files found in package.json or source tree |

## Development Tools

| Tool | Version | Why |
|------|---------|-----|
| **@types/node** | 22.15.21 | Type definitions for Node.js 22 APIs (fs/promises, crypto, child_process, readline, etc.) used throughout the codebase |
| **TypeScript strict mode** | Enabled in tsconfig.json | Enforces `noImplicitAny`, `strictNullChecks`, `forceConsistentCasingInFileNames`, and other safety checks |

## Infrastructure

| Tool | Status | Evidence |
|------|--------|----------|
| **Docker** | Not detected | No Dockerfile, docker-compose.yml, or .dockerignore in project root |
| **CI/CD** | Not detected | No GitHub Actions, GitLab CI, or other CI config files in provided context |
| **Deployment** | Not detected | No deployment configs (vercel.json, netlify.toml, etc.) |

## Key Dependencies

| Dependency | Version | Why |
|------------|---------|-----|
| **chalk** | 5.4.1 | Terminal styling (colors, bold, dim) used across CLI output, animations, prompts, spinners, and themed messages |
| **Node.js built-in modules** | Node 20+ | `fs/promises`, `fs`, `path`, `os`, `crypto`, `child_process`, `readline` — all core functionality (file I/O, hashing, git exec, TTY interaction) uses zero external deps |

---

**Notes**

- The project intentionally minimizes external dependencies: only `chalk` in `dependencies`; everything else is dev tooling or Node built-ins.
- The SEA (Single Executable Application) build via `esbuild` + `postject` produces a standalone binary for distribution — no Node.js required on target machine.
- All source code is TypeScript with strict checks; no `any` allowed by convention (per CONTRIBUTING.md guidelines).