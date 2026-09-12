import { NextRequest, NextResponse } from 'next/server';
import { generateSeoActionPlan } from '@/lib/actions/actionEngine';
import { getActionStore } from '@/lib/actions/actionStorage';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || (!body.pageReport && !body.crawlReport && !body.searchAuditReport && !body.targetDomain)) {
      return NextResponse.json(
        { error: 'At least one input report (pageReport, crawlReport, searchAuditReport) or targetDomain is required.' },
        { status: 400 }
      );
    }

    const plan = generateSeoActionPlan({
      pageReport: body.pageReport,
      crawlReport: body.crawlReport,
      searchAuditReport: body.searchAuditReport,
      targetDomain: body.targetDomain,
      maxActions: body.maxActions ? Math.min(500, Math.max(1, body.maxActions)) : undefined,
      maxUrlsPerAction: body.maxUrlsPerAction,
      maxEvidenceItems: body.maxEvidenceItems
    });

    if (body.saveToStore !== false) {
      try {
        const store = getActionStore();
        await store.savePlan(plan);
      } catch (storeErr) {
        logger.warn('Failed to auto-save plan to store:', storeErr);
      }
    }

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (err: any) {
    logger.error('Error generating action plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate SEO action plan' },
      { status: 500 }
    );
  }
}
