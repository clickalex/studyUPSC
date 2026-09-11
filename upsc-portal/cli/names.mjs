/* ============================================================================
   studyUPSC — shared human-readable names for folder segments.
   Used by cli/generate.mjs (catalog) and cli/build-site.mjs (site nav/home).
   ========================================================================== */

export const NICE_NAMES = {
  content: 'Content Library',
  prelims: 'Prelims',
  mains: 'Mains',
  gs1: 'GS Paper I',
  csat: 'CSAT',
  mocks: 'Mock Tests & PYQs',
  'essay-frameworks': 'Essay',
  'gs-1-heritage-geography-society': 'GS I — Heritage, Geography & Society',
  'gs-2-polity-governance-ir': 'GS II — Polity, Governance & IR',
  'gs-3-economy-tech-environment': 'GS III — Economy, Technology & Environment',
  'gs-4-ethics-integrity-aptitude': 'GS IV — Ethics, Integrity & Aptitude',
  'optional-subjects': 'Optional Subjects',
  practice: 'Practice',
  'detailed-notes': 'Detailed Notes',
  'short-notes': 'Short Notes',
  'bullet-points': 'Bullet Points',
  mindmaps: 'Mindmaps',
  diagrams: 'Diagrams',
  maps: 'Maps',
  pyqs: 'PYQs',
  notes: 'Notes',
  short: 'Short Notes',
  bullets: 'Bullet Points',
};

export function niceLabel(name) {
  if (Object.prototype.hasOwnProperty.call(NICE_NAMES, name)) return NICE_NAMES[name];
  return String(name)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bGs\b/g, 'GS')
    .replace(/\bCsat\b/g, 'CSAT')
    .replace(/\bPyqs?\b/g, 'PYQs')
    .replace(/\bIr\b/g, 'IR')
    .replace(/\bAi\b/g, 'AI');
}

/* ============================================================================
   Canonical study order — the ONE order everything follows.
   ----------------------------------------------------------------------------
   Keys are parent folder names; values list children in the order a student
   should study them (exam order, then chronological / pedagogical order —
   never alphabetical). Used by cli/generate.mjs (catalog) and
   cli/build-site.mjs (homepage). Mirrors the child order in assets/js/data.js.

   Anything not listed falls back to alphabetical order, AFTER listed items.
   The five content-section folders always sort last, in study-sequence order.
   ========================================================================== */

export const SECTION_FOLDERS_IN_ORDER = [
  'detailed-notes',
  'short-notes',
  'bullet-points',
  'diagrams',
  'pyqs',
];

const SECTION_RANK = new Map(SECTION_FOLDERS_IN_ORDER.map((n, i) => [n, 100 + i]));
// legacy aliases resolve to the same rank as their canonical section
SECTION_RANK.set('mindmaps', 100 + 2);
SECTION_RANK.set('maps', 100 + 3);
SECTION_RANK.set('notes', 100);
SECTION_RANK.set('short', 100 + 1);
SECTION_RANK.set('bullets', 100 + 2);

export const STUDY_ORDER = {
  // content/ root: the exam itself runs Prelims first, then Mains
  content: ['prelims', 'mains'],
  // Prelims: scored paper → qualifying paper → mocks (attempt after syllabus)
  prelims: ['gs1', 'csat', 'mocks'],
  // GS Paper I subjects: most static-first, current-affairs-heavy later
  gs1: ['history-culture', 'geography', 'polity-governance', 'economy', 'environment-ecology', 'science-tech'],
  // History runs oldest → newest, culture caps the block
  'history-culture': ['ancient-history', 'medieval-history', 'modern-history', 'art-culture'],
  'ancient-history': ['stone-bronze-age', 'vedic-age', 'mahajanapadas-mauryan', 'post-mauryan-gupta'],
  'medieval-history': ['early-medieval-kingdoms', 'delhi-sultanate', 'mughal-empire', 'marathas-vijayanagara'],
  'modern-history': ['east-india-company', 'revolt-1857', 'socio-religious-reforms', 'national-movement-1885-1919', 'gandhian-era-1919-1947', 'constitutional-development'],
  'art-culture': ['architecture', 'painting', 'music-dance', 'fairs-festivals', 'scriptures-languages'],
  // Geography: physical foundations → India → world → map practice
  geography: ['physical-geography', 'indian-geography', 'world-geography', 'maps-india-world'],
  'physical-geography': ['geomorphology', 'climatology', 'oceanography', 'biogeography'],
  'indian-geography': ['physiography-india', 'drainage-rivers', 'climate-india', 'soils-agriculture', 'minerals-industries', 'transport-settlements'],
  'world-geography': ['world-physical', 'world-economic'],
  // Polity: constitution → organs → governance → India's place in the world
  'polity-governance': ['constitution', 'organs-govt', 'governance', 'international-relations'],
  constitution: ['making-features', 'fundamental-rights-dpsp', 'amendments', 'federal-structure'],
  'organs-govt': ['parliament', 'executive', 'judiciary'],
  governance: ['constitutional-bodies', 'statutory-bodies', 'local-govt', 'schemes-policies', 'e-governance'],
  'international-relations': ['bilateral-ties', 'multilateral-forums', 'global-groups'],
  // Economy: concepts → sectors → external → markets → planning
  economy: ['macro-economy', 'sectors-indian-economy', 'external-sector', 'financial-markets', 'planning-growth'],
  'macro-economy': ['national-income', 'money-banking', 'fiscal-policy'],
  'sectors-indian-economy': ['agriculture', 'industry-msme', 'services-infrastructure'],
  'external-sector': ['trade-bop', 'fdi-investment'],
  'financial-markets': ['capital-markets', 'financial-inclusion'],
  'planning-growth': ['niti-aayog', 'human-development'],
  // Environment: concepts → issues → law & institutions
  'environment-ecology': ['ecology-biodiversity', 'environmental-issues', 'acts-policies-env'],
  'ecology-biodiversity': ['ecosystems', 'biodiversity-india', 'species-conservation'],
  'environmental-issues': ['climate-change', 'pollution-waste'],
  'acts-policies-env': ['acts-conventions', 'institutions'],
  // Science & Tech: basics → emerging tech in exam-weight order
  'science-tech': ['basic-science', 'emerging-tech'],
  'emerging-tech': ['biotech-health', 'space-missions', 'defence-nuclear', 'ai-it'],
  // CSAT: read → reason → decide → calculate
  csat: ['comprehension', 'logical-reasoning', 'decision-making', 'numeracy'],
  // Mocks: full paper → sectionals → CSAT mock
  mocks: ['full-length', 'sectional-tests', 'csat-mock'],
  // Mains papers in mark-sheet order: GS I–IV, Essay, Optional, Practice
  mains: ['gs-1-heritage-geography-society', 'gs-2-polity-governance-ir', 'gs-3-economy-tech-environment', 'gs-4-ethics-integrity-aptitude', 'essay-frameworks', 'optional-subjects', 'practice'],
  // GS I mirrors the prelims history spine, then society & geography
  'gs-1-heritage-geography-society': ['indian-heritage-culture', 'modern-history', 'world-history', 'indian-society', 'physical-geography', 'geography-world-india'],
  'gs-2-polity-governance-ir': ['constitution-polity', 'governance-administration', 'social-justice', 'international-relations'],
  'gs-3-economy-tech-environment': ['indian-economy', 'agriculture-food', 'science-technology', 'environment-biodiversity', 'security-disaster'],
  'gs-4-ethics-integrity-aptitude': ['ethics-foundations', 'governance-probity-case-studies', 'ethics-human-interface', 'attitude', 'aptitude-foundations', 'emotional-intelligence', 'moral-thinkers', 'public-service-values', 'probity-governance', 'case-studies'],
  'essay-frameworks': ['essay-frameworks', 'essay-topics', 'essay-quotes', 'essay-toppers'],
  'optional-subjects': ['optional-sociology', 'optional-public-administration', 'optional-history', 'optional-geography', 'optional-polity', 'optional-philosophy', 'optional-anthropology', 'optional-economics', 'optional-psychology'],
  practice: ['gs-1-practice', 'gs-2-practice', 'gs-3-practice', 'gs-4-practice', 'essay-practice'],
};

/* Rank of `child` under `parent`: listed items first (in listed order),
   then anything unlisted (alphabetical), then section folders last. */
export function orderRank(parent, child) {
  if (SECTION_RANK.has(child)) return SECTION_RANK.get(child);
  const list = STUDY_ORDER[parent];
  if (list) {
    const i = list.indexOf(child);
    if (i !== -1) return i;
  }
  return 50; // unlisted topic: middle band, alphabetical among themselves
}

/* Comparator for sibling folder/file nodes that carry a `name`. */
export function compareStudyOrder(parent) {
  return (a, b) => {
    const ra = orderRank(parent, a.name);
    const rb = orderRank(parent, b.name);
    if (ra !== rb) return ra - rb;
    return String(a.name).localeCompare(String(b.name), undefined, { numeric: true });
  };
}

export function isSectionFolder(name) {
  return SECTION_RANK.has(name);
}
