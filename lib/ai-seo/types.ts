import {
  ActionCategory,
  ActionSeverity,
  ActionPriorityLevel,
  ActionEffort,
  ActionConfidence,
  ActionStatus,
  ActionEvidenceItem,
  PageType,
  ContentSearchIntent
} from '@/types';

// ==========================================
// 1. NORMALIZED SEO EVIDENCE MODEL
// ==========================================

export interface TechnicalEvidence {
  statusCode?: number;
  isIndexable?: boolean;
  canonicalUrl?: string | null;
  selfReferentialCanonical?: boolean;
  robotsDirectives?: {
    noindex?: boolean;
    nofollow?: boolean;
    isBlockedByRobotsTxt?: boolean;
  };
  title?: {
    value?: string;
    length?: number;
    isMissing?: boolean;
    isDuplicate?: boolean;
  };
  metaDescription?: {
    value?: string;
    length?: number;
    exists?: boolean;
    isDuplicate?: boolean;
  };
  headings?: {
    h1Count?: number;
    h1Text?: string;
    h2Count?: number;
    headingsWithoutContentCount?: number;
  };
  performance?: {
    responseTimeMs?: number;
    pageSizeBytes?: number;
    lcpEstimateMs?: number;
    inpEstimateMs?: number;
    clsEstimate?: number;
  };
  schema?: {
    types?: string[];
    hasValidJsonLd?: boolean;
    missingRequiredFields?: string[];
    schemaCount?: number;
  };
  security?: {
    isHttps?: boolean;
    hasMixedContent?: boolean;
  };
  mobile?: {
    hasViewport?: boolean;
  };
}

export interface ContentEvidence {
  wordCount?: number;
  mainWordCount?: number;
  pageType?: PageType | string;
  searchIntent?: ContentSearchIntent | string;
  intentConfidence?: string;
  topicCoverageScore?: number;
  primaryTopics?: string[];
  secondaryTopics?: string[];
  topicGaps?: string[];
  repetitionRatio?: number;
  eEaTSignals?: {
    hasAuthor?: boolean;
    hasContactInfo?: boolean;
    hasTransparencySignals?: boolean;
    firstHandExperienceIndicators?: string[];
  };
  readabilityScore?: number;
}

export interface InternalLinkEvidence {
  inlinkCount?: number;
  outlinkCount?: number;
  externalLinkCount?: number;
  isOrphanCandidate?: boolean;
  orphanCategory?: string;
  brokenLinksCount?: number;
  contextualInlinksNeeded?: boolean;
  internalLinkCentralityScore?: number;
}

export interface KeywordEvidence {
  targetKeyword?: string;
  userSpecifiedKeywords?: string[];
  extractedPrimaryKeyword?: string;
  keywordDensity?: number;
  inTitle?: boolean;
  inH1?: boolean;
  inMeta?: boolean;
  relevanceScore?: number;
}

export interface EcommerceEvidence {
  isEcommercePage?: boolean;
  hasProductSchema?: boolean;
  price?: number | string;
  currency?: string;
  availability?: string;
  sku?: string;
  brand?: string;
  hasReviewSchema?: boolean;
  ratingValue?: number;
  reviewCount?: number;
  imageAltMissingCount?: number;
  hasBreadcrumbs?: boolean;
  isCategoryPage?: boolean;
}

export interface SerpEvidence {
  targetQuery?: string;
  dominantSerpIntent?: string;
  isMixedSerp?: boolean;
  intentAlignmentStatus?: 'STRONG_ALIGNMENT' | 'MODERATE_ALIGNMENT' | 'WEAK_ALIGNMENT' | 'INSUFFICIENT_EVIDENCE';
  dominantPageType?: string;
  missingCompetitorTopics?: string[];
  serpFeaturesObserved?: string[];
  competitorDomains?: string[];
  userPageSerpPosition?: number;
}

export interface CompetitorGapEvidence {
  topCompetitorUrls?: string[];
  contentGapsVsTopRanked?: string[];
  schemaGapsVsCompetitors?: string[];
  averageCompetitorWordCount?: number;
}

export interface SEOEvidence {
  url: string;
  domain: string;
  pageType?: PageType | string;
  crawledAt: string;
  sourceAudits?: {
    pageAuditId?: string;
    crawlSessionId?: string;
    searchAuditId?: string;
  };
  technical?: TechnicalEvidence;
  content?: ContentEvidence;
  links?: InternalLinkEvidence;
  keywords?: KeywordEvidence;
  ecommerce?: EcommerceEvidence;
  serp?: SerpEvidence;
  competitors?: CompetitorGapEvidence;
  rawIssuesSummary?: string[];
}

// ==========================================
// 2. AI RECOMMENDATION MODEL
// ==========================================

export type AIImplementationType =
  | 'content_edit'
  | 'html_patch'
  | 'metadata_update'
  | 'schema_jsonld'
  | 'internal_link'
  | 'server_config'
  | 'manual_review';

export interface AIRecommendation {
  issueId: string;
  url: string;
  category: ActionCategory | string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // 0.00 to 1.00

  observation: string;
  evidence: string[];
  seoReason: string;
  recommendedAction: string;

  implementation: {
    type: AIImplementationType;
    targetElement?: string;
    proposedValue?: string;
    suggestedPattern?: string;
  };

  risk: 'low' | 'moderate' | 'high';
  requiresApproval: boolean;
  agentSource?: string;
  caution?: string;
  expectedBenefit?: string;
  verificationChecklist?: string[];
}

// ==========================================
// 3. FIX GENERATION & PATCH MODELS
// ==========================================

export type FixPatchType =
  | 'content_patch'
  | 'html_patch'
  | 'metadata_patch'
  | 'schema_patch'
  | 'link_patch';

export interface SEOFixRequest {
  recommendation: AIRecommendation;
  evidence: SEOEvidence;
  currentCodeSnippet?: string;
  pageHtmlSample?: string;
}

export interface SEOFix {
  fixId: string;
  issueId: string;
  url: string;
  patchType: FixPatchType;
  title: string;
  explanation: string;
  targetLocation: string; // CSS selector, line location, or tag name
  before: string;
  after: string;
  diffSummary: string;
  isDestructive: boolean;
  generatedAt: string;
  safetyCautions: string[];
  appliedStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'VALIDATION_FAILED';
}

// ==========================================
// 4. VALIDATION MODELS
// ==========================================

export interface SEOValidationRequest {
  fix: SEOFix;
  evidence: SEOEvidence;
}

export interface SEOValidationCheckItem {
  checkName: string;
  passed: boolean;
  details: string;
}

export interface SEOValidationResult {
  fixId: string;
  isValid: boolean;
  status: 'passed' | 'validation_failed';
  checks: {
    htmlValid: boolean;
    schemaValid: boolean;
    canonicalValid: boolean;
    noIndexSafe: boolean;
    regressionsFree: boolean;
  };
  individualChecks: SEOValidationCheckItem[];
  issuesFound: string[];
  warningMessages: string[];
  validatedAt: string;
}

// ==========================================
// 5. AI PROVIDER CONFIGURATION
// ==========================================

export type AIProviderType =
  | 'RULE_INFORMED_OFFLINE'
  | 'OLLAMA'
  | 'OPENAI_COMPATIBLE' // Local Ollama, Qwen, Llama, vLLM, Gemini, OpenAI
  | 'CLAUDE_API'
  | 'MOCK_TEST';

export interface AIProviderConfig {
  providerType: AIProviderType;
  apiKey?: string;
  endpointUrl?: string; // e.g. http://127.0.0.1:11434 for Ollama, http://localhost:8000/v1 for vLLM
  modelName?: string;   // e.g. 'qwen2.5-coder:7b', 'llama3.2:3b', 'claude-3-7-sonnet', 'gpt-4o-mini'
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ProviderTelemetry {
  providerType: string;
  modelName: string;
  durationMs: number;
  promptSizeBytes: number;
  responseSizeBytes: number;
  fallbackTriggered: boolean;
  fallbackReason?: string;
}
