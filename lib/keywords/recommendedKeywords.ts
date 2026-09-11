/**
 * SEO Intel Pro - Contextual & Semantic SEO Keyword Recommendation Engine
 *
 * Generates genuine recommended SEO keywords based on semantic topic structure,
 * missing subtopics, page-type awareness, and real textual evidence.
 *
 * Prevents generic template-modifier spam (e.g. blind "checklist", "guide", "tools" appending)
 * and returns zero recommendations for low-content or demo pages (e.g. example.com).
 *
 * Strictly adheres to Category A/B/C honesty: does not fabricate search volume or KD.
 */

import { KeywordItem, KeywordSource, SearchIntent } from '@/types';
import { isArtifactOrGarbage } from '../nlp/artifactFilter';
import { isStopWord } from '../nlp/stopwords';
import crypto from 'node:crypto';

export type PageType =
  | 'HOMEPAGE'
  | 'ARTICLE_OR_BLOG'
  | 'PRODUCT'
  | 'SERVICE'
  | 'DOCUMENTATION'
  | 'LANDING_PAGE'
  | 'ABOUT_OR_CONTACT'
  | 'LOW_CONTENT_OR_STUB';

export interface RecommendationInput {
  primaryKeyword: string;
  extractedKeywords: KeywordItem[];
  title: string;
  h1: string;
  metaDescription: string;
  headingsList?: string[];
  pageUrl: string;
  totalWords?: number;
  uniqueWords?: number;
  competitorKeywords?: string[];
}

export interface RecommendationOutput {
  items: KeywordItem[];
  notice?: string;
}

/**
 * Classifies the page type based on URL path, metadata, headings, and word count.
 */
export function classifyPageType(input: RecommendationInput): PageType {
  const totalWords = input.totalWords ?? 0;
  const uniqueWords = input.uniqueWords ?? 0;

  // 1. Low-content or stub page (e.g. example.com, parked domain, placeholder)
  if (totalWords < 80 || uniqueWords < 25) {
    return 'LOW_CONTENT_OR_STUB';
  }

  let pathname = '';
  try {
    pathname = new URL(input.pageUrl).pathname.toLowerCase();
  } catch {
    pathname = input.pageUrl.toLowerCase();
  }

  const titleLower = (input.title || '').toLowerCase();
  const h1Lower = (input.h1 || '').toLowerCase();
  const headingsCombined = (input.headingsList || []).join(' ').toLowerCase();

  // 2. About or Contact
  if (
    pathname.includes('/about') ||
    pathname.includes('/contact') ||
    pathname.includes('/team') ||
    titleLower.includes('about us') ||
    titleLower.includes('contact us')
  ) {
    return 'ABOUT_OR_CONTACT';
  }

  // 3. Documentation or API
  if (
    pathname.includes('/docs') ||
    pathname.includes('/documentation') ||
    pathname.includes('/api') ||
    titleLower.includes('documentation') ||
    titleLower.includes('api reference')
  ) {
    return 'DOCUMENTATION';
  }

  // 4. Product or E-commerce
  if (
    pathname.includes('/product') ||
    pathname.includes('/item') ||
    pathname.includes('/p/') ||
    pathname.includes('/shop') ||
    titleLower.includes('buy ') ||
    titleLower.includes('price') ||
    headingsCombined.includes('add to cart') ||
    headingsCombined.includes('specifications')
  ) {
    return 'PRODUCT';
  }

  // 5. Service
  if (
    pathname.includes('/service') ||
    pathname.includes('/services') ||
    pathname.includes('/solutions') ||
    pathname.includes('/consulting') ||
    titleLower.includes('services') ||
    titleLower.includes('solutions') ||
    headingsCombined.includes('our services') ||
    headingsCombined.includes('what we do')
  ) {
    return 'SERVICE';
  }

  // 6. Article or Blog
  if (
    pathname.includes('/blog') ||
    pathname.includes('/article') ||
    pathname.includes('/post') ||
    pathname.includes('/guide') ||
    pathname.includes('/news') ||
    totalWords >= 350
  ) {
    return 'ARTICLE_OR_BLOG';
  }

  // 7. Homepage
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    return 'HOMEPAGE';
  }

  return 'LANDING_PAGE';
}

// Domain Semantic Knowledge Base: maps core technical & digital topics to their essential missing subtopics
const TOPIC_SUBTOPIC_GRAPH: Record<
  string,
  Array<{ subtopic: string; intent: SearchIntent; reason: string }>
> = {
  'technical seo': [
    { subtopic: 'canonical tags', intent: 'Informational', reason: 'Canonicalization is a primary technical SEO indexation requirement' },
    { subtopic: 'structured data schema', intent: 'Informational', reason: 'Schema markup enhances search engine entity comprehension and rich snippets' },
    { subtopic: 'xml sitemap optimization', intent: 'Informational', reason: 'XML sitemaps guide search crawlers to critical priority pages' },
    { subtopic: 'core web vitals performance', intent: 'Informational', reason: 'Core Web Vitals are a confirmed Google page experience ranking signal' },
    { subtopic: 'crawl budget optimization', intent: 'Informational', reason: 'Crawl efficiency ensures search engines discover deep site architecture' },
    { subtopic: 'hreflang international seo', intent: 'Informational', reason: 'Hreflang tags prevent duplicate content across multi-regional websites' },
    { subtopic: 'robots txt directives', intent: 'Informational', reason: 'Robots.txt manages crawler access to sensitive or duplicate parameters' },
    { subtopic: 'server redirect chains', intent: 'Informational', reason: 'Eliminating redirect hops improves crawl efficiency and page speed' },
  ],
  'technical seo audit': [
    { subtopic: 'canonical tags audit', intent: 'Informational', reason: 'Auditing canonical self-referencing and cross-domain tags' },
    { subtopic: 'structured data validation', intent: 'Informational', reason: 'Validating JSON-LD schema syntax against Schema.org standards' },
    { subtopic: 'crawlability issue detection', intent: 'Informational', reason: 'Diagnosing HTTP status errors, orphan pages, and crawl loops' },
    { subtopic: 'core web vitals audit', intent: 'Informational', reason: 'Auditing LCP, INP, and CLS performance metrics' },
    { subtopic: 'xml sitemap validation', intent: 'Informational', reason: 'Checking sitemap freshness and indexable URL accuracy' },
    { subtopic: 'internal linking audit', intent: 'Informational', reason: 'Analyzing anchor text distribution and PageRank flow' },
  ],
  'keyword research': [
    { subtopic: 'search intent analysis', intent: 'Informational', reason: 'Classifying informational, commercial, and transactional query intent' },
    { subtopic: 'keyword difficulty evaluation', intent: 'Informational', reason: 'Assessing competitor backlink strength and domain authority' },
    { subtopic: 'long tail keyword strategy', intent: 'Informational', reason: 'Capturing targeted low-competition search queries' },
    { subtopic: 'search volume trends', intent: 'Informational', reason: 'Evaluating seasonal fluctuations and rising search interest' },
    { subtopic: 'competitor keyword gap', intent: 'Commercial', reason: 'Identifying lucrative keywords competitors rank for' },
    { subtopic: 'serp feature opportunities', intent: 'Informational', reason: 'Targeting featured snippets, People Also Ask, and video carousels' },
  ],
  'on page seo': [
    { subtopic: 'title tag optimization', intent: 'Informational', reason: 'Crafting high-CTR descriptive title tags with primary keywords' },
    { subtopic: 'heading tag hierarchy', intent: 'Informational', reason: 'Structuring content logically with sequential H1, H2, and H3 elements' },
    { subtopic: 'meta description copywriting', intent: 'Informational', reason: 'Writing compelling summaries to maximize search SERP click-through rates' },
    { subtopic: 'image alt text optimization', intent: 'Informational', reason: 'Improving accessibility and image search indexability' },
    { subtopic: 'internal linking structure', intent: 'Informational', reason: 'Distributing internal link equity to high-value priority pages' },
    { subtopic: 'content depth and comprehensiveness', intent: 'Informational', reason: 'Answering all relevant user search intent sub-questions' },
  ],
  'web development': [
    { subtopic: 'responsive design optimization', intent: 'Informational', reason: 'Ensuring seamless cross-device viewport compatibility' },
    { subtopic: 'server side rendering', intent: 'Informational', reason: 'Accelerating initial page load and search crawler readability' },
    { subtopic: 'code splitting and bundle size', intent: 'Informational', reason: 'Minimizing unused JavaScript to improve first contentful paint' },
    { subtopic: 'api performance optimization', intent: 'Informational', reason: 'Reducing server response latency and endpoint payload size' },
  ],
  'cybersecurity': [
    { subtopic: 'ssl tls certificate configuration', intent: 'Informational', reason: 'Enforcing modern HTTPS encryption and HSTS headers' },
    { subtopic: 'vulnerability scanning', intent: 'Commercial', reason: 'Proactively discovering security vulnerabilities in web applications' },
    { subtopic: 'access control policy', intent: 'Informational', reason: 'Restricting unauthorized administrative access and privilege escalation' },
    { subtopic: 'security headers implementation', intent: 'Informational', reason: 'Configuring CSP, X-Frame-Options, and anti-sniffing headers' },
  ],
  'ecommerce': [
    { subtopic: 'product schema markup', intent: 'Informational', reason: 'Enabling rich price, availability, and review snippets in search' },
    { subtopic: 'faceted navigation canonicalization', intent: 'Informational', reason: 'Preventing indexation bloat from dynamic filter URLs' },
    { subtopic: 'checkout conversion rate optimization', intent: 'Commercial', reason: 'Minimizing cart abandonment and friction during checkout' },
    { subtopic: 'customer review management', intent: 'Commercial', reason: 'Building trust and social proof on high-intent product pages' },
  ],
};

/**
 * Calculates a strict Recommendation Quality Score (0-100).
 * Threshold: 65.
 */
export function calculateRecommendationQualityScore(
  phrase: string,
  options: {
    primaryTopic: string;
    hasContextualEvidence: boolean;
    hasContentGapEvidence: boolean;
    isCompetitorGap: boolean;
    pageType: PageType;
    isGenericModifierOnly?: boolean;
  }
): number {
  if (!phrase || typeof phrase !== 'string') return 0;
  const p = phrase.toLowerCase().trim();

  if (p.length < 3 || isArtifactOrGarbage(p)) return 0;

  const words = p.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0 || wordCount > 6) return 0;

  // Base score
  let score = 55;

  // 1. Topical Overlap & Semantic Grounding (0-25)
  const primaryWords = options.primaryTopic.toLowerCase().split(/\s+/).filter(Boolean);
  const sharedWordsCount = words.filter((w) => primaryWords.includes(w)).length;

  if (sharedWordsCount >= 2) {
    score += 20;
  } else if (sharedWordsCount === 1) {
    score += 10;
  } else if (options.isCompetitorGap || options.hasContentGapEvidence) {
    score += 15;
  } else {
    score -= 15;
  }

  // 2. Evidence bonus (0-20)
  if (options.hasContextualEvidence) {
    score += 15;
  }
  if (options.hasContentGapEvidence) {
    score += 15;
  }
  if (options.isCompetitorGap) {
    score += 15;
  }

  // 3. Page Type Compatibility (0-10)
  if (options.pageType === 'ARTICLE_OR_BLOG' || options.pageType === 'SERVICE' || options.pageType === 'PRODUCT') {
    score += 10;
  } else if (options.pageType === 'LOW_CONTENT_OR_STUB') {
    score -= 50; // Heavy penalty for low content
  }

  // 4. Strict Generic Modifier Penalty
  if (options.isGenericModifierOnly) {
    score -= 40; // Rejects blind "topic + checklist" without evidence
  }

  // 5. Natural Phrase Length & Word Structure
  if (wordCount >= 2 && wordCount <= 4) {
    score += 5;
  }

  return Math.max(0, Math.min(98, Math.round(score)));
}

/**
 * Main Entry Point: Generates context-grounded, defensible SEO recommendations.
 */
export function generateRecommendedKeywords(input: RecommendationInput): KeywordItem[] {
  const pageType = classifyPageType(input);

  // RULE 11 & 12: Low-content or demo pages must NOT manufacture recommendations.
  if (pageType === 'LOW_CONTENT_OR_STUB') {
    return [];
  }

  const baseTopic = (input.primaryKeyword || input.h1 || input.title || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim();

  if (!baseTopic || isArtifactOrGarbage(baseTopic) || baseTopic.length < 3) {
    return [];
  }

  const existingKeywordsLower = new Set(
    input.extractedKeywords.map((k) => k.keyword.toLowerCase().trim())
  );

  const headingsText = (input.headingsList || []).join(' ').toLowerCase();
  const titleLower = (input.title || '').toLowerCase();
  const h1Lower = (input.h1 || '').toLowerCase();
  const metaLower = (input.metaDescription || '').toLowerCase();
  const allPageContext = `${titleLower} ${h1Lower} ${headingsText} ${metaLower}`;

  const recommendedItems: KeywordItem[] = [];
  const seenPhrases = new Set<string>();

  // -------------------------------------------------------------
  // STRATEGY 1: Domain Knowledge Subtopic Gaps (Real Missing Subtopics)
  // -------------------------------------------------------------
  // Match baseTopic against our domain semantic knowledge graph
  let matchingKnowledgeSubtopics: Array<{ subtopic: string; intent: SearchIntent; reason: string }> = [];

  for (const [topicKey, subtopics] of Object.entries(TOPIC_SUBTOPIC_GRAPH)) {
    if (baseTopic.includes(topicKey) || topicKey.includes(baseTopic)) {
      matchingKnowledgeSubtopics = subtopics;
      break;
    }
  }

  for (const item of matchingKnowledgeSubtopics) {
    const subtopic = item.subtopic;
    // Check if subtopic is already covered in page headings or high-frequency extracted keywords
    const isCoveredInHeadings = headingsText.includes(subtopic) || titleLower.includes(subtopic);
    const isCoveredInKeywords = existingKeywordsLower.has(subtopic);

    // If missing from headings/title, this is a legitimate, explainable content gap
    if (!isCoveredInHeadings) {
      const phrase = subtopic;
      if (!seenPhrases.has(phrase) && !isArtifactOrGarbage(phrase)) {
        seenPhrases.add(phrase);

        const quality = calculateRecommendationQualityScore(phrase, {
          primaryTopic: baseTopic,
          hasContextualEvidence: isCoveredInKeywords,
          hasContentGapEvidence: true,
          isCompetitorGap: false,
          pageType,
        });

        if (quality >= 65) {
          recommendedItems.push({
            id: `rec-${crypto.randomUUID().slice(0, 8)}`,
            keyword: phrase,
            nGramType: phrase.split(' ').length <= 2 ? '2-gram' : '3-gram',
            category: 'recommended',
            source: 'RECOMMENDED',
            frequency: isCoveredInKeywords ? 1 : 0,
            density: 0,
            prominenceScore: 0,
            overallScore: 88,
            qualityScore: quality,
            inTitle: false,
            inH1: false,
            inH2H6: false,
            inMeta: false,
            inUrl: false,
            inAnchor: false,
            inAlt: false,
            inBody: isCoveredInKeywords,
            wordCount: phrase.split(' ').length,
            searchIntent: item.intent,
            semanticCategory: 'Content Gap',
            topicCluster: baseTopic,
            confidence: 90,
            reason: item.reason,
            evidence: [
              `Primary page topic: "${baseTopic}"`,
              `Core subtopic "${subtopic}" is missing from main headings (<title>, <h1>)`,
              `Page type: ${pageType.replace(/_/g, ' ')}`,
            ],
            isQuestion: false,
            externalSearchVolume: 'External SEO data unavailable',
            externalDifficulty: 'Requires SEO data provider',
            externalCpc: 'External SEO data unavailable',
            externalIntent: 'Requires SEO data provider',
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Dynamic Heading & Entity Synthesis (Arbitrary Topics)
  // -------------------------------------------------------------
  // For topics not in static dictionary, synthesize subtopic combinations from secondary extracted concepts
  const secondaryConcepts = input.extractedKeywords
    .filter(
      (k) =>
        k.overallScore >= 35 &&
        k.keyword.toLowerCase() !== baseTopic &&
        k.wordCount &&
        k.wordCount >= 2 &&
        k.wordCount <= 3 &&
        !isStopWord(k.keyword) &&
        !isArtifactOrGarbage(k.keyword)
    )
    .slice(0, 4);

  for (const sc of secondaryConcepts) {
    const scPhrase = sc.keyword.toLowerCase();
    // If this secondary concept appears in body but is missing from title and H1, recommend targeted query
    const missingFromTitleAndH1 = !sc.inTitle && !sc.inH1;

    if (missingFromTitleAndH1) {
      let candidatePhrase = '';
      if (!scPhrase.includes(baseTopic) && !baseTopic.includes(scPhrase)) {
        candidatePhrase = `${baseTopic} ${scPhrase}`;
      } else {
        candidatePhrase = scPhrase;
      }

      const words = candidatePhrase.split(' ');
      if (words.length <= 4 && !seenPhrases.has(candidatePhrase) && !isArtifactOrGarbage(candidatePhrase)) {
        seenPhrases.add(candidatePhrase);

        const quality = calculateRecommendationQualityScore(candidatePhrase, {
          primaryTopic: baseTopic,
          hasContextualEvidence: true,
          hasContentGapEvidence: true,
          isCompetitorGap: false,
          pageType,
        });

        if (quality >= 65) {
          recommendedItems.push({
            id: `rec-${crypto.randomUUID().slice(0, 8)}`,
            keyword: candidatePhrase,
            nGramType: words.length <= 2 ? '2-gram' : words.length === 3 ? '3-gram' : 'long-tail',
            category: 'recommended',
            source: 'RECOMMENDED',
            frequency: sc.frequency,
            density: sc.density,
            prominenceScore: sc.prominenceScore,
            overallScore: 82,
            qualityScore: quality,
            inTitle: false,
            inH1: false,
            inH2H6: sc.inH2H6,
            inMeta: sc.inMeta,
            inUrl: sc.inUrl,
            inAnchor: sc.inAnchor,
            inAlt: sc.inAlt,
            inBody: true,
            wordCount: words.length,
            searchIntent: 'Informational',
            semanticCategory: 'Supporting Subtopic',
            topicCluster: baseTopic,
            confidence: 85,
            reason: `Prominent on-page concept "${sc.keyword}" has high semantic relevance but lacks title/H1 prominence.`,
            evidence: [
              `Appears ${sc.frequency}x in page body`,
              `Missing from <title> and <h1> primary heading positions`,
              `Semantically reinforces primary topic "${baseTopic}"`,
            ],
            isQuestion: false,
            externalSearchVolume: 'External SEO data unavailable',
            externalDifficulty: 'Requires SEO data provider',
            externalCpc: 'External SEO data unavailable',
            externalIntent: 'Requires SEO data provider',
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Context-Gated Actionable Queries (Only With Textual Evidence!)
  // -------------------------------------------------------------
  // "checklist" ONLY if page actually mentions checklists, steps, or procedures
  if (allPageContext.includes('checklist') || allPageContext.includes('steps') || allPageContext.includes('audit step')) {
    const checklistPhrase = `${baseTopic} checklist`;
    if (!seenPhrases.has(checklistPhrase) && !isArtifactOrGarbage(checklistPhrase)) {
      seenPhrases.add(checklistPhrase);
      recommendedItems.push({
        id: `rec-${crypto.randomUUID().slice(0, 8)}`,
        keyword: checklistPhrase,
        nGramType: 'long-tail',
        category: 'recommended',
        source: 'RECOMMENDED',
        frequency: 0,
        density: 0,
        prominenceScore: 0,
        overallScore: 85,
        qualityScore: 88,
        inTitle: titleLower.includes('checklist'),
        inH1: h1Lower.includes('checklist'),
        inH2H6: headingsText.includes('checklist'),
        inMeta: metaLower.includes('checklist'),
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: false,
        wordCount: checklistPhrase.split(' ').length,
        searchIntent: 'Informational',
        semanticCategory: 'Contextual Query',
        topicCluster: baseTopic,
        confidence: 88,
        reason: 'Page text explicitly discusses checklist procedures; highly relevant actionable search target.',
        evidence: [
          `Textual evidence: "checklist / steps" identified in page content`,
          `High-intent procedural variation for "${baseTopic}"`,
        ],
        isQuestion: false,
        externalSearchVolume: 'External SEO data unavailable',
        externalDifficulty: 'Requires SEO data provider',
        externalCpc: 'External SEO data unavailable',
        externalIntent: 'Requires SEO data provider',
      });
    }
  }

  // "tools" ONLY if page actually discusses tools, software, or crawler utilities
  if (allPageContext.includes('tool') || allPageContext.includes('software') || allPageContext.includes('crawler')) {
    const toolsPhrase = `${baseTopic} tools`;
    if (!seenPhrases.has(toolsPhrase) && !isArtifactOrGarbage(toolsPhrase)) {
      seenPhrases.add(toolsPhrase);
      recommendedItems.push({
        id: `rec-${crypto.randomUUID().slice(0, 8)}`,
        keyword: toolsPhrase,
        nGramType: 'long-tail',
        category: 'recommended',
        source: 'RECOMMENDED',
        frequency: 0,
        density: 0,
        prominenceScore: 0,
        overallScore: 84,
        qualityScore: 85,
        inTitle: titleLower.includes('tool'),
        inH1: h1Lower.includes('tool'),
        inH2H6: headingsText.includes('tool'),
        inMeta: metaLower.includes('tool'),
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: false,
        wordCount: toolsPhrase.split(' ').length,
        searchIntent: 'Commercial',
        semanticCategory: 'Contextual Query',
        topicCluster: baseTopic,
        confidence: 86,
        reason: 'Page references tooling and software; commercial investigation opportunity.',
        evidence: [
          `Textual evidence: "tools / software" mentioned in page context`,
          `Commercial investigation search query for "${baseTopic}"`,
        ],
        isQuestion: false,
        externalSearchVolume: 'External SEO data unavailable',
        externalDifficulty: 'Requires SEO data provider',
        externalCpc: 'External SEO data unavailable',
        externalIntent: 'Requires SEO data provider',
      });
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 4: Competitor Content Gap Opportunities (When Available)
  // -------------------------------------------------------------
  if (input.competitorKeywords && input.competitorKeywords.length > 0) {
    for (const compKw of input.competitorKeywords) {
      const compLower = compKw.toLowerCase().trim();
      if (
        !existingKeywordsLower.has(compLower) &&
        !seenPhrases.has(compLower) &&
        !isArtifactOrGarbage(compLower)
      ) {
        seenPhrases.add(compLower);
        recommendedItems.push({
          id: `rec-${crypto.randomUUID().slice(0, 8)}`,
          keyword: compLower,
          nGramType: compLower.split(' ').length <= 2 ? '2-gram' : '3-gram',
          category: 'recommended',
          source: 'COMPETITOR_GAP',
          frequency: 0,
          density: 0,
          prominenceScore: 0,
          overallScore: 85,
          qualityScore: 86,
          inTitle: false,
          inH1: false,
          inH2H6: false,
          inMeta: false,
          inUrl: false,
          inAnchor: false,
          inAlt: false,
          inBody: false,
          wordCount: compLower.split(' ').length,
          searchIntent: 'Informational',
          semanticCategory: 'Competitor Gap',
          topicCluster: baseTopic,
          confidence: 85,
          reason: `Competitor Content Gap: Successfully targeted by ranking competitors but missing from your page.`,
          evidence: [
            `Covered by competitor analysis pages`,
            `Missing from current page content`,
          ],
          isQuestion: false,
          externalSearchVolume: 'External SEO data unavailable',
          externalDifficulty: 'Requires SEO data provider',
          externalCpc: 'External SEO data unavailable',
          externalIntent: 'Requires SEO data provider',
        });
      }
    }
  }

  // Sort recommendations deterministically by qualityScore descending, then keyword alphabetically
  recommendedItems.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0) || a.keyword.localeCompare(b.keyword));

  return recommendedItems.slice(0, 10);
}
