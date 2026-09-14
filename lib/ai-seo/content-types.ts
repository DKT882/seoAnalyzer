import { SEOEvidence } from './types';

export type AIContentType =
  | 'paragraph'
  | 'section'
  | 'product-description'
  | 'category-description'
  | 'blog-article'
  | 'blog-intro'
  | 'blog-conclusion'
  | 'faq'
  | 'meta-title'
  | 'meta-description'
  | 'headings'
  | 'image-alt'
  | 'content-brief'
  | 'content-improvement';

export type ContentProfile =
  | 'general'
  | 'ecommerce'
  | 'saas'
  | 'local-business'
  | 'publisher'
  | 'adult';

export type AdultContentProfile =
  | 'adult-entertainment'
  | 'adult-products'
  | 'sexual-wellness'
  | 'adult-creator'
  | 'adult-community'
  | 'adult-video'
  | 'escort-services'
  | 'adult-stories';

export interface AdultSEOContext {
  isAdultSite: true;
  profile: AdultContentProfile;
  ageRestricted: boolean;
  contentClassification: 'adult' | 'sexual-wellness' | 'adult-product' | 'non-explicit' | 'adult-video' | 'adult-service' | 'adult-literature';
  audience: string;
  safeSearchConsiderations: string[];
  trustRequirements: string[];
  restrictedClaims: string[];
  schemaRecommendations: string[];
  schemaRestrictions: string[];
}

export type AISearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational' | 'mixed';
export type AIContentTone = 'professional' | 'conversational' | 'authoritative' | 'persuasive' | 'educational' | 'technical';

export interface EvidenceAvailability {
  keywordEvidence: boolean;
  serpEvidence: boolean;
  crawlEvidence: boolean;
  competitorEvidence: boolean;
}

export interface ContentBlueprintSection {
  heading: string;
  purpose: string;
  targetWords: number;
  requiredTopics: string[];
  requiredQuestions: string[];
  requiredEntities: string[];
  evidence: string[];
}

export interface ContentBlueprint {
  intent: AISearchIntent;
  userGoal: string;
  primaryTopic: string;
  sections: ContentBlueprintSection[];
  totalTargetWords: number;
  contentProfile?: ContentProfile;
  adultContext?: AdultSEOContext;
}

export interface ContentIntelligencePlan {
  primaryTopic: string;
  primaryKeyword: string;
  contentProfile?: ContentProfile;
  adultContext?: AdultSEOContext;
  safeSearchConsiderations?: string[];
  searchIntent: {
    type: AISearchIntent;
    confidence: number;
    explanation: string;
  };
  audience: string;
  userGoal: string;
  secondaryKeywords: string[];
  relatedTerms: string[];
  entities: string[];
  questions: string[];
  topicClusters: {
    topic: string;
    importance: 'critical' | 'important' | 'supporting';
    evidence: string[];
  }[];
  serpPatterns: {
    recurringTopics: string[];
    recurringQuestions: string[];
    commonFormats: string[];
    evidenceBacked: boolean;
  };
  contentGaps: string[];
  differentiationOpportunities: string[];
  requiredSections: ContentBlueprintSection[];
  internalLinkOpportunities: {
    url: string;
    anchorSuggestion: string;
    reason: string;
  }[];
  schemaRecommendation: string[];
  metadataPlan: {
    title: string;
    metaDescription: string;
    slug: string;
    h1: string;
  };
}

export interface ContentClaim {
  text: string;
  type: 'site-fact' | 'provided-fact' | 'derived' | 'general';
  evidence?: string;
  confidence: number;
}

export interface AIContentSection {
  heading: string;
  content: string;
  wordCount: number;
  coveredTopics: string[];
  usedKeywords: string[];
  usedEntities: string[];
}

export interface AIContentTopicCoverage {
  overallScore: number; // 0-100 deterministic coverage score
  intentSatisfaction: number; // 0-100
  criticalTopicsCovered: number; // 0-100
  importantTopicsCovered: number; // 0-100
  questionsCovered: number; // 0-100
  entitiesCovered: number; // 0-100
  differentiationScore: number; // 0-100
  coveredList: string[];
  missingList: string[];
}

export interface AIContentQualityScoreDetails {
  score: number; // 0-100 People-first content quality heuristic
  seoOpportunity: number; // 0-100 Optimization opportunity assessment
  intentSatisfaction: number;
  topicCoverage: number;
  originalValue: number;
  evidenceSupport: number;
  readability: number;
  keywordNaturalness: number;
  structure: number;
  differentiation: number;
  trust?: number;
  safetyAccuracy?: number;
}

export interface AIContentGenerationRequest {
  contentType: AIContentType | string;
  mainTopic: string;
  primaryKeyword: string;
  contentProfile?: ContentProfile;
  adultProfile?: AdultContentProfile;
  isAdultSite?: boolean;
  wordLimit?: number;
  secondaryKeywords?: string[] | string;
  relatedTopics?: string[] | string;
  searchIntent?: AISearchIntent | string;
  targetAudience?: string;
  tone?: AIContentTone | string;
  language?: string;
  country?: string;
  existingContent?: string;
  improvementGoal?: 'improve_seo' | 'rewrite' | 'expand' | 'shorten' | 'readability' | 'intent' | 'missing_topics';
  brandDescription?: string;
  productInfo?: {
    brand?: string;
    sku?: string;
    price?: number | string;
    features?: string[];
    specs?: Record<string, string>;
  };
  keyBenefits?: string[];
  cta?: string;
  requiredHeadings?: string[];
  forbiddenClaims?: string[];
  internalLinks?: Array<{ targetPage: string; suggestedAnchor?: string }>;
  evidence?: Partial<SEOEvidence>;
  url?: string;
}

export interface AIContentKeywordCoverage {
  keyword: string;
  status: 'used' | 'partially_used' | 'not_used';
  occurrences: number;
  locations: string[];
  naturalness: 'natural' | 'forced' | 'missing';
}

export interface AIContentHeadingItem {
  level: 'h2' | 'h3' | 'h4';
  text: string;
  purpose?: string;
}

export interface AIContentImageAltItem {
  suggestedAlt: string;
  placement?: string;
  reason: string;
}

export interface AIContentInternalLinkItem {
  sourcePage?: string;
  targetPage: string;
  suggestedAnchor: string;
  reason: string;
}

export interface AIContentQualityReport {
  score: number; // 0-100 heuristic
  seoOpportunity?: number; // 0-100 opportunity assessment
  wordCountPass: boolean;
  keywordStuffingDetected: boolean;
  intentAlignment: 'strong' | 'moderate' | 'weak';
  readabilityLevel: 'basic' | 'intermediate' | 'advanced';
  issues: string[];
  strengths: string[];
  details?: AIContentQualityScoreDetails;
}

export interface AIContentImprovementReport {
  originalContent: string;
  improvedContent: string;
  changesMade: string[];
  seoImprovements: string[];
  warnings: string[];
}

export interface AIContentGenerationResponse {
  content: string;
  contentType: string;
  contentProfile?: ContentProfile;
  adultContext?: AdultSEOContext;
  isAdultSite?: boolean;
  safeSearchConsiderations?: string[];
  requestedWordCount: number;
  actualWordCount: number;
  deviation: number;

  evidenceAvailability: EvidenceAvailability;
  blueprint: ContentBlueprint;
  contentBlueprint: ContentBlueprint;
  contentPlan: ContentIntelligencePlan;
  topicCoverage: AIContentTopicCoverage;
  claims: ContentClaim[];

  seo: {
    primaryKeyword: string;
    primaryKeywordUsed: boolean;
    primaryKeywordCount: number;
    secondaryKeywords: string[];
    relatedTopics: string[];
    entities: string[];
    searchIntent: string;
    topicCoverage?: number;
    intentSatisfaction?: number;
    keywordNaturalness?: number;
    keywordCoverage: AIContentKeywordCoverage[];
  };

  metadata: {
    title: string;
    alternativeTitles: string[];
    titleRationale: string;
    metaDescription: string;
    alternativeDescriptions: string[];
    metaDescriptionRationale: string;
    slug: string;
    h1: string;
    headings: AIContentHeadingItem[];
  };

  structuredData: {
    recommendedTypes: string[];
    reasoning: string[];
    schemaSnippet?: string;
    missingRequiredData: string[];
  };

  social: {
    ogTitle: string;
    ogDescription: string;
    ogType: string;
    twitterCard: 'summary' | 'summary_large_image';
    twitterTitle: string;
    twitterDescription: string;
  };

  images: AIContentImageAltItem[];
  internalLinks: AIContentInternalLinkItem[];
  contentQuality: AIContentQualityReport;
  contentImprovement?: AIContentImprovementReport;

  generation: {
    provider: string;
    model: string;
    fallbackUsed: boolean;
    sectionsPlanned?: number;
    sectionsGenerated: number;
    failedSections?: string[];
    calls?: number;
    generationAttempts?: number;
    expansionAttempts?: number;
    expansionPasses: number;
    requestedWords: number;
    actualWords: number;
    durationMs?: number;
    tokensPerSecond?: number;
  };

  warnings: string[];
  evidenceUsed: string[];
  disclaimers: {
    noRankingGuarantee: string;
    metaKeywordsNotice: string;
    qualityScoreNotice: string;
    seoOpportunityNotice: string;
  };
}
