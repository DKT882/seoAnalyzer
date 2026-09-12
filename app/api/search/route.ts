import { NextRequest, NextResponse } from 'next/server';
import { executeSearchIntelligenceAudit } from '@/lib/search/searchOrchestrator';
import { SearchAuditMode } from '@/lib/search/searchTypes';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: SearchAuditMode = body.mode || 'SEARCH_QUERY';
    const queries: string[] = Array.isArray(body.queries)
      ? body.queries
      : body.query
      ? [body.query]
      : [];

    if (mode === 'SEARCH_QUERY' && queries.length === 0) {
      return NextResponse.json(
        { error: 'At least one query string is required for SEARCH_QUERY mode.' },
        { status: 400 }
      );
    }

    const report = await executeSearchIntelligenceAudit({
      mode,
      queries,
      userPageReport: body.userPageReport,
      siteCrawlReport: body.siteCrawlReport,
      providerId: body.providerId,
      location: body.location,
      language: body.language,
      device: body.device,
      forceRefresh: body.forceRefresh,
      enableCompetitorPageFetch: body.enableCompetitorPageFetch,
      limits: body.limits,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    logger.error('Search Intelligence API Error:', err);
    return NextResponse.json(
      { error: err.message || 'An internal error occurred during search intelligence analysis.' },
      { status: 500 }
    );
  }
}
