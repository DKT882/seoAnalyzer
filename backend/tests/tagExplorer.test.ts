import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { extractTagExplorerData } from '../src/parser/tagExplorer.js';

describe('Tag & Page Element Explorer', () => {
  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEO Tools for Growth - Comprehensive Guide</title>
  <meta name="description" content="Discover actionable SEO tools, keyword strategies, and technical auditing to grow organic traffic.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="canonical" href="https://example.com/seo-tools">
  <meta property="og:title" content="SEO Tools for Growth">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "SEO Tools for Growth"
  }
  </script>
</head>
<body>
  <h1>SEO Tools for Growth</h1>
  <h2>Keyword Research Mastery</h2>
  <h3>Long-Tail Opportunities</h3>
  <p>First paragraph introducing SEO intelligence.</p>
  <p>Second paragraph explaining how to outrank competitors.</p>
  <ul>
    <li>Keyword research</li>
    <li>Technical audit</li>
  </ul>
  <table>
    <tr><th>Feature</th><th>Benefit</th></tr>
    <tr><td>Audit</td><td>Fix errors</td></tr>
  </table>
  <a href="https://example.com/pricing">Internal Pricing Link</a>
  <a href="https://google.com" rel="nofollow">External Link</a>
  <img src="https://example.com/hero.png" alt="SEO Dashboard Hero" width="800" height="400" loading="lazy">
</body>
</html>`;

  test('categorizes and extracts metadata, headings, social, content, links, images, and schema', () => {
    const $ = cheerio.load(sampleHtml);
    const data = extractTagExplorerData($, 'https://example.com/seo-tools');

    assert.ok(data.totalElementsCount > 10, 'Expected multiple elements categorized');
    assert.equal(data.metadata.length >= 5, true, 'Expected metadata elements');
    assert.equal(data.headings.length >= 3, true, 'Expected H1, H2, H3 headings');
    assert.equal(data.social.length >= 2, true, 'Expected OG and Twitter elements');
    assert.equal(data.content.length >= 3, true, 'Expected paragraphs, lists, tables');
    assert.equal(data.links.length >= 2, true, 'Expected internal and external links');
    assert.equal(data.images.length >= 1, true, 'Expected images with ALT');
    assert.equal(data.structuredData.length >= 1, true, 'Expected JSON-LD schemas');
  });

  test('flags missing elements with actionable recommendations', () => {
    const empty$ = cheerio.load('<html><body>No content</body></html>');
    const data = extractTagExplorerData(empty$, 'https://example.com/empty');

    const titleItem = data.metadata.find((m) => m.name === 'Page Title');
    assert.equal(titleItem?.status, 'CRITICAL');
    assert.ok(titleItem?.recommendation.includes('<title>'));

    const h1Item = data.headings.find((h) => h.tag === '<h1>');
    assert.equal(h1Item?.status, 'CRITICAL');
  });
});
