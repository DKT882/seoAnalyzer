import { NextRequest, NextResponse } from 'next/server';
import { getSerpStorage } from '@/lib/search/serpStorage';
import { logger } from '@/lib/utils/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getSerpStorage();
    const snapshot = await store.getSnapshot(id);

    if (!snapshot) {
      return NextResponse.json({ error: `SERP Snapshot with ID or fingerprint "${id}" not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (err: any) {
    logger.error('GET /api/search/[id] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
