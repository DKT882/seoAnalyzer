import {
  AnalyzeUrlRequest,
  AnalyzeUrlResponse,
  AnalysisJob,
  CompareCompetitorsRequest,
  CompareCompetitorsResponse,
  DomainOverviewData,
  DataProviderInfo,
} from '@seo-analyzer/shared';

const API_BASE = '/api';

export class ApiError extends Error {
  statusCode?: number;
  details?: string[];

  constructor(message: string, statusCode?: number, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const apiClient = {
  async analyzeUrl(payload: AnalyzeUrlRequest): Promise<AnalyzeUrlResponse> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        data.error || `Analysis request failed with status ${res.status}`,
        res.status,
        data.details
      );
    }

    return data as AnalyzeUrlResponse;
  },

  async compareCompetitors(payload: CompareCompetitorsRequest): Promise<CompareCompetitorsResponse> {
    const res = await fetch(`${API_BASE}/competitors/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        data.error || `Competitor comparison failed with status ${res.status}`,
        res.status,
        data.details
      );
    }

    return data as CompareCompetitorsResponse;
  },

  async getDomainOverview(urlOrDomain: string): Promise<DomainOverviewData> {
    const res = await fetch(`${API_BASE}/domain-overview?domain=${encodeURIComponent(urlOrDomain)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to fetch domain overview', res.status);
    }
    return data as DomainOverviewData;
  },

  async getDataSources(): Promise<DataProviderInfo[]> {
    const res = await fetch(`${API_BASE}/settings/data-sources`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to fetch data source providers', res.status);
    }
    return data.providers || [];
  },

  async getJob(id: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to fetch job status', res.status);
    }
    return data as AnalysisJob;
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to fetch history', res.status);
    }
    return data.history || [];
  },

  getExportUrl(id: string, format: 'json' | 'csv' | 'html' | 'xlsx', type?: string): string {
    const params = new URLSearchParams({ format });
    if (type) params.set('type', type);
    return `${API_BASE}/export/${encodeURIComponent(id)}?${params.toString()}`;
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
