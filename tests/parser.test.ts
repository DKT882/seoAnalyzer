import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseHtmlContent } from '../lib/parser/htmlParser';
import { extractPageMetadata } from '../lib/seo/metadataExtractor';
import { analyzeLinks } from '../lib/links/linkAnalyzer';
import { analyzeImages } from '../lib/images/imageAnalyzer';
import { extractStructuredData } from '../lib/schema/schemaExtractor';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete Guide to Modern SEO & Web Performance</title>
  <meta name="description" content="Discover actionable strategies for on-page SEO, keyword optimization, and technical performance auditing.">
  <link rel="canonical" href="https://example.com/guide">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Modern SEO & Web Performance">
  <meta property="og:description" content="Actionable strategies for on-page SEO.">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Modern SEO Guide",
      "author": {
        "@type": "Person",
        "name": "Jane Doe"
      }
    }
  </script>
</head>
<body>
  <h1>Modern SEO Guide for Developers</h1>
  <p>Search engine optimization requires technical performance, content structure, and keyword relevance.</p>
  <h2>Understanding Keyword Intent</h2>
  <p>Keyword research helps identify primary topics and long-tail opportunities.</p>
  <h3>Long-Tail Keyword Targeting</h3>
  <p>Long-tail keywords often have higher conversion intent and lower competition.</p>
  <a href="/pricing">View Pricing</a>
  <a href="https://external-resource.org/docs" rel="nofollow">External Docs</a>
  <img src="/assets/diagram.png" alt="SEO Architecture Diagram" width="800" height="400">
  <img src="/assets/icon.svg" role="presentation" alt="">
</body>
</html>
`;

describe('HTML Parser & SEO Signal Extractors', () => {
  it('extracts visible text and structural statistics', () => {
    const parsed = parseHtmlContent(SAMPLE_HTML);
    assert.strictEqual(parsed.wordCount > 30, true);
    assert.strictEqual(parsed.headings.h1Count, 1);
    assert.strictEqual(parsed.headings.h2Count, 1);
    assert.strictEqual(parsed.headings.h3Count, 1);
    assert.strictEqual(parsed.headings.hasMissingH1, false);
    assert.strictEqual(parsed.headings.hasMultipleH1, false);
    assert.strictEqual(parsed.headings.hasSkippedLevels, false);
  });

  it('extracts metadata and social tags accurately', () => {
    const parsed = parseHtmlContent(SAMPLE_HTML);
    const metadata = extractPageMetadata(parsed.$, 'https://example.com/guide');

    assert.strictEqual(metadata.title, 'Complete Guide to Modern SEO & Web Performance');
    assert.strictEqual(metadata.isCanonicalMatch, true);
    assert.strictEqual(metadata.language, 'en');
    assert.strictEqual(metadata.viewport, 'width=device-width, initial-scale=1.0');
    assert.strictEqual(metadata.ogTags['og:title'], 'Modern SEO & Web Performance');
    assert.strictEqual(metadata.twitterTags['twitter:card'], 'summary_large_image');
  });

  it('classifies internal vs external links and extracts anchor text', () => {
    const parsed = parseHtmlContent(SAMPLE_HTML);
    const links = analyzeLinks(parsed.$, 'https://example.com/guide');

    assert.strictEqual(links.totalLinks, 2);
    assert.strictEqual(links.internalLinksCount, 1);
    assert.strictEqual(links.externalLinksCount, 1);
    assert.strictEqual(links.nofollowCount, 1);
    assert.strictEqual(links.internalLinks[0].url, 'https://example.com/pricing');
    assert.strictEqual(links.internalLinks[0].text, 'View Pricing');
  });

  it('analyzes image ALT attributes and decorative tags', () => {
    const parsed = parseHtmlContent(SAMPLE_HTML);
    const images = analyzeImages(parsed.$, 'https://example.com/guide');

    assert.strictEqual(images.totalImages, 2);
    assert.strictEqual(images.withAlt, 1);
    assert.strictEqual(images.missingAlt, 0); // Second image is marked role="presentation" decorative
  });

  it('extracts and parses JSON-LD structured data', () => {
    const parsed = parseHtmlContent(SAMPLE_HTML);
    const schemas = extractStructuredData(parsed.$);

    assert.strictEqual(schemas.length, 1);
    assert.strictEqual(schemas[0].type, 'Article');
    assert.strictEqual(schemas[0].isValid, true);
  });
});
