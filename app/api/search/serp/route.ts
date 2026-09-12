import { NextRequest, NextResponse } from 'next/server';
import { SerpCollector } from '@/lib/search/serpCollector';
import { normalizeQueryString } from '@/lib/search/serpNormalizer';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get('query') || searchParams.get('q');
    const location = searchParams.get('location') || 'United States';
    const language = searchParams.get('language') || 'en';
    const device = (searchParams.get('device') as any) || 'DESKTOP';
    const providerId = searchParams.get('provider') || undefined;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!rawQuery) {
      return NextResponse.json({ error: 'Query parameter "query" or "q" is required.' }, { status: 400 });
    }

    const query = normalizeQueryString(rawQuery);
    const collector = new SerpCollector({
      providerId,
      location,
      language,
      device,
      forceRefresh,
    });

    const result = await collector.collectSerpSnapshots(
      [{ query, normalizedQuery: query, source: 'USER_TARGET' }],
      { location, language, device, forceRefresh }
    );

    if (result.snapshots.length === 0) {
      const errMsg = result.errors[0]?.error || 'Failed to retrieve SERP data';
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      snapshot: result.snapshots[0],
      telemetry: result.telemetry,
    });
  } catch (err: any) {
    logger.error('GET /api/search/serp Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
