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
import { niceLabel, compareStudyOrder, isSectionFolder } from './names.mjs';

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
   minus the page header/footer chrome (site nav uses classed footers). */
function htmlArticle(raw) {
  const card = raw.match(/<div class="card">([\s\S]*?)\s*<\/div>\s*<footer(?:\s[^>]*)?>/i);
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

  /* Nested directory tree (every folder keeps its own deep-link anchor). */
  const root = { name: 'content', children: new Map(), files: [] };
  for (const dir of byDir.keys()) {
    const parts = dir.split('/').filter(Boolean); // first segment is always 'content'
    let node = root;
    for (const p of parts.slice(1)) {
      if (!node.children.has(p)) node.children.set(p, { name: p, children: new Map(), files: [] });
      node = node.children.get(p);
    }
    node.files = byDir.get(dir) || [];
  }

  const anchorOf = (parts) => 'content-' + parts.join('-');

  const STAGE_INTRO = {
    prelims: 'Stage 1 · Start here. The objective screening test — six GS Paper I subjects in order, then CSAT basics, then timed mocks.',
    mains: 'Stage 2 · After Prelims. Nine written papers — GS I–IV and the Essay first, then your one Optional, with daily answer-writing practice.',
  };
  const AREA_GUIDE = {
    gs1: 'The scored Prelims paper. Study the six subjects top-to-bottom — each ends with PYQs.',
    csat: 'Qualifying only (33% needed). Practice regularly, but don\u2019t let it eat GS time.',
    mocks: 'Attempt after finishing the syllabus. Full paper first, then subject sectionals.',
    'essay-frameworks': 'Two essays · 250 marks. Learn the frameworks first, then bank topics and quotes.',
    'gs-1-heritage-geography-society': 'Mains Paper II. History in chronological order, then society and geography.',
    'gs-2-polity-governance-ir': 'Mains Paper III. Constitution first, then governance, justice and world affairs.',
    'gs-3-economy-tech-environment': 'Mains Paper IV. Economy and agriculture before tech, environment and security.',
    'gs-4-ethics-integrity-aptitude': 'Mains Paper V. Theory blocks first, case-study practice last.',
    'optional-subjects': 'Pick ONE optional (2 × 250 marks). Compare syllabi before committing.',
    practice: 'Answer-writing gym. Use after studying each GS paper — 10 and 15 markers.',
  };
  /* icon, short label, filter key — one chip per format */
  const CHIP_META = {
    'detailed-notes': ['📖', 'Detailed', 'd'], notes: ['📖', 'Detailed', 'd'],
    'short-notes': ['📝', 'Short', 's'], short: ['📝', 'Short', 's'],
    'bullet-points': ['🔹', 'Bullets', 'b'], bullets: ['🔹', 'Bullets', 'b'], mindmaps: ['🔹', 'Bullets', 'b'],
    diagrams: ['🗺️', 'Diagrams', 'g'], maps: ['🗺️', 'Diagrams', 'g'],
    pyqs: ['❓', 'PYQs', 'p'],
  };

  function titleOf(d) {
    try { return htmlTitle(fs.readFileSync(d.rel, 'utf8')); } catch { /* ignore */ }
    return '';
  }
  function countDocs(node) {
    let n = (node.files || []).filter(f => f.ext === 'html').length;
    for (const c of node.children.values()) n += countDocs(c);
    return n;
  }
  function countTopics(node) {
    let n = 0;
    for (const c of node.children.values()) {
      if (isSectionFolder(c.name)) continue;
      const kids = [...c.children.values()];
      if (kids.length && kids.every(k => isSectionFolder(k.name)) && !c.files.length) n++;
      else n += countTopics(c);
    }
    return n;
  }
  /* One compact chip-link per format file present in a section folder. */
  function chipsOf(node, parts) {
    const secKids = [...node.children.values()].filter(k => isSectionFolder(k.name)).sort(compareStudyOrder(node.name));
    let html = '';
    for (const k of secKids) {
      const meta = CHIP_META[k.name] || ['📄', niceLabel(k.name), ''];
      const files = (k.files || []).filter(f => f.ext === 'html' && !/README\.html$/i.test(f.rel));
      html += `<span class="canchor" id="${esc(anchorOf(parts.concat(k.name)))}"></span>`;
      if (!files.length) continue;
      files.forEach((f, i) => {
        const title = titleOf(f);
        const label = i === 0 ? meta[1] : (title || meta[1]);
        html += `<span class="chipw"><a class="chip" data-t="${meta[2]}" href="${esc(f.rel.replace(/^content\//, ''))}" data-rel="${esc(f.rel)}" >${meta[0]} ${esc(label)}</a></span>`;
      });
    }
    return html;
  }
  /* A topic = one folder whose children are all format folders → ONE row. */
  function topicRow(node, parts, num) {
    const types = [...node.children.values()].filter(k => isSectionFolder(k.name))
      .map(k => (CHIP_META[k.name] || [])[2]).filter(Boolean);
    return `<div class="trow" id="${esc(anchorOf(parts))}" data-t="${esc([...new Set(types)].join(' '))}"><span class="tnum">${esc(num)}</span><span class="tname">${esc(niceLabel(node.name))}</span><span class="chips">${chipsOf(node, parts)}</span></div>\n`;
  }
  function groupHtml(node, parts, num, open) {
    const kids = [...node.children.values()].sort(compareStudyOrder(node.name));
    const secKids = kids.filter(k => isSectionFolder(k.name));
    const grpKids = kids.filter(k => !isSectionFolder(k.name));
    const ownFiles = (node.files || []).filter(f => f.ext === 'html');
    let body = '';
    for (const f of ownFiles) {
      const title = titleOf(f) || niceLabel(f.file.replace(/\.html$/i, ''));
      const isReadme = /README\.html$/i.test(f.rel);
      body += `<div class="frow" data-t=""><a href="${esc(f.rel.replace(/^content\//, ''))}" data-rel="${esc(f.rel)}">${isReadme ? '📋' : '📄'} ${esc(title)}</a></div>\n`;
    }
    if (secKids.length) {
      body += `<div class="mrow" data-t="${esc([...new Set(secKids.map(k => (CHIP_META[k.name] || [])[2]).filter(Boolean))].join(' '))}"><span class="mlabel">${esc(niceLabel(node.name))} · all formats</span><span class="chips">${chipsOf(node, parts)}</span></div>\n`;
    }
    grpKids.forEach((k, i) => {
      const kParts = parts.concat(k.name);
      const kNum = num ? num + '.' + (i + 1) : String(i + 1);
      const kids2 = [...k.children.values()];
      const isTopic = kids2.length > 0 && kids2.every(c => isSectionFolder(c.name)) && !k.files.length;
      body += isTopic ? topicRow(k, kParts, kNum) : groupHtml(k, kParts, kNum, false);
    });
    const tCount = countTopics(node);
    const dCount = countDocs(node);
    return `<details class="grp" id="${esc(anchorOf(parts))}" data-default="${open ? 'open' : ''}"${open ? ' open' : ''}><summary><span class="gname">${esc(niceLabel(node.name))}</span><span class="gmeta">${tCount ? tCount + ' topic' + (tCount === 1 ? '' : 's') + ' · ' : ''}${dCount} doc${dCount === 1 ? '' : 's'}</span></summary><div class="gbody">${body}</div></details>\n`;
  }

  let body = `<h1 id="content-library">Content Library</h1><p>${docs.length} documents · every topic on one line — click a chip to open a note, a folder to expand it, or use the filters.</p>`;
  body += `<p class="guide how"><b>Study order:</b> <b>1 Prelims</b> → <b>2 Mains</b>, top to bottom. In each topic: <b>📖 Detailed → 📝 Short → 🔹 Bullets → 🗺️ Diagrams → ❓ PYQs</b>. Visited pages tick ✓ automatically. <a href="README.html">📖 About this library</a></p>`;

  const stages = [...root.children.values()].sort(compareStudyOrder('content'));
  stages.forEach((st, i) => {
    const stNum = String(i + 1);
    body += `<h2 id="${esc(anchorOf([st.name]))}" class="stage"><span class="secnum">${stNum}</span>${esc(niceLabel(st.name))}</h2>\n`;
    if (STAGE_INTRO[st.name]) body += `<p class="guide stage">${esc(STAGE_INTRO[st.name])}</p>\n`;
    const areas = [...st.children.values()].sort(compareStudyOrder(st.name));
    areas.forEach((a, j) => {
      const aParts = [st.name, a.name];
      const aNum = stNum + '.' + (j + 1);
      let inner = groupHtml(a, aParts, aNum, j === 0);
      if (AREA_GUIDE[a.name]) inner = inner.replace('<div class="gbody">', () => `<div class="gbody"><p class="guide">${esc(AREA_GUIDE[a.name])}</p>`);
      body += inner;
    });
  });

  const CSS = `:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#f59e0b;--bg:#f8fafc;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:900px;margin:0 auto;padding:24px 20px 80px}
header.lib{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);background:rgba(255,255,255,.96);backdrop-filter:blur(8px)}
header.lib .head-in{display:flex;gap:12px;align-items:center;padding-top:10px;padding-bottom:10px;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px;white-space:nowrap}
.brand span{color:var(--accent)}
a.brand{color:var(--ink);text-decoration:none}
a.brand:hover{color:#b45309}
.crumb{font-size:12px;color:var(--sub);white-space:nowrap}
.links{white-space:nowrap;margin-left:auto}
.find{display:flex;gap:8px;align-items:center;min-width:0;flex:1 1 240px}
.find input{border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:13px;width:100%;max-width:320px;background:#f8fafc;color:var(--ink);outline:none}
.find input:focus{border-color:var(--accent);background:#fff}
.find #lib-c{font-size:11.5px;color:var(--sub);white-space:nowrap}
.tfilter{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 0 0;border-top:1px solid var(--line)}
.tfilter .tl{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-right:2px}
.tfilter button{border:1px solid var(--line);background:#fff;color:var(--sub);border-radius:999px;padding:3px 11px;font-size:12px;font-weight:600;cursor:pointer}
.tfilter button:hover{border-color:var(--accent);color:#b45309}
.tfilter button[aria-pressed="true"]{background:#0f172a;border-color:#0f172a;color:#fff}
.tfilter .sp{flex:1}
.tfilter .mini{border-style:dashed;color:var(--sub)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 26px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
h1{font-size:25px;line-height:1.25;margin:.2em 0 .4em}
h2.stage{font-size:19px;margin:1.5em 0 .5em;border-bottom:2px solid var(--line);padding-bottom:.3em;scroll-margin-top:130px}
.secnum{display:inline-block;min-width:30px;text-align:center;font-size:12px;font-weight:800;color:#fff;background:#4f46e5;border-radius:8px;padding:1px 7px;margin-right:6px;vertical-align:1px}
.guide{font-size:13px;color:var(--sub);background:#f8fafc;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:0 10px 10px 0;padding:8px 13px;margin:.4em 0 .9em}
.guide.stage{border-left-color:#4f46e5;background:#eef2ff}
.guide.how{background:#fffbeb}
details.grp{margin:6px 0;scroll-margin-top:130px}
details.grp summary{display:flex;align-items:baseline;gap:10px;cursor:pointer;list-style:none;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#f8fafc;user-select:none}
details.grp summary::-webkit-details-marker{display:none}
details.grp summary:hover{border-color:#f59e0b;background:#fffbeb}
details.grp[open] summary{border-color:#cbd5e1;background:#f1f5f9;border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:none;font-weight:700}
details.grp summary .gname{font-size:15px;font-weight:600}
details.grp[open] summary .gname{font-weight:800}
details.grp summary .gmeta{font-size:11.5px;color:#94a3b8;font-weight:400}
.gbody{padding:4px 4px 8px 14px;border-left:2px solid #eef2ff}
details.grp[open]>.gbody{background:#fff;border-left-color:#c7d2fe}
.trow{display:flex;align-items:baseline;gap:10px;padding:6px 10px;border-radius:10px;scroll-margin-top:130px;flex-wrap:wrap}
.trow:hover{background:#f1f5f9}
.trow .tnum{font-size:11px;font-weight:800;color:#4f46e5;background:#eef2ff;border-radius:6px;padding:1px 7px;flex:none;min-width:56px;text-align:center}
.trow .tname{font-weight:600;flex:none}
.mrow{display:flex;align-items:baseline;gap:10px;padding:6px 10px;border-radius:10px;flex-wrap:wrap}
.mrow .mlabel{font-size:12px;font-weight:700;color:var(--sub);flex:none}
.frow{padding:5px 10px;font-size:13.5px}
.frow a{color:#b45309}
.chips{display:inline-flex;flex-wrap:wrap;gap:5px}
.chipw{display:inline-flex}
a.chip{font-size:12px;font-weight:600;border:1px solid var(--line);border-radius:999px;padding:2px 10px;color:var(--sub);background:#fff;text-decoration:none;white-space:nowrap}
a.chip:hover{border-color:#f59e0b;color:#b45309;background:#fffbeb;text-decoration:none}
.chipw.is-read a.chip{color:#94a3b8}
.chipw.is-read a.chip::after{content:" ✓";color:#16a34a;font-weight:800}
.frow.is-read a{color:#94a3b8}
.frow.is-read a::after{content:" ✓";color:#16a34a;font-weight:800}
a{color:#b45309;text-decoration:none}a:hover{text-decoration:underline}
/* study toolbar (theme + progress), injected by assets/js/study.js */
.su-bar{position:fixed;left:14px;bottom:14px;z-index:80;display:flex;gap:8px;align-items:center;background:rgba(15,23,42,.94);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 8px 6px 6px;box-shadow:0 10px 26px -10px rgba(15,23,42,.6)}
.su-bar button{border:1px solid transparent;background:transparent;color:#e2e8f0;border-radius:999px;font-size:13px;font-weight:700;padding:6px 12px;cursor:pointer;white-space:nowrap}
.su-bar button:hover{background:rgba(255,255,255,.12)}
.su-bar .su-done.is-done{background:#16a34a;border-color:#16a34a;color:#fff}
html.su-dark{--ink:#e2e8f0;--sub:#94a3b8;--line:#26334d;--bg:#0b1220;--card:#111c30}
html.su-dark body{background:var(--bg)}
html.su-dark header.lib{background:rgba(17,28,48,.94)}
html.su-dark .find input{background:#0b1220;border-color:#26334d;color:#e2e8f0}
html.su-dark a{color:#fbbf24}
html.su-dark .guide{background:#111c30}
html.su-dark .guide.stage{background:#1e1b4b}
html.su-dark .guide.how{background:#231a05}
html.su-dark .secnum{background:#818cf8;color:#0b1220}
html.su-dark details.grp summary{background:#111c30}
html.su-dark details.grp summary:hover{background:#231a05}
html.su-dark details.grp[open] summary{background:#1a2740}
html.su-dark details.grp[open]>.gbody{background:#111c30;border-left-color:#312e81}
html.su-dark .trow:hover{background:#1a2740}
html.su-dark .trow .tnum{background:#1e1b4b;color:#a5b4fc}
html.su-dark a.chip{background:#0b1220;color:#94a3b8}
html.su-dark a.chip:hover{background:#231a05;color:#fcd34d;border-color:#b45309}
html.su-dark .tfilter button{background:#0b1220;color:#94a3b8}
html.su-dark .tfilter button[aria-pressed="true"]{background:#e0e7ff;border-color:#e0e7ff;color:#1e1b4b}
html.su-dark .chipw.is-read a.chip{color:#64748b}
hr{border:none;border-top:1px solid var(--line);margin:1.6em 0}
footer{color:#94a3b8;font-size:12px;margin-top:40px;text-align:center}
.to-top{position:fixed;right:18px;bottom:18px;z-index:70;width:42px;height:42px;border-radius:12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .2s,transform .2s}
.to-top.on{opacity:1;pointer-events:auto;transform:none}
a.to-top:hover{color:#fbbf24;text-decoration:none}
@media(max-width:700px){
header.lib .head-in{row-gap:8px}
.find{order:3;flex:1 1 100%}
.find input{max-width:100%}
.links{margin-left:0}
.card{padding:16px 14px}
.wrap{padding:20px 12px 64px}
h1{font-size:21px}
.trow{gap:6px}
.to-top{right:12px;bottom:12px}
}
@media print{body{background:#fff}.card{border:none;padding:0}header.lib{position:static}.no-print{display:none}details.grp{display:block}details.grp>.gbody{display:block}}`;

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
<body data-study-kind="catalog">
<header class="lib"><div class="wrap head-in"><a class="brand" href="../index.html">study<span>UPSC</span></a><div class="crumb">all files · ${docs.length} documents</div><div class="find no-print"><input id="lib-q" type="search" placeholder="Filter topics…" aria-label="Filter topics" autocomplete="off"><span id="lib-c" aria-live="polite"></span></div><div class="crumb links"><a href="../book/index.html">📖 Book</a> · <a href="../index.html">🏠 Home</a></div><div class="tfilter no-print"><span class="tl">Show</span><button type="button" data-t="" aria-pressed="true">All</button><button type="button" data-t="d">📖 Detailed</button><button type="button" data-t="s">📝 Short</button><button type="button" data-t="b">🔹 Bullets</button><button type="button" data-t="g">🗺️ Diagrams</button><button type="button" data-t="p">❓ PYQs</button><span class="sp"></span><button type="button" class="mini" id="lib-expand">Expand all</button><button type="button" class="mini" id="lib-collapse">Collapse all</button></div></div></header>
<div class="wrap"><div class="card">
${body}</div>
<footer>studyUPSC · print-friendly (Ctrl/Cmd+P)</footer>
</div>
<a class="to-top no-print" href="#" aria-label="Back to top">↑</a>
<script src="../assets/js/study.js" defer></script>
<script>/* studyupsc-catalog-filter */
(function(){try{
var q=document.getElementById('lib-q'),c=document.getElementById('lib-c'),card=document.querySelector('.card');
var rows=card?Array.prototype.slice.call(card.querySelectorAll('.trow,.mrow,.frow')):[];
var groups=card?Array.prototype.slice.call(card.querySelectorAll('details.grp')):[];
var btns=Array.prototype.slice.call(document.querySelectorAll('.tfilter button[data-t]'));
var typeSel='';
function vis(el){return el.style.display!=='none';}
function apply(){
var s=q.value.trim().toLowerCase();var shown=0;
rows.forEach(function(r){var hitTxt=!s||r.textContent.toLowerCase().indexOf(s)!==-1;var t=r.getAttribute('data-t')||'';var hitType=!typeSel||t.indexOf(typeSel)!==-1;var hit=hitTxt&&hitType;r.style.display=hit?'':'none';if(hit)shown++;});
groups.forEach(function(g){var has=false;Array.prototype.forEach.call(g.querySelectorAll('.trow,.mrow,.frow'),function(r){if(vis(r))has=true;});
if(!s&&!typeSel){g.style.display='';g.open=g.getAttribute('data-default')==='open';}
else{g.style.display=has?'':'none';g.open=has;}});
c.textContent=(s||typeSel)?(shown+' found'):'';
}
var t;q.addEventListener('input',function(){clearTimeout(t);t=setTimeout(apply,60);});
btns.forEach(function(b){b.addEventListener('click',function(){typeSel=b.getAttribute('data-t');btns.forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});apply();});});
var ex=document.getElementById('lib-expand'),co=document.getElementById('lib-collapse');
if(ex)ex.addEventListener('click',function(){groups.forEach(function(g){g.open=true;});});
if(co)co.addEventListener('click',function(){groups.forEach(function(g){g.open=false;});});
if(location.hash){var el=document.getElementById(location.hash.slice(1));if(el){var p=el;while(p&&p!==document.body){if(p.tagName==='DETAILS')p.open=true;p=p.parentNode;}}}
var top=document.querySelector('.to-top');if(top){var f=function(){top.classList.toggle('on',window.scrollY>600);};window.addEventListener('scroll',f,{passive:true});f();top.addEventListener('click',function(e){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});}
}catch(e){}})();
</script>
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
