# studyUPSC

**A free, offline-friendly UPSC Civil Services Examination (CSE) preparation portal** — the complete Prelims & Mains syllabus as plain, print-ready HTML pages.

No login. No build step. No backend. Every page opens directly and your progress never leaves your device.

[![Deploy to GitHub Pages](https://github.com/clickalex/studyUPSC/actions/workflows/deploy.yml/badge.svg)](https://github.com/clickalex/studyUPSC/actions/workflows/deploy.yml)

## What's inside

- **555 study documents** covering the full UPSC CSE syllabus in study order — every topic has **📖 Detailed → 📝 Short notes → 🔹 Bullet points → 🗺️ Diagrams → ❓ PYQs**.
- **126 book lessons** woven into a single continuous *book edition* (10 parts · 52 chapters · ~543k words) with running page numbers.
- **126 SVG diagrams & mindmaps** across the syllabus (plus 11 book illustrations — cover + part openers).
- **SPA app** (`app.html`) with a syllabus tree, per-topic revision tracker and instant full-text search (`Ctrl`/`⌘` + `K`).
- **MCQ & Mains question cards** — responsive, tap-friendly, with per-question answer reveals and a self-test **"🎯 Quiz me"** mode.
- **Navigation everywhere** — breadcrumbs + site nav (Home · Prelims · Mains · Book · App · All files) + "In this topic" pills + prev/next, plus dark mode.

## Live site

| Page | URL |
| --- | --- |
| Homepage | <https://clickalex.github.io/studyUPSC/> |
| App (search + tracker) | <https://clickalex.github.io/studyUPSC/app.html> |
| Book edition | <https://clickalex.github.io/studyUPSC/book/index.html> |
| Content library | <https://clickalex.github.io/studyUPSC/content/index.html> |

## How it works

- **Pure static HTML/CSS/vanilla JS** — no framework, no runtime build, no database. GitHub Pages serves the files as-is.
- The SPA (`app.html`) renders every document inline and keeps a hash router (`#/paper/…`, `#/topic/…`, `#/doc/…`, `#/tracker`, `#/search`).
- Theme, completion ticks, quiz best-scores and "continue learning" all persist in **LocalStorage** — nothing is uploaded.
- Indexes (`file-index.js`, `search-data.js`) are generated files, committed so the site works without any tooling.

## Project structure

```
studyUPSC/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages deploy (canonical workflow)
├── index.html                    # root redirect → upsc-portal/
├── audit-report.html             # full repository & site audit report
├── README.md
└── upsc-portal/                  # ← the deployed site root
    ├── index.html                # homepage
    ├── app.html                  # SPA: syllabus tree + search + tracker
    ├── assets/
    │   ├── css/style.css         # design system (indigo × saffron)
    │   ├── js/
    │   │   ├── app.js            # SPA logic (router, search, tracker)
    │   │   ├── data.js           # syllabus tree
    │   │   ├── study.js          # shared interactivity (theme, quiz, ticks)
    │   │   ├── book-data.js      # generated book metadata
    │   │   ├── file-index.js     # generated content index
    │   │   └── search-data.js    # generated full-text search data
    │   └── book/img/             # cover + part opener artwork
    ├── book/                     # generated book edition (126 lessons)
    ├── content/                  # study library (555 docs, 126 topics)
    │   └── index.html            # generated catalog
    └── cli/                      # build & audit tooling (Node, zero deps)
        ├── generate.mjs          # scan content/ → indexes + catalog
        ├── build-site.mjs        # site chrome + homepage builder
        ├── upgrade-site.mjs      # re-apply chrome to every document
        ├── site-chrome.mjs       # shared header / nav / Q&A-card templates
        ├── book.mjs              # book compiler
        ├── audit.mjs             # integrity audit (must pass)
        ├── smoke-test.mjs        # headless SPA smoke test (needs jsdom)
        ├── tidy-notes.mjs        # content-preserving readability pass
        ├── expand.mjs            # merge cli/expansions/ deep-dives
        ├── names.mjs             # shared labels + study-order helpers
        ├── make-page.py          # page scaffold helper
        ├── batchrender.py        # batch Prelims diagram renderer
        └── expansions/           # authored deep-dive fragments
```

## Quick start

The site needs nothing to run — just a static file server:

```bash
cd upsc-portal
python3 -m http.server 8000
# → http://localhost:8000
```

## CLI toolchain

All Node tools are dependency-free (Node.js 18+); the only optional dev dependency is `jsdom` for the smoke test.

| Command | Purpose |
| --- | --- |
| `node cli/generate.mjs` | Scan `content/` → regenerate `file-index.js`, `search-data.js` and the catalog |
| `node cli/build-site.mjs` | Apply site chrome to new documents + rebuild the homepage |
| `node cli/upgrade-site.mjs --force` | Re-apply the shared header / nav / Q&A templates to every page |
| `node cli/book.mjs` | Compile the book edition (126 lessons) |
| `node cli/audit.mjs` | Integrity audit — links, indexes, syllabus scaffold, book. Must pass |
| `node cli/smoke-test.mjs` | Headless SPA smoke test (`npm i jsdom` first) |
| `node cli/tidy-notes.mjs` | Content-preserving readability pass over article bodies |
| `node cli/expand.mjs` | Merge authored deep-dives from `cli/expansions/` into notes |
| `python3 cli/make-page.py` | Page scaffold helper |
| `python3 cli/batchrender.py` | Batch renderer for Prelims diagram sets |

### Adding a new topic

1. Create the topic folder under `content/` with the five section folders and their pages:
   `content/<prelims|mains>/<area>/<topic>/{detailed-notes,short-notes,bullet-points,diagrams,pyqs}/`
2. Add the topic to the syllabus tree in `assets/js/data.js` (if it is a new syllabus node).
3. Regenerate and rebuild:

   ```bash
   node cli/generate.mjs
   node cli/build-site.mjs
   node cli/book.mjs
   ```

4. Verify before pushing:

   ```bash
   node cli/audit.mjs        # must print "AUDIT PASSED — 0 failure(s)"
   node cli/smoke-test.mjs   # must print "ALL TESTS PASSED"
   ```

## Quality gates

- `cli/audit.mjs` enforces: a Markdown-free repo, full index/search coverage, 0 broken links, the complete 5-section syllabus scaffold, and a valid book edition.
- `cli/smoke-test.mjs` bootstraps the SPA in jsdom and exercises every route (dashboard, sidebar, topic, paper, document viewer, tracker, search, Ctrl+K, image viewer).

The full report lives in [`audit-report.html`](audit-report.html).

## Deployment

Publishing is one-click via GitHub Actions (`.github/workflows/deploy.yml`): on every push to `main` it regenerates the indexes and deploys `upsc-portal/` to GitHub Pages. Enable it once at **Settings → Pages → Source: "GitHub Actions"**.

Manual alternative: set **Settings → Pages → Deploy from a branch → `main` / `/upsc-portal`**, then `git push`.

## Privacy

All progress, theme and quiz data stay in your browser's LocalStorage. The portal makes no network requests for your data.

## License

No license file is currently declared — all rights reserved by the repository owner.
