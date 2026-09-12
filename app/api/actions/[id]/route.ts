import { NextRequest, NextResponse } from 'next/server';
import { getActionStore } from '@/lib/actions/actionStorage';
import { logger } from '@/lib/utils/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const store = getActionStore();
    const plan = await store.getPlan(id);

    if (!plan) {
      return NextResponse.json({ error: `Action plan with ID "${id}" not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (err: any) {
    logger.error('Error fetching action plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve action plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const store = getActionStore();
    const deleted = await store.deletePlan(id);

    if (!deleted) {
      return NextResponse.json({ error: `Action plan with ID "${id}" not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Action plan "${id}" deleted successfully.`
    });
  } catch (err: any) {
    logger.error('Error deleting action plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete action plan' },
      { status: 500 }
    );
  }
}
