// Base contract (shared by every prompt)
export { BASE_PROMPT, PROMPT_SUFFIX, HUMAN_BASE_PROMPT, HUMAN_PROMPT_SUFFIX } from "./base.js";

// Per-document prompts
export { GETTING_STARTED_PROMPT } from "./docs/getting-started.js";
export { ONBOARDING_PROMPT } from "./docs/onboarding.js";
export { CONTRIBUTING_PROMPT } from "./docs/contributing.js";
export { SYSTEM_OVERVIEW_PROMPT } from "./docs/system-overview.js";
export { FOLDER_STRUCTURE_PROMPT } from "./docs/folder-structure.js";
export { TECH_STACK_PROMPT } from "./docs/tech-stack.js";
export { CODING_STANDARDS_PROMPT } from "./docs/coding-standards.js";
export { MODULES_PROMPT } from "./docs/modules.js";
export { API_PROMPT } from "./docs/api.js";
export { BUSINESS_RULES_PROMPT } from "./docs/business.js";
export { DIAGRAMS_PROMPT } from "./docs/diagrams.js";
export { AI_CONTEXT_PROMPT } from "./docs/ai-context.js";
export { GLOSSARY_PROMPT } from "./docs/glossary.js";
export { buildCustomDocPrompt } from "./docs/custom-doc.js";

// Pipeline prompts (planning + incremental sync)
export { PLANNER_PROMPT } from "./pipeline/planner.js";
export { SYNC_PLANNER_PROMPT, DOC_UPDATE_INSTRUCTIONS, SECTION_PATCH_INSTRUCTIONS } from "./pipeline/sync.js";
export {
  DEFAULT_PARADIGM,
  paradigmLabel,
  paradigmFocus,
  listParadigms,
  buildCleanCodeScanPrompt,
} from "./pipeline/cleancode.js";
export { OPTIMIZE_PROMPT, buildOptimizePrompt } from "./pipeline/optimize.js";
export { ASK_PROMPT, buildAskPrompt } from "./pipeline/ask.js";
