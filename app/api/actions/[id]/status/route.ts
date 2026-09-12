import { NextRequest, NextResponse } from 'next/server';
import { getActionStore } from '@/lib/actions/actionStorage';
import { ActionStatus } from '@/lib/actions/actionTypes';
import { logger } from '@/lib/utils/logger';

const VALID_STATUSES: Set<ActionStatus> = new Set([
  'OPEN',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'VERIFIED',
  'DISMISSED'
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const { actionId, status, dismissalReason } = body || {};

    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json({ error: 'actionId string is required.' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status "${status}". Allowed values: OPEN, IN_PROGRESS, IMPLEMENTED, VERIFIED, DISMISSED.` },
        { status: 400 }
      );
    }

    if (status === 'DISMISSED' && (!dismissalReason || typeof dismissalReason !== 'string' || !dismissalReason.trim())) {
      return NextResponse.json(
        { error: 'A dismissalReason explanation is required when dismissing an SEO action.' },
        { status: 400 }
      );
    }

    const store = getActionStore();
    const updatedAction = await store.updateActionStatus(planId, actionId, status, dismissalReason?.trim());

    if (!updatedAction) {
      return NextResponse.json(
        { error: `Action "${actionId}" or Plan "${planId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      action: updatedAction
    });
  } catch (err: any) {
    logger.error('Error updating action status:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update action status' },
      { status: 500 }
    );
  }
}
