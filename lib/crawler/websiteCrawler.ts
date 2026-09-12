import 'server-only';
import {
  CrawlOptions,
  CrawlPageSummary,
  CrawlPageRecord,
  WebsiteCrawlReport,
  SEOReport,
  CrawlMode,
  RenderMode,
} from '@/types';
import { validateAndNormalizeUrl } from '../utils/urlUtils';
import { normalizeUrlDeterministically } from './urlNormalizer';
import { CrawlFrontier } from './crawlFrontier';
import { parseRobotsTxt } from '../robots/robotsParser';
import { parseSitemapXml } from '../sitemap/sitemapParser';
import { generateSeoReport } from '../reports/reportGenerator';
import { crawlRepository } from '../db/repository';
import { calculateSiteOverview, aggregateSiteKeywords, detectKeywordCannibalization, detectContentDuplication } from '../reports/siteAggregator';
import { generateSeoRecommendations } from '../recommendations/recommendationEngine';
import { generateKeywordStrategy } from '../keywords/keywordStrategy';
import { generateSiteContentStrategy } from '../content/contentStrategy';
import { buildInternalLinkGraph } from './linkGraph';
import { detectOrphanCandidates } from './orphanDetector';
import { detectDuplicateTitles, detectDuplicateMetaDescriptions, detectContentSimilarityPairs } from './duplicateDetector';
import {
  auditCanonicalConsistency,
  auditIndexabilityConsistency,
  compileSitemapConsistency,
  buildRedirectGraph,
  auditHreflangCrossPage,
  analyzeStructuredDataCrossPage,
} from './consistencyAuditor';
import { clusterPagesByTopic, detectSearchIntentOverlaps, identifyInternalLinkOpportunities } from './topicClusterer';
import { calculateSiteHealthScore } from './siteScorer';
import { config } from '../config';
import { logger } from '../utils/logger';

// In-memory active crawls cancellation registry
export const activeCrawls = new Map<string, { isCancelled: boolean }>();

/**
 * Executes an asynchronous whole-website crawl session with bounded concurrency, sitemap discovery,
 * robots.txt adherence, SSRF security validation, and comprehensive cross-page SEO intelligence.
 */
export async function executeWebsiteCrawl(
  sessionId: string,
  startUrl: string,
  options: CrawlOptions = {},
  primaryKeywordInput?: string
): Promise<WebsiteCrawlReport> {
  const startTime = Date.now();
  const crawlMode: CrawlMode = (options as any).crawlMode || 'DOMAIN_CRAWL';
  const maxPages = Math.min(options.maxPages || config.maxCrawlPages, config.maxCrawlPages);
  const maxDepth = (options as any).maxDepth ?? 5;
  const concurrency = Math.min(options.concurrency || config.crawlConcurrency, 6);
  const respectRobots = options.respectRobots ?? true;
  const checkSitemap = options.checkSitemap ?? true;
  const renderMode: RenderMode = (options as any).renderMode || 'auto';

  // Register cancellation token
  const cancelToken = { isCancelled: false };
  activeCrawls.set(sessionId, cancelToken);

  const startValidation = validateAndNormalizeUrl(startUrl);
  if (!startValidation.isValid || !startValidation.normalizedUrl) {
    throw new Error(`Invalid start URL: ${startValidation.error}`);
  }

  const normalizedStartUrl = startValidation.normalizedUrl;
  const baseHostname = new URL(normalizedStartUrl).hostname;
  const baseDomain = baseHostname.replace(/^www\./, '');

  logger.info(`[CRAWL ${sessionId}] Starting ${crawlMode} for ${normalizedStartUrl} (Max Pages: ${maxPages}, Depth: ${maxDepth}, Concurrency: ${concurrency})`);

  // Initialize Crawl Frontier with bounded budget
  const frontier = new CrawlFrontier({
    maxPages,
    maxDepth,
    baseHostname,
    maxRequests: maxPages * 2,
    maxResponseBytes: 50 * 1024 * 1024, // 50MB
    maxBrowserRenders: 15,
    maxRetries: 2,
    totalCrawlTimeoutMs: 180000, // 3 minutes
  });

  // State maps
  const pageRecordsMap = new Map<string, CrawlPageRecord>();
  const pageSummaries: CrawlPageSummary[] = [];
  const pageReports: Record<string, SEOReport> = {};
  const sitemapUrlsDiscovered = new Set<string>();
  const canonicalTargetsDiscovered = new Set<string>();

  // Seed start URL into frontier
  frontier.addCandidate(normalizedStartUrl, 0, 'START_URL');

  // 1. Inspect Robots.txt
  let robotsAnalysis = {
    exists: false,
    url: '',
    status: 0,
    sitemaps: [] as string[],
    isBotAllowed: true,
    directivesCount: 0,
  };

  try {
    robotsAnalysis = await parseRobotsTxt(normalizedStartUrl);
  } catch (err: any) {
    logger.warn(`[CRAWL ${sessionId}] Robots.txt check warning: ${err.message}`);
  }

  // 2. Discover URLs from Sitemap (if enabled or in SITEMAP_CRAWL mode)
  if (checkSitemap || crawlMode === 'SITEMAP_CRAWL') {
    try {
      const sitemapUrlsToCheck = new Set<string>();
      sitemapUrlsToCheck.add(new URL('/sitemap.xml', normalizedStartUrl).href);
      for (const sm of robotsAnalysis.sitemaps) {
        sitemapUrlsToCheck.add(sm);
      }

      for (const smUrl of Array.from(sitemapUrlsToCheck)) {
        if (frontier.getStats().discovered >= maxPages * 4) break;
        try {
          const sitemapRes = await parseSitemapXml(smUrl);
          if (sitemapRes.exists && sitemapRes.urlsSample.length > 0) {
            for (const sampleUrl of sitemapRes.urlsSample) {
              sitemapUrlsDiscovered.add(sampleUrl);
              frontier.addCandidate(sampleUrl, 1, 'SITEMAP', smUrl);
            }
          }
        } catch {
          // ignore individual sitemap parse issues
        }
      }
    } catch (err: any) {
      logger.warn(`[CRAWL ${sessionId}] Sitemap discovery warning: ${err.message}`);
    }
  }

  const initialStats = frontier.getStats();
  logger.info(`[CRAWL ${sessionId}] Initial discovery completed. ${initialStats.discovered} URLs queued.`);

  // Update initial DB progress
  crawlRepository.updateCrawlProgress(
    sessionId,
    {
      discovered: initialStats.discovered,
      queued: initialStats.queued,
      analyzed: 0,
      failed: 0,
      skipped: 0,
    },
    'crawling'
  );

  // Helper to process one single URL
  const processCandidate = async (candidateUrl: string, depth: number, discoveryMethod: any, discoveredFrom?: string): Promise<void> => {
    if (cancelToken.isCancelled || frontier.getCompletedCount() >= maxPages) {
      return;
    }

    // Validate SSRF & domain boundary
    const validation = validateAndNormalizeUrl(candidateUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      frontier.markSkipped(candidateUrl, validation.error || 'Invalid URL');
      return;
    }

    const normUrl = validation.normalizedUrl;

    // Check Robots.txt compliance
    if (respectRobots && robotsAnalysis.exists && !robotsAnalysis.isBotAllowed && normUrl === normalizedStartUrl) {
      frontier.markBlocked(normUrl, 'Disallowed by robots.txt');
      return;
    }

    frontier.markAnalyzing(normUrl);

    try {
      const currentCompleted = frontier.getCompletedCount();
      logger.info(`[CRAWL ${sessionId}] Analyzing page (${currentCompleted + 1}/${maxPages}): ${normUrl} (depth: ${depth})`);

      const report = await generateSeoReport(normUrl, {
        checkRobots: false,
        checkSitemap: false,
        renderMode,
      });

      const responseBytes = report.technical.pageSizeBytes || 0;
      const wasBrowserRendered = Boolean(report.renderedSnapshot);
      frontier.markCompleted(normUrl, responseBytes, wasBrowserRendered);

      pageReports[normUrl] = report;

      if (report.onPage.canonicalUrl) {
        canonicalTargetsDiscovered.add(report.onPage.canonicalUrl);
      }

      const summary: CrawlPageSummary = {
        id: report.id,
        url: report.url,
        statusCode: report.technical.httpStatus,
        overallScore: report.scores.overall,
        onPageScore: report.scores.onPage,
        technicalScore: report.scores.technical,
        contentScore: report.scores.content,
        linksScore: report.scores.links,
        wordCount: report.onPage.wordCount,
        keywordsCount: report.keywords.all.length,
        title: report.onPage.title || 'Untitled',
        metaDescription: report.onPage.metaDescription,
        h1: report.onPage.headings.items.find((h) => h.level === 1)?.text,
        isIndexable: report.technical.isIndexable,
        responseTimeMs: report.technical.responseTimeMs,
        issuesCount: report.issues.length,
      };
      pageSummaries.push(summary);

      const normIdent = normalizeUrlDeterministically(normUrl) || { urlHash: report.id };
      const pageRecord: CrawlPageRecord = {
        id: normIdent.urlHash,
        requestedUrl: candidateUrl,
        normalizedUrl: normUrl,
        finalUrl: report.technical.redirectChain?.[report.technical.redirectChain.length - 1] || normUrl,
        canonicalUrl: report.onPage.canonicalUrl,
        urlHash: normIdent.urlHash,
        statusCode: report.technical.httpStatus,
        contentType: report.technical.contentType || 'text/html',
        depth,
        discoveryMethod,
        discoveredFrom,
        crawlStatus: 'COMPLETED',
        pageType: report.contentIntelligence?.pageType.detectedType || 'ARTICLE',
        isIndexable: report.technical.isIndexable,
        renderMode,
        crawlDurationMs: report.durationMs,
        seoReport: report,
        internalInlinksCount: 0,
        internalOutlinksCount: report.links.internalLinksCount,
        externalOutlinksCount: report.links.externalLinksCount,
        inlinkAnchors: [],
        outlinkUrls: report.links.internalLinks.map((l) => l.url),
        semanticScore: report.contentIntelligence?.score?.overall ?? report.scores.content,
        technicalScore: report.scores.technical,
        onPageScore: report.scores.onPage,
        overallScore: report.scores.overall,
        wordCount: report.onPage.wordCount,
        issuesCount: report.issues.length,
      };
      pageRecordsMap.set(normUrl, pageRecord);

      crawlRepository.saveCrawlPage(sessionId, summary, report);

      // Extract new internal links if below max depth and within budget
      if (crawlMode !== 'SINGLE_URL' && depth < maxDepth && !frontier.isBudgetExceeded()) {
        for (const link of report.links.internalLinks) {
          frontier.addCandidate(link.url, depth + 1, 'INTERNAL_LINK', normUrl);
        }
      }

      // Update progress in DB
      const currentStats = frontier.getStats();
      crawlRepository.updateCrawlProgress(
        sessionId,
        {
          discovered: currentStats.discovered,
          queued: currentStats.queued,
          analyzed: currentStats.completed,
          failed: currentStats.failed,
          skipped: currentStats.skipped,
        },
        'crawling',
        normUrl
      );
    } catch (err: any) {
      logger.warn(`[CRAWL ${sessionId}] Failed to analyze ${normUrl}: ${err.message}`);
      const isTransient = err.message?.includes('timeout') || err.message?.includes('ECONNRESET');
      frontier.markFailed(normUrl, 'ANALYSIS_FAILURE', err.message || 'Analysis failed', isTransient);

      const stats = frontier.getStats();
      crawlRepository.updateCrawlProgress(sessionId, {
        failed: stats.failed,
      });
    }
  };

  // 3. Concurrency Worker Pool Loop
  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (!cancelToken.isCancelled && frontier.getCompletedCount() < maxPages) {
          const item = frontier.getNext();
          if (!item) break;
          await processCandidate(item.url, item.depth, item.discoveryMethod, item.discoveredFrom);
        }
      })()
    );
  }

  await Promise.all(workers);

  // Clean up cancellation token
  activeCrawls.delete(sessionId);

  const durationMs = Date.now() - startTime;
  const isCancelled = cancelToken.isCancelled;
  const finalStatus = isCancelled ? 'cancelled' : 'completed';
  const finalStats = frontier.getStats();

  logger.info(`[CRAWL ${sessionId}] Crawl finished with status "${finalStatus}". ${finalStats.completed} analyzed, ${finalStats.failed} failed.`);

  // 4. Assemble Whole-Website Cross-Page Intelligence
  const analyzedReportsList = Object.values(pageReports);
  const crawledUrlReportMap = new Map<string, SEOReport>();
  for (const page of analyzedReportsList) {
    crawledUrlReportMap.set(page.normalizedUrl || page.url, page);
  }

  // Cross-Page Graph & Intelligence Modules
  const internalLinkGraph = buildInternalLinkGraph(analyzedReportsList, pageRecordsMap);
  const orphanCandidates = detectOrphanCandidates(internalLinkGraph, sitemapUrlsDiscovered, canonicalTargetsDiscovered);
  const duplicateTitles = detectDuplicateTitles(analyzedReportsList);
  const duplicateMetaDescriptions = detectDuplicateMetaDescriptions(analyzedReportsList);
  const contentSimilarityPairs = detectContentSimilarityPairs(analyzedReportsList);
  const canonicalConsistencyIssues = auditCanonicalConsistency(analyzedReportsList, crawledUrlReportMap);
  const indexabilityConsistencyIssues = auditIndexabilityConsistency(analyzedReportsList, sitemapUrlsDiscovered);
  const sitemapConsistency = compileSitemapConsistency(Array.from(sitemapUrlsDiscovered), crawledUrlReportMap);
  const redirectGraph = buildRedirectGraph(analyzedReportsList);
  const hreflangCrossPageIssues = auditHreflangCrossPage(analyzedReportsList, crawledUrlReportMap);
  const structuredDataPatterns = analyzeStructuredDataCrossPage(analyzedReportsList);
  const topicClusterHealth = clusterPagesByTopic(analyzedReportsList, internalLinkGraph);
  const searchIntentOverlaps = detectSearchIntentOverlaps(analyzedReportsList);
  const internalLinkOpportunities = identifyInternalLinkOpportunities(analyzedReportsList, internalLinkGraph);

  // Site Health Scoring & Priority Engine
  const { score: siteHealthScore, issues: siteIssues, summary: siteSummary } = calculateSiteHealthScore({
    pages: analyzedReportsList,
    failedUrlsCount: finalStats.failed,
    linkGraph: internalLinkGraph,
    duplicateTitles,
    duplicateMetas: duplicateMetaDescriptions,
    contentSimilarities: contentSimilarityPairs,
    canonicalIssues: canonicalConsistencyIssues,
    indexabilityIssues: indexabilityConsistencyIssues,
    intentOverlaps: searchIntentOverlaps,
    orphanCandidates,
  });

  // Legacy Site Overview & Keyword Aggregation
  const overview = calculateSiteOverview({
    domain: baseDomain,
    targetUrl: normalizedStartUrl,
    pages: analyzedReportsList,
    discoveredCount: finalStats.discovered,
    analyzedCount: finalStats.completed,
    failedCount: finalStats.failed,
    skippedCount: finalStats.skipped,
    maxPagesAllowed: maxPages,
    robotsStatus: {
      exists: robotsAnalysis.exists,
      url: robotsAnalysis.url,
      allowedPagesCount: finalStats.completed,
      blockedPagesCount: finalStats.blocked + finalStats.skipped,
      sitemapSources: robotsAnalysis.sitemaps,
    },
  });

  const siteKeywords = aggregateSiteKeywords(analyzedReportsList);
  const cannibalization = detectKeywordCannibalization(analyzedReportsList);
  const contentDuplication = detectContentDuplication(analyzedReportsList);
  const recommendations = generateSeoRecommendations(analyzedReportsList);
  const keywordStrategy = generateKeywordStrategy(primaryKeywordInput, analyzedReportsList);
  const contentStrategy = generateSiteContentStrategy(analyzedReportsList, siteKeywords);

  const finalReport: WebsiteCrawlReport = {
    id: sessionId,
    domain: baseDomain,
    startUrl: normalizedStartUrl,
    timestamp: new Date().toISOString(),
    durationMs,
    crawlDurationMs: durationMs,
    maxPagesLimit: maxPages,
    status: finalStatus,
    crawlMode,
    resourceBudget: finalStats.budget,
    overview,
    pages: pageSummaries,
    pageRecords: Array.from(pageRecordsMap.values()),
    pageReports,
    siteHealthScore,
    siteSummary,
    siteIssues,
    internalLinkGraph,
    orphanCandidates,
    duplicateTitles,
    duplicateMetaDescriptions,
    contentSimilarityPairs,
    canonicalConsistencyIssues,
    indexabilityConsistencyIssues,
    sitemapConsistency,
    redirectGraph,
    hreflangCrossPageIssues,
    structuredDataPatterns,
    topicClusterHealth,
    searchIntentOverlaps,
    internalLinkOpportunities,
    priorityActions: siteIssues.filter((i) => i.priority === 'CRITICAL' || i.priority === 'HIGH'),
    siteKeywords,
    keywordStrategy: {
      primaryKeyword: keywordStrategy.primaryKeyword,
      topicCoverageScore: keywordStrategy.topicCoverageScore,
      keywords: keywordStrategy.keywords,
      clusters: keywordStrategy.clusters,
    },
    contentStrategy,
    recommendations,
    cannibalization,
    contentDuplication,
    briefs: keywordStrategy.briefs,
  };

  if (isCancelled) {
    crawlRepository.cancelCrawlSession(sessionId);
  } else if (finalStats.completed === 0 && finalStats.failed > 0) {
    logger.warn(`[CRAWL ${sessionId}] All candidate URLs failed to crawl. Marking session as failed.`);
    crawlRepository.failCrawlSession(sessionId, 'All candidate URLs failed to crawl');
  } else {
    crawlRepository.completeCrawlSession(sessionId, finalReport);
  }

  return finalReport;
}
