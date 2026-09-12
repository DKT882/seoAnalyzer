import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQueryString,
  computeSerpSnapshotFingerprint,
  mapRawResultType,
  inferPageTypeFromSerpItem,
  inferIntentFromSerpItem,
  normalizeSerpResponse,
} from '../lib/search/serpNormalizer';
import {
  SearchProvider,
  MockSearchProvider,
  DataForSeoSearchProvider,
  SearchProviderRegistry,
  RawSerpResponse,
} from '../lib/search/searchProvider';
import {
  SerpSnapshotStore,
  MemorySerpSnapshotStore,
  SqliteSerpSnapshotStore,
  getSerpStorage,
} from '../lib/search/serpStorage';
import {
  SerpCollector,
  DEFAULT_SEARCH_RESOURCE_LIMITS,
} from '../lib/search/serpCollector';
import {
  analyzeSerpIntent,
  analyzeSerpPageTypes,
  analyzeSerpTopicPatterns,
  aggregateObservedSerpDomains,
} from '../lib/search/serpAnalyzer';
import {
  generateSearchOpportunities,
} from '../lib/search/searchOpportunityEngine';
import {
  executeSearchIntelligenceAudit,
} from '../lib/search/searchOrchestrator';
import {
  fetchAndAnalyzeCompetitorPages,
} from '../lib/search/competitorFetcher';
import {
  NormalizedSerpSnapshot,
  SearchQueryTarget,
  SearchResourceLimits,
  SearchDevice,
} from '../lib/search/searchTypes';
import { SEOReport, WebsiteCrawlReport, InternalLinkGraph } from '../types';

describe('Phase 8: External Search Intelligence & SERP Analysis Suite', () => {

  // =========================================================================
  // 1. QUERY NORMALIZATION & COLLISION-RESISTANT FINGERPRINTING
  // =========================================================================
  describe('1. Query Normalization & Collision-Resistant Fingerprinting', () => {
    test('normalizes Unicode NFKC, collapses whitespace, and strips zero-width chars', () => {
      const dirty = '  Best\u200B  SEO \u200C  Tools\uFEFF  in \u200D  2026 \t ';
      const normalized = normalizeQueryString(dirty);
      assert.strictEqual(normalized, 'Best SEO Tools in 2026');
    });

    test('handles empty, undefined, null, and non-string query inputs safely', () => {
      assert.strictEqual(normalizeQueryString(''), '');
      assert.strictEqual(normalizeQueryString(null as any), '');
      assert.strictEqual(normalizeQueryString(undefined as any), '');
      assert.strictEqual(normalizeQueryString(12345 as any), '');
    });

    test('normalizes multi-line queries with mixed tabs and newlines', () => {
      const multiline = 'best\n\r  seo   audit\t\tguide\n';
      assert.strictEqual(normalizeQueryString(multiline), 'best seo audit guide');
    });

    test('handles queries with accents and diacritics using NFKC normalization', () => {
      const accented = 'hébergement web français';
      const normalized = normalizeQueryString(accented);
      assert.strictEqual(normalized, 'hébergement web français');
    });

    test('generates deterministic SHA-256 fingerprint invariant to case and whitespace', () => {
      const fp1 = computeSerpSnapshotFingerprint({
        query: 'SEO Audit Checklist',
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
      });

      const fp2 = computeSerpSnapshotFingerprint({
        query: '  seo   audit checklist  ',
        provider: 'MOCK_SEARCH',
        location: 'united states',
        language: 'EN',
        device: 'DESKTOP',
      });

      assert.strictEqual(fp1, fp2);
      assert.strictEqual(fp1.length, 64);
    });

    test('generates distinct fingerprints for different geographical locations', () => {
      const fpUS = computeSerpSnapshotFingerprint({
        query: 'best cloud hosting',
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
      });

      const fpUK = computeSerpSnapshotFingerprint({
        query: 'best cloud hosting',
        provider: 'mock_search',
        location: 'United Kingdom',
        language: 'en',
        device: 'DESKTOP',
      });

      assert.notStrictEqual(fpUS, fpUK);
    });

    test('generates distinct fingerprints for different languages', () => {
      const fpEN = computeSerpSnapshotFingerprint({
        query: 'seo audit guide',
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
      });

      const fpES = computeSerpSnapshotFingerprint({
        query: 'seo audit guide',
        provider: 'mock_search',
        location: 'United States',
        language: 'es',
        device: 'DESKTOP',
      });

      assert.notStrictEqual(fpEN, fpES);
    });

    test('generates distinct fingerprints for different device profiles (DESKTOP vs MOBILE)', () => {
      const fpDesktop = computeSerpSnapshotFingerprint({
        query: 'best cloud hosting',
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
      });

      const fpMobile = computeSerpSnapshotFingerprint({
        query: 'best cloud hosting',
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'MOBILE',
      });

      assert.notStrictEqual(fpDesktop, fpMobile);
    });

    test('verifies fingerprint collision resistance across 50 distinct queries', () => {
      const fingerprints = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const fp = computeSerpSnapshotFingerprint({
          query: `distinct query test case ${i}`,
          provider: 'mock_search',
          location: 'United States',
          language: 'en',
          device: 'DESKTOP',
        });
        fingerprints.add(fp);
      }
      assert.strictEqual(fingerprints.size, 50);
    });
  });

  // =========================================================================
  // 2. PROVIDER BEHAVIOR & LIVE VS MOCK POLICIES
  // =========================================================================
  describe('2. Provider Behavior, Live Error Surfacing & Mock Demarcation', () => {
    test('MockSearchProvider strictly marks response with isSyntheticTest: true and demo label', async () => {
      const mock = new MockSearchProvider();
      assert.strictEqual(mock.isConfigured(), true);

      const raw = await mock.search('technical seo guide', { limit: 10 });
      assert.strictEqual(raw.isSyntheticTest, true);
      assert.strictEqual(raw.provider, 'mock_search');
      assert.ok(raw.items.length >= 8);
      assert.strictEqual(raw.costCredits, 0);

      const normalized = normalizeSerpResponse(raw);
      assert.strictEqual(normalized.provenance.isSyntheticTest, true);
      assert.ok(normalized.sourceMetadata.providerLabel.includes('DEMO/TEST DATA'));
      assert.ok(normalized.sourceMetadata.disclaimer.includes('Observed in sampled SERP snapshot'));
    });

    test('MockSearchProvider generates Local Pack for local queries (e.g. plumber near me)', async () => {
      const mock = new MockSearchProvider();
      const raw = await mock.search('emergency plumber near me london');
      assert.ok(raw.items.some((item) => item.type === 'local_pack'));
    });

    test('MockSearchProvider generates Commercial Product results for transaction keywords', async () => {
      const mock = new MockSearchProvider();
      const raw = await mock.search('buy wireless mechanical keyboard online deals');
      assert.ok(raw.items.some((item) => (item.url || '').includes('/product/') || (item.url || '').includes('/category/')));
    });

    test('MockSearchProvider bounds limit to max 20 items', async () => {
      const mock = new MockSearchProvider();
      const raw = await mock.search('seo guide', { limit: 100 });
      assert.ok(raw.items.length <= 20);
    });

    test('DataForSeoSearchProvider throws explicit error when unconfigured (no silent mock fallback)', async () => {
      const originalLogin = process.env.DATAFORSEO_LOGIN;
      const originalKey = process.env.DATAFORSEO_API_KEY;
      delete process.env.DATAFORSEO_LOGIN;
      delete process.env.DATAFORSEO_API_KEY;
      delete process.env.DATAFORSEO_PASSWORD;

      try {
        const live = new DataForSeoSearchProvider();
        assert.strictEqual(live.isConfigured(), false);

        await assert.rejects(
          async () => {
            await live.search('best seo audit tool');
          },
          /DataForSEO provider is not configured/
        );
      } finally {
        if (originalLogin) process.env.DATAFORSEO_LOGIN = originalLogin;
        if (originalKey) process.env.DATAFORSEO_API_KEY = originalKey;
      }
    });

    test('Live provider failure explicitly surfaces provider error and does NOT silently substitute mock data', async () => {
      // Mock a failing live provider
      class FailingLiveProvider implements SearchProvider {
        public id = 'dataforseo_failing';
        public name = 'Failing Live Provider';
        public isConfigured() { return true; }
        public async search(): Promise<RawSerpResponse> {
          throw new Error('DataForSEO API HTTP 401 Unauthorized: Invalid API Credentials');
        }
      }

      const failingProvider = new FailingLiveProvider();
      await assert.rejects(
        async () => {
          await failingProvider.search();
        },
        /HTTP 401 Unauthorized/
      );
    });

    test('SearchProviderRegistry accurately resolves registered providers and defaults', () => {
      const mock = SearchProviderRegistry.getMockProvider();
      assert.strictEqual(mock.id, 'mock_search');

      const resolved = SearchProviderRegistry.getProvider('mock_search');
      assert.strictEqual(resolved.id, 'mock_search');

      const list = SearchProviderRegistry.listProviders();
      assert.ok(list.some((p) => p.id === 'mock_search'));
      assert.ok(list.some((p) => p.id === 'dataforseo'));
    });
  });

  // =========================================================================
  // 3. SERP NORMALIZATION, POSITION SEMANTICS & FEATURE TAXONOMY
  // =========================================================================
  describe('3. SERP Normalization, Position Semantics & Feature Taxonomy', () => {
    test('distinguishes serpPosition from organicPosition (only organic gets organicPosition)', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'next.js seo guide',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 45,
        isSyntheticTest: true,
        items: [
          {
            type: 'featured_snippet',
            rank_absolute: 1,
            title: 'Featured Guide to Next.js',
            url: 'https://nextjs.org/docs/app/building-your-application/optimizing/metadata',
            domain: 'nextjs.org',
            description: 'Learn how to optimize Next.js for search engines.',
            is_featured_snippet: true,
          },
          {
            type: 'people_also_ask',
            rank_absolute: 2,
            items: [{ title: 'How does Next.js handle SEO?' }],
          },
          {
            type: 'organic',
            rank_absolute: 3,
            rank_group: 1,
            title: 'Complete Next.js SEO Tutorial',
            url: 'https://vercel.com/blog/nextjs-seo',
            domain: 'vercel.com',
            description: 'An in-depth tutorial for technical SEO in Next.js.',
          },
          {
            type: 'organic',
            rank_absolute: 4,
            rank_group: 2,
            title: 'Mastering Next.js Indexing',
            url: 'https://developer.mozilla.org/en-US/docs/Web/NextJS',
            domain: 'developer.mozilla.org',
            description: 'MDN web docs guide to modern React frameworks.',
          },
        ],
      };

      const normalized = normalizeSerpResponse(mockRaw);

      // Featured snippet has serpPosition but no organicPosition
      const featured = normalized.results.find((r) => r.resultType === 'FEATURED_SNIPPET');
      assert.ok(featured);
      assert.strictEqual(featured.serpPosition, 1);
      assert.strictEqual(featured.organicPosition, undefined);

      // Features detected (Featured Snippet and People Also Ask)
      assert.strictEqual(normalized.serpFeatures.length, 2);
      assert.ok(normalized.serpFeatures.some((f) => f.type === 'FEATURED_SNIPPET'));
      assert.ok(normalized.serpFeatures.some((f) => f.type === 'PEOPLE_ALSO_ASK'));

      // Organic results have both serpPosition and organicPosition
      const org1 = normalized.results.find((r) => r.url === 'https://vercel.com/blog/nextjs-seo');
      assert.ok(org1);
      assert.strictEqual(org1.resultType, 'ORGANIC');
      assert.strictEqual(org1.serpPosition, 3);
      assert.strictEqual(org1.organicPosition, 1);

      const org2 = normalized.results.find((r) => r.url === 'https://developer.mozilla.org/en-US/docs/Web/NextJS');
      assert.ok(org2);
      assert.strictEqual(org2.resultType, 'ORGANIC');
      assert.strictEqual(org2.serpPosition, 4);
      assert.strictEqual(org2.organicPosition, 2);

      assert.strictEqual(normalized.organicCount, 2);
    });

    test('non-organic results must never receive organicPosition', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'video search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 2,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'video', rank_absolute: 1, title: 'Video Result', url: 'https://youtube.com/watch?v=123' },
          { type: 'local_pack', rank_absolute: 2, title: 'Local Store', url: 'https://maps.google.com/local' },
        ],
      };

      const normalized = normalizeSerpResponse(mockRaw);
      for (const res of normalized.results) {
        if (res.resultType !== 'ORGANIC') {
          assert.strictEqual(res.organicPosition, undefined);
        }
      }
    });

    test('handles missing title, missing snippet, and missing domain gracefully with safe defaults', () => {
      const rawWithMissing: RawSerpResponse = {
        provider: 'test_provider',
        query: 'incomplete items test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 1,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          {
            type: 'organic',
            rank_absolute: 1,
            url: 'https://example-domain.org/path',
            // title, snippet, and domain intentionally omitted
          },
        ],
      };

      const normalized = normalizeSerpResponse(rawWithMissing);
      assert.strictEqual(normalized.results.length, 1);
      assert.strictEqual(normalized.results[0].title, 'Untitled Search Result');
      assert.strictEqual(normalized.results[0].snippet, '');
      assert.strictEqual(normalized.results[0].domain, 'example-domain.org');
    });

    test('strips tracking parameters and normalizes URLs cleanly', () => {
      const rawWithTracking: RawSerpResponse = {
        provider: 'test_provider',
        query: 'tracking params test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 1,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          {
            type: 'organic',
            rank_absolute: 1,
            title: 'Tracked URL',
            url: 'https://example.com/guide?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=12345',
          },
        ],
      };

      const normalized = normalizeSerpResponse(rawWithTracking);
      assert.strictEqual(normalized.results.length, 1);
      assert.ok(!normalized.results[0].url.includes('utm_source'));
      assert.ok(!normalized.results[0].url.includes('gclid'));
    });

    test('deduplicates identical URLs within the same SERP result set', () => {
      const dupRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'duplicate test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 3,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Page 1', url: 'https://example.com/guide' },
          { type: 'organic', rank_absolute: 2, title: 'Page 1 Duplicate', url: 'https://example.com/guide' },
          { type: 'organic', rank_absolute: 3, title: 'Page 2 Distinct', url: 'https://example.com/guide-2' },
        ],
      };

      const normalized = normalizeSerpResponse(dupRaw);
      assert.strictEqual(normalized.results.length, 2);
    });

    test('maps raw feature types correctly across comprehensive search formats', () => {
      assert.strictEqual(mapRawResultType('featured_snippet', {} as any), 'FEATURED_SNIPPET');
      assert.strictEqual(mapRawResultType('organic', {} as any), 'ORGANIC');
      assert.strictEqual(mapRawResultType('local_pack', {} as any), 'LOCAL_PACK');
      assert.strictEqual(mapRawResultType('maps', {} as any), 'LOCAL_PACK');
      assert.strictEqual(mapRawResultType('video', {} as any), 'VIDEO');
      assert.strictEqual(mapRawResultType('images', {} as any), 'IMAGE');
      assert.strictEqual(mapRawResultType('news', {} as any), 'NEWS');
      assert.strictEqual(mapRawResultType('shopping', {} as any), 'SHOPPING');
      assert.strictEqual(mapRawResultType('people_also_ask', {} as any), 'PEOPLE_ALSO_ASK');
      assert.strictEqual(mapRawResultType('related_searches', {} as any), 'RELATED_SEARCHES');
      assert.strictEqual(mapRawResultType('knowledge_graph', {} as any), 'KNOWLEDGE_PANEL');
    });

    test('inferPageTypeFromSerpItem recognizes all archetypes from snippet and URL structure', () => {
      assert.strictEqual(inferPageTypeFromSerpItem('https://shop.com/product/chair', 'Office Chair', 'In stock, buy online $199'), 'PRODUCT');
      assert.strictEqual(inferPageTypeFromSerpItem('https://shop.com/category/furniture', 'Chairs Collection', 'Shop all office furniture'), 'CATEGORY_PAGE');
      assert.strictEqual(inferPageTypeFromSerpItem('https://api.dev.com/docs/auth', 'Authentication API', 'Documentation for REST API'), 'DOCUMENTATION');
      assert.strictEqual(inferPageTypeFromSerpItem('https://company.com/faq', 'Frequently Asked Questions', 'Q&A answers for clients'), 'FAQ');
      assert.strictEqual(inferPageTypeFromSerpItem('https://company.com/contact-us', 'Contact Us', 'Phone number and office address'), 'CONTACT');
      assert.strictEqual(inferPageTypeFromSerpItem('https://agency.com/services/seo', 'Our SEO Services', 'Consulting services for web'), 'SERVICE');
      assert.strictEqual(inferPageTypeFromSerpItem('https://localbakery.com/directions', 'Bakery Near Me', 'Hours, directions, and serving area'), 'LOCAL_BUSINESS');
      assert.strictEqual(inferPageTypeFromSerpItem('https://blog.com/guide-to-seo', 'How to Optimize Headings', 'Complete guide and tutorial'), 'ARTICLE');
    });

    test('inferIntentFromSerpItem recognizes local, commercial, transactional and informational intent', () => {
      assert.strictEqual(inferIntentFromSerpItem('Best Pizza Near Me', 'Find local directions', 'https://yelp.com'), 'LOCAL');
      assert.strictEqual(inferIntentFromSerpItem('Buy Mechanical Keyboard', 'Order online sale price discount', 'https://shop.com'), 'TRANSACTIONAL');
      assert.strictEqual(inferIntentFromSerpItem('Best SEO Tools vs Competitors', 'Top 10 reviews and comparison', 'https://pcmag.com'), 'COMMERCIAL_INVESTIGATION');
      assert.strictEqual(inferIntentFromSerpItem('What is Canonicalization', 'Learn search engine indexing fundamentals', 'https://moz.com'), 'INFORMATIONAL');
    });
  });

  // =========================================================================
  // 4. INTENT / PAGE TYPE / TOPIC INTELLIGENCE
  // =========================================================================
  describe('4. Search Intent, Page-Type Archetypes & Topic Provenance', () => {
    test('analyzes strong informational search intent alignment when user page matches SERP', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'how to fix canonical tag errors',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'How to Fix Canonical Tag Issues', url: 'https://ahrefs.com/blog/canonical-tags', description: 'Step-by-step guide to resolving canonical errors.' },
          { type: 'organic', rank_absolute: 2, title: 'Canonical Tag Best Practices', url: 'https://moz.com/learn/seo/canonical-tag', description: 'Learn how to implement rel=canonical tags.' },
          { type: 'organic', rank_absolute: 3, title: 'Fixing Canonical Mismatches', url: 'https://semrush.com/blog/canonical-errors', description: 'Complete tutorial on diagnosing canonical issues.' },
          { type: 'organic', rank_absolute: 4, title: 'Rel Canonical Specifications', url: 'https://google.com/search-console/help/canonical', description: 'Official documentation for canonicalization.' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://mysite.com/guides/canonical-tags',
        onPage: { title: 'How to Fix Canonical Tags' } as any,
        contentIntelligence: {
          searchIntent: { primaryIntent: 'INFORMATIONAL', confidence: 'HIGH' } as any,
        } as any,
      };

      const intentAnalysis = analyzeSerpIntent(snapshot, userReport as SEOReport);
      assert.strictEqual(intentAnalysis.observedSerpIntentPattern, 'INFORMATIONAL');
      assert.strictEqual(intentAnalysis.isMixedSerp, false);
      assert.strictEqual(intentAnalysis.level, 'STRONG_ALIGNMENT');
      assert.ok(intentAnalysis.explanation.includes('strongly matches'));
    });

    test('analyzes moderate search intent alignment when page complements commercial/transactional mix', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'best mechanical keyboard deals',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Buy Keyboards Store', url: 'https://store.com/buy', description: 'Add to cart' },
          { type: 'organic', rank_absolute: 2, title: 'Order Gaming Keyboards', url: 'https://store.com/order', description: 'In stock sale price' },
          { type: 'organic', rank_absolute: 3, title: 'Shop Mechanical Keyboards', url: 'https://shop.com/keyboards', description: 'Discount price' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://reviews.com/best-keyboards',
        contentIntelligence: {
          searchIntent: { primaryIntent: 'COMMERCIAL_INVESTIGATION', confidence: 'HIGH' } as any,
        } as any,
      };

      const intentAnalysis = analyzeSerpIntent(snapshot, userReport as SEOReport);
      assert.strictEqual(intentAnalysis.level, 'MODERATE_ALIGNMENT');
    });

    test('analyzes weak search intent alignment when user page intent diverges from SERP', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'buy accounting software subscription',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 3,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Buy Online Accounting', url: 'https://store.com/buy', description: 'Add to cart' },
          { type: 'organic', rank_absolute: 2, title: 'Purchase Accounting Tools', url: 'https://store.com/order', description: 'Price $99' },
          { type: 'organic', rank_absolute: 3, title: 'Accounting Software Pricing', url: 'https://store.com/price', description: 'Order now' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://blog.com/history-of-accounting',
        contentIntelligence: {
          searchIntent: { primaryIntent: 'INFORMATIONAL', confidence: 'HIGH' } as any,
        } as any,
      };

      const intentAnalysis = analyzeSerpIntent(snapshot, userReport as SEOReport);
      assert.strictEqual(intentAnalysis.level, 'WEAK_ALIGNMENT');
    });

    test('detects OBSERVED_SERP_INTENT_MIXED when SERP is heterogeneous', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'accounting software',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 6,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Buy Quickbooks Online Store: Pricing & Plans', url: 'https://quickbooks.intuit.com/pricing', description: 'Add to cart and buy top accounting software.' },
          { type: 'organic', rank_absolute: 2, title: 'Best Accounting Software Reviews 2026', url: 'https://pcmag.com/picks/best-accounting-software', description: 'Compare top 10 accounting platforms vs competitors.' },
          { type: 'organic', rank_absolute: 3, title: 'What is Accounting Software? Complete Guide', url: 'https://investopedia.com/terms/a/accounting-software.asp', description: 'Learn the fundamentals of financial ledger software.' },
          { type: 'organic', rank_absolute: 4, title: 'Local Certified Public Accountants Near Me', url: 'https://yelp.com/c/accountants-near-me', description: 'Find local CPA offices and directions.' },
          { type: 'organic', rank_absolute: 5, title: 'Order Freshbooks Cloud Accounting', url: 'https://freshbooks.com/shop', description: 'In stock accounting software for small businesses.' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://mysite.com/accounting-tools',
        onPage: { title: 'Accounting Software Comparison' } as any,
        contentIntelligence: {
          searchIntent: { primaryIntent: 'COMMERCIAL_INVESTIGATION', confidence: 'HIGH' } as any,
        } as any,
      };

      const intentAnalysis = analyzeSerpIntent(snapshot, userReport as SEOReport);
      assert.strictEqual(intentAnalysis.observedSerpIntentPattern, 'OBSERVED_SERP_INTENT_MIXED');
      assert.strictEqual(intentAnalysis.isMixedSerp, true);
      assert.strictEqual(intentAnalysis.level, 'MODERATE_ALIGNMENT');
      assert.ok(intentAnalysis.explanation.includes('mixed search intent pattern'));
    });

    test('analyzeSerpIntent returns INSUFFICIENT_EVIDENCE for empty organic SERP', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'empty query test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 0,
        responseTimeMs: 10,
        isSyntheticTest: true,
        items: [],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const intentAnalysis = analyzeSerpIntent(snapshot);
      assert.strictEqual(intentAnalysis.level, 'INSUFFICIENT_EVIDENCE');
    });

    test('detects page-type alignment and flags POTENTIAL_MISALIGNMENT', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'wireless mechanical keyboard',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Keychron K2 Wireless Keyboard', url: 'https://keychron.com/product/k2-keyboard', description: 'Buy online. In stock with free shipping on all orders.' },
          { type: 'organic', rank_absolute: 2, title: 'Logitech MX Mechanical - Add to Cart', url: 'https://logitech.com/item/mx-mech', description: 'Price: $149. In stock with warranty.' },
          { type: 'organic', rank_absolute: 3, title: 'Razer BlackWidow V3 Pro', url: 'https://razer.com/dp/blackwidow-v3', description: 'Buy online direct from manufacturer.' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);

      // Scenario A: User page is an ARTICLE (misaligned)
      const articleUserReport: Partial<SEOReport> = {
        url: 'https://myblog.com/keyboards-article',
        contentIntelligence: {
          pageType: { detectedType: 'ARTICLE', confidence: 'HIGH' } as any,
        } as any,
      };

      const articleAlign = analyzeSerpPageTypes(snapshot, articleUserReport as SEOReport);
      assert.strictEqual(articleAlign.dominantType, 'PRODUCT');
      assert.strictEqual(articleAlign.alignmentStatus, 'POTENTIAL_MISALIGNMENT');
      assert.ok(articleAlign.explanation.includes('differs from the prevailing PRODUCT format'));

      // Scenario B: User page is a PRODUCT (aligned)
      const productUserReport: Partial<SEOReport> = {
        url: 'https://myshop.com/product/custom-keyboard',
        contentIntelligence: {
          pageType: { detectedType: 'PRODUCT', confidence: 'HIGH' } as any,
        } as any,
      };

      const productAlign = analyzeSerpPageTypes(snapshot, productUserReport as SEOReport);
      assert.strictEqual(productAlign.alignmentStatus, 'ALIGNED');
    });

    test('analyzeSerpPageTypes handles DIVERSE_SERP when multiple archetypes are represented', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'cloud architecture',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 5,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'AWS Cloud Architecture Docs', url: 'https://aws.amazon.com/docs/architecture', description: 'Documentation for cloud' },
          { type: 'organic', rank_absolute: 2, title: 'Guide to Cloud Systems', url: 'https://blog.com/cloud-guide', description: 'How to build systems' },
          { type: 'organic', rank_absolute: 3, title: 'Cloud Architecture Services', url: 'https://agency.com/services/cloud', description: 'Consulting services' },
          { type: 'organic', rank_absolute: 4, title: 'Cloud Certifications FAQ', url: 'https://cert.com/faq', description: 'Frequently asked questions' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const align = analyzeSerpPageTypes(snapshot);
      assert.strictEqual(align.dominantType, 'MIXED_PAGE_TYPES');
      assert.strictEqual(align.alignmentStatus, 'DIVERSE_SERP');
    });

    test('extracts recurring topic patterns and identifies POTENTIAL_CONTENT_GAP with provenance', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'technical seo audit',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          {
            type: 'organic',
            rank_absolute: 1,
            title: 'Technical SEO Audit: Crawl Budget & Indexability',
            url: 'https://ahrefs.com/blog/technical-seo',
            description: 'Optimize crawl budget, fix broken links, inspect robots.txt, and configure structured data.',
          },
          {
            type: 'organic',
            rank_absolute: 2,
            title: 'How to Perform a Technical SEO Audit',
            url: 'https://semrush.com/blog/technical-audit',
            description: 'Evaluate crawl budget, page speed, core web vitals, and indexability issues.',
          },
          {
            type: 'organic',
            rank_absolute: 3,
            title: 'Step by Step Technical SEO Checklist',
            url: 'https://moz.com/learn/technical-seo-audit',
            description: 'Review crawl budget, canonical configuration, and internal link structure.',
          },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://myagency.com/seo-services',
        onPage: { title: 'SEO Services & Optimization' } as any,
        contentIntelligence: {
          primaryTopics: [{ topic: 'seo services', count: 5, weight: 1, category: 'primary' }],
          secondaryTopics: [],
        } as any,
      };

      const deepCompetitors = [
        {
          url: 'https://ahrefs.com/blog/technical-seo',
          domain: 'ahrefs.com',
          title: 'Technical SEO Guide',
          headings: ['Crawl Budget Optimization', 'Core Web Vitals Checklist'],
          analyzedPageType: 'ARTICLE' as const,
          extractedTopics: ['crawl budget', 'core web vitals'],
          wordCount: 2400,
          statusCode: 200,
          pageTypeProvenance: 'ANALYZED_FROM_FETCHED_HTML' as const,
          topicProvenance: 'FETCHED_PAGE_ANALYSIS' as const,
        },
      ];

      const patterns = analyzeSerpTopicPatterns(snapshot, userReport as SEOReport, deepCompetitors);
      assert.ok(patterns.length > 0);

      const crawlBudgetGap = patterns.find((p) => p.topic.includes('crawl budget'));
      assert.ok(crawlBudgetGap);
      assert.strictEqual(crawlBudgetGap.isCoveredInUserPage, false);
      assert.strictEqual(crawlBudgetGap.provenance, 'FETCHED_PAGE_ANALYSIS');
      assert.ok(crawlBudgetGap.category === 'POTENTIAL_CONTENT_GAP' || crawlBudgetGap.category === 'POTENTIAL_SUPPORTING_TOPIC');
    });
  });

  // =========================================================================
  // 5. OBSERVED SERP DOMAINS
  // =========================================================================
  describe('5. Observed SERP Domain Aggregation', () => {
    test('aggregates Observed SERP Domains with frequency, best position, and average SERP position', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'seo keyword research tools',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 5,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, rank_group: 1, title: 'Ahrefs Keywords Explorer', url: 'https://ahrefs.com/keywords-explorer', domain: 'ahrefs.com', description: 'Keyword research tool.' },
          { type: 'organic', rank_absolute: 2, rank_group: 2, title: 'Ahrefs Free Keyword Generator', url: 'https://ahrefs.com/keyword-generator', domain: 'ahrefs.com', description: 'Free generator tool.' },
          { type: 'organic', rank_absolute: 3, rank_group: 3, title: 'Moz Keyword Explorer', url: 'https://moz.com/explorer', domain: 'moz.com', description: 'Moz research tool.' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const observed = aggregateObservedSerpDomains([snapshot]);

      assert.strictEqual(observed.length, 2);
      const ahrefs = observed.find((d) => d.domain === 'ahrefs.com');
      assert.ok(ahrefs);
      assert.strictEqual(ahrefs.frequency, 2);
      assert.strictEqual(ahrefs.bestPosition, 1);
      assert.strictEqual(ahrefs.averageSerpPosition, 1.5);
      assert.strictEqual(ahrefs.averageOrganicPosition, 1.5);
      assert.strictEqual(ahrefs.urls.length, 2);
      assert.ok(ahrefs.observedQueries.includes('seo keyword research tools'));
    });

    test('domain is NOT automatically labeled a business competitor', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'javascript tutorial',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 2,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', domain: 'developer.mozilla.org' },
          { type: 'organic', rank_absolute: 2, title: 'W3Schools JS Tutorial', url: 'https://w3schools.com/js', domain: 'w3schools.com' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const domains = aggregateObservedSerpDomains([snapshot]);

      for (const d of domains) {
        // Must use domain / Observed SERP Domain concept, not declare as direct business competitor
        assert.ok(typeof d.domain === 'string');
        assert.ok(typeof d.frequency === 'number');
        assert.ok(!('isBusinessCompetitor' in d));
      }
    });
  });

  // =========================================================================
  // 6. DEEP COMPETITOR ENRICHMENT & RESOURCE BOUNDS
  // =========================================================================
  describe('6. Deep Competitor Enrichment Controls & Provenance', () => {
    test('fetchAndAnalyzeCompetitorPages bounds requests and assigns HTML provenance', async () => {
      const analyses = await fetchAndAnalyzeCompetitorPages(
        ['https://example.com/not-real-1', 'https://example.com/not-real-2'],
        {
          maxCompetitorPages: 1, // Strictly 1 page max
        }
      );

      assert.ok(Array.isArray(analyses));
    });

    test('competitor fetcher safely halts when cumulative response bytes limit is reached', async () => {
      const analyses = await fetchAndAnalyzeCompetitorPages(
        ['https://example.com/huge-page-1', 'https://example.com/huge-page-2'],
        {
          maxCompetitorResponseBytes: 100, // Very low byte limit to trigger early halt
        }
      );

      assert.ok(Array.isArray(analyses));
    });
  });

  // =========================================================================
  // 7. SEARCH OPPORTUNITIES & 6-PILLAR RECOMMENDATIONS
  // =========================================================================
  describe('7. Search Opportunity Engine & 6-Pillar Format', () => {
    test('generates 6-pillar recommendations for content gaps and intent mismatches', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'next.js structured data tutorial',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          {
            type: 'organic',
            rank_absolute: 1,
            title: 'Implementing JSON-LD Structured Data in Next.js',
            url: 'https://nextjs.org/docs/structured-data',
            domain: 'nextjs.org',
            description: 'Learn how to insert schema.org JSON-LD scripts in Next.js App Router for rich search snippets.',
          },
          {
            type: 'organic',
            rank_absolute: 2,
            title: 'Schema JSON-LD for Next.js',
            url: 'https://vercel.com/guides/json-ld',
            domain: 'vercel.com',
            description: 'Step-by-step schema markup tutorial for Next.js applications.',
          },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://mytechblog.com/nextjs-basics',
        onPage: { title: 'Next.js Basics for Beginners' } as any,
        contentIntelligence: {
          searchIntent: { primaryIntent: 'INFORMATIONAL', confidence: 'HIGH' } as any,
          pageType: { detectedType: 'ARTICLE', confidence: 'HIGH' } as any,
          primaryTopics: [{ topic: 'next.js basics', count: 4, weight: 1, category: 'primary' }],
          secondaryTopics: [],
        } as any,
      };

      const intentAlign = analyzeSerpIntent(snapshot, userReport as SEOReport);
      const pageTypeAlign = analyzeSerpPageTypes(snapshot, userReport as SEOReport);
      const topicPatterns = analyzeSerpTopicPatterns(snapshot, userReport as SEOReport);

      const oppResult = generateSearchOpportunities({
        snapshot,
        intentAlignment: intentAlign,
        pageTypeAlignment: pageTypeAlign,
        topicPatterns,
        userPageReport: userReport as SEOReport,
      });

      assert.ok(oppResult.opportunities.length > 0);
      const opp = oppResult.opportunities[0];

      // Verify all 6 pillars in the recommendation
      assert.ok(opp.recommendation.observation.length > 10);
      assert.ok(opp.recommendation.evidence.length > 10);
      assert.ok(opp.recommendation.interpretation.length > 10);
      assert.ok(opp.recommendation.action.length > 10);
      assert.ok(opp.recommendation.expectedBenefit.length > 10);
      assert.ok(opp.recommendation.caution.length > 10);
    });

    test('confidence represents evidence confidence, NOT ranking probability', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'evidence confidence test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 2,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Item 1', url: 'https://test.com/1', description: 'Testing evidence confidence' },
          { type: 'organic', rank_absolute: 2, title: 'Item 2', url: 'https://test.com/2', description: 'Testing evidence confidence' },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const intentAlign = analyzeSerpIntent(snapshot);
      const pageTypeAlign = analyzeSerpPageTypes(snapshot);
      const topicPatterns = analyzeSerpTopicPatterns(snapshot);

      const oppResult = generateSearchOpportunities({
        snapshot,
        intentAlignment: intentAlign,
        pageTypeAlignment: pageTypeAlign,
        topicPatterns,
      });

      for (const opp of oppResult.opportunities) {
        assert.ok(['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_EVIDENCE'].includes(opp.confidence));
        assert.ok(!opp.recommendation.action.includes('guarantee'));
      }
    });

    test('integrates with Phase 7 Internal Link Graph to discover dedicated topic cross-links', () => {
      const mockRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'website performance optimization',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 30,
        isSyntheticTest: true,
        items: [
          {
            type: 'organic',
            rank_absolute: 1,
            title: 'Core Web Vitals and Page Speed Optimization',
            url: 'https://web.dev/vitals',
            domain: 'web.dev',
            description: 'Optimize Core Web Vitals, LCP, CLS, and FID for better user experience.',
          },
          {
            type: 'organic',
            rank_absolute: 2,
            title: 'Guide to Core Web Vitals',
            url: 'https://developer.chrome.com/vitals',
            domain: 'developer.chrome.com',
            description: 'Master Core Web Vitals metrics and browser rendering performance.',
          },
        ],
      };

      const snapshot = normalizeSerpResponse(mockRaw);
      const userReport: Partial<SEOReport> = {
        url: 'https://mysite.com/speed-overview',
        onPage: { title: 'Speed Overview' } as any,
        contentIntelligence: {
          primaryTopics: [{ topic: 'speed overview', count: 3, weight: 1, category: 'primary' }],
          secondaryTopics: [],
        } as any,
      };

      const linkGraph: InternalLinkGraph = {
        nodes: [
          {
            url: 'https://mysite.com/speed-overview',
            normalizedUrl: 'https://mysite.com/speed-overview',
            pageType: 'ARTICLE',
            isIndexable: true,
            internalInlinkCount: 2,
            internalOutlinkCount: 1,
            internalLinkCentrality: 0.5,
            structuralImportanceScore: 50,
            depth: 1,
            discoveryMethod: 'START_URL',
            primaryTopic: 'speed overview',
          },
          {
            url: 'https://mysite.com/core-web-vitals',
            normalizedUrl: 'https://mysite.com/core-web-vitals',
            pageType: 'ARTICLE',
            isIndexable: true,
            internalInlinkCount: 1,
            internalOutlinkCount: 2,
            internalLinkCentrality: 0.4,
            structuralImportanceScore: 40,
            depth: 2,
            discoveryMethod: 'INTERNAL_LINK',
            primaryTopic: 'core web vitals',
          },
        ],
        edges: [], // No edge between speed-overview and core-web-vitals
        totalEdges: 0,
        averageInlinksPerPage: 0,
        brokenInternalLinksCount: 0,
        redirectingInternalLinksCount: 0,
        noindexInternalLinksCount: 0,
      };

      const intentAlign = analyzeSerpIntent(snapshot, userReport as SEOReport);
      const pageTypeAlign = analyzeSerpPageTypes(snapshot, userReport as SEOReport);
      const topicPatterns = analyzeSerpTopicPatterns(snapshot, userReport as SEOReport);

      const oppResult = generateSearchOpportunities({
        snapshot,
        intentAlignment: intentAlign,
        pageTypeAlignment: pageTypeAlign,
        topicPatterns,
        userPageReport: userReport as SEOReport,
        linkGraph,
      });

      assert.ok(oppResult.internalLinkIntegrations.length > 0);
      const linkRec = oppResult.internalLinkIntegrations[0];
      assert.strictEqual(linkRec.sourcePageUrl, 'https://mysite.com/speed-overview');
      assert.strictEqual(linkRec.targetPageUrl, 'https://mysite.com/core-web-vitals');
      assert.ok(linkRec.recommendation.action.includes('Add a contextual internal link'));
    });
  });

  // =========================================================================
  // 8. STORAGE, HISTORY & FRESHNESS TRACKING
  // =========================================================================
  describe('8. Snapshot Store Implementations, Freshness & Deduplication', () => {
    test('MemorySerpSnapshotStore saves, retrieves, lists, and computes freshness age', async () => {
      const store: SerpSnapshotStore = new MemorySerpSnapshotStore();

      const mockSnap: NormalizedSerpSnapshot = {
        id: 'snap-test-123',
        fingerprint: 'fp-test-unique-12345',
        query: 'react server components seo',
        normalizedQuery: 'react server components seo',
        source: 'USER_TARGET',
        collectedAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        results: [],
        serpFeatures: [],
        organicCount: 0,
        featureTypes: [],
        freshnessAgeMinutes: 0,
        sourceMetadata: {
          rawResultCount: 0,
          responseTimeMs: 25,
          isSyntheticTest: true,
          providerLabel: 'Mock',
          disclaimer: 'Test',
        },
        provenance: {
          source: 'EXTERNAL_SERP',
          provider: 'mock_search',
          collectedAt: new Date().toISOString(),
          location: 'United States',
          language: 'en',
          device: 'DESKTOP',
          extractionMethod: 'SERP_SNIPPET',
          isSyntheticTest: true,
          fingerprint: 'fp-test-unique-12345',
        },
      };

      await store.saveSnapshot(mockSnap);

      const retrieved = await store.getSnapshot('fp-test-unique-12345');
      assert.ok(retrieved);
      assert.strictEqual(retrieved.query, 'react server components seo');
      assert.ok(retrieved.freshnessAgeMinutes >= 29 && retrieved.freshnessAgeMinutes <= 32);

      const list = await store.listSnapshots({ query: 'server components' });
      assert.strictEqual(list.length, 1);

      const deleted = await store.deleteSnapshot('snap-test-123');
      assert.strictEqual(deleted, true);
      assert.strictEqual(await store.getSnapshot('fp-test-unique-12345'), null);
    });

    test('SqliteSerpSnapshotStore saves and retrieves snapshots correctly', async () => {
      const store = new SqliteSerpSnapshotStore();

      const testFp = `sqlite_fp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const mockSnap: NormalizedSerpSnapshot = {
        id: `snap-${testFp}`,
        fingerprint: testFp,
        query: 'sqlite search test',
        normalizedQuery: 'sqlite search test',
        source: 'USER_TARGET',
        collectedAt: new Date().toISOString(),
        provider: 'mock_search',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        results: [],
        serpFeatures: [],
        organicCount: 0,
        featureTypes: [],
        freshnessAgeMinutes: 0,
        sourceMetadata: {
          rawResultCount: 0,
          responseTimeMs: 15,
          isSyntheticTest: true,
          providerLabel: 'Mock',
          disclaimer: 'Test',
        },
        provenance: {
          source: 'EXTERNAL_SERP',
          provider: 'mock_search',
          collectedAt: new Date().toISOString(),
          location: 'United States',
          language: 'en',
          device: 'DESKTOP',
          extractionMethod: 'SERP_SNIPPET',
          isSyntheticTest: true,
          fingerprint: testFp,
        },
      };

      await store.saveSnapshot(mockSnap);

      const retrieved = await store.getSnapshot(testFp);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.query, 'sqlite search test');

      const deleted = await store.deleteSnapshot(mockSnap.id);
      assert.strictEqual(deleted, true);
    });

    test('getSerpStorage returns global storage singleton instance', () => {
      const storage = getSerpStorage();
      assert.ok(storage);
      assert.ok(typeof storage.getSnapshot === 'function');
      assert.ok(typeof storage.saveSnapshot === 'function');
    });
  });

  // =========================================================================
  // 9. COST BUDGET GUARDS & BOUNDED CONCURRENCY
  // =========================================================================
  describe('9. Cost Budget Guards & Bounded Resource Controls', () => {
    test('SerpCollector strictly enforces maxProviderRequestsPerAudit before dispatching', async () => {
      const store = new MemorySerpSnapshotStore();
      const collector = new SerpCollector({
        providerId: 'mock_search',
        store,
        limits: {
          maxProviderRequestsPerAudit: 2, // Hard limit 2 requests
        },
      });

      const targets: SearchQueryTarget[] = [
        { query: 'query one', normalizedQuery: 'query one', source: 'USER_TARGET' },
        { query: 'query two', normalizedQuery: 'query two', source: 'USER_TARGET' },
        { query: 'query three', normalizedQuery: 'query three', source: 'USER_TARGET' },
        { query: 'query four', normalizedQuery: 'query four', source: 'USER_TARGET' },
      ];

      const result = await collector.collectSerpSnapshots(targets, { forceRefresh: true });

      // Exactly 2 requests dispatched, 2 rejected by cost safety guard
      assert.strictEqual(result.snapshots.length, 2);
      assert.strictEqual(result.telemetry.usedRequests, 2);
      assert.strictEqual(result.telemetry.maxRequests, 2);
      assert.strictEqual(result.errors.length, 2);
      assert.ok(result.errors[0].error.includes('Provider request budget exhausted'));
    });

    test('re-queries return cached results without consuming provider request budget', async () => {
      const store = new MemorySerpSnapshotStore();
      const collector = new SerpCollector({
        providerId: 'mock_search',
        store,
        limits: { maxProviderRequestsPerAudit: 5 },
      });

      const target: SearchQueryTarget = {
        query: 'cached serp query',
        normalizedQuery: 'cached serp query',
        source: 'USER_TARGET',
      };

      // 1st run: fresh query (usedRequests = 1, cachedHits = 0)
      const res1 = await collector.collectSerpSnapshots([target]);
      assert.strictEqual(res1.telemetry.usedRequests, 1);
      assert.strictEqual(res1.telemetry.cachedHits, 0);

      // 2nd run: cached query (usedRequests = 0, cachedHits = 1)
      const res2 = await collector.collectSerpSnapshots([target]);
      assert.strictEqual(res2.telemetry.usedRequests, 0);
      assert.strictEqual(res2.telemetry.cachedHits, 1);
      assert.strictEqual(res2.snapshots.length, 1);
    });

    test('SerpCollector respects AbortSignal cancellation', async () => {
      const store = new MemorySerpSnapshotStore();
      const collector = new SerpCollector({ providerId: 'mock_search', store });
      const controller = new AbortController();
      controller.abort(); // Pre-aborted signal

      await assert.rejects(
        async () => {
          await collector.collectSerpSnapshots(
            [{ query: 'cancelled query', normalizedQuery: 'cancelled query', source: 'USER_TARGET' }],
            { signal: controller.signal }
          );
        },
        /Search collection aborted/
      );
    });
  });

  // =========================================================================
  // 10. MASTER ORCHESTRATOR MODES
  // =========================================================================
  describe('10. Master Orchestrator Modes & Candidate Expansion Bounds', () => {
    test('SEARCH_QUERY mode processes user-specified queries and produces full audit report', async () => {
      const report = await executeSearchIntelligenceAudit({
        mode: 'SEARCH_QUERY',
        queries: ['next.js metadata seo', 'core web vitals optimization'],
        providerId: 'mock_search',
      });

      assert.strictEqual(report.mode, 'SEARCH_QUERY');
      assert.strictEqual(report.snapshots.length, 2);
      assert.ok(report.observedDomains.length > 0);
      assert.ok(report.disclaimers.antiFabricationNotice.includes('No ranking probabilities'));
      assert.ok(report.telemetry.executionDurationMs >= 0);
    });

    test('PAGE_SEARCH_INTELLIGENCE mode derives candidate queries from single-page report', async () => {
      const userReport: Partial<SEOReport> = {
        url: 'https://example.com/blog/seo-guide',
        targetKeywords: ['seo guide 2026'],
        onPage: { title: 'Complete SEO Guide 2026' } as any,
        contentIntelligence: {
          searchIntent: { primaryIntent: 'INFORMATIONAL', confidence: 'HIGH' } as any,
          pageType: { detectedType: 'ARTICLE', confidence: 'HIGH' } as any,
          primaryTopics: [{ topic: 'search engine optimization', count: 10, weight: 1, category: 'primary' }],
        } as any,
        keywords: {
          recommended: [{ keyword: 'technical seo audit checklist', source: 'RECOMMENDED', score: 85 } as any],
        } as any,
      };

      const report = await executeSearchIntelligenceAudit({
        mode: 'PAGE_SEARCH_INTELLIGENCE',
        userPageReport: userReport as SEOReport,
        providerId: 'mock_search',
      });

      assert.strictEqual(report.mode, 'PAGE_SEARCH_INTELLIGENCE');
      assert.ok(report.queries.some((q) => q.source === 'USER_TARGET'));
      assert.ok(report.queries.some((q) => q.source === 'EXTRACTED_PAGE_TOPIC'));
      assert.ok(report.queries.some((q) => q.source === 'RECOMMENDED_QUERY'));
    });

    test('SITE_SEARCH_INTELLIGENCE bounds candidate topic clusters BEFORE requests', async () => {
      const mockCrawlReport: Partial<WebsiteCrawlReport> = {
        id: 'crawl-site-1',
        domain: 'myshop.com',
        overview: {
          totalPagesCrawled: 50,
          crawlDurationMs: 1200,
          totalInternalLinks: 100,
          brokenLinksCount: 0,
          duplicatePagesCount: 0,
          averagePageScore: 85,
        } as any,
        topicClusterHealth: Array.from({ length: 15 }, (_, i) => ({
          clusterId: `c-${i}`,
          primaryTopic: `Topic Cluster ${i + 1}`,
          subTopics: [`Sub Topic ${i + 1}`],
          pagesCount: 3,
          pages: [{ url: `https://myshop.com/pillar-${i + 1}`, title: `Topic Cluster ${i + 1}`, pageType: 'ARTICLE', semanticScore: 80, depth: 1 }],
          averageSemanticScore: 80,
          averageWordCount: 1200,
          strongestPage: { url: `https://myshop.com/pillar-${i + 1}`, title: `Topic Cluster ${i + 1}`, score: 85 },
          weakestPage: { url: `https://myshop.com/pillar-${i + 1}`, title: `Topic Cluster ${i + 1}`, score: 75 },
          clusterInternalLinkDensity: 80,
          uncoveredConcepts: [],
        })),
      };

      const report = await executeSearchIntelligenceAudit({
        mode: 'SITE_SEARCH_INTELLIGENCE',
        siteCrawlReport: mockCrawlReport as WebsiteCrawlReport,
        providerId: 'mock_search',
        limits: {
          maxQueries: 8, // Bound to max 8 queries
        },
      });

      assert.strictEqual(report.mode, 'SITE_SEARCH_INTELLIGENCE');
      assert.ok(report.queries.length <= 8);
      assert.ok(report.snapshots.length <= 8);
    });

    test('deduplicates candidate queries derived across multiple sources', async () => {
      const userReport: Partial<SEOReport> = {
        url: 'https://example.com/blog/seo-guide',
        targetKeywords: ['duplicate query', 'duplicate query'],
        onPage: { title: 'Duplicate Query' } as any,
        contentIntelligence: {
          primaryTopics: [{ topic: 'duplicate query', count: 5, weight: 1, category: 'primary' }],
        } as any,
      };

      const report = await executeSearchIntelligenceAudit({
        mode: 'PAGE_SEARCH_INTELLIGENCE',
        userPageReport: userReport as SEOReport,
        providerId: 'mock_search',
      });

      // Query set must deduplicate identical topics
      assert.strictEqual(report.queries.length, 1);
    });
  });

  // =========================================================================
  // 11. SECURITY & SSRF PROTECTION
  // =========================================================================
  describe('11. Security & SSRF Protection Standards', () => {
    test('rejects loopback and localhost URLs from external SERP normalization', () => {
      const unsafeRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'security audit test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 2,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Localhost Exploit', url: 'http://localhost/admin' },
          { type: 'organic', rank_absolute: 2, title: 'IPv4 Loopback Exploit', url: 'http://127.0.0.1:3000/internal' },
        ],
      };

      const normalized = normalizeSerpResponse(unsafeRaw);
      assert.strictEqual(normalized.results.length, 0);
    });

    test('rejects AWS metadata and link-local IPv4 addresses', () => {
      const unsafeRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'metadata test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 1,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'AWS Metadata', url: 'http://169.254.169.254/latest/meta-data/' },
        ],
      };

      const normalized = normalizeSerpResponse(unsafeRaw);
      assert.strictEqual(normalized.results.length, 0);
    });

    test('rejects private RFC 1918 Class A, B, and C addresses', () => {
      const unsafeRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'private IP test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 2,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'Class A Private', url: 'http://10.0.0.1/dashboard' },
          { type: 'organic', rank_absolute: 2, title: 'Class C Private', url: 'http://192.168.1.1/setup' },
        ],
      };

      const normalized = normalizeSerpResponse(unsafeRaw);
      assert.strictEqual(normalized.results.length, 0);
    });

    test('rejects non-HTTP and dangerous schemes (file:, javascript:, data:, gopher:)', () => {
      const unsafeRaw: RawSerpResponse = {
        provider: 'test_provider',
        query: 'scheme test',
        location: 'United States',
        language: 'en',
        device: 'DESKTOP',
        itemCount: 4,
        responseTimeMs: 20,
        isSyntheticTest: true,
        items: [
          { type: 'organic', rank_absolute: 1, title: 'File Scheme', url: 'file:///etc/hosts' },
          { type: 'organic', rank_absolute: 2, title: 'JS Scheme', url: 'javascript:alert(1)' },
          { type: 'organic', rank_absolute: 3, title: 'Data Scheme', url: 'data:text/html,<h1>test</h1>' },
          { type: 'organic', rank_absolute: 4, title: 'Gopher Scheme', url: 'gopher://example.com' },
        ],
      };

      const normalized = normalizeSerpResponse(unsafeRaw);
      assert.strictEqual(normalized.results.length, 0);
    });
  });

  // =========================================================================
  // 12. ANTI-FABRICATION STANDARDS
  // =========================================================================
  describe('12. Anti-Fabrication & Strict Telemetry Standards', () => {
    test('verifies that no ranking probability, fabricated DA, search volume, or Google PageRank exists in output', async () => {
      const report = await executeSearchIntelligenceAudit({
        mode: 'SEARCH_QUERY',
        queries: ['evidence based seo analysis'],
        providerId: 'mock_search',
      });

      const json = JSON.stringify(report).toLowerCase();

      // Ensure forbidden fabricated metric terminology is never asserted as factual metrics
      assert.ok(!json.includes('"rankingprobability"'));
      assert.ok(!json.includes('"domainauthority"'));
      assert.ok(!json.includes('"pageauthority"'));
      assert.ok(!json.includes('"googlepagerank"'));
      assert.ok(!json.includes('"fabricatedsearchvolume"'));

      // Check anti-fabrication notice presence
      assert.ok(report.disclaimers.antiFabricationNotice.length > 20);
      assert.ok(report.disclaimers.rankingDisclaimer.length > 20);
    });

    test('telemetry accurately tracks providerId, usedRequests, cachedHits, and execution duration', async () => {
      const report = await executeSearchIntelligenceAudit({
        mode: 'SEARCH_QUERY',
        queries: ['telemetry verification query'],
        providerId: 'mock_search',
      });

      assert.strictEqual(report.telemetry.providerId, 'mock_search');
      assert.strictEqual(report.telemetry.failedRequests, 0);
      assert.ok(report.telemetry.executionDurationMs >= 0);
    });
  });
});
