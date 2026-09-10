import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateAndNormalizeUrl } from '../../utils/urlUtils.js';
import { jobRepository } from '../../db/repository.js';
import { generateSeoReport } from '../../reports/reportGenerator.js';
import { compareCompetitorWebsites } from '../../competitors/competitorComparator.js';
import { DataProviderRegistry } from '../../providers/index.js';
import {
  exportToJson,
  exportKeywordsToCsv,
  exportPrimaryKeywordsToCsv,
  exportSecondaryKeywordsToCsv,
  exportShortTailKeywordsToCsv,
  exportLongTailKeywordsToCsv,
  exportOpportunitiesToCsv,
  exportIssuesToCsv,
  exportTagsToCsv,
  exportLinksToCsv,
  exportImagesToCsv,
  exportCompetitorComparisonToCsv,
  exportKeywordGapToCsv,
  exportContentGapToCsv,
  generatePrintableHtml,
} from '../../reports/exporter.js';
import { generateExcelWorkbook } from '../../reports/xlsxExporter.js';
import { logger } from '../../utils/logger.js';
import { DomainOverviewData, CompetitorComparisonReport } from '@seo-analyzer/shared';

// In-memory cache for recent competitor comparisons
const competitorReportsCache = new Map<string, CompetitorComparisonReport>();

const analyzeRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  checkRobots: z.boolean().optional().default(true),
  checkSitemap: z.boolean().optional().default(true),
});

const compareRequestSchema = z.object({
  targetUrl: z.string().min(1, 'Target URL is required'),
  competitorUrls: z.array(z.string().min(1)).min(1, 'At least 1 competitor URL is required').max(4, 'Maximum 4 competitor URLs allowed'),
});

export const analyzeUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = analyzeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
      return;
    }

    const { url, checkRobots, checkSitemap } = parseResult.data;

    // 1. Initial URL validation
    const validation = validateAndNormalizeUrl(url);
    if (!validation.isValid || !validation.normalizedUrl) {
      res.status(400).json({
        error: `Invalid URL: ${validation.error}`,
      });
      return;
    }

    const normalizedUrl = validation.normalizedUrl;

    // 2. Create Job in database
    const job = jobRepository.createJob(url, normalizedUrl);
    jobRepository.updateJobStatus(job.id, 'crawling');

    logger.info(`Starting SEO analysis for: ${normalizedUrl} (Job ID: ${job.id})`);

    try {
      // 3. Generate complete SEO Report
      const report = await generateSeoReport(normalizedUrl, {
        checkRobots,
        checkSitemap,
      });

      // 4. Save to Database
      jobRepository.saveReport(job.id, report);

      res.status(200).json({
        jobId: job.id,
        status: 'completed',
        report,
      });
    } catch (analysisErr: any) {
      logger.error(`Analysis failed for job ${job.id}: ${analysisErr.message}`);
      jobRepository.updateJobStatus(job.id, 'failed', analysisErr.message);

      res.status(422).json({
        jobId: job.id,
        status: 'failed',
        error: analysisErr.message || 'Failed to analyze the specified webpage.',
      });
    }
  } catch (err) {
    next(err);
  }
};

export const compareCompetitors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = compareRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
      return;
    }

    const { targetUrl, competitorUrls } = parseResult.data;

    // Validate target URL
    const targetValidation = validateAndNormalizeUrl(targetUrl);
    if (!targetValidation.isValid || !targetValidation.normalizedUrl) {
      res.status(400).json({ error: `Invalid target URL: ${targetValidation.error}` });
      return;
    }

    // Validate competitor URLs
    const normalizedCompetitors: string[] = [];
    for (const cUrl of competitorUrls) {
      const cVal = validateAndNormalizeUrl(cUrl);
      if (!cVal.isValid || !cVal.normalizedUrl) {
        res.status(400).json({ error: `Invalid competitor URL "${cUrl}": ${cVal.error}` });
        return;
      }
      normalizedCompetitors.push(cVal.normalizedUrl);
    }

    logger.info(`Comparing target ${targetValidation.normalizedUrl} against ${normalizedCompetitors.length} competitors.`);

    const report = await compareCompetitorWebsites({
      targetUrl: targetValidation.normalizedUrl,
      competitorUrls: normalizedCompetitors,
    });

    // Cache comparison report
    competitorReportsCache.set(report.id, report);

    res.status(200).json({
      comparisonId: report.id,
      status: 'completed',
      report,
    });
  } catch (err: any) {
    logger.error(`Competitor comparison failed: ${err.message}`);
    res.status(422).json({
      status: 'failed',
      error: err.message || 'Failed to compare competitor websites.',
    });
  }
};

export const getDomainOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawUrl = (req.query.domain as string || req.query.url as string || '').trim();
    if (!rawUrl) {
      res.status(400).json({ error: 'domain or url query parameter is required' });
      return;
    }

    const validation = validateAndNormalizeUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      res.status(400).json({ error: `Invalid domain URL: ${validation.error}` });
      return;
    }

    const normalizedUrl = validation.normalizedUrl;
    const domain = new URL(normalizedUrl).hostname;

    // Generate real page-level crawl for Category A metrics
    const report = await generateSeoReport(normalizedUrl, { checkRobots: true, checkSitemap: true });

    const domainOverview: DomainOverviewData = {
      domain,
      timestamp: new Date().toISOString(),
      categoryA: {
        technicalScore: report.scores.technical,
        contentScore: report.scores.content,
        pageLevelScore: report.scores.overall,
        wordCount: report.onPage.wordCount,
        detectedKeywordsCount: report.keywords.all.length,
        internalLinksCount: report.links.internalLinksCount,
        externalLinksCount: report.links.externalLinksCount,
        schemaCount: report.schemas.length,
        isIndexable: report.technical.isIndexable,
        httpsActive: report.technical.isHttps,
      },
      categoryB: {
        status: 'UNAVAILABLE',
        message: 'External SEO data unavailable — Requires connected SEO data provider (DataForSEO, Semrush, Ahrefs).',
        searchVolume: 'External SEO data unavailable',
        estimatedOrganicTraffic: 'External SEO data unavailable',
        paidTraffic: 'External SEO data unavailable',
        backlinksCount: 'External SEO data unavailable',
        referringDomains: 'External SEO data unavailable',
        domainRating: 'External SEO data unavailable',
        topRankingKeywords: 'External SEO data unavailable',
      },
      categoryC: {
        status: 'UNAUTHORIZED',
        message: 'Requires verified Google Search Console or Google Analytics owner authorization.',
        gscClicks: 'Requires Google Search Console authorization',
        gscImpressions: 'Requires Google Search Console authorization',
        gscCtr: 'Requires Google Search Console authorization',
        gscAveragePosition: 'Requires Google Search Console authorization',
        gaTraffic: 'Requires Google Analytics authorization',
      },
      dataConfidence: 'HIGH (On-Page Data)',
    };

    res.json(domainOverview);
  } catch (err: any) {
    logger.error(`Domain overview generation failed: ${err.message}`);
    res.status(422).json({ error: err.message || 'Failed to generate domain overview.' });
  }
};

export const getDataSources = (req: Request, res: Response): void => {
  const providers = DataProviderRegistry.getProviders();
  res.json({ providers });
};

export const getJob = (req: Request, res: Response): void => {
  const id = String(req.params.id);
  const job = jobRepository.getJobById(id);

  if (!job) {
    res.status(404).json({ error: `Analysis job with ID "${id}" was not found.` });
    return;
  }

  res.json(job);
};

export const getHistory = (req: Request, res: Response): void => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const history = jobRepository.getHistory(limit);
  res.json({ history });
};

export const exportReport = (req: Request, res: Response): void => {
  const id = String(req.params.id);
  const format = (req.query.format as string || 'json').toLowerCase();
  const type = (req.query.type as string || 'keywords').toLowerCase();

  const job = jobRepository.getJobById(id);
  const compReport = competitorReportsCache.get(id);

  if (!job?.report && !compReport) {
    res.status(404).json({ error: 'Report not found or analysis has not completed.' });
    return;
  }

  const hostname = job?.report
    ? new URL(job.report.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')
    : compReport
    ? new URL(compReport.targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')
    : 'seo_report';
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. XLSX Multi-Sheet Workbook Export
  if (format === 'xlsx' && job?.report) {
    const buffer = generateExcelWorkbook(job.report, compReport);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="seo_intelligence_${hostname}_${timestamp}.xlsx"`);
    res.send(buffer);
    return;
  }

  // 2. CSV Exports
  if (format === 'csv') {
    let csv = '';
    let filename = `seo_${type}_${hostname}_${timestamp}.csv`;

    if (job?.report) {
      switch (type) {
        case 'keywords-primary':
          csv = exportPrimaryKeywordsToCsv(job.report);
          break;
        case 'keywords-secondary':
          csv = exportSecondaryKeywordsToCsv(job.report);
          break;
        case 'keywords-shorttail':
          csv = exportShortTailKeywordsToCsv(job.report);
          break;
        case 'keywords-longtail':
          csv = exportLongTailKeywordsToCsv(job.report);
          break;
        case 'opportunities':
          csv = exportOpportunitiesToCsv(job.report);
          break;
        case 'issues':
          csv = exportIssuesToCsv(job.report);
          break;
        case 'tags':
          csv = exportTagsToCsv(job.report);
          break;
        case 'links':
          csv = exportLinksToCsv(job.report);
          break;
        case 'images':
          csv = exportImagesToCsv(job.report);
          break;
        default:
          csv = exportKeywordsToCsv(job.report);
          break;
      }
    } else if (compReport) {
      if (type === 'keyword-gap') {
        csv = exportKeywordGapToCsv(compReport);
      } else if (type === 'content-gap') {
        csv = exportContentGapToCsv(compReport);
      } else {
        csv = exportCompetitorComparisonToCsv(compReport);
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    return;
  }

  // 3. HTML Printable Export
  if (format === 'html' && job?.report) {
    const html = generatePrintableHtml(job.report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="seo_report_${hostname}_${timestamp}.html"`);
    res.send(html);
    return;
  }

  // 4. JSON Export
  const jsonStr = exportToJson(job?.report || compReport!);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="seo_report_${hostname}_${timestamp}.json"`);
  res.send(jsonStr);
};
