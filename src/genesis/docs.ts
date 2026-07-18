/**
 * Definição de cada documento que o genesis gera.
 * Prompts são importados de src/prompts/ — não ficam inline no código.
 */

import {
  BASE_PROMPT,
  PROMPT_SUFFIX,
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

export interface DocDefinition {
  id: string;
  outputPath: string;
  label: string;
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

const SYSTEM_OVERVIEW: DocDefinition = {
  id: "system-overview",
  outputPath: "docs/architecture/system-overview.md",
  label: "architecture/system-overview.md",
  buildPrompt: (context) => withBase(context, SYSTEM_OVERVIEW_PROMPT),
};

const FOLDER_STRUCTURE: DocDefinition = {
  id: "folder-structure",
  outputPath: "docs/architecture/folder-structure.md",
  label: "architecture/folder-structure.md",
  buildPrompt: (context) => withBase(context, FOLDER_STRUCTURE_PROMPT),
};

const TECH_STACK: DocDefinition = {
  id: "tech-stack",
  outputPath: "docs/architecture/tech-stack.md",
  label: "architecture/tech-stack.md",
  buildPrompt: (context) => withBase(context, TECH_STACK_PROMPT),
};

const CODING_STANDARDS: DocDefinition = {
  id: "coding-standards",
  outputPath: "docs/architecture/coding-standards.md",
  label: "architecture/coding-standards.md",
  buildPrompt: (context) => withBase(context, CODING_STANDARDS_PROMPT),
};

const MODULES: DocDefinition = {
  id: "modules",
  outputPath: "docs/modules/overview.md",
  label: "modules/overview.md",
  buildPrompt: (context) => withBase(context, MODULES_PROMPT),
};

const API_DOCS: DocDefinition = {
  id: "api",
  outputPath: "docs/api/endpoints.md",
  label: "api/endpoints.md",
  buildPrompt: (context) => withBase(context, API_PROMPT),
};

const BUSINESS_RULES: DocDefinition = {
  id: "business",
  outputPath: "docs/business/rules.md",
  label: "business/rules.md",
  buildPrompt: (context) => withBase(context, BUSINESS_RULES_PROMPT),
};

const DIAGRAMS: DocDefinition = {
  id: "diagrams",
  outputPath: "docs/diagrams/system.md",
  label: "diagrams/system.md",
  buildPrompt: (context) => withBase(context, DIAGRAMS_PROMPT),
};

const AI_CONTEXT: DocDefinition = {
  id: "ai-context",
  outputPath: "docs/AI_CONTEXT.md",
  label: "AI_CONTEXT.md",
  buildPrompt: (context) => withBase(context, AI_CONTEXT_PROMPT),
};

const GLOSSARY: DocDefinition = {
  id: "glossary",
  outputPath: "docs/glossary.md",
  label: "glossary.md",
  buildPrompt: (context) => withBase(context, GLOSSARY_PROMPT),
};

/**
 * All docs available for generation. The planner decides which ones are relevant.
 */
export const DOC_DEFINITIONS: DocDefinition[] = [
  SYSTEM_OVERVIEW,
  FOLDER_STRUCTURE,
  TECH_STACK,
  CODING_STANDARDS,
  MODULES,
  API_DOCS,
  BUSINESS_RULES,
  DIAGRAMS,
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
    buildPrompt: (context) => withBase(context, buildCustomDocPrompt(spec.title, spec.focus)),
  };
}
