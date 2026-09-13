import { NextRequest, NextResponse } from 'next/server';
import { SEOEvidenceBuilder } from '@/lib/ai-seo/evidence-builder';
import { AISEOOrchestrator } from '@/lib/ai-seo/orchestrator';
import { AIActionBridge } from '@/lib/ai-seo/action-generator';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageReport, siteCrawl, searchReport, config } = body || {};

    if (!pageReport && !siteCrawl && !searchReport && !body.url) {
      return NextResponse.json(
        { error: 'At least one audit report (pageReport, siteCrawl, or searchReport) or URL is required.' },
        { status: 400 }
      );
    }

    // Step 1: Normalize facts into SEOEvidence
    const evidence = SEOEvidenceBuilder.buildEvidence({
      pageReport,
      siteCrawl,
      searchReport,
      url: body.url,
      htmlSample: body.htmlSample,
    });

    // Step 2: Run dynamic specialist agents via orchestrator
    const orchestrator = new AISEOOrchestrator(config);
    const aiResult = await orchestrator.analyzeEvidence(evidence);

    // Step 3: Feed AI recommendations into Phase 9 Action Engine
    const actionPlan = AIActionBridge.generateEnrichedActionPlan({
      evidence,
      recommendations: aiResult.recommendations,
      targetDomain: evidence.domain,
    });

    return NextResponse.json({
      success: true,
      url: evidence.url,
      domain: evidence.domain,
      evidence,
      aiResult,
      actionPlan,
    });
  } catch (err: any) {
    logger.error('Error in AI SEO audit API:', err);
    return NextResponse.json(
      { error: err.message || 'AI SEO audit failed.' },
      { status: 500 }
    );
  }
}
