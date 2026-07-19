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
  DOC_UPDATE_INSTRUCTIONS,
  SECTION_PATCH_INSTRUCTIONS,
  buildCustomDocPrompt,
} from "../prompts/index.js";

import type { DocSection, DocDefinition, CustomDocSpec, DocIndexEntry } from "./types.js";

export type { DocSection, DocDefinition, CustomDocSpec, DocIndexEntry } from "./types.js";

/** Order the sections appear in the generated index (docs/README.md) — humans (Guides) first. */
export const SECTION_ORDER: DocSection[] = [
  "Guides",
  "Architecture",
  "Reference",
  "AI Context",
  "Project-specific",
];

function withBase(context: string, specificPrompt: string): string {
  return `${BASE_PROMPT}\n\n${context}\n\n${specificPrompt}\n\n${PROMPT_SUFFIX}`;
}

// Human guides invert the writing rules toward narrative and the "why" (HUMAN_BASE_PROMPT),
// keeping the same anti-hallucination floor as the machine docs.
function withHumanBase(context: string, specificPrompt: string): string {
  return `${HUMAN_BASE_PROMPT}\n\n${context}\n\n${specificPrompt}\n\n${HUMAN_PROMPT_SUFFIX}`;
}

/** Full-document prompt — used by genesis and for brand-new docs in sync. */
export function buildDocPrompt(doc: DocDefinition, context: string): string {
  return doc.human ? withHumanBase(context, doc.prompt) : withBase(context, doc.prompt);
}

/**
 * Update prompt — used by sync to REFRESH an existing doc. Feeds the current doc
 * and the change summary so the model patches only what changed instead of rewriting.
 */
export function buildDocUpdatePrompt(
  doc: DocDefinition,
  context: string,
  existingDoc: string,
  changes: string,
): string {
  const base = doc.human ? HUMAN_BASE_PROMPT : BASE_PROMPT;
  // Intentionally NOT the doc's "Generate a ... document" contract — the current
  // document below is already the structure to follow. Including the from-scratch
  // contract here fights the update instructions and triggers full rewrites.
  return [
    base,
    context,
    `You are maintaining the document "${doc.title}" (${doc.summary}). The current version below is the source of truth for its structure and wording.`,
    "--- BEGIN CURRENT DOCUMENT ---",
    existingDoc,
    "--- END CURRENT DOCUMENT ---",
    "## What changed in the project since this document was written",
    changes,
    DOC_UPDATE_INSTRUCTIONS,
  ].join("\n\n");
}

/**
 * Section-patch prompt — asks the model to return ONLY the sections affected by the
 * change (as heading→content), so the code can replace just those and keep the rest
 * of the document byte-for-byte. `headings` are the existing section titles.
 */
export function buildSectionPatchPrompt(
  doc: DocDefinition,
  context: string,
  existingDoc: string,
  changes: string,
  headings: string[],
): string {
  const base = doc.human ? HUMAN_BASE_PROMPT : BASE_PROMPT;
  return [
    base,
    context,
    `You are updating the document "${doc.title}" (${doc.summary}). Only the parts affected by the change below may change.`,
    "Current sections (by heading):",
    headings.map((h) => `- ${h}`).join("\n"),
    "--- BEGIN CURRENT DOCUMENT ---",
    existingDoc,
    "--- END CURRENT DOCUMENT ---",
    "## What changed in the project since this document was written",
    changes,
    SECTION_PATCH_INSTRUCTIONS,
  ].join("\n\n");
}

// --- Guides (human-facing) ---

const GETTING_STARTED: DocDefinition = {
  id: "getting-started",
  outputPath: "docs/guides/getting-started.md",
  label: "guides/getting-started.md",
  title: "Getting Started",
  section: "Guides",
  summary: "Install, configure, and run the project locally.",
  prompt: GETTING_STARTED_PROMPT,
  human: true,
};

const ONBOARDING: DocDefinition = {
  id: "onboarding",
  outputPath: "docs/guides/onboarding.md",
  label: "guides/onboarding.md",
  title: "Onboarding",
  section: "Guides",
  summary: "The mental model, the why, and how to make your first change.",
  prompt: ONBOARDING_PROMPT,
  human: true,
};

const CONTRIBUTING: DocDefinition = {
  id: "contributing",
  outputPath: "docs/guides/contributing.md",
  label: "guides/contributing.md",
  title: "Contributing",
  section: "Guides",
  summary: "Conventions, quality gates, and how to submit a change.",
  prompt: CONTRIBUTING_PROMPT,
  human: true,
};

// --- Architecture ---

const SYSTEM_OVERVIEW: DocDefinition = {
  id: "system-overview",
  outputPath: "docs/architecture/system-overview.md",
  label: "architecture/system-overview.md",
  title: "System Overview",
  section: "Architecture",
  summary: "High-level architecture and how the system fits together.",
  prompt: SYSTEM_OVERVIEW_PROMPT,
};

const FOLDER_STRUCTURE: DocDefinition = {
  id: "folder-structure",
  outputPath: "docs/architecture/folder-structure.md",
  label: "architecture/folder-structure.md",
  title: "Folder Structure",
  section: "Architecture",
  summary: "Directory layout and where things live.",
  prompt: FOLDER_STRUCTURE_PROMPT,
};

const TECH_STACK: DocDefinition = {
  id: "tech-stack",
  outputPath: "docs/architecture/tech-stack.md",
  label: "architecture/tech-stack.md",
  title: "Tech Stack",
  section: "Architecture",
  summary: "Languages, frameworks, and key dependencies.",
  prompt: TECH_STACK_PROMPT,
};

const MODULES: DocDefinition = {
  id: "modules",
  outputPath: "docs/modules/overview.md",
  label: "modules/overview.md",
  title: "Modules Overview",
  section: "Architecture",
  summary: "Per-module breakdown of responsibilities and exports.",
  prompt: MODULES_PROMPT,
};

const DIAGRAMS: DocDefinition = {
  id: "diagrams",
  outputPath: "docs/diagrams/system.md",
  label: "diagrams/system.md",
  title: "Diagrams",
  section: "Architecture",
  summary: "Visual diagrams of the system and its relationships.",
  prompt: DIAGRAMS_PROMPT,
};

// --- Reference ---

const CODING_STANDARDS: DocDefinition = {
  id: "coding-standards",
  outputPath: "docs/architecture/coding-standards.md",
  label: "architecture/coding-standards.md",
  title: "Coding Standards",
  section: "Reference",
  summary: "Code patterns and conventions used across the project.",
  prompt: CODING_STANDARDS_PROMPT,
};

const API_DOCS: DocDefinition = {
  id: "api",
  outputPath: "docs/api/endpoints.md",
  label: "api/endpoints.md",
  title: "API Reference",
  section: "Reference",
  summary: "API surface — endpoints or CLI commands.",
  prompt: API_PROMPT,
};

const BUSINESS_RULES: DocDefinition = {
  id: "business",
  outputPath: "docs/business/rules.md",
  label: "business/rules.md",
  title: "Business Rules",
  section: "Reference",
  summary: "Business rules and domain logic.",
  prompt: BUSINESS_RULES_PROMPT,
};

const GLOSSARY: DocDefinition = {
  id: "glossary",
  outputPath: "docs/glossary.md",
  label: "glossary.md",
  title: "Glossary",
  section: "Reference",
  summary: "Domain-specific terms and definitions.",
  prompt: GLOSSARY_PROMPT,
};

// --- AI Context ---

const AI_CONTEXT: DocDefinition = {
  id: "ai-context",
  outputPath: "docs/AI_CONTEXT.md",
  label: "AI_CONTEXT.md",
  title: "AI Context",
  section: "AI Context",
  summary: "System prompt for AI assistants working on this project.",
  prompt: AI_CONTEXT_PROMPT,
};

/**
 * All docs available for generation. The planner decides which ones are relevant.
 * Order here drives generation order and the order within each index section.
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

/** Turns a planner-proposed custom doc into a DocDefinition. */
export function buildCustomDocDefinition(spec: CustomDocSpec): DocDefinition {
  return {
    id: `custom:${spec.path}`,
    outputPath: `docs/${spec.path}`,
    label: spec.path,
    title: spec.title,
    section: "Project-specific",
    summary: spec.focus || "Project-specific documentation.",
    prompt: buildCustomDocPrompt(spec.title, spec.focus),
  };
}

/**
 * Builds the docs landing page (docs/README.md) deterministically — no LLM call.
 * Groups docs by section (Guides first) and links each relative to docs/.
 */
export function buildDocsIndex(projectName: string, docs: DocIndexEntry[]): string {
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
      const href = doc.outputPath.replace(/^docs\//, "");
      lines.push(`- [${doc.title}](${href}) — ${doc.summary}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
