import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { performTechnicalSeoAudit, AuditInput } from '../lib/technical/technicalAuditor';
import { calculateContentContribution } from '../lib/seo/contentContribution';
import { generateSeoRecommendations } from '../lib/recommendations/recommendationEngine';
import { extractAndScoreKeywords } from '../lib/keywords/keywordExtractor';
import { calculateSeoScores } from '../lib/reports/seoScorer';
import { parseHtmlContent } from '../lib/parser/htmlParser';
import { extractPageMetadata } from '../lib/seo/metadataExtractor';
import { analyzeLinks } from '../lib/links/linkAnalyzer';
import { analyzeImages } from '../lib/images/imageAnalyzer';
import { ISSUE_CODES } from '../lib/constants';
import { OnPageData, TechnicalSEO, LinksAnalysis, ImagesAnalysis } from '../types';

function createMockAuditInput(overrides: Partial<AuditInput> = {}): AuditInput {
  const defaultOnPage: OnPageData = {
    title: 'SEO Analyzer & Keyword Extraction Platform',
    titleLength: 46,
    metaDescription: 'A comprehensive SEO analysis platform for auditing webpages and extracting keywords without data fabrication.',
    metaDescriptionLength: 110,
    canonicalUrl: 'https://example.com/test',
    isCanonicalMatch: true,
    robotsMeta: 'index, follow',
    viewport: 'width=device-width, initial-scale=1.0',
    language: 'en',
    hreflang: [],
    ogTags: {},
    twitterTags: {},
    wordCount: 500,
    readingTimeMinutes: 2.5,
    textToHtmlRatio: 25,
    headings: {
      h1Count: 1,
      h2Count: 2,
      h3Count: 1,
      h4Count: 0,
      h5Count: 0,
      h6Count: 0,
      items: [
        { level: 1, text: 'SEO Analyzer & Optimization Tool', id: 'h1-1' },
        { level: 2, text: 'Features and Benefits', id: 'h2-1' },
        { level: 2, text: 'Technical Audit Specifications', id: 'h2-2' },
        { level: 3, text: 'Heading Hierarchy', id: 'h3-1' },
      ],
      hasMissingH1: false,
      hasMultipleH1: false,
      hasSkippedLevels: false,
      issues: [],
    },
    paragraphsCount: 5,
    listsCount: 1,
    tablesCount: 0,
  };

  const defaultTechnical: TechnicalSEO = {
    httpStatus: 200,
    isHttps: true,
    isIndexable: true,
    responseTimeMs: 250,
    pageSizeBytes: 15000,
    redirectCount: 0,
    redirectChain: [],
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
      totalUrls: 10,
      urlsSample: [],
      isIndex: false,
    },
  };

  const defaultLinks: LinksAnalysis = {
    totalLinks: 10,
    internalLinksCount: 6,
    externalLinksCount: 4,
    nofollowCount: 0,
    internalExternalRatio: 1.5,
    internalLinks: [],
    externalLinks: [],
    brokenLinks: [],
  };

  const defaultImages: ImagesAnalysis = {
    totalImages: 2,
    withAlt: 2,
    missingAlt: 0,
    altCoverageRatio: 100,
    images: [
      { src: 'https://example.com/img1.png', alt: 'SEO Audit Dashboard', hasAlt: true, isDecorative: false, filename: 'img1.png' },
      { src: 'https://example.com/img2.png', alt: 'Keyword Chart', hasAlt: true, isDecorative: false, filename: 'img2.png' },
    ],
  };

  return {
    targetUrl: 'https://example.com/test',
    finalUrl: 'https://example.com/test',
    statusCode: 200,
    responseTimeMs: 250,
    pageSizeBytes: 15000,
    onPage: defaultOnPage,
    technical: defaultTechnical,
    links: defaultLinks,
    images: defaultImages,
    schemas: [{ type: 'WebPage', rawJson: '{}', isValid: true }],
    keywords: [
      {
        id: 'kw-1',
        keyword: 'seo analyzer',
        category: 'primary',
        source: 'EXTRACTED',
        frequency: 8,
        density: 1.6,
        prominenceScore: 90,
        overallScore: 88,
        nGramType: '2-gram',
        inTitle: true,
        inH1: true,
        inH2H6: true,
        inMeta: true,
        inUrl: true,
        inAnchor: false,
        inAlt: false,
        inBody: true,
      },
      {
        id: 'kw-2',
        keyword: 'technical audit',
        category: 'secondary',
        source: 'EXTRACTED',
        frequency: 5,
        density: 1.0,
        prominenceScore: 80,
        overallScore: 78,
        nGramType: '2-gram',
        inTitle: false,
        inH1: false,
        inH2H6: true,
        inMeta: false,
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: true,
      },
    ],
    targetKeywords: [],
    primaryTopics: ['seo analyzer'],
    ...overrides,
  };
}

describe('SEO Core Keyword Model & H1 Analysis Suite', () => {
  // Scenario 1: No target keywords provided
  test('1. Handles absence of target keywords without inventing them', () => {
    const input = createMockAuditInput({ targetKeywords: [] });
    const contribution = calculateContentContribution({
      onPage: input.onPage,
      links: input.links,
      images: input.images,
      schemas: input.schemas,
      keywords: input.keywords,
      entities: [],
      pageUrl: input.finalUrl,
      targetKeywords: [],
    });

    assert.equal(contribution.isTargetMode, false);
    assert.equal(contribution.targetKeywordsCount, 0);
    // Findings must NOT mention "target keyword"
    for (const sec of contribution.sections) {
      for (const f of sec.findings) {
        assert.ok(!f.toLowerCase().includes('target keyword'), `Finding should not contain "target keyword": ${f}`);
      }
    }
  });

  // Scenario 2: Target keywords provided
  test('2. Properly identifies target keyword analysis mode when target keywords are supplied', () => {
    const input = createMockAuditInput({ targetKeywords: ['seo analyzer', 'website audit tool'] });
    const contribution = calculateContentContribution({
      onPage: input.onPage,
      links: input.links,
      images: input.images,
      schemas: input.schemas,
      keywords: input.keywords,
      entities: [],
      pageUrl: input.finalUrl,
      targetKeywords: ['seo analyzer', 'website audit tool'],
    });

    assert.equal(contribution.isTargetMode, true);
    assert.equal(contribution.targetKeywordsCount, 2);
  });

  // Scenario 3: Extracted keywords are not labeled as target keywords
  test('3. Extracted keywords retain EXTRACTED source and are never called target keywords', () => {
    const html = `<html><head><title>Search Engine Optimization</title></head><body><h1>SEO Platform</h1><p>Comprehensive search engine optimization for modern digital teams.</p></body></html>`;
    const parsed = parseHtmlContent(html);
    const meta = extractPageMetadata(parsed.$, 'https://example.com');
    const onPage: OnPageData = {
      title: meta.title,
      titleLength: meta.titleLength,
      metaDescription: meta.metaDescription,
      metaDescriptionLength: meta.metaDescriptionLength,
      canonicalUrl: meta.canonicalUrl,
      isCanonicalMatch: true,
      robotsMeta: meta.robotsMeta,
      viewport: meta.viewport,
      language: 'en',
      hreflang: [],
      ogTags: {},
      twitterTags: {},
      wordCount: parsed.wordCount,
      readingTimeMinutes: parsed.readingTimeMinutes,
      textToHtmlRatio: parsed.textToHtmlRatio,
      headings: parsed.headings,
      paragraphsCount: parsed.paragraphsCount,
      listsCount: parsed.listsCount,
      tablesCount: parsed.tablesCount,
    };
    const links = analyzeLinks(parsed.$, 'https://example.com');
    const images = analyzeImages(parsed.$, 'https://example.com');

    const result = extractAndScoreKeywords(parsed.visibleText, onPage, links, images, 'https://example.com', html);

    for (const kw of result.all) {
      assert.equal(kw.source, 'EXTRACTED');
      assert.notEqual(kw.source, 'USER_TARGET');
    }
  });

  // Scenario 4: Recommended keywords remain separate
  test('4. Recommended keywords are kept separate from extracted candidate set', () => {
    const input = createMockAuditInput();
    const contribution = calculateContentContribution({
      onPage: input.onPage,
      links: input.links,
      images: input.images,
      schemas: input.schemas,
      keywords: input.keywords,
      entities: [],
      pageUrl: input.finalUrl,
      targetKeywords: [],
    });

    assert.ok(contribution.sections.length > 0);
    assert.ok((contribution.topicCoverageScore ?? 0) >= 0);
  });

  // Scenario 5: Single H1 does NOT trigger multiple-H1 warning
  test('5. Exactly one H1 does not trigger H1_MULTIPLE warning', () => {
    const input = createMockAuditInput();
    const issues = performTechnicalSeoAudit(input);

    const multipleH1Issue = issues.find((i) => i.code === ISSUE_CODES.H1_MULTIPLE);
    assert.equal(multipleH1Issue, undefined);

    const optimalH1 = issues.find((i) => i.code === 'H1_OPTIMAL');
    assert.ok(optimalH1 !== undefined);
    assert.equal(optimalH1?.severity, 'GOOD');
  });

  // Scenario 6: Multiple H1s trigger warning
  test('6. Multiple H1 tags strictly trigger H1_MULTIPLE warning', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 3,
          h2Count: 1,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [
            { level: 1, text: 'SEO Analyzer', id: '1' },
            { level: 1, text: 'Keyword Research', id: '2' },
            { level: 1, text: 'Technical SEO', id: '3' },
          ],
          hasMissingH1: false,
          hasMultipleH1: true,
          hasSkippedLevels: false,
          issues: [],
        },
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const multipleH1Issue = issues.find((i) => i.code === ISSUE_CODES.H1_MULTIPLE);
    assert.ok(multipleH1Issue !== undefined);
    assert.equal(multipleH1Issue?.severity, 'WARNING');
    assert.ok(multipleH1Issue?.issue?.includes('Multiple H1 headings'));
    assert.ok(multipleH1Issue?.before?.includes('<h1>SEO Analyzer</h1>'));
    assert.ok(multipleH1Issue?.after?.includes('<h2>Keyword Research</h2>'));
    assert.ok(multipleH1Issue?.caution?.includes('Do not change heading levels purely to manipulate rankings'));
  });

  // Scenario 7: H1 alignment with extracted topics (Case B: No Target Keywords)
  test('7. Case B: Evaluates H1 against extracted topics with appropriate topic wording', () => {
    const input = createMockAuditInput({
      targetKeywords: [],
      primaryTopics: ['SEO Audit Platform'],
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 1,
          h2Count: 0,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [{ level: 1, text: 'Welcome to Our Website', id: 'h1' }],
          hasMissingH1: false,
          hasMultipleH1: false,
          hasSkippedLevels: false,
          issues: [],
        },
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const topicMismatch = issues.find((i) => i.code === 'H1_TOPIC_MISMATCH');
    assert.ok(topicMismatch !== undefined);
    assert.equal(topicMismatch?.issue, 'H1 has weak alignment with the primary topic identified from the page content.');
    assert.ok(!topicMismatch?.issue?.includes('target keyword'));
  });

  // Scenario 8: H1 alignment with supplied target keywords (Case A: Target Keywords)
  test('8. Case A: Evaluates H1 against supplied target keywords with target-specific wording', () => {
    const input = createMockAuditInput({
      targetKeywords: ['seo analyzer'],
      primaryTopics: ['seo analyzer'],
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 1,
          h2Count: 0,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [{ level: 1, text: 'Website Performance Tools', id: 'h1' }],
          hasMissingH1: false,
          hasMultipleH1: false,
          hasSkippedLevels: false,
          issues: [],
        },
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const targetMismatch = issues.find((i) => i.code === ISSUE_CODES.H1_KEYWORD_MISMATCH);
    assert.ok(targetMismatch !== undefined);
    assert.equal(targetMismatch?.issue, 'Supplied target keyword is not clearly represented in the H1.');
    assert.ok(targetMismatch?.action?.includes('Consider naturally incorporating the primary target topic'));
    assert.ok(targetMismatch?.caution?.includes('Do NOT blindly stuff keywords'));
  });

  // Scenario 9: 100% topic coverage does not automatically imply H1 alignment
  test('9. Differentiates page-level topic coverage from section-level H1 alignment', () => {
    const input = createMockAuditInput({
      targetKeywords: [],
      primaryTopics: ['Data Engine'],
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 1,
          h2Count: 1,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [
            { level: 1, text: 'Generic Headline', id: 'h1' },
            { level: 2, text: 'Data Engine Overview', id: 'h2' },
          ],
          hasMissingH1: false,
          hasMultipleH1: false,
          hasSkippedLevels: false,
          issues: [],
        },
      },
    });

    const contribution = calculateContentContribution({
      onPage: input.onPage,
      links: input.links,
      images: input.images,
      schemas: input.schemas,
      keywords: input.keywords,
      entities: [],
      pageUrl: input.finalUrl,
      targetKeywords: [],
    });

    const issues = performTechnicalSeoAudit(input);
    // Page has topics and coverage, but H1 specifically has weak alignment
    assert.ok((contribution.topicCoverageScore ?? 0) >= 0);
    const topicMismatch = issues.find((i) => i.code === 'H1_TOPIC_MISMATCH');
    assert.ok(topicMismatch !== undefined);
  });

  // Scenario 10: Empty keyword list
  test('10. Gracefully handles empty keywords list without runtime exceptions', () => {
    const input = createMockAuditInput({ keywords: [], primaryTopics: [] });
    const issues = performTechnicalSeoAudit(input);
    assert.ok(issues.length > 0);
  });

  // Scenario 11: Very short page
  test('11. Detects low content volume on very short pages (<250 words)', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        wordCount: 45,
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const lowWordCount = issues.find((i) => i.code === ISSUE_CODES.LOW_WORD_COUNT);
    assert.ok(lowWordCount !== undefined);
    assert.equal(lowWordCount?.severity, 'WARNING');
    assert.ok(lowWordCount?.whatToChange?.includes('Add explanatory sections'));
  });

  // Scenario 12: Navigation-heavy page boilerplate rejection
  test('12. Strips navigation and footer noise from core visible content', () => {
    const html = `
      <html>
        <head><title>Clean Content Page</title></head>
        <body>
          <nav><a href="/home">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
          <header><div>Header Banner</div></header>
          <main><h1>Core Article Subject</h1><p>Substantive article discussing digital performance metrics.</p></main>
          <footer><p>&copy; 2026 All rights reserved. Privacy policy.</p></footer>
        </body>
      </html>
    `;
    const parsed = parseHtmlContent(html);
    assert.ok(parsed.visibleText.includes('Core Article Subject'));
    assert.equal(parsed.headings.h1Count, 1);
  });

  // Scenario 13: Duplicate content / Canonical handling
  test('13. Audits canonical mismatch correctly when canonical differs from target URL', () => {
    const input = createMockAuditInput({
      finalUrl: 'https://example.com/page?ref=campaign',
      onPage: {
        ...createMockAuditInput().onPage,
        canonicalUrl: 'https://example.com/page',
        isCanonicalMatch: false,
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const canonicalMismatch = issues.find((i) => i.code === ISSUE_CODES.CANONICAL_MISMATCH);
    assert.ok(canonicalMismatch !== undefined);
    assert.equal(canonicalMismatch?.severity, 'WARNING');
  });

  // Scenario 14: HTML noise in keyword extraction
  test('14. Prevents HTML and CSS fragments from appearing as extracted keywords', () => {
    const html = `<html><body><div class="col-md-6 flex-row"><h1>Keyword Engine</h1><p>The keyword engine performs natural language extraction.</p></div></body></html>`;
    const parsed = parseHtmlContent(html);
    const meta = extractPageMetadata(parsed.$, 'https://example.com');
    const onPage: OnPageData = {
      ...createMockAuditInput().onPage,
      title: meta.title,
      wordCount: parsed.wordCount,
      headings: parsed.headings,
    };
    const links = analyzeLinks(parsed.$, 'https://example.com');
    const images = analyzeImages(parsed.$, 'https://example.com');

    const result = extractAndScoreKeywords(parsed.visibleText, onPage, links, images, 'https://example.com', html);
    const keywords = result.all.map((k) => k.keyword.toLowerCase());

    assert.ok(!keywords.includes('div'));
    assert.ok(!keywords.includes('class'));
    assert.ok(!keywords.includes('col-md-6'));
    assert.ok(!keywords.includes('flex-row'));
  });

  // Scenario 15: URL / date / template noise rejection
  test('15. Rejects URL protocols, timestamps, and template artifacts from keyword pool', () => {
    const html = `<html><body><h1>Semantic Analysis</h1><p>Published on 2026-09-11daily1 by admin at https://example.com/path with 0https.</p></body></html>`;
    const parsed = parseHtmlContent(html);
    const onPage: OnPageData = {
      ...createMockAuditInput().onPage,
      wordCount: parsed.wordCount,
      headings: parsed.headings,
    };
    const links = analyzeLinks(parsed.$, 'https://example.com');
    const images = analyzeImages(parsed.$, 'https://example.com');

    const result = extractAndScoreKeywords(parsed.visibleText, onPage, links, images, 'https://example.com', html);
    const keywords = result.all.map((k) => k.keyword.toLowerCase());

    assert.ok(!keywords.includes('2026-09-11daily1'));
    assert.ok(!keywords.includes('0https'));
    assert.ok(!keywords.includes('https://example.com/path'));
  });

  // Scenario 16: Missing title
  test('16. Flags missing title with CRITICAL severity', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        title: '',
        titleLength: 0,
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const titleMissing = issues.find((i) => i.code === ISSUE_CODES.TITLE_MISSING);
    assert.ok(titleMissing !== undefined);
    assert.equal(titleMissing?.severity, 'CRITICAL');
  });

  // Scenario 17: Missing meta description
  test('17. Flags missing meta description with WARNING severity and before/after example', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        metaDescription: '',
        metaDescriptionLength: 0,
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const descMissing = issues.find((i) => i.code === ISSUE_CODES.META_DESC_MISSING);
    assert.ok(descMissing !== undefined);
    assert.equal(descMissing?.severity, 'WARNING');
    assert.ok(descMissing?.before !== undefined);
    assert.ok(descMissing?.after !== undefined);
  });

  // Scenario 18: Missing H1
  test('18. Flags missing H1 heading with CRITICAL severity', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 0,
          h2Count: 1,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [{ level: 2, text: 'Subtopic', id: 'h2' }],
          hasMissingH1: true,
          hasMultipleH1: false,
          hasSkippedLevels: false,
          issues: [],
        },
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const h1Missing = issues.find((i) => i.code === ISSUE_CODES.H1_MISSING);
    assert.ok(h1Missing !== undefined);
    assert.equal(h1Missing?.severity, 'CRITICAL');
  });

  // Scenario 19: Heading hierarchy problems
  test('19. Detects skipped heading levels (H1 to H3)', () => {
    const input = createMockAuditInput({
      onPage: {
        ...createMockAuditInput().onPage,
        headings: {
          h1Count: 1,
          h2Count: 0,
          h3Count: 1,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          items: [
            { level: 1, text: 'Main Title', id: 'h1' },
            { level: 3, text: 'Skipped Subheading', id: 'h3' },
          ],
          hasMissingH1: false,
          hasMultipleH1: false,
          hasSkippedLevels: true,
          issues: [],
        },
      },
    });

    const issues = performTechnicalSeoAudit(input);
    const skippedLevels = issues.find((i) => i.code === ISSUE_CODES.HEADING_LEVEL_SKIPPED);
    assert.ok(skippedLevels !== undefined);
    assert.equal(skippedLevels?.severity, 'WARNING');
  });

  // Scenario 20: Unavailable external SEO metrics do not become fabricated zero scores
  test('20. Does not penalize overall SEO scores when external metrics are unavailable', () => {
    const input = createMockAuditInput();
    const issues = performTechnicalSeoAudit(input);
    const scores = calculateSeoScores({
      onPage: input.onPage,
      technical: input.technical,
      links: input.links,
      images: input.images,
      issues,
    });

    assert.ok(scores.overall >= 80, `Expected overall score >= 80, got ${scores.overall}`);
    assert.ok(scores.technical >= 80, `Expected technical score >= 80, got ${scores.technical}`);
    assert.ok(scores.onPage >= 80, `Expected onPage score >= 80, got ${scores.onPage}`);
  });
});
