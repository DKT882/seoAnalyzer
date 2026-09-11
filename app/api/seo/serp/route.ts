import { NextRequest, NextResponse } from 'next/server';
import { getSEOProvider } from '@/lib/providers/seo/providerFactory';
import { seoProviderRepository } from '@/lib/db/repository';
import { isStructuralArtifact } from '@/lib/nlp/artifactFilter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keyword = typeof body.keyword === 'string' ? body.keyword.trim().toLowerCase() : '';
    const country = typeof body.country === 'string' ? body.country : 'US';
    const language = typeof body.language === 'string' ? body.language : 'en';
    const depth = typeof body.depth === 'number' ? body.depth : 20;

    if (!keyword || isStructuralArtifact(keyword)) {
      return NextResponse.json(
        { success: false, error: 'Valid keyword is required for SERP analysis.' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedSerp = seoProviderRepository.getSerpData(keyword, country, language);
    if (cachedSerp) {
      return NextResponse.json({
        success: true,
        data: cachedSerp,
        cached: true,
      });
    }

    const provider = getSEOProvider();
    const status = await provider.getStatus();

    if (!status.configured) {
      return NextResponse.json({
        success: true,
        data: null,
        notice: 'External SEO provider not configured. Connect DataForSEO to view live Google SERP competitor rankings.',
      });
    }

    const liveSerp = await provider.getSerpResults(keyword, { country, language, depth });
    if (liveSerp) {
      seoProviderRepository.saveSerpData(liveSerp);
    }

    return NextResponse.json({
      success: true,
      data: liveSerp,
      cached: false,
      provider: provider.name,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'SERP query failed',
      },
      { status: 500 }
    );
  }
}
