import { NextRequest, NextResponse } from 'next/server';
import { getActionStore } from '@/lib/actions/actionStorage';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const store = getActionStore();
    const plans = await store.listPlans({ domain, limit, offset });

    return NextResponse.json({
      success: true,
      plans,
      count: plans.length
    });
  } catch (err: any) {
    logger.error('Error fetching action plans:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list action plans' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id || !body.actions) {
      return NextResponse.json(
        { error: 'Invalid plan payload. id and actions array are required.' },
        { status: 400 }
      );
    }

    const store = getActionStore();
    await store.savePlan(body);

    return NextResponse.json({
      success: true,
      message: 'Plan saved successfully',
      planId: body.id
    });
  } catch (err: any) {
    logger.error('Error saving action plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save action plan' },
      { status: 500 }
    );
  }
}
