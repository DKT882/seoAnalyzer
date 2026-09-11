import { NextRequest, NextResponse } from 'next/server';
import { crawlRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;

  const session = crawlRepository.getCrawlSession(id);
  if (!session) {
    return NextResponse.json(
      { error: `Crawl session with ID "${id}" was not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(session);
}
