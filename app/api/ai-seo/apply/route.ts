import { NextRequest, NextResponse } from 'next/server';
import { SEOAutoApplicator } from '@/lib/ai-seo/auto-applicator';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, fix, validation, approval, rollbackToken } = body || {};

    if (action === 'rollback') {
      if (!rollbackToken) {
        return NextResponse.json(
          { error: 'rollbackToken is required for rollback.' },
          { status: 400 }
        );
      }
      const rollbackResult = SEOAutoApplicator.rollbackFix(rollbackToken);
      return NextResponse.json({
        success: true,
        rollback: rollbackResult,
      });
    }

    // Explicit approval application
    if (!fix || !validation || !approval) {
      return NextResponse.json(
        { error: 'Missing required fix, validation, or approval context in request body.' },
        { status: 400 }
      );
    }

    const applicationResult = SEOAutoApplicator.applyFix(fix, validation, approval);

    return NextResponse.json({
      success: true,
      result: applicationResult,
    });
  } catch (err: any) {
    logger.error('Error applying or rolling back AI SEO fix:', err);
    return NextResponse.json(
      { error: err.message || 'Operation failed.' },
      { status: 500 }
    );
  }
}
