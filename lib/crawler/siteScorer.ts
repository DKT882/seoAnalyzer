import {
  SEOReport,
  SiteHealthScoreBreakdown,
  SiteIssue,
  SiteSummary,
  InternalLinkGraph,
  DuplicateTitleGroup,
  DuplicateMetaGroup,
  ContentSimilarityPair,
  CanonicalConsistencyIssue,
  IndexabilityConsistencyIssue,
  SearchIntentOverlapSignal,
  OrphanCandidate,
} from '@/types';
import { buildCrossPageRecommendation } from './recommendationBuilder';

export interface SiteScoringInput {
  pages: SEOReport[];
  failedUrlsCount: number;
  linkGraph: InternalLinkGraph;
  duplicateTitles: DuplicateTitleGroup[];
  duplicateMetas: DuplicateMetaGroup[];
  contentSimilarities: ContentSimilarityPair[];
  canonicalIssues: CanonicalConsistencyIssue[];
  indexabilityIssues: IndexabilityConsistencyIssue[];
  intentOverlaps: SearchIntentOverlapSignal[];
  orphanCandidates: OrphanCandidate[];
}

/**
 * Calculates a transparent, explainable Site Health Score (0–100) with category caps
 * and root-cause deduplication.
 * Rule 7 & 8: Does NOT simply average page scores; widespread minor issues do not linearly multiply.
 */
export function calculateSiteHealthScore(input: SiteScoringInput): {
  score: SiteHealthScoreBreakdown;
  issues: SiteIssue[];
  summary: SiteSummary;
} {
  const totalPages = Math.max(1, input.pages.length);
  const deductions: SiteHealthScoreBreakdown['deductions'] = [];
  const siteIssues: SiteIssue[] = [];

  let crawlTechScore = 100;
  let idxDirectiveScore = 100;
  let contentDupScore = 100;
  let archLinksScore = 100;

  // ==========================================
  // Category 1: Crawlability & Technical (Max cap 100)
  // ==========================================
  if (input.failedUrlsCount > 0) {
    const penalty = Math.min(25, 5 + Math.floor(Math.log2(input.failedUrlsCount + 1) * 6));
    crawlTechScore = Math.max(0, crawlTechScore - penalty);
    deductions.push({
      category: 'CRAWLABILITY',
      reason: 'Failed page fetches (server errors, timeouts, or DNS errors)',
      points: penalty,
      affectedCount: input.failedUrlsCount,
      rootCauseId: 'CRAWL_FETCH_FAILURES',
    });

    siteIssues.push({
      id: 'issue-crawl-failures',
      category: 'CRAWLABILITY',
      priority: 'HIGH',
      title: 'Failed URL Fetches',
      description: `${input.failedUrlsCount} URLs could not be fetched due to network, DNS, or server errors.`,
      affectedUrlsCount: input.failedUrlsCount,
      affectedUrlsSample: [],
      recommendation: buildCrossPageRecommendation({
        observation: `${input.failedUrlsCount} URLs failed to respond successfully during site crawl.`,
        evidence: `Failure count: ${input.failedUrlsCount}`,
        interpretation: 'Unresponsive URLs prevent crawlers and users from accessing intended content.',
        action: 'Inspect server logs for 5xx errors or DNS misconfigurations affecting these paths.',
        expectedBenefit: 'Restores site-wide crawl reliability.',
        caution: 'Ensure rate-limiting or firewall settings did not block crawl requests.',
      }),
    });
  }

  // Broken internal links
  if (input.linkGraph.brokenInternalLinksCount > 0) {
    const count = input.linkGraph.brokenInternalLinksCount;
    const penalty = Math.min(20, 4 + Math.floor(Math.log2(count + 1) * 5));
    crawlTechScore = Math.max(0, crawlTechScore - penalty);
    deductions.push({
      category: 'CRAWLABILITY',
      reason: 'Broken internal links (pointing to 4xx/5xx pages)',
      points: penalty,
      affectedCount: count,
      rootCauseId: 'BROKEN_INTERNAL_LINKS',
    });

    siteIssues.push({
      id: 'issue-broken-inlinks',
      category: 'LINKS',
      priority: 'HIGH',
      title: 'Broken Internal Links',
      description: `${count} internal links point to 4xx or 5xx error pages.`,
      affectedUrlsCount: count,
      affectedUrlsSample: [],
      recommendation: buildCrossPageRecommendation({
        observation: `Observed ${count} internal links leading to non-200 HTTP responses.`,
        evidence: `Broken links count: ${count}`,
        interpretation: 'Broken links disrupt user navigation and waste crawler discovery budget.',
        action: 'Update or remove broken link hrefs to point to valid destination URLs.',
        expectedBenefit: 'Improves user experience and search crawler discovery flow.',
        caution: 'Verify whether the destination pages were moved and require 301 redirects.',
      }),
    });
  }

  // ==========================================
  // Category 2: Indexability & Directives (Max cap 100)
  // ==========================================
  if (input.indexabilityIssues.length > 0) {
    const count = input.indexabilityIssues.length;
    const penalty = Math.min(25, 6 + Math.floor(Math.log2(count + 1) * 6));
    idxDirectiveScore = Math.max(0, idxDirectiveScore - penalty);
    deductions.push({
      category: 'INDEXABILITY',
      reason: 'Indexability contradictions (e.g. Sitemap URLs with noindex, canonical targets blocked)',
      points: penalty,
      affectedCount: count,
      rootCauseId: 'INDEXABILITY_CONTRADICTIONS',
    });

    for (const issue of input.indexabilityIssues.slice(0, 5)) {
      siteIssues.push({
        id: issue.id,
        category: 'INDEXABILITY',
        priority: issue.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
        title: issue.issueType.replace(/_/g, ' '),
        description: issue.evidence,
        affectedUrlsCount: 1,
        affectedUrlsSample: [issue.url],
        recommendation: issue.recommendation,
      });
    }
  }

  if (input.canonicalIssues.length > 0) {
    const count = input.canonicalIssues.length;
    const penalty = Math.min(20, 5 + Math.floor(Math.log2(count + 1) * 5));
    idxDirectiveScore = Math.max(0, idxDirectiveScore - penalty);
    deductions.push({
      category: 'CANONICAL',
      reason: 'Canonical consistency issues (loops, 4xx targets, or conflicting master declarations)',
      points: penalty,
      affectedCount: count,
      rootCauseId: 'CANONICAL_CONFLICTS',
    });

    for (const issue of input.canonicalIssues.slice(0, 5)) {
      siteIssues.push({
        id: issue.id,
        category: 'CANONICAL',
        priority: issue.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        title: issue.issueType.replace(/_/g, ' '),
        description: issue.evidence,
        affectedUrlsCount: issue.affectedUrls.length,
        affectedUrlsSample: issue.affectedUrls,
        recommendation: issue.recommendation,
      });
    }
  }

  // ==========================================
  // Category 3: Content & Duplication (Max cap 100)
  // ==========================================
  // Duplicate Titles
  if (input.duplicateTitles.length > 0) {
    const groupCount = input.duplicateTitles.length;
    const totalAffected = input.duplicateTitles.reduce((acc, g) => acc + g.pages.length, 0);
    // Bounded cap (Max 15 pts) regardless of 100 URLs
    const penalty = Math.min(15, 3 + Math.floor(Math.log2(groupCount + 1) * 4));
    contentDupScore = Math.max(0, contentDupScore - penalty);
    deductions.push({
      category: 'CONTENT',
      reason: 'Duplicate title groups across distinct pages',
      points: penalty,
      affectedCount: totalAffected,
      rootCauseId: 'DUPLICATE_TITLES',
    });

    for (const group of input.duplicateTitles.slice(0, 4)) {
      siteIssues.push({
        id: group.id,
        category: 'CONTENT',
        priority: 'MEDIUM',
        title: `Duplicate Title: "${group.title}"`,
        description: `${group.pages.length} pages share identical or near-identical titles.`,
        affectedUrlsCount: group.pages.length,
        affectedUrlsSample: group.pages.map((p) => p.url).slice(0, 4),
        recommendation: group.recommendation,
      });
    }
  }

  // Duplicate Meta Descriptions
  if (input.duplicateMetas.length > 0) {
    const groupCount = input.duplicateMetas.length;
    const totalAffected = input.duplicateMetas.reduce((acc, g) => acc + g.pages.length, 0);
    const penalty = Math.min(12, 2 + Math.floor(Math.log2(groupCount + 1) * 3));
    contentDupScore = Math.max(0, contentDupScore - penalty);
    deductions.push({
      category: 'CONTENT',
      reason: 'Duplicate meta descriptions across pages',
      points: penalty,
      affectedCount: totalAffected,
      rootCauseId: 'DUPLICATE_METAS',
    });

    for (const group of input.duplicateMetas.slice(0, 4)) {
      siteIssues.push({
        id: group.id,
        category: 'CONTENT',
        priority: 'LOW',
        title: 'Duplicate Meta Description',
        description: `${group.pages.length} pages share identical meta descriptions.`,
        affectedUrlsCount: group.pages.length,
        affectedUrlsSample: group.pages.map((p) => p.url).slice(0, 4),
        recommendation: group.recommendation,
      });
    }
  }

  // High Intent Overlaps
  if (input.intentOverlaps.length > 0) {
    const count = input.intentOverlaps.length;
    const penalty = Math.min(15, 3 + Math.floor(Math.log2(count + 1) * 4));
    contentDupScore = Math.max(0, contentDupScore - penalty);
    deductions.push({
      category: 'CONTENT',
      reason: 'Potential search-intent overlap across competing pages',
      points: penalty,
      affectedCount: count,
      rootCauseId: 'INTENT_OVERLAP',
    });

    for (const signal of input.intentOverlaps.slice(0, 4)) {
      siteIssues.push({
        id: signal.id,
        category: 'CONTENT',
        priority: signal.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        title: `Potential Search-Intent Overlap: "${signal.primaryTopic}"`,
        description: signal.observation,
        affectedUrlsCount: signal.competingPages.length,
        affectedUrlsSample: signal.competingPages.map((p) => p.url),
        recommendation: buildCrossPageRecommendation({
          observation: signal.observation,
          evidence: `Risk level: ${signal.riskLevel}. Topics & intent match across ${signal.competingPages.length} pages.`,
          interpretation: signal.interpretation,
          action: signal.action,
          expectedBenefit: signal.expectedBenefit,
          caution: signal.caution,
        }),
      });
    }
  }

  // ==========================================
  // Category 4: Site Architecture & Links (Max cap 100)
  // ==========================================
  // Orphan candidates (excluding intentional utilities)
  const nonUtilityOrphans = input.orphanCandidates.filter((o) => o.category !== 'utility_isolated');
  if (nonUtilityOrphans.length > 0) {
    const count = nonUtilityOrphans.length;
    const penalty = Math.min(18, 3 + Math.floor(Math.log2(count + 1) * 4));
    archLinksScore = Math.max(0, archLinksScore - penalty);
    deductions.push({
      category: 'ARCHITECTURE',
      reason: 'Orphan candidates (0 observed incoming internal links from crawled structure)',
      points: penalty,
      affectedCount: count,
      rootCauseId: 'ORPHAN_CANDIDATES',
    });

    siteIssues.push({
      id: 'issue-orphan-candidates',
      category: 'ARCHITECTURE',
      priority: 'MEDIUM',
      title: 'Potential Orphan Pages',
      description: `${count} pages have 0 incoming internal links from the crawled structure.`,
      affectedUrlsCount: count,
      affectedUrlsSample: nonUtilityOrphans.map((o) => o.url).slice(0, 4),
      recommendation: buildCrossPageRecommendation({
        observation: `${count} non-utility pages have 0 incoming internal links from crawled pages.`,
        evidence: `Sample URLs: ${nonUtilityOrphans.map((o) => o.url).slice(0, 3).join(', ')}`,
        interpretation: 'Pages without incoming internal links are difficult for crawlers and users to discover naturally.',
        action: 'Add contextual links to these pages from related parent category pages, topic hubs, or related articles.',
        expectedBenefit: 'Improves page discoverability and distributes internal link equity.',
        caution: 'Verify whether any of these URLs are intentionally isolated landing pages.',
      }),
    });
  }

  // Final Overall Score (25% per category)
  const overall = Math.round(
    crawlTechScore * 0.25 +
    idxDirectiveScore * 0.25 +
    contentDupScore * 0.25 +
    archLinksScore * 0.25
  );

  const scoreBreakdown: SiteHealthScoreBreakdown = {
    overall: Math.max(10, Math.min(100, overall)),
    crawlabilityAndTechnical: crawlTechScore,
    indexabilityAndDirectives: idxDirectiveScore,
    contentAndDuplication: contentDupScore,
    siteArchitectureAndLinks: archLinksScore,
    deductions,
    methodologyNotes:
      'Site Health Score (0-100) evaluates site-wide crawlability, indexability consistency, content uniqueness, and internal link architecture. Widespread minor issues use sublinear logarithmic scaling to prevent score distortion.',
  };

  // Compile Site SEO Summary
  let indexableCount = 0;
  let noindexCount = 0;
  let strongPages = 0;
  let moderatePages = 0;
  let thinPages = 0;

  for (const p of input.pages) {
    if (p.technical.isIndexable) {
      indexableCount++;
    } else {
      noindexCount++;
    }

    const sem = p.contentIntelligence?.score?.overall ?? p.scores.overall;
    if (sem >= 80) strongPages++;
    else if (sem >= 60) moderatePages++;
    else thinPages++;
  }

  const summary: SiteSummary = {
    pagesCrawled: input.pages.length,
    pagesSuccessful: input.pages.length - input.failedUrlsCount,
    pagesFailed: input.failedUrlsCount,
    indexability: {
      indexable: indexableCount,
      noindex: noindexCount,
      blocked: 0,
    },
    content: {
      strongPages,
      moderatePages,
      thinPages,
    },
    technical: {
      brokenInternalLinks: input.linkGraph.brokenInternalLinksCount,
      duplicateTitleGroups: input.duplicateTitles.length,
      duplicateMetaGroups: input.duplicateMetas.length,
      redirectChains: input.canonicalIssues.filter((c) => c.issueType === 'CANONICAL_POINTS_TO_REDIRECT').length,
      canonicalConflicts: input.canonicalIssues.length,
    },
    topics: {
      clustersCount: 0,
      highOverlapClustersCount: input.intentOverlaps.filter((i) => i.riskLevel === 'HIGH').length,
    },
  };

  // Sort site issues by priority
  const priorityOrder: Record<SiteIssue['priority'], number> = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1,
  };
  siteIssues.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return {
    score: scoreBreakdown,
    issues: siteIssues,
    summary,
  };
}
