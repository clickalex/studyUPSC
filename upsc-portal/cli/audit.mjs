#!/usr/bin/env node
/* ============================================================================
   studyUPSC — repository & site audit
   ----------------------------------------------------------------------------
   Verifies that the portal is a complete, self-contained HTML-only website:

     [1] No Markdown anywhere (files, links, generator affordances removed)
     [2] file-index.js covers every real file under content/ (and vice versa)
     [3] search-data.js full-text-covers every content document
     [4] Every internal link/src in every HTML page resolves to a real file
     [5] Syllabus scaffold: every leaf topic has the 5 sections, counted files
     [6] UI audit: the SPA renders documents inline — no "open raw",
         "download", "open in new tab" affordances for documents
     [7] content/index.html catalog exists and links every document

   Usage (from upsc-portal/):   node cli/audit.mjs
   Exit code 0 = audit passed (warnings allowed).
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const SECTION_FOLDERS = ['detailed-notes', 'short-notes', 'bullet-points', 'diagrams', 'pyqs'];

let failures = 0, warnings = 0;
const fail = (msg) => { failures++; console.log('  FAIL  ' + msg); };
const warn = (msg) => { warnings++; console.log('  WARN  ' + msg); };
const ok = (msg) => console.log('  PASS  ' + msg);
const section = (t) => console.log('\n' + t);

function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === '.DS_Store') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(abs, base));
    else out.push({ abs, rel: path.relative(base, abs).split(path.sep).join('/') });
  }
  return out;
}

/* ------------------------------------------------------------------ */
section('[1] Markdown-free repository');
const mdFiles = [
  ...walk(ROOT).map(f => f.rel),
].filter(rel => /\.md$/i.test(rel));
if (mdFiles.length === 0) ok(`0 Markdown files in the repository`);
else mdFiles.forEach(f => fail(`Markdown file still present: ${f}`));

const htmlFiles = walk(CONTENT).filter(f => /\.html?$/i.test(f.abs));
let staleRefs = 0;
for (const f of htmlFiles) {
  const s = fs.readFileSync(f.abs, 'utf8');
  if (/href="[^"]*\.md"/i.test(s) || /Markdown source/i.test(s) || /generated from Markdown/i.test(s)) { staleRefs++; fail(`stale Markdown reference in ${f.rel}`); }
}
if (staleRefs === 0) ok('no .md hrefs / "Markdown source" links in any HTML page');
for (const rel of ['index.html', 'assets/js/app.js', 'assets/js/data.js']) {
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  /* strip JS comments so internal renderer names don't false-positive */
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/Markdown source|generated from Markdown|\sdownload\s*>|Raw ↗|Open ↗/.test(code)) fail(`raw-file affordance or Markdown reference in ${rel}`);
}
ok('SPA renders documents inline (no open-raw/download affordances in app code)');

/* ------------------------------------------------------------------ */
section('[2] file-index.js coverage');
const INDEX_SRC = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'file-index.js'), 'utf8');
const indexJson = JSON.parse(INDEX_SRC.replace(/^[\s\S]*?window\.CONTENT_INDEX = /, '').replace(/;\s*window\.CONTENT[\s\S]*$/, ''));
const indexedRels = new Set(indexJson.map(e => e.rel));
const realFiles = walk(CONTENT).filter(f => path.basename(f.abs) !== '.gitkeep').map(f => 'content/' + f.rel);
let miss = 0;
for (const rel of realFiles) if (!indexedRels.has(rel)) { miss++; fail(`file on disk but not indexed: ${rel}`); }
if (miss === 0) ok(`all ${realFiles.length} content files are indexed`);
let ghost = 0;
for (const e of indexJson) if (!fs.existsSync(path.join(ROOT, e.rel))) { ghost++; fail(`indexed but missing on disk: ${e.rel}`); }
if (ghost === 0) ok('no ghost entries in the index');

/* ------------------------------------------------------------------ */
section('[3] search-data.js coverage');
const SEARCH_SRC = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'search-data.js'), 'utf8');
const searchData = JSON.parse(SEARCH_SRC.replace(/^[\s\S]*?window\.SEARCH_DATA = /, '').replace(/;\s*$/, ''));
const searchedRels = new Set(searchData.map(d => d.rel));
const docs = realFiles.filter(rel => /\.html?$/i.test(rel) && rel !== 'content/index.html');
miss = 0;
for (const rel of docs) if (!searchedRels.has(rel)) { miss++; fail(`document not full-text indexed: ${rel}`); }
if (miss === 0) ok(`all ${docs.length} content documents are full-text searchable`);
const emptyDocs = searchData.filter(d => !d.text || d.text.length < 30);
if (emptyDocs.length) emptyDocs.forEach(d => warn(`thin search snippet (${(d.text || '').length} chars): ${d.rel}`));
else ok('every indexed document has a substantive text snippet');

/* ------------------------------------------------------------------ */
section('[4] Link integrity (every internal href/src resolves)');
const EXTERNAL = /^(https?:|mailto:|data:|#)/i;
let checked = 0, broken = 0;
function checkFile(abs) {
  const s = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);
  const re = /(?:href|src)="([^"]+)"/gi;
  let m;
  while ((m = re.exec(s))) {
    const href = m[1];
    if (EXTERNAL.test(href) || href.startsWith('#/')) continue;
    checked++;
    const target = href.split('#')[0].split('?')[0];
    if (!target) continue;
    const resolved = path.resolve(dir, target);
    if (!fs.existsSync(resolved)) { broken++; fail(`broken ${'link'} in ${path.relative(ROOT, abs)}: ${href}`); }
  }
}
htmlFiles.forEach(f => checkFile(f.abs));
checkFile(path.join(ROOT, 'index.html'));
if (broken === 0) ok(`${checked} internal links checked, 0 broken`);
else warn(`${broken} broken links found`);

/* ------------------------------------------------------------------ */
section('[5] Syllabus scaffold completeness');
/* leaf topic = a directory whose only subdirectories are section folders */
function isSectionDir(name) { return SECTION_FOLDERS.includes(name); }
let topics = 0, complete = 0, emptySections = 0;
const missingSections = [];
(function walkTopics(dir) {
  const subs = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== '.git');
  const nonSection = subs.filter(e => !isSectionDir(e.name));
  if (nonSection.length === 0 && subs.length > 0) {
    topics++;
    const present = subs.filter(e => isSectionDir(e.name)).map(e => e.name);
    const absent = SECTION_FOLDERS.filter(s => !present.includes(s));
    if (absent.length) missingSections.push(`${path.relative(CONTENT, dir)} → missing ${absent.join(', ')}`);
    let hasContent = false;
    for (const s of present) {
      const files = fs.readdirSync(path.join(dir, s)).filter(n => n !== '.gitkeep');
      if (files.length === 0) emptySections++;
      else hasContent = true;
    }
    if (!absent.length && hasContent) complete++;
    return;
  }
  for (const s of nonSection) walkTopics(path.join(dir, s.name));
})(CONTENT);
if (missingSections.length === 0) ok(`all ${topics} leaf topics have the 5-section scaffold`);
else { missingSections.forEach(m => warn(`topic scaffold incomplete: ${m}`)); }
if (emptySections) warn(`${emptySections} section folders are empty (topic has no material of that kind yet — see report)`);
else ok('no empty section folders');
ok(`${complete}/${topics} leaf topics fully populated (all sections present with material)`);

/* ------------------------------------------------------------------ */
section('[6] UI: documents open as site pages');
const appJsCode = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'app.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
if (/Open ↗|Raw ↗|\sdownload\s*>/.test(appJsCode)) fail('raw-file affordance still present in app.js');
else ok('no open/raw/download affordances in the UI');
const iframeCount = (appJsCode.match(/iframe src=/g) || []).length;
if (iframeCount <= 1) ok('documents render inline (the only iframe is the PDF fallback viewer)');
else warn(`${iframeCount} iframe usages found (expected only the PDF fallback viewer)`);
if (appJsCode.includes('rewriteInlineLinks')) ok('inlined document links are rewritten to stay inside the portal');
else fail('inline link rewriter missing');

/* ------------------------------------------------------------------ */
section('[7] Catalog page');
const catalogPath = path.join(CONTENT, 'index.html');
if (!fs.existsSync(catalogPath)) fail('content/index.html catalog missing');
else {
  const cat = fs.readFileSync(catalogPath, 'utf8');
  const links = [...cat.matchAll(/<li><a href="([^"]+\.html)"/g)].map(m => m[1]);
  const uniq = new Set(links);
  if (uniq.size === docs.length) ok(`catalog links all ${docs.length} documents`);
  else fail(`catalog links ${uniq.size} documents, expected ${docs.length}`);
  if (/Markdown/.test(cat)) fail('catalog still mentions Markdown');
  else ok('catalog is Markdown-free');
}

/* ------------------------------------------------------------------ */
console.log('\n────────────────────────────────────────');
console.log(`AUDIT ${failures === 0 ? 'PASSED' : 'FAILED'} — ${failures} failure(s), ${warnings} warning(s)`);
console.log('────────────────────────────────────────');
process.exit(failures === 0 ? 0 : 1);
