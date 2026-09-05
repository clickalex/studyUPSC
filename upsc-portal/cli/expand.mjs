#!/usr/bin/env node
/* ============================================================================
   studyUPSC — LESSON EXPANDER
   ----------------------------------------------------------------------------
   Merges authored deep-dive material from cli/expansions/<slug>.html into the
   matching detailed-notes document, immediately before its closing </div>.

   The mapping is by slug: cli/expansions/stone-bronze-age.html expands the
   detailed-notes document of the topic folder named "stone-bronze-age".

   Injected material is wrapped in a marker so re-running is idempotent —
   an existing block is replaced, never duplicated.

   Usage (from upsc-portal/):  node cli/expand.mjs [--list]
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXP = path.join(ROOT, 'cli', 'expansions');
const CONTENT = path.join(ROOT, 'content');

const OPEN = '<!-- BEGIN studyUPSC:expansion -->';
const CLOSE = '<!-- END studyUPSC:expansion -->';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const notes = walk(CONTENT).filter(p => p.includes(`${path.sep}detailed-notes${path.sep}`) && /\.html$/i.test(p));

/** topic slug = the folder that contains detailed-notes/ */
function topicOf(abs) {
  const parts = abs.split(path.sep);
  return parts[parts.indexOf('detailed-notes') - 1];
}

const byTopic = new Map();
for (const n of notes) {
  const t = topicOf(n);
  if (!byTopic.has(t)) byTopic.set(t, []);
  byTopic.get(t).push(n);
}

if (process.argv.includes('--list')) {
  const wc = f => {
    const s = fs.readFileSync(f, 'utf8');
    const m = s.match(/<div class="card">([\s\S]*)<\/div>/i);
    return (m ? m[1] : s).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  };
  [...byTopic.entries()]
    .map(([t, fs_]) => ({ t, w: Math.max(...fs_.map(wc)), done: fs.existsSync(path.join(EXP, t + '.html')) }))
    .sort((a, b) => a.w - b.w)
    .forEach(r => console.log(String(r.w).padStart(6), r.done ? '[expanded]' : '[  thin  ]', r.t));
  process.exit(0);
}

if (!fs.existsSync(EXP)) { console.error('no cli/expansions/ directory'); process.exit(1); }

let applied = 0, skipped = 0, missing = [];
for (const file of fs.readdirSync(EXP).filter(f => /\.html$/i.test(f))) {
  const topic = file.replace(/\.html$/i, '');
  const targets = byTopic.get(topic);
  if (!targets) { missing.push(topic); continue; }

  const add = fs.readFileSync(path.join(EXP, file), 'utf8').trim();
  for (const t of targets) {
    let s = fs.readFileSync(t, 'utf8');
    const block = `${OPEN}\n${add}\n${CLOSE}`;

    if (s.includes(OPEN)) {
      s = s.replace(new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`), block);
    } else {
      // insert before the card's closing </div> (the one preceding <footer>)
      const at = s.lastIndexOf('</div>\n<footer');
      if (at === -1) { skipped++; console.log('  SKIP (no anchor)', path.relative(ROOT, t)); continue; }
      s = s.slice(0, at) + block + '\n' + s.slice(at);
    }
    fs.writeFileSync(t, s);
    applied++;
    console.log('  +', path.relative(ROOT, t));
  }
}

if (missing.length) console.log('\n  no matching topic folder for:', missing.join(', '));
console.log(`\nEXPANDED ${applied} document(s), ${skipped} skipped.`);
console.log('Now re-run:  node cli/generate.mjs && node cli/book.mjs');
