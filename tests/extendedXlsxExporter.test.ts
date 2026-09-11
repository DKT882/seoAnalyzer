import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { generateWebsiteExcelWorkbook } from '../lib/reports/xlsxExporter';
import { WebsiteCrawlReport } from '../types';

describe('Extended Website XLSX 28-Sheet Exporter', () => {
  const dummyCrawlReport: WebsiteCrawlReport = {
    id: 'crawl-test-id',
    domain: 'example.com',
    startUrl: 'https://example.com',
    timestamp: new Date().toISOString(),
    durationMs: 1500,
    crawlDurationMs: 1500,
    maxPagesLimit: 10,
    status: 'completed',
    overview: {
      domain: 'example.com',
      targetUrl: 'https://example.com',
      timestamp: new Date().toISOString(),
      coverage: {
        pagesDiscovered: 2,
        pagesAnalyzed: 2,
        pagesSkipped: 0,
        pagesFailed: 0,
        coverageRatio: 100,
        allowedByCrawlLimit: 10,
      },
      seoScores: {
        averageOverall: 85,
        averageOnPage: 88,
        averageTechnical: 90,
        averageContent: 82,
        averageLinks: 80,
        averageWordCount: 800,
        averageKeywordCount: 20,
        bestPage: { url: 'https://example.com/p1', score: 90, title: 'Page 1' },
        weakestPage: { url: 'https://example.com/p2', score: 80, title: 'Page 2' },
      },
      siteStructure: {
        totalInternalLinks: 10,
        totalExternalLinks: 4,
        totalImages: 6,
        missingAltImagesCount: 1,
        totalSchemas: 2,
        canonicalIssuesCount: 0,
        metaIssuesCount: 0,
        headingIssuesCount: 0,
      },
      robotsStatus: {
        exists: true,
        url: 'https://example.com/robots.txt',
        allowedPagesCount: 2,
        blockedPagesCount: 0,
        sitemapSources: [],
      },
    },
    pages: [
      {
        id: 'p-1',
        url: 'https://example.com/p1',
        title: 'Page 1',
        h1: 'Page 1 H1',
        overallScore: 90,
        onPageScore: 90,
        technicalScore: 90,
        contentScore: 90,
        linksScore: 90,
        wordCount: 1000,
        keywordsCount: 15,
        isIndexable: true,
        statusCode: 200,
        responseTimeMs: 120,
        issuesCount: 0,
      },
      {
        id: 'p-2',
        url: 'https://example.com/p2',
        title: 'Page 2',
        h1: 'Page 2 H1',
        overallScore: 80,
        onPageScore: 80,
        technicalScore: 80,
        contentScore: 80,
        linksScore: 80,
        wordCount: 600,
        keywordsCount: 8,
        isIndexable: true,
        statusCode: 200,
        responseTimeMs: 150,
        issuesCount: 1,
      },
    ],
    pageReports: {},
    siteKeywords: [
      {
        keyword: 'seo tools',
        occurrences: 8,
        totalOccurrences: 8,
        pagesCount: 2,
        pagesUsingIt: ['https://example.com/p1', 'https://example.com/p2'],
        primaryPages: [{ url: 'https://example.com/p1', title: 'Page 1', score: 90 }],
        averageScore: 85,
        averageProminence: 85,
        averageDensity: 1.5,
        topPageUrl: 'https://example.com/p1',
        siteCoveragePercent: 100,
        category: 'primary',
        topicCluster: 'Core Tools',
        placementCoverage: { inTitleCount: 2, inH1Count: 1, inMetaCount: 2, inBodyCount: 2 },
        opportunityScore: 85,
      },
    ],
    cannibalization: [
      {
        id: 'can-1',
        keyword: 'seo tools',
        riskLevel: 'HIGH',
        competingPages: [
          { url: 'https://example.com/p1', title: 'Page 1', relevanceScore: 85, inTitle: true, inH1: true, inBody: true, frequency: 5 },
          { url: 'https://example.com/p2', title: 'Page 2', relevanceScore: 80, inTitle: true, inH1: false, inBody: true, frequency: 3 },
        ],
        reason: 'Both pages target seo tools heavily in title and headings.',
        recommendedAction: 'Consolidate target keywords.',
      },
    ],
    contentDuplication: [
      {
        id: 'dup-1',
        pageA: { url: 'https://example.com/p1', title: 'Page 1', wordCount: 1000 },
        pageB: { url: 'https://example.com/p2', title: 'Page 2', wordCount: 600 },
        similarityScore: 45,
        sharedTopics: ['seo tools'],
        recommendedAction: 'Differentiate content sections.',
      },
    ],
    recommendations: {
      all: [
        {
          id: 'rec-1',
          priority: 'HIGH',
          category: 'ON_PAGE',
          title: 'Optimize Title Tags',
          affectedUrl: 'https://example.com/p2',
          reason: 'Title tag could be improved',
          impact: 'Improves SERP CTR',
          recommendedAction: 'Add secondary keywords to title',
          effort: 'LOW',
          confidence: 'HIGH',
          quickWin: true,
        },
      ],
      quickWins: [],
      byCategory: { ON_PAGE: [] },
      byPage: { 'https://example.com/p2': [] },
    },
    keywordStrategy: {
      primaryKeyword: 'seo tools',
      topicCoverageScore: 80,
      topicCoverageMethodology: 'Deterministic lexical match',
      keywords: [
        {
          id: 'k-1',
          keyword: 'seo tools',
          category: 'primary',
          relationshipToPrimary: 'Exact match core entity',
          estimatedIntent: 'Commercial',
          targetAudience: 'Marketers',
          topicCluster: 'Core Tools',
          currentWebsiteCoverage: 100,
          internalOpportunityScore: 85,
          placements: [{ location: 'H1', suggestion: 'Include in primary heading', naturalUsageNote: 'Keep concise' }],
          reason: 'High site relevance',
        },
      ],
      clusters: [
        { name: 'Core Tools', keywords: ['seo tools'], averageScore: 85, totalFrequency: 8 },
      ],
      briefs: [
        {
          id: 'b-1',
          primaryKeyword: 'seo tools',
          estimatedSearchIntent: 'Commercial',
          suggestedH1: 'Best SEO Tools for 2026',
          suggestedH2s: ['Introduction to SEO Tools', 'Key Features to Look For'],
          suggestedH3s: ['Audit capabilities', 'Rank tracking'],
          secondaryKeywords: ['keyword rank tracker', 'seo audit tool'],
          supportingKeywords: ['analysis', 'search engine ranking'],
          questionsToAnswer: ['What is the best SEO tool?'],
          entitiesToCover: ['Search Engine Optimization', 'Google Search Console'],
          internalLinksToAdd: [{ anchorText: 'SEO guide', targetUrl: 'https://example.com/p1', reason: 'Context' }],
          contentGaps: ['Add pricing comparisons'],
          recommendedSections: ['Comparison table', 'Pricing'],
          technicalImprovements: ['Ensure fast loading speed'],
        },
      ],
    },
    contentStrategy: {
      strongTopics: [{ topic: 'SEO Tools', coverageScore: 85, pagesCount: 2, topKeywords: ['seo tools'] }],
      weakTopics: [{ topic: 'Technical SEO', coverageScore: 40, pagesCount: 1, missingAspects: ['Needs schema guide'] }],
      missingTopics: [
        { topic: 'Local SEO', relevanceScore: 80, reason: 'High search volume', suggestedKeywords: ['local seo guide'] },
        { topic: 'Link Building', relevanceScore: 75, reason: 'Core pillar missing', suggestedKeywords: ['backlinks guide'] },
      ],
      newPageOpportunities: [
        {
          id: 'npo-1',
          suggestedTitle: 'Complete Guide to Technical SEO',
          primaryTopic: 'Technical SEO',
          supportingKeywords: ['technical audit', 'crawl budget'],
          suggestedInternalLinks: ['https://example.com/p1'],
          expectedRelevance: 'HIGH',
          reason: 'High search volume topic missing on site',
        },
      ],
      topicCoverageScore: 75,
      topicCoverageMethodology: 'Clustered TF-IDF coverage',
    },
    briefs: [],
  };

  test('generates valid 28-sheet website crawl Excel workbook', () => {
    const buffer = generateWebsiteExcelWorkbook(dummyCrawlReport);
    assert.ok(Buffer.isBuffer(buffer), 'Expected a Buffer result');
    assert.ok(buffer.length > 500, 'Expected non-empty binary workbook');

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    assert.strictEqual(workbook.SheetNames.length, 28, 'Expected exactly 28 sheets in website workbook');

    const expectedSheets = [
      '1. Overview',
      '2. All Keywords',
      '3. Primary Keywords',
      '4. Secondary Keywords',
      '5. Short Tail',
      '6. Long Tail',
      '7. Opportunities',
      '8. Competitors',
      '9. Keyword Gap',
      '10. Content Gap',
      '11. Content Contribution',
      '12. Technical SEO',
      '13. Tags & Metadata',
      '14. Links',
      '15. Images',
      '16. Schema',
      '17. Recommendations',
      '18. External SEO Data',
      '19. Website Pages',
      '20. Site Keywords',
      '21. Keyword Strategy',
      '22. Supporting Keywords',
      '23. Keyword Opportunities',
      '24. Keyword Clusters',
      '25. SEO Recommendations',
      '26. Content Strategy',
      '27. Cannibalization',
      '28. Duplicate Content Signals',
    ];

    for (const sheetName of expectedSheets) {
      assert.ok(workbook.SheetNames.includes(sheetName), `Expected sheet "${sheetName}" to exist`);
    }
  });
});
