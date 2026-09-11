#!/usr/bin/env node
/* ============================================================================
   studyUPSC — NOTE TIDYING PASS (structure & readability, content-preserving)
   ----------------------------------------------------------------------------
   Walks the content/ tree (all .html pages) and, inside the article card only:

     1. RENUMBERS numbered section headings (h2 "1. …", h3 "1.2 …") so they
        run 1..N continuously. The old build concatenated a base note and an
        injected expansion, each numbered from its own file, so pages often
        jumped from "2." straight to "6.". This pass fixes that.
     2. BOXES quick-recap sections — headings such as "MCQ hooks", "Traps",
        "Trap flash", "One-liners", "Golden phrase bank", "Rapid recap" —
        into a visually distinct ⚡ recap box so they read as a memory-hook
        panel instead of a numbered chapter.
     3. LISTS dense fact-runs — paragraphs that cram 4+ facts separated by
        " ; " or " · " (or " → " chains) become compact <ul class="su-facts">
        lists. Tables, Q&A cards, code and blockquotes are never touched.
     4. Injects a tiny stylesheet for the two constructs above.

   Content is never deleted or reworded: only punctuation splits and heading
   number prefixes change. Idempotent via the studyupsc-tidy-v1 marker.

   Usage (from upsc-portal/):
     node cli/tidy-notes.mjs            # tidy every content page
     node cli/tidy-notes.mjs --dry      # report only, write nothing
     node cli/tidy-notes.mjs --force    # re-tidy pages already carrying the marker
     node cli/tidy-notes.mjs --preview <rel>   # show the diff for one file

   Workflow note: after re-running cli/expand.mjs (which re-injects
   expansions with their own section numbers), run this script again.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const MARKER = '<!-- studyupsc-tidy-v1 -->';

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const PREVIEW = process.argv.includes('--preview');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store' || e.name === '.gitkeep') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else if (/\.html$/i.test(e.name) && !e.name.startsWith('README')) out.push(abs);
  }
  return out;
}

export { splitFacts, tidyCard, TIDY_CSS };

const files = walk(CONTENT).filter((f) => f !== path.join(CONTENT, 'index.html'));

const wordCount = (s) => (s.replace(/<[^>]+>/g, ' ').match(/[\w\u00C0-\u024F'’-]+/g) || []).length;

/* Inline-tag aware splitting of an element's inner HTML on separators.
   Returns null when the result would not be a clean, balanced list. */
function splitFacts(inner) {
  const TEXT_RE = /([^<]+)|(<\/?[a-zA-Z][^>]*>)/g;
  const tokens = [];
  let m;
  while ((m = TEXT_RE.exec(inner))) tokens.push(m[1] !== undefined ? { t: m[1] } : { tag: m[2] });

  const INLINE = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'mark', 'code', 'span', 'sub', 'sup', 'a', 'small']);
  const isOpen = (tag) => /^<[a-zA-Z]/.test(tag) && !/^<\//.test(tag);
  const tagName = (tag) => (tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1];

  const text = inner.replace(/<[^>]+>/g, ' ');
  const semi = (text.match(/;/g) || []).length;
  const arrow = (text.match(/\u2192/g) || []).length; // →
  const dot = (text.match(/\u00B7/g) || []).length;   // ·

  let seps;
  if (semi >= 3) seps = [';'];
  else if (arrow >= 3) seps = ['\u2192'];
  else if (dot >= 4) seps = ['\u00B7'];
  else return null;

  /* Split a text run on separators that sit OUTSIDE parentheses and OUTSIDE
     HTML entities — "(1975; USSR-launched)" is one fact, and the ; inside
     "&amp;" is markup, not a separator. Splitting order: ; then →. */
  const ENT = /&(?:[a-zA-Z][a-zA-Z0-9]{0,7}|#\d+|#x[0-9a-fA-F]+);/g;
  const splitText = (s) => {
    const stash = [];
    const guarded = s.replace(ENT, (e) => { stash.push(e); return '\u0000E' + (stash.length - 1) + '\u0000'; });
    const cut = (str, sepset) => {
      const out = [];
      let depth = 0;
      let cur = '';
      for (const ch of str) {
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
        if (sepset.has(ch) && depth === 0) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const restore = (str) => str.replace(/\u0000E(\d+)\u0000/g, (m, i) => stash[Number(i)]);
    const semiSet = new Set(seps);
    let parts = cut(guarded, semiSet);
    if (seps[0] === ';') {
      const next = [];
      for (const p of parts) next.push(...cut(p, new Set(['\u2192'])));
      parts = next;
    }
    return parts.map(restore);
  };

  const segs = [];
  let open = [];
  let cur = '';
  for (const tok of tokens) {
    if (tok.tag !== undefined) {
      const tn = tagName(tok.tag);
      if (!INLINE.has(tn)) return null; // block tag inside — bail out
      cur += tok.tag;
      if (isOpen(tok.tag)) open.push(tn);
      else {
        const i = open.lastIndexOf(tn);
        if (i === -1) return null; // unbalanced
        open.splice(i, 1);
      }
      continue;
    }
    const parts = splitText(tok.t);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        const closes = open.map((n) => `</${n}>`).join('');
        segs.push(cur.trim() + closes);
        cur = open.map((n) => `<${n}>`).join('');
      }
      cur += parts[i];
    }
  }
  if (open.length) return null;
  segs.push(cur.trim());
  const clean = segs.map((s) => s.trim()).filter((s) => s.length > 0);
  if (clean.length < 4) return null;
  const wc = clean.map(wordCount).sort((a, b) => a - b);
  if (wc[Math.floor(wc.length / 2)] > 13) return null; // too prose-like
  if (clean.some((s) => wordCount(s) > 60)) return null;
  if (clean.join(' ').length < text.trim().length * 0.55) return null; // lost too much
  return clean;
}

/* ------------------------------------------------------------------ */
/*  Card content transforms                                            */
/* Remove every <div class="su-recap">…</div> pair (any nesting depth) and
   collapse repeated ⚡ prefixes on headings back to none. */
function unwrapRecaps(s) {
  let out = '';
  let last = 0;
  const stack = [];
  const re = /<div\b[^>]*>|<\/div>/g;
  let m;
  while ((m = re.exec(s))) {
    const tok = m[0];
    if (/^<div class="su-recap"/.test(tok)) {
      out += s.slice(last, m.index);
      stack.push({ recap: true });
      last = m.index + tok.length;
    } else if (/^<div/.test(tok)) {
      out += s.slice(last, m.index + tok.length);
      stack.push({ recap: false });
      last = m.index + tok.length;
    } else { // </div>
      const top = stack.pop();
      out += s.slice(last, m.index);
      if (!top || !top.recap) out += tok;
      last = m.index + tok.length;
    }
  }
  out += s.slice(last);
  return out.replace(/(<h2\b[^>]*>)(?:\s*⚡)+\s*/g, '$1');
}


/* ------------------------------------------------------------------ */

const RECAP_RE = /\bmcq\b|hook|\btraps?\b|flash|one-?liners?|golden|pairs\b|cheat|\brapid\b|^quick\b|fact[ -]card|exam[ -]day/i;

function tidyCard(card) {
  /* -1. idempotency pre-pass: depth-aware removal of su-recap wrappers and
     accumulated ⚡ prefixes so re-runs converge even on nested wrappers. */
  card = unwrapRecaps(card);

  /* 0. protect <details> (Q&A reveals) and <div class="qa…"> regions —
     question stems and answer keys must never be split or renumbered. */
  const parts = [];
  let rawBuf = '';
  let protectBuf = '';
  let protect = 0;
  let m;
  const re = /(<details\b[^>]*>)|(<\/details>)|(<div\b[^>]*>)|(<\/div>)|(<!--[\s\S]*?-->)|([^<]+)|(<\/?[a-zA-Z][^>]*>)/g;
  while ((m = re.exec(card))) {
    const full = m[0];
    if (protect > 0) {
      protectBuf += full;
      if (m[1]) protect++;
      else if (m[2]) { protect--; if (protect === 0) { parts.push({ protected: protectBuf }); protectBuf = ''; } }
      else if (m[3]) protect++;
      else if (m[4]) { protect--; if (protect === 0) { parts.push({ protected: protectBuf }); protectBuf = ''; } }
      continue;
    }
    if (m[1] || (m[3] && /class="qa[\s"]/.test(m[3]))) {
      if (rawBuf.trim()) { parts.push({ raw: rawBuf }); rawBuf = ''; }
      protect = 1; protectBuf = full;
      continue;
    }
    rawBuf += full;
  }
  if (rawBuf.trim()) parts.push({ raw: rawBuf });
  if (protect > 0) parts.push({ protected: protectBuf }); // malformed: leave as-is

  /* 1. heading-level pass: split free regions into h2 chunks */
  const H2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/i;
  const chunks = [];
  for (const part of parts) {
    if (part.protected !== undefined) { chunks.push(part); continue; }
    let rest = part.raw;
    while (true) {
      const hm = rest.match(H2);
      if (!hm) {
        if (rest.trim()) chunks.push({ raw: rest });
        break;
      }
      if (hm.index > 0) chunks.push({ raw: rest.slice(0, hm.index) });
      chunks.push({ h2: hm[2], h2open: hm[1] });
      rest = rest.slice(hm.index + hm[0].length);
    }
  }


  /* 2. group chunks into sections: content between h2s belongs to previous h2 */
  const sections = [];
  let cur = null;
  for (const c of chunks) {
    if (c.h2 !== undefined) {
      cur = { h2: c.h2, h2open: c.h2open, body: '' };
      sections.push(cur);
    } else if (cur) {
      cur.body += c.raw !== undefined ? c.raw : c.protected;
    } else {
      sections.push({ preamble: c.raw !== undefined ? c.raw : c.protected });
    }
  }

  /* 3. per section: recap wrap + fact lists + heading renumber */
  let h2num = 0;
  let result = '';
  for (const sec of sections) {
    if (sec.preamble !== undefined) { result += sec.preamble; continue; }
    const h2text = sec.h2.replace(/<[^>]+>/g, '').trim();
    const isRecap = RECAP_RE.test(h2text);
    const hasNum = /^\d+\s*[.)]\s*/.test(h2text);
    let numPrefix = '';
    if (hasNum && !isRecap) {
      h2num++;
      numPrefix = `${h2num}. `;
    }
    /* strip the old number from the raw heading (inline tags preserved) */
    let h2inner = sec.h2.replace(/^(\s*(?:<[^>]+>\s*)*)\d+\s*[.)]\s*/, '$1').replace(/^\s+/, '');

    /* fact lists inside this section */
    let body = sec.body;
    if (!isRecap) {
      body = body.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs, inner) => {
        if (/<(?:ul|ol|table|h[1-6]|div|blockquote|pre|details|li|p)\b/i.test(inner)) return full;
        const segs = splitFacts(inner);
        if (segs) return `<ul class="su-facts">${segs.map((s) => `<li>${s}</li>`).join('')}</ul>`;
        return full;
      });
      /* li elements without nested lists — split into flat sibling bullets */
      body = body.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (full, attrs, inner) => {
        if (/<(?:ul|ol|table|h[1-6]|div|blockquote|pre|details|li|p)\b/i.test(inner)) return full;
        const segs = splitFacts(inner);
        if (segs) return segs.map((s, i) => `<li${i === 0 ? attrs : ''}>${s}</li>`).join('');
        return full;
      });
    }

    /* h3 renumbering inside the section */
    let h3k = 0;
    body = body.replace(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi, (full, attrs, text) => {
      const t = text.replace(/<[^>]+>/g, '').trim();
      const nm = t.match(/^(\d+)\s*[.)]\s*(\d+)?\s*[.)]?\s*/);
      if (!nm) return full;
      if (!numPrefix) return full; // no numbered parent — leave
      h3k++;
      const rest = text.replace(/^(\s*(?:<[^>]+>\s*)*)\d+\s*[.)]\s*(\d+\s*[.)]\s*)?/, '$1');
      return `<h3${attrs}>${numPrefix.replace(/\.\s*$/, '')}.${h3k}. ${rest}</h3>`;
    });

    const hasQA = /class="qa[\s"]|<details\b/i.test(body);
    const wrap = isRecap && !hasQA;
    const h2html = `<h2${sec.h2open}>${isRecap ? '⚡ ' : numPrefix}${h2inner}</h2>`;
    result += wrap ? `<div class="su-recap">${h2html}${body}</div>` : h2html + body;
  }
  return result;
}

function segmsToUl(segs) {
  return `<ul class="su-facts">${segs.map((s) => `<li>${s}</li>`).join('')}</ul>`;
}

const TIDY_CSS = `<style>/* studyupsc-tidy */
.su-recap{margin:1.2em 0 1.4em;padding:.75em 1.05em .85em;border:1px dashed #f59e0b;border-radius:12px;background:#fffbeb;break-inside:avoid}
.su-recap h2{font-size:16.5px;margin:.1em 0 .5em;border-bottom:none;padding-bottom:0;color:#92400e}
.su-recap ul,.su-recap ol{margin:.25em 0}
.su-recap li{margin:.22em 0}
.su-facts{margin:.4em 0 .75em;padding-left:1.35em}
.su-facts li{margin:.22em 0}
.su-facts li::marker{color:#f59e0b}
html.su-dark .su-recap{background:#231a05;border-color:#b45309}
html.su-dark .su-recap h2{color:#fcd34d}
</style>
`;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function tidyFile(abs) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  const orig = fs.readFileSync(abs, 'utf8');
  let raw = orig;
  /* repair mangled HTML comments (early tidy runs lost the leading "<") */
  raw = raw.replace(/(^|\n)!--([\s\S]*?-->)/g, '$1<!--$2');
  /* repair entities whose ; was consumed as a fact separator (&amp< → &amp;<) */
  raw = raw.replace(/&(amp|lt|gt|quot|nbsp)(?![0-9a-zA-Z;])/g, '&$1;');
  const commentsFixed = raw !== orig;
  if (raw.includes(MARKER) && !FORCE && !commentsFixed) return { rel, changed: false, reason: 'marker' };

  const cardAt = raw.indexOf('<div class="card">');
  if (cardAt === -1) return { rel, changed: false, reason: 'no card' };
  const endAt = raw.indexOf('<footer class="pager no-print">', cardAt);
  if (endAt === -1) return { rel, changed: false, reason: 'no pager' };
  const cardEnd = endAt;
  const before = raw.slice(0, cardAt + '<div class="card">'.length);
  let card = raw.slice(cardAt + '<div class="card">'.length, cardEnd);
  let after = raw.slice(cardEnd);
  /* the slice ends with the card's own closing </div> — keep it out of the
     section body and re-attach it after the transformed content */
  const closeMatch = card.match(/\s*<\/div>\s*$/);
  if (closeMatch) {
    card = card.slice(0, card.length - closeMatch[0].length);
    after = closeMatch[0] + after;
  }

  const newCard = tidyCard(card);

  let out = before + newCard + after;
  if (out === orig) return { rel, changed: false, reason: 'unchanged' };

  /* integrity guards: identical token multiset + balanced tag counts.
     Pure-digit tokens are exempt (heading renumbering changes only those),
     as are li/ul/p/div counts (splitting adds list elements). */
  const toks = (s) => s.replace(/<[^>]+>/g, ' ').toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, ' ').split(' ').filter((w) => w && !/^\d+$/.test(w));
  const freq = new Map();
  for (const w of toks(newCard)) freq.set(w, (freq.get(w) || 0) + 1);
  for (const w of toks(card)) {
    const n = freq.get(w) || 0;
    if (n === 0) return { rel, changed: false, reason: 'integrity-fail' };
    freq.set(w, n - 1);
  }
  const counts = (s, re) => (s.match(re) || []).length;
  const BAL = [/<h2\b/g, /<\/h2>/g, /<h3\b/g, /<\/h3>/g, /<table\b/g, /<\/table>/g, /<blockquote\b/g, /<\/blockquote>/g, /<pre\b/g, /<\/pre>/g, /<details\b/g, /<\/details>/g, /<!--/g];
  for (const re of BAL) {
    if (counts(card, re) !== counts(newCard, re)) return { rel, changed: false, reason: 'balance-fail' };
  }
  /* div nesting delta must be preserved (recap boxes add balanced pairs) */
  const divDelta = (s) => counts(s, /<div\b/g) - counts(s, /<\/div>/g);
  if (divDelta(card) !== divDelta(newCard)) return { rel, changed: false, reason: 'div-balance-fail' };
  /* no bare HTML entities may be introduced (entity ; is never a separator) */
  const bareEnt = (s) => counts(s, /&(?:amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-fA-F]+)(?![0-9a-zA-Z;])/g);
  if (bareEnt(newCard) > bareEnt(card)) return { rel, changed: false, reason: 'entity-fail' };

  if (!out.includes('studyupsc-tidy')) out = out.replace('</head>', () => TIDY_CSS + '\n</head>');
  if (!out.includes(MARKER)) out = out.replace('</body>', () => MARKER + '\n</body>');
  if (!DRY) fs.writeFileSync(abs, out);
  return { rel, changed: true };
}

function preview(targetArg) {
  const abs = path.join(ROOT, targetArg || '');
  if (fs.existsSync(abs)) {
    const raw = fs.readFileSync(abs, 'utf8');
    const cardAt = raw.indexOf('<div class="card">');
    const card = raw.slice(cardAt + '<div class="card">'.length, raw.indexOf('<footer class="pager no-print">', cardAt));
    const before = card.slice(0, 6000);
    const afterCard = tidyCard(card).slice(0, 6000);
    console.log('\n================ BEFORE ================\n' + before.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500));
    console.log('\n================ AFTER  ================\n' + afterCard.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (PREVIEW) { preview(process.argv[process.argv.indexOf('--preview') + 1]); }
  else {
    let changed = 0;
    const reasons = new Map();
    for (const f of files) {
      const r = tidyFile(f);
      if (r.changed) changed++;
      else reasons.set(r.reason, (reasons.get(r.reason) || 0) + 1);
    }
    console.log(`[tidy] ${files.length} pages scanned · ${changed} changed${DRY ? ' (dry run)' : ''}`);
    for (const [k, v] of reasons) console.log(`[tidy]   skipped: ${v} (${k})`);
  }
}
