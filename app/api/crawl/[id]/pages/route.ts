import { NextRequest, NextResponse } from 'next/server';
import { crawlRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  const { searchParams } = new URL(request.url);
  const pageUrl = searchParams.get('url');

  if (pageUrl) {
    const singleReport = crawlRepository.getPageReport(id, pageUrl);
    if (!singleReport) {
      return NextResponse.json(
        { error: `Page report for "${pageUrl}" not found in session "${id}".` },
        { status: 404 }
      );
    }
    return NextResponse.json({ pageUrl, report: singleReport });
  }

  const pages = crawlRepository.getCrawlPages(id);
  return NextResponse.json({ sessionId: id, total: pages.length, pages });
}
