import 'server-only';
import {
  SEOKeywordProvider,
  ProviderStatusInfo,
  KeywordMarketData,
  KeywordSuggestion,
  SerpData,
  SerpItem,
  KeywordQueryOptions,
  SerpQueryOptions,
} from './types';
import { logger } from '../../utils/logger';

export class DataForSEOProvider implements SEOKeywordProvider {
  public readonly name = 'DataForSEO';
  private readonly baseUrl: string;
  private readonly login: string | undefined;
  private readonly password: string | undefined;

  constructor() {
    this.baseUrl = process.env.DATAFORSEO_BASE_URL || 'https://api.dataforseo.com';
    this.login = process.env.DATAFORSEO_LOGIN?.trim();
    this.password = process.env.DATAFORSEO_PASSWORD?.trim();
  }

  private isConfigured(): boolean {
    return Boolean(this.login && this.password);
  }

  private getAuthHeader(): string {
    if (!this.login || !this.password) return '';
    const token = Buffer.from(`${this.login}:${this.password}`).toString('base64');
    return `Basic ${token}`;
  }

  public async getStatus(): Promise<ProviderStatusInfo> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        status: 'NOT_CONFIGURED',
        statusMessage: 'DataForSEO credentials are not configured in environment variables (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD).',
        configured: false,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/v3/appendix/user_data`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          provider: this.name,
          status: 'AUTH_FAILED',
          statusMessage: 'Invalid DataForSEO credentials.',
          configured: true,
        };
      }

      if (res.status === 429) {
        return {
          provider: this.name,
          status: 'RATE_LIMITED',
          statusMessage: 'DataForSEO rate limit exceeded.',
          configured: true,
        };
      }

      if (res.status === 402) {
        return {
          provider: this.name,
          status: 'TEMPORARILY_UNAVAILABLE',
          statusMessage: 'DataForSEO account balance depleted / quota exceeded.',
          configured: true,
        };
      }

      if (!res.ok) {
        return {
          provider: this.name,
          status: 'ERROR',
          statusMessage: `DataForSEO API responded with status ${res.status}`,
          configured: true,
        };
      }

      const data = await res.json();
      const money = data?.tasks?.[0]?.result?.[0]?.money;

      return {
        provider: this.name,
        status: 'CONNECTED',
        statusMessage: 'Successfully connected to DataForSEO API.',
        configured: true,
        quotaRemaining: typeof money === 'number' ? money : undefined,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      logger.warn(`DataForSEO getStatus check failed: ${message}`);
      return {
        provider: this.name,
        status: 'TEMPORARILY_UNAVAILABLE',
        statusMessage: `Unable to reach DataForSEO API: ${message}`,
        configured: true,
      };
    }
  }

  public async getKeywordMetrics(
    keywords: string[],
    options?: KeywordQueryOptions
  ): Promise<KeywordMarketData[]> {
    if (!this.isConfigured() || keywords.length === 0) {
      return [];
    }

    const country = options?.country || 'US';
    const language = options?.language || 'en';
    const uniqueKeywords = Array.from(new Set(keywords.map((k) => k.trim().toLowerCase()))).filter(Boolean);

    try {
      // DataForSEO Google Ads search volume live endpoint
      const payload = [
        {
          keywords: uniqueKeywords.slice(0, 700),
          location_code: country === 'US' ? 2840 : undefined,
          location_name: country !== 'US' ? country : undefined,
          language_code: language,
        },
      ];

      const res = await fetch(`${this.baseUrl}/v3/keywords_data/google_ads/search_volume/live`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        logger.warn(`DataForSEO search_volume error status: ${res.status}`);
        return [];
      }

      const json = await res.json();
      const taskResult = json?.tasks?.[0]?.result;

      if (!Array.isArray(taskResult)) {
        return [];
      }

      const timestamp = new Date().toISOString();
      const results: KeywordMarketData[] = [];

      for (const item of taskResult) {
        if (!item?.keyword) continue;

        const volume = typeof item.search_volume === 'number' ? item.search_volume : null;
        const cpc = typeof item.cpc === 'number' ? item.cpc : null;
        const competition = typeof item.competition === 'number' ? item.competition : null;
        const kd = typeof item.keyword_difficulty === 'number' ? item.keyword_difficulty : null;

        const volumeTrend = Array.isArray(item.monthly_searches)
          ? item.monthly_searches.map((m: { year?: number; month?: number; search_volume?: number }) => ({
              month: `${m.year}-${String(m.month || 1).padStart(2, '0')}`,
              year: m.year,
              volume: typeof m.search_volume === 'number' ? m.search_volume : 0,
            }))
          : null;

        results.push({
          keyword: String(item.keyword).toLowerCase().trim(),
          source: 'EXTERNAL',
          country,
          language,
          searchVolume: volume,
          volumeTrend,
          keywordDifficulty: kd,
          competition,
          cpc,
          serpFeatures: null,
          topCompetitorDomains: null,
          dataTimestamp: timestamp,
          provider: this.name,
          providerStatus: 'CONNECTED',
        });
      }

      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fetch error';
      logger.warn(`DataForSEO getKeywordMetrics error: ${message}`);
      return [];
    }
  }

  public async getRelatedKeywords(
    seed: string,
    options?: KeywordQueryOptions
  ): Promise<KeywordSuggestion[]> {
    return this.fetchSuggestions('keyword_ideas', seed, options);
  }

  public async getKeywordSuggestions(
    seed: string,
    options?: KeywordQueryOptions
  ): Promise<KeywordSuggestion[]> {
    return this.fetchSuggestions('keyword_suggestions', seed, options);
  }

  private async fetchSuggestions(
    type: 'keyword_ideas' | 'keyword_suggestions',
    seed: string,
    options?: KeywordQueryOptions
  ): Promise<KeywordSuggestion[]> {
    if (!this.isConfigured() || !seed.trim()) {
      return [];
    }

    const country = options?.country || 'US';
    const language = options?.language || 'en';
    const limit = options?.limit || 20;

    try {
      const endpoint =
        type === 'keyword_ideas'
          ? `${this.baseUrl}/v3/dataforseo_labs/google/keyword_ideas/live`
          : `${this.baseUrl}/v3/dataforseo_labs/google/keyword_suggestions/live`;

      const payload = [
        {
          keyword: seed.trim(),
          location_code: country === 'US' ? 2840 : undefined,
          location_name: country !== 'US' ? country : undefined,
          language_code: language,
          limit,
        },
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const taskResult = json?.tasks?.[0]?.result?.[0]?.items;

      if (!Array.isArray(taskResult)) return [];

      return taskResult
        .filter((item: { keyword?: string }) => Boolean(item?.keyword))
        .map((item: { keyword: string; keyword_info?: { search_volume?: number; cpc?: number }; keyword_properties?: { keyword_difficulty?: number } }) => ({
          keyword: item.keyword.toLowerCase().trim(),
          searchVolume: typeof item.keyword_info?.search_volume === 'number' ? item.keyword_info.search_volume : null,
          keywordDifficulty: typeof item.keyword_properties?.keyword_difficulty === 'number' ? item.keyword_properties.keyword_difficulty : null,
          cpc: typeof item.keyword_info?.cpc === 'number' ? item.keyword_info.cpc : null,
          provider: this.name,
          type: type === 'keyword_ideas' ? 'related' : 'suggestion',
        }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Suggestions error';
      logger.warn(`DataForSEO fetchSuggestions error: ${message}`);
      return [];
    }
  }

  public async getSerpResults(
    keyword: string,
    options?: SerpQueryOptions
  ): Promise<SerpData | null> {
    if (!this.isConfigured() || !keyword.trim()) {
      return null;
    }

    const country = options?.country || 'US';
    const language = options?.language || 'en';
    const depth = options?.depth || 20;

    try {
      const payload = [
        {
          keyword: keyword.trim(),
          location_code: country === 'US' ? 2840 : undefined,
          location_name: country !== 'US' ? country : undefined,
          language_code: language,
          depth,
        },
      ];

      const res = await fetch(`${this.baseUrl}/v3/serp/google/organic/live/advanced`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;

      const json = await res.json();
      const taskResult = json?.tasks?.[0]?.result?.[0];

      if (!taskResult) return null;

      const rawItems = Array.isArray(taskResult.items) ? taskResult.items : [];
      const items: SerpItem[] = [];
      const features = new Set<string>();
      const competitorDomains = new Set<string>();

      for (const item of rawItems) {
        if (item.type === 'organic' && item.url) {
          try {
            const domain = new URL(item.url).hostname.replace(/^www\./, '');
            if (domain) competitorDomains.add(domain);
          } catch {}

          items.push({
            position: typeof item.rank_group === 'number' ? item.rank_group : items.length + 1,
            url: item.url,
            domain: item.domain || '',
            title: item.title || '',
            snippet: item.description || '',
            features: Array.isArray(item.item_types) ? item.item_types : undefined,
          });
        } else if (item.type) {
          features.add(item.type);
        }
      }

      return {
        keyword: keyword.toLowerCase().trim(),
        country,
        language,
        totalResults: typeof taskResult.se_results_count === 'number' ? taskResult.se_results_count : null,
        items,
        features: Array.from(features),
        competitorDomains: Array.from(competitorDomains),
        dataTimestamp: new Date().toISOString(),
        provider: this.name,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'SERP fetch error';
      logger.warn(`DataForSEO getSerpResults error: ${message}`);
      return null;
    }
  }
}
