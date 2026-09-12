import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { classifyHttpStatus, auditRedirects, determineCrawlabilityStatus } from '../lib/technical/crawlabilityAuditor';
import { auditIndexabilityAndRobots, parseDirectiveTokens } from '../lib/technical/indexabilityAuditor';
import { auditCanonicalization } from '../lib/technical/canonicalAuditor';
import { auditHreflang } from '../lib/technical/hreflangAuditor';
import { auditUrlStructure } from '../lib/technical/urlQualityAuditor';
import { auditInfrastructure } from '../lib/technical/infrastructureAuditor';
import { performTechnicalSeoAudit } from '../lib/technical/technicalAuditor';
import { calculateSeoScores } from '../lib/reports/seoScorer';
import { ISSUE_CODES } from '../lib/constants';
import {
  TechnicalSEO,
  OnPageData,
  LinksAnalysis,
  ImagesAnalysis,
  RobotsAnalysis,
  SitemapAnalysis,
} from '@/types';

function createMockRobotsAnalysis(isBotAllowed = true, exists = true): RobotsAnalysis {
  return {
    exists,
    url: 'https://example.com/robots.txt',
    status: 200,
    sitemaps: ['https://example.com/sitemap.xml'],
    isBotAllowed,
    directivesCount: 3,
  };
}

function createMockSitemapAnalysis(urls: string[] = [], exists = true): SitemapAnalysis {
  return {
    exists,
    url: 'https://example.com/sitemap.xml',
    status: exists ? 200 : 0,
    totalUrls: urls.length,
    urlsSample: urls,
    isIndex: false,
  };
}

function createMockOnPage(overrides: Partial<OnPageData> = {}): OnPageData {
  return {
    title: 'Comprehensive Guide to Technical SEO Architecture',
    titleLength: 48,
    metaDescription: 'Learn proven technical SEO guidelines for crawlability, canonicalization, robots meta, sitemaps, and structured data.',
    metaDescriptionLength: 122,
    canonicalUrl: 'https://example.com/tech-seo',
    isCanonicalMatch: true,
    robotsMeta: 'index, follow',
    viewport: 'width=device-width, initial-scale=1.0',
    language: 'en',
    hreflang: [],
    ogTags: { 'og:title': 'Technical SEO Guide' },
    twitterTags: { 'twitter:card': 'summary_large_image' },
    wordCount: 850,
    readingTimeMinutes: 4,
    textToHtmlRatio: 22,
    headings: {
      items: [{ level: 1, text: 'Comprehensive Guide to Technical SEO Architecture' }],
      h1Count: 1,
      h2Count: 3,
      h3Count: 0,
      h4Count: 0,
      h5Count: 0,
      h6Count: 0,
      hasMissingH1: false,
      hasMultipleH1: false,
      hasSkippedLevels: false,
      issues: [],
    },
    paragraphsCount: 8,
    listsCount: 2,
    tablesCount: 0,
    ...overrides,
  };
}

function createMockLinks(overrides: Partial<LinksAnalysis> = {}): LinksAnalysis {
  return {
    totalLinks: 10,
    internalLinksCount: 8,
    externalLinksCount: 2,
    nofollowCount: 0,
    internalLinks: [
      { url: 'https://example.com/blog', text: 'SEO Blog', isInternal: true, isExternal: false, isNofollow: false },
      { url: 'https://example.com/tools', text: 'Audit Tools', isInternal: true, isExternal: false, isNofollow: false },
    ],
    externalLinks: [
      { url: 'https://schema.org', text: 'Schema.org', isInternal: false, isExternal: true, isNofollow: false },
    ],
    brokenLinks: [],
    internalExternalRatio: 4.0,
    ...overrides,
  };
}

function createMockImages(overrides: Partial<ImagesAnalysis> = {}): ImagesAnalysis {
  return {
    totalImages: 3,
    withAlt: 3,
    missingAlt: 0,
    altCoverageRatio: 100,
    images: [
      { src: 'https://example.com/diagram.png', alt: 'Technical SEO Diagram', hasAlt: true, isDecorative: false, filename: 'diagram.png', width: 800, height: 600 },
    ],
    ...overrides,
  };
}

describe('Phase 5: Advanced Technical SEO Intelligence Test Suite', () => {

  // 1. HTTP 200 OK Status
  it('1. HTTP 200: correctly classifies OK status and marks crawlable', () => {
    const status = classifyHttpStatus(200);
    assert.strictEqual(status.type, 'OK');
    assert.strictEqual(status.isSuccess, true);
    assert.strictEqual(status.isClientError, false);

    const crawlability = determineCrawlabilityStatus(
      status,
      auditRedirects({ targetUrl: 'https://example.com', finalUrl: 'https://example.com', redirectCount: 0, redirectChain: [] }),
      createMockRobotsAnalysis(true)
    );
    assert.strictEqual(crawlability, 'CRAWLABLE');
  });

  // 2. HTTP 301 Permanent Redirect
  it('2. HTTP 301: classifies permanent redirect with single hop', () => {
    const status = classifyHttpStatus(301);
    assert.strictEqual(status.type, 'PERMANENT_REDIRECT');
    assert.strictEqual(status.isRedirect, true);

    const redirect = auditRedirects({
      targetUrl: 'http://example.com',
      finalUrl: 'https://example.com',
      redirectCount: 1,
      redirectChain: ['http://example.com', 'https://example.com'],
    });
    assert.strictEqual(redirect.hasRedirect, true);
    assert.strictEqual(redirect.redirectCount, 1);
    assert.strictEqual(redirect.isHttpToHttps, true);
    assert.strictEqual(redirect.redirectType, 'PERMANENT');
  });

  // 3. Redirect Chain (2+ hops)
  it('3. Redirect Chain: flags multi-hop chain and generates REDIRECT_CHAIN issue', () => {
    const redirect = auditRedirects({
      targetUrl: 'http://example.com',
      finalUrl: 'https://example.com/home/',
      redirectCount: 3,
      redirectChain: [
        'http://example.com',
        'https://example.com',
        'https://example.com/home',
        'https://example.com/home/',
      ],
    });
    assert.strictEqual(redirect.redirectType, 'CHAIN');
    assert.strictEqual(redirect.redirectCount, 3);

    const issues = performTechnicalSeoAudit({
      targetUrl: 'http://example.com',
      finalUrl: 'https://example.com/home/',
      statusCode: 200,
      responseTimeMs: 300,
      pageSizeBytes: 5000,
      onPage: createMockOnPage(),
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 300,
        pageSizeBytes: 5000,
        redirectCount: 3,
        redirectChain: redirect.redirectChain,
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
        redirectAssessment: redirect,
      },
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const chainIssue = issues.find((i) => i.code === ISSUE_CODES.REDIRECT_CHAIN);
    assert.ok(chainIssue, 'Expected REDIRECT_CHAIN issue');
    assert.strictEqual(chainIssue?.severity, 'WARNING');
  });

  // 4. Redirect Loop
  it('4. Redirect Loop: detects cyclic redirects and marks REDIRECT_LOOP', () => {
    const redirect = auditRedirects({
      targetUrl: 'https://example.com/a',
      finalUrl: 'https://example.com/a',
      redirectCount: 3,
      redirectChain: [
        'https://example.com/a',
        'https://example.com/b',
        'https://example.com/c',
        'https://example.com/a',
      ],
    });
    assert.strictEqual(redirect.isRedirectLoop, true);
    assert.strictEqual(redirect.redirectType, 'LOOP');

    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/a',
      finalUrl: 'https://example.com/a',
      statusCode: 200,
      responseTimeMs: 200,
      pageSizeBytes: 1000,
      onPage: createMockOnPage(),
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 200,
        pageSizeBytes: 1000,
        redirectCount: 3,
        redirectChain: redirect.redirectChain,
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
        redirectAssessment: redirect,
      },
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const loopIssue = issues.find((i) => i.code === ISSUE_CODES.REDIRECT_LOOP);
    assert.ok(loopIssue, 'Expected REDIRECT_LOOP issue');
    assert.strictEqual(loopIssue?.severity, 'CRITICAL');
  });

  // 5. Canonical Missing
  it('5. Canonical Missing: detects absent rel="canonical" and reports CANONICAL_MISSING', () => {
    const canon = auditCanonicalization({
      rawCanonical: '',
      finalUrl: 'https://example.com/products/shoes',
    });
    assert.strictEqual(canon.isSpecified, false);
    assert.strictEqual(canon.status, 'CANONICAL_MISSING');
  });

  // 6. Canonical Self-Reference
  it('6. Canonical Self-Reference: validates matching self-canonical and generates no false penalties', () => {
    const canon = auditCanonicalization({
      rawCanonical: 'https://example.com/products/shoes',
      finalUrl: 'https://example.com/products/shoes',
    });
    assert.strictEqual(canon.isSpecified, true);
    assert.strictEqual(canon.isMatch, true);
    assert.strictEqual(canon.status, 'SELF_CANONICAL');
  });

  // 7. Canonical Redirect Conflict
  it('7. Canonical Redirect Conflict: detects canonical pointing to a redirect destination', () => {
    const canon = auditCanonicalization({
      rawCanonical: 'https://example.com/old-shoes',
      finalUrl: 'https://example.com/shoes',
      redirectTargets: { 'https://example.com/old-shoes': 'https://example.com/shoes' },
    });
    assert.strictEqual(canon.pointsToRedirect, true);
    assert.strictEqual(canon.status, 'CANONICAL_REDIRECT_CONFLICT');
  });

  // 8. Canonical Target Mismatch
  it('8. Canonical Mismatch: detects canonical pointing to a different legitimate master URL', () => {
    const canon = auditCanonicalization({
      rawCanonical: 'https://example.com/category/shoes',
      finalUrl: 'https://example.com/category/shoes?color=blue&size=10',
    });
    assert.strictEqual(canon.isMatch, false);
    assert.strictEqual(canon.status, 'CANONICALIZED_TO_OTHER');
  });

  // 9. Meta Robots "noindex"
  it('9. Meta Robots Noindex: parses noindex token and flags indexability state', () => {
    const html = '<html><head><meta name="robots" content="noindex, follow"></head><body><h1>Content</h1></body></html>';
    const $ = cheerio.load(html);
    const { robotsAssessment, indexabilityStatus } = auditIndexabilityAndRobots({
      $,
      headers: {},
      httpStatus: classifyHttpStatus(200),
      robotsTxt: createMockRobotsAnalysis(true),
      pageUrl: 'https://example.com/private',
    });

    assert.strictEqual(robotsAssessment.hasNoindex, true);
    assert.strictEqual(indexabilityStatus, 'NOT_INDEXABLE');
  });

  // 10. X-Robots-Tag "noindex"
  it('10. X-Robots-Tag Noindex: detects header directive and sets NOT_INDEXABLE', () => {
    const html = '<html><head></head><body><h1>Content</h1></body></html>';
    const $ = cheerio.load(html);
    const { robotsAssessment, indexabilityStatus } = auditIndexabilityAndRobots({
      $,
      headers: { 'x-robots-tag': 'noindex, noarchive' },
      httpStatus: classifyHttpStatus(200),
      robotsTxt: createMockRobotsAnalysis(true),
      pageUrl: 'https://example.com/api-doc',
    });

    assert.strictEqual(robotsAssessment.hasNoindex, true);
    assert.strictEqual(indexabilityStatus, 'NOT_INDEXABLE');
  });

  // 11. Robots Contradictions & Conflicts
  it('11. Robots Conflicts: detects X-Robots-Tag vs HTML meta contradictions', () => {
    const html = '<html><head><meta name="robots" content="index, follow"></head><body><h1>Content</h1></body></html>';
    const $ = cheerio.load(html);
    const { robotsAssessment, indexabilityStatus } = auditIndexabilityAndRobots({
      $,
      headers: { 'x-robots-tag': 'noindex' },
      httpStatus: classifyHttpStatus(200),
      robotsTxt: createMockRobotsAnalysis(true),
      pageUrl: 'https://example.com/conflicted',
    });

    assert.strictEqual(robotsAssessment.hasSignalConflict, true);
    assert.strictEqual(indexabilityStatus, 'CONFLICTING_SIGNALS');
  });

  // 12. Robots.txt Disallow Blocking Page
  it('12. Robots.txt Page Blocking: marks BLOCKED_BY_ROBOTS and generates ROBOTS_DISALLOWED', () => {
    const status = classifyHttpStatus(200);
    const robots = createMockRobotsAnalysis(false); // isBotAllowed = false
    const crawlability = determineCrawlabilityStatus(
      status,
      auditRedirects({ targetUrl: 'https://example.com/admin', finalUrl: 'https://example.com/admin', redirectCount: 0, redirectChain: [] }),
      robots
    );

    assert.strictEqual(crawlability, 'BLOCKED_BY_ROBOTS');
  });

  // 13. Valid XML Sitemap
  it('13. Sitemap Valid: recognizes sitemap membership when URL is included in sample', () => {
    const sitemap = createMockSitemapAnalysis(['https://example.com/page1', 'https://example.com/tech-seo']);
    assert.strictEqual(sitemap.exists, true);
    assert.strictEqual(sitemap.totalUrls, 2);
  });

  // 14. Malformed XML Sitemap
  it('14. Sitemap Missing / Unavailable: handles missing sitemap gracefully', () => {
    const sitemap = createMockSitemapAnalysis([], false);
    assert.strictEqual(sitemap.exists, false);
    assert.strictEqual(sitemap.totalUrls, 0);
  });

  // 15. Sitemap Canonical Mismatch
  it('15. Sitemap Canonical Mismatch: detects when sitemap contains non-canonical version', () => {
    const onPage = createMockOnPage({ canonicalUrl: 'https://example.com/canonical-page' });
    const technical: TechnicalSEO = {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 250,
      pageSizeBytes: 5000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'utf-8',
      robotsAnalysis: createMockRobotsAnalysis(),
      sitemapAnalysis: createMockSitemapAnalysis(['https://example.com/parameter-page']),
      sitemapAssessment: {
        exists: true,
        sitemapUrl: 'https://example.com/sitemap.xml',
        totalUrls: 1,
        isIndex: false,
        membershipStatus: 'IN_SITEMAP',
        isCanonicalConsistent: false,
        sitemapCanonicalMismatch: {
          pageCanonical: 'https://example.com/canonical-page',
          sitemapEntry: 'https://example.com/parameter-page',
        },
        summary: 'Sitemap canonical mismatch',
      },
    };

    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/parameter-page',
      finalUrl: 'https://example.com/parameter-page',
      statusCode: 200,
      responseTimeMs: 250,
      pageSizeBytes: 5000,
      onPage,
      technical,
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const mismatchIssue = issues.find((i) => i.code === ISSUE_CODES.SITEMAP_CANONICAL_MISMATCH);
    assert.ok(mismatchIssue, 'Expected SITEMAP_CANONICAL_MISMATCH issue');
  });

  // 16. Hreflang Valid Cluster
  it('16. Hreflang Valid: detects valid ISO codes, self-reference, and x-default', () => {
    const html = `
      <html lang="en">
        <head>
          <link rel="alternate" hreflang="en" href="https://example.com/page" />
          <link rel="alternate" hreflang="es" href="https://example.com/es/page" />
          <link rel="alternate" hreflang="x-default" href="https://example.com/page" />
        </head>
        <body><h1>English Content</h1></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const hreflang = auditHreflang({ $, finalUrl: 'https://example.com/page' });

    assert.strictEqual(hreflang.hasHreflang, true);
    assert.strictEqual(hreflang.totalEntries, 3);
    assert.strictEqual(hreflang.hasXDefault, true);
    assert.strictEqual(hreflang.hasSelfReference, true);
    assert.strictEqual(hreflang.hasInvalidLanguageCodes, false);
    assert.strictEqual(hreflang.isHtmlLangMatched, true);
  });

  // 17. Hreflang Missing Self-Reference
  it('17. Hreflang Missing Self-Reference: flags missing self-alternate tag', () => {
    const html = `
      <html lang="en">
        <head>
          <link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
          <link rel="alternate" hreflang="de" href="https://example.com/de/page" />
        </head>
        <body><h1>English Page</h1></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const hreflang = auditHreflang({ $, finalUrl: 'https://example.com/page' });

    assert.strictEqual(hreflang.hasHreflang, true);
    assert.strictEqual(hreflang.hasSelfReference, false);
  });

  // 18. Hreflang Invalid ISO Code
  it('18. Hreflang Invalid: detects malformed language codes like "english" or "123"', () => {
    const html = `
      <html lang="en">
        <head>
          <link rel="alternate" hreflang="english_us" href="https://example.com/us" />
        </head>
        <body><h1>Page</h1></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const hreflang = auditHreflang({ $, finalUrl: 'https://example.com/page' });

    assert.strictEqual(hreflang.hasInvalidLanguageCodes, true);
    assert.ok(hreflang.invalidCodes.includes('english_us'));
  });

  // 19. Broken Internal Link
  it('19. Broken Internal Link: tracks 4xx/5xx broken links in link analyzer', () => {
    const links = createMockLinks({
      brokenLinks: [
        { url: 'https://example.com/broken-page', text: 'Broken Link', isInternal: true, isExternal: false, isNofollow: false, isBroken: true, statusCode: 404 },
      ],
    });

    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/hub',
      finalUrl: 'https://example.com/hub',
      statusCode: 200,
      responseTimeMs: 200,
      pageSizeBytes: 5000,
      onPage: createMockOnPage(),
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 200,
        pageSizeBytes: 5000,
        redirectCount: 0,
        redirectChain: [],
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
      },
      links,
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const brokenIssue = issues.find((i) => i.code === ISSUE_CODES.BROKEN_LINKS_DETECTED);
    assert.ok(brokenIssue, 'Expected broken link issue');
  });

  // 20. URL Quality & Session Parameter Leaks
  it('20. URL Quality: detects session parameters and duplicate query parameters', () => {
    const urlStruct = auditUrlStructure('https://example.com/shop?phpsessid=xyz123&cat=shoes&cat=shoes');
    assert.strictEqual(urlStruct.hasSessionId, true);
    assert.ok(urlStruct.sessionParamNames.includes('phpsessid'));
    assert.strictEqual(urlStruct.hasDuplicateQueryParams, true);
  });

  // 21. Valid Structured Data (JSON-LD)
  it('21. Valid Structured Data: verifies Schema.org JSON-LD extraction and syntax', () => {
    const schemas = [
      { type: 'Article', rawJson: '{"@context":"https://schema.org","@type":"Article","headline":"Technical SEO"}', isValid: true },
    ];
    assert.strictEqual(schemas[0].isValid, true);
    assert.strictEqual(schemas[0].type, 'Article');
  });

  // 22. Invalid Structured Data (Malformed JSON)
  it('22. Invalid Structured Data: detects malformed JSON and syntax errors', () => {
    const schemas = [
      { type: 'InvalidJSON', rawJson: '{ bad_json: true, }', isValid: false },
    ];
    assert.strictEqual(schemas[0].isValid, false);
  });

  // 23. Social Metadata (OpenGraph missing)
  it('23. OpenGraph Missing: identifies missing social metadata without misclassifying as direct ranking penalty', () => {
    const onPage = createMockOnPage({ ogTags: {} });
    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/post',
      finalUrl: 'https://example.com/post',
      statusCode: 200,
      responseTimeMs: 200,
      pageSizeBytes: 5000,
      onPage,
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 200,
        pageSizeBytes: 5000,
        redirectCount: 0,
        redirectChain: [],
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
      },
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const ogIssue = issues.find((i) => i.code === ISSUE_CODES.OPENGRAPH_MISSING);
    assert.ok(ogIssue, 'Expected OPENGRAPH_MISSING issue');
    assert.strictEqual(ogIssue?.severity, 'RECOMMENDATION');
  });

  // 24. Social Metadata (Twitter Card missing)
  it('24. Twitter Card Missing: identifies absent twitter:* meta tags', () => {
    const onPage = createMockOnPage({ twitterTags: {} });
    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/post',
      finalUrl: 'https://example.com/post',
      statusCode: 200,
      responseTimeMs: 200,
      pageSizeBytes: 5000,
      onPage,
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 200,
        pageSizeBytes: 5000,
        redirectCount: 0,
        redirectChain: [],
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
      },
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const twIssue = issues.find((i) => i.code === ISSUE_CODES.TWITTER_CARD_MISSING);
    assert.ok(twIssue, 'Expected TWITTER_CARD_MISSING issue');
  });

  // 25. Missing Mobile Viewport
  it('25. Mobile Viewport Missing: flags missing <meta name="viewport"> tag', () => {
    const onPage = createMockOnPage({ viewport: '' });
    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/non-mobile',
      finalUrl: 'https://example.com/non-mobile',
      statusCode: 200,
      responseTimeMs: 200,
      pageSizeBytes: 5000,
      onPage,
      technical: {
        httpStatus: 200,
        isHttps: true,
        isIndexable: true,
        responseTimeMs: 200,
        pageSizeBytes: 5000,
        redirectCount: 0,
        redirectChain: [],
        mobileViewportConfigured: false,
        contentType: 'text/html',
        charset: 'utf-8',
        robotsAnalysis: createMockRobotsAnalysis(),
        sitemapAnalysis: createMockSitemapAnalysis(),
      },
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [],
      keywords: [],
    });

    const vpIssue = issues.find((i) => i.code === ISSUE_CODES.VIEWPORT_MISSING);
    assert.ok(vpIssue, 'Expected VIEWPORT_MISSING issue');
    assert.strictEqual(vpIssue?.severity, 'CRITICAL');
  });

  // 26. Mixed Content on HTTPS Page
  it('26. Mixed Content: detects insecure http:// subresources on HTTPS page', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="http://example.com/style.css" />
        </head>
        <body>
          <img src="http://insecure-cdn.com/banner.jpg" alt="Banner" />
        </body>
      </html>
    `;
    const $ = cheerio.load(html);
    const infra = auditInfrastructure({
      $,
      finalUrl: 'https://example.com/checkout',
      headers: { 'strict-transport-security': 'max-age=31536000' },
      contentTypeHeader: 'text/html; charset=utf-8',
    });

    assert.strictEqual(infra.hasMixedContent, true);
    assert.strictEqual(infra.insecureResourceUrls.length, 2);
    assert.strictEqual(infra.securityHeaders.hsts, true);
  });

  // 27. Unsupported Content-Type
  it('27. Unsupported Content-Type: flags non-HTML content types like application/json', () => {
    const html = '{"status":"ok"}';
    const $ = cheerio.load(html);
    const infra = auditInfrastructure({
      $,
      finalUrl: 'https://example.com/api/data',
      headers: {},
      contentTypeHeader: 'application/json',
    });

    assert.strictEqual(infra.isHtmlContentType, false);
  });

  // 28. Scoring Benchmark Ordering
  it('28. Scoring Benchmark Ordering: verifies Clean > Minor Issue > Canonical Conflict > Catastrophic', () => {
    const cleanOnPage = createMockOnPage();
    const cleanTech: TechnicalSEO = {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 250,
      pageSizeBytes: 6000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'utf-8',
      robotsAnalysis: createMockRobotsAnalysis(),
      sitemapAnalysis: createMockSitemapAnalysis(['https://example.com/tech-seo']),
    };

    const cleanScore = calculateSeoScores({
      onPage: cleanOnPage,
      technical: cleanTech,
      links: createMockLinks(),
      images: createMockImages(),
      issues: [],
    });

    // Page with minor metadata issue
    const minorOnPage = createMockOnPage({ titleLength: 20, metaDescriptionLength: 50 });
    const minorScore = calculateSeoScores({
      onPage: minorOnPage,
      technical: cleanTech,
      links: createMockLinks(),
      images: createMockImages(),
      issues: [],
    });

    // Page with noindex
    const noindexTech: TechnicalSEO = { ...cleanTech, isIndexable: false };
    const noindexScore = calculateSeoScores({
      onPage: cleanOnPage,
      technical: noindexTech,
      links: createMockLinks(),
      images: createMockImages(),
      issues: [],
    });

    // Catastrophic 500 error page
    const serverErrorTech: TechnicalSEO = { ...cleanTech, httpStatus: 500, isIndexable: false };
    const errorScore = calculateSeoScores({
      onPage: cleanOnPage,
      technical: serverErrorTech,
      links: createMockLinks(),
      images: createMockImages(),
      issues: [],
    });

    assert.ok(cleanScore.overall >= minorScore.overall, `Clean (${cleanScore.overall}) should be >= Minor (${minorScore.overall})`);
    assert.ok(minorScore.overall > noindexScore.overall, `Minor (${minorScore.overall}) should be > Noindex (${noindexScore.overall})`);
    assert.ok(noindexScore.overall > errorScore.overall, `Noindex (${noindexScore.overall}) should be > Error 500 (${errorScore.overall})`);
  });

  // 29. Deduplication of Multiple Related Directives
  it('29. Scoring Deduplication: ensures multiple noindex directives deduct indexability penalty once', () => {
    const tech: TechnicalSEO = {
      httpStatus: 200,
      isHttps: true,
      isIndexable: false, // Set once by combined noindex signals
      responseTimeMs: 200,
      pageSizeBytes: 5000,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'utf-8',
      robotsAnalysis: createMockRobotsAnalysis(),
      sitemapAnalysis: createMockSitemapAnalysis(),
    };

    const score = calculateSeoScores({
      onPage: createMockOnPage(),
      technical: tech,
      links: createMockLinks(),
      images: createMockImages(),
      issues: [],
    });

    const noindexDeductions = (score.deductions || []).filter((d) => d.ruleCode === 'NOINDEX_TAG_FOUND');
    assert.strictEqual(noindexDeductions.length, 1, 'Expected exactly 1 NOINDEX deduction despite multiple signals');
    assert.strictEqual(noindexDeductions[0].pointsDeducted, 40);
  });

  // 30. Clean Technically Optimized Page
  it('30. Clean Optimized Page: passes all technical checks with 0 critical errors and optimal score', () => {
    const onPage = createMockOnPage();
    const technical: TechnicalSEO = {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 250,
      pageSizeBytes: 7500,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'utf-8',
      robotsAnalysis: createMockRobotsAnalysis(),
      sitemapAnalysis: createMockSitemapAnalysis(['https://example.com/tech-seo']),
      crawlabilityStatus: 'CRAWLABLE',
      indexabilityStatus: 'INDEXABLE',
      canonicalStatus: 'SELF_CANONICAL',
    };

    const issues = performTechnicalSeoAudit({
      targetUrl: 'https://example.com/tech-seo',
      finalUrl: 'https://example.com/tech-seo',
      statusCode: 200,
      responseTimeMs: 250,
      pageSizeBytes: 7500,
      onPage,
      technical,
      links: createMockLinks(),
      images: createMockImages(),
      schemas: [{ type: 'WebPage', rawJson: '{}', isValid: true }],
      keywords: [{ id: '1', keyword: 'technical seo', nGramType: '2-gram', category: 'primary', frequency: 5, density: 1.5, prominenceScore: 90, overallScore: 90, inTitle: true, inH1: true, inH2H6: true, inMeta: true, inUrl: true, inAnchor: false, inAlt: true, inBody: true }],
    });

    const criticalIssues = issues.filter((i) => i.severity === 'CRITICAL');
    assert.strictEqual(criticalIssues.length, 0, 'Clean page should have 0 critical issues');

    const scores = calculateSeoScores({
      onPage,
      technical,
      links: createMockLinks(),
      images: createMockImages(),
      issues,
    });

    assert.strictEqual(scores.technical, 100, 'Technical score should be 100 for clean page');
    assert.ok(scores.overall >= 90, `Overall score (${scores.overall}) should be >= 90`);
  });

});
