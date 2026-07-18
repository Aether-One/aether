/**
 * Definição de cada documento que o genesis gera.
 * Prompts são importados de src/prompts/ — não ficam inline no código.
 */

import {
  BASE_PROMPT,
  PROMPT_SUFFIX,
  HUMAN_BASE_PROMPT,
  HUMAN_PROMPT_SUFFIX,
  GETTING_STARTED_PROMPT,
  ONBOARDING_PROMPT,
  CONTRIBUTING_PROMPT,
  SYSTEM_OVERVIEW_PROMPT,
  FOLDER_STRUCTURE_PROMPT,
  TECH_STACK_PROMPT,
  CODING_STANDARDS_PROMPT,
  MODULES_PROMPT,
  API_PROMPT,
  BUSINESS_RULES_PROMPT,
  DIAGRAMS_PROMPT,
  AI_CONTEXT_PROMPT,
  GLOSSARY_PROMPT,
  buildCustomDocPrompt,
} from "../prompts/index.js";

/**
 * Sections used to group docs in the generated index (docs/README.md).
 * Order here is the order they appear in the index — humans (Guides) first.
 */
export type DocSection = "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific";

export const SECTION_ORDER: DocSection[] = [
  "Guides",
  "Architecture",
  "Reference",
  "AI Context",
  "Project-specific",
];

export interface DocDefinition {
  id: string;
  outputPath: string;
  label: string;
  /** Human-friendly title used in the docs index. */
  title: string;
  /** Which group this doc belongs to in the index. */
  section: DocSection;
  /** One-line description shown next to the link in the index. */
  summary: string;
  buildPrompt: (context: string) => string;
}

/** A doc proposed by the planner LLM that doesn't fit the fixed catalog below. */
export interface CustomDocSpec {
  /** Sanitized, relative to docs/ — e.g. "deployment/build-pipeline.md". */
  path: string;
  title: string;
  focus: string;
}

function withBase(context: string, specificPrompt: string): string {
  return `${BASE_PROMPT}\n\n${context}\n\n${specificPrompt}\n\n${PROMPT_SUFFIX}`;
}

/**
 * Human guides use a different contract than machine docs: same anti-hallucination floor,
 * but the writing rules are inverted toward narrative and the "why" (see HUMAN_BASE_PROMPT).
 * Routing the guides through this instead of withBase() is what keeps them from reading
 * like the path-driven AI docs.
 */
function withHumanBase(context: string, specificPrompt: string): string {
  return `${HUMAN_BASE_PROMPT}\n\n${context}\n\n${specificPrompt}\n\n${HUMAN_PROMPT_SUFFIX}`;
}

// --- Guides (human-facing) ---

const GETTING_STARTED: DocDefinition = {
  id: "getting-started",
  outputPath: "docs/guides/getting-started.md",
  label: "guides/getting-started.md",
  title: "Getting Started",
  section: "Guides",
  summary: "Install, configure, and run the project locally.",
  buildPrompt: (context) => withHumanBase(context, GETTING_STARTED_PROMPT),
};

const ONBOARDING: DocDefinition = {
  id: "onboarding",
  outputPath: "docs/guides/onboarding.md",
  label: "guides/onboarding.md",
  title: "Onboarding",
  section: "Guides",
  summary: "The mental model, the why, and how to make your first change.",
  buildPrompt: (context) => withHumanBase(context, ONBOARDING_PROMPT),
};

const CONTRIBUTING: DocDefinition = {
  id: "contributing",
  outputPath: "docs/guides/contributing.md",
  label: "guides/contributing.md",
  title: "Contributing",
  section: "Guides",
  summary: "Conventions, quality gates, and how to submit a change.",
  buildPrompt: (context) => withHumanBase(context, CONTRIBUTING_PROMPT),
};

// --- Architecture ---

const SYSTEM_OVERVIEW: DocDefinition = {
  id: "system-overview",
  outputPath: "docs/architecture/system-overview.md",
  label: "architecture/system-overview.md",
  title: "System Overview",
  section: "Architecture",
  summary: "High-level architecture and how the system fits together.",
  buildPrompt: (context) => withBase(context, SYSTEM_OVERVIEW_PROMPT),
};

const FOLDER_STRUCTURE: DocDefinition = {
  id: "folder-structure",
  outputPath: "docs/architecture/folder-structure.md",
  label: "architecture/folder-structure.md",
  title: "Folder Structure",
  section: "Architecture",
  summary: "Directory layout and where things live.",
  buildPrompt: (context) => withBase(context, FOLDER_STRUCTURE_PROMPT),
};

const TECH_STACK: DocDefinition = {
  id: "tech-stack",
  outputPath: "docs/architecture/tech-stack.md",
  label: "architecture/tech-stack.md",
  title: "Tech Stack",
  section: "Architecture",
  summary: "Languages, frameworks, and key dependencies.",
  buildPrompt: (context) => withBase(context, TECH_STACK_PROMPT),
};

const MODULES: DocDefinition = {
  id: "modules",
  outputPath: "docs/modules/overview.md",
  label: "modules/overview.md",
  title: "Modules Overview",
  section: "Architecture",
  summary: "Per-module breakdown of responsibilities and exports.",
  buildPrompt: (context) => withBase(context, MODULES_PROMPT),
};

const DIAGRAMS: DocDefinition = {
  id: "diagrams",
  outputPath: "docs/diagrams/system.md",
  label: "diagrams/system.md",
  title: "Diagrams",
  section: "Architecture",
  summary: "Visual diagrams of the system and its relationships.",
  buildPrompt: (context) => withBase(context, DIAGRAMS_PROMPT),
};

// --- Reference ---

const CODING_STANDARDS: DocDefinition = {
  id: "coding-standards",
  outputPath: "docs/architecture/coding-standards.md",
  label: "architecture/coding-standards.md",
  title: "Coding Standards",
  section: "Reference",
  summary: "Code patterns and conventions used across the project.",
  buildPrompt: (context) => withBase(context, CODING_STANDARDS_PROMPT),
};

const API_DOCS: DocDefinition = {
  id: "api",
  outputPath: "docs/api/endpoints.md",
  label: "api/endpoints.md",
  title: "API Reference",
  section: "Reference",
  summary: "API surface — endpoints or CLI commands.",
  buildPrompt: (context) => withBase(context, API_PROMPT),
};

const BUSINESS_RULES: DocDefinition = {
  id: "business",
  outputPath: "docs/business/rules.md",
  label: "business/rules.md",
  title: "Business Rules",
  section: "Reference",
  summary: "Business rules and domain logic.",
  buildPrompt: (context) => withBase(context, BUSINESS_RULES_PROMPT),
};

const GLOSSARY: DocDefinition = {
  id: "glossary",
  outputPath: "docs/glossary.md",
  label: "glossary.md",
  title: "Glossary",
  section: "Reference",
  summary: "Domain-specific terms and definitions.",
  buildPrompt: (context) => withBase(context, GLOSSARY_PROMPT),
};

// --- AI Context ---

const AI_CONTEXT: DocDefinition = {
  id: "ai-context",
  outputPath: "docs/AI_CONTEXT.md",
  label: "AI_CONTEXT.md",
  title: "AI Context",
  section: "AI Context",
  summary: "System prompt for AI assistants working on this project.",
  buildPrompt: (context) => withBase(context, AI_CONTEXT_PROMPT),
};

/**
 * All docs available for generation. The planner decides which ones are relevant.
 * Order here drives generation order and the order within each index section —
 * human Guides first, then Architecture, Reference, and the AI context anchor.
 */
export const DOC_DEFINITIONS: DocDefinition[] = [
  GETTING_STARTED,
  ONBOARDING,
  CONTRIBUTING,
  SYSTEM_OVERVIEW,
  FOLDER_STRUCTURE,
  TECH_STACK,
  MODULES,
  DIAGRAMS,
  CODING_STANDARDS,
  API_DOCS,
  BUSINESS_RULES,
  AI_CONTEXT,
  GLOSSARY,
];

/**
 * Turns a planner-proposed custom doc into a DocDefinition, so genesis can generate
 * it through the same pipeline as the fixed catalog above.
 */
export function buildCustomDocDefinition(spec: CustomDocSpec): DocDefinition {
  return {
    id: `custom:${spec.path}`,
    outputPath: `docs/${spec.path}`,
    label: `docs/${spec.path}`,
    title: spec.title,
    section: "Project-specific",
    summary: spec.focus || "Project-specific documentation.",
    buildPrompt: (context) => withBase(context, buildCustomDocPrompt(spec.title, spec.focus)),
  };
}

/**
 * Builds the docs landing page (docs/README.md) deterministically — no LLM call.
 * Groups the generated docs by section (Guides first) and links each one relative
 * to docs/, so the knowledge base reads as a structured site instead of loose files.
 */
export function buildDocsIndex(projectName: string, docs: DocDefinition[]): string {
  const lines: string[] = [];

  lines.push(`# ${projectName} — Documentation`);
  lines.push("");
  lines.push(
    "Knowledge base generated by [Aether](https://github.com/aether-one/aether). " +
      "New here? Start with the **Guides**.",
  );
  lines.push("");

  for (const section of SECTION_ORDER) {
    const inSection = docs.filter((d) => d.section === section);
    if (inSection.length === 0) continue;

    lines.push(`## ${section}`);
    lines.push("");
    for (const doc of inSection) {
      // outputPath is relative to .aether/; the index lives at .aether/docs/README.md,
      // so links are relative to docs/.
      const href = doc.outputPath.replace(/^docs\//, "");
      lines.push(`- [${doc.title}](${href}) — ${doc.summary}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
