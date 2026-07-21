import { envInt } from "../util/env.js";

// Env-overridable tuning knobs for the genesis/sync pipeline — one home for every AETHER_* limit.

/** Per-file size ceiling for the scan. */
export const MAX_FILE_SIZE = envInt("AETHER_MAX_FILE_SIZE", 128_000);
/** Total character budget across all scanned files. */
export const MAX_TOTAL_CHARS = envInt("AETHER_MAX_TOTAL_CHARS", 2_000_000);
/** Safety ceiling on how many files the walker visits. */
export const MAX_FILES_WALKED = envInt("AETHER_MAX_FILES_WALKED", 10_000);
/** Max directory depth walked. */
export const MAX_WALK_DEPTH = envInt("AETHER_MAX_WALK_DEPTH", 12);

/**
 * Char budget for the shared generation context. If the whole project fits under this,
 * it's sent as real code; above it, the project is distilled once. Sized conservatively
 * (~12K tokens) so it fits small/free models.
 */
export const DOC_CONTEXT_BUDGET = envInt("AETHER_DOC_CONTEXT_CHARS", 48_000);

/** How many docs to generate concurrently. */
export const GEN_CONCURRENCY = envInt("AETHER_GEN_CONCURRENCY", 4);
/** How many files to distill concurrently. */
export const DISTILL_CONCURRENCY = envInt("AETHER_DISTILL_CONCURRENCY", 4);

/** Char budget for the batched clean-code review prompt (source files only). */
export const CLEANCODE_CONTEXT_BUDGET = envInt("AETHER_CLEANCODE_CONTEXT_CHARS", 48_000);
