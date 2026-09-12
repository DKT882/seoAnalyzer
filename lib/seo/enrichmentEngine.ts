import 'server-only';
import { getSEOProvider } from '../providers/seo/providerFactory';
import {
  KeywordMarketData,
  SerpData,
  EnrichedKeyword,
} from '../providers/seo/types';
import { seoProviderRepository } from '../db/repository';
import { calculateOpportunityScore } from './opportunityScorer';
import { isStructuralArtifact } from '../nlp/artifactFilter';
import { KeywordItem, SearchIntent, KeywordSource } from '@/types';
import { logger } from '../utils/logger';

export interface EnrichmentOptions {
  country?: string;
  language?: string;
  maxKeywordsToEnrich?: number;
  fetchSerpForTopKeywords?: number;
}

export class KeywordEnrichmentEngine {
  public static async enrichKeywords(
    keywords: KeywordItem[],
    options: EnrichmentOptions = {}
  ): Promise<EnrichedKeyword[]> {
    const country = options.country || 'US';
    const language = options.language || 'en';
    const maxLimit = options.maxKeywordsToEnrich || 40;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return [];
    }

    // 1. Filter out artifacts and deduplicate keywords
    const cleanItems = keywords.filter((k) => k?.keyword && !isStructuralArtifact(k.keyword));
    const uniqueMap = new Map<string, KeywordItem>();
    for (const item of cleanItems) {
      const normalized = item.keyword.toLowerCase().trim();
      if (!uniqueMap.has(normalized)) {
        uniqueMap.set(normalized, item);
      }
    }

    const itemsToProcess = Array.from(uniqueMap.values()).slice(0, maxLimit);
    const keywordStrings = itemsToProcess.map((item) => item.keyword.toLowerCase().trim());

    // 2. Fetch from SQLite Cache
    const cachedMarketDataMap = seoProviderRepository.getBulkMarketData(keywordStrings, country, language);
    const missingFromCache: string[] = [];

    for (const kw of keywordStrings) {
      if (!cachedMarketDataMap.has(kw)) {
        missingFromCache.push(kw);
      }
    }

    // 3. Fetch missing from active SEO provider
    const provider = getSEOProvider();
    const providerStatus = await provider.getStatus();

    if (providerStatus.configured && missingFromCache.length > 0) {
      try {
        logger.info(`Fetching external SEO metrics for ${missingFromCache.length} keywords from ${provider.name}...`);
        const fetchedData = await provider.getKeywordMetrics(missingFromCache, { country, language });
        if (fetchedData.length > 0) {
          seoProviderRepository.saveMarketData(fetchedData);
          for (const item of fetchedData) {
            cachedMarketDataMap.set(item.keyword, item);
          }
        }
      } catch (err: unknown) {
        logger.warn(`Provider metrics query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Construct Enriched Results
    const results: EnrichedKeyword[] = [];
    const topSerpCandidates: string[] = [];

    for (const item of itemsToProcess) {
      const kw = item.keyword.toLowerCase().trim();
      const marketData: KeywordMarketData | null = cachedMarketDataMap.get(kw) || null;

      // Determine coverage status
      const hasKeyLocations = item.inTitle || item.inH1 || item.inMeta;
      const coverageStatus: 'Strong' | 'Weak' | 'Missing' =
        item.source === 'RECOMMENDED' || item.source === 'COMPETITOR_GAP'
          ? 'Missing'
          : hasKeyLocations && item.frequency >= 2
          ? 'Strong'
          : 'Weak';

      const relevanceScore = item.overallScore || item.prominenceScore || 50;
      const qualityScore = item.qualityScore || 70;
      const estimatedIntent: SearchIntent = item.searchIntent || 'Informational';

      const oppScore = calculateOpportunityScore({
        keyword: kw,
        category: item.category,
        internalRelevance: relevanceScore,
        qualityScore,
        frequency: item.frequency || 0,
        coverageStatus,
        estimatedIntent,
        marketData,
      });

      // Derive natural recommendation action
      let recAction = 'Maintain keyword presence';
      if (coverageStatus === 'Missing') {
        recAction = 'Create dedicated section or supporting content page targeting this concept';
      } else if (coverageStatus === 'Weak') {
        recAction = item.inTitle
          ? 'Strengthen body and heading coverage'
          : 'Incorporate into H2 headings and meta description';
      }

      const sources: KeywordSource[] = [];
      if (item.source) {
        sources.push(item.source);
      } else {
        sources.push('EXTRACTED');
      }
      if (marketData && marketData.providerStatus === 'CONNECTED') {
        if (!sources.includes('EXTERNAL')) sources.push('EXTERNAL');
      }

      // Check for cached SERP data
      const serpData: SerpData | null = seoProviderRepository.getSerpData(kw, country, language);

      results.push({
        keyword: item.keyword,
        sources,
        category: item.category,
        internalMetrics: {
          relevanceScore,
          qualityScore,
          frequency: item.frequency || 0,
          density: item.density || 0,
          prominence: item.prominenceScore || 0,
          locations: {
            inTitle: Boolean(item.inTitle),
            inH1: Boolean(item.inH1),
            inH2H6: Boolean(item.inH2H6),
            inMeta: Boolean(item.inMeta),
            inBody: Boolean(item.inBody),
          },
          coverageStatus,
          estimatedIntent,
          evidence: item.evidence,
          reason: item.reason,
        },
        marketData,
        serpData,
        opportunityScore: oppScore,
        targetUrl: undefined,
        recommendationAction: recAction,
      });

      if (!serpData && (item.category === 'primary' || oppScore.finalScore >= 80)) {
        topSerpCandidates.push(kw);
      }
    }

    // 5. Fetch SERP data for top 1-2 key terms if configured & requested
    const serpDepthLimit = options.fetchSerpForTopKeywords || 1;
    if (providerStatus.configured && topSerpCandidates.length > 0 && serpDepthLimit > 0) {
      for (const targetKw of topSerpCandidates.slice(0, serpDepthLimit)) {
        try {
          const liveSerp = await provider.getSerpResults(targetKw, { country, language });
          if (liveSerp) {
            seoProviderRepository.saveSerpData(liveSerp);
            // Attach to matching enriched result
            const match = results.find((r) => r.keyword.toLowerCase().trim() === targetKw);
            if (match) {
              match.serpData = liveSerp;
            }
          }
        } catch (err: unknown) {
          logger.warn(`SERP lookup failed for "${targetKw}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Stable sort by Final Opportunity Score descending
    return results.sort((a, b) => b.opportunityScore.finalScore - a.opportunityScore.finalScore);
  }
}
