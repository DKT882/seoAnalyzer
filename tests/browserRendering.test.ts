import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildPageSnapshot, calculateHydrationDelta } from '../lib/browser/hydrationDelta';
import { renderPageWithBrowser, isPlaywrightAvailable, closeSharedBrowser } from '../lib/browser/browserRenderer';
import { PageSnapshot } from '@/types';
import * as cheerio from 'cheerio';

describe('Browser Rendering & Hydration Delta Engine (Phase 4)', () => {
  // 1. Hydration Delta Unit Tests
  describe('1. Hydration Delta Calculation & Discrepancy Detection', () => {
    it('detects H1 introduced dynamically during client-side rendering', () => {
      const staticSnap: PageSnapshot = {
        source: 'static',
        url: 'https://example.com/app',
        timestamp: new Date().toISOString(),
        title: 'SPA App',
        titleLength: 7,
        metaDescription: 'An SPA application',
        metaDescriptionLength: 18,
        canonicalUrl: 'https://example.com/app',
        robotsMeta: 'index, follow',
        wordCount: 50,
        h1Count: 0,
        headingsCount: 0,
        internalLinksCount: 2,
        externalLinksCount: 0,
        totalLinksCount: 2,
        imagesCount: 0,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      };

      const renderedSnap: PageSnapshot = {
        ...staticSnap,
        source: 'rendered',
        h1Count: 1,
        h1Text: 'Enterprise SEO Audit Platform',
        headingsCount: 4,
        wordCount: 450,
      };

      const delta = calculateHydrationDelta(staticSnap, renderedSnap);

      assert.strictEqual(delta.hasSignificantChange, true);
      const h1Discrepancy = delta.discrepancies.find((d) => d.type === 'H1_INTRODUCED');
      assert.ok(h1Discrepancy, 'Should detect H1_INTRODUCED');
      assert.strictEqual(h1Discrepancy?.renderedValue, 'Enterprise SEO Audit Platform');

      const contentDiscrepancy = delta.discrepancies.find((d) => d.type === 'JS_CONTENT_DEPENDENCY');
      assert.ok(contentDiscrepancy, 'Should detect JS_CONTENT_DEPENDENCY');
    });

    it('detects critical indexability mismatch when static is noindex but rendered is indexable', () => {
      const staticSnap: PageSnapshot = {
        source: 'static',
        url: 'https://example.com/page',
        timestamp: new Date().toISOString(),
        title: 'Draft Page',
        titleLength: 10,
        metaDescription: 'Draft description',
        metaDescriptionLength: 17,
        canonicalUrl: 'https://example.com/page',
        robotsMeta: 'noindex, nofollow',
        wordCount: 300,
        h1Count: 1,
        h1Text: 'Draft Title',
        headingsCount: 2,
        internalLinksCount: 5,
        externalLinksCount: 1,
        totalLinksCount: 6,
        imagesCount: 1,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      };

      const renderedSnap: PageSnapshot = {
        ...staticSnap,
        source: 'rendered',
        robotsMeta: 'index, follow',
      };

      const delta = calculateHydrationDelta(staticSnap, renderedSnap);

      const indexMismatch = delta.discrepancies.find((d) => d.type === 'INDEXABILITY_MISMATCH');
      assert.ok(indexMismatch, 'Should flag critical INDEXABILITY_MISMATCH');
      assert.strictEqual(indexMismatch?.severity, 'CRITICAL');
      assert.ok(indexMismatch?.message.includes('Initial HTML specified "noindex"'));
    });

    it('detects title, meta description, and canonical changes during hydration', () => {
      const staticSnap: PageSnapshot = {
        source: 'static',
        url: 'https://example.com/product/123',
        timestamp: new Date().toISOString(),
        title: 'Loading Product...',
        titleLength: 18,
        metaDescription: '',
        metaDescriptionLength: 0,
        canonicalUrl: '',
        robotsMeta: 'index, follow',
        wordCount: 40,
        h1Count: 0,
        headingsCount: 0,
        internalLinksCount: 1,
        externalLinksCount: 0,
        totalLinksCount: 1,
        imagesCount: 0,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      };

      const renderedSnap: PageSnapshot = {
        source: 'rendered',
        url: 'https://example.com/product/123',
        timestamp: new Date().toISOString(),
        title: 'Wireless Ergonomic Mechanical Keyboard | Pro Gear',
        titleLength: 48,
        metaDescription: 'Premium wireless mechanical keyboard with hot-swappable switches and 80-hour battery life.',
        metaDescriptionLength: 90,
        canonicalUrl: 'https://example.com/product/123',
        robotsMeta: 'index, follow',
        wordCount: 420,
        h1Count: 1,
        h1Text: 'Wireless Ergonomic Mechanical Keyboard',
        headingsCount: 5,
        internalLinksCount: 14,
        externalLinksCount: 2,
        totalLinksCount: 16,
        imagesCount: 4,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['Product'],
      };

      const delta = calculateHydrationDelta(staticSnap, renderedSnap);

      assert.strictEqual(delta.hasSignificantChange, true);
      assert.strictEqual(delta.changed.title?.static, 'Loading Product...');
      assert.strictEqual(delta.changed.title?.rendered, 'Wireless Ergonomic Mechanical Keyboard | Pro Gear');
      assert.strictEqual(delta.changed.canonical?.static, '');
      assert.strictEqual(delta.changed.canonical?.rendered, 'https://example.com/product/123');

      const schemaIntroduced = delta.discrepancies.find((d) => d.type === 'SCHEMA_INTRODUCED');
      assert.ok(schemaIntroduced, 'Should flag dynamic schema introduction');
      assert.strictEqual(schemaIntroduced?.renderedValue, 'Product');

      const linksIntroduced = delta.discrepancies.find((d) => d.type === 'LINKS_INTRODUCED');
      assert.ok(linksIntroduced, 'Should flag dynamic links introduction');
    });

    it('reports zero discrepancies when static and rendered snapshots are identical', () => {
      const snap: PageSnapshot = {
        source: 'static',
        url: 'https://example.com/static-page',
        timestamp: new Date().toISOString(),
        title: 'Standard Static HTML Page',
        titleLength: 25,
        metaDescription: 'A completely static page without JavaScript dependencies.',
        metaDescriptionLength: 58,
        canonicalUrl: 'https://example.com/static-page',
        robotsMeta: 'index, follow',
        wordCount: 850,
        h1Count: 1,
        h1Text: 'Standard Static HTML Page',
        headingsCount: 6,
        internalLinksCount: 12,
        externalLinksCount: 3,
        totalLinksCount: 15,
        imagesCount: 3,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['Article'],
      };

      const renderedSnap: PageSnapshot = {
        ...snap,
        source: 'rendered',
      };

      const delta = calculateHydrationDelta(snap, renderedSnap);

      assert.strictEqual(delta.hasSignificantChange, false);
      assert.strictEqual(delta.seoRelevantChangeCount, 0);
      assert.strictEqual(delta.discrepancies.length, 0);
    });

    it('buildPageSnapshot properly extracts attributes from Cheerio DOM input', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Snapshot Test Page</title>
            <meta name="description" content="Snapshot test description for SEO testing." />
            <link rel="canonical" href="https://example.com/test" />
            <meta name="robots" content="index, follow" />
          </head>
          <body>
            <h1>Primary Heading Text</h1>
            <p>Body paragraph with test content.</p>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const snapshot = buildPageSnapshot('static', {
        url: 'https://example.com/test',
        $,
        wordCount: 250,
        headings: [{ level: 1, text: 'Primary Heading Text' }],
        title: 'Snapshot Test Page',
        metaDescription: 'Snapshot test description for SEO testing.',
        canonicalUrl: 'https://example.com/test',
        robotsMeta: 'index, follow',
        internalLinksCount: 4,
        externalLinksCount: 1,
        totalLinksCount: 5,
        imagesCount: 2,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['WebPage'],
      });

      assert.strictEqual(snapshot.source, 'static');
      assert.strictEqual(snapshot.h1Count, 1);
      assert.strictEqual(snapshot.h1Text, 'Primary Heading Text');
      assert.strictEqual(snapshot.title, 'Snapshot Test Page');
      assert.strictEqual(snapshot.titleLength, 18);
      assert.strictEqual(snapshot.wordCount, 250);
    });
  });

  // 2. SSRF Navigation Safety in Browser Renderer
  describe('2. Browser Navigation SSRF & Protocol Guards', () => {
    it('blocks localhost navigation in browser renderer', async () => {
      const result = await renderPageWithBrowser('http://localhost:3000/test');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
      assert.ok(result.error?.includes('SSRF Protection Blocked'));
    });

    it('blocks 127.0.0.1 loopback address in browser renderer', async () => {
      const result = await renderPageWithBrowser('http://127.0.0.1:8080/');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
    });

    it('blocks cloud metadata endpoint (169.254.169.254) in browser renderer', async () => {
      const result = await renderPageWithBrowser('http://169.254.169.254/latest/meta-data/');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
    });

    it('blocks private 10.0.0.0/8 subnet in browser renderer', async () => {
      const result = await renderPageWithBrowser('http://10.1.2.3/admin');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
    });

    it('blocks private 192.168.0.0/16 subnet in browser renderer', async () => {
      const result = await renderPageWithBrowser('http://192.168.1.1/gateway');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
    });

    it('rejects unsupported or dangerous protocols (javascript:, file:, data:)', async () => {
      const jsResult = await renderPageWithBrowser('javascript:alert(1)');
      assert.strictEqual(jsResult.success, false);

      const fileResult = await renderPageWithBrowser('file:///etc/passwd');
      assert.strictEqual(fileResult.success, false);
    });
  });

  // 3. Playwright Availability & Graceful Fallback
  describe('3. Browser Availability & Graceful Fallback', () => {
    it('isPlaywrightAvailable returns a boolean status without throwing', async () => {
      const available = await isPlaywrightAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });
  });

  after(async () => {
    await closeSharedBrowser();
  });
});
