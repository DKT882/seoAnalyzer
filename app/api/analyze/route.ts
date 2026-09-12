import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAndNormalizeUrl } from '@/lib/utils/urlUtils';
import { jobRepository } from '@/lib/db/repository';
import { generateSeoReport } from '@/lib/reports/reportGenerator';
import { logger } from '@/lib/utils/logger';
import { normalizeErrorToAnalyzerError } from '@/lib/errors/analyzerErrors';

export const dynamic = 'force-dynamic';

const analyzeRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  checkRobots: z.boolean().optional().default(true),
  checkSitemap: z.boolean().optional().default(true),
  targetKeywords: z.union([z.array(z.string()), z.string()]).optional(),
  renderMode: z.enum(['static', 'browser', 'auto']).optional().default('auto'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = analyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: true,
          code: 'INVALID_URL',
          message: 'Validation failed',
          details: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { url, checkRobots, checkSitemap, targetKeywords, renderMode } = parseResult.data;
    logger.info(`[API /api/analyze] Request received for: "${url}" (renderMode: ${renderMode})`);

    // 1. Initial URL validation
    const validation = validateAndNormalizeUrl(url);
    if (!validation.isValid || !validation.normalizedUrl) {
      logger.warn(`[API /api/analyze] URL validation failed for: "${url}" - ${validation.error}`);
      return NextResponse.json(
        {
          error: validation.error || 'Invalid URL format',
          code: 'INVALID_URL',
          message: 'Invalid URL format.',
          details: validation.error || 'Cannot parse URL',
        },
        { status: 400 }
      );
    }

    const normalizedUrl = validation.normalizedUrl;
    logger.info(`[API /api/analyze] Parsed & normalized URL: ${normalizedUrl}`);

    // 2. Create Job in database
    const job = jobRepository.createJob(url, normalizedUrl);
    jobRepository.updateJobStatus(job.id, 'crawling');

    logger.info(`[API /api/analyze] Starting SEO analysis for job ${job.id} on ${normalizedUrl}`);

    try {
      // 3. Generate complete SEO Report
      const report = await generateSeoReport(normalizedUrl, {
        checkRobots,
        checkSitemap,
        targetKeywords,
        renderMode,
      });


      // 4. Save to Database
      jobRepository.saveReport(job.id, report);
      logger.info(`[API /api/analyze] Analysis completed successfully for job ${job.id} in ${report.durationMs}ms`);

      return NextResponse.json(
        {
          jobId: job.id,
          status: 'completed',
          report,
        },
        { status: 200 }
      );
    } catch (analysisErr: any) {
      const structured = normalizeErrorToAnalyzerError(analysisErr);
      logger.error(`[API /api/analyze] Analysis failed for job ${job.id} [${structured.code}]: ${structured.message}`, structured.details);
      jobRepository.updateJobStatus(job.id, 'failed', structured.message);

      return NextResponse.json(
        {
          jobId: job.id,
          status: 'failed',
          error: structured.message,
          code: structured.code,
          message: structured.message,
          details: structured.details,
        },
        { status: structured.statusCode }
      );
    }
  } catch (err: any) {
    const structured = normalizeErrorToAnalyzerError(err);
    logger.error(`[API /api/analyze] Unhandled exception: ${structured.message}`, structured.details);
    return NextResponse.json(
      {
        error: structured.message,
        code: structured.code,
        message: structured.message,
        details: structured.details,
      },
      { status: structured.statusCode }
    );
  }
}
