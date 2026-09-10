#!/usr/bin/env node
/* ============================================================================
   studyUPSC — static website builder (vanilla HTML site, no SPA required)
   ----------------------------------------------------------------------------
   Turns the content/ tree into a real browsable website:

     1. Rewrites every document's <header>/<footer> with site navigation:
          - brand links to the homepage
          - linked breadcrumbs (Home › Prelims › GS I › … › section)
          - "📚 All files" link to the generated catalog
          - prev / next pager + "↑ up" link within each folder
     2. Regenerates the homepage (upsc-portal/index.html) with a full
        syllabus directory that deep-links into the catalog's anchors.

   The catalog (content/index.html) is built by cli/generate.mjs as a nested
   tree with an anchor per folder, so every breadcrumb/topic link resolves.

   Usage (from upsc-portal/):
     node cli/build-site.mjs            # rewrite nav + rebuild homepage
     node cli/build-site.mjs --homepage # only rebuild the homepage

   Idempotent: files already carrying the "<!-- studyupsc-site-nav -->"
   marker are skipped.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { niceLabel } from './names.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const HOME_FILE = path.join(ROOT, 'index.html');
const CATALOG_FILE = path.join(CONTENT, 'index.html');
const MARKER = '<!-- studyupsc-site-nav -->';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/*  Scan content/ → leaf documents                                     */
/* ------------------------------------------------------------------ */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    if (e.name === '.DS_Store' || e.name === '.gitkeep') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const relFromDir = (dirAbs, targetAbs) =>
  path.relative(dirAbs, targetAbs).split(path.sep).join('/') || '.';

function pageTitle(abs) {
  try {
    const s = fs.readFileSync(abs, 'utf8').slice(0, 4000);
    const t = s.match(/<title>([^<]*)<\/title>/i);
    if (t) return t[1].replace(/\s*·\s*studyUPSC\s*$/i, '').trim();
    const h1 = s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  } catch { /* ignore */ }
  return '';
}

/* Anchor used by the nested catalog for a folder dir path. */
const anchorOf = (dirRel) => 'content-' + dirRel.replace(/^content\//, '').split('/').join('-');

/* ------------------------------------------------------------------ */
/*  Navigation CSS injected into every document                        */
/* ------------------------------------------------------------------ */
const NAV_CSS = `<style>/* studyupsc-scr-nav */
header .wrap{align-items:center}
a.brand{color:var(--ink);text-decoration:none}
a.brand:hover{color:#b45309}
.crumbs{font-size:12px;color:var(--sub);display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.crumbs a{color:var(--sub);text-decoration:none}
.crumbs a:hover{color:#b45309;text-decoration:underline}
.crumbs .sep{color:#cbd5e1}
.crumbs .here{color:var(--ink);font-weight:600}
.nav-home{margin-left:auto;font-size:12px;color:var(--sub);text-decoration:none;white-space:nowrap}
.nav-home:hover{color:#b45309;text-decoration:underline}
.pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:40px;font-size:13px;color:var(--sub)}
.pager a{color:#b45309;text-decoration:none;font-weight:600}
.pager a:hover{text-decoration:underline}
.pager .up{color:var(--sub)}
.pager .dim{color:#cbd5e1}
</style>`;

/* ------------------------------------------------------------------ */
/*  Rewrite one document with site navigation                          */
/* ------------------------------------------------------------------ */
function rewriteDoc(abs, homeRel, catalogRel, title, prev, next, crumbsHtml, pagerHtml) {
  let raw = fs.readFileSync(abs, 'utf8');
  if (raw.includes(MARKER)) return false;

  if (!raw.includes('studyupsc-scr-nav')) {
    raw = raw.replace('</head>', NAV_CSS + '\n</head>');
  }

  const header =
    '<header><div class="wrap">\n' +
    `  <a class="brand" href="${homeRel}">study<span>UPSC</span></a>\n` +
    `  <nav class="crumbs" aria-label="Breadcrumb">${crumbsHtml}</nav>\n` +
    `  <a class="nav-home no-print" href="${catalogRel}">📚 All files</a>\n` +
    '</div></header>';

  if (/<header>[\s\S]*?<\/header>/.test(raw)) {
    raw = raw.replace(/<header>[\s\S]*?<\/header>/, header);
  } else {
    raw = raw.replace('<body>', '<body>\n' + header);
  }

  if (/<footer>[\s\S]*?<\/footer>/.test(raw)) {
    raw = raw.replace(/<footer>[\s\S]*?<\/footer>/, pagerHtml);
  } else {
    raw = raw.replace('</body>', pagerHtml + '\n</body>');
  }

  raw = raw.replace('</body>', MARKER + '\n</body>');
  fs.writeFileSync(abs, raw);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Homepage                                                           */
/* ------------------------------------------------------------------ */
const AREAS = [
  { dir: 'prelims/gs1', icon: '📋' },
  { dir: 'prelims/csat', icon: '🧮' },
  { dir: 'prelims/mocks', icon: '📝' },
  { dir: 'mains/essay-frameworks', icon: '✍️' },
  { dir: 'mains/gs-1-heritage-geography-society', icon: '🌏' },
  { dir: 'mains/gs-2-polity-governance-ir', icon: '⚖️' },
  { dir: 'mains/gs-3-economy-tech-environment', icon: '🏭' },
  { dir: 'mains/gs-4-ethics-integrity-aptitude', icon: '🕊️' },
  { dir: 'mains/optional-subjects', icon: '📚' },
  { dir: 'mains/practice', icon: '🖋️' },
];

function buildHomepage(leafDocs) {
  // doc counts per dir (direct + cumulative)
  const direct = new Map();
  const dirs = new Set();
  for (const d of leafDocs) {
    const dir = path.posix.dirname(d.rel);
    if (!direct.has(dir)) direct.set(dir, []);
    direct.get(dir).push(d);
    let p = dir;
    while (p && p !== 'content') {
      dirs.add(p);
      p = path.posix.dirname(p);
    }
  }
  const under = new Map();
  for (const dir of dirs) {
    const seg = dir + '/';
    let n = (direct.get(dir) || []).length;
    for (const other of direct.keys()) {
      if (other !== dir && other.startsWith(seg)) n += direct.get(other).length;
    }
    under.set(dir, n);
  }

  const childrenOf = (parent) =>
    [...dirs].filter((d) => path.posix.dirname(d) === parent).sort();

  const areaCards = AREAS.map((a) => {
    const aDir = 'content/' + a.dir;
    const kids = childrenOf(aDir);
    if (!kids.length) return '';
    const total = under.get(aDir) || 0;
    const list = kids.map((k) => {
      const label = niceLabel(path.posix.basename(k));
      const n = under.get(k) || 0;
      return `<li><a href="content/index.html#${anchorOf(k)}">${esc(label)}</a><span class="n">${n}</span></li>`;
    }).join('');
    return `<article class="area">
      <h3><a class="area-link" href="content/index.html#${anchorOf(aDir)}"><span class="ic">${a.icon}</span>${esc(niceLabel(path.posix.basename(a.dir)))}</a><span class="count">${total}</span></h3>
      <ul class="topics">${list}</ul>
    </article>`;
  }).join('\n');

  const totalDocs = leafDocs.length;
  const prelimsCount = under.get('content/prelims') || 0;
  const mainsCount = under.get('content/mains') || 0;
  let bookLessons = 0;
  try { bookLessons = fs.readdirSync(path.join(ROOT, 'book', 'lesson')).filter((f) => f.endsWith('.html')).length; } catch { /* ignore */ }

  const stats = [
    { big: String(totalDocs), label: 'HTML study pages', sub: 'notes · revision · PYQs · diagrams' },
    { big: String(prelimsCount), label: 'Prelims pages', sub: 'GS Paper I · CSAT · mocks' },
    { big: String(mainsCount), label: 'Mains pages', sub: 'GS I–IV · essay · optional' },
    { big: String(bookLessons), label: 'Book lessons', sub: 'one continuous read' },
  ].map((s) => `<div class="stat"><b>${s.big}</b><span>${s.label}</span><em>${s.sub}</em></div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>studyUPSC — UPSC CSE Preparation Website</title>
<meta name="description" content="UPSC Civil Services Exam study website: full Prelims & Mains syllabus as plain HTML pages — notes, revision, diagrams and PYQs. No app, no login.">
<style>
:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#f59e0b;--indigo:#4f46e5;--bg:#f8fafc;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
a{color:#b45309;text-decoration:none}
a:hover{text-decoration:underline}
/* top nav */
.site-head{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.site-head .wrap{display:flex;align-items:center;gap:18px;height:60px;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px;color:var(--ink)}
.brand span{color:var(--accent)}
.topnav{display:flex;gap:2px;flex-wrap:wrap;margin-left:auto}
.topnav a{color:var(--sub);font-size:14px;font-weight:600;padding:6px 10px;border-radius:8px}
.topnav a:hover{color:var(--indigo);background:#eef2ff}
/* hero */
.hero{position:relative;overflow:hidden;border-radius:22px;margin:28px 0 20px;padding:46px 38px;color:#fff;
  background:radial-gradient(1200px 500px at 85% -10%,rgba(129,140,248,.55),transparent 60%),
             radial-gradient(900px 420px at -10% 110%,rgba(245,158,11,.35),transparent 55%),
             linear-gradient(135deg,#0f172a,#1e1b4b)}
.hero .eyebrow{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#fbbf24;margin:0 0 12px}
.hero h1{margin:0 0 14px;font-size:34px;line-height:1.15;font-weight:800}
.hero h1 span{background:linear-gradient(90deg,#a5b4fc,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p.lead{max-width:640px;color:#cbd5e1;font-size:16px;margin:0 0 22px}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:15px;padding:11px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.25);color:#e2e8f0}
.btn:hover{text-decoration:none;border-color:#fff}
.btn.primary{background:#f59e0b;color:#1c1917;border-color:#f59e0b}
.btn.primary:hover{background:#fbbf24}
/* stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.stat b{display:block;font-size:26px;font-weight:800;color:var(--indigo)}
.stat span{display:block;font-size:13px;font-weight:700;color:var(--ink);margin-top:2px}
.stat em{display:block;font-size:12px;color:#94a3b8;font-style:normal}
/* directory */
h2.title{font-size:22px;font-weight:800;margin:34px 0 4px}
p.title-sub{color:var(--sub);margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:8px}
.area{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.area h3{margin:0 0 8px;font-size:16px;display:flex;align-items:center;gap:8px}
.area h3 .count{margin-left:auto;font-size:12px;color:var(--sub);background:#f1f5f9;border-radius:999px;padding:2px 9px;font-weight:700}
.area .ic{font-size:18px}
.area-link{color:var(--ink)}
.area-link:hover{color:var(--indigo);text-decoration:none}
.topics{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.topics li{font-size:13px}
.topics a{display:inline-flex;align-items:center;gap:5px;color:var(--sub);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
.topics a:hover{border-color:var(--indigo);color:var(--indigo);background:#eef2ff;text-decoration:none}
.topics .n{color:#94a3b8;font-size:11px}
/* book banner */
.book{display:flex;gap:20px;align-items:center;margin:20px 0 34px;border:1px solid #fde68a;border-radius:18px;padding:20px 24px;
  background:linear-gradient(135deg,#fffbeb,#fff)}
.book h3{margin:0 0 4px;font-size:19px}
.book p{margin:0;color:var(--sub);font-size:14px}
.book .btn{margin-left:auto;color:#b45309;border-color:#f59e0b}
.book .btn:hover{background:#fffbeb}
.site-foot{border-top:1px solid var(--line);margin-top:20px;background:#fff}
.site-foot .wrap{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:22px 20px;font-size:13px;color:var(--sub)}
.site-foot nav{display:flex;gap:14px;flex-wrap:wrap}
@media print{.site-head,.cta,.site-foot,.topics a{display:none}}
</style>
</head>
<body>
<header class="site-head"><div class="wrap">
  <a class="brand" href="./">study<span>UPSC</span></a>
  <nav class="topnav" aria-label="Primary">
    <a href="./">Home</a>
    <a href="content/index.html#content-prelims">Prelims</a>
    <a href="content/index.html#content-mains">Mains</a>
    <a href="book/index.html">Book</a>
    <a href="content/index.html">All files</a>
    <a href="app.html">Search &amp; Tracker</a>
  </nav>
</div></header>
<main class="wrap">
  <section class="hero">
    <p class="eyebrow">Civil Services Examination · IAS · IPS · IFS</p>
    <h1>Your complete UPSC <span>CSE</span> study website</h1>
    <p class="lead">The full Prelims &amp; Mains syllabus as plain HTML pages — detailed notes, revision sheets, mindmaps, diagrams and PYQs. Every page opens directly. No app, no login, works offline.</p>
    <div class="cta">
      <a class="btn primary" href="content/index.html">📚 Browse all files</a>
      <a class="btn" href="book/index.html">Read as a book 📖</a>
    </div>
  </section>

  <section class="stats" aria-label="Site statistics">${stats}</section>

  <h2 class="title">Browse the syllabus</h2>
  <p class="title-sub">Every section below links straight to that part of the content library.</p>
  <section class="grid">${areaCards}</section>

  <a class="book" href="book/index.html">
    <div>
      <h3>📖 The complete book edition</h3>
      <p>All ${bookLessons} lessons woven into one continuous read — detailed study, revision digest, mindmaps, diagrams and PYQs per lesson.</p>
    </div>
    <span class="btn">Open the book →</span>
  </a>
</main>
<footer class="site-foot"><div class="wrap">
  <span>studyUPSC — free, static, offline-friendly UPSC CSE preparation website.</span>
  <nav aria-label="Footer">
    <a href="./">Home</a>
    <a href="content/index.html">All files</a>
    <a href="book/index.html">Book</a>
    <a href="app.html">Search &amp; Tracker</a>
    <a href="https://github.com/clickalex/studyUPSC" target="_blank" rel="noopener">GitHub</a>
  </nav>
</div></footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
const onlyHomepage = process.argv.includes('--homepage');

const allFiles = walk(CONTENT).map((abs) => ({ abs, rel: rel(abs) }));
const leafDocs = allFiles.filter((f) =>
  f.rel.endsWith('.html') && path.posix.basename(f.rel) !== 'index.html');

// index of docs per directory (for prev/next pager)
const byDir = new Map();
for (const d of leafDocs) {
  const dir = path.posix.dirname(d.rel);
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(d);
}
for (const arr of byDir.values()) {
  arr.sort((a, b) => a.rel.localeCompare(b.rel, undefined, { numeric: true }));
}

let rewritten = 0, skipped = 0;
if (!onlyHomepage) {
  for (const d of leafDocs) {
    const dirAbs = path.dirname(d.abs);
    const homeRel = relFromDir(dirAbs, HOME_FILE);
    const catalogRel = relFromDir(dirAbs, CATALOG_FILE);
    const title = pageTitle(d.abs) || path.posix.basename(d.rel).replace(/\.html$/i, '').replace(/[-_]/g, ' ');

    // breadcrumbs: Home › each ancestor folder (linked to catalog anchor) › page
    const dirRel = path.posix.dirname(d.rel);            // e.g. content/prelims/gs1/economy/notes
    const parts = dirRel.split('/').filter(Boolean);     // ['content','prelims','gs1','economy','notes']
    const crumbs = [];
    crumbs.push(`<a href="${homeRel}">Home</a>`);
    for (let j = 1; j < parts.length; j++) {
      const dirSoFar = parts.slice(0, j + 1).join('/');  // 'content/prelims', ...
      const anchor = anchorOf(dirSoFar);
      crumbs.push(`<span class="sep" aria-hidden="true">›</span><a href="${catalogRel}#${anchor}">${esc(niceLabel(parts[j]))}</a>`);
    }
    crumbs.push(`<span class="sep" aria-hidden="true">›</span><span class="here">${esc(title)}</span>`);
    const crumbsHtml = crumbs.join('');

    // prev / next within the same folder
    const sibs = byDir.get(dirRel) || [];
    const idx = sibs.findIndex((x) => x.rel === d.rel);
    const prev = idx > 0 ? sibs[idx - 1] : null;
    const next = idx >= 0 && idx < sibs.length - 1 ? sibs[idx + 1] : null;
    const short = (t) => (t.length > 34 ? t.slice(0, 33) + '…' : t);
    const curAnchor = anchorOf(dirRel);
    const upLabel = parts.length > 1 ? niceLabel(parts[parts.length - 1]) : 'All files';

    const pager =
      '<footer class="pager no-print">\n' +
      `  <span>${prev ? `<a href="${path.posix.basename(prev.rel)}" rel="prev">← ${esc(short(pageTitle(prev.abs) || path.posix.basename(prev.rel)))}</a>` : '<span class="dim">Start</span>'}</span>\n` +
      `  ${parts.length > 1 ? `<a class="up" href="${catalogRel}#${curAnchor}">↑ ${esc(upLabel)} · all files</a>` : '<span></span>'}\n` +
      `  <span>${next ? `<a href="${path.posix.basename(next.rel)}" rel="next">${esc(short(pageTitle(next.abs) || path.posix.basename(next.rel)))} →</a>` : '<span class="dim">End</span>'}</span>\n` +
      '</footer>\n' +
      '<footer>studyUPSC · print-friendly (Ctrl/Cmd+P)</footer>';

    if (rewriteDoc(d.abs, homeRel, catalogRel, title, prev, next, crumbsHtml, pager)) rewritten++;
    else skipped++;
  }
  console.log(`[nav] ${rewritten} documents rewritten · ${skipped} already had site navigation`);
}

fs.writeFileSync(HOME_FILE, buildHomepage(leafDocs));
console.log(`[home] ${rel(HOME_FILE)} rebuilt (${leafDocs.length} documents, ${AREAS.length} areas)`);
