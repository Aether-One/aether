// Shared data shapes for the genesis/sync pipeline. Behavior lives in the sibling
// modules; this file is only the vocabulary they all speak.

/** A file's path and its contents, as read into the scan context. */
export interface FileContent {
  path: string;
  content: string;
}

/** Everything scanContext() gathered about a project. */
export interface ProjectContext {
  name: string;
  description?: string;
  rootDir: string;
  configFiles: FileContent[];
  visionFiles: FileContent[];
  entryPoints: FileContent[];
  sourceFiles: FileContent[];
  directoryTree: string;
  omittedFiles: string[];
}

/** sha256 + byte size of a file that fed the docs — the unit of the fingerprint. */
export interface FileFingerprint {
  hash: string;
  size: number;
}

export interface GitInfo {
  commit: string;
  branch: string;
  dirty: boolean;
}

/** Per-file distilled notes, keyed by path, so /sync only re-distills what changed. */
export interface DistillCache {
  model: string;
  files: Record<string, { hash: string; notes: string }>;
}

/** Progress callbacks for the distillation pass. */
export interface DistillHooks {
  /** Called once we know how many files need distilling. */
  onStart?: (batches: number) => void;
  /** Called after each file is distilled (1-indexed). */
  onBatch?: (index: number, total: number) => void;
}

// --- Docs catalog ---

export type DocSection = "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific";

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
  /** The doc-specific contract — what this document must contain. */
  prompt: string;
  /** Human guides use the narrative base instead of the machine base. */
  human?: boolean;
}

/** A doc proposed by the planner LLM that doesn't fit the fixed catalog. */
export interface CustomDocSpec {
  /** Sanitized, relative to docs/ — e.g. "deployment/build-pipeline.md". */
  path: string;
  title: string;
  focus: string;
}

export type DocIndexEntry = Pick<DocDefinition, "outputPath" | "title" | "section" | "summary">;

// --- Snapshot & sync ---

/** Metadata stored per doc in the snapshot — enough to rebuild the index and regenerate. */
export interface DocMeta {
  id: string;
  outputPath: string;
  title: string;
  section: DocSection;
  summary: string;
}

/** `.aether/settings/context.json` — the point a genesis/sync run was taken from. */
export interface Snapshot {
  generatedAt: string;
  provider: string;
  model: string;
  git?: GitInfo;
  files: Record<string, FileFingerprint>;
  docs: DocMeta[];
}

export interface FileDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

/** A sync plan: existing docs to refresh, and brand-new docs to add. Never deletes. */
export interface SyncPlan {
  regenerate: DocDefinition[];
  add: DocDefinition[];
}

/** One section to write when patching a doc: replace an existing heading, or add a new one. */
export interface SectionPatch {
  /** Heading of the section to write (with or without leading #). */
  heading: string;
  /** Full markdown for that section, including its ## heading line. */
  content: string;
  /** For a new section: the existing heading it should be placed after. */
  after?: string;
}
