#!/usr/bin/env node
/* ============================================================================
   studyUPSC — static website builder (vanilla HTML site, no SPA required)
   ----------------------------------------------------------------------------
   Turns the content/ tree into a real browsable website:

     1. Rewrites every new document with the shared site chrome v2
        (cli/site-chrome.mjs): sticky responsive header with mobile menu,
        "In this topic" pill strip, cross-section prev/next pager, Q&A
        cards with per-question answer reveals, back-to-top.
     2. Regenerates the homepage (upsc-portal/index.html) with a full
        syllabus directory that deep-links into the catalog's anchors.

   The catalog (content/index.html) is built by cli/generate.mjs as a nested
   tree with an anchor per folder, so every breadcrumb/topic link resolves.

   Usage (from upsc-portal/):
     node cli/build-site.mjs            # rewrite nav + rebuild homepage
     node cli/build-site.mjs --homepage # only rebuild the homepage

   Idempotent: files already carrying a site-nav marker are skipped
   (use cli/upgrade-site.mjs --force to re-apply chrome to all files).
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { niceLabel, compareStudyOrder } from './names.mjs';
import { applyChrome, topicContext, topicNavOf, sectionOf, V2_MARKER, V3_MARKER } from './site-chrome.mjs';

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
/*  Rewrite one document with site navigation (shared chrome v2)       */
/*  Idempotent: files already carrying a site-nav marker are skipped.  */
/* ------------------------------------------------------------------ */
function rewriteDoc(abs, ctx) {
  const raw = fs.readFileSync(abs, 'utf8');
  if (raw.includes(MARKER) || raw.includes(V2_MARKER) || raw.includes(V3_MARKER)) return false;
  const out = applyChrome(raw, ctx);
  fs.writeFileSync(abs, out.html);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Homepage                                                           */
/* ------------------------------------------------------------------ */
/* Study areas in the order a student should tackle them (mirrors the book
   parts and the syllabus tree: Prelims first, then Mains GS I–IV, Essay,
   one Optional, and continuous practice). */
const AREAS = [
  { dir: 'prelims/gs1', icon: '📋', paper: 'prelims-gs1', stage: 'prelims', blurb: 'The scored paper — 6 subjects, History first.' },
  { dir: 'prelims/csat', icon: '🧮', paper: 'prelims-csat', stage: 'prelims', blurb: 'Qualifying (33%). Practice, don’t over-study.' },
  { dir: 'prelims/mocks', icon: '📝', paper: 'prelims-mocks', stage: 'prelims', blurb: 'Timed tests — attempt after the syllabus.' },
  { dir: 'mains/gs-1-heritage-geography-society', icon: '🌏', paper: 'gs-1', stage: 'mains', blurb: 'Mains 250-marker: history, society, geography.' },
  { dir: 'mains/gs-2-polity-governance-ir', icon: '⚖️', paper: 'gs-2', stage: 'mains', blurb: 'Mains 250-marker: polity, governance, world affairs.' },
  { dir: 'mains/gs-3-economy-tech-environment', icon: '🏭', paper: 'gs-3', stage: 'mains', blurb: 'Mains 250-marker: economy, tech, environment.' },
  { dir: 'mains/gs-4-ethics-integrity-aptitude', icon: '🕊️', paper: 'gs-4', stage: 'mains', blurb: 'Mains 250-marker: ethics theory + case studies.' },
  { dir: 'mains/essay-frameworks', icon: '✍️', paper: 'essay', stage: 'mains', blurb: 'Two essays, 250 marks. Frameworks first.' },
  { dir: 'mains/optional-subjects', icon: '📚', paper: 'optional-subjects', stage: 'mains', blurb: 'Pick ONE optional (2 × 250). Compare first.' },
  { dir: 'mains/practice', icon: '🖋️', paper: 'mains-practice', stage: 'mains', blurb: 'Answer-writing gym: 10 & 15 markers.' },
];

/* Syllabus leaf navs per paper (powers the per-card progress bars). */
const _sylBox = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), 'utf8'))(_sylBox);
const _leavesOf = (node) => (!node.sub || !node.sub.length) ? [node.nav] : node.sub.flatMap(_leavesOf);
const PAPER_LEAVES = new Map(_sylBox.SYLLABUS_DATA.papers.map((p) => [p.id, _leavesOf(p)]));

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

  /* Children in canonical study order (never alphabetical). */
  const childrenOf = (parent) =>
    [...dirs].filter((d) => path.posix.dirname(d) === parent)
      .map((d) => ({ dir: d, name: path.posix.basename(d) }))
      .sort(compareStudyOrder(path.posix.basename(parent)));

  const areaCards = AREAS.map((a, i) => {
    const step = i + 1;
    const aDir = 'content/' + a.dir;
    const kids = childrenOf(aDir);
    if (!kids.length) return '';
    const total = under.get(aDir) || 0;
    const list = kids.map((k, ki) => {
      const label = niceLabel(k.name);
      const n = under.get(k.dir) || 0;
      return `<li><a href="content/index.html#${anchorOf(k.dir)}"><span class="ord">${step}.${ki + 1}</span>${esc(label)}</a><span class="n">${n}</span></li>`;
    }).join('');
    const leaves = (PAPER_LEAVES.get(a.paper) || []).join('|');
    return `<article class="area" data-area data-leaves="${esc(leaves)}">
      <h3><span class="step" aria-hidden="true">${step}</span><a class="area-link" href="content/index.html#${anchorOf(aDir)}"><span class="ic">${a.icon}</span>${esc(niceLabel(path.posix.basename(a.dir)))}</a><span class="count">${total}</span></h3>
      <p class="blurb">${esc(a.blurb)}</p>
      <ul class="topics">${list}</ul>
      <div class="su-area" aria-hidden="true"><div class="su-area-bar"><div class="su-area-fill"></div></div><span class="su-area-pct">0%</span></div>
    </article>`;
  });

  const prelimsCards = areaCards.slice(0, 3).join('\n');
  const mainsCards = areaCards.slice(3).join('\n');

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
<script>/*su-theme-boot*/try{if(localStorage.getItem('studyupsc-theme')==='dark'){document.documentElement.className+=' su-dark';}}catch(e){}</script>
<style>
:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#f59e0b;--indigo:#4f46e5;--bg:#f8fafc;--card:#fff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
a{color:#b45309;text-decoration:none}
a:hover{text-decoration:underline}
/* top nav */
.site-head{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.site-head .wrap{display:flex;align-items:center;gap:18px;min-height:60px;padding-top:8px;padding-bottom:8px}
.brand{font-weight:800;font-size:18px;color:var(--ink);white-space:nowrap}
.brand span{color:var(--accent)}
.topnav{display:flex;gap:2px;flex-wrap:wrap;margin-left:auto}
.topnav a{color:var(--sub);font-size:14px;font-weight:600;padding:6px 10px;border-radius:8px;white-space:nowrap}
.topnav a:hover{color:var(--indigo);background:#eef2ff}
.tbtn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:4px 10px;font-size:13px;font-weight:700;cursor:pointer;color:var(--ink);white-space:nowrap}
.tbtn:hover{border-color:var(--accent);background:#fffbeb}
.mnav{display:none;position:relative;margin-left:auto}
.mnav summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:10px;padding:5px 11px;font-size:16px;background:#fff;user-select:none}
.mnav summary::-webkit-details-marker{display:none}
.mnav[open] summary{border-color:var(--accent);background:#fffbeb}
.mnav nav{position:absolute;right:0;top:calc(100% + 8px);width:min(280px,78vw);background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px -18px rgba(15,23,42,.35);padding:10px;display:flex;flex-direction:column}
.mnav nav a{color:var(--sub);font-size:14px;font-weight:600;padding:9px 12px;border-radius:8px}
.mnav nav a:hover{color:var(--indigo);background:#eef2ff;text-decoration:none}
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
/* continue + my progress */
#su-continue{margin:0 0 16px;border:1px solid #c7d2fe;border-radius:16px;padding:14px 18px;background:linear-gradient(135deg,#eef2ff,#fff);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
#su-continue .k{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--indigo)}
#su-continue b{font-size:15px}
#su-continue a.go{margin-left:auto;font-weight:700;color:#fff;background:var(--indigo);border-radius:10px;padding:8px 16px}
#su-continue a.go:hover{background:#4338ca;text-decoration:none}
#su-my-progress{margin:0 0 16px;border:1px solid var(--line);border-radius:16px;padding:14px 18px;background:var(--card)}
#su-my-progress .su-my-bar{height:10px;border-radius:999px;background:#f1f5f9;overflow:hidden}
#su-my-progress .su-my-fill{height:100%;width:2%;border-radius:999px;background:linear-gradient(90deg,#4f46e5,#8b5cf6,#f59e0b);transition:width .4s}
#su-my-progress .su-my-label{display:block;margin-top:8px;font-size:13px;font-weight:700;color:var(--sub)}
/* start-here path */
.steps{list-style:none;margin:0 0 8px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.steps li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;position:relative}
.steps .n{position:absolute;top:-12px;left:14px;background:var(--indigo);color:#fff;font-size:12px;font-weight:800;border-radius:999px;padding:2px 11px}
.steps b{display:block;margin:6px 0 4px;font-size:15px}
.steps p{margin:0 0 8px;font-size:13px;color:var(--sub)}
.steps a{font-size:13px;font-weight:700}
/* stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.stat b{display:block;font-size:26px;font-weight:800;color:var(--indigo)}
.stat span{display:block;font-size:13px;font-weight:700;color:var(--ink);margin-top:2px}
.stat em{display:block;font-size:12px;color:#94a3b8;font-style:normal}
/* directory */
h2.title{font-size:22px;font-weight:800;margin:34px 0 4px;scroll-margin-top:80px}
p.title-sub{color:var(--sub);margin:0 0 16px}
.stage-tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:#0f172a;border-radius:999px;padding:3px 12px;margin:26px 0 10px}
.stage-tag.pre{background:#4f46e5}.stage-tag.mains{background:#b45309}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:8px}
.area{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column}
.area.is-complete{border-color:#16a34a}
.area h3{margin:0 0 4px;font-size:16px;display:flex;align-items:center;gap:8px}
.area h3 .count{margin-left:auto;font-size:12px;color:var(--sub);background:#f1f5f9;border-radius:999px;padding:2px 9px;font-weight:700}
.area .step{flex:none;width:26px;height:26px;border-radius:9px;background:#0f172a;color:#fff;font-size:13px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}
.area.is-complete .step{background:#16a34a}
.area .ic{font-size:18px}
.area .blurb{margin:0 0 10px;font-size:13px;color:var(--sub)}
.area-link{color:var(--ink)}
.area-link:hover{color:var(--indigo);text-decoration:none}
.topics{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.topics li{font-size:13px;display:flex;align-items:center;gap:4px}
.topics a{display:inline-flex;align-items:center;gap:6px;color:var(--sub);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
.topics a:hover{border-color:var(--indigo);color:var(--indigo);background:#eef2ff;text-decoration:none}
.topics .ord{font-size:10.5px;font-weight:800;color:#fff;background:#94a3b8;border-radius:6px;padding:0 5px}
.topics a:hover .ord{background:var(--indigo)}
.topics .n{color:#94a3b8;font-size:11px}
.su-area{display:flex;align-items:center;gap:8px;margin-top:12px}
.su-area-bar{flex:1;height:6px;border-radius:999px;background:#f1f5f9;overflow:hidden}
.su-area-fill{height:100%;width:2%;border-radius:999px;background:linear-gradient(90deg,#4f46e5,#8b5cf6);transition:width .4s}
.su-area-pct{font-size:11px;font-weight:700;color:var(--sub);white-space:nowrap}
/* filter */
.filterbar{display:flex;gap:10px;align-items:center;margin:0 0 6px;flex-wrap:wrap}
.filterbar input{flex:1;min-width:220px;border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:14px;background:var(--card);color:var(--ink);outline:none}
.filterbar input:focus{border-color:var(--accent)}
#su-filter-count{font-size:12.5px;color:var(--sub)}
/* how to use */
.howto{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:6px 0 8px}
.howto div{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.howto b{display:block;font-size:15px;margin-bottom:4px}
.howto p{margin:0;font-size:13px;color:var(--sub)}
.howto a{font-weight:700;font-size:13px}
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
/* dark mode */
html.su-dark{--ink:#e2e8f0;--sub:#94a3b8;--line:#26334d;--bg:#0b1220;--card:#101b31}
html.su-dark .site-head{background:rgba(16,27,49,.92)}
html.su-dark .topnav a:hover{background:#1e1b4b}
html.su-dark .tbtn{background:#101b31;color:#e2e8f0}
html.su-dark .mnav summary{background:#101b31;color:#e2e8f0}
html.su-dark .mnav nav{background:#101b31}
html.su-dark #su-continue{background:linear-gradient(135deg,#1e1b4b,#101b31)}
html.su-dark #su-my-progress .su-my-bar,html.su-dark .su-area-bar{background:#1a2740}
html.su-dark .stat b{color:#a5b4fc}
html.su-dark .area h3 .count{background:#1a2740;color:#94a3b8}
html.su-dark .area .step{background:#e0e7ff;color:#1e1b4b}
html.su-dark .book{background:linear-gradient(135deg,#231a05,#101b31)}
html.su-dark .book .btn{color:#fbbf24}
html.su-dark .site-foot{background:#101b31}
html.su-dark a{color:#fbbf24}
html.su-dark .topics a:hover{background:#1e1b4b;border-color:#818cf8;color:#c7d2fe}
@media(max-width:760px){
.topnav{display:none}
.mnav{display:block}
.hero{padding:32px 24px;margin-top:18px}
.hero h1{font-size:27px}
.grid{grid-template-columns:1fr}
.book{flex-wrap:wrap}
.book .btn{margin-left:0}
.area h3{flex-wrap:wrap}
}
@media print{.site-head,.cta,.site-foot,.topics a,.mnav,.filterbar,#su-continue,#su-my-progress,.su-area,.tbtn{display:none}}
</style>
</head>
<body data-study-kind="home">
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
  <button class="tbtn su-theme" type="button" title="Toggle dark / light mode">◐ Dark</button>
  <details class="mnav"><summary aria-label="Open menu">☰</summary><nav aria-label="Mobile">
    <a href="./">⌂ Home</a>
    <a href="content/index.html#content-prelims">📋 Prelims</a>
    <a href="content/index.html#content-mains">✍️ Mains</a>
    <a href="book/index.html">📖 Book</a>
    <a href="content/index.html">📚 All files</a>
    <a href="app.html">🔍 Search &amp; Tracker</a>
  </nav></details>
</div></header>
<main class="wrap">
  <section class="hero">
    <p class="eyebrow">Civil Services Examination · IAS · IPS · IFS</p>
    <h1>Your complete UPSC <span>CSE</span> study website</h1>
    <p class="lead">The full Prelims &amp; Mains syllabus in study order — detailed notes, revision sheets, mindmaps, diagrams and PYQs. Every page opens directly. No login, works offline, progress saves on your device.</p>
    <div class="cta">
      <a class="btn primary" href="#start-here">🗺 Start here — the study path</a>
      <a class="btn" href="content/index.html">📚 Browse all files</a>
      <a class="btn" href="book/index.html">Read as a book 📖</a>
    </div>
  </section>

  <section id="su-continue" hidden aria-live="polite">
    <span class="k">▶ Continue learning</span><b id="su-continue-title"></b>
    <a class="go" id="su-continue-link" href="#">Resume →</a>
  </section>
  <section id="su-my-progress" hidden aria-label="My progress">
    <div class="su-my-bar"><div class="su-my-fill"></div></div>
    <span class="su-my-label"></span>
  </section>

  <h2 class="title" id="start-here">New here? Follow the path in order 👇</h2>
  <p class="title-sub">Four steps. Do them top-to-bottom and you will cover the whole exam without getting lost.</p>
  <ol class="steps">
    <li><span class="n">Step 1</span><b>🧭 Understand the exam</b><p>Prelims screens, Mains ranks. See the papers, marks and what actually counts.</p><a href="app.html#/paper/prelims-gs1">Prelims pattern →</a> · <a href="app.html#/paper/gs-1">Mains pattern →</a></li>
    <li><span class="n">Step 2</span><b>📋 Finish Prelims (1 → 3)</b><p>GS Paper I subjects in order, then CSAT basics, then timed mocks.</p><a href="#stage-prelims">Go to Stage 1 ↓</a></li>
    <li><span class="n">Step 3</span><b>✍️ Finish Mains (4 → 10)</b><p>GS I–IV and Essay first, then your ONE optional. Write answers daily.</p><a href="#stage-mains">Go to Stage 2 ↓</a></li>
    <li><span class="n">Step 4</span><b>✅ Track &amp; test yourself</b><p>Tick topics complete, re-attempt PYQs in quiz mode, watch the bars fill.</p><a href="app.html#/tracker">Open tracker →</a></li>
  </ol>

  <section class="stats" aria-label="Site statistics">${stats}</section>

  <h2 class="title">Study the syllabus in order</h2>
  <p class="title-sub">Follow the step numbers 1 → 10. Inside every topic read 📖 Detailed → 📝 Short notes → 🔹 Points → 🗺️ Diagrams → ❓ PYQs.</p>
  <div class="filterbar no-print"><input id="su-filter" type="search" placeholder="🔍 Filter sections &amp; topics… (try “polity”, “ethics”, “maps”)" aria-label="Filter sections"><span id="su-filter-count" aria-live="polite"></span></div>
  <div class="stage-tag pre" id="stage-prelims">Stage 1 · Prelims — start here</div>
  <section class="grid">${prelimsCards}</section>
  <div class="stage-tag mains" id="stage-mains">Stage 2 · Mains — after Prelims</div>
  <section class="grid">${mainsCards}</section>

  <h2 class="title">Three ways to use this site</h2>
  <div class="howto">
    <div><b>📚 Browse in order</b><p>Click any numbered section above. Breadcrumbs, topic pills and prev/next keep you on the path.</p><a href="content/index.html">Open the library →</a></div>
    <div><b>📖 Read as one book</b><p>All ${bookLessons} lessons woven into a single continuous read with page numbers.</p><a href="book/index.html">Open the book →</a></div>
    <div><b>✅ Track + search everything</b><p>Tick topics done, search every note instantly with Ctrl+K, test with PYQs.</p><a href="app.html">Open Search &amp; Tracker →</a></div>
  </div>

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
<script src="assets/js/study.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
const onlyHomepage = process.argv.includes('--homepage');

const allFiles = walk(CONTENT).map((abs) => ({ abs, rel: rel(abs) }));
const allRels = allFiles.map((f) => f.rel);
const absOf = new Map(allFiles.map((f) => [f.rel, f.abs]));
const leafDocs = allFiles.filter((f) =>
  f.rel.endsWith('.html') && path.posix.basename(f.rel) !== 'index.html');
const titleCache = new Map();
const titleOf = (r) => {
  if (!titleCache.has(r)) {
    const abs = absOf.get(r);
    titleCache.set(r, (abs && pageTitle(abs)) ||
      path.posix.basename(r).replace(/\.html$/i, '').replace(/[-_]/g, ' '));
  }
  return titleCache.get(r);
};

let rewritten = 0, skipped = 0;
if (!onlyHomepage) {
  for (const d of leafDocs) {
    const dirAbs = path.dirname(d.abs);
    const dirRel = path.posix.dirname(d.rel);            // e.g. content/prelims/gs1/economy/notes
    const homeRel = relFromDir(dirAbs, HOME_FILE);
    const catalogRel = relFromDir(dirAbs, CATALOG_FILE);
    const toRoot = relFromDir(dirAbs, ROOT);
    const studyRel = (toRoot === '.' ? '' : toRoot + '/') + 'assets/js/study.js';
    const title = titleOf(d.rel);

    // breadcrumb trail (ancestors only; the header adds Home + current page)
    const parts = dirRel.split('/').filter(Boolean);     // ['content','prelims','gs1','economy','notes']
    const trail = [];
    for (let j = 1; j < parts.length; j++) {
      const dirSoFar = parts.slice(0, j + 1).join('/');  // 'content/prelims', ...
      trail.push({ href: `${catalogRel}#${anchorOf(dirSoFar)}`, label: niceLabel(parts[j]) });
    }

    // topic pills + cross-section prev/next (shared chrome)
    const tc = topicContext(allRels, dirRel, d.rel, titleOf);
    const pills = tc.pills.slice();
    if (pills.length) {
      pills.push({
        href: `${catalogRel}#${anchorOf(tc.topicRoot)}`,
        label: 'All', icon: '☰', idx: true,
      });
    }
    const upLabel = parts.length > 1 ? niceLabel(parts[parts.length - 1]) : 'All files';

    if (rewriteDoc(d.abs, {
      homeRel, catalogRel, trail, here: title, pills,
      prev: tc.prev, next: tc.next,
      upHref: `${catalogRel}#${anchorOf(dirRel)}`, upLabel,
      studyRel, topicNav: topicNavOf(dirRel), fileRel: d.rel, sectionLabel: sectionOf(dirRel),
    })) rewritten++;
    else skipped++;
  }
  console.log(`[nav] ${rewritten} documents rewritten · ${skipped} already had site navigation`);
}

fs.writeFileSync(HOME_FILE, buildHomepage(leafDocs));
console.log(`[home] ${rel(HOME_FILE)} rebuilt (${leafDocs.length} documents, ${AREAS.length} areas)`);
