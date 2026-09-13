import { NextRequest, NextResponse } from 'next/server';
import { AIContentGenerator } from '@/lib/ai-seo/content-generator';
import { AIContentGenerationRequest } from '@/lib/ai-seo/content-types';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: AIContentGenerationRequest = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    if (!body.mainTopic || typeof body.mainTopic !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid mainTopic string is required.' },
        { status: 400 }
      );
    }

    // Guard against excessive word limits for local LLM performance
    const boundedWordLimit = Math.min(Math.max(Number(body.wordLimit) || 300, 20), 4000);
    const sanitizedRequest: AIContentGenerationRequest = {
      ...body,
      wordLimit: boundedWordLimit,
    };

    const result = await AIContentGenerator.generate(sanitizedRequest);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('AI Content Generation API Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to generate SEO content.',
      },
      { status: 500 }
    );
  }
}
