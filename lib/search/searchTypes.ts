import {
  PageType,
  ContentSearchIntent,
  ConfidenceLevel,
  CrossPageRecommendation,
  SEOReport,
} from '@/types';

// ==========================================
// 1. AUDIT MODES & SOURCES
// ==========================================

export type SearchAuditMode =
  | 'SEARCH_QUERY'
  | 'PAGE_SEARCH_INTELLIGENCE'
  | 'SITE_SEARCH_INTELLIGENCE';

export type QuerySource =
  | 'USER_TARGET'
  | 'EXTRACTED_PAGE_TOPIC'
  | 'SITE_TOPIC_CLUSTER'
  | 'RECOMMENDED_QUERY';

export type SearchDevice = 'DESKTOP' | 'MOBILE' | 'TABLET';

export type SearchResultType =
  | 'ORGANIC'
  | 'FEATURED_SNIPPET'
  | 'LOCAL_PACK'
  | 'VIDEO'
  | 'IMAGE'
  | 'NEWS'
  | 'SHOPPING'
  | 'PEOPLE_ALSO_ASK'
  | 'RELATED_SEARCHES'
  | 'KNOWLEDGE_PANEL'
  | 'OTHER';

export type PageTypeProvenance =
  | 'INFERRED_FROM_SERP_SNIPPET'
  | 'ANALYZED_FROM_FETCHED_HTML';

export type TopicProvenance =
  | 'SERP_SNIPPET_DERIVED'
  | 'FETCHED_PAGE_ANALYSIS'
  | 'HEADING_DERIVED';

// ==========================================
// 2. PROVENANCE & RESOURCE CONTROLS
// ==========================================

export interface ObservationProvenance {
  source: 'EXTERNAL_SERP' | 'FETCHED_COMPETITOR_HTML' | 'PAGE_ANALYSIS';
  provider: string;
  collectedAt: string;
  location: string;
  language: string;
  device: SearchDevice;
  extractionMethod: 'SERP_SNIPPET' | 'FETCHED_HTML' | 'HEADING_AST';
  isSyntheticTest: boolean;
  fingerprint: string;
}

export interface SearchResourceLimits {
  maxQueries: number;
  maxResultsPerQuery: number;
  maxConcurrentSearches: number;
  maxProviderRequestsPerAudit: number;
  maxCompetitorPages: number;
  maxCompetitorRequests: number;
  maxCompetitorBrowserRenders: number;
  maxCompetitorResponseBytes: number;
  totalSearchTimeoutMs: number;
}

export interface ProviderUsageTelemetry {
  providerId: string;
  usedRequests: number;
  maxRequests: number;
  cachedHits: number;
  failedRequests: number;
  estimatedCostCredits: number;
  executionDurationMs: number;
}

// ==========================================
// 3. NORMALIZED SERP RESULTS & SNAPSHOTS
// ==========================================

export interface SerpResultItem {
  id: string;
  serpPosition: number; // Overall position in SERP layout (1..N)
  organicPosition?: number; // 1..N for strictly ORGANIC resultType only
  url: string;
  domain: string;
  title: string;
  snippet: string;
  displayedUrl?: string;
  resultType: SearchResultType;
  detectedPageType?: PageType;
  pageTypeProvenance?: PageTypeProvenance;
  detectedIntent?: ContentSearchIntent;
  sitelinks?: string[];
  extraMetadata?: Record<string, any>;
  provenance: ObservationProvenance;
}

export interface SerpFeatureItem {
  type: SearchResultType;
  title?: string;
  items?: Array<{ title?: string; url?: string; snippet?: string }>;
  snippet?: string;
  position: number;
}

export interface NormalizedSerpSnapshot {
  id: string;
  fingerprint: string; // Deterministic SHA-256 hash
  query: string;
  normalizedQuery: string;
  source: QuerySource;
  collectedAt: string;
  provider: string;
  location: string;
  language: string;
  device: SearchDevice;
  results: SerpResultItem[];
  serpFeatures: SerpFeatureItem[];
  organicCount: number;
  featureTypes: SearchResultType[];
  freshnessAgeMinutes: number;
  sourceMetadata: {
    rawResultCount: number;
    responseTimeMs: number;
    isSyntheticTest: boolean;
    providerLabel: string;
    disclaimer: string;
  };
  provenance: ObservationProvenance;
}

export interface SearchQueryTarget {
  query: string;
  normalizedQuery: string;
  source: QuerySource;
  targetPageUrl?: string;
  userSpecified?: boolean;
  priorityWeight?: number;
}

// ==========================================
// 4. SEARCH INTEL ALIGNMENT & PATTERNS
// ==========================================

export type IntentAlignmentLevel =
  | 'STRONG_ALIGNMENT'
  | 'MODERATE_ALIGNMENT'
  | 'WEAK_ALIGNMENT'
  | 'INSUFFICIENT_EVIDENCE';

export interface SearchIntentAlignment {
  query: string;
  level: IntentAlignmentLevel;
  userPageIntent?: ContentSearchIntent;
  observedSerpIntentPattern: ContentSearchIntent | 'OBSERVED_SERP_INTENT_MIXED';
  intentDistribution: Record<string, number>; // e.g. { INFORMATIONAL: 7, TRANSACTIONAL: 3 }
  isMixedSerp: boolean;
  confidence: ConfidenceLevel;
  explanation: string;
  provenance: ObservationProvenance;
}

export type PageTypeAlignmentStatus =
  | 'ALIGNED'
  | 'POTENTIAL_MISALIGNMENT'
  | 'DIVERSE_SERP'
  | 'INSUFFICIENT_EVIDENCE';

export interface PageTypeAlignment {
  query: string;
  userPageType?: PageType;
  observedDistribution: Record<string, number>; // e.g. { ARTICLE: 6, PRODUCT: 4 }
  dominantType: PageType | 'MIXED_PAGE_TYPES';
  alignmentStatus: PageTypeAlignmentStatus;
  explanation: string;
  provenance: ObservationProvenance;
}

export interface SerpTopicPattern {
  topic: string;
  frequency: number;
  percentage: number;
  isCoveredInUserPage: boolean;
  provenance: TopicProvenance;
  category:
    | 'OBSERVED_COMMON_TOPIC'
    | 'POTENTIAL_CONTENT_GAP'
    | 'POTENTIAL_SUPPORTING_TOPIC';
  sampleSnippets: string[];
}

export interface ObservedSerpDomain {
  domain: string;
  frequency: number;
  averageSerpPosition: number;
  averageOrganicPosition?: number;
  bestPosition: number;
  urls: string[];
  dominantPageType?: PageType;
  observedQueries: string[];
  provenance: ObservationProvenance;
}

// ==========================================
// 5. SEARCH OPPORTUNITY MODEL
// ==========================================

export interface SearchOpportunity {
  id: string;
  query: string;
  source: QuerySource;
  observedIntent: ContentSearchIntent | 'OBSERVED_SERP_INTENT_MIXED';
  userPageUrl?: string;
  userPageTitle?: string;
  observedSerpPattern: string;
  pageTypeAlignment: PageTypeAlignment;
  intentAlignment: SearchIntentAlignment;
  topicEvidence: SerpTopicPattern[];
  contentGaps: string[];
  recommendation: CrossPageRecommendation; // Standard 6-pillar format
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
  evidenceTimestamp: string;
  provenance: ObservationProvenance;
}

export interface InternalLinkSerpOpportunity {
  sourcePageUrl: string;
  sourcePageTitle: string;
  targetPageUrl: string;
  targetPageTitle: string;
  query: string;
  topic: string;
  observedSerpIntent: string;
  recommendedAnchorText: string;
  context: string;
  recommendation: CrossPageRecommendation;
}

// ==========================================
// 6. SEARCH AUDIT REPORT ROOT
// ==========================================

export interface SearchIntelligenceAuditReport {
  id: string;
  mode: SearchAuditMode;
  timestamp: string;
  targetDomain?: string;
  userPageUrl?: string;
  queries: SearchQueryTarget[];
  snapshots: NormalizedSerpSnapshot[];
  intentAlignments: Record<string, SearchIntentAlignment>;
  pageTypeAlignments: Record<string, PageTypeAlignment>;
  topicPatterns: Record<string, SerpTopicPattern[]>;
  observedDomains: ObservedSerpDomain[];
  opportunities: SearchOpportunity[];
  internalLinkIntegrations: InternalLinkSerpOpportunity[];
  telemetry: ProviderUsageTelemetry;
  disclaimers: {
    antiFabricationNotice: string;
    rankingDisclaimer: string;
    provenanceSummary: string;
  };
}
