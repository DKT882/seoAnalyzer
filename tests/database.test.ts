import { describe, it } from 'node:test';
import assert from 'node:assert';
import { jobRepository } from '../lib/db/repository';
import { SEOReport } from '../types';

describe('SQLite Database Persistence Layer', () => {
  let createdJobId: string;

  it('creates an analysis job with pending status', () => {
    const job = jobRepository.createJob('https://example.com/test', 'https://example.com/test');
    createdJobId = job.id;

    assert.strictEqual(typeof job.id, 'string');
    assert.strictEqual(job.status, 'pending');
    assert.strictEqual(job.url, 'https://example.com/test');
  });

  it('updates job status and saves complete SEO report', () => {
    const mockReport: SEOReport = {
      id: createdJobId,
      url: 'https://example.com/test',
      normalizedUrl: 'https://example.com/test',
      timestamp: new Date().toISOString(),
      durationMs: 420,
      scores: {
        overall: 88,
        onPage: 90,
        technical: 95,
        content: 85,
        links: 80,
        mobile: 90,
      },
      onPage: {
        title: 'Test SEO Title',
        titleLength: 14,
        metaDescription: 'Test meta description content for testing.',
        metaDescriptionLength: 42,
        canonicalUrl: 'https://example.com/test',
        isCanonicalMatch: true,
        robotsMeta: 'index, follow',
        viewport: 'width=device-width',
        language: 'en',
        hreflang: [],
        ogTags: {},
        twitterTags: {},
        wordCount: 450,
        readingTimeMinutes: 2.2,
        textToHtmlRatio: 18.5,
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
        responseTimeMs: 250,
        pageSizeBytes: 15420,
        redirectCount: 0,
        redirectChain: ['https://example.com/test'],
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: {
          exists: true,
          url: 'https://example.com/robots.txt',
          status: 200,
          sitemaps: [],
          isBotAllowed: true,
          directivesCount: 2,
        },
        sitemapAnalysis: {
          exists: true,
          url: 'https://example.com/sitemap.xml',
          status: 200,
          totalUrls: 5,
          urlsSample: [],
          isIndex: false,
        },
      },
      links: {
        totalLinks: 3,
        internalLinksCount: 2,
        externalLinksCount: 1,
        nofollowCount: 0,
        internalLinks: [],
        externalLinks: [],
        brokenLinks: [],
        internalExternalRatio: 2,
      },
      images: {
        totalImages: 1,
        withAlt: 1,
        missingAlt: 0,
        altCoverageRatio: 100,
        images: [],
      },
      schemas: [],
      keywords: {
        all: [
          {
            id: 'kw-1',
            keyword: 'test seo',
            nGramType: '2-gram',
            category: 'primary',
            frequency: 4,
            density: 1.8,
            prominenceScore: 15,
            overallScore: 85,
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
        uniqueWords: 210,
      },
      issues: [
        {
          id: 'iss-1',
          code: 'TITLE_OPTIMAL',
          category: 'onpage',
          severity: 'GOOD',
          title: 'Title is Good',
          description: 'Title is well optimized.',
          whyItMatters: 'Important for SEO.',
          recommendation: 'None.',
        },
      ],
      tagExplorer: {
        totalElementsCount: 1,
        metadata: [],
        headings: [],
        social: [],
        content: [],
        links: [],
        images: [],
        structuredData: [],
      },
      contentContribution: {
        overallContributionScore: 85,
        sections: [],
        heatmap: [],
        strongestSection: 'body',
        weakestSection: 'aside',
        summary: 'Content contribution analysis summary',
      },
      dataSourceDisclosures: {
        categoryA: 'Extracted directly from on-page content',
        categoryB: 'External SEO data unavailable without provider API keys',
        categoryC: 'Requires private Google Search Console / GA authorization',
      },
      externalSeoDisclaimer: 'Disclaimer text.',
    };

    jobRepository.saveReport(createdJobId, mockReport);

    const retrieved = jobRepository.getJobById(createdJobId);
    assert.strictEqual(retrieved !== null, true);
    assert.strictEqual(retrieved?.status, 'completed');
    assert.strictEqual(retrieved?.report?.scores.overall, 88);
    assert.strictEqual(retrieved?.report?.keywords.all[0].keyword, 'test seo');
  });

  it('retrieves recent analysis history from database', () => {
    const history = jobRepository.getHistory(10);
    assert.strictEqual(Array.isArray(history), true);
    assert.strictEqual(history.length > 0, true);
    assert.strictEqual(history[0].id, createdJobId);
  });
});
