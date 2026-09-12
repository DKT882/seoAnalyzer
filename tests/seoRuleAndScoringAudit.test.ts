import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSeoScores, ScoreCalculationInput } from '../lib/reports/seoScorer';
import { performTechnicalSeoAudit, AuditInput } from '../lib/technical/technicalAuditor';
import { generateSeoRecommendations } from '../lib/recommendations/recommendationEngine';
import { calculateOpportunityScore } from '../lib/seo/opportunityScorer';
import { calculateKeywordScore } from '../lib/keywords/scoring';
import { ISSUE_CODES } from '../lib/constants';
import { SEOReport } from '../types';

function createCleanMockAuditInput(): AuditInput {
  return {
    targetUrl: 'https://example.com/seo-guide',
    finalUrl: 'https://example.com/seo-guide',
    statusCode: 200,
    responseTimeMs: 320,
    pageSizeBytes: 15400,
    onPage: {
      title: 'Complete SEO Optimization Guide | Example',
      titleLength: 43,
      metaDescription: 'Discover actionable strategies and best practices to optimize your website for search engines.',
      metaDescriptionLength: 95,
      canonicalUrl: 'https://example.com/seo-guide',
      isCanonicalMatch: true,
      robotsMeta: 'index, follow',
      viewport: 'width=device-width, initial-scale=1.0',
      language: 'en',
      hreflang: [],
      ogTags: { 'og:title': 'Complete SEO Optimization Guide' },
      twitterTags: {},
      wordCount: 850,
      readingTimeMinutes: 4,
      textToHtmlRatio: 22,
      headings: {
        items: [
          { level: 1, text: 'Complete SEO Optimization Guide' },
          { level: 2, text: 'Key On-Page Strategies' },
          { level: 2, text: 'Technical SEO Best Practices' },
        ],
        h1Count: 1,
        h2Count: 2,
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
      tablesCount: 1,
    },
    technical: {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 320,
      pageSizeBytes: 15400,
      redirectCount: 0,
      redirectChain: [],
      mobileViewportConfigured: true,
      contentType: 'text/html; charset=utf-8',
      charset: 'utf-8',
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
        totalUrls: 25,
        urlsSample: ['https://example.com/seo-guide'],
        isIndex: false,
      },
    },
    links: {
      totalLinks: 12,
      internalLinksCount: 8,
      externalLinksCount: 4,
      nofollowCount: 1,
      internalLinks: [],
      externalLinks: [],
      brokenLinks: [],
      internalExternalRatio: 2,
    },
    images: {
      totalImages: 4,
      withAlt: 4,
      missingAlt: 0,
      altCoverageRatio: 100,
      images: [],
    },
    schemas: [
      {
        type: 'Article',
        rawJson: '{}',
        isValid: true,
      },
    ],
    keywords: [
      {
        id: 'kw-1',
        keyword: 'seo optimization',
        nGramType: '2-gram',
        category: 'primary',
        frequency: 6,
        density: 1.8,
        prominenceScore: 90,
        overallScore: 88,
        inTitle: true,
        inH1: true,
        inH2H6: true,
        inMeta: true,
        inUrl: true,
        inAnchor: false,
        inAlt: false,
        inBody: true,
        source: 'EXTRACTED',
      },
    ],
  };
}

describe('SEO Rule & Scoring Audit Test Suite', () => {
  // 1. Score Calculation & Deductions Ledger
  it('1. Computes 100% score for optimal page and records zero deductions', () => {
    const input = createCleanMockAuditInput();
    const scores = calculateSeoScores({
      onPage: input.onPage,
      technical: input.technical,
      links: input.links,
      images: input.images,
      issues: [],
    });

    assert.equal(scores.overall, 100);
    assert.equal(scores.onPage, 100);
    assert.equal(scores.technical, 100);
    assert.equal(scores.content, 100);
    assert.equal(scores.links, 100);
    assert.equal(scores.mobile, 100);
    assert.ok(Array.isArray(scores.deductions));
    assert.equal(scores.deductions?.length, 0);
  });

  // 2. Score Bounds Guarantee: 0 <= score <= 100
  it('2. Enforces lower bound of 0 under catastrophic page conditions', () => {
    const catastrophicInput = createCleanMockAuditInput();
    catastrophicInput.onPage.title = '';
    catastrophicInput.onPage.metaDescription = '';
    catastrophicInput.onPage.canonicalUrl = '';
    catastrophicInput.onPage.ogTags = {};
    catastrophicInput.onPage.headings.hasMissingH1 = true;
    catastrophicInput.onPage.headings.hasSkippedLevels = true;
    catastrophicInput.onPage.wordCount = 20;
    catastrophicInput.onPage.textToHtmlRatio = 1;
    catastrophicInput.onPage.viewport = '';
    catastrophicInput.onPage.language = '';
    catastrophicInput.technical.httpStatus = 500;
    catastrophicInput.technical.isHttps = false;
    catastrophicInput.technical.isIndexable = false;
    catastrophicInput.technical.robotsAnalysis.isBotAllowed = false;
    catastrophicInput.technical.sitemapAnalysis.exists = false;
    catastrophicInput.technical.responseTimeMs = 4500;
    catastrophicInput.images.missingAlt = 10;
    catastrophicInput.images.totalImages = 10;
    catastrophicInput.images.altCoverageRatio = 0;
    catastrophicInput.links.totalLinks = 0;

    const scores = calculateSeoScores({
      onPage: catastrophicInput.onPage,
      technical: catastrophicInput.technical,
      links: catastrophicInput.links,
      images: catastrophicInput.images,
      issues: [{ id: '1', code: 'KEYWORD_STUFFING_RISK', category: 'keywords', severity: 'WARNING', title: 'Stuffing', description: '', whyItMatters: '', recommendation: '' }],
    });

    assert.ok(scores.overall >= 0 && scores.overall <= 100);
    assert.equal(scores.onPage, 0);
    assert.equal(scores.technical, 0);
    assert.equal(scores.content, 40); // 100 - 35 (thin) - 10 (text/html) - 15 (stuffing) = 40
    assert.equal(scores.links, 50); // 100 - 30 (alt) - 20 (no links) = 50
    assert.equal(scores.mobile, 25); // 100 - 60 (viewport) - 15 (lang) = 25
    assert.ok(scores.deductions!.length > 5);
  });

  // 3. Itemized Deductions Transparency
  it('3. Generates transparent, itemized deductions for specific faults', () => {
    const input = createCleanMockAuditInput();
    input.onPage.metaDescription = ''; // -15 onpage
    input.technical.sitemapAnalysis.exists = false; // -10 technical

    const scores = calculateSeoScores({
      onPage: input.onPage,
      technical: input.technical,
      links: input.links,
      images: input.images,
      issues: [],
    });

    assert.equal(scores.onPage, 85);
    assert.equal(scores.technical, 90);
    const metaDeduction = scores.deductions?.find((d) => d.ruleCode === 'META_DESC_MISSING');
    const sitemapDeduction = scores.deductions?.find((d) => d.ruleCode === 'SITEMAP_MISSING');

    assert.ok(metaDeduction !== undefined);
    assert.equal(metaDeduction?.pointsDeducted, 15);
    assert.equal(metaDeduction?.category, 'onPage');

    assert.ok(sitemapDeduction !== undefined);
    assert.equal(sitemapDeduction?.pointsDeducted, 10);
    assert.equal(sitemapDeduction?.category, 'technical');
  });

  // 4. Unavailable External Metrics Do Not Cause Score Penalties
  it('4. Opportunity scorer does not punish keywords when external search volume is not connected', () => {
    const oppScore = calculateOpportunityScore({
      keyword: 'seo analyzer',
      category: 'primary',
      internalRelevance: 85,
      frequency: 4,
      coverageStatus: 'Strong',
      marketData: null, // External provider disconnected
    });

    assert.ok(oppScore.finalScore >= 50, `Expected honest internal score, got ${oppScore.finalScore}`);
    assert.equal(oppScore.marketDemandScore, null);
    assert.equal(oppScore.difficultyScore, null);
    assert.ok(oppScore.explanation.includes('External search demand data not connected'));
  });

  // 5. Keyword Density & Stuffing Penalty
  it('5. Applies keyword stuffing penalty when density exceeds 5.0%', () => {
    const kwScore = calculateKeywordScore({
      frequency: 25,
      density: 6.8,
      prominenceScore: 10,
      internalTfIdf: 1.2,
      inTitle: true,
      inH1: true,
      inH2H6: false,
      inMeta: false,
      inUrl: false,
      inAnchor: false,
      inAlt: false,
      inBody: true,
      wordCountInPhrase: 2,
    });

    assert.equal(kwScore.isStuffingRisk, true);
    assert.ok(kwScore.stuffingPenalty > 0);
  });

  // 6. Single H1 Evaluation
  it('6. Evaluates single H1 without triggering multiple-H1 warning', () => {
    const input = createCleanMockAuditInput();
    const issues = performTechnicalSeoAudit(input);

    const multiH1Issue = issues.find((i) => i.code === ISSUE_CODES.H1_MULTIPLE);
    const optimalH1 = issues.find((i) => i.code === 'H1_OPTIMAL');

    assert.equal(multiH1Issue, undefined);
    assert.ok(optimalH1 !== undefined);
  });

  // 7. Multiple H1 Evaluation with Structural Diff
  it('7. Flags multiple H1s and provides before/after hierarchy fix', () => {
    const input = createCleanMockAuditInput();
    input.onPage.headings = {
      items: [
        { level: 1, text: 'Main Page Topic' },
        { level: 1, text: 'Secondary Topic A' },
        { level: 1, text: 'Secondary Topic B' },
      ],
      h1Count: 3,
      h2Count: 0,
      h3Count: 0,
      h4Count: 0,
      h5Count: 0,
      h6Count: 0,
      hasMissingH1: false,
      hasMultipleH1: true,
      hasSkippedLevels: false,
      issues: [],
    };

    const issues = performTechnicalSeoAudit(input);
    const multiH1 = issues.find((i) => i.code === ISSUE_CODES.H1_MULTIPLE);

    assert.ok(multiH1 !== undefined);
    assert.equal(multiH1?.severity, 'WARNING');
    assert.ok(multiH1?.before?.includes('<h1>Main Page Topic</h1>'));
    assert.ok(multiH1?.after?.includes('<h2>Secondary Topic A</h2>'));
  });

  // 8. Mode-Aware Title & H1 Recommendations (Target Mode)
  it('8. Produces Target Keyword recommendations when target keywords are provided', () => {
    const mockReport: Partial<SEOReport> = {
      url: 'https://example.com',
      onPage: {
        ...createCleanMockAuditInput().onPage,
        title: 'Random Headline Text',
        headings: {
          ...createCleanMockAuditInput().onPage.headings,
          items: [{ level: 1, text: 'Welcome to Platform' }],
          h1Count: 1,
        },
      },
      technical: createCleanMockAuditInput().technical,
      links: createCleanMockAuditInput().links,
      images: createCleanMockAuditInput().images,
      schemas: [],
      keywords: {
        primary: [{ id: '1', keyword: 'seo tool', nGramType: '2-gram', category: 'primary', frequency: 2, density: 1, prominenceScore: 50, overallScore: 70, inTitle: false, inH1: false, inH2H6: false, inMeta: false, inUrl: false, inAnchor: false, inAlt: false, inBody: true }],
        secondary: [],
        all: [],
        questions: [],
        entities: [],
        clusters: [],
      } as any,
      topicCoverageData: {
        mode: 'TARGET_KEYWORD_ANALYSIS',
        targetKeywords: ['best seo audit tool'],
        primaryTopicsDetected: ['seo tool'],
        secondaryTopicsDetected: [],
        explanation: '',
      },
    };

    const recs = generateSeoRecommendations([mockReport as SEOReport]);
    const targetTitleRec = recs.all.find((r) => r.title.includes('Include target keyword'));
    const targetH1Rec = recs.all.find((r) => r.title.includes('Align H1 heading with target keyword'));

    assert.ok(targetTitleRec !== undefined);
    assert.ok(targetTitleRec?.reason.includes('best seo audit tool'));
    assert.ok(targetH1Rec !== undefined);
    assert.ok(targetH1Rec?.reason.includes('best seo audit tool'));
  });

  // 9. Mode-Aware Title & H1 Recommendations (Automatic Topic Mode)
  it('9. Produces Extracted Topic recommendations when NO target keywords are provided', () => {
    const mockReport: Partial<SEOReport> = {
      url: 'https://example.com',
      onPage: {
        ...createCleanMockAuditInput().onPage,
        title: 'Random Headline Text',
        headings: {
          ...createCleanMockAuditInput().onPage.headings,
          items: [{ level: 1, text: 'Welcome to Platform' }],
          h1Count: 1,
        },
      },
      technical: createCleanMockAuditInput().technical,
      links: createCleanMockAuditInput().links,
      images: createCleanMockAuditInput().images,
      schemas: [],
      keywords: {
        primary: [{ id: '1', keyword: 'website speed audit', nGramType: '3-gram', category: 'primary', frequency: 3, density: 1.2, prominenceScore: 60, overallScore: 75, inTitle: false, inH1: false, inH2H6: false, inMeta: false, inUrl: false, inAnchor: false, inAlt: false, inBody: true, source: 'EXTRACTED' }],
        secondary: [],
        all: [],
        questions: [],
        entities: [],
        clusters: [],
      } as any,
      topicCoverageData: {
        mode: 'AUTOMATIC_TOPIC_ANALYSIS',
        targetKeywords: [],
        primaryTopicsDetected: ['website speed audit'],
        secondaryTopicsDetected: [],
        explanation: '',
      },
    };

    const recs = generateSeoRecommendations([mockReport as SEOReport]);
    const topicTitleRec = recs.all.find((r) => r.title.includes('Reflect primary topic'));
    const topicH1Rec = recs.all.find((r) => r.title.includes('Align H1 heading with primary topic'));

    assert.ok(topicTitleRec !== undefined);
    assert.ok(topicTitleRec?.reason.includes('website speed audit'));
    assert.ok(topicH1Rec !== undefined);
    assert.ok(topicH1Rec?.issue?.includes('weak alignment with the primary topic identified from the page content'));
  });

  // 10. Proportional Alt Text Scoring
  it('10. Deducts points proportionally to missing image alt text ratio', () => {
    const input = createCleanMockAuditInput();
    input.images.totalImages = 10;
    input.images.missingAlt = 5;
    input.images.altCoverageRatio = 50; // 50% missing -> 50% * 30 pts = -15 pts

    const scores = calculateSeoScores({
      onPage: input.onPage,
      technical: input.technical,
      links: input.links,
      images: input.images,
      issues: [],
    });

    assert.equal(scores.links, 85); // 100 - 15 = 85
    const altDeduction = scores.deductions?.find((d) => d.ruleCode === 'IMAGES_MISSING_ALT');
    assert.ok(altDeduction !== undefined);
    assert.equal(altDeduction?.pointsDeducted, 15);
  });
});
