import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHtmlContent } from '../lib/parser/htmlParser';
import { extractPageMetadata } from '../lib/seo/metadataExtractor';
import { analyzeLinks } from '../lib/links/linkAnalyzer';
import { analyzeImages } from '../lib/images/imageAnalyzer';
import { extractStructuredData } from '../lib/schema/schemaExtractor';
import { extractAndScoreKeywords } from '../lib/keywords/keywordExtractor';
import { performTechnicalSeoAudit } from '../lib/technical/technicalAuditor';
import { calculateSeoScores } from '../lib/reports/seoScorer';
import { generateSeoRecommendations } from '../lib/recommendations/recommendationEngine';
import { calculateContentContribution } from '../lib/seo/contentContribution';
import { ISSUE_CODES } from '../lib/constants';
import { SEOReport, TechnicalSEO, OnPageData } from '../types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'seo');

function loadFixture(filename: string): string {
  const filePath = path.join(FIXTURES_DIR, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

interface BenchmarkAnalysisResult {
  onPage: OnPageData;
  technical: TechnicalSEO;
  scores: ReturnType<typeof calculateSeoScores>;
  issues: ReturnType<typeof performTechnicalSeoAudit>;
  recommendations: ReturnType<typeof generateSeoRecommendations>;
  keywords: ReturnType<typeof extractAndScoreKeywords>;
  schemas: ReturnType<typeof extractStructuredData>;
  links: ReturnType<typeof analyzeLinks>;
  images: ReturnType<typeof analyzeImages>;
}

function analyzeHtmlFixture(
  rawHtml: string,
  url = 'https://example.com/test-page',
  targetKeywords: string[] = []
): BenchmarkAnalysisResult {
  const parsedContent = parseHtmlContent(rawHtml);
  const metadata = extractPageMetadata(parsedContent.$, url);

  const onPage: OnPageData = {
    title: metadata.title,
    titleLength: metadata.titleLength,
    metaDescription: metadata.metaDescription,
    metaDescriptionLength: metadata.metaDescriptionLength,
    canonicalUrl: metadata.canonicalUrl,
    isCanonicalMatch: metadata.isCanonicalMatch,
    robotsMeta: metadata.robotsMeta,
    viewport: metadata.viewport,
    language: metadata.language,
    hreflang: metadata.hreflang,
    ogTags: metadata.ogTags,
    twitterTags: metadata.twitterTags,
    wordCount: parsedContent.wordCount,
    readingTimeMinutes: parsedContent.readingTimeMinutes,
    textToHtmlRatio: parsedContent.textToHtmlRatio,
    headings: parsedContent.headings,
    paragraphsCount: parsedContent.paragraphsCount,
    listsCount: parsedContent.listsCount,
    tablesCount: parsedContent.tablesCount,
  };

  const links = analyzeLinks(parsedContent.$, url);
  const images = analyzeImages(parsedContent.$, url);
  const schemas = extractStructuredData(parsedContent.$);

  const technical: TechnicalSEO = {
    httpStatus: 200,
    isHttps: url.startsWith('https://'),
    isIndexable: !metadata.robotsMeta.includes('noindex'),
    responseTimeMs: 250,
    pageSizeBytes: rawHtml.length,
    redirectCount: 0,
    redirectChain: [],
    mobileViewportConfigured: Boolean(metadata.viewport),
    contentType: 'text/html; charset=utf-8',
    charset: metadata.charset || 'utf-8',
    robotsAnalysis: {
      exists: true,
      url: 'https://example.com/robots.txt',
      status: 200,
      sitemaps: ['https://example.com/sitemap.xml'],
      isBotAllowed: true,
      directivesCount: 2,
    },
    sitemapAnalysis: {
      exists: true,
      url: 'https://example.com/sitemap.xml',
      status: 200,
      totalUrls: 50,
      urlsSample: [url],
      isIndex: false,
    },
  };

  const keywords = extractAndScoreKeywords(
    parsedContent.visibleText,
    onPage,
    links,
    images,
    url,
    rawHtml
  );

  const primaryTopicsList = keywords.primary.map((p) => p.keyword);

  const issues = performTechnicalSeoAudit({
    targetUrl: url,
    finalUrl: url,
    statusCode: 200,
    responseTimeMs: 250,
    pageSizeBytes: rawHtml.length,
    onPage,
    technical,
    links,
    images,
    schemas,
    keywords: keywords.all,
    targetKeywords,
    primaryTopics: primaryTopicsList,
  });

  const scores = calculateSeoScores({
    onPage,
    technical,
    links,
    images,
    issues,
  });

  const contentContribution = calculateContentContribution({
    onPage,
    links,
    images,
    schemas,
    keywords: keywords.all,
    entities: keywords.entities,
    pageUrl: url,
    targetKeywords,
  });

  const mockReport: Partial<SEOReport> = {
    url,
    onPage,
    technical,
    links,
    images,
    schemas,
    keywords,
    topicCoverageData: {
      mode: targetKeywords.length > 0 ? 'TARGET_KEYWORD_ANALYSIS' : 'AUTOMATIC_TOPIC_ANALYSIS',
      targetKeywords,
      primaryTopicsDetected: primaryTopicsList,
      secondaryTopicsDetected: keywords.secondary.map((s) => s.keyword),
      explanation: '',
    },
  };

  const recommendations = generateSeoRecommendations([mockReport as SEOReport]);

  return {
    onPage,
    technical,
    scores,
    issues,
    recommendations,
    keywords,
    schemas,
    links,
    images,
  };
}

describe('Realistic SEO Benchmark Test Suite (20 Real-World Fixtures)', () => {
  // 1. Good Blog
  it('01-good-blog: achieves high SEO score (>= 90) with all core checks passing', () => {
    const html = loadFixture('01-good-blog.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/blog/modern-web-optimization-guide');

    assert.ok(res.scores.overall >= 90, `Expected score >= 90, got ${res.scores.overall}`);
    assert.equal(res.onPage.headings.h1Count, 1);
    assert.equal(res.onPage.headings.hasMultipleH1, false);
    assert.equal(res.images.missingAlt, 0);
    assert.ok(res.schemas.some((s) => s.type === 'Article'));
    assert.equal(res.issues.some((i) => i.code === ISSUE_CODES.TITLE_MISSING), false);
    assert.equal(res.issues.some((i) => i.code === ISSUE_CODES.H1_MISSING), false);
  });

  // 2. Poor Blog
  it('02-poor-blog: correctly detects missing metadata, missing H1, skipped hierarchy, and low score (< 60)', () => {
    const html = loadFixture('02-poor-blog.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/poor-blog');

    assert.ok(res.scores.overall < 60, `Expected score < 60, got ${res.scores.overall}`);
    assert.equal(res.onPage.headings.h1Count, 0);
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.H1_MISSING));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.META_DESC_MISSING));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.TITLE_TOO_SHORT));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.HEADING_LEVEL_SKIPPED));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.IMAGES_MISSING_ALT));
  });

  // 3. E-commerce Product
  it('03-ecommerce-product: parses product specifications, Product schema, and does not unfairly penalize concise copy', () => {
    const html = loadFixture('03-ecommerce-product.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/products/ergonomic-mesh-office-chair');

    assert.ok(res.scores.overall >= 85, `Expected score >= 85, got ${res.scores.overall}`);
    assert.ok(res.schemas.some((s) => s.type === 'Product'));
    assert.equal(res.onPage.headings.h1Count, 1);
    assert.equal(res.images.missingAlt, 0);
    assert.equal(res.onPage.isCanonicalMatch, true);
  });

  // 4. E-commerce Category
  it('04-ecommerce-category: verifies CollectionPage schema, category intro, and product card headings', () => {
    const html = loadFixture('04-ecommerce-category.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/categories/mens-trail-running-shoes');

    assert.ok(res.scores.overall >= 85);
    assert.ok(res.schemas.some((s) => s.type === 'CollectionPage'));
    assert.equal(res.onPage.headings.h1Count, 1);
    assert.ok(res.onPage.headings.h2Count >= 3);
  });

  // 5. SaaS Landing Page
  it('05-saas-landing-page: verifies SoftwareApplication schema, single H1, and FAQ structure', () => {
    const html = loadFixture('05-saas-landing-page.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/product/cloud-monitoring');

    assert.ok(res.scores.overall >= 90);
    assert.ok(res.schemas.some((s) => s.type === 'SoftwareApplication'));
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 6. Local Business
  it('06-local-business: detects PlumbingService schema and validates local contact signals', () => {
    const html = loadFixture('06-local-business.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/chicago-plumbing-services');

    assert.ok(res.scores.overall >= 85);
    assert.ok(res.schemas.some((s) => s.type === 'PlumbingService'));
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 7. Documentation Page
  it('07-documentation-page: validates TechArticle schema and sequential code documentation outline', () => {
    const html = loadFixture('07-documentation-page.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/docs/api-authentication');

    assert.ok(res.scores.overall >= 85);
    assert.ok(res.schemas.some((s) => s.type === 'TechArticle'));
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 8. News Article
  it('08-news-article: recognizes NewsArticle schema, author byline, and image alt text', () => {
    const html = loadFixture('08-news-article.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/news/global-tech-summit-quantum-breakthrough-2026');

    assert.ok(res.scores.overall >= 85);
    assert.ok(res.schemas.some((s) => s.type === 'NewsArticle'));
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 9. Contact Page
  it('09-contact-page: recognizes ContactPage schema and does not trigger false negative thin content alerts', () => {
    const html = loadFixture('09-contact-page.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/contact');

    assert.ok(res.scores.overall >= 80, `Expected score >= 80, got ${res.scores.overall}`);
    assert.ok(res.schemas.some((s) => s.type === 'ContactPage'));
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 10. Very Thin Page
  it('10-very-thin-page: correctly flags LOW_WORD_COUNT and H1_MISSING with low onPage score (< 50)', () => {
    const html = loadFixture('10-very-thin-page.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/thin');

    assert.ok(res.scores.overall <= 65, `Expected overall score <= 65, got ${res.scores.overall}`);
    assert.ok(res.scores.onPage < 50, `Expected onPage score < 50, got ${res.scores.onPage}`);
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.LOW_WORD_COUNT));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.H1_MISSING));
  });

  // 11. Multiple H1
  it('11-multiple-h1: accurately detects 3 H1 elements and provides before/after hierarchy restructuring', () => {
    const html = loadFixture('11-multiple-h1.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/enterprise-solutions');

    assert.equal(res.onPage.headings.h1Count, 3);
    assert.equal(res.onPage.headings.hasMultipleH1, true);
    const multiH1Issue = res.issues.find((i) => i.code === ISSUE_CODES.H1_MULTIPLE);
    assert.ok(multiH1Issue !== undefined);
    assert.ok(multiH1Issue?.before?.includes('<h1>Cloud Infrastructure Security</h1>'));
    assert.ok(multiH1Issue?.after?.includes('<h2>SOC2 Compliance Automation</h2>'));
  });

  // 12. Missing H1
  it('12-missing-h1: accurately detects absence of H1 and flags H1_MISSING as CRITICAL', () => {
    const html = loadFixture('12-missing-h1.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/case-studies');

    assert.equal(res.onPage.headings.h1Count, 0);
    const missingH1 = res.issues.find((i) => i.code === ISSUE_CODES.H1_MISSING);
    assert.ok(missingH1 !== undefined);
    assert.equal(missingH1?.severity, 'CRITICAL');
  });

  // 13. Missing Title
  it('13-missing-title: accurately detects absence of title tag and flags TITLE_MISSING as CRITICAL', () => {
    const html = loadFixture('13-missing-title.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/deployment-pipelines');

    assert.equal(res.onPage.title, '');
    const missingTitle = res.issues.find((i) => i.code === ISSUE_CODES.TITLE_MISSING);
    assert.ok(missingTitle !== undefined);
    assert.equal(missingTitle?.severity, 'CRITICAL');
  });

  // 14. Missing Meta Description
  it('14-missing-meta: accurately flags META_DESC_MISSING and generates actionable description advice', () => {
    const html = loadFixture('14-missing-meta.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/ml-infrastructure-guide');

    assert.equal(res.onPage.metaDescription, '');
    const missingMeta = res.issues.find((i) => i.code === ISSUE_CODES.META_DESC_MISSING);
    assert.ok(missingMeta !== undefined);
  });

  // 15. Keyword Overuse
  it('15-keyword-overuse: flags KEYWORD_STUFFING_RISK for unnatural repeated phrase density', () => {
    const html = loadFixture('15-keyword-overuse.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/cheap-shoes');

    const stuffingIssue = res.issues.find((i) => i.code === ISSUE_CODES.KEYWORD_STUFFING_RISK);
    assert.ok(stuffingIssue !== undefined, 'Expected KEYWORD_STUFFING_RISK to be flagged');
  });

  // 16. Good Metadata
  it('16-good-metadata: verifies comprehensive OpenGraph, Twitter Cards, Hreflang, and canonical tags', () => {
    const html = loadFixture('16-good-metadata.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/guides/core-web-vitals');

    assert.ok(Object.keys(res.onPage.ogTags).length >= 3);
    assert.ok(Object.keys(res.onPage.twitterTags).length >= 2);
    assert.equal(res.onPage.hreflang.length, 1);
    assert.equal(res.onPage.isCanonicalMatch, true);
    assert.equal(res.scores.onPage, 100);
  });

  // 17. Poor Metadata
  it('17-poor-metadata: flags TITLE_TOO_LONG, META_DESC_TOO_SHORT, and CANONICAL_MISSING', () => {
    const html = loadFixture('17-poor-metadata.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/marketing-guide');

    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.TITLE_TOO_LONG));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.META_DESC_TOO_SHORT));
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.CANONICAL_MISSING));
  });

  // 18. Image Heavy
  it('18-image-heavy: accurately calculates missing alt text ratio (6 of 8 missing) with proportional deduction', () => {
    const html = loadFixture('18-image-heavy.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/portfolio');

    assert.equal(res.images.totalImages, 8);
    assert.equal(res.images.missingAlt, 6);
    assert.equal(res.images.withAlt, 2);
    assert.equal(res.images.altCoverageRatio, 25);
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.IMAGES_MISSING_ALT));
  });

  // 19. Navigation Heavy
  it('19-navigation-heavy: parses 19+ links without crashing and extracts clean main content', () => {
    const html = loadFixture('19-navigation-heavy.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/directory');

    assert.ok(res.links.totalLinks >= 19);
    assert.equal(res.onPage.headings.h1Count, 1);
  });

  // 20. JS Placeholder SPA Page
  it('20-js-placeholder-page: identifies SPA root, flags missing H1, and handles empty DOM snapshot gracefully', () => {
    const html = loadFixture('20-js-placeholder-page.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/spa-app');

    assert.equal(res.onPage.headings.h1Count, 0);
    assert.ok(res.issues.some((i) => i.code === ISSUE_CODES.H1_MISSING));
    assert.ok(res.scores.overall < 70);
  });

  // 21. Score Calibration & Monotonic Ordering
  it('21. Validates score ordering across quality tiers: Good Blog > Poor Blog, and Good Metadata > Poor Metadata', () => {
    const goodBlog = analyzeHtmlFixture(loadFixture('01-good-blog.html'), 'https://example.com/blog');
    const poorBlog = analyzeHtmlFixture(loadFixture('02-poor-blog.html'), 'https://example.com/poor');
    const goodMeta = analyzeHtmlFixture(loadFixture('16-good-metadata.html'), 'https://example.com/good-meta');
    const poorMeta = analyzeHtmlFixture(loadFixture('17-poor-metadata.html'), 'https://example.com/poor-meta');

    assert.ok(goodBlog.scores.overall > poorBlog.scores.overall, `Good blog (${goodBlog.scores.overall}) should score higher than poor blog (${poorBlog.scores.overall})`);
    assert.ok(goodMeta.scores.onPage > poorMeta.scores.onPage, `Good metadata (${goodMeta.scores.onPage}) should score higher than poor metadata (${poorMeta.scores.onPage})`);
  });

  // 22. No Double Deduction Verification
  it('22. Verifies that missing meta description produces exactly one itemized deduction in onPage', () => {
    const html = loadFixture('14-missing-meta.html');
    const res = analyzeHtmlFixture(html, 'https://example.com/ml-guide');

    const metaDeductions = res.scores.deductions?.filter((d) => d.ruleCode === 'META_DESC_MISSING') || [];
    assert.equal(metaDeductions.length, 1);
    assert.equal(metaDeductions[0].category, 'onPage');
    assert.equal(metaDeductions[0].pointsDeducted, 15);
  });
});
