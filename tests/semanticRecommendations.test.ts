import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRecommendedKeywords, classifyPageType } from '../lib/keywords/recommendedKeywords';
import { extractAndScoreKeywords } from '../lib/keywords/keywordExtractor';

describe('Semantic SEO Recommendation Engine Regression Suite', () => {
  test('Rule 11 & 12: Low-content pages (e.g. example.com) produce ZERO artificial recommendations', () => {
    const lowContentHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Example Domain</title></head>
        <body>
          <h1>Example Domain</h1>
          <p>This domain is for use in illustrative examples in documents.</p>
        </body>
      </html>
    `;

    const onPageData: any = {
      title: 'Example Domain',
      metaDescription: '',
      headings: { items: [{ level: 1, text: 'Example Domain' }] },
    };

    const linksData: any = { internalLinks: [], externalLinks: [] };
    const imagesData: any = { images: [] };

    const result = extractAndScoreKeywords(
      '',
      onPageData,
      linksData,
      imagesData,
      'https://example.com',
      lowContentHtml
    );

    // Verify ZERO fake modifier recommendations
    assert.strictEqual(result.recommended.length, 0, 'Expected 0 recommendations for low-content stub page');
    assert.ok(result.recommendationNotice, 'Expected recommendationNotice to explain low topical content');
    assert.ok(
      result.recommendationNotice.includes('insufficient topical content'),
      'Notice should state insufficient content'
    );

    const recKeywords = result.recommended.map((r) => r.keyword.toLowerCase());
    assert.ok(!recKeywords.includes('example domain checklist'));
    assert.ok(!recKeywords.includes('example domain guide'));
    assert.ok(!recKeywords.includes('example domain tools'));
    assert.ok(!recKeywords.includes('example domain best practices'));
  });

  test('Rule 2 & 9: Prevents generic modifier spam without contextual evidence', () => {
    const recommendations = generateRecommendedKeywords({
      primaryKeyword: 'technical seo audit',
      extractedKeywords: [
        {
          id: '1',
          keyword: 'technical seo audit',
          nGramType: '3-gram',
          category: 'primary',
          frequency: 5,
          density: 2.1,
          prominenceScore: 90,
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
      title: 'Technical SEO Audit Overview',
      h1: 'Technical SEO Audit Overview',
      metaDescription: 'An overview of technical seo auditing concepts.',
      headingsList: ['Technical SEO Audit Overview'],
      pageUrl: 'https://example.com/blog/technical-seo-audit',
      totalWords: 500,
      uniqueWords: 150,
    });

    const recKeywords = recommendations.map((r) => r.keyword.toLowerCase());

    // Without explicit "checklist" or "tools" mentions in text, modifier spam should NOT be generated
    assert.ok(!recKeywords.includes('technical seo audit checklist'));
    assert.ok(!recKeywords.includes('technical seo audit tools'));

    // Instead, legitimate domain knowledge content gaps should be recommended
    assert.ok(recKeywords.some((k) => k.includes('canonical') || k.includes('structured data') || k.includes('core web vitals')));
  });

  test('Rule 3 & 4: Recommends genuine missing subtopics based on domain topic structure', () => {
    const technicalSeoHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Technical SEO Audit &amp; Crawlability Analysis</title>
          <meta name="description" content="In-depth guide on analyzing website crawlability, server response codes, and robots.txt directives.">
        </head>
        <body>
          <h1>Technical SEO Audit &amp; Crawlability Analysis</h1>
          <p>A comprehensive technical SEO audit evaluates how search engine bots crawl and index your web pages across complex site architectures.</p>
          <p>We examine crawlability issues, robots.txt directives, indexation bloat, and server response codes across the entire domain infrastructure.</p>
          <h2>Analyzing Search Bot Crawlability</h2>
          <p>Search bot crawlability determines whether search engines can access your critical landing pages efficiently without hitting server timeouts or infinite redirect loops.</p>
          <h2>Robots.txt Directive Verification</h2>
          <p>Inspect disallowed parameters, verify crawl delay specifications, and ensure main CSS and JavaScript assets are not accidentally blocked by crawler rules.</p>
          <p>Webmasters must monitor crawl frequency, log file access, and HTTP response codes to maintain optimal search visibility and technical health across production web applications.</p>
        </body>
      </html>
    `;

    const onPageData: any = {
      title: 'Technical SEO Audit & Crawlability Analysis',
      metaDescription: 'In-depth guide on analyzing website crawlability, server response codes, and robots.txt directives.',
      headings: {
        items: [
          { level: 1, text: 'Technical SEO Audit & Crawlability Analysis' },
          { level: 2, text: 'Analyzing Search Bot Crawlability' },
          { level: 2, text: 'Robots.txt Directive Verification' },
        ],
      },
    };

    const linksData: any = { internalLinks: [], externalLinks: [] };
    const imagesData: any = { images: [] };

    const result = extractAndScoreKeywords(
      '',
      onPageData,
      linksData,
      imagesData,
      'https://example.com/blog/technical-seo-audit-crawlability',
      technicalSeoHtml
    );

    assert.ok(result.recommended.length > 0, 'Expected recommendations for rich content page');

    for (const rec of result.recommended) {
      assert.strictEqual(rec.source, 'RECOMMENDED');
      assert.ok(rec.qualityScore && rec.qualityScore >= 65, 'Quality score must be >= 65');
      assert.ok(rec.reason && rec.reason.length > 10, 'Must have informative reason');
      assert.ok(rec.evidence && rec.evidence.length >= 2, 'Must have at least 2 structured evidence items');
      assert.strictEqual(rec.externalSearchVolume, 'External SEO data unavailable');
      assert.strictEqual(rec.externalDifficulty, 'Requires SEO data provider');
    }

    const recKeywords = result.recommended.map((r) => r.keyword.toLowerCase());
    // Should recommend missing technical SEO subtopics (canonical tags, structured data, core web vitals, etc.)
    assert.ok(
      recKeywords.some(
        (k) =>
          k.includes('canonical') ||
          k.includes('structured data') ||
          k.includes('core web vitals') ||
          k.includes('sitemap')
      ),
      'Expected missing subtopics like canonical tags, structured data, or core web vitals'
    );
  });

  test('Rule 6 & 20E: Allows actionable modifiers ONLY when textual evidence is present', () => {
    const recommendations = generateRecommendedKeywords({
      primaryKeyword: 'technical seo audit',
      extractedKeywords: [],
      title: 'Complete Technical SEO Audit Checklist',
      h1: 'Complete Technical SEO Audit Checklist',
      metaDescription: 'Step by step verification checklist for technical SEO auditing.',
      headingsList: ['Complete Technical SEO Audit Checklist', 'Audit Steps & Checklist'],
      pageUrl: 'https://example.com/blog/technical-seo-audit-checklist',
      totalWords: 600,
      uniqueWords: 200,
    });

    const recKeywords = recommendations.map((r) => r.keyword.toLowerCase());
    // With explicit "checklist" in title and headings, "technical seo audit checklist" is authorized
    assert.ok(recKeywords.includes('technical seo audit checklist'));

    const checklistItem = recommendations.find((r) => r.keyword.toLowerCase() === 'technical seo audit checklist');
    assert.ok(checklistItem);
    assert.ok(checklistItem.evidence?.some((e) => e.includes('checklist')));
  });

  test('Rule 14 & 20F: Correctly classifies COMPETITOR_GAP source for competitor opportunities', () => {
    const recommendations = generateRecommendedKeywords({
      primaryKeyword: 'technical seo audit',
      extractedKeywords: [],
      title: 'Technical SEO Guide',
      h1: 'Technical SEO Guide',
      metaDescription: 'A technical seo overview.',
      headingsList: ['Technical SEO Guide'],
      pageUrl: 'https://example.com/blog/technical-seo',
      totalWords: 450,
      uniqueWords: 150,
      competitorKeywords: ['competitor link building audit', 'core web vitals benchmarking'],
    });

    const compGaps = recommendations.filter((r) => r.source === 'COMPETITOR_GAP');
    assert.ok(compGaps.length > 0, 'Expected COMPETITOR_GAP items when competitor keywords provided');

    for (const cg of compGaps) {
      assert.strictEqual(cg.source, 'COMPETITOR_GAP');
      assert.strictEqual(cg.semanticCategory, 'Competitor Gap');
      assert.ok(cg.reason && cg.reason.includes('Competitor Content Gap'));
    }
  });
});
