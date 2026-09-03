# content/ — Study Material Library

Two branches mirror the exam. Every folder below corresponds to a node of the
syllabus tree in `assets/js/data.js`, and every node has its own material
(316 Markdown chapters, each with a styled `.html` twin, plus 23 SVG diagrams).

```
content/
├── prelims/
│   ├── gs1/                          # → paper "prelims-gs1"  (176 files)
│   │   ├── history-culture/          #   4 branches · 19 leaf topics
│   │   ├── geography/                #   4 branches · 12 leaf topics
│   │   ├── polity-governance/        #   4 branches · 15 leaf topics
│   │   ├── economy/                  #   5 branches · 12 leaf topics
│   │   ├── environment-ecology/      #   3 branches ·  7 leaf topics
│   │   └── science-tech/             #   2 branches ·  5 leaf topics
│   │       └── <branch>/<leaf>/{short-notes/<leaf>-notes.md, pyqs/<leaf>-mcqs.md}
│   ├── csat/                         # → "prelims-csat": comprehension, logical-reasoning,
│   │                                 #   decision-making, numeracy (+ strategy notes, PYQ trends)
│   └── mocks/                        # → "prelims-mocks"
│       ├── full-length/pyqs/         #   GS-I mock 01 — 100 Qs, key + explanations
│       ├── sectional-tests/pyqs/     #   6 subjects × 20 Qs
│       └── csat-mock/pyqs/           #   30 Qs with worked solutions
└── mains/
    ├── gs-1-heritage-geography-society/   # → "gs-1"  (46 files, 11 SVGs)
    │   ├── modern-history/<6 sub-chapters>/ · indian-heritage-culture/ · world-history/
    │   └── indian-society/ · physical-geography/ · geography-world-india/
    ├── gs-2-polity-governance-ir/         # → "gs-2"  constitution-polity, governance-administration,
    │                                      #           social-justice, international-relations
    ├── gs-3-economy-tech-environment/     # → "gs-3"  indian-economy, agriculture-food, science-technology,
    │                                      #           environment-biodiversity, security-disaster
    ├── gs-4-ethics-integrity-aptitude/    # → "gs-4"  8 syllabus facets + 2 study sets
    ├── essay-frameworks/                  # → "essay" frameworks, topic bank, quotes, toppers' analysis
    ├── optional-subjects/                 # 9 optionals: sociology, public-administration, history, geography,
    │                                      #   polity (PSIR), philosophy, anthropology, economics, psychology
    └── practice/                          # → "mains-practice"
        ├── gs-1-practice/pyqs/ … gs-3-practice/pyqs/   # 30 questions each with answer frameworks
        ├── gs-4-practice/pyqs/                         # 20 theory Qs + 6 case studies
        └── essay-practice/pyqs/                        # 24 topics with outlines
```

**The five canonical sections** under a Mains topic:
`detailed-notes/` `short-notes/` `bullet-points/` `diagrams/` `pyqs/`
Prelims leaves use the two that matter for MCQ preparation: `short-notes/` (fact card
with a **Traps** list) and `pyqs/` (10 keyed MCQs).

## Conventions
- Content-only tree: **no empty placeholder folders** (`find content -type d -empty` must print nothing).
- Every prelims fact card opens with a syllabus pointer line, e.g. `> Prelims GS-I › Geography › Indian Geography.`
- MCQ files end with an `## Answer key` table (`| Q | Ans | Why |`).
- After adding or editing files, from `upsc-portal/` run
  `python3 cli/md2html.py` (HTML twins + `content/index.html`) and
  `node cli/generate.mjs` (file index + full-text search). Pushing to `main`
  also re-runs the generator through GitHub Actions.
