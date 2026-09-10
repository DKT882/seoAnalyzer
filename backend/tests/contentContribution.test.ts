import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateContentContribution } from '../src/seo/contentContribution.js';
import { OnPageData, LinksAnalysis, ImagesAnalysis } from '@seo-analyzer/shared';

describe('Content Contribution & Signal Heatmap', () => {
  const dummyOnPage: OnPageData = {
    title: 'Advanced SEO Analysis Platform',
    titleLength: 30,
    metaDescription: 'Complete SEO keyword extraction and competitive analysis platform.',
    metaDescriptionLength: 68,
    canonicalUrl: 'https://example.com',
    isCanonicalMatch: true,
    robotsMeta: 'index, follow',
    viewport: 'width=device-width, initial-scale=1.0',
    language: 'en',
    hreflang: [],
    ogTags: {},
    twitterTags: {},
    wordCount: 850,
    readingTimeMinutes: 4,
    textToHtmlRatio: 22,
    headings: {
      items: [
        { level: 1, text: 'Advanced SEO Analysis Platform' },
        { level: 2, text: 'Keyword Intelligence' },
        { level: 2, text: 'Content Gap Discovery' },
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
  };

  const dummyLinks: LinksAnalysis = {
    totalLinks: 6,
    internalLinksCount: 4,
    externalLinksCount: 2,
    nofollowCount: 0,
    internalLinks: [{ url: '/pricing', text: 'Pricing Plans', isInternal: true, isExternal: false, isNofollow: false }],
    externalLinks: [{ url: 'https://google.com', text: 'Google', isInternal: false, isExternal: true, isNofollow: false }],
    brokenLinks: [],
    internalExternalRatio: 2,
  };

  const dummyImages: ImagesAnalysis = {
    totalImages: 2,
    withAlt: 2,
    missingAlt: 0,
    altCoverageRatio: 100,
    images: [{ src: '/img.png', alt: 'SEO Dashboard Chart', hasAlt: true, isDecorative: false, filename: 'img.png' }],
  };

  test('calculates explainable contribution score and section heatmap', () => {
    const analysis = calculateContentContribution({
      onPage: dummyOnPage,
      links: dummyLinks,
      images: dummyImages,
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
      keywords: [
        {
          id: '1',
          keyword: 'seo analysis',
          nGramType: '2-gram',
          category: 'primary',
          frequency: 5,
          density: 1.2,
          prominenceScore: 90,
          overallScore: 85,
          inTitle: true,
          inH1: true,
          inH2H6: true,
          inMeta: true,
          inUrl: true,
          inAnchor: false,
          inAlt: false,
          inBody: true,
        },
      ],
      entities: [{ name: 'Google', type: 'Organization', occurrences: 3, relevance: 80 }],
      pageUrl: 'https://example.com',
    });

    assert.ok(analysis.overallContributionScore >= 50, 'Expected healthy contribution score');
    assert.ok(analysis.sections.length >= 8, 'Expected at least 8 evaluated content zones');
    assert.ok(analysis.heatmap.length >= 8, 'Expected matching heatmap entries');
    assert.ok(analysis.strongestSection.length > 0);
  });
});
