import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { loadSnapshot } from "../genesis/sync.js";
import { SECTION_ORDER } from "../genesis/docs.js";
import type { DocMeta } from "../genesis/types.js";
import { renderMarkdown, htmlToText, escapeHtml, type LinkResolver } from "./markdown.js";
import { MERMAID_CDN_URL, THEME_BOOT_JS, VIEWER_CSS, VIEWER_JS } from "./template.js";

/**
 * Builds `.aether/docs.html` — a single-file, browsable viewer for the generated
 * docs with sidebar navigation, full-text search, and cross-doc links. Purely
 * deterministic: reads the markdown already on disk, costs zero tokens, and is
 * always safe to regenerate.
 */

interface PageEntry {
  id: string;
  path: string; // relative to docs/, e.g. "guides/getting-started.md"
  title: string;
  section: string;
  summary: string;
  html: string;
  text: string;
}

export interface HtmlBuildResult {
  outputPath: string;
  pages: number;
}

export function htmlDocsPath(rootDir: string): string {
  return join(rootDir, ".aether", "docs.html");
}

/** Whether the project opted into the HTML viewer — /sync auto-refreshes it if so. */
export function hasHtmlDocs(rootDir: string): boolean {
  return existsSync(htmlDocsPath(rootDir));
}

export async function buildHtmlDocs(rootDir: string): Promise<HtmlBuildResult | null> {
  const snapshot = await loadSnapshot(rootDir);
  const docsDir = join(rootDir, ".aether", "docs");
  if (!snapshot || snapshot.docs.length === 0 || !existsSync(docsDir)) return null;

  // Gather readable sources — the index page first, then docs grouped by section.
  const sources: Array<{ meta: DocMeta | null; relPath: string; md: string }> = [];
  const readme = await readFileSafe(join(docsDir, "README.md"));
  if (readme) sources.push({ meta: null, relPath: "README.md", md: readme });

  for (const meta of orderDocs(snapshot.docs)) {
    const md = await readFileSafe(join(rootDir, ".aether", meta.outputPath));
    if (md) sources.push({ meta, relPath: meta.outputPath.replace(/^docs\//, ""), md });
  }
  if (sources.length === 0) return null;

  const idByPath = new Map(sources.map((s) => [s.relPath, pageId(s.relPath)]));

  const pages: PageEntry[] = sources.map((s) => {
    const id = pageId(s.relPath);
    const html = renderMarkdown(s.md, makeResolver(idByPath, id, posixDirname(s.relPath)));
    return {
      id,
      path: s.relPath,
      title: s.meta?.title ?? "Overview",
      section: s.meta?.section ?? "Home",
      summary: s.meta?.summary ?? "Documentation index.",
      html,
      text: htmlToText(html),
    };
  });

  const project = snapshot.project ?? projectName(rootDir, readme);
  const output = assemblePage(project, pages);
  await writeFile(htmlDocsPath(rootDir), output, "utf-8");
  return { outputPath: htmlDocsPath(rootDir), pages: pages.length };
}

// --- Helpers ---

async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

/** Snapshot docs in sidebar order: known sections first, unknown ones appended. */
function orderDocs(docs: DocMeta[]): DocMeta[] {
  const known = SECTION_ORDER.flatMap((section) => docs.filter((d) => d.section === section));
  const rest = docs.filter((d) => !SECTION_ORDER.includes(d.section));
  return [...known, ...rest];
}

function pageId(relPath: string): string {
  return relPath === "README.md" ? "index" : relPath.replace(/\.md$/i, "");
}

function posixDirname(relPath: string): string {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}

/** Resolves "../a/b.md" style hrefs against the current page's directory. */
function resolveRelative(fromDir: string, href: string): string {
  const parts = fromDir ? fromDir.split("/") : [];
  for (const seg of href.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/**
 * Maps markdown hrefs to viewer routes: cross-doc .md links become hash routes,
 * in-page anchors keep working, external links open in a new tab. Anything the
 * viewer can't resolve is left untouched.
 */
function makeResolver(idByPath: Map<string, string>, currentId: string, currentDir: string): LinkResolver {
  return (href) => {
    if (/^(https?:)?\/\//i.test(href) || href.startsWith("mailto:")) return { href, external: true };
    if (href.startsWith("#")) return { href: `#/${currentId}?h=${href.slice(1)}` };
    const m = href.match(/^([^#?]+\.md)(?:#(.*))?$/i);
    if (!m) return null;
    const id = idByPath.get(resolveRelative(currentDir, decodeURIComponent(m[1])));
    if (!id) return null;
    return { href: m[2] ? `#/${id}?h=${m[2]}` : `#/${id}` };
  };
}

/** The docs index title is "<name> — Documentation"; fall back to the folder name. */
function projectName(rootDir: string, readme: string | null): string {
  const match = readme?.match(/^#\s+(.+?)\s+—\s+Documentation\s*$/m);
  return match?.[1] ?? basename(rootDir);
}

function buildSidebar(pages: PageEntry[]): string {
  const parts: string[] = [];
  const home = pages.find((p) => p.id === "index");
  if (home) {
    parts.push(`<a class="nav-link nav-home" data-id="index" href="#/index">${escapeHtml(home.title)}</a>`);
  }

  const extraSections = [...new Set(pages.map((p) => p.section))].filter(
    (s) => s !== "Home" && !SECTION_ORDER.includes(s as (typeof SECTION_ORDER)[number]),
  );
  for (const section of [...SECTION_ORDER, ...extraSections]) {
    const inSection = pages.filter((p) => p.section === section);
    if (inSection.length === 0) continue;
    parts.push(`<div class="nav-section">${escapeHtml(section)}</div>`);
    for (const p of inSection) {
      parts.push(
        `<a class="nav-link" data-id="${escapeHtml(p.id)}" href="#/${escapeHtml(p.id)}" title="${escapeHtml(p.summary)}">${escapeHtml(p.title)}</a>`,
      );
    }
  }
  return parts.join("\n");
}

function assemblePage(project: string, pages: PageEntry[]): string {
  const hasMermaid = pages.some((p) => p.html.includes('class="mermaid-block"'));
  const data = {
    project,
    generatedAt: new Date().toISOString(),
    mermaidCdn: MERMAID_CDN_URL,
    hasMermaid,
    pages: pages.map(({ id, title, section, summary, html, text }) => ({ id, title, section, summary, html, text })),
  };
  // Escaping every "<" keeps "</script>" (and any markup) inert inside the JSON island.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const date = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project)} — Documentation</title>
<script>${THEME_BOOT_JS}</script>
<style>${VIEWER_CSS}</style>
</head>
<body>
<header class="topbar">
  <button id="nav-toggle" class="icon-btn" aria-label="Toggle navigation">☰</button>
  <div class="brand"><span class="brand-bolt">⚡</span> ${escapeHtml(project)}<span class="brand-dim"> · docs</span></div>
  <button id="theme-toggle" class="icon-btn" aria-label="Toggle theme">◐</button>
</header>
<div class="layout">
  <aside id="sidebar">
    <div class="search-wrap"><input id="search" type="search" placeholder="Search docs…  ( / )" autocomplete="off"></div>
    <div id="search-results" class="hidden"></div>
    <nav id="nav">
${buildSidebar(pages)}
    </nav>
    <div class="sidebar-foot">Generated by <a href="https://github.com/aether-one/aether" target="_blank" rel="noopener">Aether</a> · ${date}</div>
  </aside>
  <main id="main"><article id="content" class="content"></article></main>
</div>
<script id="aether-data" type="application/json">${json}</script>
<script>${VIEWER_JS}</script>
</body>
</html>
`;
}
