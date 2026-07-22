/**
 * Deterministic Markdown → HTML renderer for the docs viewer — no LLM, no deps.
 * Covers the constructs the doc prompts produce: headings, fenced code (incl.
 * mermaid), lists, tables, blockquotes, links, and inline emphasis.
 */

/** Where a markdown link should point in the rendered page. */
export interface ResolvedLink {
  href: string;
  /** External links open in a new tab. */
  external?: boolean;
}

/** Maps a raw markdown href to a viewer href. `null` keeps the href as-is. */
export type LinkResolver = (href: string) => ResolvedLink | null;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** GitHub-style heading slug (accent-stripped so pt-BR headings link cleanly). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function renderMarkdown(md: string, resolveLink: LinkResolver): string {
  const slugCounts = new Map<string, number>();
  return renderBlocks(md.replace(/\r\n/g, "\n").split("\n"), resolveLink, slugCounts);
}

/** Plain text of a rendered page — the search corpus. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// --- Block-level parsing ---

/** Languages recognized when recovering fences that lost their backticks. */
const ORPHAN_LANGS = new Set([
  "typescript", "ts", "tsx", "javascript", "js", "jsx", "json", "bash", "sh",
  "shell", "powershell", "python", "py", "yaml", "yml", "toml", "html", "css",
  "sql", "text", "txt", "mermaid", "diff", "go", "rust", "java", "csharp",
  "c", "cpp", "xml", "ini", "dockerfile", "makefile",
]);

/** Box-drawing glyphs — a line carrying one is part of a directory tree. */
const TREE_GLYPH_RE = /[│├└]/;

function emitCode(lang: string, code: string): string {
  if (lang === "mermaid") {
    return (
      '<div class="mermaid-block">' +
      '<div class="mermaid-note hidden"></div>' +
      `<pre class="mermaid-src"><code>${escapeHtml(code)}</code></pre>` +
      '<div class="mermaid-target hidden"></div>' +
      "</div>"
    );
  }
  const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
  return `<pre><code${cls}>${escapeHtml(code)}</code></pre>`;
}

function renderBlocks(lines: string[], resolve: LinkResolver, slugCounts?: Map<string, number>): string {
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = (): void => {
    if (para.length === 0) return;
    out.push(`<p>${renderInline(para.join(" "), resolve)}</p>`);
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code — mermaid fences become renderable diagram blocks.
    const fence = line.match(/^\s{0,3}```\s*(\S*)\s*$/);
    if (fence) {
      flushPara();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s{0,3}```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(emitCode(fence[1].toLowerCase(), buf.join("\n")));
      continue;
    }

    // Fences that lost their backticks — a legacy sync bug turned ``` into a
    // single space, leaving " lang" as opener and a lone " " as closer. Recover
    // them as real code blocks instead of merging code into paragraphs.
    const orphan = line.match(/^ ([a-z0-9+#-]*) *$/i);
    if (orphan) {
      const lang = orphan[1].toLowerCase();
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^#{1,6}\s/.test(lines[j])) break;
        if (/^ +$/.test(lines[j])) {
          end = j;
          break;
        }
      }
      const body = end === -1 ? [] : lines.slice(i + 1, end);
      const firstContent = body.find((l) => l.trim() !== "");
      // A named language is proof enough; a bare " " opener only counts when the
      // block looks like the JSON payloads those fences used to wrap.
      const recover =
        firstContent !== undefined &&
        (ORPHAN_LANGS.has(lang) || (lang === "" && /^[[{]/.test(firstContent.trim())));
      if (recover) {
        flushPara();
        out.push(emitCode(ORPHAN_LANGS.has(lang) ? lang : "", body.join("\n")));
        i = end;
        continue;
      }
    }

    // Box-drawing directory trees — models often emit them unfenced; render as
    // code so the layout survives instead of collapsing into a paragraph.
    if (TREE_GLYPH_RE.test(line)) {
      // A one-line pending paragraph like "aether/" is the tree's root — pull it in.
      const root = para.length === 1 && /\/\s*$/.test(para[0]) ? para.pop()! : null;
      flushPara();
      const buf = root ? [root] : [];
      while (i < lines.length && TREE_GLYPH_RE.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i--;
      out.push(`<pre class="tree"><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Headings — carry a stable id so cross-doc anchors and search can land on them.
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushPara();
      const level = heading[1].length;
      let slug = slugify(heading[2]);
      if (slugCounts) {
        const n = slugCounts.get(slug) ?? 0;
        slugCounts.set(slug, n + 1);
        if (n > 0) slug = `${slug}-${n}`;
      }
      out.push(`<h${level} id="md-${slug}">${renderInline(heading[2], resolve)}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      flushPara();
      out.push("<hr>");
      continue;
    }

    // Blockquote — collect the run and recurse.
    if (/^\s*>/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      i--;
      out.push(`<blockquote>${renderBlocks(buf, resolve)}</blockquote>`);
      continue;
    }

    // Table — a header row followed by a |---| delimiter row.
    if (line.includes("|") && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      flushPara();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      const head = header.map((c) => `<th>${renderInline(c, resolve)}</th>`).join("");
      const body = rows
        .map((cells) => `<tr>${cells.map((c) => `<td>${renderInline(c, resolve)}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }

    // Lists — collect the contiguous run (items + indented continuations).
    if (/^(\s*)([-*+]|\d+\.)\s+/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && (/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        buf.push(lines[i]);
        i++;
      }
      i--;
      out.push(renderList(buf, resolve));
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      continue;
    }

    para.push(line.trim());
  }

  flushPara();
  return out.join("\n");
}

function isTableDelimiter(line: string): boolean {
  return /-/.test(line) && /^[\s|:\-]+$/.test(line);
}

/** Splits a table row on pipes, except pipes inside `code spans`. */
function splitRow(line: string): string[] {
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (const ch of s) {
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function renderList(lines: string[], resolve: LinkResolver): string {
  const items: Array<{ ordered: boolean; lines: string[] }> = [];
  let baseIndent = -1;

  for (const raw of lines) {
    const m = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (m) {
      const indent = m[1].length;
      if (baseIndent === -1) baseIndent = indent;
      if (indent <= baseIndent) {
        items.push({ ordered: /^\d+\.$/.test(m[2]), lines: [m[3]] });
        continue;
      }
    }
    // Deeper item or continuation — belongs to the previous item, de-indented.
    if (items.length > 0) {
      items[items.length - 1].lines.push(raw.slice(Math.min(raw.length, baseIndent + 2)));
    }
  }

  if (items.length === 0) return "";
  const tag = items[0].ordered ? "ol" : "ul";
  const body = items
    .map((item) => {
      const [first, ...rest] = item.lines;
      let inner = renderInline(first, resolve);
      if (rest.length > 0) inner += renderBlocks(rest, resolve);
      return `<li>${inner}</li>`;
    })
    .join("");
  return `<${tag}>${body}</${tag}>`;
}

// --- Inline rendering ---

function renderInline(text: string, resolve: LinkResolver): string {
  // Protect code spans first so their contents never match other inline rules.
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = escapeHtml(out);

  // Images before links (same bracket syntax).
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, alt: string, src: string) => `<img src="${src}" alt="${alt}" loading="lazy">`,
  );

  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+?)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, label: string, href: string) => {
      const resolved = resolve(href);
      if (!resolved) return `<a href="${href}">${label}</a>`;
      const extra = resolved.external ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${resolved.href}"${extra}>${label}</a>`;
    },
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, "$1<em>$2</em>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return out.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => codes[Number(idx)]);
}
