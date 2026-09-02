/* ============================================================================
   studyUPSC — UPSC CSE Syllabus Data Model
   ----------------------------------------------------------------------------
   This file is the single source of truth for the syllabus tree.
   Every subject ("paper") branches into topics, and each topic branches into
   the five canonical content sections:
     notes    -> Detailed Notes
     short    -> Short Revision Notes
     bullets  -> Key Bullet Points / Mindmaps
     diagrams -> Diagrams, Maps & Flowcharts
     pyqs     -> PYQs & Model Answers

   Schema (recursive):
     { id, title, [stage], [tag], [sub: [children...]] }

   "nav" paths (e.g. "gs-1/modern-history/notes") are auto-computed at load
   time by buildNav() so ids never need to be repeated.
   ========================================================================== */

window.SYLLABUS_DATA = {
  title: 'UPSC Civil Services Examination',
  exam: {
    prelims: {
      id: 'prelims',
      title: 'Prelims',
      full: 'Preliminary Examination — Paper I (GS) & Paper II (CSAT)',
      summary: 'Two objective (MCQ) papers of 200 marks each. General Studies Paper I is the scored paper; CSAT is qualifying at 33%.',
      pattern: [
        { paper: 'Paper I — General Studies', marks: '200 marks · 100 Qs', time: '2 hours', note: 'Counts towards merit (scored).' },
        { paper: 'Paper II — CSAT (Aptitude)', marks: '200 marks · 80 Qs', time: '2 hours', note: 'Qualifying only — minimum 33%.' }
      ],
      weightage: [
        { subject: 'History & Culture', range: '15–18' },
        { subject: 'Geography', range: '12–18' },
        { subject: 'Polity & Governance', range: '15–20' },
        { subject: 'Economy & Development', range: '15–20' },
        { subject: 'Environment & Ecology', range: '12–18' },
        { subject: 'Science & Tech', range: '8–12' },
        { subject: 'Current Affairs', range: '20–30' },
        { subject: 'CSAT (qualifying)', range: '200' }
      ]
    },
    mains: {
      id: 'mains',
      title: 'Mains',
      full: 'Main Examination — 9 papers of conventional (written) type',
      summary: 'Two qualifying papers (language + English) and seven counted papers: Essay, GS I–IV, and two Optional papers.',
      pattern: [
        { paper: 'Paper A — Indian Language (qualifying)', marks: '300', time: '3 hours', note: 'Qualifying (25% needed).' },
        { paper: 'Paper B — English (qualifying)', marks: '300', time: '3 hours', note: 'Qualifying (25% needed).' },
        { paper: 'Paper I — Essay', marks: '250', time: '3 hours', note: 'Two essays from a choice of topics.' },
        { paper: 'Paper II — General Studies I', marks: '250', time: '3 hours', note: 'Heritage, History, Geography, Society.' },
        { paper: 'Paper III — General Studies II', marks: '250', time: '3 hours', note: 'Polity, Governance, Social Justice, IR.' },
        { paper: 'Paper IV — General Studies III', marks: '250', time: '3 hours', note: 'Economy, S&T, Environment, Security.' },
        { paper: 'Paper V — General Studies IV', marks: '250', time: '3 hours', note: 'Ethics, Integrity & Aptitude.' },
        { paper: 'Paper VI — Optional Subject I', marks: '250', time: '3 hours', note: 'Two papers of 250 marks each.' },
        { paper: 'Paper VII — Optional Subject II', marks: '250', time: '3 hours', note: 'Total Mains: 1750 marks.' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /*  PRELIMS                                                           */
  /* ------------------------------------------------------------------ */
  papers: [
    {
      id: 'prelims-gs1', stage: 'prelims',
      title: 'GS Paper I — General Studies (Prelims)',
      short: 'GS I',
      tag: 'History · Geography · Polity · Economy · Environment · S&T',
      summary: 'The scored prelims paper. Static subjects + current affairs mapped to them.',
      sub: [
        {
          id: 'history-culture', title: 'History & Indian Culture', tag: '12–15 Qs',
          sub: [
            {
              id: 'modern-history', title: 'Modern History (1757–1947)',
              sub: [
                { id: 'east-india-company', title: 'Advent of Europeans & East India Company (1757–1857)' },
                { id: 'revolt-1857', title: 'Revolt of 1857 & Aftermath' },
                { id: 'socio-religious-reforms', title: 'Socio-Religious Reform Movements' },
                { id: 'national-movement-1885-1919', title: 'National Movement: Moderates, Extremists & Gandhian Era (1885–1919)' },
                { id: 'gandhian-era-1919-1947', title: 'Gandhian Era: Non-Cooperation to Quit India (1919–1947)' },
                { id: 'constitutional-development', title: 'Constitutional Development & Government of India Acts' }
              ]
            },
            {
              id: 'medieval-history', title: 'Medieval History (8th–18th Century)',
              sub: [
                { id: 'early-medieval-kingdoms', title: 'Rajput Kingdoms, Palas & Cholas' },
                { id: 'delhi-sultanate', title: 'Delhi Sultanate (1206–1526)' },
                { id: 'mughal-empire', title: 'Mughal Empire (1526–1707)' },
                { id: 'marathas-vijayanagara', title: 'Marathas, Vijayanagara & Bahmani Kingdoms' }
              ]
            },
            {
              id: 'ancient-history', title: 'Ancient History & Art',
              sub: [
                { id: 'stone-bronze-age', title: 'Prehistory: Stone Age & Indus Valley Civilisation' },
                { id: 'vedic-age', title: 'Vedic Age & Later Vedic Period' },
                { id: 'mahajanapadas-mauryan', title: 'Mahajanapadas, Buddhism, Jainism & Mauryan Empire' },
                { id: 'post-mauryan-gupta', title: 'Post-Mauryan & Gupta Empire' }
              ]
            },
            {
              id: 'art-culture', title: 'Art & Culture',
              sub: [
                { id: 'architecture', title: 'Architecture: Temple Styles, Forts & Monuments' },
                { id: 'painting', title: 'Painting: Miniature, Mughal & Modern Schools' },
                { id: 'music-dance', title: 'Music, Dance & Theatre Forms' },
                { id: 'fairs-festivals', title: 'Fairs, Festivals, Puppetry & Cultural Heritage' },
                { id: 'scriptures-languages', title: 'Scriptures, Languages & Literature' }
              ]
            }
          ]
        },
        {
          id: 'geography', title: 'Geography', tag: '12–18 Qs',
          sub: [
            {
              id: 'physical-geography', title: 'Physical Geography',
              sub: [
                { id: 'geomorphology', title: 'Geomorphology: Earth, Landforms & Rocks' },
                { id: 'climatology', title: 'Climatology: Atmosphere, Cyclones & Monsoon' },
                { id: 'oceanography', title: 'Oceanography: Currents, Tides & Salinity' },
                { id: 'biogeography', title: 'Biogeography: Soils & Natural Vegetation' }
              ]
            },
            {
              id: 'indian-geography', title: 'Indian Geography',
              sub: [
                { id: 'physiography-india', title: 'Physiography: Himalayas, Peninsular Plateau, Plains & Coasts' },
                { id: 'drainage-rivers', title: 'Drainage System & Major Rivers' },
                { id: 'climate-india', title: 'Climate of India: Monsoon Mechanism' },
                { id: 'soils-agriculture', title: 'Soils, Irrigation & Agriculture Patterns' },
                { id: 'minerals-industries', title: 'Minerals, Energy Resources & Industries' },
                { id: 'transport-settlements', title: 'Transport, Trade & Human Settlements' }
              ]
            },
            {
              id: 'world-geography', title: 'World Geography',
              sub: [
                { id: 'world-physical', title: 'World Physical: Continents, Oceans & Climates' },
                { id: 'world-economic', title: 'World Economic & Human Geography' }
              ]
            },
            {
              id: 'maps-india-world', title: 'Maps of India & World', tag: '3–4 Qs from map-based sources'
            }
          ]
        },
        {
          id: 'polity-governance', title: 'Polity & Governance', tag: '15–20 Qs',
          sub: [
            {
              id: 'constitution', title: 'Constitution of India',
              sub: [
                { id: 'making-features', title: 'Making, Preamble & Basic Features' },
                { id: 'fundamental-rights-dpsp', title: 'Fundamental Rights, DPSP & Fundamental Duties' },
                { id: 'amendments', title: 'Amendments & Landmark Judgements' },
                { id: 'federal-structure', title: 'Federal Structure, Centre–State Relations' }
              ]
            },
            {
              id: 'organs-govt', title: 'Organs of Government',
              sub: [
                { id: 'parliament', title: 'Parliament: Structure & Functioning' },
                { id: 'executive', title: 'President, Vice-President, PM & Council of Ministers' },
                { id: 'judiciary', title: 'Supreme Court, High Courts & Judicial Review' }
              ]
            },
            {
              id: 'governance', title: 'Governance & Administration',
              sub: [
                { id: 'constitutional-bodies', title: 'Constitutional Bodies: UPSC, CAG, EC, Finance Commission' },
                { id: 'statutory-bodies', title: 'Statutory & Non-Constitutional Bodies' },
                { id: 'local-govt', title: 'Panchayati Raj & Urban Local Bodies' },
                { id: 'schemes-policies', title: 'Government Schemes & Public Policy' },
                { id: 'e-governance', title: 'E-Governance & Citizen Charters' }
              ]
            },
            {
              id: 'international-relations', title: 'International Relations',
              sub: [
                { id: 'bilateral-ties', title: 'India–Neighbourhood & Bilateral Relations' },
                { id: 'multilateral-forums', title: 'UN, G20, BRICS, SCO & Multilateral Forums' },
                { id: 'global-groups', title: 'Regional & Strategic Groupings' }
              ]
            }
          ]
        },
        {
          id: 'economy', title: 'Economy & Economic Development', tag: '15–20 Qs',
          sub: [
            {
              id: 'macro-economy', title: 'Macroeconomic Fundamentals',
              sub: [
                { id: 'national-income', title: 'National Income, GDP & Inflation' },
                { id: 'money-banking', title: 'Money, Banking & RBI' },
                { id: 'fiscal-policy', title: 'Fiscal Policy, Budget & Taxation' }
              ]
            },
            {
              id: 'sectors-indian-economy', title: 'Sectors of the Indian Economy',
              sub: [
                { id: 'agriculture', title: 'Agriculture: MSP, Subsidies & Reforms' },
                { id: 'industry-msme', title: 'Industry, MSME & Industrial Policy' },
                { id: 'services-infrastructure', title: 'Services & Infrastructure' }
              ]
            },
            {
              id: 'external-sector', title: 'External Sector',
              sub: [
                { id: 'trade-bop', title: 'Trade, BoP & Exchange Rate' },
                { id: 'fdi-investment', title: 'FDI, FPI & International Institutions (IMF, World Bank, WTO)' }
              ]
            },
            {
              id: 'financial-markets', title: 'Financial Markets & Inclusion',
              sub: [
                { id: 'capital-markets', title: 'Capital Markets, SEBI & Insurance' },
                { id: 'financial-inclusion', title: 'Financial Inclusion & Digital Payments' }
              ]
            },
            {
              id: 'planning-growth', title: 'Planning, Growth & Development',
              sub: [
                { id: 'niti-aayog', title: 'NITI Aayog & Planning History' },
                { id: 'human-development', title: 'Human Development, Poverty & Employment' }
              ]
            }
          ]
        },
        {
          id: 'environment-ecology', title: 'Environment & Ecology', tag: '12–18 Qs',
          sub: [
            {
              id: 'ecology-biodiversity', title: 'Ecology & Biodiversity',
              sub: [
                { id: 'ecosystems', title: 'Ecosystems, Food Chains & Nutrient Cycles' },
                { id: 'biodiversity-india', title: 'Biodiversity of India: Hotspots & Protected Areas' },
                { id: 'species-conservation', title: 'Species in News & Conservation Projects' }
              ]
            },
            {
              id: 'environmental-issues', title: 'Environmental Issues',
              sub: [
                { id: 'climate-change', title: 'Climate Change, IPCC & Carbon Markets' },
                { id: 'pollution-waste', title: 'Pollution, Waste Management & EIA' }
              ]
            },
            {
              id: 'acts-policies-env', title: 'Acts, Policies & Institutions',
              sub: [
                { id: 'acts-conventions', title: 'Acts & International Conventions (CBD, UNFCCC, CITES)' },
                { id: 'institutions', title: 'Institutions: MoEFCC, CPCB, NGT, Wildlife Boards' }
              ]
            }
          ]
        },
        {
          id: 'science-tech', title: 'Science & Technology', tag: '8–12 Qs',
          sub: [
            {
              id: 'basic-science', title: 'Basic Science',
              sub: [
                { id: 'physics-chem-bio', title: 'Everyday Physics, Chemistry & Biology' }
              ]
            },
            {
              id: 'emerging-tech', title: 'Emerging Technologies',
              sub: [
                { id: 'biotech-health', title: 'Biotechnology & Health (vaccines, CRISPR)' },
                { id: 'space-missions', title: 'Space: Missions, ISRO & Satellites' },
                { id: 'defence-nuclear', title: 'Defence, Missiles & Nuclear Tech' },
                { id: 'ai-it', title: 'AI, IT, Semiconductors & Quantum' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'prelims-csat', stage: 'prelims',
      title: 'CSAT — Paper II (Qualifying)',
      short: 'CSAT',
      tag: '33% qualifying',
      summary: 'Aptitude paper: comprehension, reasoning, numeracy and decision-making. Needs 66/200 to qualify.',
      sub: [
        { id: 'comprehension', title: 'Reading Comprehension & Interpersonal Skills' },
        { id: 'logical-reasoning', title: 'Logical Reasoning & Analytical Ability' },
        { id: 'decision-making', title: 'Decision-Making & Problem Solving' },
        { id: 'numeracy', title: 'Basic Numeracy & Data Interpretation (Class X level)' }
      ]
    },

    /* ------------------------------------------------------------------ */
    /*  MAINS                                                              */
    /* ------------------------------------------------------------------ */
    {
      id: 'gs-1', stage: 'mains',
      title: 'General Studies I',
      short: 'GS 1',
      full: 'Indian Heritage & Culture, History and Geography of the World and Society',
      tag: '250 marks',
      summary: 'Heritage and culture, modern & world history, geography of India and the world, and Indian society.',
      sub: [
        { id: 'indian-heritage-culture', title: 'Indian Heritage & Culture', tag: '25% of paper' },
        { id: 'modern-history', title: 'Modern Indian History (mid-18th century onward)', tag: '25% of paper' },
        { id: 'world-history', title: 'World History (industrial revolution, world wars, redrawal of national boundaries)', tag: '15% of paper' },
        { id: 'indian-society', title: 'Indian Society (diversity, women, poverty, urbanisation)', tag: '15% of paper' },
        { id: 'physical-geography', title: 'Physical Geography: Geomorphology, Climatology, Oceanography', tag: '20% of paper' },
        { id: 'geography-world-india', title: 'Geography of India & World: Resources, Distribution, Mapping', tag: 'part of geography share' }
      ]
    },
    {
      id: 'gs-2', stage: 'mains',
      title: 'General Studies II',
      short: 'GS 2',
      full: 'Governance, Constitution, Polity, Social Justice and International Relations',
      tag: '250 marks',
      summary: 'Indian constitution, governance, social justice, welfare schemes, and India’s external relations.',
      sub: [
        { id: 'constitution-polity', title: 'Indian Constitution: features, amendments, comparisons' },
        { id: 'governance-administration', title: 'Governance & Administration: Parliament, Executive, Judiciary' },
        { id: 'social-justice', title: 'Social Justice: Welfare Schemes, Health, Education, HRD' },
        { id: 'international-relations', title: 'International Relations: Bilateral, Regional & Global Groupings' }
      ]
    },
    {
      id: 'gs-3', stage: 'mains',
      title: 'General Studies III',
      short: 'GS 3',
      full: 'Technology, Economic Development, Bio-diversity, Environment, Security and Disaster Management',
      tag: '250 marks',
      summary: 'Economy, science & technology, environment & biodiversity, internal security and disaster management.',
      sub: [
        { id: 'indian-economy', title: 'Indian Economy: growth, planning, resources, liberalisation' },
        { id: 'agriculture-food', title: 'Agriculture & Food Security: MSP, irrigation, marketing, subsidies' },
        { id: 'science-technology', title: 'Science & Technology: developments, indigenisation, IT' },
        { id: 'environment-biodiversity', title: 'Environment & Biodiversity: conservation, climate change' },
        { id: 'security-disaster', title: 'Internal Security & Disaster Management' }
      ]
    },
    {
      id: 'gs-4', stage: 'mains',
      title: 'General Studies IV',
      short: 'GS 4',
      full: 'Ethics, Integrity and Aptitude',
      tag: '250 marks',
      summary: 'Ethical reasoning, case studies, attitude, emotional intelligence and public service values.',
      sub: [
        { id: 'ethics-foundations', title: 'Ethics Foundations: Interface, Attitude, Aptitude & EI (study set)', tag: 'full 5-section set' },
        { id: 'governance-probity-case-studies', title: 'Governance, Probity & Case-Study Method (study set)', tag: 'full 5-section set' },
        { id: 'ethics-human-interface', title: 'Ethics & Human Interface: essence, determinants, dimensions' },
        { id: 'attitude', title: 'Attitude: content, structure, influence & moral attitudes' },
        { id: 'aptitude-foundations', title: 'Aptitude & Foundational Values: integrity, impartiality, non-partisanship' },
        { id: 'emotional-intelligence', title: 'Emotional Intelligence: concepts, utilities & application' },
        { id: 'moral-thinkers', title: 'Moral Thinkers & Philosophers (Indian & Western)' },
        { id: 'public-service-values', title: 'Public/Civil Service Values & Ethics in Public Administration' },
        { id: 'probity-governance', title: 'Probity in Governance: RTI, corruption, citizens’ charters' },
        { id: 'case-studies', title: 'Case Studies (classroom & exam case analysis)' }
      ]
    },
    {
      id: 'essay', stage: 'mains',
      title: 'Essay Paper',
      short: 'Essay',
      tag: '250 marks',
      summary: 'Two essays (1000–1200 words each) from a set of topics spanning philosophy, society, economy, science.',
      sub: [
        { id: 'essay-frameworks', title: 'Essay Frameworks: Introduction, Body & Conclusion Structures' },
        { id: 'essay-topics', title: 'Topic Bank: Society, Polity, Economy, Environment, Science, Ethics' },
        { id: 'essay-quotes', title: 'Quotes & Thinkers for Essays' },
        { id: 'essay-toppers', title: 'Toppers’ Essay Analysis' }
      ]
    },
    {
      id: 'optional-subjects', stage: 'mains',
      title: 'Optional Subjects',
      short: 'Optional',
      tag: '2 × 250 marks',
      summary: 'Choose one optional — the 5th/6th ranked optional subjects have a combined success rate of 20%+ in recent years.',
      sub: [
        { id: 'optional-sociology', title: 'Sociology', note: 'Most popular; scores well with structured preparation.' },
        { id: 'optional-public-administration', title: 'Public Administration' },
        { id: 'optional-history', title: 'History' },
        { id: 'optional-geography', title: 'Geography' },
        { id: 'optional-polity', title: 'Political Science & IR' },
        { id: 'optional-philosophy', title: 'Philosophy', note: 'Short syllabus; topper favourite.' },
        { id: 'optional-anthropology', title: 'Anthropology' },
        { id: 'optional-economics', title: 'Economics' },
        { id: 'optional-psychology', title: 'Psychology' }
      ]
    }
  ]
};

/* ------------------------------------------------------------------ */
/*  Content-section vocabulary (the 5 canonical branches)              */
/* ------------------------------------------------------------------ */
window.CONTENT_SECTIONS = [
  { id: 'notes',    title: 'Detailed Notes',     icon: '📘', desc: 'Chapter-wise, exam-oriented comprehensive notes', depth: 'deep' },
  { id: 'short',    title: 'Short Revision Notes', icon: '📝', desc: 'Condensed notes for quick revision cycles', depth: 'medium' },
  { id: 'bullets',  title: 'Key Bullet Points / Mindmaps', icon: '🧠', desc: 'Point-form facts and mindmap summaries', depth: 'quick' },
  { id: 'diagrams', title: 'Diagrams, Maps & Flowcharts', icon: '🗺️', desc: 'Visual learning aids and map practice', depth: 'visual' },
  { id: 'pyqs',     title: 'PYQs & Model Answers', icon: '📄', desc: 'Previous year questions with model answers', depth: 'practice' }
];

/* Build nested "nav" slugs, e.g. gs-1/modern-history/notes */
(function buildNav() {
  function walk(node, parentPath) {
    node.nav = parentPath ? parentPath + '/' + node.id : node.id;
    if (node.sub) node.sub.forEach(function (c) { walk(c, node.nav); });
  }
  window.SYLLABUS_DATA.papers.forEach(function (p) { walk(p, ''); });
  window.SYLLABUS_DATA.exam.prelims.nav = 'prelims';
  window.SYLLABUS_DATA.exam.mains.nav = 'mains';
})();
