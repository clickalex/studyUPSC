# content/ — Study Material Library

Two branches mirror the exam:

```
content/
├── prelims/                # GS Paper I & CSAT material
│   ├── gs1/                #  → syllabus paper "prelims-gs1"
│   │   └── history-culture/modern-history/…
│   └── csat/               #  → syllabus paper "prelims-csat"
└── mains/                  # Mains papers
    ├── gs-1-heritage-geography-society/   # → "gs-1"
    │   ├── modern-history/                # topic with full 5-section scaffold
    │   ├── art-and-culture/
    │   ├── physical-geography/
    │   └── indian-society/
    ├── gs-2-polity-governance-ir/         # → "gs-2"
    ├── gs-3-economy-tech-environment/     # → "gs-3"
    ├── gs-4-ethics-integrity-aptitude/    # → "gs-4"
    ├── essay-frameworks/                  # → "essay"
    └── optional-subjects/
```

**The five canonical sections** under every topic:
`detailed-notes/` `short-notes/` `bullet-points/` `diagrams/` `pyqs/`

- Add Markdown (`.md`), images (`.png/.jpg/.svg/.gif`) or PDFs anywhere under `content/`.
- After adding files run `node cli/generate.mjs` (or just push — the GitHub
  Actions workflow regenerates indexes automatically).
- Run `node cli/generate.mjs --sync` to auto-create the 5-section scaffold
  under every topic folder.
