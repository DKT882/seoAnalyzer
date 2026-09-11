import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { generateExcelWorkbook } from '../lib/reports/xlsxExporter';
import { SEOReport } from '../types';

describe('Excel XLSX Multi-Sheet Exporter', () => {
  const dummyReport: SEOReport = {
    id: 'test-report-id',
    url: 'https://example.com/test',
    normalizedUrl: 'https://example.com/test',
    timestamp: new Date().toISOString(),
    durationMs: 340,
    scores: { overall: 88, onPage: 90, technical: 85, content: 89, links: 80, mobile: 95 },
    onPage: {
      title: 'Test Page Title',
      titleLength: 15,
      metaDescription: 'Test meta description.',
      metaDescriptionLength: 22,
      canonicalUrl: 'https://example.com/test',
      isCanonicalMatch: true,
      robotsMeta: 'index, follow',
      viewport: 'width=device-width',
      language: 'en',
      hreflang: [],
      ogTags: {},
      twitterTags: {},
      wordCount: 450,
      readingTimeMinutes: 2,
      textToHtmlRatio: 18,
      headings: {
        items: [{ level: 1, text: 'Test Heading' }],
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
      paragraphsCount: 4,
      listsCount: 1,
      tablesCount: 0,
    },
    technical: {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 120,
      pageSizeBytes: 15000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'UTF-8',
      robotsAnalysis: { exists: true, url: '', status: 200, sitemaps: [], isBotAllowed: true, directivesCount: 1 },
      sitemapAnalysis: { exists: true, url: '', status: 200, totalUrls: 5, urlsSample: [], isIndex: false },
    },
    links: {
      totalLinks: 2,
      internalLinksCount: 1,
      externalLinksCount: 1,
      nofollowCount: 0,
      internalLinks: [{ url: '/about', text: 'About', isInternal: true, isExternal: false, isNofollow: false }],
      externalLinks: [{ url: 'https://google.com', text: 'Google', isInternal: false, isExternal: true, isNofollow: false }],
      brokenLinks: [],
      internalExternalRatio: 1,
    },
    images: {
      totalImages: 1,
      withAlt: 1,
      missingAlt: 0,
      altCoverageRatio: 100,
      images: [{ src: '/test.jpg', alt: 'Test Image', hasAlt: true, isDecorative: false, filename: 'test.jpg' }],
    },
    schemas: [{ type: 'WebSite', rawJson: '{}', isValid: true }],
    keywords: {
      all: [
        {
          id: '1',
          keyword: 'test keyword',
          nGramType: '2-gram',
          category: 'primary',
          frequency: 3,
          density: 1.5,
          prominenceScore: 80,
          overallScore: 75,
          inTitle: true,
          inH1: true,
          inH2H6: false,
          inMeta: true,
          inUrl: true,
          inAnchor: false,
          inAlt: false,
          inBody: true,
        },
      ],
      primary: [],
      secondary: [],
      shortTail: [],
      longTail: [],
      related: [],
      questions: [],
      entities: [],
      clusters: [],
      opportunities: [],
      totalWords: 450,
      uniqueWords: 200,
    },
    tagExplorer: {
      totalElementsCount: 5,
      metadata: [],
      headings: [],
      social: [],
      content: [],
      links: [],
      images: [],
      structuredData: [],
    },
    contentContribution: {
      overallContributionScore: 82,
      sections: [],
      heatmap: [],
      strongestSection: 'Title',
      weakestSection: 'Schema',
      summary: 'Strong signals',
    },
    issues: [],
    externalSeoDisclaimer: 'Disclaimer',
    dataSourceDisclosures: {
      categoryA: 'Directly Extracted',
      categoryB: 'External Data Unavailable',
      categoryC: 'Private Data Unauthorized',
    },
  };

  test('generates valid multi-sheet XLSX buffer', () => {
    const buffer = generateExcelWorkbook(dummyReport);
    assert.ok(Buffer.isBuffer(buffer), 'Expected a Buffer result');
    assert.ok(buffer.length > 500, 'Expected non-empty binary workbook');

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    assert.ok(workbook.SheetNames.includes('1. Overview'), 'Expected Overview sheet');
    assert.ok(workbook.SheetNames.includes('2. All Keywords'), 'Expected Keywords sheet');
    assert.ok(workbook.SheetNames.includes('11. Content Contribution'), 'Expected Content Contribution sheet');
    assert.ok(workbook.SheetNames.includes('18. External SEO Data'), 'Expected External SEO Data sheet');
  });
});
