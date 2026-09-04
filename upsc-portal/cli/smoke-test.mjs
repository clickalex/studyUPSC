#!/usr/bin/env node
/* ============================================================================
   studyUPSC — headless smoke test (jsdom)
   ----------------------------------------------------------------------------
   Verifies the SPA boots and core routes render: dashboard, sidebar tree,
   topic page (5 sections), paper page (pattern table), document viewer (inline HTML page)
   (inline page + table + TOC), tracker (LocalStorage), global search, Ctrl+K, image route.

   Usage:
     npm i jsdom            # once, in any scratch directory (not required in repo)
     node cli/smoke-test.mjs

   Exit code 0 = all green.
   ========================================================================== */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTAL = process.env.PORTAL
  ? path.resolve(process.env.PORTAL)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let html = fs.readFileSync(path.join(PORTAL, 'index.html'), 'utf8');

/* Inline local scripts (jsdom cannot load them from the network), drop CDN.
   FUNCTION replacers only — string replacements would corrupt `$$` in code. */
const inlineScript = (src) =>
  html.replace(new RegExp('<script(?: defer)? src="' + src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"></script>'), () =>
    '<script>' + fs.readFileSync(path.join(PORTAL, 'assets/js', src.split('/').pop()), 'utf8') + '</script>');

html = html
  .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, () => '<script>window.tailwind = { config: function(){} };</script>')
  .replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>/, () => '')
  .replace(/<link[^>]*fonts\.googleapis[^>]*>/g, () => '')
  .replace(/<link[^>]*assets\/css\/style\.css[^>]*>/g, () => '<style></style>');
html = inlineScript('assets/js/data.js');
html = inlineScript('assets/js/file-index.js');
html = inlineScript('assets/js/search-data.js');
html = inlineScript('assets/js/app.js');

const vc = new VirtualConsole();
vc.on('jsdomError', () => { /* "Not implemented" noise from jsdom */ });

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/#/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.fetch = (url) => {           // serve files from the portal dir
      const p = path.join(PORTAL, url.split('?')[0]);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(fs.readFileSync(p, 'utf8')) });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    };
  }
});

const { window } = dom;
const { document } = window;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let failures = 0;
  const check = (name, cond) => {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + name);
    if (!cond) failures++;
  };

  await wait(1200);

  check('dashboard renders paper cards', !!document.querySelector('#app h1'));
  const homeText = document.querySelector('#app').textContent;
  check('dashboard mentions Prelims', homeText.includes('Preliminary Examination'));
  check('dashboard mentions Mains', homeText.includes('Main Examination'));
  check('sidebar has syllabus tree', !!document.querySelector('#sidebar-tree'));
  check('sidebar lists GS Paper I', document.querySelector('#sidebar').textContent.includes('GS Paper I'));

  window.location.hash = '#/topic/gs-1/modern-history';
  await wait(400);
  let appText = document.querySelector('#app').textContent;
  check('topic page shows Modern History', appText.includes('Modern Indian History'));
  check('topic page shows 5 sections', document.querySelectorAll('.section-card').length === 5);

  window.location.hash = '#/paper/gs-1';
  await wait(400);
  appText = document.querySelector('#app').textContent;
  check('paper page shows GS 1 title', appText.includes('General Studies I'));
  check('paper page shows exam pattern table', appText.includes('General Studies II'));

  window.location.hash = '#/doc/content/mains/gs-1-heritage-geography-society/modern-history/revolt-1857/detailed-notes/revolt-1857.html';
  await wait(600);
  appText = document.querySelector('#app').textContent;
  check('doc viewer shows note title', appText.includes('Revolt of 1857 — Detailed Notes'));
  check('doc viewer renders table', document.querySelectorAll('.md-content table').length > 0);
  check('doc viewer renders TOC', !!document.querySelector('#app aside'));

  window.location.hash = '#/tracker';
  await wait(400);
  check('tracker page renders', document.querySelector('#app').textContent.includes('Revision Checklist'));
  const cbs = document.querySelectorAll('.tracker-cb');
  check('tracker has checkboxes', cbs.length > 0);
  cbs[0].click();
  await wait(300);
  const stored = JSON.parse(window.localStorage.getItem('studyupsc-progress-v1') || '{}');
  check('checking a topic persists to LocalStorage', Object.keys(stored).length > 0);

  window.location.hash = '#/';
  await wait(300);
  window.openSearch();
  await wait(200);
  const input = document.querySelector('#search-input');
  check('search modal opens', !!input);
  input.value = 'revolt 1857';
  input.dispatchEvent(new window.Event('input'));
  await wait(300);
  check('search finds results for "revolt 1857"', document.querySelectorAll('.search-item').length > 0);
  const resText = document.querySelector('#search-results').textContent;
  check('search covers syllabus + full text', resText.toLowerCase().includes('revolt of 1857'));

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  await wait(200);
  check('Ctrl+K reopens search', !!document.querySelector('#search-input'));

  window.location.hash = '#/doc/content/mains/gs-1-heritage-geography-society/modern-history/revolt-1857/diagrams/modern-india-timeline-1757-1947.svg';
  await wait(400);
  check('image route renders', !!document.querySelector('#app img'));

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('SMOKE TEST CRASH:', e); process.exit(1); });
