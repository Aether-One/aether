export const CONTRIBUTING_PROMPT = `
Generate a **Contributing** guide in Markdown for a HUMAN developer who wants to submit a change to this project.

Base every instruction on evidence in the context — an existing CONTRIBUTING file, config, scripts, CI workflows, PR templates, or conventions visible in the repo. Cover only what is supported:

1. **Development setup** — keep this brief, or just link the Getting Started guide (\`getting-started.md\`) instead of repeating it.
2. **Project conventions** — coding standards, naming, and formatting, plus any linter/formatter actually configured (evidenced by config files or scripts).
3. **Quality gates before a PR** — the REAL commands to build, type-check, lint, and test, taken from package.json \`scripts\`, a Makefile, or CI config. If the project has no tests configured, say so plainly rather than inventing a test command.
4. **Commit & branch conventions** — only if the repo shows a convention (an existing CONTRIBUTING file, a commit-message style, a PR template, branch naming).
5. **Submitting changes** — the PR and review flow, if the context (CONTRIBUTING, .github/, CI) describes one.

If the context is thin on process, keep this guide short and accurate rather than filling it with generic open-source boilerplate. Do NOT invent a test suite, CI pipeline, commit convention, or review process that isn't evidenced in the context.
`.trim();
