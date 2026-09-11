import { NextRequest, NextResponse } from 'next/server';
import { crawlRepository } from '@/lib/db/repository';
import { activeCrawls } from '@/lib/crawler/websiteCrawler';

export const dynamic = 'force-dynamic';

export async function POST(
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

  // Signal cancellation in memory
  const token = activeCrawls.get(id);
  if (token) {
    token.isCancelled = true;
  }

  crawlRepository.cancelCrawlSession(id);

  return NextResponse.json({
    status: 'cancelled',
    message: `Crawl session "${id}" was successfully requested to stop. Completed pages will be retained.`,
  });
}
