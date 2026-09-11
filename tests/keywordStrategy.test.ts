import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeywordStrategy, generateContentBrief } from '../lib/keywords/keywordStrategy';
import { inferSearchIntent, calculateInternalOpportunityScore } from '../lib/keywords/keywordOpportunities';
import { SEOReport } from '../types';

describe('Keyword Strategy & Intent Engine', () => {
  test('inferSearchIntent correctly classifies transactional, commercial, informational, navigational intents', () => {
    assert.strictEqual(inferSearchIntent('how to optimize website speed'), 'Informational');
    assert.strictEqual(inferSearchIntent('best seo audit tools 2026'), 'Commercial');
    assert.strictEqual(inferSearchIntent('buy rank tracker subscription discount'), 'Transactional');
    assert.strictEqual(inferSearchIntent('google search console login portal'), 'Navigational');
  });

  test('calculateInternalOpportunityScore scores keywords with high prominence but low body coverage', () => {
    const highOppScore = calculateInternalOpportunityScore(
      85, // relevance
      0.2, // low coverage ratio
      3, // placements in title, h1, etc.
      false
    );
    assert.ok(highOppScore >= 60, 'Expected high opportunity score');

    const lowOppScore = calculateInternalOpportunityScore(
      20,
      1.0, // saturated coverage ratio
      0,
      false
    );
    assert.ok(lowOppScore < highOppScore, 'Expected lower score for saturated non-prominent keyword');
  });

  test('generateKeywordStrategy generates primary, secondary, long-tail, questions, entities, topic clusters, and coverage', () => {
    const mockReports: SEOReport[] = [
      {
        id: 'rep-1',
        url: 'https://example.com/guide',
        normalizedUrl: 'https://example.com/guide',
        timestamp: new Date().toISOString(),
        durationMs: 150,
        scores: { overall: 85, onPage: 85, technical: 85, content: 85, links: 85, mobile: 85 },
        onPage: {
          title: 'Complete SEO Keyword Extraction Guide',
          titleLength: 38,
          metaDescription: 'Learn complete seo keyword extraction guide with our tutorial.',
          metaDescriptionLength: 62,
          canonicalUrl: 'https://example.com/guide',
          isCanonicalMatch: true,
          robotsMeta: 'index, follow',
          viewport: 'width=device-width',
          language: 'en',
          hreflang: [],
          ogTags: {},
          twitterTags: {},
          wordCount: 1500,
          readingTimeMinutes: 7,
          textToHtmlRatio: 22,
          headings: {
            items: [
              { level: 1, text: 'Complete SEO Keyword Extraction Guide' },
              { level: 2, text: 'How to extract keywords effectively' },
            ],
            h1Count: 1,
            h2Count: 1,
            h3Count: 0,
            h4Count: 0,
            h5Count: 0,
            h6Count: 0,
            hasMissingH1: false,
            hasMultipleH1: false,
            hasSkippedLevels: false,
            issues: [],
          },
          paragraphsCount: 12,
          listsCount: 3,
          tablesCount: 1,
        },
        technical: {
          httpStatus: 200,
          isHttps: true,
          isIndexable: true,
          responseTimeMs: 120,
          pageSizeBytes: 30000,
          redirectCount: 0,
          redirectChain: [],
          mobileViewportConfigured: true,
          contentType: 'text/html',
          charset: 'UTF-8',
          robotsAnalysis: { exists: true, url: '', status: 200, sitemaps: [], isBotAllowed: true, directivesCount: 1 },
          sitemapAnalysis: { exists: true, url: '', status: 200, totalUrls: 10, urlsSample: [], isIndex: false },
        },
        links: { totalLinks: 5, internalLinksCount: 4, externalLinksCount: 1, nofollowCount: 0, internalLinks: [], externalLinks: [], brokenLinks: [], internalExternalRatio: 4 },
        images: { totalImages: 2, withAlt: 2, missingAlt: 0, altCoverageRatio: 100, images: [] },
        schemas: [],
        keywords: {
          all: [
            { id: '1', keyword: 'keyword extraction', nGramType: '2-gram', category: 'primary', frequency: 12, density: 1.8, prominenceScore: 92, overallScore: 88, inTitle: true, inH1: true, inH2H6: true, inMeta: true, inUrl: true, inAnchor: false, inAlt: false, inBody: true },
            { id: '2', keyword: 'seo analysis', nGramType: '2-gram', category: 'secondary', frequency: 8, density: 1.2, prominenceScore: 80, overallScore: 78, inTitle: false, inH1: false, inH2H6: true, inMeta: true, inUrl: false, inAnchor: false, inAlt: false, inBody: true },
            { id: '3', keyword: 'how to extract keywords', nGramType: '3-gram', category: 'question', frequency: 4, density: 0.8, prominenceScore: 85, overallScore: 82, inTitle: false, inH1: false, inH2H6: true, inMeta: false, inUrl: false, inAnchor: false, inAlt: false, inBody: true },
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
          totalWords: 1500,
          uniqueWords: 350,
        },
        tagExplorer: { totalElementsCount: 10, metadata: [], headings: [], social: [], content: [], links: [], images: [], structuredData: [] },
        contentContribution: { overallContributionScore: 85, sections: [], heatmap: [], strongestSection: 'Title', weakestSection: 'Schema', summary: 'Strong' },
        issues: [],
        externalSeoDisclaimer: 'Disclaimer',
        dataSourceDisclosures: { categoryA: 'Direct', categoryB: 'External', categoryC: 'Private' },
      },
    ];

    const strategy = generateKeywordStrategy(mockReports);

    assert.ok(strategy.primaryKeyword.length > 0, 'Expected detected primary keyword');
    assert.ok(strategy.topicCoverageScore >= 0 && strategy.topicCoverageScore <= 100, 'Expected valid topicCoverageScore 0-100');
    assert.ok(strategy.keywords.length > 0, 'Expected strategy keywords list');
    assert.ok(strategy.clusters.length > 0, 'Expected topic clusters');
    assert.ok(strategy.briefs.length > 0, 'Expected generated content briefs');

    const brief = strategy.briefs[0];
    assert.ok(brief.primaryKeyword, 'Expected brief primaryKeyword');
    assert.ok(brief.suggestedH1, 'Expected suggestedH1');
    assert.ok(brief.suggestedH2s.length >= 2, 'Expected suggestedH2s');
    assert.ok(brief.questionsToAnswer.length > 0, 'Expected questionsToAnswer');
  });

  test('generateContentBrief produces complete structured brief', () => {
    const brief = generateContentBrief('technical seo');
    assert.strictEqual(brief.primaryKeyword, 'technical seo');
    assert.ok(brief.suggestedH1.includes('Technical seo') || brief.suggestedH1.includes('Technical Seo'));
    assert.ok(brief.suggestedH2s.length >= 3);
    assert.ok(brief.questionsToAnswer.length > 0);
  });
});
