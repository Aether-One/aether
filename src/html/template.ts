import { ACCENT_HEX } from "../ui/theme.js";

/**
 * Static assets for the docs.html viewer — CSS and client-side JS as string
 * constants, kept out of build.ts per the project's content-in-modules rule.
 *
 * The client JS is written without backticks or ${ sequences so it can live
 * inside a template literal safely.
 */

/** Mermaid is the one external dependency — CDN with a graceful offline fallback. */
export const MERMAID_CDN_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

/** Runs in <head> before paint so the saved theme never flashes. */
export const THEME_BOOT_JS = `
(function () {
  var saved = null;
  try { saved = localStorage.getItem('aether-theme'); } catch (e) {}
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved === 'light' || saved === 'dark' ? saved : (dark ? 'dark' : 'light'));
})();
`;

export const VIEWER_CSS = `
:root[data-theme="light"] {
  --bg: #ffffff; --bg-alt: #f7f7fb; --border: #e6e6ef;
  --text: #26263c; --text-dim: #6d6d84;
  --accent: ${ACCENT_HEX}; --accent-soft: rgba(137, 91, 244, 0.10);
  --code-bg: #f4f2fb; --mark: #ffe9a3; --shadow: rgba(20, 20, 40, 0.08);
}
:root[data-theme="dark"] {
  --bg: #14141f; --bg-alt: #1b1b29; --border: #2a2a3d;
  --text: #e8e8f2; --text-dim: #9a9ab0;
  --accent: #a685f7; --accent-soft: rgba(137, 91, 244, 0.18);
  --code-bg: #20202f; --mark: #6b5518; --shadow: rgba(0, 0, 0, 0.4);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.hidden { display: none !important; }

.topbar {
  position: fixed; top: 0; left: 0; right: 0; height: 52px; z-index: 30;
  display: flex; align-items: center; gap: 10px; padding: 0 16px;
  background: var(--bg); border-bottom: 1px solid var(--border);
}
.brand { font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand-bolt { color: var(--accent); }
.brand-dim { color: var(--text-dim); font-weight: 400; }
.icon-btn {
  border: 1px solid var(--border); background: var(--bg-alt); color: var(--text);
  border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 15px;
  flex: none;
}
.icon-btn:hover { border-color: var(--accent); color: var(--accent); }
#nav-toggle { display: none; }

.layout { display: flex; padding-top: 52px; min-height: 100vh; }

#sidebar {
  position: fixed; top: 52px; bottom: 0; left: 0; width: 290px; z-index: 20;
  display: flex; flex-direction: column;
  background: var(--bg-alt); border-right: 1px solid var(--border);
}
.search-wrap { padding: 14px 14px 8px; }
#search {
  width: 100%; padding: 8px 12px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  font-size: 14px; outline: none;
}
#search:focus { border-color: var(--accent); }
#nav, #search-results { flex: 1; overflow-y: auto; padding: 4px 10px 12px; }
.nav-section {
  margin: 16px 6px 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--text-dim);
}
.nav-link {
  display: block; padding: 6px 10px; margin: 1px 0; border-radius: 7px;
  color: var(--text); text-decoration: none; font-size: 14px;
}
.nav-link:hover { background: var(--accent-soft); }
.nav-link.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.nav-home { margin-top: 10px; font-weight: 600; }
.sidebar-foot {
  padding: 10px 16px; border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-dim);
}
.sidebar-foot a { color: var(--accent); text-decoration: none; }

.results-count { margin: 12px 6px 8px; font-size: 12px; color: var(--text-dim); }
.results-empty { margin: 12px 6px; font-size: 13px; color: var(--text-dim); }
.result {
  display: block; padding: 8px 10px; margin: 3px 0; border-radius: 8px;
  text-decoration: none; color: var(--text); border: 1px solid transparent;
}
.result:hover { background: var(--accent-soft); border-color: var(--border); }
.result-title { font-size: 14px; font-weight: 600; }
.result-count {
  float: right; font-size: 11px; color: var(--accent);
  background: var(--accent-soft); border-radius: 10px; padding: 1px 8px;
}
.result-snippet { display: block; margin-top: 2px; font-size: 12px; color: var(--text-dim); }

#main { flex: 1; margin-left: 290px; display: flex; justify-content: center; }
.content { width: 100%; max-width: 860px; padding: 28px 40px 80px; overflow-wrap: break-word; }

.content h1, .content h2, .content h3, .content h4 { line-height: 1.3; scroll-margin-top: 64px; }
.content h1 { font-size: 1.9em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.content h2 { font-size: 1.45em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; margin-top: 1.8em; }
.content h3 { font-size: 1.15em; margin-top: 1.5em; }
.content a { color: var(--accent); text-decoration: none; }
.content a:hover { text-decoration: underline; }
.content img { max-width: 100%; }
.content code {
  background: var(--code-bg); border-radius: 5px; padding: 0.15em 0.4em;
  font: 0.875em/1.5 ui-monospace, "Cascadia Code", Consolas, monospace;
}
.content pre {
  background: var(--code-bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 14px 16px; overflow-x: auto;
}
.content pre code { background: none; padding: 0; font-size: 0.85em; }
.content blockquote {
  margin: 1em 0; padding: 2px 18px; border-left: 3px solid var(--accent);
  background: var(--accent-soft); border-radius: 0 8px 8px 0; color: var(--text);
}
.content hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.table-wrap { overflow-x: auto; }
.content table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
.content th, .content td { border: 1px solid var(--border); padding: 7px 12px; text-align: left; }
.content th { background: var(--bg-alt); }
.content tr:nth-child(even) td { background: var(--bg-alt); }
mark { background: var(--mark); color: inherit; border-radius: 3px; padding: 0 2px; }

.mermaid-block {
  margin: 1.2em 0; border: 1px solid var(--border); border-radius: 10px;
  background: var(--bg-alt); padding: 14px; overflow-x: auto;
}
.mermaid-block .mermaid-src { margin: 0; border: none; background: var(--code-bg); }
.mermaid-note { font-size: 13px; color: var(--text-dim); margin-bottom: 10px; }
.mermaid-target { text-align: center; }
.mermaid-target svg { max-width: 100%; height: auto; }

@media (max-width: 900px) {
  #nav-toggle { display: block; }
  #sidebar { transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: 4px 0 20px var(--shadow); }
  body.nav-open #sidebar { transform: translateX(0); }
  #main { margin-left: 0; }
  .content { padding: 20px 20px 60px; }
}
`;

export const VIEWER_JS = String.raw`
(function () {
  'use strict';
  var data = JSON.parse(document.getElementById('aether-data').textContent);
  var byId = Object.create(null);
  for (var i = 0; i < data.pages.length; i++) byId[data.pages[i].id] = data.pages[i];

  var content = document.getElementById('content');
  var nav = document.getElementById('nav');
  var results = document.getElementById('search-results');
  var searchInput = document.getElementById('search');

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeReg(s) {
    return s.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
  }
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function slug(s) {
    return norm(s).replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  // --- Routing: #/page-id?h=anchor&q=term ---
  function parseHash() {
    var h = location.hash || '';
    if (h.indexOf('#/') !== 0) return { id: data.pages[0].id, params: new URLSearchParams('') };
    var rest = h.slice(2);
    var qi = rest.indexOf('?');
    var id = qi === -1 ? rest : rest.slice(0, qi);
    var params = new URLSearchParams(qi === -1 ? '' : rest.slice(qi + 1));
    return { id: decodeURIComponent(id), params: params };
  }

  function setActive(id) {
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle('active', links[i].getAttribute('data-id') === id);
    }
  }

  function renderRoute() {
    var route = parseHash();
    var page = byId[route.id] || data.pages[0];
    content.innerHTML = page.html;
    document.title = page.title + ' — ' + data.project;
    setActive(page.id);
    document.body.classList.remove('nav-open');

    var q = route.params.get('q');
    if (q) highlightTerm(content, q);

    if (data.hasMermaid && content.querySelector('.mermaid-block')) queueMermaid();

    var anchor = route.params.get('h');
    var el = null;
    if (anchor) el = document.getElementById('md-' + anchor) || document.getElementById('md-' + slug(anchor));
    if (el) el.scrollIntoView();
    else if (!q) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', renderRoute);

  // --- Mermaid: loaded from CDN on demand, falls back to source when offline ---
  var mermaidState = 'idle';
  var mermaidSeq = 0;

  function queueMermaid() {
    if (mermaidState === 'ready') { renderMermaidBlocks(); return; }
    if (mermaidState === 'failed') { markMermaidFailed(); return; }
    if (mermaidState === 'loading') return; // onload renders whatever page is current
    mermaidState = 'loading';
    var s = document.createElement('script');
    s.src = data.mermaidCdn;
    s.onload = function () {
      mermaidState = 'ready';
      initMermaid();
      renderMermaidBlocks();
    };
    s.onerror = function () { mermaidState = 'failed'; markMermaidFailed(); };
    document.head.appendChild(s);
    setTimeout(function () {
      if (mermaidState === 'loading') { mermaidState = 'failed'; markMermaidFailed(); }
    }, 12000);
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function initMermaid() {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: currentTheme() === 'dark' ? 'dark' : 'default'
    });
  }

  function renderMermaidBlocks() {
    var blocks = content.querySelectorAll('.mermaid-block:not([data-rendered])');
    for (var i = 0; i < blocks.length; i++) renderOneMermaid(blocks[i]);
  }

  function renderOneMermaid(block) {
    var srcEl = block.querySelector('.mermaid-src');
    var target = block.querySelector('.mermaid-target');
    if (!srcEl || !target) return;
    block.setAttribute('data-rendered', '1');
    mermaidSeq += 1;
    window.mermaid.render('aether-mmd-' + mermaidSeq, srcEl.textContent).then(function (res) {
      target.innerHTML = res.svg;
      target.classList.remove('hidden');
      srcEl.classList.add('hidden');
    }).catch(function () {
      showMermaidNote(block, 'This diagram could not be rendered — showing its source instead.');
    });
  }

  function markMermaidFailed() {
    var blocks = content.querySelectorAll('.mermaid-block');
    for (var i = 0; i < blocks.length; i++) {
      showMermaidNote(blocks[i], 'Rendering diagrams needs an internet connection — showing the source instead.');
    }
  }

  function showMermaidNote(block, text) {
    var note = block.querySelector('.mermaid-note');
    if (note) {
      note.textContent = '⚠ ' + text;
      note.classList.remove('hidden');
    }
  }

  // --- Theme toggle ---
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('aether-theme', next); } catch (e) {}
    if (mermaidState === 'ready') {
      initMermaid();
      renderRoute(); // re-render so diagrams pick up the new theme
    }
  });

  // --- Mobile nav ---
  document.getElementById('nav-toggle').addEventListener('click', function () {
    document.body.classList.toggle('nav-open');
  });

  // --- Search: full text across every page, accent-insensitive ---
  var searchTimer = null;
  searchInput.addEventListener('input', function () {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 120);
  });
  searchInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      searchInput.value = '';
      runSearch();
      searchInput.blur();
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== searchInput) {
      ev.preventDefault();
      searchInput.focus();
    }
  });

  function runSearch() {
    var q = searchInput.value.trim();
    if (q.length < 2) {
      results.classList.add('hidden');
      results.innerHTML = '';
      nav.classList.remove('hidden');
      return;
    }
    var nq = norm(q);
    var found = [];
    for (var i = 0; i < data.pages.length; i++) {
      var p = data.pages[i];
      var hay = norm(p.title) + ' ' + norm(p.text);
      var count = 0;
      var idx = hay.indexOf(nq);
      while (idx !== -1) {
        count += 1;
        idx = hay.indexOf(nq, idx + nq.length);
      }
      if (count === 0) continue;
      var ti = norm(p.text).indexOf(nq);
      var snippet = '';
      if (ti !== -1) {
        var start = Math.max(0, ti - 50);
        var end = Math.min(p.text.length, ti + nq.length + 70);
        snippet = (start > 0 ? '…' : '') + p.text.slice(start, end) + (end < p.text.length ? '…' : '');
      }
      found.push({ page: p, count: count, snippet: snippet });
    }
    found.sort(function (a, b) { return b.count - a.count; });
    renderResults(found, q);
  }

  function renderResults(found, q) {
    nav.classList.add('hidden');
    results.classList.remove('hidden');
    var re = new RegExp('(' + escapeReg(q) + ')', 'gi');
    var html = '<div class="results-count">' + found.length + (found.length === 1 ? ' page' : ' pages') + ' with matches</div>';
    for (var i = 0; i < found.length; i++) {
      var r = found[i];
      var snip = escapeHtml(r.snippet).replace(re, '<mark>$1</mark>');
      html += '<a class="result" href="#/' + r.page.id + '?q=' + encodeURIComponent(q) + '">' +
        '<span class="result-count">' + r.count + '</span>' +
        '<span class="result-title">' + escapeHtml(r.page.title) + '</span>' +
        (snip ? '<span class="result-snippet">' + snip + '</span>' : '') +
        '</a>';
    }
    if (found.length === 0) html += '<div class="results-empty">No matches. Try a different term.</div>';
    results.innerHTML = html;
  }

  // --- In-page term highlighting after a search jump ---
  function highlightTerm(root, q) {
    var re = new RegExp(escapeReg(q), 'gi');
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!parent || parent.closest('.mermaid-block')) continue;
      if (re.test(node.nodeValue)) nodes.push(node);
      re.lastIndex = 0;
    }
    var wrapRe = new RegExp('(' + escapeReg(q) + ')', 'gi');
    for (var i = 0; i < nodes.length; i++) {
      var span = document.createElement('span');
      span.innerHTML = escapeHtml(nodes[i].nodeValue).replace(wrapRe, '<mark>$1</mark>');
      nodes[i].parentNode.replaceChild(span, nodes[i]);
    }
    var first = root.querySelector('mark');
    if (first) first.scrollIntoView({ block: 'center' });
  }

  renderRoute();
})();
`;
