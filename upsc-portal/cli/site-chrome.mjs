/* ============================================================================
   studyUPSC — shared site chrome (responsive nav + topic pills + Q&A cards)
   ----------------------------------------------------------------------------
   Single source of truth for the header / pager / Q&A styling injected into
   every content document. Used by:

     cli/build-site.mjs   (new documents + homepage template reference)
     cli/upgrade-site.mjs (batch upgrade of existing documents)

   Keep this module dependency-free apart from node:path.
   ========================================================================== */

import path from 'node:path';

export const CHROME_VERSION = 'v2';
export const OLD_MARKER = '<!-- studyupsc-site-nav -->';
export const V2_MARKER = '<!-- studyupsc-chrome-v2 -->';

export const SECTION_ORDER = ['detailed-notes', 'short-notes', 'bullet-points', 'diagrams', 'pyqs'];
export const SECTION_META = {
  'detailed-notes': { icon: '📖', label: 'Detailed' },
  'short-notes': { icon: '📝', label: 'Short notes' },
  'bullet-points': { icon: '🔹', label: 'Points' },
  'mindmaps': { icon: '🔹', label: 'Mindmap' },
  'diagrams': { icon: '🗺️', label: 'Diagrams' },
  'maps': { icon: '🗺️', label: 'Maps' },
  'pyqs': { icon: '❓', label: 'PYQs' },
};

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/*  Injected document stylesheet (v2): responsive header, topic pills,  */
/*  Q&A cards, pager, back-to-top, print rules.                        */
/* ------------------------------------------------------------------ */
/* Q&A card rules, shared by content documents and the book edition
   (book.mjs imports QA_CSS; keep it self-contained). */
export const QA_CSS = `/* studyupsc-qa-cards */
.qa-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 6px;padding:10px 14px;background:#f8fafc;border:1px solid var(--line);border-radius:12px;font-size:13px;color:var(--sub);font-family:Inter,system-ui,sans-serif}
.qa-count{font-weight:800;color:var(--ink)}
.qa-toolbar button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 13px;font-size:12.5px;font-weight:700;color:#4f46e5;cursor:pointer;font-family:inherit}
.qa-toolbar button:hover{border-color:#4f46e5;background:#eef2ff}
.qa{border:1px solid var(--line);border-radius:14px;margin:14px 0;overflow:hidden;background:#fff;scroll-margin-top:130px}
.qa-q{padding:14px 16px}
.qa-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.qa-badge{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 9px;border-radius:999px;background:#4f46e5;color:#fff;font-size:12px;font-weight:800;font-family:Inter,system-ui,sans-serif}
.qa-tag{font-size:11px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:2px 9px;font-family:Inter,system-ui,sans-serif}
.qa-text{margin:.3em 0}
.qa-lead{margin:.5em 0 .2em;font-weight:600}
ol.qa-stmts,ul.qa-stmts{margin:.5em 0;padding-left:1.4em}
.qa-opts{list-style:none;padding:0;margin:10px 0 2px;display:grid;gap:6px}
.qa-opts li{margin:0;border:1px solid var(--line);border-radius:10px;padding:8px 12px 8px 10px;background:#f8fafc;font-size:.95em;display:flex;gap:9px;align-items:baseline}
.qa-opts .opt{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:#e0e7ff;color:#3730a3;font-size:11.5px;font-weight:800;font-family:Inter,system-ui,sans-serif}
.qa-a{border-top:1px dashed var(--line);background:#f0fdf4}
.qa-a summary{cursor:pointer;padding:10px 16px;font-weight:700;font-size:13.5px;color:#15803d;list-style:none;user-select:none;-webkit-user-select:none;font-family:Inter,system-ui,sans-serif}
.qa-a summary::-webkit-details-marker{display:none}
.qa-a summary::before{content:"\\25B8 "}
.qa-a[open] summary::before{content:"\\25BE "}
.qa-a .a-body{padding:0 16px 14px;font-size:.95em}
.qa-a .ans{display:inline-block;background:#16a34a;color:#fff;font-weight:800;font-size:12px;border-radius:999px;padding:2px 10px;margin:0 6px 6px 0;font-family:Inter,system-ui,sans-serif}`;

export const DOC_CSS = `/* studyupsc-site-chrome-v2 */
header.site{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
header.site .head-in{display:flex;align-items:center;gap:12px;padding-top:10px;padding-bottom:10px}
header.site a.brand{color:var(--ink);text-decoration:none;white-space:nowrap}
header.site a.brand:hover{color:#b45309}
.crumbs{font-size:12px;color:var(--sub);display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.crumbs a{color:var(--sub);text-decoration:none}
.crumbs a:hover{color:#b45309;text-decoration:underline}
.crumbs .sep{color:#cbd5e1}
.crumbs .ell{color:#cbd5e1}
.crumbs .here{color:var(--ink);font-weight:600}
.crumbs-short{display:none}
.nav-home{margin-left:auto;font-size:12px;color:var(--sub);text-decoration:none;white-space:nowrap}
.nav-home:hover{color:#b45309;text-decoration:underline}
.menu{display:none;position:relative;margin-left:auto}
.menu summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:10px;padding:5px 11px;font-size:16px;line-height:1.4;background:#fff;color:var(--ink);user-select:none;-webkit-user-select:none}
.menu summary::-webkit-details-marker{display:none}
.menu summary:hover{border-color:#f59e0b}
.menu[open] summary{border-color:#f59e0b;background:#fffbeb}
.menu-panel{position:absolute;right:0;top:calc(100% + 8px);width:min(330px,84vw);max-height:70vh;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px -18px rgba(15,23,42,.35);padding:12px 14px;font-size:13px}
.menu-sec{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin:10px 0 6px}
.menu-sec:first-child{margin-top:0}
.menu-panel a{display:block;color:var(--sub);text-decoration:none;padding:5px 8px;border-radius:8px}
.menu-panel a:hover{background:#fffbeb;color:#b45309}
.menu-panel a.here{color:var(--ink);font-weight:700}
.menu-panel .mhere{display:block;padding:5px 8px;color:var(--ink);font-weight:700}
.menu-row{display:flex;gap:8px;margin-top:10px}
.menu-row a{flex:1;text-align:center;border:1px solid var(--line);font-weight:600;color:#b45309}
div.topic-nav{border-bottom:1px solid var(--line);background:#fff}
div.topic-in{display:flex;gap:8px;align-items:center;overflow-x:auto;padding-top:9px;padding-bottom:9px;scrollbar-width:thin}
.topic-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;white-space:nowrap;flex:none}
.pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none;font-size:12.5px;font-weight:600;color:var(--sub);border:1px solid var(--line);border-radius:999px;padding:5px 12px;text-decoration:none;background:#f8fafc}
a.pill:hover{border-color:#4f46e5;color:#4f46e5;background:#eef2ff;text-decoration:none}
.pill[aria-current="page"]{background:#0f172a;color:#fff;border-color:#0f172a}
.pill.idx{border-style:dashed;background:#fff}
.pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:40px;font-size:13px;color:var(--sub)}
.pager a{color:#b45309;text-decoration:none;font-weight:600}
.pager a:hover{text-decoration:underline}
.pager .up{color:var(--sub)}
.pager .dim{color:#cbd5e1}
h1[id],h2[id],h3[id],h4[id]{scroll-margin-top:120px}
${QA_CSS}
.to-top{position:fixed;right:18px;bottom:18px;z-index:70;width:42px;height:42px;border-radius:12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .2s,transform .2s;box-shadow:0 10px 24px -10px rgba(15,23,42,.5)}
.to-top.on{opacity:1;pointer-events:auto;transform:none}
a.to-top:hover{color:#fbbf24;text-decoration:none}
@media (max-width:760px){
.crumbs-full{display:none}
.crumbs-short{display:flex;flex-wrap:nowrap;overflow:hidden}
.crumbs-short .here{max-width:34vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.crumbs-short a{white-space:nowrap}
.nav-home{margin-left:0}
.nav-home .t{display:none}
.menu{display:block}
header.site .head-in{gap:10px;flex-wrap:nowrap}
.card{padding:22px 18px}
.wrap{padding:24px 14px 64px}
div.topic-in{padding-top:8px;padding-bottom:8px}
h1{font-size:22px}
h2{font-size:18px}
.pager{flex-direction:column;align-items:stretch;text-align:center}
.pager .up{order:-1}
.qa-q{padding:12px 13px}
.to-top{right:12px;bottom:12px}
}
@media (max-width:480px){
.crumbs-short a:not(:first-child),.crumbs-short .sep{display:none}
.crumbs-short .here{max-width:46vw}
header.site .head-in{gap:8px}
.topic-label{display:none}
}
@media print{
header.site{position:static}
.menu,.topic-nav,.nav-home,.qa-toolbar,.to-top{display:none!important}
.qa{break-inside:avoid}
}`;

/* Tiny dependency-free behaviour: back-to-top, show/hide all answers,
   expand answers before printing. */
export const CHROME_JS = `<script>/* studyupsc-chrome-js */
(function(){try{var t=document.querySelector('.to-top');if(t){var f=function(){t.classList.toggle('on',window.scrollY>600);};window.addEventListener('scroll',f,{passive:true});f();t.addEventListener('click',function(e){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});}document.addEventListener('click',function(e){var b=e.target.closest('[data-qa]');if(!b)return;var open=b.getAttribute('data-qa')==='show';document.querySelectorAll('.qa-a').forEach(function(d){d.open=open;});});window.addEventListener('beforeprint',function(){document.querySelectorAll('.qa-a').forEach(function(d){d.open=true;});});}catch(e){}})();
</script>`;

export const TO_TOP_HTML = '<a class="to-top no-print" href="#" aria-label="Back to top">↑</a>';

/* ------------------------------------------------------------------ */
/*  Responsive additions for book pages (book/index, edition, lessons) */
/* ------------------------------------------------------------------ */
export const BOOK_RWD_CSS = `<style>/* studyupsc-book-rwd */
.bk-top .in{flex-wrap:wrap;row-gap:6px}
@media (max-width:640px){
.bk-top .in{gap:10px;padding:10px 14px;font-size:12px}
.wrap{padding:30px 16px 72px}
h1{font-size:27px}
.bk-hero{padding:30px 24px}
.bk-hero h1{font-size:30px}
.bk-nav{flex-direction:column}
.bk-nav .r{text-align:left}
.bk-lesson-toc a{margin:3px 10px 3px 0}
.bk-stats{gap:16px}
table{font-size:.82em}
.bk-toc .num{min-width:36px}
}
</style>`;

/* ------------------------------------------------------------------ */
/*  Header / topic strip / pager builders                              */
/* ------------------------------------------------------------------ */
export function buildTopicNav(pills, label) {
  if (!pills || pills.length < 2) return '';
  return '<div class="topic-nav no-print"><div class="wrap topic-in"><span class="topic-label">' +
    esc(label || 'This topic') + '</span>' +
    pills.map((p) => '<a class="pill' + (p.idx ? ' idx' : '') + '" href="' + p.href + '"' +
      (p.current ? ' aria-current="page"' : '') + '>' + p.icon + ' ' + esc(p.label) + '</a>').join('') +
    '</div></div>';
}

export function buildHeader(ctx) {
  const { homeRel, catalogRel, trail, here, pills, prev, next } = ctx;
  const sep = '<span class="sep" aria-hidden="true">›</span>';
  const full = ['<a href="' + homeRel + '">Home</a>']
    .concat(trail.map((t) => sep + '<a href="' + t.href + '">' + esc(t.label) + '</a>'))
    .concat([sep + '<span class="here">' + esc(here) + '</span>']).join('');
  const shortTrail = trail.length > 2 ? trail.slice(-2) : trail;
  const short = ['<a href="' + homeRel + '">Home</a>']
    .concat(trail.length > 2 ? [sep + '<span class="ell" aria-hidden="true">…</span>'] : [])
    .concat(shortTrail.map((t) => sep + '<a href="' + t.href + '">' + esc(t.label) + '</a>'))
    .concat([sep + '<span class="here">' + esc(here) + '</span>']).join('');
  const menuTrail = ['<a href="' + homeRel + '">⌂ Home</a>']
    .concat(trail.map((t) => '<a href="' + t.href + '">' + esc(t.label) + '</a>'))
    .concat(['<span class="mhere">' + esc(here) + '</span>']).join('');
  const menuPills = (pills && pills.length)
    ? '<div class="menu-sec">In this topic</div>' + pills.map((p) =>
      '<a href="' + p.href + '"' + (p.current ? ' class="here" aria-current="page"' : '') + '>' +
      p.icon + ' ' + esc(p.label) + '</a>').join('') : '';
  const menuRow = (prev || next)
    ? '<div class="menu-row">' + (prev ? '<a href="' + prev.href + '">← Prev</a>' : '') +
      (next ? '<a href="' + next.href + '">Next →</a>' : '') + '</div>' : '';
  return '<header class="site"><div class="wrap head-in">\n' +
    '  <a class="brand" href="' + homeRel + '">study<span>UPSC</span></a>\n' +
    '  <nav class="crumbs crumbs-full" aria-label="Breadcrumb">' + full + '</nav>\n' +
    '  <nav class="crumbs crumbs-short" aria-label="Breadcrumb">' + short + '</nav>\n' +
    '  <a class="nav-home no-print" href="' + catalogRel + '">📚 <span class="t">All files</span></a>\n' +
    '  <details class="menu no-print"><summary aria-label="Open page menu">☰</summary>' +
    '<div class="menu-panel"><div class="menu-sec">Page trail</div>' + menuTrail + menuPills + menuRow +
    '</div></details>\n' +
    '</div></header>' + buildTopicNav(pills);
}

export function buildPager({ prev, next, upHref, upLabel }) {
  const short = (t) => (t.length > 34 ? t.slice(0, 33) + '…' : t);
  return '<footer class="pager no-print">\n' +
    '  <span>' + (prev ? '<a href="' + prev.href + '" rel="prev">← ' + esc(short(prev.title)) + '</a>' : '<span class="dim">Start</span>') + '</span>\n' +
    '  <a class="up" href="' + upHref + '">↑ ' + esc(upLabel) + ' · all files</a>\n' +
    '  <span>' + (next ? '<a href="' + next.href + '" rel="next">' + esc(short(next.title)) + ' →</a>' : '<span class="dim">End</span>') + '</span>\n' +
    '</footer>';
}

/* ------------------------------------------------------------------ */
/*  Topic context: pills + cross-section prev/next for one document.   */
/*  allFiles: site-relative rels of every file under content/.         */
/*  dirRel:   site-relative dir of the current file (no trailing /).   */
/*  fileRel:  site-relative rel of the current file.                   */
/*  titleOf:  (rel) -> human title.                                    */
/* ------------------------------------------------------------------ */
export function topicContext(allFiles, dirRel, fileRel, titleOf) {
  const section = dirRel.split('/').pop();
  const inSection = SECTION_ORDER.includes(section);
  let groupDirs, topicRoot;
  if (inSection) {
    const parts = dirRel.split('/');
    parts.pop();
    topicRoot = parts.join('/') || 'content';
    // Only direct children of the topic root (section folders + root files),
    // never deeper nested sub-topics.
    groupDirs = SECTION_ORDER.map((s) => topicRoot + '/' + s).concat([topicRoot]);
  } else {
    topicRoot = dirRel;
    groupDirs = [dirRel];
  }
  const dirOf = (r) => r.split('/').slice(0, -1).join('/');
  const inGroup = allFiles.filter((r) => groupDirs.includes(dirOf(r)) && !r.endsWith('/index.html'));
  const htmlFiles = inGroup.filter((r) => /\.html?$/i.test(r));
  const secRank = (r) => {
    const d = dirOf(r).split('/').pop();
    const i = SECTION_ORDER.indexOf(d);
    return i === -1 ? 99 : i;
  };
  const seq = htmlFiles.slice().sort((a, b) => {
    const ra = secRank(a), rb = secRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  const relHref = (target) => path.posix.relative(dirRel, target) || path.posix.basename(target);

  let pills = [];
  if (inSection) {
    for (const s of SECTION_ORDER) {
      const inSec = inGroup.filter((r) => dirOf(r) === topicRoot + '/' + s);
      if (!inSec.length) continue;
      inSec.sort((a, b) => {
        const ah = /\.html?$/i.test(a) ? 0 : 1, bh = /\.html?$/i.test(b) ? 0 : 1;
        if (ah !== bh) return ah - bh;
        return a.localeCompare(b, undefined, { numeric: true });
      });
      const meta = SECTION_META[s] || { icon: '📄', label: s };
      pills.push({ href: relHref(inSec[0]), label: meta.label, icon: meta.icon, current: s === section });
    }
  }
  const idx = seq.indexOf(fileRel);
  const prev = idx > 0 ? { href: relHref(seq[idx - 1]), title: titleOf(seq[idx - 1]) || seq[idx - 1] } : null;
  const next = idx >= 0 && idx < seq.length - 1
    ? { href: relHref(seq[idx + 1]), title: titleOf(seq[idx + 1]) || seq[idx + 1] } : null;
  return { pills, prev, next, topicRoot, count: seq.length };
}

/* ------------------------------------------------------------------ */
/*  Q&A transformer: dense question paragraphs -> readable cards with  */
/*  option lists and per-question answer reveals. Fail-safe: callers   */
/*  must verify invariants and revert on mismatch.                     */
/* ------------------------------------------------------------------ */
const BLOCK_RE = /<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p(?:\s[^>]*)?>[\s\S]*?<\/p>|<(ol|ul)(?:\s[^>]*)?>[\s\S]*?<\/\1>|<table(?:\s[^>]*)?>[\s\S]*?<\/table>|<blockquote(?:\s[^>]*)?>[\s\S]*?<\/blockquote>|<hr\s*\/?>|<pre(?:\s[^>]*)?>[\s\S]*?<\/pre>/g;

const Q_NUM_RE = /^<p[^>]*>\s*<strong>Q(\d+)\.\s*(\([^)]*\)\s*)?<\/strong>([\s\S]*?)<\/p>$/;
const Q_MAINS_RE = /^<p[^>]*>\s*<strong>Q\.\s*(\([^)]*\))<\/strong>([\s\S]*?)<\/p>$/;
const MODEL_ANS_RE = /^<p[^>]*>\s*<strong>Model answer:<\/strong>([\s\S]*?)<\/p>$/;
const SKELETON_H_RE = /^<h3[^>]*>\s*Model answer skeleton\s*<\/h3>$/;
const KEY_TABLE_RE = /<table(?:\s[^>]*)?>[\s\S]*?<\/table>/g;

/* Split "lead text (a) opt1 (b) opt2 ..." into lead + options.
   Markers must start at (a) and increase a->b->c->d; anything after the
   first out-of-sequence marker stays inside the last option. */
function splitOptions(inner) {
  const re = /\(([a-d])\)/g;
  const marks = [];
  let m;
  while ((m = re.exec(inner))) marks.push({ letter: m[1], index: m.index });
  if (marks.length < 2 || marks[0].letter !== 'a') return null;
  const order = 'abcd';
  const seq = [marks[0]];
  for (let i = 1; i < marks.length; i++) {
    if (order.indexOf(marks[i].letter) === order.indexOf(seq[seq.length - 1].letter) + 1) seq.push(marks[i]);
    else break;
  }
  if (seq.length < 2) return null;
  const lead = inner.slice(0, seq[0].index).trim();
  const opts = seq.map((mk, i) => ({
    letter: mk.letter,
    text: inner.slice(mk.index + 3, i + 1 < seq.length ? seq[i + 1].index : inner.length).trim(),
  }));
  if (opts.some((o) => !o.text)) return null;
  return { lead, opts };
}

function optsHtml(o) {
  return '<ol class="qa-opts">' + o.opts.map((x) =>
    '<li><span class="opt">(' + x.letter + ')</span><span>' + x.text + '</span></li>').join('') + '</ol>';
}

/* Parse an inline "Model answer:" body -> { ans, why }. The answer letter
   must be parenthesised or <strong>-wrapped (never a bare leading word). */
function parseModelAnswer(inner) {
  const t = inner.trim();
  const m = t.match(/^(?:<strong>\s*\(?([a-dA-D])\)?\s*<\/strong>|\(+([a-dA-D])\)+)[\s.\)]*(?:—|–|-)?\s*/);
  if (!m) return { ans: null, why: t };
  const ans = (m[1] || m[2]).toLowerCase();
  const why = t.slice(m[0].length).trim().replace(/^(—|–|-)\s*/, '');
  return { ans, why };
}

/* Build Q-number -> { ans, why } from an "Answer key" table or an
   "Answers" paragraph, when present. */
function buildAnswerMap(cardHtml) {
  const map = new Map();
  let tm;
  KEY_TABLE_RE.lastIndex = 0;
  while ((tm = KEY_TABLE_RE.exec(cardHtml))) {
    const table = tm[0];
    if (!/>Q<\/(th|td)>/.test(table) || !/>Ans<\/(th|td)>/.test(table)) continue;
    const rows = table.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*\(?([a-dA-D])\)?\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g);
    for (const r of rows) map.set(r[1], { ans: r[2].toLowerCase(), why: r[3].trim() });
  }
  const am = cardHtml.match(/<h2[^>]*>\s*Answers\s*<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  if (am) {
    for (const seg of am[1].split('·')) {
      const sm = seg.match(/^\s*<strong>(\d+)-([a-dA-D])<\/strong>([\s\S]*)$/);
      if (sm) map.set(sm[1], { ans: sm[2].toLowerCase(), why: sm[3].trim() });
    }
  }
  return map;
}

function splitBlocks(cardHtml) {
  const blocks = [];
  let last = 0, m;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(cardHtml))) {
    if (m.index > last) blocks.push({ raw: true, html: cardHtml.slice(last, m.index) });
    blocks.push({ raw: false, html: m[0] });
    last = m.index + m[0].length;
  }
  if (last < cardHtml.length) blocks.push({ raw: true, html: cardHtml.slice(last) });
  return blocks;
}

function isHeading(b, levels) {
  const m = b.match(/^<h([1-6])[^>]*>/);
  return m ? levels.includes(Number(m[1])) : false;
}

function renderQA(cur, usedIds) {
  let base = 'qa-' + (cur.num || 'm');
  let id = base, k = 2;
  while (usedIds.has(id)) id = base + '-' + (k++);
  usedIds.add(id);
  let qInner = '<div class="qa-head"><span class="qa-badge">Q' + (cur.num || '') + '</span>' +
    (cur.tag ? '<span class="qa-tag">' + esc(cur.tag.replace(/^\(|\)$/g, '')) + '</span>' : '') + '</div>';
  for (const q of cur.q) qInner += q;
  for (const s of cur.stmts) qInner += s;
  if (cur.opts) qInner += cur.opts;
  let extra = '';
  if (cur.answer && (cur.answer.ans || cur.answer.why)) {
    extra += '<details class="qa-a"><summary>Show answer</summary><div class="a-body">' +
      (cur.answer.ans ? '<span class="ans">Correct: (' + cur.answer.ans + ')</span>' : '') +
      (cur.answer.why || '') + '</div></details>';
  }
  if (cur.skeleton.length) {
    extra += '<details class="qa-a qa-model" open><summary>Model answer outline</summary><div class="a-body">' +
      cur.skeleton.join('') + '</div></details>';
  }
  return '<section class="qa" id="' + id + '"><div class="qa-q">' + qInner + '</div>' + extra + '</section>';
}

export function transformQA(cardHtml) {
  if (!cardHtml || cardHtml.includes('class="qa"')) return { html: cardHtml, count: 0 };
  if (!/<strong>Q(\d+)\.|<strong>Q\.\s*\(/.test(cardHtml)) return { html: cardHtml, count: 0 };

  const answers = buildAnswerMap(cardHtml);
  const blocks = splitBlocks(cardHtml);
  const out = [];
  const usedIds = new Set();
  let cur = null;
  let count = 0;
  const flush = () => { if (cur) { out.push(renderQA(cur, usedIds)); cur = null; count++; } };

  const startCard = (num, tag, rest) => {
    flush();
    cur = { num, tag: tag ? tag.trim() : '', q: [], stmts: [], opts: null, answer: null, skeleton: [], inSkeleton: false };
    const o = splitOptions(rest);
    if (o) {
      if (o.lead) cur.q.push('<p class="qa-text">' + o.lead + '</p>');
      cur.opts = optsHtml(o);
    } else if (rest.trim()) {
      cur.q.push('<p class="qa-text">' + rest.trim() + '</p>');
    }
    if (num && answers.has(num)) cur.answer = answers.get(num);
  };

  const endSkeleton = () => { if (cur) cur.inSkeleton = false; };

  for (const b of blocks) {
    if (b.raw) { out.push(b.html); continue; }
    const html = b.html;

    let m;
    if ((m = html.match(Q_NUM_RE))) { startCard(m[1], m[2] || '', m[3] || ''); continue; }
    if ((m = html.match(Q_MAINS_RE))) { startCard('', m[1] || '', m[2] || ''); continue; }

    if (SKELETON_H_RE.test(html)) {
      if (cur && !cur.answer) { cur.inSkeleton = true; cur.skeleton.push(html); }
      else { flush(); out.push(html); }
      continue;
    }
    if ((m = html.match(MODEL_ANS_RE))) {
      if (cur && !cur.inSkeleton) { cur.answer = parseModelAnswer(m[1]); flush(); }
      else if (cur && cur.inSkeleton) { cur.skeleton.push(html); }
      else out.push(html);
      continue;
    }
    if (/^<(ol|ul)[\s>]/.test(html)) {
      const lis = [...html.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/g)].map((x) => x[1]);
      const qLis = lis.filter((li) => /^\s*<strong>Q(\d+)\./.test(li));
      if (qLis.length && qLis.length === lis.length) {
        // Pattern-B: a whole list of questions -> one card each.
        flush();
        for (const li of lis) {
          const qm = li.match(/^\s*<strong>Q(\d+)\.\s*(\([^)]*\)\s*)?<\/strong>([\s\S]*)$/);
          if (!qm) { out.push('<ul><li>' + li + '</li></ul>'); continue; }
          startCard(qm[1], qm[2] || '', qm[3] || '');
          flush();
        }
        continue;
      }
      if (cur && cur.inSkeleton) { cur.skeleton.push(html); continue; }
      if (cur) {
        const cls = html.replace(/^<(ol|ul)(?=[\s>])/, '<$1 class="qa-stmts"');
        cur.stmts.push(cls);
        continue;
      }
      out.push(html);
      continue;
    }
    if (/^<p[\s>]/.test(html)) {
      const inner = html.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
      if (cur && cur.inSkeleton) { cur.skeleton.push(html); continue; }
      const o = splitOptions(inner);
      if (o && cur && !cur.opts) {
        if (o.lead) cur.q.push('<p class="qa-lead">' + o.lead + '</p>');
        cur.opts = optsHtml(o);
        continue;
      }
      if (cur && !/^\s*(—|–|-|\(|Note:|Tip:)/.test(inner.replace(/<[^>]+>/g, '').trim())) {
        // A plain paragraph right after a question stem reads as a
        // continuation of the stem (rare) — keep it attached only when the
        // card has no options yet and no answer; otherwise flush first.
        if (!cur.opts && !cur.answer && cur.stmts.length === 0 && !cur.inSkeleton &&
            cur.q.length <= 1 && inner.length < 600) {
          cur.q.push('<p class="qa-text">' + inner.trim() + '</p>');
          continue;
        }
      }
      flush();
      out.push(html);
      continue;
    }
    // headings, tables, blockquotes, hr, pre: always end the open card.
    if (cur && cur.inSkeleton && /^<h[4-6][\s>]/.test(html)) { cur.skeleton.push(html); continue; }
    endSkeleton();
    flush();
    out.push(html);
  }
  flush();

  let result = out.join('');
  if (count > 0) {
    const toolbar = '<div class="qa-toolbar no-print"><span class="qa-count">' + count +
      ' question' + (count === 1 ? '' : 's') + '</span>' +
      '<button type="button" data-qa="show">Show all answers</button>' +
      '<button type="button" data-qa="hide">Hide all</button></div>';
    result = result.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/, (hh) => hh + toolbar);
    if (!result.includes('qa-toolbar')) result = toolbar + result;
  }
  return { html: result, count };
}

/* Invariants a QA transform must preserve: same question numbers in order,
   same structural counts, and every content token of `before` must survive
   in `after` (one-way multiset check — the transform legitimately ADDS
   chrome words like "Show all answers", which are stop-listed on both
   sides so they cannot mask real losses). */
const QA_STOP = new Set(['show', 'all', 'answers', 'hide', 'question', 'questions', 'correct', 'model', 'answer', 'outline']);
export function qaCheck(before, after) {
  const cnt = (s, re) => (s.match(re) || []).length;
  const numsBefore = [...before.matchAll(/<strong>Q(\d+)\./g)].map((m) => m[1]);
  const numsAfter = [...after.matchAll(/qa-badge">Q(\d+)</g)].map((m) => m[1]);
  if (numsBefore.join(',') !== numsAfter.join(',')) return 'question numbers changed';
  const mainsBefore = cnt(before, /<strong>Q\.\s*\(/g);
  const mainsAfter = cnt(after, /qa-badge">Q<\/span>/g);
  if (mainsBefore !== mainsAfter) return 'mains question count changed';
  const rules = [
    [/\<table[\s>]/g, 'tables'], [/\<h1[\s>]/g, 'h1'], [/\<h2[\s>]/g, 'h2'],
    [/\<h3[\s>]/g, 'h3'], [/\<blockquote[\s>]/g, 'blockquotes'],
  ];
  for (const [re, label] of rules) {
    if (cnt(before, re) !== cnt(after, re)) return 'count changed: ' + label;
  }
  const toks = (s) => s.replace(/<[^>]+>/g, ' ').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w && !QA_STOP.has(w));
  const freq = new Map();
  for (const w of toks(after)) freq.set(w, (freq.get(w) || 0) + 1);
  for (const w of toks(before)) {
    const n = freq.get(w) || 0;
    if (n === 0) return 'content lost near token: "' + w + '"';
    freq.set(w, n - 1);
  }
  if (after.includes('undefined') && !before.includes('undefined')) return 'introduced "undefined"';
  return null;
}

/* ------------------------------------------------------------------ */
/*  applyChrome: full per-document upgrade pipeline.                   */
/*  ctx: { trail, here, homeRel, catalogRel, pills, prev, next,        */
/*         upHref, upLabel }                                           */
/* ------------------------------------------------------------------ */
const CARD_RE = /<div class="card">([\s\S]*?)<\/div>(\s*<footer)/;

export function applyChrome(raw, ctx) {
  let html = raw;

  // 1. stylesheet: replace v1/v2 block or inject before </head>
  const cssBlock = '<style>' + DOC_CSS + '\n</style>';
  if (/<style>\/\* studyupsc-scr-nav \*\//.test(html)) {
    html = html.replace(/<style>\/\* studyupsc-scr-nav \*\/[\s\S]*?<\/style>/, () => cssBlock);
  } else if (html.includes('studyupsc-site-chrome-v2')) {
    html = html.replace(/<style>\/\* studyupsc-site-chrome-v2 \*\/[\s\S]*?<\/style>/, () => cssBlock);
  } else {
    html = html.replace('</head>', () => cssBlock + '\n</head>');
  }

  // 2. header (+ topic strip)
  const header = buildHeader(ctx);
  if (/<header>[\s\S]*?<\/header>/.test(html)) {
    html = html.replace(/<header>[\s\S]*?<\/header>/, () => header);
  } else {
    html = html.replace('<body>', () => '<body>\n' + header);
  }

  // 3. Q&A cards (fail-safe: revert card on invariant mismatch)
  let qa = 0;
  const cm = html.match(CARD_RE);
  if (cm) {
    const t = transformQA(cm[1]);
    if (t.count > 0) {
      const problem = qaCheck(cm[1], t.html);
      if (!problem) {
        html = html.replace(CARD_RE, () => '<div class="card">' + t.html + '</div>' + cm[2]);
        qa = t.count;
      } else {
        qa = -1; // signal: attempted but reverted
      }
    }
  }

  // 4. pager footer
  const pager = buildPager(ctx);
  if (/<footer class="pager no-print">[\s\S]*?<\/footer>/.test(html)) {
    html = html.replace(/<footer class="pager no-print">[\s\S]*?<\/footer>/, () => pager);
  } else if (/<footer>/.test(html)) {
    html = html.replace(/<footer>/, () => pager + '\n<footer>');
  } else {
    html = html.replace('</body>', () => pager + '\n</body>');
  }

  // 5. back-to-top + behaviour script
  if (!html.includes('studyupsc-chrome-js')) {
    html = html.replace('</body>', () => TO_TOP_HTML + '\n' + CHROME_JS + '\n</body>');
  } else {
    html = html.replace(/<script>\/\* studyupsc-chrome-js \*\/[\s\S]*?<\/script>/, () => CHROME_JS);
    if (!html.includes('class="to-top')) {
      html = html.replace('</body>', () => TO_TOP_HTML + '\n</body>');
    }
  }

  // 6. markers (keep the legacy one so old tooling still recognises the file)
  if (!html.includes(OLD_MARKER)) {
    html = html.replace('</body>', () => OLD_MARKER + '\n</body>');
  }
  if (!html.includes(V2_MARKER)) {
    html = html.replace('</body>', () => V2_MARKER + '\n</body>');
  }
  return { html, qa };
}
