import { NextRequest, NextResponse } from 'next/server';
import { executeSearchIntelligenceAudit } from '@/lib/search/searchOrchestrator';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query;
    if (!query) {
      return NextResponse.json({ error: 'Field "query" is required.' }, { status: 400 });
    }

    const report = await executeSearchIntelligenceAudit({
      mode: 'SEARCH_QUERY',
      queries: [query],
      location: body.location,
      language: body.language,
      device: body.device,
      forceRefresh: body.forceRefresh,
    });

    return NextResponse.json({
      success: true,
      query,
      opportunities: report.opportunities,
      topicPatterns: report.topicPatterns[query] || [],
      internalLinkIntegrations: report.internalLinkIntegrations,
    });
  } catch (err: any) {
    logger.error('POST /api/search/opportunities Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
