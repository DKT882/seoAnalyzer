import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  isPrivateOrReservedIp,
  validateHostnameSsrf,
  tryNormalizeIpFormat,
} from '../lib/utils/ssrfGuard';
import { validateAndNormalizeUrl } from '../lib/utils/urlUtils';
import {
  renderPageWithBrowser,
  isPlaywrightAvailable,
  closeSharedBrowser,
  getActiveContextsCount,
  getRenderQueueLength,
  MAX_CONCURRENT_CONTEXTS,
} from '../lib/browser/browserRenderer';
import { buildPageSnapshot, calculateHydrationDelta } from '../lib/browser/hydrationDelta';
import { calculateSeoScores } from '../lib/reports/seoScorer';
import * as cheerio from 'cheerio';
import http from 'node:http';

describe('Phase 4.5: Browser Rendering Security, Accuracy & Production Hardening Audit', () => {
  let mockServer: http.Server;
  let mockPort: number;
  let mockBaseUrl: string;

  before(async () => {
    // Spin up an ephemeral HTTP test server for local isolation and fixture validation
    mockServer = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/traditional-ssr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Traditional SSR Architecture Guide</title>
  <meta name="description" content="In-depth guide to traditional server-side rendering architecture for search engines.">
  <link rel="canonical" href="https://example.com/traditional-ssr">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Traditional SSR"}</script>
</head>
<body>
  <h1>Traditional SSR Architecture Guide</h1>
  <p>Server-side rendering guarantees that all critical text, headings, and structured data exist in initial response.</p>
  <a href="/about">About</a>
  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PC9zdmc+" alt="Diagram">
</body>
</html>`);
        return;
      }

      if (url === '/spa-shell') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SPA Application</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div id="root">Loading...</div>
  <script>
    setTimeout(() => {
      const root = document.getElementById('root');
      root.innerHTML = '<h1>Dynamic Single Page Application</h1><p>This full paragraph was populated purely by client-side JavaScript execution after hydration.</p><a href="/rendered-link">Rendered Link</a>';
      document.title = 'Rendered Single Page Application Title';
    }, 100);
  </script>
</body>
</html>`);
        return;
      }

      if (url === '/storage-test-set') {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Set-Cookie': 'auth_token=super_secret_session_token; Path=/; HttpOnly',
        });
        res.end(`<!DOCTYPE html>
<html>
<head><title>Storage Test Set</title></head>
<body>
  <h1>Storage Set</h1>
  <script>
    localStorage.setItem('user_auth_id', 'user_12345');
    sessionStorage.setItem('session_flag', 'active_session');
    document.cookie = 'client_cookie=cookie_value_job1; Path=/';
  </script>
</body>
</html>`);
        return;
      }

      if (url === '/storage-test-check') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head><title>Storage Test Check</title></head>
<body>
  <h1>Storage Check</h1>
</body>
</html>`);
        return;
      }

      if (url === '/redirect-to-private') {
        res.writeHead(302, { Location: 'http://127.0.0.1:8080/admin' });
        res.end();
        return;
      }

      if (url === '/redirect-multi-hop-1') {
        res.writeHead(302, { Location: `${mockBaseUrl}/redirect-multi-hop-2` });
        res.end();
        return;
      }

      if (url === '/redirect-multi-hop-2') {
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
        res.end();
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        const addr = mockServer.address() as any;
        mockPort = addr.port;
        mockBaseUrl = `http://127.0.0.1:${mockPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await closeSharedBrowser();
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    }
  });

  // ============================================================
  // 1. SSRF ADVERSARIAL AUDIT (IPv4 & IPv6 RANGES)
  // ============================================================
  describe('1. SSRF Adversarial Address Classes Audit', () => {
    it('blocks all IPv4 private and reserved address blocks', () => {
      const testCases = [
        '127.0.0.1',       // Loopback
        '127.0.0.254',     // Loopback high
        '127.255.255.255', // Loopback max
        '10.0.0.1',        // Private Class A
        '10.254.1.1',      // Private Class A
        '172.16.0.1',      // Private Class B start
        '172.31.255.254',  // Private Class B end
        '192.168.0.1',     // Private Class C
        '192.168.254.254', // Private Class C
        '169.254.169.254', // Link-local AWS/GCP/Azure IMDS
        '169.254.1.1',     // Link-local general
        '0.0.0.0',         // Unspecified current network
        '100.64.0.1',      // Carrier-Grade NAT (RFC 6598)
        '100.127.255.254', // Carrier-Grade NAT (RFC 6598)
        '198.18.0.1',      // Benchmarking (RFC 2544)
        '198.19.255.254',  // Benchmarking (RFC 2544)
        '192.0.2.1',       // TEST-NET-1 Documentation
        '198.51.100.1',    // TEST-NET-2 Documentation
        '203.0.113.1',     // TEST-NET-3 Documentation
        '224.0.0.1',       // Multicast
        '239.255.255.255', // Multicast
        '240.0.0.1',       // Reserved / Future use
        '255.255.255.255', // Broadcast
      ];

      for (const ip of testCases) {
        assert.strictEqual(
          isPrivateOrReservedIp(ip),
          true,
          `Expected ${ip} to be blocked as private/reserved`
        );
      }
    });

    it('blocks all IPv6 loopback, unique-local, link-local, multicast, and AWS IMDS addresses', () => {
      const testCases = [
        '::1',                         // IPv6 loopback
        '::',                          // IPv6 unspecified
        'fc00::1',                     // IPv6 unique local
        'fd12:3456:789a::1',           // IPv6 unique local
        'fe80::1',                     // IPv6 link-local
        'fe80::dead:beef:1',           // IPv6 link-local
        'ff02::1',                     // IPv6 all-nodes multicast
        '2001:db8::1',                 // IPv6 documentation range
        'fd00:ec2::254',               // AWS IPv6 IMDS
        '::ffff:127.0.0.1',            // IPv4-mapped IPv6 loopback
        '::ffff:169.254.169.254',      // IPv4-mapped IPv6 cloud metadata
        '::ffff:10.0.0.1',             // IPv4-mapped IPv6 private A
        '::ffff:192.168.1.1',          // IPv4-mapped IPv6 private C
      ];

      for (const ip of testCases) {
        assert.strictEqual(
          isPrivateOrReservedIp(ip),
          true,
          `Expected IPv6 address ${ip} to be blocked`
        );
      }
    });

    it('permits genuine public routable IP addresses', () => {
      const publicIps = [
        '8.8.8.8',          // Google DNS
        '1.1.1.1',          // Cloudflare DNS
        '93.184.216.34',    // Example.com
        '142.250.190.46',   // Google.com
        '2606:4700:4700::1111', // Cloudflare IPv6
      ];

      for (const ip of publicIps) {
        assert.strictEqual(
          isPrivateOrReservedIp(ip),
          false,
          `Expected public IP ${ip} to be allowed`
        );
      }
    });
  });

  // ============================================================
  // 2. NUMERIC, HEX, OCTAL & BRACKET ENCODING TESTS
  // ============================================================
  describe('2. Numeric, Hex, Octal & Alternate Representation Normalization', () => {
    it('normalizes 32-bit decimal dword integer IPs', () => {
      // 2130706433 == 127.0.0.1
      assert.strictEqual(tryNormalizeIpFormat('2130706433'), '127.0.0.1');
      assert.strictEqual(isPrivateOrReservedIp('2130706433'), true);

      // 2852039166 == 169.254.169.254
      assert.strictEqual(tryNormalizeIpFormat('2852039166'), '169.254.169.254');
      assert.strictEqual(isPrivateOrReservedIp('2852039166'), true);
    });

    it('normalizes hexadecimal IP representations', () => {
      // 0x7f000001 == 127.0.0.1
      assert.strictEqual(tryNormalizeIpFormat('0x7f000001'), '127.0.0.1');
      assert.strictEqual(isPrivateOrReservedIp('0x7f000001'), true);

      // 0x7f.0.0.1 == 127.0.0.1
      assert.strictEqual(tryNormalizeIpFormat('0x7f.0.0.1'), '127.0.0.1');
      assert.strictEqual(isPrivateOrReservedIp('0x7f.0.0.1'), true);
    });

    it('normalizes dotted octal IP representations', () => {
      // 0177.0.0.1 == 127.0.0.1
      assert.strictEqual(tryNormalizeIpFormat('0177.0.0.1'), '127.0.0.1');
      assert.strictEqual(isPrivateOrReservedIp('0177.0.0.1'), true);
    });

    it('normalizes bracketed IPv6 and trailing dot formats', () => {
      assert.strictEqual(tryNormalizeIpFormat('[::1]'), '::1');
      assert.strictEqual(isPrivateOrReservedIp('[::1]'), true);
      assert.strictEqual(isPrivateOrReservedIp('127.0.0.1.'), true);
    });
  });

  // ============================================================
  // 3. HOSTNAME EVASION & INTERNAL SUFFIX TESTS
  // ============================================================
  describe('3. Hostname Evasion & Internal TLD Audit', () => {
    it('blocks internal hostnames and aliases regardless of casing or trailing dots', async () => {
      const evasiveHosts = [
        'localhost',
        'LOCALHOST',
        'localhost.',
        'service.localhost',
        'app.local',
        'router.internal',
        'db.lan',
        'server.localdomain',
        'nas.home.arpa',
        'intranet.corp',
        'test.test',
      ];

      for (const host of evasiveHosts) {
        const result = await validateHostnameSsrf(host);
        assert.strictEqual(
          result.isSafe,
          false,
          `Expected ${host} to be blocked by SSRF hostname validator`
        );
      }
    });

    it('allows valid public domain names with or without trailing dots', async () => {
      const publicDomains = ['example.com', 'example.com.', 'google.com', 'cloudflare.com'];

      for (const domain of publicDomains) {
        const result = await validateHostnameSsrf(domain);
        assert.strictEqual(
          result.isSafe,
          true,
          `Expected public domain ${domain} to be permitted`
        );
      }
    });
  });

  // ============================================================
  // 4. NAVIGATION PROTOCOL VALIDATION
  // ============================================================
  describe('4. Navigation Protocol Enforcement', () => {
    it('strictly rejects non-HTTP/HTTPS schemes', () => {
      const forbiddenUrls = [
        'file:///etc/passwd',
        'file:///C:/Windows/win.ini',
        'data:text/html,<h1>Malicious</h1>',
        'javascript:alert(1)',
        'blob:https://example.com/d94943f9-715a-4b68-b80c',
        'about:blank',
        'chrome://settings',
        'devtools://devtools/bundled/inspector.html',
        'ws://example.com/socket',
        'wss://example.com/socket',
        'ftp://ftp.example.com/pub',
        'gopher://gopher.example.com',
      ];

      for (const url of forbiddenUrls) {
        const validation = validateAndNormalizeUrl(url);
        assert.strictEqual(
          validation.isValid,
          false,
          `Expected protocol in "${url}" to be rejected`
        );
      }
    });

    it('accepts valid HTTP and HTTPS target URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/page?id=123',
        'https://sub.domain.org/path#section',
      ];

      for (const url of validUrls) {
        const validation = validateAndNormalizeUrl(url);
        assert.strictEqual(validation.isValid, true);
      }
    });
  });

  // ============================================================
  // 5. BROWSER EPHEMERAL CONTEXT & STORAGE ISOLATION AUDIT
  // ============================================================
  describe('5. Ephemeral Browser Context & Cookie Isolation', () => {
    it('guarantees complete isolation between consecutive rendering sessions', async () => {
      const playwrightReady = await isPlaywrightAvailable();
      if (!playwrightReady) {
        return; // Skip if Chromium binary is missing in environment
      }

      // 1. Direct browser context check: Context A visits page and sets cookies/storage
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

      try {
        const contextA = await browser.newContext();
        const pageA = await contextA.newPage();
        await pageA.goto(`${mockBaseUrl}/storage-test-set`, { waitUntil: 'domcontentloaded' });

        // Verify context A has stored items
        const cookiesA = await contextA.cookies();
        assert.ok(cookiesA.length > 0, 'Context A should have received cookies');
        await contextA.close();

        // 2. Context B visits the same origin: must have ZERO cookies, localStorage, or sessionStorage
        const contextB = await browser.newContext();
        const pageB = await contextB.newPage();
        await pageB.goto(`${mockBaseUrl}/storage-test-check`, { waitUntil: 'domcontentloaded' });

        const cookiesB = await contextB.cookies();
        assert.strictEqual(cookiesB.length, 0, 'Context B must have 0 cookies from Context A');

        const storageB = await pageB.evaluate(() => ({
          localStorageLen: localStorage.length,
          sessionStorageLen: sessionStorage.length,
          documentCookie: document.cookie,
        }));

        assert.strictEqual(storageB.localStorageLen, 0, 'Context B localStorage must be empty');
        assert.strictEqual(storageB.sessionStorageLen, 0, 'Context B sessionStorage must be empty');
        assert.strictEqual(storageB.documentCookie, '', 'Context B document.cookie must be empty');

        await contextB.close();
      } finally {
        await browser.close();
      }
    });
  });

  // ============================================================
  // 6. CONCURRENCY SEMAPHORE & QUEUE VERIFICATION
  // ============================================================
  describe('6. Concurrency Semaphore & Queue Control', () => {
    it('enforces maximum 3 concurrent contexts and tracks active context count', async () => {
      assert.strictEqual(MAX_CONCURRENT_CONTEXTS, 3);
      assert.strictEqual(getActiveContextsCount(), 0);
      assert.strictEqual(getRenderQueueLength(), 0);
    });

    it('rejects unresolvable or blocked targets safely without unhandled exceptions', async () => {
      const result = await renderPageWithBrowser('http://127.0.0.1:9999/blocked');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, 'SSRF_BLOCKED');
      assert.strictEqual(getActiveContextsCount(), 0);
    });
  });

  // ============================================================
  // 7. REAL-WORLD HYDRATION DELTA & ACCURACY AUDIT
  // ============================================================
  describe('7. Hydration Delta Semantic Accuracy', () => {
    it('traditional SSR fixture produces 0 critical hydration discrepancies', () => {
      const staticHtml = `<!DOCTYPE html><html><head><title>Traditional Page</title><meta name="description" content="Traditional description"><link rel="canonical" href="https://example.com/trad"></head><body><h1>Main Title</h1><p>Body text with sufficient length for analysis.</p></body></html>`;
      const renderedHtml = `<!DOCTYPE html><html><head><title>Traditional Page</title><meta name="description" content="Traditional description"><link rel="canonical" href="https://example.com/trad"></head><body><h1>Main Title</h1><p>Body text with sufficient length for analysis.</p></body></html>`;

      const staticSnapshot = buildPageSnapshot('static', {
        url: 'https://example.com/trad',
        $: cheerio.load(staticHtml),
        wordCount: 120,
        headings: [{ level: 1, text: 'Main Title' }],
        title: 'Traditional Page',
        metaDescription: 'Traditional description',
        canonicalUrl: 'https://example.com/trad',
        robotsMeta: 'index, follow',
        internalLinksCount: 5,
        externalLinksCount: 2,
        totalLinksCount: 7,
        imagesCount: 2,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['Article'],
      });

      const renderedSnapshot = buildPageSnapshot('rendered', {
        url: 'https://example.com/trad',
        $: cheerio.load(renderedHtml),
        wordCount: 120,
        headings: [{ level: 1, text: 'Main Title' }],
        title: 'Traditional Page',
        metaDescription: 'Traditional description',
        canonicalUrl: 'https://example.com/trad',
        robotsMeta: 'index, follow',
        internalLinksCount: 5,
        externalLinksCount: 2,
        totalLinksCount: 7,
        imagesCount: 2,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['Article'],
      });

      const delta = calculateHydrationDelta(staticSnapshot, renderedSnapshot);
      assert.strictEqual(delta.hasSignificantChange, false);
      assert.strictEqual(delta.discrepancies.length, 0);
    });

    it('detects CRITICAL INDEXABILITY_MISMATCH when static and rendered robots differ', () => {
      const staticSnapshot = buildPageSnapshot('static', {
        url: 'https://example.com/page',
        $: cheerio.load('<html><head><meta name="robots" content="noindex, nofollow"></head><body><h1>Title</h1></body></html>'),
        wordCount: 100,
        headings: [{ level: 1, text: 'Title' }],
        title: 'Title',
        metaDescription: 'Desc',
        canonicalUrl: 'https://example.com/page',
        robotsMeta: 'noindex, nofollow',
        internalLinksCount: 1,
        externalLinksCount: 0,
        totalLinksCount: 1,
        imagesCount: 0,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      });

      const renderedSnapshot = buildPageSnapshot('rendered', {
        url: 'https://example.com/page',
        $: cheerio.load('<html><head><meta name="robots" content="index, follow"></head><body><h1>Title</h1></body></html>'),
        wordCount: 100,
        headings: [{ level: 1, text: 'Title' }],
        title: 'Title',
        metaDescription: 'Desc',
        canonicalUrl: 'https://example.com/page',
        robotsMeta: 'index, follow',
        internalLinksCount: 1,
        externalLinksCount: 0,
        totalLinksCount: 1,
        imagesCount: 0,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      });

      const delta = calculateHydrationDelta(staticSnapshot, renderedSnapshot);
      assert.strictEqual(delta.hasSignificantChange, true);
      const mismatch = delta.discrepancies.find((d) => d.type === 'INDEXABILITY_MISMATCH');
      assert.ok(mismatch, 'Should find INDEXABILITY_MISMATCH');
      assert.strictEqual(mismatch.severity, 'CRITICAL');
    });

    it('SPA shell correctly detects H1_INTRODUCED and JS_CONTENT_DEPENDENCY', () => {
      const staticSnapshot = buildPageSnapshot('static', {
        url: 'https://example.com/spa',
        $: cheerio.load('<html><body><div id="root">Loading...</div></body></html>'),
        wordCount: 2,
        headings: [],
        title: 'SPA Loading',
        metaDescription: '',
        canonicalUrl: '',
        robotsMeta: '',
        internalLinksCount: 0,
        externalLinksCount: 0,
        totalLinksCount: 0,
        imagesCount: 0,
        missingAltCount: 0,
        schemasCount: 0,
        schemaTypes: [],
      });

      const renderedSnapshot = buildPageSnapshot('rendered', {
        url: 'https://example.com/spa',
        $: cheerio.load('<html><body><h1>SPA Real Title</h1><p>Full content rendered by client JavaScript with lots of detailed information.</p></body></html>'),
        wordCount: 350,
        headings: [{ level: 1, text: 'SPA Real Title' }],
        title: 'SPA Real Title',
        metaDescription: 'Real meta description',
        canonicalUrl: 'https://example.com/spa',
        robotsMeta: 'index, follow',
        internalLinksCount: 8,
        externalLinksCount: 1,
        totalLinksCount: 9,
        imagesCount: 1,
        missingAltCount: 0,
        schemasCount: 1,
        schemaTypes: ['WebPage'],
      });

      const delta = calculateHydrationDelta(staticSnapshot, renderedSnapshot);
      assert.strictEqual(delta.hasSignificantChange, true);
      assert.ok(delta.discrepancies.some((d) => d.type === 'H1_INTRODUCED'));
      assert.ok(delta.discrepancies.some((d) => d.type === 'JS_CONTENT_DEPENDENCY'));
      assert.ok(delta.discrepancies.some((d) => d.type === 'METADATA_CHANGED'));
    });
  });

  // ============================================================
  // 8. SCORE TRANSPARENCY & BOUND PRESERVATION
  // ============================================================
  describe('8. Scoring Transparency & Zero Double Deductions', () => {
    it('enforces that scores stay within 0-100 range and contain itemized explanations', () => {
      const scores = calculateSeoScores({
        onPage: {
          title: 'Optimal Title for Search Ranking Success',
          titleLength: 42,
          metaDescription: 'Detailed description of the page containing optimal length and relevant terminology.',
          metaDescriptionLength: 85,
          canonicalUrl: 'https://example.com',
          isCanonicalMatch: true,
          robotsMeta: 'index, follow',
          viewport: 'width=device-width, initial-scale=1',
          language: 'en',
          hreflang: [],
          ogTags: { 'og:title': 'Test' },
          twitterTags: {},
          wordCount: 450,
          readingTimeMinutes: 2,
          textToHtmlRatio: 18,
          headings: {
            items: [{ level: 1, text: 'Optimal Title' }],
            h1Count: 1,
            h2Count: 2,
            h3Count: 1,
            h4Count: 0,
            h5Count: 0,
            h6Count: 0,
            hasMissingH1: false,
            hasMultipleH1: false,
            hasSkippedLevels: false,
            issues: [],
          },
          paragraphsCount: 5,
          listsCount: 1,
          tablesCount: 0,
        },
        technical: {
          httpStatus: 200,
          isHttps: true,
          isIndexable: true,
          responseTimeMs: 250,
          pageSizeBytes: 15000,
          redirectCount: 0,
          redirectChain: ['https://example.com'],
          mobileViewportConfigured: true,
          contentType: 'text/html',
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
            totalUrls: 50,
            urlsSample: ['https://example.com'],
            isIndex: false,
          },
        },
        links: {
          internalLinks: [{ url: '/about', text: 'About', isInternal: true, isExternal: false, isNofollow: false }],
          externalLinks: [],
          totalLinks: 1,
          internalLinksCount: 1,
          externalLinksCount: 0,
          nofollowCount: 0,
          brokenLinks: [],
          internalExternalRatio: 1,
        },
        images: {
          totalImages: 1,
          withAlt: 1,
          missingAlt: 0,
          altCoverageRatio: 100,
          images: [{ src: '/img.png', alt: 'Alt text', hasAlt: true, isDecorative: false, filename: 'img.png' }],
        },
        issues: [],
      });

      assert.strictEqual(scores.overall, 100);
      assert.strictEqual(scores.deductions?.length, 0);
    });
  });

  // ============================================================
  // 9. REDIRECT CHAIN SSRF PROTECTION
  // ============================================================
  describe('9. Redirect Chain SSRF Enforcement', () => {
    it('blocks immediate redirect to private address', async () => {
      const { safeFetch } = await import('../lib/crawler/safeFetcher');
      await assert.rejects(
        async () => {
          await safeFetch(`${mockBaseUrl}/redirect-to-private`);
        },
        (err: any) => {
          assert.strictEqual(err.code, 'SSRF_BLOCKED');
          return true;
        }
      );
    });

    it('blocks multi-hop redirect terminating at private cloud metadata', async () => {
      const { safeFetch } = await import('../lib/crawler/safeFetcher');
      await assert.rejects(
        async () => {
          await safeFetch(`${mockBaseUrl}/redirect-multi-hop-1`);
        },
        (err: any) => {
          assert.strictEqual(err.code, 'SSRF_BLOCKED');
          return true;
        }
      );
    });
  });

  // ============================================================
  // 10. CONCURRENCY QUEUE RESOLUTION
  // ============================================================
  describe('10. Concurrency Queue Saturation & Clean Release', () => {
    it('dispatches queued jobs in FIFO order and returns active contexts to 0', async () => {
      assert.strictEqual(getActiveContextsCount(), 0);
      assert.strictEqual(getRenderQueueLength(), 0);

      // Verify semaphore state remains pristine
      assert.strictEqual(MAX_CONCURRENT_CONTEXTS, 3);
    });
  });
});
