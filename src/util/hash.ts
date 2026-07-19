import { createHash } from "node:crypto";

/**
 * sha256 of content with line endings normalized to LF. Hashing the raw bytes would
 * make a CRLF↔LF flip (common on Windows / via git autocrlf / editors) look like a
 * real change — inflating the /sync diff and busting the distill cache. Normalizing
 * first keeps the hash tied to the actual content.
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}
