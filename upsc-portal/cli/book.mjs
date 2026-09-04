#!/usr/bin/env node
/* ============================================================================
   studyUPSC — BOOK COMPILER
   ----------------------------------------------------------------------------
   Turns the 555-document portal into an actual book:

     Part (paper)  →  Chapter (topic group)  →  Lesson (leaf topic)
                                                  └── 5 sections woven into
                                                      one continuous lesson

   Outputs
     book/index.html          front matter + full table of contents
     book/lesson/<slug>.html  one page per lesson, prev/next, part opener art
     book/edition.html        single-file printable edition (print → PDF)
     assets/js/book-data.js   book model consumed by the portal SPA

   Usage (from upsc-portal/):  node cli/book.mjs
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'book');
const R = (...p) => path.join(ROOT, ...p);

/* ---------- load the syllabus tree + file index ------------------------- */
const sandbox = {};
new Function('window', fs.readFileSync(R('assets/js/data.js'), 'utf8'))(sandbox);
new Function('window', fs.readFileSync(R('assets/js/file-index.js'), 'utf8'))(sandbox);
const SYL = sandbox.SYLLABUS_DATA;
const INDEX = sandbox.CONTENT_INDEX;

const byNav = new Map();
for (const f of INDEX) {
  if (!f.nav) continue;
  if (!byNav.has(f.nav)) byNav.set(f.nav, []);
  byNav.get(f.nav).push(f);
}

const SECTIONS = [
  { key: 'notes',    dir: 'detailed-notes', title: 'Detailed Study',            lead: 'The full treatment of this lesson.' },
  { key: 'short',    dir: 'short-notes',    title: 'Revision Digest',           lead: 'Condensed for the last mile before the exam.' },
  { key: 'bullets',  dir: 'bullet-points',  title: 'Key Points & Mindmap',      lead: 'Skeleton facts and recall triggers.' },
  { key: 'diagrams', dir: 'diagrams',       title: 'Diagrams, Maps & Flowcharts', lead: 'Visual anchors for the answer sheet.' },
  { key: 'pyqs',     dir: 'pyqs',           title: 'Previous Year Questions',   lead: 'What the examiner has actually asked.' }
];

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

/* ---------- pull the body out of a generated content page --------------- */
function extractBody(rel) {
  const abs = R(rel);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, 'utf8');

  if (/\.svg$/i.test(rel)) {
    const svg = raw.replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');
    return { html: `<figure class="bk-figure">${svg}</figure>`, headings: [], words: 0 };
  }

  const m = raw.match(/<div class="card">([\s\S]*?)<\/div>\s*<\/div>\s*(?:<footer|<\/body)/i)
         || raw.match(/<div class="card">([\s\S]*)<\/div>/i);
  let html = m ? m[1] : raw;

  // drop the per-page H1 (the lesson supplies its own heading hierarchy)
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  // demote headings one level so lesson H2 stays the section rank
  html = html
    .replace(/<(\/?)h5\b/gi, '<$1h6').replace(/<(\/?)h4\b/gi, '<$1h5')
    .replace(/<(\/?)h3\b/gi, '<$1h4').replace(/<(\/?)h2\b/gi, '<$1h3');
  // strip portal chrome links
  html = html.replace(/<div class="crumb[\s\S]*?<\/div>/gi, '');

  const headings = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)]
    .map(x => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return { html: html.trim(), headings, words };
}

/* ---------- walk the syllabus into parts / chapters / lessons ----------- */
function leavesOf(node, trail) {
  const p = [...trail, node.id];
  if (!node.sub || !node.sub.length) return [{ node, nav: p.join('/') }];
  return node.sub.flatMap(c => leavesOf(c, p));
}

const parts = [];
let lessonSeq = 0;
const allLessons = [];

SYL.papers.forEach((paper, pi) => {
  const partNo = pi + 1;
  const chapters = [];

  const groups = (paper.sub && paper.sub.length)
    ? paper.sub.map(s => ({ node: s, direct: !s.sub || !s.sub.length }))
    : [];

  // Leaves that hang directly off the paper are collected into one opening chapter
  const directLeaves = groups.filter(g => g.direct).map(g => ({ node: g.node, nav: `${paper.id}/${g.node.id}` }));
  const grouped = groups.filter(g => !g.direct);

  const chapterDefs = [];
  if (directLeaves.length && grouped.length === 0) {
    // every leaf is direct → each leaf becomes its own chapter of one lesson
    directLeaves.forEach(l => chapterDefs.push({ title: l.node.title, tag: l.node.tag, lessons: [l] }));
  } else {
    if (directLeaves.length) chapterDefs.push({ title: paper.title + ' — Core Areas', tag: paper.tag, lessons: directLeaves });
    grouped.forEach(g => chapterDefs.push({ title: g.node.title, tag: g.node.tag, lessons: leavesOf(g.node, [paper.id]) }));
  }

  chapterDefs.forEach((cd, ci) => {
    const chapNo = ci + 1;
    const lessons = cd.lessons.map((l, li) => {
      lessonSeq++;
      const number = `${partNo}.${chapNo}.${li + 1}`;
      const id = slug(`${paper.id}-${l.node.id}`);
      const sections = [];
      let words = 0;
      for (const s of SECTIONS) {
        const files = (byNav.get(`${l.nav}/${s.key}`) || []).filter(f => /\.(html?|svg)$/i.test(f.rel));
        const bodies = files.map(f => ({ file: f, body: extractBody(f.rel) })).filter(b => b.body);
        if (!bodies.length) continue;
        bodies.forEach(b => { words += b.body.words; });
        sections.push({ ...s, bodies });
      }
      const lesson = {
        seq: lessonSeq, number, id, title: l.node.title, tag: l.node.tag || '',
        nav: l.nav, partNo, chapNo, sections, words,
        partTitle: paper.title, chapterTitle: cd.title
      };
      allLessons.push(lesson);
      return lesson;
    });
    chapters.push({ number: `${partNo}.${chapNo}`, title: cd.title, tag: cd.tag || '', lessons });
  });

  const art = `part-${paper.id}.png`;
  parts.push({
    no: partNo, roman: ROMAN[partNo], id: paper.id, title: paper.title,
    short: paper.short || '', tag: paper.tag || '', summary: paper.summary || '',
    stage: paper.stage || '', chapters,
    art: fs.existsSync(R('assets/book/img', art)) ? `../assets/book/img/${art}` : null,
    artRel: fs.existsSync(R('assets/book/img', art)) ? `assets/book/img/${art}` : null
  });
});

allLessons.forEach((l, i) => {
  l.prev = i > 0 ? allLessons[i - 1] : null;
  l.next = i < allLessons.length - 1 ? allLessons[i + 1] : null;
});

const totalWords = allLessons.reduce((a, l) => a + l.words, 0);
const totalPages = Math.round(totalWords / 400);

/* ---------- shared styling --------------------------------------------- */
const CSS = `
:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#b45309;--gold:#f59e0b;--bg:#f6f5f1;--card:#fff;--navy:#152744}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.72 "Source Serif 4",Georgia,"Times New Roman",serif;-webkit-font-smoothing:antialiased}
.bk-top{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.bk-top .in{max-width:1080px;margin:0 auto;padding:11px 22px;display:flex;gap:16px;align-items:center;font-family:Inter,system-ui,sans-serif;font-size:13px}
.bk-top a{color:var(--sub);text-decoration:none;font-weight:600}
.bk-top a:hover{color:var(--accent)}
.bk-brand{font-weight:800;font-size:17px;color:var(--ink)}
.bk-brand span{color:var(--gold)}
.wrap{max-width:780px;margin:0 auto;padding:44px 22px 96px}
.wide{max-width:1080px}
.bk-eyebrow{font-family:Inter,system-ui,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
h1{font-size:34px;line-height:1.18;margin:.18em 0 .3em;letter-spacing:-.015em}
h2{font-size:24px;margin:2.2em 0 .5em;padding-bottom:.28em;border-bottom:2px solid var(--gold);letter-spacing:-.01em}
h3{font-size:19px;margin:1.5em 0 .4em}
h4{font-size:16.5px;margin:1.25em 0 .3em;color:#334155}
h5,h6{font-size:15px;margin:1em 0 .25em;color:#475569}
p{margin:.75em 0}
a{color:var(--accent)}
ul,ol{padding-left:1.45em}li{margin:.28em 0}
blockquote{margin:1.1em 0;padding:.7em 1.1em;border-left:4px solid var(--gold);background:#fffbeb;border-radius:0 10px 10px 0;color:#44403c}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85em;background:#f1f5f9;padding:.14em .4em;border-radius:5px}
pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.8em;line-height:1.5;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:14px 16px;overflow-x:auto}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;margin:1.1em 0;font-size:.9em;font-family:Inter,system-ui,sans-serif;display:block;overflow-x:auto}
td,th{border:1px solid var(--line);padding:.48em .7em;text-align:left;vertical-align:top}
th{background:#f1f5f9;font-weight:700}
tr:nth-child(even) td{background:#fafafa}
img,svg{max-width:100%;height:auto}
hr{border:none;border-top:1px solid var(--line);margin:2em 0}
.bk-figure{margin:1.4em 0;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;text-align:center}
.bk-sec{margin:0 0 8px}
.bk-sec-lead{font-family:Inter,system-ui,sans-serif;font-size:13px;color:var(--sub);margin:-.15em 0 1.2em;font-style:normal}
.bk-part-art{width:100%;border-radius:16px;border:1px solid var(--line);display:block;margin:0 0 26px}
.bk-cover{display:block;width:100%;max-width:420px;margin:0 auto 30px;border-radius:12px;box-shadow:0 20px 50px -20px rgba(15,39,68,.55)}
.bk-hero{background:var(--navy);color:#f8fafc;border-radius:20px;padding:44px 40px;margin-bottom:34px}
.bk-hero h1{color:#fff;font-size:40px;margin:.1em 0 .25em}
.bk-hero p{color:#c7d2e2;font-family:Inter,system-ui,sans-serif;font-size:14.5px;max-width:56ch}
.bk-stats{display:flex;flex-wrap:wrap;gap:26px;margin-top:26px;font-family:Inter,system-ui,sans-serif}
.bk-stats b{display:block;font-size:26px;color:var(--gold);font-weight:800;line-height:1.1}
.bk-stats span{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;font-weight:700}
.bk-toc{font-family:Inter,system-ui,sans-serif}
.bk-toc .part{margin:34px 0 0;padding:20px 22px;background:#fff;border:1px solid var(--line);border-radius:16px}
.bk-toc .part>h3{margin:0 0 2px;font-size:19px;font-family:"Source Serif 4",Georgia,serif}
.bk-toc .part>.tag{font-size:12px;color:var(--sub);margin-bottom:12px}
.bk-toc .chap{margin:14px 0 0;padding-top:12px;border-top:1px dashed var(--line)}
.bk-toc .chap>.ct{font-weight:700;font-size:14px;color:#1e293b;margin-bottom:6px}
.bk-toc ol{list-style:none;padding:0;margin:0}
.bk-toc li{margin:0}
.bk-toc li a{display:flex;gap:10px;align-items:baseline;padding:5px 8px;border-radius:8px;font-size:13.5px;color:#334155;text-decoration:none}
.bk-toc li a:hover{background:#fff7ed;color:var(--accent)}
.bk-toc .num{font-variant-numeric:tabular-nums;color:var(--gold);font-weight:800;font-size:12px;min-width:44px}
.bk-toc .pg{margin-left:auto;color:#94a3b8;font-size:11.5px;font-variant-numeric:tabular-nums}
.bk-nav{display:flex;gap:14px;margin-top:56px;padding-top:22px;border-top:1px solid var(--line);font-family:Inter,system-ui,sans-serif}
.bk-nav a{flex:1;text-decoration:none;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#fff;color:#334155;font-size:13.5px}
.bk-nav a:hover{border-color:var(--gold);background:#fffbeb}
.bk-nav .lb{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:3px}
.bk-nav .r{text-align:right}
.bk-mini{font-family:Inter,system-ui,sans-serif;font-size:12.5px;color:var(--sub);margin:0 0 26px}
.bk-mini a{color:var(--sub);text-decoration:none}.bk-mini a:hover{color:var(--accent)}
.bk-lesson-toc{background:#fff;border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:0 14px 14px 0;padding:16px 20px;margin:26px 0 34px;font-family:Inter,system-ui,sans-serif;font-size:13.5px}
.bk-lesson-toc b{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
.bk-lesson-toc a{color:#334155;text-decoration:none;display:inline-block;margin:2px 14px 2px 0}
.bk-lesson-toc a:hover{color:var(--accent)}
footer.bk{max-width:780px;margin:0 auto;padding:0 22px 60px;color:#94a3b8;font-size:12px;font-family:Inter,system-ui,sans-serif;text-align:center}
@media print{
  body{background:#fff;font-size:10.5pt;line-height:1.5}
  .bk-top,.bk-nav,.no-print{display:none!important}
  .wrap{max-width:none;padding:0}
  .bk-hero{background:#fff;color:#000;border:none;padding:0}
  .bk-hero h1{color:#000}.bk-hero p{color:#333}
  h1{page-break-before:always;font-size:22pt}
  .bk-part{page-break-before:always}
  h2,h3{page-break-after:avoid}
  table,pre,.bk-figure,blockquote{page-break-inside:avoid}
  a{color:#000;text-decoration:none}
  @page{margin:18mm 16mm}
}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">`;

function page({ title, body, depth = 1, topLinks = true }) {
  const up = '../'.repeat(depth);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · studyUPSC Book</title>
${FONTS}
<style>${CSS}</style></head><body>
${topLinks ? `<div class="bk-top no-print"><div class="in">
<a class="bk-brand" href="${up}book/index.html">study<span>UPSC</span></a>
<a href="${up}book/index.html">Contents</a>
<a href="${up}index.html">Portal</a>
<a href="${up}book/edition.html">Print edition</a>
<a style="margin-left:auto" href="#" onclick="window.print();return false">Print / PDF</a>
</div></div>` : ''}
${body}
<footer class="bk">studyUPSC — The Complete UPSC Civil Services Book · ${allLessons.length} lessons · generated by cli/book.mjs</footer>
</body></html>`;
}

/* ---------- running page numbers (400 words ≈ 1 page) ------------------- */
let pageCursor = 12; // front matter
for (const l of allLessons) { l.page = pageCursor; pageCursor += Math.max(1, Math.round(l.words / 400)); }

/* ---------- lesson page ------------------------------------------------- */
function lessonBody(l, { standalone = true } = {}) {
  const part = parts[l.partNo - 1];
  const secs = l.sections.map(s => {
    const inner = s.bodies.map(b => b.body.html).join('\n');
    return `<section class="bk-sec" id="s-${s.key}">
<h2>${esc(s.title)}</h2>
<p class="bk-sec-lead">${esc(s.lead)}</p>
${inner}
</section>`;
  }).join('\n');

  const ltoc = l.sections.length > 1
    ? `<nav class="bk-lesson-toc no-print"><b>In this lesson</b>${l.sections.map(s => `<a href="#s-${s.key}">${esc(s.title)}</a>`).join('')}</nav>`
    : '';

  const head = `<p class="bk-mini">${standalone ? `<a href="index.html">Contents</a> · ` : ''}Part ${part.roman} — ${esc(part.title)} · Chapter ${l.chapNo}: ${esc(l.chapterTitle)}</p>
<p class="bk-eyebrow">Lesson ${l.number}${l.tag ? ' · ' + esc(l.tag) : ''}</p>
<h1 id="lesson-${l.id}">${esc(l.title)}</h1>`;

  return head + ltoc + secs;
}

fs.rmSync(path.join(BOOK, 'lesson'), { recursive: true, force: true });
fs.mkdirSync(path.join(BOOK, 'lesson'), { recursive: true });

for (const l of allLessons) {
  const nav = `<nav class="bk-nav no-print">
${l.prev ? `<a href="${l.prev.id}.html"><span class="lb">← Previous</span>${esc(l.prev.title)}</a>` : `<a href="../index.html"><span class="lb">←</span>Table of Contents</a>`}
${l.next ? `<a class="r" href="${l.next.id}.html"><span class="lb">Next →</span>${esc(l.next.title)}</a>` : `<a class="r" href="../index.html"><span class="lb">Fin</span>Back to Contents</a>`}
</nav>`;
  const body = `<div class="wrap">${lessonBody(l, { standalone: false })}${nav}</div>`;
  fs.writeFileSync(
    path.join(BOOK, 'lesson', l.id + '.html'),
    page({ title: `${l.number} ${l.title}`, body, depth: 2 })
      .replace(/href="\.\.\/\.\.\/book\//g, 'href="../')
  );
}

/* ---------- contents / front matter ------------------------------------- */
const tocHtml = parts.map(p => `
<div class="part" id="part-${p.id}">
  <p class="bk-eyebrow">Part ${p.roman}${p.stage ? ' · ' + esc(p.stage) : ''}</p>
  <h3>${esc(p.title)}</h3>
  <div class="tag">${esc(p.tag || p.summary || '')}</div>
  ${p.chapters.map(c => `<div class="chap">
    <div class="ct">Chapter ${c.number} — ${esc(c.title)}</div>
    <ol>${c.lessons.map(l => `<li><a href="lesson/${l.id}.html"><span class="num">${l.number}</span><span>${esc(l.title)}</span><span class="pg">p.${l.page}</span></a></li>`).join('')}</ol>
  </div>`).join('')}
</div>`).join('');

const frontBody = `<div class="wrap wide">
  <img class="bk-cover" src="../assets/book/img/cover.png" alt="Cover — The Complete UPSC Civil Services Book">
  <div class="bk-hero">
    <p class="bk-eyebrow">studyUPSC · Complete Edition</p>
    <h1>The Complete UPSC Civil Services Book</h1>
    <p>Every paper, every chapter, every lesson of the UPSC Civil Services Examination syllabus — Prelims GS &amp; CSAT, General Studies I–IV, the Essay paper, nine optional subjects and the full practice bank — woven into a single continuous book. Each lesson carries its detailed study text, revision digest, key-point mindmap, diagrams and previous-year questions in one uninterrupted read.</p>
    <div class="bk-stats">
      <div><b>${parts.length}</b><span>Parts</span></div>
      <div><b>${parts.reduce((a, p) => a + p.chapters.length, 0)}</b><span>Chapters</span></div>
      <div><b>${allLessons.length}</b><span>Lessons</span></div>
      <div><b>${(totalWords / 1000).toFixed(0)}k</b><span>Words</span></div>
      <div><b>~${totalPages}</b><span>Pages</span></div>
    </div>
  </div>

  <h2 style="margin-top:10px">How to read this book</h2>
  <p>The book follows the order of the examination itself. <b>Part I–III</b> cover the Preliminary examination — the scored General Studies paper, the qualifying CSAT paper, and a bank of mock tests. <b>Parts IV–VIII</b> cover the Mains: General Studies I to IV and the Essay paper. <b>Part IX</b> surveys the nine optional subjects, and <b>Part X</b> is the practice and answer-writing workshop.</p>
  <p>Every lesson is self-contained and follows the same five-movement rhythm: <b>Detailed Study</b> for the first reading, <b>Revision Digest</b> for the second and third, <b>Key Points &amp; Mindmap</b> for the week before the exam, <b>Diagrams</b> for what you will reproduce on the answer sheet, and <b>Previous Year Questions</b> to calibrate against what has actually been asked.</p>
  <p class="no-print">Prefer one continuous file? Open the <a href="edition.html">single-file print edition</a> and use your browser's Print → Save as PDF.</p>

  <h2>Table of Contents</h2>
  <div class="bk-toc">${tocHtml}</div>
</div>`;

fs.writeFileSync(path.join(BOOK, 'index.html'), page({ title: 'The Complete UPSC Civil Services Book', body: frontBody, depth: 1 })
  .replace(/href="\.\.\/book\//g, 'href="'));

/* ---------- single-file printable edition -------------------------------- */
const editionParts = parts.map(p => `
<div class="bk-part">
  ${p.art ? `<img class="bk-part-art" src="${p.art}" alt="">` : ''}
  <p class="bk-eyebrow">Part ${p.roman}</p>
  <h1>${esc(p.title)}</h1>
  <p>${esc(p.summary || p.tag || '')}</p>
</div>
${p.chapters.map(c => `<h1>Chapter ${c.number} — ${esc(c.title)}</h1>
${c.lessons.map(l => lessonBody(l, { standalone: false })).join('\n<hr>\n')}`).join('\n')}`).join('\n');

const editionToc = parts.map(p => `<div class="part"><p class="bk-eyebrow">Part ${p.roman}</p><h3>${esc(p.title)}</h3>
${p.chapters.map(c => `<div class="chap"><div class="ct">Chapter ${c.number} — ${esc(c.title)}</div>
<ol>${c.lessons.map(l => `<li><a href="#lesson-${l.id}"><span class="num">${l.number}</span><span>${esc(l.title)}</span><span class="pg">p.${l.page}</span></a></li>`).join('')}</ol></div>`).join('')}</div>`).join('');

const editionBody = `<div class="wrap">
<img class="bk-cover" src="../assets/book/img/cover.png" alt="">
<div class="bk-hero"><p class="bk-eyebrow">Single-file print edition</p>
<h1>The Complete UPSC Civil Services Book</h1>
<p>${allLessons.length} lessons · ${parts.length} parts · approximately ${totalPages} printed pages. Use Print → Save as PDF.</p></div>
<h2>Table of Contents</h2><div class="bk-toc">${editionToc}</div>
${editionParts}
</div>`;

fs.writeFileSync(path.join(BOOK, 'edition.html'), page({ title: 'Print Edition', body: editionBody, depth: 1 })
  .replace(/href="\.\.\/book\//g, 'href="'));

/* ---------- book model for the SPA --------------------------------------- */
const model = parts.map(p => ({
  no: p.no, roman: p.roman, id: p.id, title: p.title, tag: p.tag, summary: p.summary,
  stage: p.stage, art: p.artRel,
  chapters: p.chapters.map(c => ({
    number: c.number, title: c.title,
    lessons: c.lessons.map(l => ({
      number: l.number, id: l.id, title: l.title, tag: l.tag, nav: l.nav,
      page: l.page, words: l.words, sections: l.sections.map(s => s.key)
    }))
  }))
}));
fs.writeFileSync(R('assets/js/book-data.js'),
  '/* AUTO-GENERATED by cli/book.mjs — do not edit by hand. */\n' +
  'window.BOOK_DATA = ' + JSON.stringify({
    title: 'The Complete UPSC Civil Services Book',
    lessons: allLessons.length,
    chapters: parts.reduce((a, p) => a + p.chapters.length, 0),
    words: totalWords, pages: totalPages, parts: model
  }, null, 1) + ';\n');

const size = fs.statSync(path.join(BOOK, 'edition.html')).size;
console.log(`BOOK BUILT
  parts     ${parts.length}
  chapters  ${parts.reduce((a, p) => a + p.chapters.length, 0)}
  lessons   ${allLessons.length}
  words     ${totalWords.toLocaleString()}  (~${totalPages} printed pages)
  edition   book/edition.html  (${(size / 1048576).toFixed(2)} MB)`);
