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

export type AISearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type AIContentTone = 'professional' | 'conversational' | 'authoritative' | 'persuasive' | 'educational' | 'technical';

export interface AIContentGenerationRequest {
  contentType: AIContentType | string;
  mainTopic: string;
  primaryKeyword: string;
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
  wordCountPass: boolean;
  keywordStuffingDetected: boolean;
  intentAlignment: 'strong' | 'moderate' | 'weak';
  readabilityLevel: 'basic' | 'intermediate' | 'advanced';
  issues: string[];
  strengths: string[];
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
  requestedWordCount: number;
  actualWordCount: number;
  deviation: number;

  seo: {
    primaryKeyword: string;
    primaryKeywordUsed: boolean;
    primaryKeywordCount: number;
    secondaryKeywords: string[];
    relatedTopics: string[];
    entities: string[];
    searchIntent: string;
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

  warnings: string[];
  evidenceUsed: string[];
  disclaimers: {
    noRankingGuarantee: string;
    metaKeywordsNotice: string;
    qualityScoreNotice: string;
  };
}
