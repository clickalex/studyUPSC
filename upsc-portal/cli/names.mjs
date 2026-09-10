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
