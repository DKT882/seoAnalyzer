import { DataProviderInfo } from '@/types';

export interface SEODataProvider {
  id: string;
  name: string;
  getDomainMetrics(domain: string): Promise<any>;
  getKeywordMetrics(keyword: string): Promise<any>;
}

export interface SERPProvider {
  id: string;
  name: string;
  getSerpPositions(keyword: string, country?: string): Promise<any>;
}

export interface BacklinkProvider {
  id: string;
  name: string;
  getBacklinks(domain: string): Promise<any>;
}

export interface SearchConsoleProvider {
  id: string;
  name: string;
  getSitePerformance(siteUrl: string): Promise<any>;
}

export class DataProviderRegistry {
  private static providers: DataProviderInfo[] = [
    {
      providerId: 'dataforseo',
      name: 'DataForSEO SERP & Keyword API',
      type: 'SERP',
      status: process.env.DATAFORSEO_API_KEY ? 'CONNECTED' : 'NOT_CONNECTED',
      statusMessage: process.env.DATAFORSEO_API_KEY
        ? 'DataForSEO provider configured and ready.'
        : 'Requires DATAFORSEO_API_KEY environment variable. External search volume and SERP data unavailable.',
    },
    {
      providerId: 'semrush',
      name: 'Semrush API',
      type: 'KEYWORD',
      status: process.env.SEMRUSH_API_KEY ? 'CONNECTED' : 'NOT_CONNECTED',
      statusMessage: process.env.SEMRUSH_API_KEY
        ? 'Semrush API key active.'
        : 'Requires SEMRUSH_API_KEY environment variable.',
    },
    {
      providerId: 'ahrefs',
      name: 'Ahrefs API v3',
      type: 'BACKLINK',
      status: process.env.AHREFS_API_KEY ? 'CONNECTED' : 'NOT_CONNECTED',
      statusMessage: process.env.AHREFS_API_KEY
        ? 'Ahrefs API active.'
        : 'Requires AHREFS_API_KEY for external backlink counts and referring domains.',
    },
    {
      providerId: 'google_search_console',
      name: 'Google Search Console API',
      type: 'SEARCH_CONSOLE',
      status: process.env.GSC_SERVICE_ACCOUNT_JSON ? 'CONNECTED' : 'NOT_CONNECTED',
      statusMessage: process.env.GSC_SERVICE_ACCOUNT_JSON
        ? 'Google Search Console service account connected.'
        : 'Requires website owner OAuth authorization or service account credentials.',
    },
    {
      providerId: 'google_analytics_4',
      name: 'Google Analytics 4 Data API',
      type: 'ANALYTICS',
      status: process.env.GA4_PROPERTY_ID ? 'CONNECTED' : 'NOT_CONNECTED',
      statusMessage: process.env.GA4_PROPERTY_ID
        ? 'GA4 Property ID configured.'
        : 'Requires GA4_PROPERTY_ID and credentials.',
    },
  ];

  public static getProviders(): DataProviderInfo[] {
    return this.providers.map((p) => ({
      ...p,
      // Re-check env dynamically
      status:
        p.providerId === 'dataforseo' && process.env.DATAFORSEO_API_KEY
          ? 'CONNECTED'
          : p.providerId === 'semrush' && process.env.SEMRUSH_API_KEY
          ? 'CONNECTED'
          : p.providerId === 'ahrefs' && process.env.AHREFS_API_KEY
          ? 'CONNECTED'
          : p.providerId === 'google_search_console' && process.env.GSC_SERVICE_ACCOUNT_JSON
          ? 'CONNECTED'
          : p.providerId === 'google_analytics_4' && process.env.GA4_PROPERTY_ID
          ? 'CONNECTED'
          : 'NOT_CONNECTED',
    }));
  }

  public static updateProviderStatus(
    providerId: string,
    status: DataProviderInfo['status'],
    message?: string
  ): void {
    const provider = this.providers.find((p) => p.providerId === providerId);
    if (provider) {
      provider.status = status;
      if (message) provider.statusMessage = message;
    }
  }
}
