export const GETTING_STARTED_PROMPT = `
Generate a **Getting Started** guide in Markdown, written for a HUMAN developer who has just cloned this project and needs to run it locally for the first time. This is a practical, hands-on guide — not marketing.

Cover, in this order, ONLY what the project context actually supports:

1. **What this is** — one short paragraph in plain language. No hype.
2. **Prerequisites** — required runtimes/tools and their versions, taken from config files (e.g. \`engines\` in package.json, a language/toolchain file, a Dockerfile). Only list what's evidenced.
3. **Install** — the exact command(s) to install dependencies, inferred from the package manager and config files that are actually present (e.g. a lockfile tells you which manager).
4. **Configuration** — any setup required before running: environment variables (from .env.example), config files, or credentials. If nothing is required, say so explicitly.
5. **Run it** — the concrete commands to run the project, taken from the ACTUAL scripts and entry points (e.g. package.json \`scripts\`, a Makefile, the main entry file). Show the dev, build, and start paths where they exist, using their real names.
6. **Verify it works** — how the developer knows it's running: expected output, a URL/port, a first command to try — but only if the context makes this concrete. Otherwise omit.
7. **Next steps** — point the reader to the Onboarding guide (\`onboarding.md\`) for the mental model, and the Contributing guide (\`contributing.md\`) if one exists.

Use real command and script names from the context. Do NOT invent scripts, ports, env vars, or a package manager that isn't evidenced. If a step genuinely doesn't apply to this project, omit it rather than padding.
`.trim();
