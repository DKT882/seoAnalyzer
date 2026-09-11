export type JobStatus = 'pending' | 'crawling' | 'parsing' | 'analyzing' | 'completed' | 'failed';

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'RECOMMENDATION' | 'GOOD';

export type IssueCategory =
  | 'onpage'
  | 'technical'
  | 'content'
  | 'keywords'
  | 'links'
  | 'images'
  | 'mobile'
  | 'indexability'
  | 'structured_data';

export interface SEOIssue {
  id: string;
  code: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  affectedElement?: string;
}

export type NGramType = '1-gram' | '2-gram' | '3-gram' | 'long-tail';

export type KeywordCategory =
  | 'primary'
  | 'secondary'
  | 'short-tail'
  | 'long-tail'
  | 'related'
  | 'question'
  | 'entity'
  | 'opportunity';

export interface KeywordItem {
  id: string;
  keyword: string;
  nGramType: NGramType;
  category: KeywordCategory;
  frequency: number;
  density: number;
  prominenceScore: number;
  overallScore: number;
  inTitle: boolean;
  inH1: boolean;
  inH2H6: boolean;
  inMeta: boolean;
  inUrl: boolean;
  inAnchor: boolean;
  inAlt: boolean;
  inBody: boolean;
  semanticCategory?: string;
  topicCluster?: string;
  wordCount?: number;
  // Category B External fields (always marked explicit status)
  externalSearchVolume?: string;
  externalDifficulty?: string;
  externalCpc?: string;
  externalIntent?: string;
}

export interface KeywordOpportunityItem {
  id: string;
  keyword: string;
  keywordType: KeywordCategory;
  wordCount: number;
  frequency: number;
  density: number;
  prominenceScore: number;
  opportunityScore: number; // 0-100 calculated internal score
  difficultyEstimate: 'LOW' | 'MEDIUM' | 'HIGH';
  potential: 'HIGH' | 'MEDIUM' | 'LOW';
  targetPlacement: string;
  recommendedAction: string;
  missingFromTitle: boolean;
  missingFromH1: boolean;
  missingFromMeta: boolean;
  missingFromAlt: boolean;
  currentLocations: string[];
}

export interface TopicCluster {
  name: string;
  keywords: string[];
  totalFrequency: number;
  averageScore: number;
}

export interface EntityItem {
  name: string;
  type: string;
  occurrences: number;
  relevance: number;
}

export interface HeadingItem {
  level: number;
  text: string;
  id?: string;
}

export interface HeadingHierarchy {
  items: HeadingItem[];
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  hasMissingH1: boolean;
  hasMultipleH1: boolean;
  hasSkippedLevels: boolean;
  issues: string[];
}

export interface OnPageData {
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonicalUrl: string;
  isCanonicalMatch: boolean;
  robotsMeta: string;
  viewport: string;
  language: string;
  hreflang: Array<{ lang: string; href: string }>;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  wordCount: number;
  readingTimeMinutes: number;
  textToHtmlRatio: number;
  headings: HeadingHierarchy;
  paragraphsCount: number;
  listsCount: number;
  tablesCount: number;
}

export interface LinkItem {
  url: string;
  text: string;
  isInternal: boolean;
  isExternal: boolean;
  isNofollow: boolean;
  isBroken?: boolean;
  statusCode?: number;
  rel?: string;
}

export interface LinksAnalysis {
  totalLinks: number;
  internalLinksCount: number;
  externalLinksCount: number;
  nofollowCount: number;
  internalLinks: LinkItem[];
  externalLinks: LinkItem[];
  brokenLinks: LinkItem[];
  internalExternalRatio: number;
}

export interface ImageItem {
  src: string;
  alt: string;
  hasAlt: boolean;
  isDecorative: boolean;
  filename: string;
  width?: number;
  height?: number;
  loading?: string;
}

export interface ImagesAnalysis {
  totalImages: number;
  withAlt: number;
  missingAlt: number;
  altCoverageRatio: number;
  images: ImageItem[];
}

export interface SchemaItem {
  type: string;
  rawJson: string;
  isValid: boolean;
  breadcrumbs?: string[];
  faqs?: Array<{ question: string; answer: string }>;
}

export interface RobotsAnalysis {
  exists: boolean;
  url: string;
  status: number;
  content?: string;
  sitemaps: string[];
  isBotAllowed: boolean;
  crawlDelay?: number;
  directivesCount: number;
}

export interface SitemapAnalysis {
  exists: boolean;
  url: string;
  status: number;
  totalUrls: number;
  urlsSample: string[];
  isIndex: boolean;
  parseError?: string;
}

export interface TechnicalSEO {
  httpStatus: number;
  isHttps: boolean;
  isIndexable: boolean;
  responseTimeMs: number;
  pageSizeBytes: number;
  redirectCount: number;
  redirectChain: string[];
  mobileViewportConfigured: boolean;
  contentType: string;
  charset: string;
  robotsAnalysis: RobotsAnalysis;
  sitemapAnalysis: SitemapAnalysis;
}

export interface SEOScores {
  overall: number;
  onPage: number;
  technical: number;
  content: number;
  links: number;
  mobile: number;
}

// ==========================================
// 1. PAGE ELEMENTS / TAG EXPLORER MODELS
// ==========================================
export type PageElementCategory =
  | 'metadata'
  | 'headings'
  | 'social'
  | 'content'
  | 'links'
  | 'images'
  | 'structuredData';

export type ElementIssueStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'INFO';

export interface PageElementItem {
  id: string;
  category: PageElementCategory;
  tag: string;
  name: string;
  value: string;
  location: string;
  count: number;
  seoRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  status: ElementIssueStatus;
  recommendation: string;
  attributes?: Record<string, string>;
}

export interface TagExplorerData {
  totalElementsCount: number;
  metadata: PageElementItem[];
  headings: PageElementItem[];
  social: PageElementItem[];
  content: PageElementItem[];
  links: PageElementItem[];
  images: PageElementItem[];
  structuredData: PageElementItem[];
}

// ==========================================
// 5. CONTENT CONTRIBUTION & HEATMAP MODELS
// ==========================================
export interface ContentSectionContribution {
  sectionId: string;
  sectionName: string;
  weight: number;
  signalScore: number; // 0-100
  keywordCoverageRatio: number; // 0-100%
  primaryKeywordCount: number;
  secondaryKeywordCount: number;
  prominenceRank: number;
  contentDepthWordCount: number;
  findings: string[];
  recommendations: string[];
}

export interface ContentSignalHeatmapItem {
  sectionId: string;
  sectionName: string;
  signalScore: number; // 0-100
  intensity: 'critical' | 'moderate' | 'strong' | 'exceptional';
  primaryKeywordsFound: string[];
  entitiesFound: string[];
  recommendation: string;
}

export interface ContentContributionAnalysis {
  overallContributionScore: number; // 0-100 explainable score
  sections: ContentSectionContribution[];
  heatmap: ContentSignalHeatmapItem[];
  strongestSection: string;
  weakestSection: string;
  summary: string;
}

// ==========================================
// 7-10. COMPETITOR COMPARISON & GAP MODELS
// ==========================================
export interface CompetitorPageSummary {
  url: string;
  hostname: string;
  overallScore: number;
  onPageScore: number;
  technicalScore: number;
  contentScore: number;
  wordCount: number;
  headingCount: number;
  keywordCount: number;
  imageCount: number;
  altCoverageRatio: number;
  internalLinksCount: number;
  externalLinksCount: number;
  schemaTypesCount: number;
  responseTimeMs: number;
  topKeywords: string[];
  topTopics: string[];
  schemaTypes: string[];
}

export type KeywordGapType =
  | 'missing_in_target'
  | 'shared_by_all'
  | 'target_unique'
  | 'competitor_unique'
  | 'high_opportunity';

export interface KeywordGapMatrixRow {
  keyword: string;
  nGramType: NGramType;
  targetFrequency: number;
  targetDensity: number;
  competitorFrequencies: Record<string, number>;
  gapType: KeywordGapType;
  opportunityScore: number;
  recommendation: string;
}

export interface MissingTopicItem {
  topic: string;
  competitorsCovering: string[];
  suggestedKeywords: string[];
  suggestedSection: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface ContentGapReport {
  missingTopics: MissingTopicItem[];
  missingEntities: string[];
  missingQuestions: string[];
  missingFaqs: Array<{ question: string; competitorSource: string }>;
  missingSchemaTypes: string[];
  recommendedSections: Array<{
    title: string;
    reason: string;
    suggestedKeywords: string[];
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

export interface OutrankRecommendation {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'CONTENT' | 'KEYWORDS' | 'STRUCTURE' | 'TECHNICAL' | 'SCHEMA';
  title: string;
  problem: string;
  whyItMatters: string;
  evidence: string;
  recommendedAction: string;
  expectedBenefit: string;
}

export interface CompetitorComparisonReport {
  id: string;
  timestamp: string;
  targetUrl: string;
  competitorUrls: string[];
  targetSummary: CompetitorPageSummary;
  competitorsSummaries: CompetitorPageSummary[];
  keywordGapMatrix: KeywordGapMatrixRow[];
  contentGap: ContentGapReport;
  whatTheyDoBetter: Array<{ competitor: string; advantages: string[] }>;
  whatYouDoBetter: string[];
  whatTheyAreMissing: Array<{ competitor: string; gaps: string[] }>;
  outrankRecommendations: OutrankRecommendation[];
  externalMetricsNotice: string;
}

// ==========================================
// 12, 23-25. DOMAIN OVERVIEW & PROVIDER MODELS
// ==========================================
export type ProviderAuthStatus =
  | 'CONNECTED'
  | 'NOT_CONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'QUOTA_EXCEEDED'
  | 'UNAVAILABLE';

export interface DataProviderInfo {
  providerId: string;
  name: string;
  type: 'SERP' | 'KEYWORD' | 'BACKLINK' | 'TRAFFIC' | 'SEARCH_CONSOLE' | 'ANALYTICS';
  status: ProviderAuthStatus;
  statusMessage: string;
  lastSync?: string;
  quotaRemaining?: number;
}

export interface DomainOverviewData {
  domain: string;
  timestamp: string;
  // Category A - Directly Extracted
  categoryA: {
    technicalScore: number;
    contentScore: number;
    pageLevelScore: number;
    wordCount: number;
    detectedKeywordsCount: number;
    internalLinksCount: number;
    externalLinksCount: number;
    schemaCount: number;
    isIndexable: boolean;
    httpsActive: boolean;
  };
  // Category B - External SEO Data (explicit status when no provider)
  categoryB: {
    status: 'UNAVAILABLE';
    message: string;
    searchVolume: string;
    estimatedOrganicTraffic: string;
    paidTraffic: string;
    backlinksCount: string;
    referringDomains: string;
    domainRating: string;
    topRankingKeywords: string;
  };
  // Category C - Private Owner Data (explicit status when not connected)
  categoryC: {
    status: 'UNAUTHORIZED';
    message: string;
    gscClicks: string;
    gscImpressions: string;
    gscCtr: string;
    gscAveragePosition: string;
    gaTraffic: string;
  };
  dataConfidence: 'HIGH (On-Page Data)' | 'MEDIUM' | 'LOW';
}

// ==========================================
// MAIN EXPANDED SEO REPORT INTERFACE
// ==========================================
export interface SEOReport {
  id: string;
  url: string;
  normalizedUrl: string;
  timestamp: string;
  durationMs: number;
  scores: SEOScores;
  onPage: OnPageData;
  technical: TechnicalSEO;
  links: LinksAnalysis;
  images: ImagesAnalysis;
  schemas: SchemaItem[];
  keywords: {
    all: KeywordItem[];
    primary: KeywordItem[];
    secondary: KeywordItem[];
    shortTail: KeywordItem[];
    longTail: KeywordItem[];
    related: KeywordItem[];
    questions: KeywordItem[];
    entities: EntityItem[];
    clusters: TopicCluster[];
    opportunities: KeywordOpportunityItem[];
    totalWords: number;
    uniqueWords: number;
  };
  tagExplorer: TagExplorerData;
  contentContribution: ContentContributionAnalysis;
  issues: SEOIssue[];
  externalSeoDisclaimer: string;
  dataSourceDisclosures: {
    categoryA: string;
    categoryB: string;
    categoryC: string;
  };
}

export interface AnalysisJob {
  id: string;
  url: string;
  normalizedUrl: string;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  report?: SEOReport;
}

export interface AnalyzeUrlRequest {
  url: string;
  checkRobots?: boolean;
  checkSitemap?: boolean;
  useDynamicFallback?: boolean;
}

export interface AnalyzeUrlResponse {
  jobId: string;
  status: JobStatus;
  report?: SEOReport;
  error?: string;
}

export interface CompareCompetitorsRequest {
  targetUrl: string;
  competitorUrls: string[];
}

export interface CompareCompetitorsResponse {
  comparisonId: string;
  status: JobStatus;
  report?: CompetitorComparisonReport;
  error?: string;
}

// ==========================================
// 13. MULTI-PAGE / WHOLE-WEBSITE CRAWL MODELS
// ==========================================
export type CrawlStatus =
  | 'pending'
  | 'discovering'
  | 'crawling'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CrawlOptions {
  url: string;
  maxPages: number;
  concurrency?: number;
  respectRobots?: boolean;
  checkSitemap?: boolean;
}

export interface CrawlProgressStats {
  discovered: number;
  queued: number;
  analyzed: number;
  failed: number;
  skipped: number;
  currentUrl?: string;
  elapsedTimeMs: number;
  percentComplete: number;
}

export interface CrawlPageSummary {
  id: string;
  url: string;
  statusCode: number;
  overallScore: number;
  onPageScore: number;
  technicalScore: number;
  contentScore: number;
  linksScore: number;
  wordCount: number;
  keywordsCount: number;
  title: string;
  metaDescription?: string;
  h1?: string;
  isIndexable: boolean;
  responseTimeMs: number;
  issuesCount: number;
}

export interface SiteOverviewData {
  domain: string;
  targetUrl: string;
  timestamp: string;
  coverage: {
    pagesDiscovered: number;
    pagesAnalyzed: number;
    pagesFailed: number;
    pagesSkipped: number;
    coverageRatio: number;
    allowedByCrawlLimit: number;
  };
  seoScores: {
    averageOverall: number;
    averageOnPage: number;
    averageTechnical: number;
    averageContent: number;
    averageLinks: number;
    bestPage: { url: string; score: number; title: string };
    weakestPage: { url: string; score: number; title: string };
    averageWordCount: number;
    averageKeywordCount: number;
  };
  siteStructure: {
    totalInternalLinks: number;
    totalExternalLinks: number;
    totalImages: number;
    missingAltImagesCount: number;
    totalSchemas: number;
    canonicalIssuesCount: number;
    metaIssuesCount: number;
    headingIssuesCount: number;
  };
  robotsStatus: {
    exists: boolean;
    url: string;
    allowedPagesCount: number;
    blockedPagesCount: number;
    sitemapSources: string[];
  };
}

export interface SiteKeywordItem {
  keyword: string;
  occurrences: number;
  totalOccurrences?: number;
  pagesCount: number;
  pagesUsingIt: string[];
  primaryPages: Array<{ url: string; title: string; score: number }>;
  averageScore: number;
  averageProminence?: number;
  averageDensity?: number;
  topPageUrl?: string;
  siteCoveragePercent?: number;
  category: KeywordCategory;
  topicCluster: string;
  placementCoverage: {
    inTitleCount: number;
    inH1Count: number;
    inMetaCount: number;
    inBodyCount: number;
  };
  opportunityScore: number;
}

export interface KeywordCannibalizationItem {
  id: string;
  keyword: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  competingPages: Array<{
    url: string;
    title: string;
    relevanceScore: number;
    inTitle: boolean;
    inH1: boolean;
    inBody: boolean;
    frequency: number;
  }>;
  reason: string;
  recommendedAction: string;
}

export interface ContentDuplicationItem {
  id: string;
  pageA: { url: string; title: string; wordCount: number };
  pageB: { url: string; title: string; wordCount: number };
  similarityScore: number;
  sharedTopics: string[];
  recommendedAction: string;
}

// ==========================================
// 14. SEO RECOMMENDATIONS & QUICK WINS MODELS
// ==========================================
export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RecommendationCategory =
  | 'TECHNICAL'
  | 'ON_PAGE'
  | 'CONTENT'
  | 'INTERNAL_LINKING'
  | 'SCHEMA'
  | 'IMAGES';
export type RecommendationEffort = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SeoRecommendationItem {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  affectedUrl: string;
  pageTitle?: string;
  impact: string;
  effort: RecommendationEffort;
  confidence: 'HIGH' | 'MEDIUM';
  reason: string;
  recommendedAction: string;
  quickWin: boolean;
  scoreImpactEstimate?: number;
}

export interface PageRecommendationsSummary {
  url: string;
  title: string;
  primaryTopic: string;
  recommendations: SeoRecommendationItem[];
}

// ==========================================
// 15. KEYWORD STRATEGY & CONTENT BRIEF MODELS
// ==========================================
export type SearchIntent =
  | 'Informational'
  | 'Commercial'
  | 'Transactional'
  | 'Navigational'
  | 'Mixed / Uncertain';

export interface KeywordPlacementSuggestion {
  location:
    | 'Title'
    | 'H1'
    | 'H2'
    | 'Introduction'
    | 'Body'
    | 'FAQ'
    | 'Image ALT'
    | 'Internal Anchor'
    | 'URL'
    | 'Schema'
    | 'Meta Description';
  suggestion: string;
  naturalUsageNote: string;
}

export interface KeywordStrategyItem {
  id: string;
  keyword: string;
  category:
    | 'primary'
    | 'secondary'
    | 'short-tail'
    | 'long-tail'
    | 'supporting'
    | 'question'
    | 'entity'
    | 'semantic-variation'
    | 'topic-idea';
  reason: string;
  relationshipToPrimary: string;
  currentWebsiteCoverage: number;
  recommendedPage?: string;
  placements: KeywordPlacementSuggestion[];
  topicCluster: string;
  estimatedIntent: SearchIntent;
  internalOpportunityScore: number;
  targetAudience?: string;
  externalProvider?: string;
  externalSearchVolume?: string;
  externalDifficulty?: string;
  externalCpc?: string;
  externalCompetition?: string;
}

export interface ContentBrief {
  id: string;
  primaryKeyword: string;
  targetUrl?: string;
  estimatedSearchIntent: SearchIntent;
  secondaryKeywords: string[];
  supportingKeywords: string[];
  suggestedH1: string;
  suggestedH2s: string[];
  suggestedH3s: string[];
  questionsToAnswer: string[];
  entitiesToCover: string[];
  internalLinksToAdd: Array<{ targetUrl: string; anchorText: string; reason: string }>;
  contentGaps: string[];
  recommendedSections: string[];
  technicalImprovements: string[];
}

export interface SiteContentStrategy {
  strongTopics: Array<{ topic: string; pagesCount: number; coverageScore: number; topKeywords: string[] }>;
  weakTopics: Array<{ topic: string; pagesCount: number; coverageScore: number; missingAspects: string[] }>;
  missingTopics: Array<{ topic: string; relevanceScore: number; reason: string; suggestedKeywords: string[] }>;
  newPageOpportunities: Array<{
    id: string;
    suggestedTitle: string;
    primaryTopic: string;
    reason: string;
    supportingKeywords: string[];
    suggestedInternalLinks: string[];
    expectedRelevance: 'HIGH' | 'MEDIUM';
  }>;
  topicCoverageScore: number;
  topicCoverageMethodology: string;
}

export interface WebsiteCrawlReport {
  id: string;
  domain: string;
  startUrl: string;
  timestamp: string;
  durationMs: number;
  crawlDurationMs?: number;
  maxPagesLimit?: number;
  status: CrawlStatus;
  overview: SiteOverviewData;
  pages: CrawlPageSummary[];
  pageReports: Record<string, SEOReport>;
  siteKeywords: SiteKeywordItem[];
  keywordStrategy: {
    primaryKeyword: string;
    topicCoverageScore: number;
    topicCoverageMethodology?: string;
    keywords: KeywordStrategyItem[];
    clusters: TopicCluster[];
    briefs?: ContentBrief[];
  };
  contentStrategy: SiteContentStrategy;
  recommendations: {
    all: SeoRecommendationItem[];
    quickWins: SeoRecommendationItem[];
    byPage: Record<string, SeoRecommendationItem[]>;
    byCategory: Record<string, SeoRecommendationItem[]>;
  };
  cannibalization: KeywordCannibalizationItem[];
  contentDuplication: ContentDuplicationItem[];
  briefs: ContentBrief[];
}

export interface CrawlSession {
  id: string;
  url: string;
  domain?: string;
  maxPages: number;
  status: CrawlStatus;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress: CrawlProgressStats;
  report?: WebsiteCrawlReport;
}

export interface StartCrawlRequest {
  url?: string;
  startUrl?: string;
  maxPages?: number;
  concurrency?: number;
  respectRobots?: boolean;
  checkRobots?: boolean;
  checkSitemap?: boolean;
  primaryKeyword?: string;
}

export interface StartCrawlResponse {
  crawlId: string;
  status: CrawlStatus;
  message: string;
}

