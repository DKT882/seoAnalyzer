export const EXTERNAL_SEO_DISCLAIMER =
  'Notice: External search engine metrics (e.g., historical Google Search Console impressions, external Ahrefs/Semrush domain rating backlinks) require private domain authorization or external subscription API access and cannot be obtained from public webpage crawling. All scores presented here are derived strictly from deterministic on-page HTML, technical HTTP headers, robots.txt, sitemap.xml, and schema analysis.';

export const DATA_SOURCE_DISCLOSURES = {
  categoryA:
    'Category A (Directly Extracted): Deterministically parsed from crawled webpage HTML, DOM structure, HTTP response headers, robots.txt, and sitemap.xml.',
  categoryB:
    'Category B (External SEO Data): External SEO data unavailable — Requires configured SEO data provider (DataForSEO, Semrush, Ahrefs).',
  categoryC:
    'Category C (Private Owner Data): Requires verified Google Search Console or Google Analytics owner authorization.',
};

export const QUESTION_PREFIXES = [
  'what',
  'how',
  'why',
  'where',
  'when',
  'who',
  'which',
  'can',
  'does',
  'do',
  'is',
  'are',
  'should',
  'will',
  'would',
  'could',
  'best way to',
  'how to',
  'guide to',
];

export const CONTENT_SECTION_WEIGHTS = {
  TITLE: 0.18,
  H1: 0.16,
  INTRODUCTION: 0.14,
  H2_H3: 0.14,
  BODY_PARAGRAPHS: 0.14,
  SCHEMA: 0.08,
  LISTS: 0.05,
  INTERNAL_LINKS: 0.05,
  IMAGE_ALT: 0.04,
  TABLES: 0.02,
} as const;

export const ISSUE_CODES = {
  // Critical
  HTTP_ERROR: 'HTTP_ERROR',
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  NOINDEX_TAG_FOUND: 'NOINDEX_TAG_FOUND',
  ROBOTS_DISALLOWED: 'ROBOTS_DISALLOWED',
  TITLE_MISSING: 'TITLE_MISSING',
  H1_MISSING: 'H1_MISSING',
  INSECURE_HTTP: 'INSECURE_HTTP',

  // Warning
  TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
  TITLE_TOO_LONG: 'TITLE_TOO_LONG',
  META_DESC_MISSING: 'META_DESC_MISSING',
  META_DESC_TOO_SHORT: 'META_DESC_TOO_SHORT',
  META_DESC_TOO_LONG: 'META_DESC_TOO_LONG',
  H1_MULTIPLE: 'H1_MULTIPLE',
  HEADING_LEVEL_SKIPPED: 'HEADING_LEVEL_SKIPPED',
  CANONICAL_MISSING: 'CANONICAL_MISSING',
  CANONICAL_MISMATCH: 'CANONICAL_MISMATCH',
  VIEWPORT_MISSING: 'VIEWPORT_MISSING',
  IMAGES_MISSING_ALT: 'IMAGES_MISSING_ALT',
  LOW_WORD_COUNT: 'LOW_WORD_COUNT',
  LOW_TEXT_HTML_RATIO: 'LOW_TEXT_HTML_RATIO',
  BROKEN_LINKS_DETECTED: 'BROKEN_LINKS_DETECTED',
  SITEMAP_MISSING: 'SITEMAP_MISSING',
  ROBOTS_MISSING: 'ROBOTS_MISSING',

  // Recommendation
  SCHEMA_MISSING: 'SCHEMA_MISSING',
  OPENGRAPH_MISSING: 'OPENGRAPH_MISSING',
  TWITTER_CARD_MISSING: 'TWITTER_CARD_MISSING',
  SLOW_RESPONSE_TIME: 'SLOW_RESPONSE_TIME',
  KEYWORD_STUFFING_RISK: 'KEYWORD_STUFFING_RISK',
} as const;

export const SCORING_WEIGHTS = {
  ON_PAGE: 0.30,
  TECHNICAL: 0.25,
  CONTENT_KEYWORDS: 0.25,
  LINKS_IMAGES: 0.10,
  MOBILE_UX: 0.10,
} as const;

export const KEYWORD_LOCATION_WEIGHTS = {
  TITLE: 25,
  H1: 20,
  URL_SLUG: 15,
  META_DESCRIPTION: 10,
  H2_H3: 10,
  BODY_CONTENT: 10,
  ANCHOR_TEXT: 5,
  IMAGE_ALT: 5,
} as const;
