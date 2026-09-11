import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSiteRecommendations } from '../lib/recommendations/recommendationEngine';
import { SEOReport, SeoRecommendationItem } from '../types';

function createMockReportWithIssues(url: string, issuesCount: number): SEOReport {
  return {
    id: `rep-${Math.random()}`,
    url,
    normalizedUrl: url,
    timestamp: new Date().toISOString(),
    durationMs: 200,
    scores: { overall: 65, onPage: 60, technical: 70, content: 65, links: 70, mobile: 80 },
    onPage: {
      title: 'Short',
      titleLength: 5,
      metaDescription: '',
      metaDescriptionLength: 0,
      canonicalUrl: url,
      isCanonicalMatch: true,
      robotsMeta: 'index, follow',
      viewport: 'width=device-width',
      language: 'en',
      hreflang: [],
      ogTags: {},
      twitterTags: {},
      wordCount: 150,
      readingTimeMinutes: 1,
      textToHtmlRatio: 8,
      headings: {
        items: [],
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        h4Count: 0,
        h5Count: 0,
        h6Count: 0,
        hasMissingH1: true,
        hasMultipleH1: false,
        hasSkippedLevels: false,
        issues: ['Missing H1 heading'],
      },
      paragraphsCount: 2,
      listsCount: 0,
      tablesCount: 0,
    },
    technical: {
      httpStatus: 200,
      isHttps: false, // HTTP issue
      isIndexable: true,
      responseTimeMs: 950,
      pageSizeBytes: 50000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'UTF-8',
      robotsAnalysis: { exists: false, url: '', status: 404, sitemaps: [], isBotAllowed: true, directivesCount: 0 },
      sitemapAnalysis: { exists: false, url: '', status: 404, totalUrls: 0, urlsSample: [], isIndex: false },
    },
    links: {
      totalLinks: 2,
      internalLinksCount: 1,
      externalLinksCount: 1,
      nofollowCount: 0,
      internalLinks: [],
      externalLinks: [],
      brokenLinks: [],
      internalExternalRatio: 1,
    },
    images: {
      totalImages: 3,
      withAlt: 0,
      missingAlt: 3,
      altCoverageRatio: 0,
      images: [
        { src: '/img1.png', alt: '', hasAlt: false, isDecorative: false, filename: 'img1.png' },
        { src: '/img2.png', alt: '', hasAlt: false, isDecorative: false, filename: 'img2.png' },
      ],
    },
    schemas: [],
    keywords: {
      all: [],
      primary: [],
      secondary: [],
      shortTail: [],
      longTail: [],
      related: [],
      questions: [],
      entities: [],
      clusters: [],
      opportunities: [],
      totalWords: 150,
      uniqueWords: 80,
    },
    tagExplorer: {
      totalElementsCount: 2,
      metadata: [],
      headings: [],
      social: [],
      content: [],
      links: [],
      images: [],
      structuredData: [],
    },
    contentContribution: {
      overallContributionScore: 50,
      sections: [],
      heatmap: [],
      strongestSection: 'None',
      weakestSection: 'All',
      summary: 'Thin content',
    },
    issues: [
      { id: '1', code: 'MISSING_H1', title: 'Missing H1 Heading', description: 'No H1 found', whyItMatters: 'H1 defines page topic', category: 'onpage', severity: 'CRITICAL', recommendation: 'Add an H1 heading.' },
      { id: '2', code: 'NO_HTTPS', title: 'Not Secure (HTTP)', description: 'Site serves on insecure HTTP', whyItMatters: 'HTTPS is a security signal', category: 'technical', severity: 'CRITICAL', recommendation: 'Migrate to HTTPS.' },
    ],
    externalSeoDisclaimer: 'Disclaimer',
    dataSourceDisclosures: {
      categoryA: 'Directly Extracted',
      categoryB: 'External Data Unavailable',
      categoryC: 'Private Data Unauthorized',
    },
  };
}

describe('SEO Recommendation Engine', () => {
  const reports = [
    createMockReportWithIssues('https://example.com/blog/thin-post', 2),
    createMockReportWithIssues('https://example.com/products/item', 2),
  ];

  test('generates categorized recommendations with priorities and quick wins', () => {
    const result = generateSiteRecommendations(reports);

    assert.ok(result.all.length > 0, 'Expected non-empty recommendations');
    assert.ok(Array.isArray(result.quickWins), 'Expected quickWins array');
    assert.ok(result.byCategory, 'Expected byCategory groupings');
    assert.ok(result.byPage, 'Expected byPage groupings');

    // Check priorities
    const priorities = new Set(result.all.map((r: SeoRecommendationItem) => r.priority));
    assert.ok(priorities.has('CRITICAL') || priorities.has('HIGH'), 'Expected high/critical priorities');

    // Check required recommendation fields
    for (const rec of result.all) {
      assert.ok(rec.id, 'Expected recommendation id');
      assert.ok(rec.title, 'Expected recommendation title');
      assert.ok(rec.affectedUrl, 'Expected affectedUrl');
      assert.ok(rec.category, 'Expected category');
      assert.ok(rec.impact, 'Expected impact explanation');
      assert.ok(rec.recommendedAction, 'Expected recommendedAction');
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(rec.effort), 'Expected valid effort level');
    }

    // Check quick wins
    for (const qw of result.quickWins) {
      assert.strictEqual(qw.quickWin, true);
    }
  });
});
