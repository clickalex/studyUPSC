#!/usr/bin/env node
/* ============================================================================
   studyUPSC — CLI: content folder scanner
   ----------------------------------------------------------------------------
   Walks upsc-portal/content/ and generates:
     assets/js/file-index.js   -> window.CONTENT_INDEX (files) + window.CONTENT_DIRS
     assets/js/search-data.js  -> window.SEARCH_DATA   (title + text snippets)

   Usage (from upsc-portal/):
     node cli/generate.mjs            # scan + rebuild indexes
     node cli/generate.mjs --sync     # also create the 5-section scaffold for
                                      # every topic that is missing it

   The --sync flag creates, inside every leaf topic folder:
     detailed-notes/ short-notes/ bullet-points/ diagrams/ pyqs/
   (with a .gitkeep + README.md in each) so git tracks the structure.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const OUT_INDEX = path.join(ROOT, 'assets', 'js', 'file-index.js');
const OUT_SEARCH = path.join(ROOT, 'assets', 'js', 'search-data.js');

/* Folder-name -> syllabus-id aliases. Everything else maps to itself. */
const FOLDER_ALIASES = {
  'gs-1-heritage-geography-society': 'gs-1',
  'gs-2-polity-governance-ir': 'gs-2',
  'gs-3-economy-tech-environment': 'gs-3',
  'gs-4-ethics-integrity-aptitude': 'gs-4',
  'gs1': 'prelims-gs1',
  'prelims-gs1': 'prelims-gs1',
  'csat': 'prelims-csat',
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

const TEXT_EXTS = new Set(['md', 'txt', 'html', 'htm']);
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
  if (ext === 'md' || ext === 'txt' || ext === 'html' || ext === 'htm') return 'doc';
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

function navOf(rel) {
  const parts = rel.split('/').slice(0, -1); // drop filename
  const nav = parts
    .filter(p => p !== 'content')
    .map(p => slugify(p))
    .filter(Boolean)
    .join('/');
  return nav || '';
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
/*  --sync : create the 5-section scaffold for every leaf topic        */
/* ------------------------------------------------------------------ */
const SECTION_FOLDERS = ['detailed-notes', 'short-notes', 'bullet-points', 'diagrams', 'pyqs'];
const SECTION_README = (title) => `# ${title}

Place your ${title.toLowerCase()} files here (Markdown, images, PDFs).

> This folder is part of the auto-generated studyUPSC scaffold. Re-run
> \`node cli/generate.mjs --sync\` from \`upsc-portal/\` to recreate it after
> cloning the repository, then commit your notes inside it.
`;

function syncScaffold() {
  let created = 0, readmes = 0;
  // Walk every directory below content/. A directory is a "topic" (gets the
  // 5-section scaffold) when it has no sub-directories at all — the deepest
  // folders only. Section folders themselves are never descended into, so
  // sections can never nest inside sections.
  function walk(dir) {
    const subs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SECTION_FOLDERS.includes(e.name));
    for (const s of subs) walk(path.join(dir, s.name));
    if (subs.length === 0) {
      readmes += writeTopicReadmeIfMissing(dir);
      for (const sec of SECTION_FOLDERS) {
        const secPath = path.join(dir, sec);
        if (fs.existsSync(secPath)) continue;
        fs.mkdirSync(secPath, { recursive: true });
        fs.writeFileSync(path.join(secPath, '.gitkeep'), '');
        fs.writeFileSync(path.join(secPath, 'README.md'), SECTION_README(sectionTitle(sec)));
        created++;
      }
    }
  }
  function sectionTitle(sec) {
    return { 'detailed-notes': 'Detailed Notes', 'short-notes': 'Short Revision Notes',
             'bullet-points': 'Key Bullet Points / Mindmaps', 'diagrams': 'Diagrams, Maps & Flowcharts',
             'pyqs': 'PYQs & Model Answers' }[sec] || sec;
  }
  function writeTopicReadmeIfMissing(topicDir) {
    const rp = path.join(topicDir, 'README.md');
    if (fs.existsSync(rp)) return 0;
    const name = path.basename(topicDir).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    fs.writeFileSync(rp, `# ${name}\n\nSyllabus topic folder under **studyUPSC**. Add your own study material here.\n`);
    return 1;
  }
  walk(CONTENT);
  console.log(`[sync] scaffold ready: ${created} section folders, ${readmes} topic READMEs ensured.`);
}

/* ------------------------------------------------------------------ */
/*  Build file-index.js                                                */
/* ------------------------------------------------------------------ */
const SCAFFOLD_MARKERS = [
  'This folder is part of the auto-generated studyUPSC scaffold',
  'Syllabus topic folder under **studyUPSC**.'
];
function isScaffoldStub(abs) {
  if (!abs.endsWith('README.md')) return false;
  try {
    const head = fs.readFileSync(abs, 'utf8').slice(0, 400);
    return SCAFFOLD_MARKERS.some(m => head.includes(m));
  } catch { return false; }
}

function buildIndex(files) {
  const entries = files
    .filter(f => kindOf(f.file, f.file.split('.').pop().toLowerCase()) !== 'meta')
    // exclude auto-generated scaffold stubs (README.md placeholder files)
    .filter(f => !isScaffoldStub(f.abs))
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
/*  Build search-data.js (title + text snippets from docs)             */
/* ------------------------------------------------------------------ */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>~|#-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (m) out.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, '').trim() });
  }
  return out.slice(0, 40);
}

function buildSearchData(files, entries) {
  const docs = [];
  const mdStems = new Set(files.filter(f => /\.md$/i.test(f.file)).map(f => f.rel.replace(/\.md$/i, '')));
  for (const f of files) {
    const ext = f.file.split('.').pop().toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue; // only text documents are full-text indexed
    // skip generated HTML mirrors (md2html.py) — the .md original is indexed
    if (ext === 'html' || ext === 'htm') {
      if (f.file === 'index.html' && path.dirname(f.rel) === 'content') continue; // catalog
      if (mdStems.has(f.rel.replace(/\.(html?)$/i, ''))) continue;
    }
    if (isScaffoldStub(f.abs)) continue; // skip auto-generated scaffold stubs
    try {
      const raw = fs.readFileSync(f.abs, 'utf8').slice(0, 40000);
      const text = stripMarkdown(raw);
      if (text.length < 8) continue;
      docs.push({
        nav: navOf(f.rel),
        file: f.file,
        rel: f.rel,
        headings: extractHeadings(raw),
        text: text.slice(0, 900),
        chars: text.length
      });
    } catch { /* unreadable -> skip */ }
  }
  return docs;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
if (args.includes('--sync')) syncScaffold();

const files = walk(CONTENT, ROOT); // rel paths include the content/ prefix (site-relative)
const { entries, dirs } = buildIndex(files);
const docs = buildSearchData(files, entries);

fs.writeFileSync(OUT_INDEX,
  `/* AUTO-GENERATED by cli/generate.mjs — do not edit by hand. */\n` +
  `window.CONTENT_INDEX = ${JSON.stringify(entries, null, 1)};\n\n` +
  `window.CONTENT_DIRS = ${JSON.stringify(dirs, null, 1)};\n`
);
fs.writeFileSync(OUT_SEARCH,
  `/* AUTO-GENERATED by cli/generate.mjs — do not edit by hand. */\n` +
  `window.SEARCH_DATA = ${JSON.stringify(docs, null, 1)};\n`
);

console.log(`[scan] ${files.length} files -> ${entries.length} index entries, ${dirs.length} dirs`);
console.log(`[scan] ${docs.length} documents indexed for search`);
console.log(`[scan] wrote ${path.relative(ROOT, OUT_INDEX)} and ${path.relative(ROOT, OUT_SEARCH)}`);
