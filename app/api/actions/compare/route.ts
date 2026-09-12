import { NextRequest, NextResponse } from 'next/server';
import { compareActionPlans } from '@/lib/actions/actionComparator';
import { getActionStore } from '@/lib/actions/actionStorage';
import { SeoActionPlan } from '@/lib/actions/actionTypes';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let baselinePlan: SeoActionPlan | null = body.baselinePlan || null;
    let targetPlan: SeoActionPlan | null = body.targetPlan || null;

    const store = getActionStore();

    if (!baselinePlan && body.baselinePlanId) {
      baselinePlan = await store.getPlan(body.baselinePlanId);
      if (!baselinePlan) {
        return NextResponse.json(
          { error: `Baseline plan with ID "${body.baselinePlanId}" not found.` },
          { status: 404 }
        );
      }
    }

    if (!targetPlan && body.targetPlanId) {
      targetPlan = await store.getPlan(body.targetPlanId);
      if (!targetPlan) {
        return NextResponse.json(
          { error: `Target plan with ID "${body.targetPlanId}" not found.` },
          { status: 404 }
        );
      }
    }

    if (!baselinePlan || !targetPlan) {
      return NextResponse.json(
        { error: 'Both baselinePlan (or baselinePlanId) and targetPlan (or targetPlanId) are required for comparison.' },
        { status: 400 }
      );
    }

    const comparison = compareActionPlans(baselinePlan, targetPlan);

    return NextResponse.json({
      success: true,
      comparison
    });
  } catch (err: any) {
    logger.error('Error comparing action plans:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to compare action plans' },
      { status: 500 }
    );
  }
}
