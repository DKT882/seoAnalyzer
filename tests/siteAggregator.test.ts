import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSiteOverview,
  aggregateSiteKeywords,
  detectKeywordCannibalization,
  detectContentDuplication,
} from '../lib/reports/siteAggregator';
import { SEOReport } from '../types';

function createMockReport(url: string, title: string, wordCount: number, score: number, keywords: string[]): SEOReport {
  return {
    id: `rep-${Math.random()}`,
    url,
    normalizedUrl: url,
    timestamp: new Date().toISOString(),
    durationMs: 200,
    scores: {
      overall: score,
      onPage: score,
      technical: score,
      content: score,
      links: score,
      mobile: score,
    },
    onPage: {
      title,
      titleLength: title.length,
      metaDescription: `Meta description for ${title}`,
      metaDescriptionLength: 30,
      canonicalUrl: url,
      isCanonicalMatch: true,
      robotsMeta: 'index, follow',
      viewport: 'width=device-width',
      language: 'en',
      hreflang: [],
      ogTags: {},
      twitterTags: {},
      wordCount,
      readingTimeMinutes: Math.ceil(wordCount / 200),
      textToHtmlRatio: 25,
      headings: {
        items: [{ level: 1, text: title }],
        h1Count: 1,
        h2Count: 0,
        h3Count: 0,
        h4Count: 0,
        h5Count: 0,
        h6Count: 0,
        hasMissingH1: false,
        hasMultipleH1: false,
        hasSkippedLevels: false,
        issues: [],
      },
      paragraphsCount: 5,
      listsCount: 1,
      tablesCount: 0,
    },
    technical: {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 150,
      pageSizeBytes: 25000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'UTF-8',
      robotsAnalysis: { exists: true, url: '', status: 200, sitemaps: [], isBotAllowed: true, directivesCount: 1 },
      sitemapAnalysis: { exists: true, url: '', status: 200, totalUrls: 10, urlsSample: [], isIndex: false },
    },
    links: {
      totalLinks: 5,
      internalLinksCount: 4,
      externalLinksCount: 1,
      nofollowCount: 0,
      internalLinks: [{ url: '/about', text: 'About', isInternal: true, isExternal: false, isNofollow: false }],
      externalLinks: [{ url: 'https://external.com', text: 'Ext', isInternal: false, isExternal: true, isNofollow: false }],
      brokenLinks: [],
      internalExternalRatio: 4,
    },
    images: {
      totalImages: 2,
      withAlt: 2,
      missingAlt: 0,
      altCoverageRatio: 100,
      images: [],
    },
    schemas: [],
    keywords: {
      all: keywords.map((kw, i) => ({
        id: `kw-${i}`,
        keyword: kw,
        nGramType: '1-gram',
        category: 'primary',
        frequency: 5,
        density: 2.0,
        prominenceScore: 85,
        overallScore: 80,
        inTitle: true,
        inH1: true,
        inH2H6: false,
        inMeta: true,
        inUrl: true,
        inAnchor: false,
        inAlt: false,
        inBody: true,
      })),
      primary: [],
      secondary: [],
      shortTail: [],
      longTail: [],
      related: [],
      questions: [],
      entities: [],
      clusters: [],
      opportunities: [],
      totalWords: wordCount,
      uniqueWords: 150,
    },
    tagExplorer: {
      totalElementsCount: 10,
      metadata: [],
      headings: [],
      social: [],
      content: [],
      links: [],
      images: [],
      structuredData: [],
    },
    contentContribution: {
      overallContributionScore: score,
      sections: [],
      heatmap: [],
      strongestSection: 'Title',
      weakestSection: 'Schema',
      summary: 'Good signals',
    },
    issues: [],
    externalSeoDisclaimer: 'Disclaimer',
    dataSourceDisclosures: {
      categoryA: 'Directly Extracted',
      categoryB: 'External Data Unavailable',
      categoryC: 'Private Data Unauthorized',
    },
  };
}

describe('Site Aggregator Module', () => {
  const reports = [
    createMockReport('https://example.com/page-1', 'SEO Analysis Guide', 800, 90, ['seo analysis', 'keyword research']),
    createMockReport('https://example.com/page-2', 'SEO Analysis Tutorial', 600, 70, ['seo analysis', 'backlinks']),
    createMockReport('https://example.com/page-3', 'Content Strategy Basics', 1200, 80, ['content strategy', 'copywriting']),
  ];

  test('calculateSiteOverview aggregates scores and discovers extremes', () => {
    const overview = calculateSiteOverview(reports, 'example.com', 5);
    assert.strictEqual(overview.domain, 'example.com');
    assert.strictEqual(overview.coverage.pagesAnalyzed, 3);
    assert.strictEqual(overview.coverage.pagesDiscovered, 5);
    assert.strictEqual(overview.seoScores.averageOverall, 80);
    assert.strictEqual(overview.seoScores.bestPage.url, 'https://example.com/page-1');
    assert.strictEqual(overview.seoScores.weakestPage.url, 'https://example.com/page-2');
    assert.strictEqual(overview.siteStructure.totalInternalLinks, 12);
  });

  test('aggregateSiteKeywords computes site-wide frequency and coverage', () => {
    const siteKeywords = aggregateSiteKeywords(reports);
    assert.ok(siteKeywords.length >= 3);
    const seoAnalysisKw = siteKeywords.find((k) => k.keyword === 'seo analysis');
    assert.ok(seoAnalysisKw, 'Expected "seo analysis" to be found');
    assert.strictEqual(seoAnalysisKw.pagesCount, 2);
    assert.strictEqual(seoAnalysisKw.occurrences, 10);
  });

  test('detectKeywordCannibalization identifies overlapping target terms', () => {
    const cannibalization = detectKeywordCannibalization(reports);
    assert.ok(cannibalization.length >= 1);
    const item = cannibalization.find((c) => c.keyword === 'seo analysis');
    assert.ok(item, 'Expected "seo analysis" cannibalization item');
    assert.strictEqual(item.competingPages.length, 2);
    assert.ok(item.recommendedAction.length > 0);
  });

  test('detectContentDuplication calculates similarity signals across page pairs', () => {
    const dups = detectContentDuplication(reports);
    assert.ok(Array.isArray(dups));
    // Verify structure
    if (dups.length > 0) {
      assert.ok(dups[0].similarityScore >= 0 && dups[0].similarityScore <= 100);
      assert.ok(dups[0].recommendedAction.length > 0);
    }
  });
});
