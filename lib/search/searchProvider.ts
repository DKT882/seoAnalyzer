import crypto from 'node:crypto';
import {
  NormalizedSerpSnapshot,
  SerpResultItem,
  SerpFeatureItem,
  SearchResultType,
  SearchDevice,
  ObservationProvenance,
  SearchResourceLimits,
  ProviderUsageTelemetry,
} from './searchTypes';
import { validateAndNormalizeUrl } from '../utils/urlUtils';
import { logger } from '../utils/logger';

export interface ProviderSearchOptions {
  location?: string;
  language?: string;
  device?: SearchDevice;
  limit?: number;
  timeoutMs?: number;
}

export interface RawSerpItem {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  position?: number;
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
  description?: string;
  breadcrumb?: string;
  items?: any[];
  links?: any[];
  is_featured_snippet?: boolean;
}

export interface RawSerpResponse {
  provider: string;
  query: string;
  location: string;
  language: string;
  device: SearchDevice;
  items: RawSerpItem[];
  itemCount: number;
  responseTimeMs: number;
  isSyntheticTest: boolean;
  costCredits?: number;
}

export interface SearchProvider {
  id: string;
  name: string;
  isConfigured: () => boolean;
  search: (query: string, options?: ProviderSearchOptions) => Promise<RawSerpResponse>;
}

/**
 * Deterministic Mock Search Provider for testing, local offline execution, and DEMO mode.
 * Calibration Rule 1: Always explicitly marks data as DEMO/TEST data with isSyntheticTest: true.
 */
export class MockSearchProvider implements SearchProvider {
  public id = 'mock_search';
  public name = 'Deterministic Mock SERP Provider (DEMO/TEST DATA)';

  public isConfigured(): boolean {
    return true;
  }

  public async search(
    query: string,
    options: ProviderSearchOptions = {}
  ): Promise<RawSerpResponse> {
    const startTime = Date.now();
    const location = options.location || 'United States';
    const language = options.language || 'en';
    const device = options.device || 'DESKTOP';
    const limit = Math.min(options.limit || 10, 20);

    const normQuery = query.toLowerCase().trim();
    const isCommercial =
      normQuery.includes('buy') ||
      normQuery.includes('price') ||
      normQuery.includes('deals') ||
      normQuery.includes('store') ||
      normQuery.includes('shop') ||
      normQuery.includes('cheap');
    const isTech =
      normQuery.includes('seo') ||
      normQuery.includes('react') ||
      normQuery.includes('javascript') ||
      normQuery.includes('python') ||
      normQuery.includes('guide');

    const items: RawSerpItem[] = [];

    // Position 1: Featured Snippet or Top Guide
    if (isTech) {
      items.push({
        type: 'featured_snippet',
        rank_absolute: 1,
        title: `${query}: Comprehensive Developer Guide & Best Practices`,
        url: `https://dev-authority.org/guides/${encodeURIComponent(normQuery.replace(/\s+/g, '-'))}`,
        domain: 'dev-authority.org',
        description: `Explore in-depth technical documentation, architecture, performance, and implementation patterns for ${query}. Includes step-by-step examples.`,
        is_featured_snippet: true,
      });
    }

    // Position 2: People Also Ask
    items.push({
      type: 'people_also_ask',
      rank_absolute: items.length + 1,
      items: [
        { title: `What is the best way to implement ${query}?`, snippet: `The recommended approach for ${query} is prioritizing core modular architecture and semantic markup.` },
        { title: `How does ${query} compare to traditional solutions?`, snippet: `Compared to traditional alternatives, ${query} delivers enhanced clarity, efficiency, and crawlability.` },
        { title: `What are common mistakes with ${query}?`, snippet: `Common mistakes include ignoring search intent, duplicating metadata, and excessive shallow content.` },
      ],
    });

    // Organic positions 3..limit
    const domains = [
      'techinsights.io',
      'industryleader.com',
      'expertreview.net',
      'solutionshub.org',
      'benchmarkdaily.com',
      'digitalguide.co',
      'webstore-direct.com',
      'globalreviews.com',
    ];

    let organicRank = 1;
    for (let i = 0; i < limit - 2; i++) {
      const dom = domains[i % domains.length];
      const pageType = isCommercial
        ? (i % 2 === 0 ? 'product' : 'category')
        : (i % 3 === 0 ? 'documentation' : 'article');

      const title = isCommercial
        ? `Best ${query} Online: Verified Models & Pricing (${dom})`
        : `Complete Guide to ${query} — Technical Architecture & Solutions`;

      const snippet = isCommercial
        ? `Discover top-rated ${query} with verified specifications, warranty, user reviews, and fast shipping options at ${dom}.`
        : `Learn how ${query} is utilized in real-world environments. Deep dive into structure, benefits, implementation caveats, and optimization.`;

      items.push({
        type: 'organic',
        rank_absolute: items.length + 1,
        rank_group: organicRank++,
        title,
        url: `https://${dom}/${pageType}/${encodeURIComponent(normQuery.replace(/\s+/g, '-'))}-${i + 1}`,
        domain: dom,
        description: snippet,
      });
    }

    // Local Pack for local queries
    if (normQuery.includes('near me') || normQuery.includes('plumber') || normQuery.includes('dentist') || normQuery.includes('london') || normQuery.includes('new york')) {
      items.push({
        type: 'local_pack',
        rank_absolute: items.length + 1,
        title: `Local Businesses for ${query}`,
        items: [
          { title: `Premier ${query} Hub`, snippet: '4.8 ★★★★★ (124 reviews) · Open now' },
          { title: `Metro ${query} Specialists`, snippet: '4.9 ★★★★★ (89 reviews) · Verified local' },
        ],
      });
    }

    return {
      provider: 'mock_search',
      query,
      location,
      language,
      device,
      items,
      itemCount: items.length,
      responseTimeMs: Date.now() - startTime + 15,
      isSyntheticTest: true,
      costCredits: 0,
    };
  }
}

/**
 * Live DataForSEO Search Provider with request/cost budgeting and timeout guards.
 * Calibration Rule 1 & 5: If configured live provider fails, throws or returns explicit error;
 * NEVER silently substitutes mock data!
 */
export class DataForSeoSearchProvider implements SearchProvider {
  public id = 'dataforseo';
  public name = 'DataForSEO Live SERP API';

  private apiKey: string;
  private apiLogin: string;

  constructor() {
    this.apiLogin = process.env.DATAFORSEO_LOGIN || '';
    this.apiKey = process.env.DATAFORSEO_API_KEY || process.env.DATAFORSEO_PASSWORD || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiLogin && this.apiKey);
  }

  public async search(
    query: string,
    options: ProviderSearchOptions = {}
  ): Promise<RawSerpResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'DataForSEO provider is not configured. Missing DATAFORSEO_LOGIN or DATAFORSEO_API_KEY environment variables.'
      );
    }

    const startTime = Date.now();
    const location = options.location || 'United States';
    const language = options.language || 'en';
    const device = options.device || 'DESKTOP';
    const limit = Math.min(options.limit || 10, 50);
    const timeoutMs = options.timeoutMs || 15000;

    const authHeader = `Basic ${Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString('base64')}`;

    const postData = [
      {
        keyword: query,
        location_name: location,
        language_name: language === 'en' ? 'English' : language,
        device: device.toLowerCase(),
        depth: limit,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'SEOAnalyzer/1.0',
        },
        body: JSON.stringify(postData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DataForSEO API responded with HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.tasks?.[0]?.result?.[0]) {
        const errorMsg = data.tasks?.[0]?.status_message || 'No search result returned from DataForSEO';
        throw new Error(`DataForSEO Task Failed: ${errorMsg}`);
      }

      const taskResult = data.tasks[0].result[0];
      const rawItems: RawSerpItem[] = (taskResult.items || []).map((item: any) => ({
        type: item.type || 'organic',
        rank_group: item.rank_group,
        rank_absolute: item.rank_absolute,
        url: item.url,
        domain: item.domain,
        title: item.title,
        description: item.description,
        breadcrumb: item.breadcrumb,
        items: item.items,
        links: item.links,
        is_featured_snippet: item.type === 'featured_snippet',
      }));

      return {
        provider: 'dataforseo',
        query,
        location,
        language,
        device,
        items: rawItems,
        itemCount: rawItems.length,
        responseTimeMs: Date.now() - startTime,
        isSyntheticTest: false,
        costCredits: data.tasks[0]?.cost || 0.002,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error(`Live DataForSEO Search Provider Failure for query "${query}":`, err);
      // Explicit error propagation — NEVER silently return mock data
      throw new Error(`Live DataForSEO search failed: ${err.message || String(err)}`);
    }
  }
}

/**
 * Search Provider Registry with strict configuration inspection.
 */
export class SearchProviderRegistry {
  private static providers: Map<string, SearchProvider> = new Map([
    ['mock_search', new MockSearchProvider()],
    ['dataforseo', new DataForSeoSearchProvider()],
  ]);

  public static getProvider(id?: string): SearchProvider {
    if (id && this.providers.has(id)) {
      return this.providers.get(id)!;
    }

    // Default to configured live provider if available, otherwise mock
    const live = this.providers.get('dataforseo');
    if (live && live.isConfigured()) {
      return live;
    }

    return this.providers.get('mock_search')!;
  }

  public static getLiveProvider(): SearchProvider | null {
    const live = this.providers.get('dataforseo');
    return live && live.isConfigured() ? live : null;
  }

  public static getMockProvider(): SearchProvider {
    return this.providers.get('mock_search')!;
  }

  public static listProviders() {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
      isLive: p.id !== 'mock_search',
    }));
  }
}
