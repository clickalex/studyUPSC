#!/usr/bin/env node
/* ============================================================================
   studyUPSC — batch upgrade: responsive nav + topic pills + Q&A cards
   ----------------------------------------------------------------------------
   Applies the shared site chrome (cli/site-chrome.mjs) to every existing
   content document and book page:

     content tree (.html) -> sticky responsive header w/ mobile menu,
                             "In this topic" pill strip, cross-section pager,
                             Q&A cards with per-question answer reveals,
                             back-to-top + tiny behaviour script
     book tree (.html)    -> responsive CSS additions (top bar wraps, nav
                             stacks, fluid type/padding on phones)

   The catalog (content/index.html) and homepage are rebuilt by
   cli/generate.mjs / cli/build-site.mjs instead — this script skips them.

   Usage (from upsc-portal/):
     node cli/upgrade-site.mjs          # upgrade everything missing v2 chrome
     node cli/upgrade-site.mjs --force  # re-apply to every document
     node cli/upgrade-site.mjs --dry    # report only, write nothing

   Idempotent: files already carrying "<!-- studyupsc-chrome-v2 -->" are
   skipped unless --force is passed.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { niceLabel } from './names.mjs';
import { applyChrome, topicContext, BOOK_RWD_CSS, V2_MARKER } from './site-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const BOOK = path.join(ROOT, 'book');
const CATALOG_FILE = path.join(CONTENT, 'index.html');
const HOME_FILE = path.join(ROOT, 'index.html');

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
const anchorOf = (dirRel) => 'content-' + dirRel.replace(/^content\//, '').split('/').join('-');

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

/* ------------------------------------------------------------------ */
const allFiles = walk(CONTENT).map((abs) => rel(abs));
const leafDocs = allFiles.filter((r) =>
  r.endsWith('.html') && path.posix.basename(r) !== 'index.html');
const titleCache = new Map();
const titleOf = (r) => {
  if (!titleCache.has(r)) {
    titleCache.set(r, pageTitle(path.join(ROOT, r)) ||
      path.posix.basename(r).replace(/\.html$/i, '').replace(/[-_]/g, ' '));
  }
  return titleCache.get(r);
};

let upgraded = 0, skipped = 0, qaFiles = 0, qaTotal = 0;
const reverted = [];
const failed = [];

for (const r of leafDocs) {
  const abs = path.join(ROOT, r);
  let raw;
  try { raw = fs.readFileSync(abs, 'utf8'); } catch { failed.push(r + ' (unreadable)'); continue; }
  if (!FORCE && raw.includes(V2_MARKER)) { skipped++; continue; }
  if (!/<header>[\s\S]*?<\/header>/.test(raw) && !raw.includes('<body>')) {
    failed.push(r + ' (no <header> or <body> found — left untouched)');
    continue;
  }

  const dirAbs = path.dirname(abs);
  const dirRel = path.posix.dirname(r);
  const homeRel = relFromDir(dirAbs, HOME_FILE);
  const catalogRel = relFromDir(dirAbs, CATALOG_FILE);
  const title = titleOf(r);

  // breadcrumb trail (ancestors only; header adds Home + current page)
  const parts = dirRel.split('/').filter(Boolean);
  const trail = [];
  for (let j = 1; j < parts.length; j++) {
    const dirSoFar = parts.slice(0, j + 1).join('/');
    trail.push({ href: catalogRel + '#' + anchorOf(dirSoFar), label: niceLabel(parts[j]) });
  }

  // topic pills + cross-section prev/next
  const tc = topicContext(allFiles, dirRel, r, titleOf);
  const pills = tc.pills.slice();
  if (pills.length) {
    pills.push({
      href: catalogRel + '#' + anchorOf(tc.topicRoot),
      label: 'All', icon: '☰', idx: true,
    });
  }
  const upLabel = parts.length > 1 ? niceLabel(parts[parts.length - 1]) : 'All files';

  let out;
  try {
    out = applyChrome(raw, {
      homeRel, catalogRel, trail, here: title, pills,
      prev: tc.prev, next: tc.next,
      upHref: catalogRel + '#' + anchorOf(dirRel), upLabel,
    });
  } catch (e) {
    failed.push(r + ' (' + (e && e.message ? e.message : e) + ')');
    continue;
  }
  if (out.qa === -1) reverted.push(r);
  if (out.qa > 0) { qaFiles++; qaTotal += out.qa; }
  if (!DRY && out.html !== raw) fs.writeFileSync(abs, out.html);
  upgraded++;
}

console.log(`[docs] ${upgraded} upgraded · ${skipped} already v2 · ${qaFiles} files gained Q&A cards (${qaTotal} questions)`);
if (reverted.length) {
  console.log(`[docs] Q&A transform reverted (fail-safe) in ${reverted.length} file(s):`);
  reverted.forEach((r) => console.log('         - ' + r));
}
if (failed.length) {
  console.log(`[docs] ${failed.length} file(s) left untouched:`);
  failed.forEach((r) => console.log('         ! ' + r));
}

/* ------------------------------------------------------------------ */
/*  Book pages: inject responsive CSS additions (marker-guarded)        */
/* ------------------------------------------------------------------ */
let bookUp = 0, bookSkip = 0;
if (fs.existsSync(BOOK)) {
  const pages = walk(BOOK).filter((abs) => abs.endsWith('.html'));
  for (const abs of pages) {
    const raw = fs.readFileSync(abs, 'utf8');
    if (raw.includes('studyupsc-book-rwd')) { bookSkip++; continue; }
    if (!raw.includes('</head>')) { bookSkip++; continue; }
    if (!DRY) fs.writeFileSync(abs, raw.replace('</head>', () => BOOK_RWD_CSS + '\n</head>'));
    bookUp++;
  }
}
console.log(`[book] ${bookUp} pages gained responsive CSS · ${bookSkip} skipped`);
if (DRY) console.log('[dry] no files were written');
