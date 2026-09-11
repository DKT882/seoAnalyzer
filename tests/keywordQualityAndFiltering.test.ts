import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractCleanContent } from '../lib/parser/contentExtractor';
import { isArtifactOrGarbage } from '../lib/nlp/artifactFilter';
import { calculateKeywordQualityScore, QUALITY_THRESHOLD } from '../lib/nlp/keywordQuality';
import { extractAndScoreKeywords } from '../lib/keywords/keywordExtractor';
import { decodeHtmlEntities, cleanRawText } from '../lib/nlp/textCleaner';

describe('Phase 1 - DOM Content & Tag Boundary Cleaning', () => {
  test('prevents block element tag-joining concatenations (e.g. 2026-09-11daily1)', () => {
    const rawHtml = `
      <html>
        <head><title>Technical SEO Audit Guide</title></head>
        <body>
          <nav><a href="/">Home</a><a href="/audit">Audit</a></nav>
          <h1>Technical SEO Audit Guide</h1>
          <p>Learn how to perform a comprehensive technical seo audit for your website.</p>
          <div><time>2026-09-11</time><span class="freq">daily</span><span>1</span></div>
          <div><span class="count">0</span><a href="https://example.com">https</a><span>hi</span></div>
          <footer><p>All rights reserved &copy; 2026</p></footer>
        </body>
      </html>
    `;

    const clean = extractCleanContent(rawHtml);
    assert.ok(!clean.cleanVisibleText.includes('2026-09-11daily1'), 'Should not contain 2026-09-11daily1');
    assert.ok(!clean.cleanVisibleText.includes('0https'), 'Should not contain 0https');
    assert.ok(clean.cleanVisibleText.includes('2026-09-11'), 'Should contain 2026-09-11');
    assert.ok(clean.cleanVisibleText.includes('daily'), 'Should contain daily');
  });

  test('strips non-content tags including scripts, styles, iframes, templates, and JSON-LD', () => {
    const rawHtml = `
      <html>
        <body>
          <script>const apiKey = "xyz123";</script>
          <style>.btn { color: red; }</style>
          <template><p>Template noise</p></template>
          <script type="application/ld+json">{"@context": "https://schema.org", "type": "Article"}</script>
          <h1>Core SEO Strategy</h1>
          <p>Discover modern search engine optimization tactics.</p>
        </body>
      </html>
    `;

    const clean = extractCleanContent(rawHtml);
    assert.ok(!clean.cleanVisibleText.includes('apiKey'));
    assert.ok(!clean.cleanVisibleText.includes('color: red'));
    assert.ok(!clean.cleanVisibleText.includes('Template noise'));
    assert.ok(clean.cleanVisibleText.includes('Core SEO Strategy'));
  });
});

describe('Phase 3 & 4 - Text Normalization & Artifact Filter', () => {
  test('correctly decodes HTML entities and normalizes Unicode', () => {
    const encoded = 'SEO &amp; SEM &ndash; What&#39;s New in 2026? &quot;Best Practices&quot; &bull; Expert Guide';
    const decoded = decodeHtmlEntities(encoded);
    assert.ok(decoded.includes('SEO & SEM'));
    assert.ok(decoded.includes("What's New in 2026?"));
    assert.ok(decoded.includes('"Best Practices"'));

    const cleaned = cleanRawText('Technical\u00A0SEO\u200B \u201CStrategy\u201D');
    assert.strictEqual(cleaned, 'Technical SEO "Strategy"');
  });

  test('rejects garbage and artifact tokens systematically', () => {
    const garbageExamples = [
      '2026-09-11daily1',
      '0https hi',
      'com tag',
      '2026-0-11daily1',
      '0https',
      '<br>',
      'href',
      'src',
      'www',
      'http',
      'https',
      'utm_source',
      'fbclid',
      '#ffffff',
      'abc123def456',
      '192.168.1.1',
      'all rights reserved',
      'privacy policy',
      'toggle navigation',
      '12:45:33',
      '2026-09-11',
    ];

    for (const g of garbageExamples) {
      assert.strictEqual(isArtifactOrGarbage(g), true, `Expected "${g}" to be classified as artifact/garbage`);
    }
  });

  test('preserves legitimate alphanumeric and numeric SEO keywords', () => {
    const validExamples = [
      'iphone 17',
      'windows 11',
      'top 10 seo tools',
      '24/7 support',
      'b2b marketing',
      'technical seo',
      'technical seo audit',
      'how to improve website seo',
      'best seo tools for small business',
      'crawlability issues',
      'xml sitemap',
      'canonical tags',
    ];

    for (const v of validExamples) {
      assert.strictEqual(isArtifactOrGarbage(v), false, `Expected "${v}" to be preserved as valid SEO term`);
    }
  });
});

describe('Phase 6 & 7 - Keyword Quality Score (0-100)', () => {
  test('assigns scores below threshold (60) to low quality or artifact candidates', () => {
    assert.ok(calculateKeywordQualityScore('2026-09-11daily1') < QUALITY_THRESHOLD);
    assert.ok(calculateKeywordQualityScore('0https') < QUALITY_THRESHOLD);
    assert.ok(calculateKeywordQualityScore('and the') < QUALITY_THRESHOLD);
    assert.ok(calculateKeywordQualityScore('of the') < QUALITY_THRESHOLD);
    assert.ok(calculateKeywordQualityScore('click here') < QUALITY_THRESHOLD);
  });

  test('assigns high quality scores (>=60) to legitimate SEO keywords', () => {
    assert.ok(calculateKeywordQualityScore('technical seo audit', { inTitle: true, inH1: true }) >= 80);
    assert.ok(calculateKeywordQualityScore('top 10 seo tools', { inH2H6: true }) >= 70);
    assert.ok(calculateKeywordQualityScore('how to improve website seo', { inTitle: true }) >= 75);
    assert.ok(calculateKeywordQualityScore('iphone 17 case') >= 60);
  });
});

describe('Phase 8-14 - End-to-End Clean Keyword Extraction Pipeline', () => {
  const mockHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Technical SEO Audit Checklist &amp; Guide</title>
        <meta name="description" content="Complete step by step technical seo audit guide covering crawlability, indexability, XML sitemaps, and canonical tags.">
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/login">Login</a></nav>
        <main>
          <h1>Technical SEO Audit Checklist</h1>
          <p>Performing a thorough technical seo audit is vital for modern website visibility.</p>
          <p>A technical seo audit helps discover crawlability issues, broken links, and missing canonical tags.</p>
          
          <h2>How to Perform a Technical SEO Audit</h2>
          <p>Follow our technical seo audit workflow to verify XML sitemaps and improve search engine indexability.</p>
          
          <h2>Top 10 SEO Tools for Technical Auditing</h2>
          <p>Use industry standard crawling tools to analyze website performance and structured data schemas.</p>

          <p>Ensure your windows 11 workstation or mac has adequate memory for large crawls.</p>
        </main>
        <div><time>2026-09-11</time><span>daily</span><span>1</span></div>
        <footer><p>&copy; 2026 SEO Intel Pro. All rights reserved. <a href="/privacy">Privacy Policy</a></p></footer>
      </body>
    </html>
  `;

  const onPageData: any = {
    title: 'Technical SEO Audit Checklist & Guide',
    metaDescription: 'Complete step by step technical seo audit guide covering crawlability, indexability, XML sitemaps, and canonical tags.',
    headings: {
      items: [
        { level: 1, text: 'Technical SEO Audit Checklist' },
        { level: 2, text: 'How to Perform a Technical SEO Audit' },
        { level: 2, text: 'Top 10 SEO Tools for Technical Auditing' },
      ],
    },
  };

  const linksData: any = {
    internalLinks: [{ url: '/audit', text: 'Technical SEO Audit' }],
    externalLinks: [],
  };

  const imagesData: any = {
    images: [{ alt: 'Technical SEO Audit Diagram', src: 'audit.png' }],
  };

  test('extracts genuine keywords and rejects all HTML/date/URL artifacts', () => {
    const result = extractAndScoreKeywords(
      '',
      onPageData,
      linksData,
      imagesData,
      'https://example.com/technical-seo-audit',
      mockHtml
    );

    const keywordNames = result.all.map((k) => k.keyword.toLowerCase());

    // Check that garbage tokens ARE NOT present
    assert.ok(!keywordNames.includes('2026-09-11daily1'));
    assert.ok(!keywordNames.includes('0https'));
    assert.ok(!keywordNames.includes('https'));
    assert.ok(!keywordNames.includes('com tag'));
    assert.ok(!keywordNames.includes('all rights reserved'));
    assert.ok(!keywordNames.includes('privacy policy'));
    assert.ok(!keywordNames.includes('2026-09-11'));

    // Check that genuine keywords ARE present
    assert.ok(keywordNames.includes('technical seo audit'));
    assert.ok(keywordNames.some((k) => k.includes('seo') || k.includes('audit')));

    // Verify Source labels
    assert.ok(result.all.every((k) => k.source === 'EXTRACTED'));
    assert.ok(result.all.every((k) => (k.qualityScore || 0) >= 60));
  });

  test('determines primary keyword with confidence and verifiable evidence', () => {
    const result = extractAndScoreKeywords(
      '',
      onPageData,
      linksData,
      imagesData,
      'https://example.com/technical-seo-audit',
      mockHtml
    );

    assert.ok(result.primaryKeywordDetails);
    assert.ok(result.primaryKeywordDetails.keyword.toLowerCase().includes('technical seo audit'));
    assert.ok(result.primaryKeywordDetails.confidenceScore >= 70);
    assert.ok(result.primaryKeywordDetails.evidence.length > 0);
  });

  test('generates recommended keywords with explicit RECOMMENDED source and reasons', () => {
    const result = extractAndScoreKeywords(
      '',
      onPageData,
      linksData,
      imagesData,
      'https://example.com/technical-seo-audit',
      mockHtml
    );

    assert.ok(result.recommended);
    assert.ok(result.recommended.length > 0);

    for (const rec of result.recommended) {
      assert.strictEqual(rec.source, 'RECOMMENDED');
      assert.strictEqual(rec.externalSearchVolume, 'External SEO data unavailable');
      assert.strictEqual(rec.externalDifficulty, 'Requires SEO data provider');
      assert.ok(rec.reason);
      assert.ok((rec.qualityScore || 0) >= 60);
    }
  });
});
