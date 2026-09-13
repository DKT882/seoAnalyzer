import { NextRequest, NextResponse } from 'next/server';
import { SEOValidator } from '@/lib/ai-seo/validator';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fix, evidence } = body || {};

    if (!fix || !evidence) {
      return NextResponse.json(
        { error: 'Missing required fix or evidence in request body.' },
        { status: 400 }
      );
    }

    const validation = SEOValidator.validateFix({
      fix,
      evidence,
    });

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (err: any) {
    logger.error('Error validating SEO fix:', err);
    return NextResponse.json(
      { error: err.message || 'Validation failed.' },
      { status: 500 }
    );
  }
}
