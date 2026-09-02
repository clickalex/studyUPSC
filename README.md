# 📚 studyUPSC — UPSC Civil Services Exam Preparation Portal

A complete, static, offline-friendly website for **UPSC CSE (IAS/IPS/IFS)** preparation — the full Prelims & Mains syllabus mapped into notes, revision material, mindmaps, diagrams and PYQs, with a built-in **revision tracker** and **instant global search**. Deploys free on **GitHub Pages**.

![tech](https://img.shields.io/badge/stack-HTML5%20%2B%20Tailwind%20%2B%20Vanilla%20JS-f59e0b) ![deploy](https://img.shields.io/badge/deploy-GitHub%20Actions%20%E2%86%92%20Pages-0ea5e9) ![license](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Feature | What you get |
|---|---|
| **Interactive Syllabus Dashboard** | Home page separates **Prelims** (GS I + CSAT) and **Mains** (Essay, GS 1–4, Optional) with paper cards, marks & pattern tables |
| **Subject folder hierarchy** | Dynamic file-tree sidebar + folder cards for every paper and topic |
| **5 structured sections per topic** | `detailed-notes/` · `short-notes/` · `bullet-points/` · `diagrams/` · `pyqs/` |
| **Global search** | Instant client-side search across syllabus topics, file names **and full text of your Markdown notes** (`Ctrl+K` or `/`) |
| **Revision checklist** | LocalStorage-based completion tracker with % progress bars per paper, topic and overall — plus export/import/reset |
| **Document viewer** | Renders Markdown notes (tables, code, images, TOC), displays images/PDFs, prev/next navigation, copy button |
| **Deep linking** | Every page has a stable URL: `#/paper/gs-1`, `#/topic/gs-1/modern-history`, `#/doc/content/…/revolt-1857.md` |
| **Dark mode** | 🌙/☀️ toggle, persisted |
| **Keyboard friendly** | `Ctrl+K` / `/` search · `Esc` close · `↑↓` navigate results |

---

## 🗂️ Repository layout

```
studyUPSC/
├── README.md                  ← you are here
├── SETUP.md                   ← step-by-step GitHub Pages guide
└── upsc-portal/               ← the website (deploy this folder)
    ├── index.html             ← single-page app shell
    ├── assets/
    │   ├── css/style.css      ← custom styles on Tailwind
    │   ├── js/
    │   │   ├── data.js        ← the complete UPSC syllabus tree (source of truth)
    │   │   ├── app.js         ← router, sidebar, search, tracker, markdown renderer
    │   │   ├── file-index.js  ← AUTO-GENERATED file listing (run cli)
    │   │   └── search-data.js ← AUTO-GENERATED full-text search index (run cli)
    │   └── images/            ← your own images go here
    ├── content/               ← ✍️ YOUR STUDY MATERIAL (Markdown, images, PDFs)
    │   ├── prelims/
    │   │   ├── gs1/history-culture/modern-history/…   ← sample notes
    │   │   └── csat/
    │   └── mains/
    │       ├── gs-1-heritage-geography-society/
    │       │   ├── modern-history/                    ← full 5-section scaffold + samples
    │       │   ├── art-and-culture/
    │       │   ├── physical-geography/
    │       │   └── indian-society/
    │       ├── gs-2-polity-governance-ir/
    │       ├── gs-3-economy-tech-environment/
    │       ├── gs-4-ethics-integrity-aptitude/
    │       ├── essay-frameworks/
    │       └── optional-subjects/
    ├── cli/
    │   ├── generate.mjs       ← content scanner (Node, zero dependencies)
    │   └── deploy.yml         ← copy of the Actions workflow (for reference/backup)
    └── .github/workflows/
        └── deploy.yml         ← automatic GitHub Pages deployment
```

---

## 🚀 Quick start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/<your-username>/studyUPSC.git
cd studyUPSC/upsc-portal

# 2. Open locally — no build step, no npm install
python3 -m http.server 8080
# → http://localhost:8080

# 3. (Optional) add your own notes under content/, then re-index:
node cli/generate.mjs

# 4. Push — GitHub Actions deploys automatically (see SETUP.md)
cd ..
git add -A && git commit -m "initial portal" && git push
```

> **Tip:** open `index.html` by double-clicking also works, but use a local
> server for the best experience (some browsers restrict `fetch` on `file://`).

---

## 📖 How to add your own study material

1. **Create a topic folder** under `content/` following the naming in `data.js`
   (or any name — folders are auto-detected).
2. **Drop files in**: Markdown (`.md`/`.txt`), images (`.png/.jpg/.svg/.gif`),
   or PDFs. Nest as deep as you like.
3. **Re-index** — either run locally:

   ```bash
   cd upsc-portal
   node cli/generate.mjs            # rebuild file-index.js + search-data.js
   ```

   …or simply push: the GitHub Actions workflow re-runs the generator
   automatically before deploying.

4. **Auto-scaffold** all missing topic folders with the 5 sections:

   ```bash
   node cli/generate.mjs --sync
   ```

5. **The folder → syllabus mapping** is configured at the top of
   `cli/generate.mjs` (`FOLDER_ALIASES`). Folder names map to syllabus ids
   (e.g. `gs-1-heritage-geography-society` → `gs-1`,
   `detailed-notes` → `notes`). Unknown folders get a readable slug and still
   appear in the sidebar Content Library and search.

### Markdown you can write

Everything you'd expect: headings, **bold**, *italics*, `code`, lists, `> quotes`,
`| tables |`, ``` ```code blocks``` ```, images `![alt](diagram.png)`,
links `[note](other.md)` (relative links open inside the portal), and `---`
rules. Raw HTML is escaped for safety.

---

## ⚙️ Customisation

- **Syllabus** — edit `assets/js/data.js` (add/remove papers, topics, tags).
  The sidebar, dashboard, tracker and search all rebuild from it.
- **Sections** — the five canonical branches are defined in `CONTENT_SECTIONS`
  in `data.js`. Renaming them updates every page; keep the folder aliases in
  `cli/generate.mjs` in sync.
- **Branding** — title/description live in `index.html`; colours are Tailwind
  classes (amber accent on slate).
- **Offline** — the site uses Tailwind via CDN. To go fully offline, download
  `tailwindcss` + the two Google Fonts and vendor them into `assets/`, then
  update `index.html`.

---

## 🧭 Architecture notes

- **Framework choice:** static HTML5 + Tailwind CSS + vanilla JS, hash-routed.
  No build step → instant deploys, no lock-in, works on `file://` and any
  static host (GitHub Pages, Netlify, S3…).
- **Data flow:** `data.js` (syllabus) + `cli/generate.mjs` output
  (`file-index.js`, `search-data.js`) → `app.js` renders everything client-side.
  The GitHub Actions workflow regenerates indexes on every push, so the
  deployed site always matches `content/`.
- **Progress tracking:** stored in `localStorage` (`studyupsc-progress-v1`).
  Export/Import lets you back it up or move between devices.
- **Sections & deep nesting:** a topic's 5 sections live at
  `…/<topic>/<section>/`, files under them get `nav` paths like
  `gs-1/modern-history/notes`, and the sidebar/Content Library tree reflects
  the real folder hierarchy — unlimited nesting depth.

---

## 🛠️ Tech stack

HTML5 · Tailwind CSS (CDN) · Vanilla JavaScript (ES5-compatible, no build) ·
Node.js 18+ (only for the optional CLI) · GitHub Actions + Pages.

## 📄 License

MIT — use it, fork it, make it yours. Syllabus content mirrors the official
UPSC notification structure; sample notes are original study material.
