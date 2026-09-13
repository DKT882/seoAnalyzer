import { NextRequest, NextResponse } from 'next/server';
import { SEOFixGenerator } from '@/lib/ai-seo/fix-generator';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recommendation, evidence, currentCodeSnippet, pageHtmlSample } = body || {};

    if (!recommendation || !evidence) {
      return NextResponse.json(
        { error: 'Missing required recommendation or evidence in request body.' },
        { status: 400 }
      );
    }

    const fix = SEOFixGenerator.generateFix({
      recommendation,
      evidence,
      currentCodeSnippet,
      pageHtmlSample,
    });

    return NextResponse.json({
      success: true,
      fix,
    });
  } catch (err: any) {
    logger.error('Error generating AI SEO fix:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate SEO fix patch.' },
      { status: 500 }
    );
  }
}
