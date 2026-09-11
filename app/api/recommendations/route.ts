import { NextRequest, NextResponse } from 'next/server';
import { jobRepository, crawlRepository } from '@/lib/db/repository';
import { generateSeoRecommendations } from '@/lib/recommendations/recommendationEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const crawlId = searchParams.get('crawlId');
  const category = searchParams.get('category'); // TECHNICAL, ON_PAGE, CONTENT, etc.
  const quickWinsOnly = searchParams.get('quickWins') === 'true';

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

  const recs = generateSeoRecommendations(pages);

  let filtered = recs.all;
  if (category && recs.byCategory[category.toUpperCase()]) {
    filtered = recs.byCategory[category.toUpperCase()];
  }
  if (quickWinsOnly) {
    filtered = filtered.filter((r) => r.quickWin);
  }

  return NextResponse.json({
    total: filtered.length,
    quickWinsCount: recs.quickWins.length,
    criticalCount: recs.all.filter((r) => r.priority === 'CRITICAL').length,
    highCount: recs.all.filter((r) => r.priority === 'HIGH').length,
    mediumCount: recs.all.filter((r) => r.priority === 'MEDIUM').length,
    lowCount: recs.all.filter((r) => r.priority === 'LOW').length,
    recommendations: filtered,
    byPage: recs.byPage,
  });
}
