import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAndNormalizeUrl } from '@/lib/utils/urlUtils';
import { validateHostnameSsrf } from '@/lib/utils/ssrfGuard';
import { crawlRepository } from '@/lib/db/repository';
import { executeWebsiteCrawl } from '@/lib/crawler/websiteCrawler';
import { StartCrawlResponse } from '@/types';
import { logger } from '@/lib/utils/logger';
import { normalizeErrorToAnalyzerError } from '@/lib/errors/analyzerErrors';

export const dynamic = 'force-dynamic';

const startCrawlSchema = z
  .object({
    url: z.string().optional(),
    startUrl: z.string().optional(),
    maxPages: z.coerce.number().min(1).max(500).default(10),
    concurrency: z.coerce.number().min(1).max(6).default(4),
    respectRobots: z.boolean().default(true),
    checkSitemap: z.boolean().default(true),
    primaryKeyword: z.string().optional(),
  })
  .refine((data) => Boolean(data.url || data.startUrl), {
    message: 'Either url or startUrl is required',
  });

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = startCrawlSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: true,
          code: 'INVALID_URL',
          message: 'Validation failed',
          details: parsed.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const inputUrl = (parsed.data.startUrl || parsed.data.url)!.trim();
    const { maxPages, concurrency, respectRobots, checkSitemap, primaryKeyword } = parsed.data;

    logger.info(`[API /api/crawl] Received crawl request for: "${inputUrl}" (Max pages: ${maxPages})`);

    // 1. Validate & Normalize start URL
    const urlVal = validateAndNormalizeUrl(inputUrl);
    if (!urlVal.isValid || !urlVal.normalizedUrl) {
      logger.warn(`[API /api/crawl] Invalid URL format for: "${inputUrl}" - ${urlVal.error}`);
      return NextResponse.json(
        {
          error: true,
          code: 'INVALID_URL',
          message: 'Invalid URL format.',
          details: urlVal.error || 'Cannot parse URL',
        },
        { status: 400 }
      );
    }

    const normalizedUrl = urlVal.normalizedUrl;
    const domain = new URL(normalizedUrl).hostname;

    // 2. Pre-flight SSRF Validation
    logger.info(`[API /api/crawl] Running pre-flight SSRF check on hostname: ${domain}`);
    const ssrfCheck = await validateHostnameSsrf(domain);
    if (!ssrfCheck.isSafe) {
      logger.warn(`[API /api/crawl] SSRF check blocked hostname: ${domain} - ${ssrfCheck.reason}`);
      return NextResponse.json(
        {
          status: 'failed',
          error: ssrfCheck.reason || 'SSRF Protection Blocked',
          code: 'SSRF_BLOCKED',
          message: 'SSRF Protection Blocked: The target domain or resolved IP is restricted.',
          details: ssrfCheck.reason,
        },
        { status: 422 }
      );
    }

    // 3. Create Crawl Session in Database
    const session = crawlRepository.createCrawlSession(normalizedUrl, domain, maxPages);
    logger.info(`[API /api/crawl] Created crawl session ${session.id} for ${domain}`);

    // 4. Fire-and-forget background execution
    executeWebsiteCrawl(
      session.id,
      normalizedUrl,
      {
        url: normalizedUrl,
        maxPages,
        concurrency,
        respectRobots,
        checkSitemap,
      },
      primaryKeyword
    ).catch((err) => {
      const structured = normalizeErrorToAnalyzerError(err);
      logger.error(`[CRAWL ${session.id}] Background execution error [${structured.code}]: ${structured.message}`, structured.details);
      crawlRepository.failCrawlSession(session.id, structured.message);
    });

    const responseData: StartCrawlResponse = {
      crawlId: session.id,
      status: 'crawling',
      message: `Website crawl started for ${domain} (Target limit: ${maxPages} pages)`,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (err: any) {
    const structured = normalizeErrorToAnalyzerError(err);
    logger.error(`[API /api/crawl] Failed to initiate crawl [${structured.code}]: ${structured.message}`, structured.details);
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
