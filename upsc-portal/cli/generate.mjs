#!/usr/bin/env node
/* ============================================================================
   studyUPSC — CLI: content scanner + catalog builder (HTML-only site)
   ----------------------------------------------------------------------------
   Walks upsc-portal/content/ and generates:
     assets/js/file-index.js   -> window.CONTENT_INDEX (files) + window.CONTENT_DIRS
     assets/js/search-data.js  -> window.SEARCH_DATA   (title + text snippets)
     content/index.html        -> printable catalog of every document

   The site is HTML-only: every document is a styled, self-contained .html
   page. There are no Markdown sources anywhere in the repository.

   Usage (from upsc-portal/):
     node cli/generate.mjs            # scan + rebuild indexes + catalog
     node cli/generate.mjs --sync     # also ensure the 5-section scaffold
                                      # (folders + .gitkeep only — no READMEs)
     node cli/audit.mjs               # verify completeness + link integrity
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const OUT_INDEX = path.join(ROOT, 'assets', 'js', 'file-index.js');
const OUT_SEARCH = path.join(ROOT, 'assets', 'js', 'search-data.js');
const OUT_CATALOG = path.join(CONTENT, 'index.html');

/* Folder-name -> syllabus-id aliases. Everything else maps to itself. */
const FOLDER_ALIASES = {
  'gs-1-heritage-geography-society': 'gs-1',
  'gs-2-polity-governance-ir': 'gs-2',
  'gs-3-economy-tech-environment': 'gs-3',
  'gs-4-ethics-integrity-aptitude': 'gs-4',
  'gs1': 'prelims-gs1',
  'prelims-gs1': 'prelims-gs1',
  'csat': 'prelims-csat',
  'mocks': 'prelims-mocks',
  'practice': 'mains-practice',
  'essay-frameworks': 'essay',
  'essay': 'essay',
  'optional-subjects': 'optional-subjects',
  'detailed-notes': 'notes',
  'short-notes': 'short',
  'bullet-points': 'bullets',
  'mindmaps': 'bullets',
  'diagrams': 'diagrams',
  'maps': 'diagrams',
  'pyqs': 'pyqs',
  'prelims': '',   // container folder — dropped from nav paths
  'mains': ''      // container folder — dropped from nav paths
};

const TEXT_EXTS = new Set(['html', 'htm', 'txt', 'md']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']);
const PDF_EXTS = new Set(['pdf']);

function slugify(seg) {
  return (Object.prototype.hasOwnProperty.call(FOLDER_ALIASES, seg) ? FOLDER_ALIASES[seg] : seg)
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function kindOf(file, ext) {
  if (TEXT_EXTS.has(ext)) return 'doc';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (PDF_EXTS.has(ext)) return 'pdf';
  if (file === '.gitkeep' || file.startsWith('.')) return 'meta';
  return 'other';
}

function walk(dir, base) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }));
  const out = [];
  for (const e of entries) {
    if (e.name === '.DS_Store') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(abs, base));
    else out.push({ file: e.name, abs, rel: path.relative(base, abs).split(path.sep).join('/') });
  }
  return out;
}

/* Folder aliases exist to translate two *kinds* of segment:
     - the paper/container folder (first segment after content/{stage}/)
     - the section folder (last segment: detailed-notes -> notes, etc.)
   They must NOT be applied to intermediate topic folders, or a leaf whose
   folder name collides with a container alias gets collapsed onto its parent
   (e.g. essay-frameworks/essay-frameworks -> "essay/essay" instead of
   "essay/essay-frameworks", orphaning it from the syllabus tree). */
const SECTION_ALIASES = new Set(['detailed-notes', 'short-notes', 'bullet-points', 'mindmaps', 'diagrams', 'maps', 'pyqs']);

function plainSlug(seg) {
  return seg.replace(/\.md$/i, '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function navOf(rel) {
  const parts = rel.split('/').slice(0, -1)            // drop filename
    .filter(p => p !== 'content' && p !== 'prelims' && p !== 'mains');
  const out = [];
  parts.forEach((p, i) => {
    const isPaper = i === 0;
    const isSection = i === parts.length - 1 && SECTION_ALIASES.has(p);
    out.push(isPaper || isSection ? slugify(p) : plainSlug(p));
  });
  return out.filter(Boolean).join('/');
}

function dirEntries(files, base) {
  const map = new Map();
  for (const f of files) {
    const dir = path.dirname(f.rel);
    if (dir === '.') continue;
    if (!map.has(dir)) map.set(dir, { dir, nav: navOf(dir + '/x'), files: [] });
    map.get(dir).files.push(f);
  }
  return [...map.values()].sort((a, b) => a.dir.localeCompare(b.dir));
}

/* ------------------------------------------------------------------ */
/*  --sync : ensure the 5-section scaffold for every leaf topic        */
/*  (folders + .gitkeep only — this is an HTML-only site, so the       */
/*  scaffold no longer creates any README.md placeholder files)        */
/* ------------------------------------------------------------------ */
const SECTION_FOLDERS = ['detailed-notes', 'short-notes', 'bullet-points', 'diagrams', 'pyqs'];

function syncScaffold() {
  let created = 0;
  function walk(dir) {
    const subs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SECTION_FOLDERS.includes(e.name));
    for (const s of subs) walk(path.join(dir, s.name));
    if (subs.length === 0) {
      for (const sec of SECTION_FOLDERS) {
        const secPath = path.join(dir, sec);
        if (fs.existsSync(secPath)) continue;
        fs.mkdirSync(secPath, { recursive: true });
        fs.writeFileSync(path.join(secPath, '.gitkeep'), '');
        created++;
      }
    }
  }
  walk(CONTENT);
  console.log(`[sync] scaffold ready: ${created} section folders ensured (folders + .gitkeep only, no Markdown).`);
}

/* ------------------------------------------------------------------ */
/*  Build file-index.js                                                */
/* ------------------------------------------------------------------ */
function buildIndex(files) {
  const entries = files
    .filter(f => kindOf(f.file, f.file.split('.').pop().toLowerCase()) !== 'meta')
    .map(f => {
      const ext = f.file.split('.').pop().toLowerCase();
      return {
        dir: path.dirname(f.rel),
        file: f.file,
        rel: f.rel,
        kind: kindOf(f.file, ext),
        ext,
        size: fs.statSync(f.abs).size,
        nav: navOf(f.rel)
      };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));
  const dirs = dirEntries(entries.map(e => ({ ...e, rel: e.rel })), ROOT);
  return { entries, dirs };
}

/* ------------------------------------------------------------------ */
/*  HTML text extraction (for search data + catalog titles)            */
/* ------------------------------------------------------------------ */
function htmlTitle(raw) {
  const t = raw.match(/<title>([^<]*)<\/title>/i);
  if (t) return t[1].replace(/\s*·\s*studyUPSC\s*$/i, '').trim();
  const h1 = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  return '';
}

/* Article body = the <div class="card"> wrapper the generator emits,
   minus the page header/footer chrome. */
function htmlArticle(raw) {
  const card = raw.match(/<div class="card">([\s\S]*?)\s*<\/div>\s*<footer>/i);
  if (card) return card[1];
  const body = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : raw;
}

function stripHtml(raw) {
  return (raw || '')
    .replace(/<(style|script|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, ' ')
    .replace(/&#x[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadingsHtml(article) {
  const out = [];
  const re = /<h([123])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(article))) {
    const text = stripHtml(m[2]);
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out.slice(0, 40);
}

/* ------------------------------------------------------------------ */
/*  Build search-data.js (title + text snippets from HTML docs)        */
/* ------------------------------------------------------------------ */
function buildSearchData(files) {
  const docs = [];
  for (const f of files) {
    const ext = f.file.split('.').pop().toLowerCase();
    if (ext !== 'html' && ext !== 'htm' && ext !== 'txt') continue; // full-text index: text documents only
    if (f.rel === 'content/index.html') continue; // the generated catalog itself
    try {
      const raw = fs.readFileSync(f.abs, 'utf8').slice(0, 60000);
      const article = ext === 'html' || ext === 'htm' ? htmlArticle(raw) : raw;
      const text = stripHtml(article);
      if (text.length < 8) continue;
      docs.push({
        nav: navOf(f.rel),
        file: f.file,
        rel: f.rel,
        title: ext === 'html' || ext === 'htm' ? htmlTitle(raw) : '',
        headings: (ext === 'html' || ext === 'htm') ? extractHeadingsHtml(article) : [],
        text: text.slice(0, 900),
        chars: text.length
      });
    } catch { /* unreadable -> skip */ }
  }
  return docs;
}

/* ------------------------------------------------------------------ */
/*  Build content/index.html — printable catalog (HTML-only)           */
/* ------------------------------------------------------------------ */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildCatalog(entries) {
  const docs = entries.filter(e => e.ext === 'html' && e.rel !== 'content/index.html');
  const byDir = new Map();
  for (const d of docs) {
    if (!byDir.has(d.dir)) byDir.set(d.dir, []);
    byDir.get(d.dir).push(d);
  }
  const dirs = [...byDir.keys()].sort((a, b) => a.localeCompare(b));

  let body = `<h1 id="content-library">Content Library</h1><p>${docs.length} documents · styled, self-contained HTML pages (read inline in the portal or print directly).</p>`;
  for (const dir of dirs) {
    const id = slugify(dir.replace(/\//g, '-'));
    const label = dir === 'content' ? 'content' : dir.replace(/^content\//, '');
    body += `<h2 id="${esc(id)}">${esc(label)}</h2><ul>\n`;
    for (const d of byDir.get(dir)) {
      let title = '';
      try { title = htmlTitle(fs.readFileSync(d.rel, 'utf8')); } catch { /* ignore */ }
      if (!title) title = d.file.replace(/\.html$/i, '').replace(/[-_]/g, ' ');
      body += `<li><a href="${esc(d.rel.replace(/^content\//, ''))}">${esc(title)}</a></li>\n`;
    }
    body += `</ul>\n`;
  }

  const CSS = `:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#f59e0b;--bg:#f8fafc;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:32px 20px 80px}
header{border-bottom:1px solid var(--line);padding:14px 0;margin-bottom:24px;background:var(--card)}
header .wrap{padding:0 20px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px}
.brand span{color:var(--accent)}
.crumb{font-size:12px;color:var(--sub)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 34px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
h1{font-size:26px;line-height:1.25;margin:.2em 0 .5em}
h2{font-size:20px;margin:1.4em 0 .5em;border-bottom:1px solid var(--line);padding-bottom:.25em}
h3{font-size:17px;margin:1.2em 0 .4em}
a{color:#b45309;text-decoration:none}a:hover{text-decoration:underline}
ul,ol{padding-left:1.5em}
li{margin:.25em 0}
hr{border:none;border-top:1px solid var(--line);margin:1.6em 0}
footer{color:#94a3b8;font-size:12px;margin-top:40px;text-align:center}
@media print{body{background:#fff}.card{border:none;padding:0}.no-print{display:none}}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Content Library — All Documents · studyUPSC</title>
<style>
${CSS}
</style>
</head>
<body>
<header><div class="wrap"><div class="brand">study<span>UPSC</span></div><div class="crumb">content library catalog</div><div class="crumb no-print" style="margin-left:auto"><a href="../index.html">📚 Portal home</a></div></div></header>
<div class="wrap"><div class="card">
${body}</div>
<footer>studyUPSC · print-friendly (Ctrl/Cmd+P)</footer>
</div>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
if (args.includes('--sync')) syncScaffold();

const files = walk(CONTENT, ROOT); // rel paths include the content/ prefix (site-relative)
const { entries, dirs } = buildIndex(files);
const docs = buildSearchData(files);

fs.writeFileSync(OUT_INDEX,
  `/* AUTO-GENERATED by cli/generate.mjs — do not edit by hand. */\n` +
  `window.CONTENT_INDEX = ${JSON.stringify(entries, null, 1)};\n\n` +
  `window.CONTENT_DIRS = ${JSON.stringify(dirs, null, 1)};\n`);

fs.writeFileSync(OUT_SEARCH,
  `/* AUTO-GENERATED by cli/generate.mjs — do not edit by hand. */\n` +
  `window.SEARCH_DATA = ${JSON.stringify(docs)};\n`);

fs.writeFileSync(OUT_CATALOG, buildCatalog(entries));

console.log(`[index]  ${entries.length} files indexed (${entries.filter(e => e.kind === 'doc').length} docs, ${entries.filter(e => e.kind === 'image').length} images)`);
console.log(`[search] ${docs.length} documents full-text indexed`);
console.log(`[catalog] ${OUT_CATALOG.replace(ROOT + '/', '')} rebuilt`);
