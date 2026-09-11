import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateKeywordScore } from '../lib/keywords/scoring';
import { calculateSeoScores } from '../lib/reports/seoScorer';

describe('Keyword & SEO Scoring Engines', () => {
  it('calculates keyword relevance score bounded between 0 and 100', () => {
    const res = calculateKeywordScore({
      frequency: 8,
      density: 2.1,
      prominenceScore: 14,
      internalTfIdf: 0.8,
      inTitle: true,
      inH1: true,
      inH2H6: true,
      inMeta: true,
      inUrl: true,
      inAnchor: true,
      inAlt: true,
      inBody: true,
      wordCountInPhrase: 2,
    });

    assert.strictEqual(res.overallScore <= 100, true);
    assert.strictEqual(res.overallScore >= 80, true);
    assert.strictEqual(res.isStuffingRisk, false);
  });

  it('applies keyword stuffing penalty when density exceeds 5%', () => {
    const res = calculateKeywordScore({
      frequency: 30,
      density: 7.5,
      prominenceScore: 10,
      internalTfIdf: 0.5,
      inTitle: true,
      inH1: false,
      inH2H6: false,
      inMeta: false,
      inUrl: false,
      inAnchor: false,
      inAlt: false,
      inBody: true,
      wordCountInPhrase: 1,
    });

    assert.strictEqual(res.isStuffingRisk, true);
    assert.strictEqual(res.stuffingPenalty > 0, true);
  });

  it('calculates aggregated 0-100 SEO health scores across 5 categories', () => {
    const mockOnPage: any = {
      title: 'Valid Optimized Title for SEO & Performance',
      titleLength: 45,
      metaDescription: 'Descriptive meta description summarizing the complete guide and best practices for developers.',
      metaDescriptionLength: 95,
      canonicalUrl: 'https://example.com',
      isCanonicalMatch: true,
      viewport: 'width=device-width',
      language: 'en',
      ogTags: { 'og:title': 'Test' },
      headings: {
        h1Count: 1,
        hasMissingH1: false,
        hasMultipleH1: false,
        hasSkippedLevels: false,
      },
      wordCount: 850,
      textToHtmlRatio: 22,
    };

    const mockTech: any = {
      httpStatus: 200,
      isHttps: true,
      isIndexable: true,
      responseTimeMs: 320,
      robotsAnalysis: { isBotAllowed: true },
      sitemapAnalysis: { exists: true },
    };

    const mockLinks: any = { totalLinks: 12 };
    const mockImages: any = { totalImages: 4, altCoverageRatio: 100 };

    const scores = calculateSeoScores({
      onPage: mockOnPage,
      technical: mockTech,
      links: mockLinks,
      images: mockImages,
      issues: [],
    });

    assert.strictEqual(scores.overall >= 90, true);
    assert.strictEqual(scores.onPage, 100);
    assert.strictEqual(scores.technical, 100);
    assert.strictEqual(scores.content, 100);
  });
});
