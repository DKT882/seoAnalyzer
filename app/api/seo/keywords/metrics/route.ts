import { NextRequest, NextResponse } from 'next/server';
import { getSEOProvider } from '@/lib/providers/seo/providerFactory';
import { seoProviderRepository } from '@/lib/db/repository';
import { isStructuralArtifact } from '@/lib/nlp/artifactFilter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawKeywords = Array.isArray(body.keywords) ? body.keywords : [];
    const country = typeof body.country === 'string' ? body.country : 'US';
    const language = typeof body.language === 'string' ? body.language : 'en';

    if (rawKeywords.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cleanKeywords = rawKeywords
      .map((k: any) => String(k || '').trim().toLowerCase())
      .filter((k: string) => k.length > 0 && !isStructuralArtifact(k))
      .slice(0, 100);

    const cachedMap = seoProviderRepository.getBulkMarketData(cleanKeywords, country, language);
    const missing: string[] = [];

    for (const kw of cleanKeywords) {
      if (!cachedMap.has(kw)) {
        missing.push(kw);
      }
    }

    const provider = getSEOProvider();
    const providerStatus = await provider.getStatus();

    if (providerStatus.configured && missing.length > 0) {
      const fetched = await provider.getKeywordMetrics(missing, { country, language });
      if (fetched.length > 0) {
        seoProviderRepository.saveMarketData(fetched);
        for (const item of fetched) {
          cachedMap.set(item.keyword, item);
        }
      }
    }

    const results = cleanKeywords.map((kw: string) => cachedMap.get(kw) || null).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        totalRequested: cleanKeywords.length,
        cachedCount: cleanKeywords.length - missing.length,
        provider: provider.name,
        providerConfigured: providerStatus.configured,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve keyword metrics',
      },
      { status: 500 }
    );
  }
}
