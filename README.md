# 📚 studyUPSC — UPSC Civil Services Exam Preparation Portal

A complete, static, offline-friendly website for **UPSC CSE (IAS/IPS/IFS)** preparation. The **entire Prelims and Mains syllabus** is mapped into a browsable tree, and **every node of that tree now carries its own study material** — detailed chapters, revision fact cards, mindmaps, diagrams, PYQ-style practice questions, full-length and sectional mock tests, and Mains answer frameworks — with a built-in **revision tracker** and **instant full-text search**. Deploys free on **GitHub Pages**.

![tech](https://img.shields.io/badge/stack-HTML5%20%2B%20Tailwind%20%2B%20Vanilla%20JS-f59e0b) ![deploy](https://img.shields.io/badge/deploy-GitHub%20Actions%20%E2%86%92%20Pages-0ea5e9) ![content](https://img.shields.io/badge/content-316%20notes%20%C2%B7%201%2C270%2B%20questions-16a34a) ![license](https://img.shields.io/badge/license-MIT-green)

---

## 📦 What is inside (content library at a glance)

| Area | Coverage | Material |
|---|---|---|
| **Prelims GS Paper I** | 6 subjects → 25 branches → **70 leaf topics — every one written** | Per leaf: a *Prelims Fact Card* (`short-notes/`) with tables + a **Traps** section, and **10 original MCQs** with keyed one-line reasoning (`pyqs/`). Per branch: revision sheets and PYQ analyses. |
| **Prelims CSAT** | Comprehension · Logical reasoning · Decision-making · Numeracy | Concept notes + strategy; CSAT mock under Mocks |
| **Prelims Mocks** | Full-length GS-I mock (**100 Qs**, 2 h) · **6 sectional tests × 20 Qs** · **CSAT mock 30 Qs** | All 250 questions carry an answer key with explanations and a scoring guide |
| **Mains GS I** | Heritage & Culture · Modern History (6 sub-chapters) · World History · Indian Society · Physical Geography · Geography of India & World | Full 5-section packs (detailed chapters, short notes, bullet mindmaps, SVG diagrams/maps, PYQs with model answers) |
| **Mains GS II** | Constitution & Polity · Governance · Social Justice · International Relations | 5-section packs |
| **Mains GS III** | Economy · Agriculture & Food · Science & Tech · Environment · Security & Disaster Management | 5-section packs |
| **Mains GS IV** | Ethics foundations · Attitude · Aptitude & values · Emotional intelligence · Moral thinkers · Public-service values · Probity · Case studies | Study sets per syllabus facet |
| **Essay** | Frameworks · Topic bank · Quotes & thinkers · Toppers' analysis | Structures + 24 practice topics with outlines |
| **Optional subjects** | Sociology · Public Administration · History · Geography · PSIR · Philosophy · Anthropology · Economics · Psychology | Syllabus map, strategy, booklist, PYQ trend per optional |
| **Mains Practice** | GS I–IV question banks (**30 questions each**, 10/15-markers) · GS IV **20 theory + 6 case studies** · Essay practice | Every question has a compact answer framework (intro hook → body skeleton with the expected examples/data → conclusion) |

**Totals:** 316 Markdown chapters (each with an HTML twin), 23 SVG diagrams/maps, **1,270+ practice questions** (≈ 980 prelims MCQs incl. mocks, ≈ 290 mains/essay prompts). The syllabus tree in `data.js` has 164 nodes; an audit script confirms **0 nodes without content**.

Facts and figures are current to **early 2026** (Budget 2025-26, GST 2.0, COP30, SHANTI Act 2025, ISRO/DRDO 2025 milestones, ISFR 2023, Census 2027 schedule, etc.). Where numbers move (RBI rates, rankings), the notes say so — re-verify before the exam.

---

## ✨ Portal features

| Feature | What you get |
|---|---|
| **Interactive Syllabus Dashboard** | Home page separates **Prelims** (GS I, CSAT, Mocks) and **Mains** (GS 1–4, Essay, Optional, Practice) with paper cards, marks & pattern tables |
| **Subject folder hierarchy** | Dynamic file-tree sidebar + folder cards for every paper, topic and sub-topic |
| **5 structured sections per topic** | `detailed-notes/` · `short-notes/` · `bullet-points/` · `diagrams/` · `pyqs/` |
| **HTML twins of every note** | `cli/md2html.py` renders each `.md` into a standalone styled `.html` next to it (+ a `content/index.html` catalogue) so the material can be read without opening Markdown |
| **Global search** | Instant client-side search across syllabus topics, file names **and full text of all notes** (`Ctrl+K` or `/`) |
| **Revision checklist** | LocalStorage completion tracker with % progress per paper, topic and overall — export/import/reset |
| **Document viewer** | Renders Markdown (tables, code, images, TOC), shows images/PDFs/HTML, prev/next navigation, copy button |
| **Deep linking** | Stable URLs: `#/paper/prelims-gs1`, `#/topic/gs-1/modern-history/revolt-1857`, `#/doc/content/…/file.md` |
| **Dark mode · keyboard friendly** | 🌙/☀️ toggle · `Ctrl+K` / `/` search · `Esc` close · `↑↓` navigate |

---

## 🗂️ Repository layout

```
studyUPSC/
├── README.md                  ← you are here
├── SETUP.md                   ← step-by-step GitHub Pages guide
└── upsc-portal/               ← the website (deploy this folder)
    ├── index.html             ← single-page app shell
    ├── assets/js/
    │   ├── data.js            ← the complete UPSC syllabus tree (source of truth, 164 nodes)
    │   ├── app.js             ← router, sidebar, search, tracker, markdown renderer
    │   ├── file-index.js      ← AUTO-GENERATED file listing   (node cli/generate.mjs)
    │   └── search-data.js     ← AUTO-GENERATED search index    (node cli/generate.mjs)
    ├── cli/
    │   ├── generate.mjs       ← content scanner → file-index.js + search-data.js
    │   ├── md2html.py         ← Markdown → standalone HTML mirrors + content/index.html
    │   └── deploy.yml         ← backup copy of the Actions workflow
    ├── .github/workflows/deploy.yml
    └── content/               ← ✍️ THE STUDY LIBRARY (Markdown + HTML twins, SVGs)
        ├── prelims/
        │   ├── gs1/<subject>/<branch>/<leaf>/{short-notes,pyqs}/   ← 70 leaf topics
        │   ├── csat/
        │   └── mocks/{full-length,sectional-tests,csat-mock}/pyqs/
        └── mains/
            ├── gs-1-heritage-geography-society/<topic>/{detailed-notes,short-notes,bullet-points,diagrams,pyqs}/
            ├── gs-2-polity-governance-ir/ · gs-3-economy-tech-environment/ · gs-4-ethics-integrity-aptitude/
            ├── essay-frameworks/ · optional-subjects/<optional>/
            └── practice/{gs-1,gs-2,gs-3,gs-4,essay}-practice/pyqs/
```

### Folder → syllabus mapping
Folder names map to syllabus ids in `FOLDER_ALIASES` at the top of `cli/generate.mjs`
(`gs1 → prelims-gs1`, `csat → prelims-csat`, `mocks → prelims-mocks`, `practice → mains-practice`,
`gs-1-heritage-geography-society → gs-1`, `detailed-notes → notes`, `short-notes → short`,
`bullet-points → bullets`, …). The `prelims/` and `mains/` container folders are dropped from nav paths.

---

## 🚀 Quick start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/clickalex/studyUPSC.git
cd studyUPSC/upsc-portal

# 2. Open locally — no build step, no npm install
python3 -m http.server 8080
# → http://localhost:8080

# 3. After editing or adding notes under content/:
python3 cli/md2html.py      # regenerate the HTML twins + content/index.html
node cli/generate.mjs       # rebuild file-index.js + search-data.js

# 4. Push — GitHub Actions re-indexes and deploys automatically (see SETUP.md)
```

> Open `index.html` by double-clicking also works, but a local server gives the best experience (some browsers restrict `fetch` on `file://`).

---

## 🧭 How to study with it

1. **Prelims** — open `#/paper/prelims-gs1`, pick a subject → branch → leaf. Read the *Fact Card*, then attempt the 10 MCQs; the **Traps** list at the end of every card is the "statement-based question" cheat-sheet. Tick the leaf in the tracker.
2. **Mock cycle** — once a subject's leaves are done, take its sectional test (`#/paper/prelims-mocks`); after all six, sit the 100-question full mock under exam timing (+2 / −0.66).
3. **Mains** — each GS topic has detailed chapters → short notes → bullet mindmaps → diagrams → PYQs with model answers. Then write answers from the paper-wise **Practice** banks against the frameworks.
4. **Essay & GS IV** — use the frameworks/quotes packs, the 24 outlined essay topics and the 6 case studies with stakeholder → options → decision templates.
5. **Search** anything (`Ctrl+K`) — e.g. "Kigali", "Article 200", "SpaDeX" — results come from the full text of every note.

---

## 📖 Adding your own material

1. Create or reuse a folder under `content/` that mirrors an id in `data.js` (unknown folders still appear in the Content Library and search).
2. Drop Markdown (`.md`/`.txt`), images (`.png/.jpg/.svg/.gif`) or PDFs; nest as deep as you like. Keep the tree **content-only** — no empty placeholder folders (`find content -type d -empty` should print nothing).
3. Run `python3 cli/md2html.py` then `node cli/generate.mjs` (or just push — the workflow regenerates the indexes).
4. To add a syllabus node, edit `assets/js/data.js`; sidebar, dashboard, tracker and search rebuild from it. Do **not** use `generate.mjs --sync` (it scaffolds empty placeholder folders).

### Content conventions used in this library
- **Prelims leaf pack:** `short-notes/<leaf>-notes.md` (`# Topic — Prelims Fact Card`, a syllabus pointer line `> Prelims GS-I › Subject › Branch`, tables/bullets, `## Traps`) + `pyqs/<leaf>-mcqs.md` (10 questions, `## Answer key` table `| Q | Ans | Why |`).
- **Mains topic pack:** `detailed-notes/` (full chapters), `short-notes/`, `bullet-points/` (mindmaps), `diagrams/` (SVG), `pyqs/` (PYQs + model answers).
- **Markdown supported:** headings, emphasis, code, lists, quotes, tables, fenced code, images, relative links (open inside the portal), rules. Raw HTML is escaped.

---

## ⚙️ Customisation & architecture

- **Syllabus** — `assets/js/data.js`; **sections** — `CONTENT_SECTIONS` in the same file (keep `FOLDER_ALIASES` in `cli/generate.mjs` in sync).
- **Branding** — title/description in `index.html`; colours are Tailwind classes (amber accent on slate).
- **Offline** — Tailwind comes from a CDN; vendor `tailwindcss` + fonts into `assets/` to go fully offline.
- **Data flow** — `data.js` (syllabus) + `generate.mjs` output (`file-index.js`, `search-data.js`) → `app.js` renders everything client-side; `md2html.py` produces the browsable HTML twins. The Actions workflow regenerates the indexes on every push so the deployed site always matches `content/`.
- **Progress** — `localStorage` key `studyupsc-progress-v1`; export/import JSON from the Tracker page.

## 🛠️ Tech stack

HTML5 · Tailwind CSS (CDN) · Vanilla JavaScript (no build) · Node.js 18+ and Python 3 (only for the two CLI scripts) · GitHub Actions + Pages.

## 📄 License

MIT — use it, fork it, make it yours. The syllabus structure mirrors the official UPSC notification; all notes, questions and answer keys are original study material written for this repository.
