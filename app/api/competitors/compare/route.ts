import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAndNormalizeUrl } from '@/lib/utils/urlUtils';
import { compareCompetitorWebsites } from '@/lib/competitors/competitorComparator';
import { competitorReportsCache } from '@/lib/reports/competitorCache';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const compareRequestSchema = z.object({
  targetUrl: z.string().min(1, 'Target URL is required'),
  competitorUrls: z
    .array(z.string().min(1))
    .min(1, 'At least 1 competitor URL is required')
    .max(4, 'Maximum 4 competitor URLs allowed'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = compareRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { targetUrl, competitorUrls } = parseResult.data;

    // Validate target URL
    const targetValidation = validateAndNormalizeUrl(targetUrl);
    if (!targetValidation.isValid || !targetValidation.normalizedUrl) {
      return NextResponse.json(
        { error: `Invalid target URL: ${targetValidation.error}` },
        { status: 400 }
      );
    }

    // Validate competitor URLs
    const normalizedCompetitors: string[] = [];
    for (const cUrl of competitorUrls) {
      const cVal = validateAndNormalizeUrl(cUrl);
      if (!cVal.isValid || !cVal.normalizedUrl) {
        return NextResponse.json(
          { error: `Invalid competitor URL "${cUrl}": ${cVal.error}` },
          { status: 400 }
        );
      }
      normalizedCompetitors.push(cVal.normalizedUrl);
    }

    logger.info(
      `Comparing target ${targetValidation.normalizedUrl} against ${normalizedCompetitors.length} competitors.`
    );

    const report = await compareCompetitorWebsites({
      targetUrl: targetValidation.normalizedUrl,
      competitorUrls: normalizedCompetitors,
    });

    // Cache comparison report
    competitorReportsCache.set(report.id, report);

    return NextResponse.json(
      {
        comparisonId: report.id,
        status: 'completed',
        report,
      },
      { status: 200 }
    );
  } catch (err: any) {
    logger.error(`Competitor comparison failed: ${err.message}`);
    return NextResponse.json(
      {
        status: 'failed',
        error: err.message || 'Failed to compare competitor websites.',
      },
      { status: 422 }
    );
  }
}
