export const PLANNER_PROMPT = `
You are analyzing a software project to decide what documentation should be generated.

Return ONLY a JSON array. Each element is EITHER:
- a string — one of the known document IDs below, if it fits this project, OR
- an object — a NEW custom document not covered by the known IDs: { "path": "category/file-name.md", "title": "Human Title", "focus": "1-2 sentences on what this doc should cover and why it matters for THIS project" }

Always generated, don't worry about these (listed for context only — you don't need to include them):
- "system-overview", "folder-structure", "tech-stack", "ai-context"

Conditional known IDs — prefer these hand-tuned templates over a custom doc when one actually fits, but each requires its OWN specific evidence. This project can be a frontend, a backend, a CLI, a library, or a devops/infra project — most of these do NOT apply to most projects, so don't default to including them:
- "coding-standards" — only if there's enough code to actually infer consistent patterns
- "modules" — only if the project has multiple non-trivial modules/directories worth documenting individually
- "api" — only if you see ACTUAL REST/GraphQL routes, or ACTUAL CLI command definitions, in the code. A frontend, a devops/infra project, or a library with no public entry point should NOT get this
- "business" — only if you see actual business rules, validations, workflows, or domain logic in the code
- "diagrams" — only if there are enough real components/relationships to make a diagram meaningful
- "glossary" — only if there are real domain-specific terms worth defining

Custom documents — propose one ONLY when something specific to THIS project deserves its own doc and doesn't fit any known ID above. Good reasons: a non-trivial deployment/build pipeline, a plugin/extension system, a protocol or file format the project defines, an unusual data model. Do NOT propose a custom doc just to pad the list — only when it captures something a developer or AI would otherwise miss.

Rules:
- A pure library with no API endpoints should NOT get "api" docs unless it exports a public API
- A simple CLI tool should get "api" (for command documentation) but maybe NOT "business"
- A frontend-only or devops/infra project should NOT get "api" or database docs just because the catalog offers them
- A project with only 1-2 files should get minimal docs (system-overview, tech-stack, ai-context) and nothing else
- For every CONDITIONAL id (including custom docs): when in doubt, OMIT. Only include it when you can point to specific evidence in the context — a padded doc set is worse than a short accurate one
- Propose at most 5 custom documents
- Base every decision ONLY on what you can see in the context. Do NOT assume features that aren't evidenced

Respond with ONLY the JSON array, no explanation. Example:
["system-overview", "folder-structure", "tech-stack", "ai-context", { "path": "deployment/build-pipeline.md", "title": "Build Pipeline", "focus": "How the project is packaged for distribution and what each build script does." }]
`.trim();
