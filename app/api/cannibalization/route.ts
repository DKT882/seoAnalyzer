import { NextRequest, NextResponse } from 'next/server';
import { crawlRepository } from '@/lib/db/repository';
import { detectKeywordCannibalization, detectContentDuplication } from '@/lib/reports/siteAggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const crawlId = searchParams.get('crawlId');

  if (!crawlId) {
    return NextResponse.json(
      { error: 'crawlId query parameter is required.' },
      { status: 400 }
    );
  }

  const session = crawlRepository.getCrawlSession(crawlId);
  if (!session?.report) {
    return NextResponse.json(
      { error: `Completed crawl session with ID "${crawlId}" was not found.` },
      { status: 404 }
    );
  }

  const pages = Object.values(session.report.pageReports || {}) as import('@/types').SEOReport[];
  const cannibalization = detectKeywordCannibalization(pages);
  const contentDuplication = detectContentDuplication(pages);

  return NextResponse.json({
    crawlId,
    domain: session.report.domain,
    cannibalizationCount: cannibalization.length,
    cannibalization,
    duplicationCount: contentDuplication.length,
    contentDuplication,
    notice: 'Potential keyword cannibalization and content similarity are analytical inferences, not guaranteed search engine penalties.',
  });
}
