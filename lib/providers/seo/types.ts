import { KeywordCategory, SearchIntent } from '@/types';

export type ProviderStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'CONNECTED'
  | 'RATE_LIMITED'
  | 'AUTH_FAILED'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'ERROR';

export interface ProviderStatusInfo {
  provider: string;
  status: ProviderStatus;
  statusMessage: string;
  configured: boolean;
  lastChecked?: string;
  quotaRemaining?: number;
}

export interface VolumeTrendPoint {
  month: string;
  year?: number;
  volume: number;
}

export interface KeywordMarketData {
  keyword: string;
  source: 'EXTERNAL';
  country: string;
  language: string;
  searchVolume: number | null;
  volumeTrend: VolumeTrendPoint[] | null;
  keywordDifficulty: number | null; // 0-100
  competition: number | null; // 0-1 (e.g., Google Ads competition index)
  cpc: number | null;
  serpFeatures: string[] | null;
  topCompetitorDomains: string[] | null;
  dataTimestamp: string;
  provider: string;
  providerStatus: ProviderStatus;
}

export interface SerpItem {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  features?: string[];
}

export interface SerpData {
  keyword: string;
  country: string;
  language: string;
  totalResults: number | null;
  items: SerpItem[];
  features: string[];
  competitorDomains: string[];
  dataTimestamp: string;
  provider: string;
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  relevance?: number;
  type?: 'related' | 'suggestion' | 'question' | 'longtail';
  provider: string;
}

export interface KeywordQueryOptions {
  country?: string;
  language?: string;
  limit?: number;
}

export interface SerpQueryOptions {
  country?: string;
  language?: string;
  depth?: number;
}

export interface SEOKeywordProvider {
  readonly name: string;
  getStatus(): Promise<ProviderStatusInfo>;
  getKeywordMetrics(keywords: string[], options?: KeywordQueryOptions): Promise<KeywordMarketData[]>;
  getRelatedKeywords(seed: string, options?: KeywordQueryOptions): Promise<KeywordSuggestion[]>;
  getKeywordSuggestions(seed: string, options?: KeywordQueryOptions): Promise<KeywordSuggestion[]>;
  getSerpResults(keyword: string, options?: SerpQueryOptions): Promise<SerpData | null>;
}

export interface SEOOpportunityFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  description: string;
  weight: number;
}

export interface SEOOpportunityBreakdown {
  finalScore: number; // 0-100
  internalRelevance: number; // 0-100
  marketDemandScore: number | null; // 0-100 derived from search volume when available
  difficultyScore: number | null; // 0-100 where lower KD = higher opportunity
  gapBonus: number; // 0 to 20
  intentAlignmentBonus: number; // 0 to 10
  explanation: string;
  factors: SEOOpportunityFactor[];
}

export interface EnrichedKeyword {
  keyword: string;
  sources: ('EXTRACTED' | 'RECOMMENDED' | 'COMPETITOR_GAP' | 'EXTERNAL')[];
  category: KeywordCategory;
  internalMetrics: {
    relevanceScore: number;
    qualityScore: number;
    frequency: number;
    density: number;
    prominence: number;
    locations: {
      inTitle: boolean;
      inH1: boolean;
      inH2H6: boolean;
      inMeta: boolean;
      inBody: boolean;
    };
    coverageStatus: 'Strong' | 'Weak' | 'Missing';
    estimatedIntent: SearchIntent;
    evidence?: string[];
    reason?: string;
  };
  marketData: KeywordMarketData | null;
  serpData: SerpData | null;
  opportunityScore: SEOOpportunityBreakdown;
  targetUrl?: string;
  recommendationAction: string;
}
