import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DataForSEOProvider } from '../lib/providers/seo/dataForSeoProvider';
import { getSEOProvider, setSEOProvider, resetSEOProvider } from '../lib/providers/seo/providerFactory';
import {
  SEOKeywordProvider,
  KeywordMarketData,
  KeywordSuggestion,
  SerpData,
  ProviderStatusInfo,
} from '../lib/providers/seo/types';
import { seoProviderRepository } from '../lib/db/repository';
import { calculateOpportunityScore } from '../lib/seo/opportunityScorer';
import { KeywordEnrichmentEngine } from '../lib/seo/enrichmentEngine';
import { KeywordItem } from '../types';

// Mock Provider for testing
class MockTestProvider implements SEOKeywordProvider {
  public readonly name = 'MockDataForSEO';
  public callCount = 0;

  async getStatus(): Promise<ProviderStatusInfo> {
    return {
      provider: this.name,
      status: 'CONNECTED',
      statusMessage: 'Mock provider connected successfully.',
      configured: true,
      quotaRemaining: 1500,
    };
  }

  async getKeywordMetrics(keywords: string[]): Promise<KeywordMarketData[]> {
    this.callCount++;
    return keywords.map((kw) => ({
      keyword: kw.toLowerCase().trim(),
      source: 'EXTERNAL',
      country: 'US',
      language: 'en',
      searchVolume: kw.includes('seo') ? 2400 : 110,
      volumeTrend: [
        { month: '2026-08', volume: 2200 },
        { month: '2026-09', volume: 2400 },
      ],
      keywordDifficulty: kw.includes('seo') ? 45 : 15,
      competition: 0.65,
      cpc: 3.5,
      serpFeatures: ['featured_snippet', 'people_also_ask'],
      topCompetitorDomains: ['moz.com', 'ahrefs.com'],
      dataTimestamp: '2026-09-11T12:00:00.000Z',
      provider: this.name,
      providerStatus: 'CONNECTED',
    }));
  }

  async getRelatedKeywords(seed: string): Promise<KeywordSuggestion[]> {
    return [
      {
        keyword: `${seed} tools`,
        searchVolume: 1200,
        keywordDifficulty: 35,
        cpc: 2.1,
        provider: this.name,
        type: 'related',
      },
    ];
  }

  async getKeywordSuggestions(seed: string): Promise<KeywordSuggestion[]> {
    return [
      {
        keyword: `how to do ${seed}`,
        searchVolume: 880,
        keywordDifficulty: 25,
        cpc: 1.5,
        provider: this.name,
        type: 'suggestion',
      },
    ];
  }

  async getSerpResults(keyword: string): Promise<SerpData | null> {
    return {
      keyword: keyword.toLowerCase().trim(),
      country: 'US',
      language: 'en',
      totalResults: 45000000,
      items: [
        {
          position: 1,
          url: 'https://moz.com/beginners-guide-to-seo',
          domain: 'moz.com',
          title: 'The Beginner\'s Guide to SEO - Moz',
          snippet: 'Learn search engine optimization from the ground up.',
        },
        {
          position: 2,
          url: 'https://ahrefs.com/blog/seo-basics',
          domain: 'ahrefs.com',
          title: 'SEO Basics: Complete Guide - Ahrefs',
          snippet: 'Master the fundamentals of SEO.',
        },
      ],
      features: ['featured_snippet', 'people_also_ask'],
      competitorDomains: ['moz.com', 'ahrefs.com'],
      dataTimestamp: '2026-09-11T12:00:00.000Z',
      provider: this.name,
    };
  }
}

describe('External SEO Keyword & SERP Intelligence Subsystem', () => {
  afterEach(() => {
    resetSEOProvider();
  });

  test('DataForSEOProvider returns NOT_CONFIGURED when credentials are unset', async () => {
    // Ensure clean environment
    const originalLogin = process.env.DATAFORSEO_LOGIN;
    const originalPassword = process.env.DATAFORSEO_PASSWORD;
    delete process.env.DATAFORSEO_LOGIN;
    delete process.env.DATAFORSEO_PASSWORD;

    try {
      const provider = new DataForSEOProvider();
      const status = await provider.getStatus();
      assert.strictEqual(status.status, 'NOT_CONFIGURED');
      assert.strictEqual(status.configured, false);
      assert.ok(status.statusMessage.includes('not configured'));

      // Metric calls safely return empty array
      const metrics = await provider.getKeywordMetrics(['test keyword']);
      assert.deepStrictEqual(metrics, []);

      // SERP calls safely return null
      const serp = await provider.getSerpResults('test keyword');
      assert.strictEqual(serp, null);
    } finally {
      if (originalLogin) process.env.DATAFORSEO_LOGIN = originalLogin;
      if (originalPassword) process.env.DATAFORSEO_PASSWORD = originalPassword;
    }
  });

  test('Provider factory manages active provider singleton and injection', async () => {
    const defaultProvider = getSEOProvider();
    assert.strictEqual(defaultProvider.name, 'DataForSEO');

    const mock = new MockTestProvider();
    setSEOProvider(mock);
    assert.strictEqual(getSEOProvider().name, 'MockDataForSEO');

    const status = await getSEOProvider().getStatus();
    assert.strictEqual(status.status, 'CONNECTED');
    assert.strictEqual(status.quotaRemaining, 1500);
  });

  test('SQLite Provider Cache stores and retrieves data within TTL', () => {
    const cacheKey = `test_cache_${Date.now()}`;
    const payload = { searchVolume: 5400, kd: 32 };

    // Initially null
    assert.strictEqual(seoProviderRepository.getCache('TestProvider', cacheKey), null);

    // Save to cache
    seoProviderRepository.setCache('TestProvider', cacheKey, payload, 3600);

    // Retrieve from cache
    const retrieved = seoProviderRepository.getCache<{ searchVolume: number; kd: number }>('TestProvider', cacheKey);
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved?.searchVolume, 5400);
    assert.strictEqual(retrieved?.kd, 32);
  });

  test('SQLite Market Data Repository saves and retrieves bulk keyword metrics', () => {
    const testKw = `seo test audit ${Date.now()}`;
    const marketItem: KeywordMarketData = {
      keyword: testKw,
      source: 'EXTERNAL',
      country: 'US',
      language: 'en',
      searchVolume: 1900,
      volumeTrend: [{ month: '2026-09', volume: 1900 }],
      keywordDifficulty: 42,
      competition: 0.5,
      cpc: 2.75,
      serpFeatures: ['featured_snippet'],
      topCompetitorDomains: ['semrush.com'],
      dataTimestamp: '2026-09-11T12:00:00.000Z',
      provider: 'DataForSEO',
      providerStatus: 'CONNECTED',
    };

    seoProviderRepository.saveMarketData([marketItem]);

    const retrieved = seoProviderRepository.getMarketData(testKw, 'US', 'en');
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved.keyword, testKw);
    assert.strictEqual(retrieved.searchVolume, 1900);
    assert.strictEqual(retrieved.keywordDifficulty, 42);
    assert.strictEqual(retrieved.cpc, 2.75);

    const bulkMap = seoProviderRepository.getBulkMarketData([testKw, 'nonexistent_term_xyz'], 'US', 'en');
    assert.strictEqual(bulkMap.size, 1);
    assert.strictEqual(bulkMap.get(testKw)?.searchVolume, 1900);
  });

  test('SEO Opportunity Scorer transparently combines internal relevance and external market demand', () => {
    // Scenario 1: Internal only (No external provider data)
    const internalOnly = calculateOpportunityScore({
      keyword: 'technical seo audit',
      category: 'primary',
      internalRelevance: 85,
      qualityScore: 80,
      frequency: 4,
      coverageStatus: 'Weak',
      estimatedIntent: 'Informational',
      marketData: null,
    });

    assert.ok(internalOnly.finalScore >= 60 && internalOnly.finalScore <= 99);
    assert.strictEqual(internalOnly.marketDemandScore, null);
    assert.strictEqual(internalOnly.difficultyScore, null);
    assert.ok(internalOnly.explanation.includes('External search demand data not connected'));

    // Scenario 2: Enriched with verified external data
    const enriched = calculateOpportunityScore({
      keyword: 'technical seo audit',
      category: 'primary',
      internalRelevance: 90,
      qualityScore: 85,
      frequency: 5,
      coverageStatus: 'Missing',
      estimatedIntent: 'Commercial',
      marketData: {
        keyword: 'technical seo audit',
        source: 'EXTERNAL',
        country: 'US',
        language: 'en',
        searchVolume: 3600,
        volumeTrend: null,
        keywordDifficulty: 30, // Low KD -> High feasibility
        competition: 0.7,
        cpc: 4.5,
        serpFeatures: null,
        topCompetitorDomains: null,
        dataTimestamp: '2026-09-11T12:00:00.000Z',
        provider: 'DataForSEO',
        providerStatus: 'CONNECTED',
      },
    });

    assert.ok(enriched.marketDemandScore !== null && enriched.marketDemandScore >= 80);
    assert.ok(enriched.difficultyScore !== null && enriched.difficultyScore >= 65);
    assert.ok(enriched.finalScore >= 75);
    assert.ok(enriched.explanation.includes('verified monthly search volume (3,600)'));
    assert.ok(enriched.factors.some((f) => f.factor === 'Verified Search Demand'));
    assert.ok(enriched.factors.some((f) => f.factor === 'Ranking Feasibility (KD)'));
  });

  test('KeywordEnrichmentEngine deduplicates, ignores artifacts, queries provider, and saves cache', async () => {
    const mock = new MockTestProvider();
    setSEOProvider(mock);

    const dummyKeywords: KeywordItem[] = [
      {
        id: '1',
        keyword: 'technical seo audit',
        nGramType: '3-gram',
        category: 'primary',
        frequency: 4,
        density: 1.2,
        prominenceScore: 90,
        overallScore: 88,
        inTitle: true,
        inH1: true,
        inH2H6: false,
        inMeta: true,
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: true,
        source: 'EXTRACTED',
      },
      {
        id: '2',
        keyword: 'technical seo audit', // Duplicate term
        nGramType: '3-gram',
        category: 'primary',
        frequency: 4,
        density: 1.2,
        prominenceScore: 90,
        overallScore: 88,
        inTitle: true,
        inH1: true,
        inH2H6: false,
        inMeta: true,
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: true,
      },
      {
        id: '3',
        keyword: '2026-09-11daily1', // Artifact term -> must be rejected
        nGramType: '1-gram',
        category: 'secondary',
        frequency: 1,
        density: 0.1,
        prominenceScore: 10,
        overallScore: 10,
        inTitle: false,
        inH1: false,
        inH2H6: false,
        inMeta: false,
        inUrl: false,
        inAnchor: false,
        inAlt: false,
        inBody: false,
      },
    ];

    const enriched = await KeywordEnrichmentEngine.enrichKeywords(dummyKeywords, {
      country: 'US',
      language: 'en',
      fetchSerpForTopKeywords: 1,
    });

    // Exactly 1 deduplicated valid term returned
    assert.strictEqual(enriched.length, 1);
    const item = enriched[0];
    assert.strictEqual(item.keyword, 'technical seo audit');
    assert.ok(item.sources.includes('EXTRACTED'));
    assert.ok(item.sources.includes('EXTERNAL'));
    assert.strictEqual(item.marketData?.searchVolume, 2400);
    assert.strictEqual(item.marketData?.keywordDifficulty, 45);
    assert.strictEqual(item.serpData?.items.length, 2);
    assert.strictEqual(item.serpData?.competitorDomains[0], 'moz.com');
  });
});
