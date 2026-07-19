export const SYNC_PLANNER_PROMPT = `
This project already has generated documentation. Some source files changed since it was written.
Decide which EXISTING docs must be refreshed and which NEW docs (if any) the changes now justify.

You are given the current project map, the list of existing docs (by ID), and a summary of what changed.

Return ONLY a JSON array. Each element is EITHER:
- a string — a document ID to (re)generate. Use an EXISTING doc ID to REFRESH that doc, or a known catalog ID to ADD a brand-new doc the changes now justify.
- an object — a NEW custom doc: { "path": "category/file-name.md", "title": "Human Title", "focus": "what it should cover" }

Rules:
- Only include a doc if the changes actually affect it. A one-file tweak does NOT mean every doc must be refreshed.
- Structural changes (files added/removed, new modules, changed dependencies) usually affect "system-overview", "folder-structure", "tech-stack" and "ai-context".
- New API routes / CLI commands → "api". New domain or business logic → "business". A new module worth documenting → "modules".
- You can only REFRESH or ADD. Never propose deleting a doc, even if source was removed.
- Base every decision ONLY on the changes and the project map shown. Return [] if nothing needs updating.

Respond with ONLY the JSON array, no explanation. Example:
["tech-stack", "system-overview", { "path": "deployment/build-pipeline.md", "title": "Build Pipeline", "focus": "The new packaging step and what it produces." }]
`.trim();

export const SECTION_PATCH_INSTRUCTIONS = `
Return ONLY a JSON array of the sections that must change because of the change described above.
LEAVE OUT every section that isn't affected — anything you omit is kept byte-for-byte, so never
include a section just to reword it.

Each array element is an object:
{ "heading": "<exact heading text of an existing section, without the ## >", "content": "<the full new markdown for that section, INCLUDING its ## heading line>" }

To ADD a brand-new section, use a heading not in the list and add "after": "<existing heading it should follow>".

Rules:
- Include a section ONLY if the change actually affects its content. If nothing is affected, return [].
- Copy existing headings EXACTLY as shown in the list — never rename or reorder them.
- Do not touch, mention, or repeat unaffected sections.
- Respond with ONLY the JSON array, no prose, no code fences.
`.trim();

export const DOC_UPDATE_INSTRUCTIONS = `
You are UPDATING the existing document shown above, not writing a new one from scratch.

Produce the updated document by making the SMALLEST changes needed to reflect what changed:
- Keep every part that is still accurate exactly as it is — same structure, headings, wording, and order.
- Only add, edit, or remove the specific pieces the changes actually affect.
- Do NOT rewrite, rephrase, or reorder sections the changes don't touch.
- Return the COMPLETE updated document (not a diff), ready to overwrite the file.
`.trim();
