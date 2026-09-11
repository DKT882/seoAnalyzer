import 'server-only';
import {
  CrawlOptions,
  CrawlProgressStats,
  CrawlPageSummary,
  WebsiteCrawlReport,
  SEOReport,
} from '@/types';
import { validateAndNormalizeUrl, cleanAndNormalizeCrawlUrl } from '../utils/urlUtils';
import { parseRobotsTxt } from '../robots/robotsParser';
import { parseSitemapXml } from '../sitemap/sitemapParser';
import { generateSeoReport } from '../reports/reportGenerator';
import { crawlRepository } from '../db/repository';
import { calculateSiteOverview, aggregateSiteKeywords, detectKeywordCannibalization, detectContentDuplication } from '../reports/siteAggregator';
import { generateSeoRecommendations } from '../recommendations/recommendationEngine';
import { generateKeywordStrategy } from '../keywords/keywordStrategy';
import { generateSiteContentStrategy } from '../content/contentStrategy';
import { config } from '../config';
import { logger } from '../utils/logger';

// In-memory active crawls cancellation registry
export const activeCrawls = new Map<string, { isCancelled: boolean }>();

/**
 * Executes an asynchronous whole-website crawl session with bounded concurrency, sitemap discovery,
 * robots.txt adherence, SSRF security validation, and comprehensive SEO aggregation.
 */
export async function executeWebsiteCrawl(
  sessionId: string,
  startUrl: string,
  options: CrawlOptions,
  primaryKeywordInput?: string
): Promise<WebsiteCrawlReport> {
  const startTime = Date.now();
  const maxPages = Math.min(options.maxPages || config.maxCrawlPages, config.maxCrawlPages);
  const concurrency = Math.min(options.concurrency || config.crawlConcurrency, 6);
  const respectRobots = options.respectRobots ?? true;
  const checkSitemap = options.checkSitemap ?? true;

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

  logger.info(`[CRAWL ${sessionId}] Starting website crawl for ${normalizedStartUrl} (Max Pages: ${maxPages}, Concurrency: ${concurrency})`);

  // State Sets
  const discoveredUrls = new Set<string>();
  const queuedUrls: string[] = [];
  const crawledUrls = new Set<string>();
  const failedUrls = new Map<string, string>();
  const skippedUrls = new Map<string, string>();
  const pageSummaries: CrawlPageSummary[] = [];
  const pageReports: Record<string, SEOReport> = {};

  // Add root start URL
  const cleanedStart = cleanAndNormalizeCrawlUrl(normalizedStartUrl, baseHostname) || normalizedStartUrl;
  discoveredUrls.add(cleanedStart);
  queuedUrls.push(cleanedStart);

  // 1. Inspect Robots.txt & Sitemap Sources
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

  // 2. Discover URLs from Sitemap (if enabled)
  if (checkSitemap) {
    try {
      const sitemapUrlsToCheck = new Set<string>();
      sitemapUrlsToCheck.add(new URL('/sitemap.xml', normalizedStartUrl).href);
      for (const sm of robotsAnalysis.sitemaps) {
        sitemapUrlsToCheck.add(sm);
      }

      for (const smUrl of Array.from(sitemapUrlsToCheck)) {
        if (discoveredUrls.size >= maxPages * 3) break; // Limit discovery memory
        try {
          const sitemapRes = await parseSitemapXml(smUrl);
          if (sitemapRes.exists && sitemapRes.urlsSample.length > 0) {
            for (const sampleUrl of sitemapRes.urlsSample) {
              const cleaned = cleanAndNormalizeCrawlUrl(sampleUrl, baseHostname);
              if (cleaned && !discoveredUrls.has(cleaned)) {
                // Pre-validate SSRF on candidate
                const val = validateAndNormalizeUrl(cleaned);
                if (val.isValid) {
                  discoveredUrls.add(cleaned);
                  queuedUrls.push(cleaned);
                }
              }
            }
          }
        } catch {
          // ignore individual sitemap errors
        }
      }
    } catch (err: any) {
      logger.warn(`[CRAWL ${sessionId}] Sitemap discovery warning: ${err.message}`);
    }
  }

  logger.info(`[CRAWL ${sessionId}] Initial discovery completed. ${discoveredUrls.size} URLs queued.`);

  // Update initial DB progress
  crawlRepository.updateCrawlProgress(
    sessionId,
    {
      discovered: discoveredUrls.size,
      queued: queuedUrls.length,
      analyzed: 0,
      failed: 0,
      skipped: 0,
    },
    'crawling'
  );

  // Helper to process one single page
  const processUrl = async (url: string): Promise<void> => {
    if (cancelToken.isCancelled || crawledUrls.size >= maxPages) {
      return;
    }

    // SSRF & Domain boundary validation
    const validation = validateAndNormalizeUrl(url);
    if (!validation.isValid || !validation.normalizedUrl) {
      skippedUrls.set(url, validation.error || 'Invalid URL');
      return;
    }

    const normalizedUrl = validation.normalizedUrl;

    // Check Robots.txt compliance
    if (respectRobots && robotsAnalysis.exists) {
      // If root robots.txt disallowed it
      if (!robotsAnalysis.isBotAllowed && normalizedUrl === normalizedStartUrl) {
        skippedUrls.set(normalizedUrl, 'Disallowed by robots.txt');
        return;
      }
    }

    try {
      logger.info(`[CRAWL ${sessionId}] Analyzing page (${crawledUrls.size + 1}/${maxPages}): ${normalizedUrl}`);
      
      const report = await generateSeoReport(normalizedUrl, {
        checkRobots: false, // already checked
        checkSitemap: false,
      });

      crawledUrls.add(normalizedUrl);
      pageReports[normalizedUrl] = report;

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
      crawlRepository.saveCrawlPage(sessionId, summary, report);

      // Extract new internal links for further discovery
      if (discoveredUrls.size < maxPages * 3) {
        for (const link of report.links.internalLinks) {
          const cleaned = cleanAndNormalizeCrawlUrl(link.url, baseHostname);
          if (cleaned && !discoveredUrls.has(cleaned)) {
            const val = validateAndNormalizeUrl(cleaned);
            if (val.isValid) {
              discoveredUrls.add(cleaned);
              queuedUrls.push(cleaned);
            }
          }
        }
      }

      // Update DB progress
      crawlRepository.updateCrawlProgress(
        sessionId,
        {
          discovered: discoveredUrls.size,
          queued: Math.max(0, queuedUrls.length),
          analyzed: crawledUrls.size,
          failed: failedUrls.size,
          skipped: skippedUrls.size,
        },
        'crawling',
        normalizedUrl
      );
    } catch (err: any) {
      logger.warn(`[CRAWL ${sessionId}] Failed to analyze ${normalizedUrl}: ${err.message}`);
      failedUrls.set(normalizedUrl, err.message || 'Analysis failed');
      crawlRepository.updateCrawlProgress(sessionId, {
        failed: failedUrls.size,
      });
    }
  };

  // 3. Worker Pool Concurrency Loop
  let queueIndex = 0;
  const workers: Promise<void>[] = [];

  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (queueIndex < queuedUrls.length && crawledUrls.size < maxPages && !cancelToken.isCancelled) {
          const currentUrl = queuedUrls[queueIndex++];
          if (currentUrl && !crawledUrls.has(currentUrl) && !failedUrls.has(currentUrl) && !skippedUrls.has(currentUrl)) {
            await processUrl(currentUrl);
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  // Clean up cancellation token from registry
  activeCrawls.delete(sessionId);

  const durationMs = Date.now() - startTime;
  const isCancelled = cancelToken.isCancelled;
  const finalStatus = isCancelled ? 'cancelled' : 'completed';

  logger.info(`[CRAWL ${sessionId}] Crawl finished with status "${finalStatus}". ${crawledUrls.size} pages analyzed in ${durationMs}ms.`);

  // 4. Assemble Whole-Website Report
  const analyzedReportsList = Object.values(pageReports);

  const overview = calculateSiteOverview({
    domain: baseDomain,
    targetUrl: normalizedStartUrl,
    pages: analyzedReportsList,
    discoveredCount: discoveredUrls.size,
    analyzedCount: crawledUrls.size,
    failedCount: failedUrls.size,
    skippedCount: skippedUrls.size,
    maxPagesAllowed: maxPages,
    robotsStatus: {
      exists: robotsAnalysis.exists,
      url: robotsAnalysis.url,
      allowedPagesCount: crawledUrls.size,
      blockedPagesCount: skippedUrls.size,
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
    status: finalStatus,
    overview,
    pages: pageSummaries,
    pageReports,
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
  } else if (crawledUrls.size === 0 && failedUrls.size > 0) {
    const firstError = Array.from(failedUrls.values())[0] || 'Failed to crawl start URL';
    logger.warn(`[CRAWL ${sessionId}] All candidate URLs failed to crawl. Marking session as failed: ${firstError}`);
    crawlRepository.failCrawlSession(sessionId, firstError);
  } else {
    crawlRepository.completeCrawlSession(sessionId, finalReport);
  }

  return finalReport;
}
