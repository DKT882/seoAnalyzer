import { NextRequest, NextResponse } from 'next/server';
import { jobRepository, crawlRepository } from '@/lib/db/repository';
import { generateKeywordStrategy } from '@/lib/keywords/keywordStrategy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const crawlId = searchParams.get('crawlId');

  let pages: any[] = [];

  if (crawlId) {
    const session = crawlRepository.getCrawlSession(crawlId);
    if (session?.report) {
      pages = Object.values(session.report.pageReports);
    }
  } else if (jobId) {
    const job = jobRepository.getJobById(jobId);
    if (job?.report) {
      pages = [job.report];
    }
  }

  if (pages.length === 0) {
    return NextResponse.json(
      { error: 'Provide a valid jobId or crawlId with completed analysis.' },
      { status: 400 }
    );
  }

  const strategy = generateKeywordStrategy(undefined, pages);
  const opportunities = strategy.keywords.filter((k) => k.internalOpportunityScore >= 60);

  return NextResponse.json({
    total: opportunities.length,
    opportunities,
    notice: 'Internal Opportunity Score is an explainable analytical signal (0-100), not a Google ranking prediction.',
  });
}
