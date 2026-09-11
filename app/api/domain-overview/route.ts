import { NextRequest, NextResponse } from 'next/server';
import { validateAndNormalizeUrl } from '@/lib/utils/urlUtils';
import { generateSeoReport } from '@/lib/reports/reportGenerator';
import { DomainOverviewData } from '@/types';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = (searchParams.get('domain') || searchParams.get('url') || '').trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: 'domain or url query parameter is required' },
        { status: 400 }
      );
    }

    const validation = validateAndNormalizeUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        { error: `Invalid domain URL: ${validation.error}` },
        { status: 400 }
      );
    }

    const normalizedUrl = validation.normalizedUrl;
    const domain = new URL(normalizedUrl).hostname;

    // Generate real page-level crawl for Category A metrics
    const report = await generateSeoReport(normalizedUrl, {
      checkRobots: true,
      checkSitemap: true,
    });

    const domainOverview: DomainOverviewData = {
      domain,
      timestamp: new Date().toISOString(),
      categoryA: {
        technicalScore: report.scores.technical,
        contentScore: report.scores.content,
        pageLevelScore: report.scores.overall,
        wordCount: report.onPage.wordCount,
        detectedKeywordsCount: report.keywords.all.length,
        internalLinksCount: report.links.internalLinksCount,
        externalLinksCount: report.links.externalLinksCount,
        schemaCount: report.schemas.length,
        isIndexable: report.technical.isIndexable,
        httpsActive: report.technical.isHttps,
      },
      categoryB: {
        status: 'UNAVAILABLE',
        message:
          'External SEO data unavailable — Requires connected SEO data provider (DataForSEO, Semrush, Ahrefs).',
        searchVolume: 'External SEO data unavailable',
        estimatedOrganicTraffic: 'External SEO data unavailable',
        paidTraffic: 'External SEO data unavailable',
        backlinksCount: 'External SEO data unavailable',
        referringDomains: 'External SEO data unavailable',
        domainRating: 'External SEO data unavailable',
        topRankingKeywords: 'External SEO data unavailable',
      },
      categoryC: {
        status: 'UNAUTHORIZED',
        message:
          'Requires verified Google Search Console or Google Analytics owner authorization.',
        gscClicks: 'Requires Google Search Console authorization',
        gscImpressions: 'Requires Google Search Console authorization',
        gscCtr: 'Requires Google Search Console authorization',
        gscAveragePosition: 'Requires Google Search Console authorization',
        gaTraffic: 'Requires Google Analytics authorization',
      },
      dataConfidence: 'HIGH (On-Page Data)',
    };

    return NextResponse.json(domainOverview);
  } catch (err: any) {
    logger.error(`Domain overview generation failed: ${err.message}`);
    return NextResponse.json(
      { error: err.message || 'Failed to generate domain overview.' },
      { status: 422 }
    );
  }
}
