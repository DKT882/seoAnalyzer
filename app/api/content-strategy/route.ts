import { NextRequest, NextResponse } from 'next/server';
import { jobRepository, crawlRepository } from '@/lib/db/repository';
import { aggregateSiteKeywords } from '@/lib/reports/siteAggregator';
import { generateSiteContentStrategy } from '@/lib/content/contentStrategy';

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

  const siteKeywords = aggregateSiteKeywords(pages);
  const contentStrategy = generateSiteContentStrategy(pages, siteKeywords);

  return NextResponse.json(contentStrategy);
}
