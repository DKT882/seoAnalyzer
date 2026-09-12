import { NextRequest, NextResponse } from 'next/server';
import { getSerpStorage } from '@/lib/search/serpStorage';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const store = getSerpStorage();
    const snapshots = await store.listSnapshots({ query, limit });

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        fingerprint: s.fingerprint,
        query: s.query,
        provider: s.provider,
        location: s.location,
        language: s.language,
        device: s.device,
        collectedAt: s.collectedAt,
        organicCount: s.organicCount,
        freshnessAgeMinutes: s.freshnessAgeMinutes,
        featureTypes: s.featureTypes,
        isSyntheticTest: s.sourceMetadata.isSyntheticTest,
      })),
    });
  } catch (err: any) {
    logger.error('GET /api/search/history Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
