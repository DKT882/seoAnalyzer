import 'server-only';
import {
  SEOReport,
  SiteOverviewData,
  SiteKeywordItem,
  KeywordCannibalizationItem,
  ContentDuplicationItem,
  KeywordCategory,
} from '@/types';

export interface CrawlAggregationInput {
  domain: string;
  targetUrl: string;
  pages: SEOReport[];
  discoveredCount: number;
  analyzedCount: number;
  failedCount: number;
  skippedCount: number;
  maxPagesAllowed: number;
  robotsStatus?: {
    exists: boolean;
    url: string;
    allowedPagesCount: number;
    blockedPagesCount: number;
    sitemapSources: string[];
  };
}

/**
 * Calculates whole-website overview metrics, coverage, and aggregate SEO health scores.
 */
export function calculateSiteOverview(
  pagesOrInput: CrawlAggregationInput | SEOReport[],
  optionalDomain?: string,
  optionalDiscoveredCount?: number
): SiteOverviewData {
  let domain: string;
  let targetUrl: string;
  let pages: SEOReport[];
  let discoveredCount: number;
  let analyzedCount: number;
  let failedCount: number;
  let skippedCount: number;
  let maxPagesAllowed: number;
  let robotsStatus: CrawlAggregationInput['robotsStatus'];

  if (Array.isArray(pagesOrInput)) {
    pages = pagesOrInput;
    domain = optionalDomain || (pages[0] ? new URL(pages[0].url).hostname : 'example.com');
    targetUrl = pages[0]?.url || `https://${domain}`;
    discoveredCount = optionalDiscoveredCount || pages.length;
    analyzedCount = pages.length;
    failedCount = 0;
    skippedCount = 0;
    maxPagesAllowed = 500;
  } else {
    domain = pagesOrInput.domain;
    targetUrl = pagesOrInput.targetUrl;
    pages = pagesOrInput.pages;
    discoveredCount = pagesOrInput.discoveredCount;
    analyzedCount = pagesOrInput.analyzedCount;
    failedCount = pagesOrInput.failedCount;
    skippedCount = pagesOrInput.skippedCount;
    maxPagesAllowed = pagesOrInput.maxPagesAllowed;
    robotsStatus = pagesOrInput.robotsStatus;
  }

  if (pages.length === 0) {
    return {
      domain,
      targetUrl,
      timestamp: new Date().toISOString(),
      coverage: {
        pagesDiscovered: discoveredCount,
        pagesAnalyzed: 0,
        pagesFailed: failedCount,
        pagesSkipped: skippedCount,
        coverageRatio: 0,
        allowedByCrawlLimit: maxPagesAllowed,
      },
      seoScores: {
        averageOverall: 0,
        averageOnPage: 0,
        averageTechnical: 0,
        averageContent: 0,
        averageLinks: 0,
        bestPage: { url: targetUrl, score: 0, title: 'No pages analyzed' },
        weakestPage: { url: targetUrl, score: 0, title: 'No pages analyzed' },
        averageWordCount: 0,
        averageKeywordCount: 0,
      },
      siteStructure: {
        totalInternalLinks: 0,
        totalExternalLinks: 0,
        totalImages: 0,
        missingAltImagesCount: 0,
        totalSchemas: 0,
        canonicalIssuesCount: 0,
        metaIssuesCount: 0,
        headingIssuesCount: 0,
      },
      robotsStatus: robotsStatus || {
        exists: false,
        url: '',
        allowedPagesCount: 0,
        blockedPagesCount: 0,
        sitemapSources: [],
      },
    };
  }

  // 1. Calculate SEO averages
  let totalOverall = 0;
  let totalOnPage = 0;
  let totalTechnical = 0;
  let totalContent = 0;
  let totalLinks = 0;
  let totalWordCount = 0;
  let totalKeywordsCount = 0;

  let bestPage = { url: pages[0].url, score: pages[0].scores.overall, title: pages[0].onPage.title || 'Untitled' };
  let weakestPage = { url: pages[0].url, score: pages[0].scores.overall, title: pages[0].onPage.title || 'Untitled' };

  let totalInternalLinks = 0;
  let totalExternalLinks = 0;
  let totalImages = 0;
  let missingAltImagesCount = 0;
  let totalSchemas = 0;
  let canonicalIssuesCount = 0;
  let metaIssuesCount = 0;
  let headingIssuesCount = 0;

  for (const page of pages) {
    totalOverall += page.scores.overall;
    totalOnPage += page.scores.onPage;
    totalTechnical += page.scores.technical;
    totalContent += page.scores.content;
    totalLinks += page.scores.links;
    totalWordCount += page.onPage.wordCount;
    totalKeywordsCount += page.keywords.all.length;

    if (page.scores.overall > bestPage.score) {
      bestPage = { url: page.url, score: page.scores.overall, title: page.onPage.title || 'Untitled' };
    }
    if (page.scores.overall < weakestPage.score) {
      weakestPage = { url: page.url, score: page.scores.overall, title: page.onPage.title || 'Untitled' };
    }

    totalInternalLinks += page.links.internalLinksCount;
    totalExternalLinks += page.links.externalLinksCount;
    totalImages += page.images.totalImages;
    missingAltImagesCount += page.images.missingAlt;
    totalSchemas += page.schemas.length;

    if (!page.onPage.isCanonicalMatch || !page.onPage.canonicalUrl) {
      canonicalIssuesCount++;
    }
    if (!page.onPage.title || !page.onPage.metaDescription) {
      metaIssuesCount++;
    }
    if (page.onPage.headings.hasMissingH1 || page.onPage.headings.hasMultipleH1) {
      headingIssuesCount++;
    }
  }

  const count = pages.length;
  const coverageRatio = discoveredCount > 0 ? Math.min(100, Math.round((analyzedCount / discoveredCount) * 100)) : 100;

  return {
    domain,
    targetUrl,
    timestamp: new Date().toISOString(),
    coverage: {
      pagesDiscovered: discoveredCount,
      pagesAnalyzed: analyzedCount,
      pagesFailed: failedCount,
      pagesSkipped: skippedCount,
      coverageRatio,
      allowedByCrawlLimit: maxPagesAllowed,
    },
    seoScores: {
      averageOverall: Math.round(totalOverall / count),
      averageOnPage: Math.round(totalOnPage / count),
      averageTechnical: Math.round(totalTechnical / count),
      averageContent: Math.round(totalContent / count),
      averageLinks: Math.round(totalLinks / count),
      bestPage,
      weakestPage,
      averageWordCount: Math.round(totalWordCount / count),
      averageKeywordCount: Math.round(totalKeywordsCount / count),
    },
    siteStructure: {
      totalInternalLinks,
      totalExternalLinks,
      totalImages,
      missingAltImagesCount,
      totalSchemas,
      canonicalIssuesCount,
      metaIssuesCount,
      headingIssuesCount,
    },
    robotsStatus: robotsStatus || {
      exists: false,
      url: '',
      allowedPagesCount: analyzedCount,
      blockedPagesCount: skippedCount,
      sitemapSources: [],
    },
  };
}

/**
 * Aggregates keywords across all analyzed pages into Site Keyword Intelligence.
 */
export function aggregateSiteKeywords(pages: SEOReport[]): SiteKeywordItem[] {
  const keywordMap = new Map<
    string,
    {
      keyword: string;
      occurrences: number;
      pagesMap: Map<string, { url: string; title: string; score: number }>;
      category: KeywordCategory;
      topicCluster: string;
      scores: number[];
      inTitleCount: number;
      inH1Count: number;
      inMetaCount: number;
      inBodyCount: number;
    }
  >();

  for (const page of pages) {
    for (const kw of page.keywords.all) {
      const lower = kw.keyword.toLowerCase().trim();
      if (!lower) continue;

      let entry = keywordMap.get(lower);
      if (!entry) {
        entry = {
          keyword: lower,
          occurrences: 0,
          pagesMap: new Map(),
          category: kw.category,
          topicCluster: kw.topicCluster || 'General Topic',
          scores: [],
          inTitleCount: 0,
          inH1Count: 0,
          inMetaCount: 0,
          inBodyCount: 0,
        };
        keywordMap.set(lower, entry);
      }

      entry.occurrences += kw.frequency;
      entry.scores.push(kw.overallScore);
      if (kw.inTitle) entry.inTitleCount++;
      if (kw.inH1) entry.inH1Count++;
      if (kw.inMeta) entry.inMetaCount++;
      if (kw.inBody) entry.inBodyCount++;

      if (!entry.pagesMap.has(page.url)) {
        entry.pagesMap.set(page.url, {
          url: page.url,
          title: page.onPage.title || 'Untitled',
          score: kw.overallScore,
        });
      }
    }
  }

  const result: SiteKeywordItem[] = [];
  const totalPages = Math.max(1, pages.length);

  for (const entry of Array.from(keywordMap.values())) {
    const avgScore = Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length);
    const pagesUsingIt = Array.from(entry.pagesMap.keys());
    const primaryPages = Array.from(entry.pagesMap.values()).sort((a, b) => b.score - a.score);

    // Calculate site-wide opportunity signal (0-100)
    // High opportunity: High relevance/score across pages but not yet fully placed in title/H1 on all pages
    const placementRatio = (entry.inTitleCount + entry.inH1Count) / Math.max(1, entry.pagesMap.size);
    const coverageRatio = entry.pagesMap.size / totalPages;
    const opportunityScore = Math.min(
      100,
      Math.max(15, Math.round(avgScore * 0.5 + (1 - placementRatio) * 30 + (1 - coverageRatio) * 20))
    );

    result.push({
      keyword: entry.keyword,
      occurrences: entry.occurrences,
      pagesCount: entry.pagesMap.size,
      pagesUsingIt,
      primaryPages: primaryPages.slice(0, 5),
      averageScore: avgScore,
      category: entry.category,
      topicCluster: entry.topicCluster,
      placementCoverage: {
        inTitleCount: entry.inTitleCount,
        inH1Count: entry.inH1Count,
        inMetaCount: entry.inMetaCount,
        inBodyCount: entry.inBodyCount,
      },
      opportunityScore,
    });
  }

  // Sort by occurrences and average score
  return result.sort((a, b) => b.occurrences * b.averageScore - a.occurrences * a.averageScore);
}

/**
 * Detects potential keyword cannibalization when multiple pages strongly target the same keyword.
 */
export function detectKeywordCannibalization(pages: SEOReport[]): KeywordCannibalizationItem[] {
  if (pages.length < 2) return [];

  // Track keywords with strong intent across pages (e.g. In Title, in H1, or score > 65)
  const keywordTargetMap = new Map<
    string,
    Array<{
      url: string;
      title: string;
      relevanceScore: number;
      inTitle: boolean;
      inH1: boolean;
      inBody: boolean;
      frequency: number;
    }>
  >();

  for (const page of pages) {
    for (const kw of page.keywords.all) {
      const lower = kw.keyword.toLowerCase().trim();
      // Only check meaningful keywords (2+ words or primary/secondary)
      if (lower.split(/\s+/).length < 2 && kw.category !== 'primary') continue;

      // Candidate for strong targeting
      const isStronglyTargeted = kw.inTitle || kw.inH1 || kw.overallScore >= 65;
      if (!isStronglyTargeted) continue;

      let list = keywordTargetMap.get(lower);
      if (!list) {
        list = [];
        keywordTargetMap.set(lower, list);
      }

      list.push({
        url: page.url,
        title: page.onPage.title || 'Untitled',
        relevanceScore: kw.overallScore,
        inTitle: kw.inTitle,
        inH1: kw.inH1,
        inBody: kw.inBody,
        frequency: kw.frequency,
      });
    }
  }

  const cannibalizationItems: KeywordCannibalizationItem[] = [];

  for (const [kw, competingPages] of Array.from(keywordTargetMap.entries())) {
    if (competingPages.length >= 2) {
      // Determine risk level
      const titleMatches = competingPages.filter((p) => p.inTitle).length;
      const h1Matches = competingPages.filter((p) => p.inH1).length;

      let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (titleMatches >= 2 || (titleMatches >= 1 && h1Matches >= 1)) {
        riskLevel = 'HIGH';
      } else if (competingPages.length >= 3 || h1Matches >= 2) {
        riskLevel = 'MEDIUM';
      }

      cannibalizationItems.push({
        id: `cannibal-${kw.replace(/[^a-z0-9]/g, '-')}`,
        keyword: kw,
        riskLevel,
        competingPages: competingPages.sort((a, b) => b.relevanceScore - a.relevanceScore),
        reason: `${competingPages.length} pages are strongly competing for "${kw}" across titles, headings, and primary content.`,
        recommendedAction:
          riskLevel === 'HIGH'
            ? `Choose one primary authoritative page for "${kw}", consolidate overlapping content or use canonical tags, and differentiate supporting pages with distinct long-tail keywords.`
            : `Differentiate secondary pages by retargeting them toward specific sub-topics or use internal links pointing to your main target page.`,
      });
    }
  }

  return cannibalizationItems.sort((a, b) => {
    const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel] || b.competingPages.length - a.competingPages.length;
  });
}

/**
 * Detects potential content duplication / highly similar content across pages using Jaccard token similarity.
 */
export function detectContentDuplication(pages: SEOReport[]): ContentDuplicationItem[] {
  if (pages.length < 2) return [];

  const duplicationItems: ContentDuplicationItem[] = [];
  const tokenSets = new Map<string, Set<string>>();

  for (const page of pages) {
    const tokens = new Set<string>();
    // Collect 2-grams and 3-grams as shingles
    for (const kw of page.keywords.all) {
      if (kw.frequency >= 2) {
        tokens.add(kw.keyword.toLowerCase().trim());
      }
    }
    // Add heading texts
    for (const h of page.onPage.headings.items) {
      tokens.add(h.text.toLowerCase().trim());
    }
    tokenSets.set(page.url, tokens);
  }

  // Pairwise comparison
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const pageA = pages[i];
      const pageB = pages[j];

      const setA = tokenSets.get(pageA.url) || new Set();
      const setB = tokenSets.get(pageB.url) || new Set();

      if (setA.size === 0 || setB.size === 0) continue;

      let intersectionCount = 0;
      const sharedTopics: string[] = [];

      for (const token of Array.from(setA)) {
        if (setB.has(token)) {
          intersectionCount++;
          if (sharedTopics.length < 6) {
            sharedTopics.push(token);
          }
        }
      }

      const unionCount = setA.size + setB.size - intersectionCount;
      const similarity = unionCount > 0 ? (intersectionCount / unionCount) : 0;
      const similarityScore = Math.round(similarity * 100);

      // Flag pairs with similarity >= 55%
      if (similarityScore >= 55) {
        duplicationItems.push({
          id: `dup-${i}-${j}`,
          pageA: { url: pageA.url, title: pageA.onPage.title || 'Untitled', wordCount: pageA.onPage.wordCount },
          pageB: { url: pageB.url, title: pageB.onPage.title || 'Untitled', wordCount: pageB.onPage.wordCount },
          similarityScore,
          sharedTopics,
          recommendedAction:
            similarityScore >= 80
              ? `High content similarity detected. Consider merging these pages into a single comprehensive guide or establishing a 301 redirect / canonical tag.`
              : `Substantial content overlap detected. Differentiate unique value propositions, add page-specific examples, or restructure shared sections.`,
        });
      }
    }
  }

  return duplicationItems.sort((a, b) => b.similarityScore - a.similarityScore);
}
