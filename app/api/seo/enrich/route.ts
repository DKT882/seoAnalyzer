import { NextRequest, NextResponse } from 'next/server';
import { KeywordEnrichmentEngine } from '@/lib/seo/enrichmentEngine';
import { getSEOProvider } from '@/lib/providers/seo/providerFactory';
import { KeywordItem } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keywords: KeywordItem[] = Array.isArray(body.keywords) ? body.keywords : [];
    const country = typeof body.country === 'string' ? body.country : 'US';
    const language = typeof body.language === 'string' ? body.language : 'en';
    const maxKeywords = typeof body.maxKeywords === 'number' ? body.maxKeywords : 40;
    const fetchSerp = typeof body.fetchSerp === 'number' ? body.fetchSerp : 1;

    if (keywords.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const enriched = await KeywordEnrichmentEngine.enrichKeywords(keywords, {
      country,
      language,
      maxKeywordsToEnrich: maxKeywords,
      fetchSerpForTopKeywords: fetchSerp,
    });

    const provider = getSEOProvider();
    const status = await provider.getStatus();

    return NextResponse.json({
      success: true,
      data: enriched,
      provider: provider.name,
      providerStatus: status,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Keyword enrichment failed',
      },
      { status: 500 }
    );
  }
}
