import {
  AnalyzeUrlRequest,
  AnalyzeUrlResponse,
  AnalysisJob,
  CompareCompetitorsRequest,
  CompareCompetitorsResponse,
  DomainOverviewData,
  DataProviderInfo,
} from '@/types';

const API_BASE = '/api';

export class ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: string | string[];

  constructor(message: string, statusCode?: number, details?: string | string[], code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || data.error || `${fallbackMessage} (${res.status})`;
    throw new ApiError(errorMsg, res.status, data.details, data.code);
  }
  return data as T;
}

export const apiClient = {
  async analyzeUrl(payload: AnalyzeUrlRequest): Promise<AnalyzeUrlResponse> {
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return await handleResponse<AnalyzeUrlResponse>(res, 'Analysis request failed');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Unable to connect to the analysis server. Please check your network or server status.',
        0,
        err.message,
        'NETWORK_ERROR'
      );
    }
  },

  async compareCompetitors(payload: CompareCompetitorsRequest): Promise<CompareCompetitorsResponse> {
    try {
      const res = await fetch(`${API_BASE}/competitors/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return await handleResponse<CompareCompetitorsResponse>(res, 'Competitor comparison failed');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Failed to execute competitor comparison.', 0, err.message, 'NETWORK_ERROR');
    }
  },

  async getDomainOverview(urlOrDomain: string): Promise<DomainOverviewData> {
    const res = await fetch(`${API_BASE}/domain-overview?domain=${encodeURIComponent(urlOrDomain)}`);
    return handleResponse<DomainOverviewData>(res, 'Failed to fetch domain overview');
  },

  async getDataSources(): Promise<DataProviderInfo[]> {
    const res = await fetch(`${API_BASE}/settings/data-sources`);
    const data = await handleResponse<{ providers?: DataProviderInfo[] }>(res, 'Failed to fetch data source providers');
    return data.providers || [];
  },

  async getJob(id: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
    return handleResponse<AnalysisJob>(res, 'Failed to fetch job status');
  },

  async getHistory(): Promise<Array<{
    id: string;
    url: string;
    createdAt: string;
    status: string;
    overallScore?: number;
    wordCount?: number;
    title?: string;
  }>> {
    const res = await fetch(`${API_BASE}/history`);
    const data = await handleResponse<{ history?: any[] }>(res, 'Failed to fetch history');
    return data.history || [];
  },

  getExportUrl(id: string, format: 'json' | 'csv' | 'html' | 'xlsx', type?: string): string {
    const params = new URLSearchParams({ format });
    if (type) params.set('type', type);
    return `${API_BASE}/export/${encodeURIComponent(id)}?${params.toString()}`;
  },

  async startCrawl(payload: import('@/types').StartCrawlRequest): Promise<import('@/types').StartCrawlResponse> {
    try {
      const res = await fetch(`${API_BASE}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return await handleResponse<import('@/types').StartCrawlResponse>(res, 'Crawl request failed');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Unable to start website crawl.', 0, err.message, 'NETWORK_ERROR');
    }
  },

  async getCrawlSession(id: string): Promise<import('@/types').CrawlSession> {
    const res = await fetch(`${API_BASE}/crawl/${encodeURIComponent(id)}`);
    return handleResponse<import('@/types').CrawlSession>(res, 'Failed to fetch crawl session');
  },

  async cancelCrawl(id: string): Promise<void> {
    await fetch(`${API_BASE}/crawl/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  },

  async getCrawlPages(id: string, pageUrl?: string): Promise<any> {
    const url = pageUrl
      ? `${API_BASE}/crawl/${encodeURIComponent(id)}/pages?url=${encodeURIComponent(pageUrl)}`
      : `${API_BASE}/crawl/${encodeURIComponent(id)}/pages`;
    const res = await fetch(url);
    return handleResponse(res, 'Failed to fetch crawl pages');
  },

  async getKeywordStrategy(crawlId?: string, jobId?: string, primaryKeyword?: string): Promise<any> {
    const params = new URLSearchParams();
    if (crawlId) params.set('crawlId', crawlId);
    if (jobId) params.set('jobId', jobId);
    if (primaryKeyword) params.set('primaryKeyword', primaryKeyword);
    const res = await fetch(`${API_BASE}/keywords/strategy?${params.toString()}`);
    return res.json();
  },

  async getSeoRecommendations(crawlId?: string, jobId?: string, category?: string, quickWins?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (crawlId) params.set('crawlId', crawlId);
    if (jobId) params.set('jobId', jobId);
    if (category) params.set('category', category);
    if (quickWins) params.set('quickWins', 'true');
    const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`);
    return res.json();
  },

  async getContentStrategy(crawlId?: string, jobId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (crawlId) params.set('crawlId', crawlId);
    if (jobId) params.set('jobId', jobId);
    const res = await fetch(`${API_BASE}/content-strategy?${params.toString()}`);
    return res.json();
  },

  async getCannibalization(crawlId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cannibalization?crawlId=${encodeURIComponent(crawlId)}`);
    return res.json();
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};

