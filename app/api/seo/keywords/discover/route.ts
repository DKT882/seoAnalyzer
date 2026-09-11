import { NextRequest, NextResponse } from 'next/server';
import { getSEOProvider } from '@/lib/providers/seo/providerFactory';
import { isStructuralArtifact } from '@/lib/nlp/artifactFilter';
import { calculateKeywordQualityScore } from '@/lib/nlp/keywordQuality';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const seed = typeof body.seed === 'string' ? body.seed.trim() : '';
    const country = typeof body.country === 'string' ? body.country : 'US';
    const language = typeof body.language === 'string' ? body.language : 'en';
    const type = body.type === 'ideas' ? 'ideas' : 'suggestions';

    if (!seed || isStructuralArtifact(seed)) {
      return NextResponse.json(
        { success: false, error: 'Valid seed keyword is required.' },
        { status: 400 }
      );
    }

    const provider = getSEOProvider();
    const status = await provider.getStatus();

    if (!status.configured) {
      return NextResponse.json({
        success: true,
        data: [],
        notice: 'External SEO data provider is not configured. Connect DataForSEO in settings to discover external market keywords.',
      });
    }

    const rawSuggestions =
      type === 'ideas'
        ? await provider.getRelatedKeywords(seed, { country, language, limit: 30 })
        : await provider.getKeywordSuggestions(seed, { country, language, limit: 30 });

    // Filter through artifact and quality validation
    const validSuggestions = rawSuggestions
      .filter((item) => {
        if (!item.keyword || isStructuralArtifact(item.keyword)) return false;
        const quality = calculateKeywordQualityScore(item.keyword);
        return quality >= 60;
      })
      .map((item) => ({
        ...item,
        qualityScore: calculateKeywordQualityScore(item.keyword),
      }));

    return NextResponse.json({
      success: true,
      data: validSuggestions,
      seed,
      provider: provider.name,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Keyword discovery failed',
      },
      { status: 500 }
    );
  }
}
