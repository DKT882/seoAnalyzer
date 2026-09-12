import {
  SearchAuditMode,
  SearchQueryTarget,
  NormalizedSerpSnapshot,
  SearchIntelligenceAuditReport,
  SearchResourceLimits,
  ProviderUsageTelemetry,
  SearchIntentAlignment,
  PageTypeAlignment,
  SerpTopicPattern,
  ObservedSerpDomain,
  SearchOpportunity,
  InternalLinkSerpOpportunity,
} from './searchTypes';
import { SerpCollector, DEFAULT_SEARCH_RESOURCE_LIMITS } from './serpCollector';
import { analyzeSerpIntent, analyzeSerpPageTypes, analyzeSerpTopicPatterns, aggregateObservedSerpDomains } from './serpAnalyzer';
import { fetchAndAnalyzeCompetitorPages, CompetitorPageAnalysis } from './competitorFetcher';
import { generateSearchOpportunities } from './searchOpportunityEngine';
import { normalizeQueryString } from './serpNormalizer';
import { SEOReport, WebsiteCrawlReport } from '@/types';
import { logger } from '../utils/logger';

export interface ExecuteSearchAuditOptions {
  mode: SearchAuditMode;
  queries?: string[];
  userPageReport?: SEOReport;
  siteCrawlReport?: WebsiteCrawlReport;
  providerId?: string;
  location?: string;
  language?: string;
  device?: any;
  limits?: Partial<SearchResourceLimits>;
  forceRefresh?: boolean;
  enableCompetitorPageFetch?: boolean;
  signal?: AbortSignal;
}

/**
 * Main Search Intelligence Orchestrator.
 * Supports SEARCH_QUERY, PAGE_SEARCH_INTELLIGENCE, and SITE_SEARCH_INTELLIGENCE modes.
 */
export async function executeSearchIntelligenceAudit(
  options: ExecuteSearchAuditOptions
): Promise<SearchIntelligenceAuditReport> {
  const mode = options.mode;
  const limits: SearchResourceLimits = {
    ...DEFAULT_SEARCH_RESOURCE_LIMITS,
    ...(options.limits || {}),
  };

  // 1. Candidate Query Expansion & Deduplication (Bounded BEFORE external requests)
  const candidateTargets: SearchQueryTarget[] = [];
  const seenQueries = new Set<string>();

  const addTarget = (query: string, source: SearchQueryTarget['source'], targetPageUrl?: string) => {
    const norm = normalizeQueryString(query);
    if (!norm || norm.length < 2) return;
    const lower = norm.toLowerCase();
    if (seenQueries.has(lower)) return;
    seenQueries.add(lower);

    candidateTargets.push({
      query: norm,
      normalizedQuery: norm,
      source,
      targetPageUrl,
      userSpecified: source === 'USER_TARGET',
    });
  };

  if (mode === 'SEARCH_QUERY' && options.queries) {
    for (const q of options.queries) {
      addTarget(q, 'USER_TARGET');
    }
  } else if (mode === 'PAGE_SEARCH_INTELLIGENCE' && options.userPageReport) {
    const report = options.userPageReport;

    // A. Explicit user target keywords if any
    if (report.targetKeywords) {
      for (const kw of report.targetKeywords) {
        addTarget(kw, 'USER_TARGET', report.url);
      }
    }

    // B. Extracted Primary Topics
    if (report.contentIntelligence?.primaryTopics) {
      for (const t of report.contentIntelligence.primaryTopics) {
        addTarget(t.topic, 'EXTRACTED_PAGE_TOPIC', report.url);
      }
    }

    // C. Recommended Queries
    if (report.keywords?.recommended) {
      for (const r of report.keywords.recommended.slice(0, 3)) {
        addTarget(r.keyword, 'RECOMMENDED_QUERY', report.url);
      }
    }

    // Fallback if none extracted
    if (candidateTargets.length === 0 && report.onPage.title) {
      addTarget(report.onPage.title, 'EXTRACTED_PAGE_TOPIC', report.url);
    }
  } else if (mode === 'SITE_SEARCH_INTELLIGENCE' && options.siteCrawlReport) {
    const crawl = options.siteCrawlReport;

    // Candidate query expansion from top topic clusters (Bounded to max 10 before requests)
    if (crawl.topicClusterHealth && crawl.topicClusterHealth.length > 0) {
      for (const cluster of crawl.topicClusterHealth.slice(0, 8)) {
        const pillarUrl = cluster.strongestPage?.url || cluster.pages?.[0]?.url;
        addTarget(cluster.primaryTopic, 'SITE_TOPIC_CLUSTER', pillarUrl);
        if (cluster.subTopics && cluster.subTopics[0]) {
          addTarget(`${cluster.primaryTopic} ${cluster.subTopics[0]}`, 'SITE_TOPIC_CLUSTER', pillarUrl);
        }
      }
    } else if (crawl.keywordStrategy?.clusters) {
      for (const cluster of crawl.keywordStrategy.clusters.slice(0, 8)) {
        addTarget(cluster.name, 'SITE_TOPIC_CLUSTER');
        if (cluster.keywords && cluster.keywords[0]) {
          addTarget(cluster.keywords[0], 'SITE_TOPIC_CLUSTER');
        }
      }
    }
  }

  // Bound queries to max resource limit
  const boundedTargets = candidateTargets.slice(0, limits.maxQueries);

  // 2. SERP Collection
  const collector = new SerpCollector({
    providerId: options.providerId,
    location: options.location,
    language: options.language,
    device: options.device,
    limits,
    forceRefresh: options.forceRefresh,
    signal: options.signal,
  });

  const collectionResult = await collector.collectSerpSnapshots(boundedTargets, {
    location: options.location,
    language: options.language,
    device: options.device,
    forceRefresh: options.forceRefresh,
    signal: options.signal,
  });

  const snapshots = collectionResult.snapshots;
  const intentAlignments: Record<string, SearchIntentAlignment> = {};
  const pageTypeAlignments: Record<string, PageTypeAlignment> = {};
  const topicPatterns: Record<string, SerpTopicPattern[]> = {};
  const opportunities: SearchOpportunity[] = [];
  const internalLinkIntegrations: InternalLinkSerpOpportunity[] = [];

  // 3. Optional Deep Competitor Page Analysis (Bounded & SSRF protected)
  let deepCompetitorAnalyses: CompetitorPageAnalysis[] = [];
  if (options.enableCompetitorPageFetch && snapshots.length > 0) {
    const topCompetitorUrls = snapshots
      .flatMap((s) => s.results.filter((r) => r.resultType === 'ORGANIC').map((r) => r.url))
      .slice(0, limits.maxCompetitorPages);

    deepCompetitorAnalyses = await fetchAndAnalyzeCompetitorPages(topCompetitorUrls, limits);
  }

  // 4. Analyze each SERP snapshot
  for (const snap of snapshots) {
    const intentAlign = analyzeSerpIntent(snap, options.userPageReport);
    intentAlignments[snap.query] = intentAlign;

    const pageTypeAlign = analyzeSerpPageTypes(snap, options.userPageReport);
    pageTypeAlignments[snap.query] = pageTypeAlign;

    const topics = analyzeSerpTopicPatterns(snap, options.userPageReport, deepCompetitorAnalyses);
    topicPatterns[snap.query] = topics;

    const oppResult = generateSearchOpportunities({
      snapshot: snap,
      intentAlignment: intentAlign,
      pageTypeAlignment: pageTypeAlign,
      topicPatterns: topics,
      userPageReport: options.userPageReport,
      linkGraph: options.siteCrawlReport?.internalLinkGraph,
    });

    opportunities.push(...oppResult.opportunities);
    internalLinkIntegrations.push(...oppResult.internalLinkIntegrations);
  }

  // 5. Aggregate Observed SERP Domains
  const observedDomains = aggregateObservedSerpDomains(snapshots);

  const reportId = `search-audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: reportId,
    mode,
    timestamp: new Date().toISOString(),
    targetDomain: options.siteCrawlReport?.domain || (options.userPageReport ? new URL(options.userPageReport.url).hostname : undefined),
    userPageUrl: options.userPageReport?.url,
    queries: boundedTargets,
    snapshots,
    intentAlignments,
    pageTypeAlignments,
    topicPatterns,
    observedDomains,
    opportunities,
    internalLinkIntegrations,
    telemetry: collectionResult.telemetry,
    disclaimers: {
      antiFabricationNotice: 'No ranking probabilities, search volumes, or domain authorities are fabricated or guaranteed. All findings represent direct observations from sampled SERPs.',
      rankingDisclaimer: 'Search engine results pages vary continuously by geographic location, device profile, user history, and temporal changes. Observed patterns do not constitute algorithmic ranking rules.',
      provenanceSummary: `Analyzed ${snapshots.length} query snapshots via ${collectionResult.telemetry.providerId} (${collectionResult.telemetry.cachedHits} cached, ${collectionResult.telemetry.usedRequests} live requests).`,
    },
  };
}
