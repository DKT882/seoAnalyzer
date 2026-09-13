import { SEOReport } from '@/types';
import { SearchIntelligenceAuditReport } from '@/lib/search/searchTypes';
import {
  SEOEvidence,
  TechnicalEvidence,
  ContentEvidence,
  InternalLinkEvidence,
  KeywordEvidence,
  EcommerceEvidence,
  SerpEvidence,
  CompetitorGapEvidence,
} from './types';

export interface EvidenceBuildOptions {
  pageReport?: Partial<SEOReport> | any;
  siteCrawl?: any;
  searchReport?: Partial<SearchIntelligenceAuditReport> | any;
  url?: string;
  htmlSample?: string;
}

export class SEOEvidenceBuilder {
  /**
   * Normalizes raw audit outputs from Phase 1-8 into a unified, facts-only evidence model.
   */
  public static buildEvidence(options: EvidenceBuildOptions): SEOEvidence {
    const { pageReport, searchReport, url, siteCrawl } = options;

    const targetUrl =
      url ||
      pageReport?.url ||
      pageReport?.normalizedUrl ||
      'https://example.com';

    let domain = 'example.com';
    try {
      domain = new URL(targetUrl).hostname;
    } catch {
      // fallback
    }

    const technical = this.extractTechnicalEvidence(pageReport, siteCrawl);
    const content = this.extractContentEvidence(pageReport);
    const links = this.extractLinkEvidence(pageReport, siteCrawl, targetUrl);
    const keywords = this.extractKeywordEvidence(pageReport);
    const ecommerce = this.extractEcommerceEvidence(pageReport);
    const serp = this.extractSerpEvidence(searchReport, targetUrl);
    const competitors = this.extractCompetitorEvidence(searchReport);

    const rawIssuesSummary = (pageReport?.issues || []).map(
      (iss: any) => `[${iss.severity || 'INFO'}] ${iss.title || 'Issue'}: ${iss.description || ''}`
    );

    return {
      url: targetUrl,
      domain,
      pageType: pageReport?.contentIntelligence?.pageType?.primaryType || content.pageType,
      crawledAt: new Date().toISOString(),
      sourceAudits: {
        pageAuditId: pageReport?.id,
        crawlSessionId: siteCrawl?.sessionId || siteCrawl?.id,
        searchAuditId: searchReport?.id,
      },
      technical,
      content,
      links,
      keywords,
      ecommerce,
      serp,
      competitors,
      rawIssuesSummary,
    };
  }

  private static extractTechnicalEvidence(
    pageReport?: Partial<SEOReport> | any,
    _siteCrawl?: any
  ): TechnicalEvidence {
    const onPage = pageReport?.onPage;
    const tech = pageReport?.technical;
    const schemas = pageReport?.schemas || [];

    const schemaTypes: string[] = [];
    if (Array.isArray(schemas)) {
      schemas.forEach((s: any) => {
        if (s.type) schemaTypes.push(s.type);
        if (s['@type']) schemaTypes.push(s['@type']);
      });
    }

    const h1Arr = onPage?.headings?.h1 || [];
    const h2Arr = onPage?.headings?.h2 || [];
    const titleVal = onPage?.title?.value || onPage?.title || '';
    const metaDescVal = onPage?.metaDescription?.value || onPage?.metaDescription || '';

    return {
      statusCode: tech?.statusCode ?? 200,
      isIndexable: tech?.isIndexable ?? true,
      canonicalUrl: tech?.canonicalUrl || null,
      selfReferentialCanonical: tech?.isCanonicalSelfReferencing ?? true,
      robotsDirectives: {
        noindex: tech?.robotsDirectives?.noindex ?? false,
        nofollow: tech?.robotsDirectives?.nofollow ?? false,
        isBlockedByRobotsTxt: tech?.robotsTxt?.isDisallowed ?? false,
      },
      title: {
        value: typeof titleVal === 'string' ? titleVal : (titleVal as any)?.text,
        length: onPage?.title?.length || (typeof titleVal === 'string' ? titleVal.length : 0),
        isMissing: !titleVal || (typeof titleVal === 'string' && titleVal.trim().length === 0),
        isDuplicate: false,
      },
      metaDescription: {
        value: typeof metaDescVal === 'string' ? metaDescVal : (metaDescVal as any)?.text,
        length: onPage?.metaDescription?.length || (typeof metaDescVal === 'string' ? metaDescVal.length : 0),
        exists: !!metaDescVal && (typeof metaDescVal === 'string' ? metaDescVal.trim().length > 0 : true),
        isDuplicate: false,
      },
      headings: {
        h1Count: Array.isArray(h1Arr) ? h1Arr.length : 0,
        h1Text: Array.isArray(h1Arr) && h1Arr.length > 0 ? (typeof h1Arr[0] === 'string' ? h1Arr[0] : (h1Arr[0] as any)?.text) : undefined,
        h2Count: Array.isArray(h2Arr) ? h2Arr.length : 0,
        headingsWithoutContentCount: onPage?.headings?.emptyHeadingsCount || 0,
      },
      performance: {
        responseTimeMs: pageReport?.browserPerformance?.lcpEstimateMs,
        pageSizeBytes: pageReport?.onPage?.contentSize,
        lcpEstimateMs: pageReport?.browserPerformance?.lcpEstimateMs,
        inpEstimateMs: pageReport?.browserPerformance?.inpEstimateMs,
        clsEstimate: pageReport?.browserPerformance?.clsEstimate,
      },
      schema: {
        types: Array.from(new Set(schemaTypes)),
        hasValidJsonLd: schemas.length > 0,
        missingRequiredFields: [],
        schemaCount: schemas.length,
      },
      security: {
        isHttps: tech?.infrastructure?.isHttps ?? true,
        hasMixedContent: tech?.infrastructure?.hasMixedContent ?? false,
      },
      mobile: {
        hasViewport: tech?.mobile?.hasViewportMeta ?? true,
      },
    };
  }

  private static extractContentEvidence(pageReport?: Partial<SEOReport> | any): ContentEvidence {
    const ci = pageReport?.contentIntelligence;
    const topicData = pageReport?.topicCoverageData;

    const topicGaps: string[] = [];
    if (ci?.contentGaps && Array.isArray(ci.contentGaps)) {
      ci.contentGaps.forEach((g: any) => {
        if (typeof g === 'string') topicGaps.push(g);
        else if (g.topic) topicGaps.push(g.topic);
      });
    }

    return {
      wordCount: pageReport?.onPage?.wordCount || ci?.extraction?.mainContentWordCount || 0,
      mainWordCount: ci?.extraction?.mainContentWordCount || pageReport?.onPage?.wordCount || 0,
      pageType: ci?.pageType?.primaryType || ci?.pageType?.detectedType,
      searchIntent: ci?.searchIntent?.primaryIntent,
      intentConfidence: ci?.searchIntent?.confidence,
      topicCoverageScore: topicData?.coveragePercentage || ci?.topicalCoverageScore,
      primaryTopics: topicData?.primaryTopicsDetected || (ci?.primaryTopics || []).map((t: any) => t.topic || t),
      secondaryTopics: topicData?.secondaryTopicsDetected || (ci?.secondaryTopics || []).map((t: any) => t.topic || t),
      topicGaps,
      repetitionRatio: ci?.repetition?.repetitionRatio,
      eEaTSignals: {
        hasAuthor: !!ci?.contentDepth?.hasAuthorByline,
        hasContactInfo: !!ci?.contentDepth?.hasContactInfo,
        hasTransparencySignals: !!ci?.contentDepth?.hasEditorialTransparency,
        firstHandExperienceIndicators: ci?.contentDepth?.firstHandExperienceSignals || [],
      },
      readabilityScore: pageReport?.scores?.content,
    };
  }

  private static extractLinkEvidence(
    pageReport?: Partial<SEOReport> | any,
    siteCrawl?: any,
    targetUrl?: string
  ): InternalLinkEvidence {
    const links = pageReport?.links;
    const inlinkCount = links?.internalLinksCount || (Array.isArray(links?.items) ? links.items.length : 0);
    const outlinkCount = links?.externalLinksCount || 0;

    let isOrphan = false;
    if (siteCrawl && targetUrl && siteCrawl.orphanPages) {
      isOrphan = siteCrawl.orphanPages.some((op: any) => op.url === targetUrl || op === targetUrl);
    }

    return {
      inlinkCount,
      outlinkCount,
      externalLinkCount: outlinkCount,
      isOrphanCandidate: isOrphan,
      orphanCategory: undefined,
      brokenLinksCount: links?.brokenLinksCount || 0,
      contextualInlinksNeeded: inlinkCount === 0 || isOrphan,
      internalLinkCentralityScore: undefined,
    };
  }

  private static extractKeywordEvidence(pageReport?: Partial<SEOReport> | any): KeywordEvidence {
    const targetKeywords = pageReport?.targetKeywords || [];
    const target = targetKeywords[0];

    const allKeywords = Array.isArray(pageReport?.keywords?.all)
      ? pageReport.keywords.all
      : Array.isArray(pageReport?.keywords)
      ? pageReport.keywords
      : [];

    const topKeywords = allKeywords.slice(0, 5);
    const primaryKw = topKeywords[0]?.keyword || pageReport?.topicCoverageData?.primaryTopicsDetected?.[0];

    const matchedKw = allKeywords.find(
      (k: any) => k.keyword && (k.keyword.toLowerCase() === (target || '').toLowerCase())
    );

    return {
      targetKeyword: target,
      userSpecifiedKeywords: targetKeywords,
      extractedPrimaryKeyword: primaryKw,
      keywordDensity: matchedKw?.density || topKeywords[0]?.density || 0,
      inTitle: matchedKw?.inTitle ?? false,
      inH1: matchedKw?.inH1 ?? false,
      inMeta: matchedKw?.inMeta ?? false,
      relevanceScore: matchedKw?.prominenceScore || topKeywords[0]?.prominenceScore || 0,
    };
  }

  private static extractEcommerceEvidence(pageReport?: Partial<SEOReport> | any): EcommerceEvidence {
    const pageType = pageReport?.contentIntelligence?.pageType?.primaryType;
    const isEcom = pageType === 'PRODUCT' || pageType === 'CATEGORY' || pageType === 'ECOMMERCE';

    const schemas = pageReport?.schemas || [];
    const productSchema = Array.isArray(schemas)
      ? schemas.find((s: any) => (s.type || s['@type']) === 'Product')
      : undefined;

    return {
      isEcommercePage: isEcom || !!productSchema,
      hasProductSchema: !!productSchema,
      price: productSchema?.offers?.price || productSchema?.price,
      currency: productSchema?.offers?.priceCurrency || productSchema?.priceCurrency,
      availability: productSchema?.offers?.availability,
      sku: productSchema?.sku,
      brand: productSchema?.brand?.name || productSchema?.brand,
      hasReviewSchema: !!(productSchema?.aggregateRating || productSchema?.review),
      ratingValue: productSchema?.aggregateRating?.ratingValue,
      reviewCount: productSchema?.aggregateRating?.reviewCount,
      imageAltMissingCount: pageReport?.images?.missingAlt || 0,
      hasBreadcrumbs: Array.isArray(schemas)
        ? schemas.some((s: any) => (s.type || s['@type']) === 'BreadcrumbList')
        : false,
      isCategoryPage: pageType === 'CATEGORY',
    };
  }

  private static extractSerpEvidence(
    searchReport?: Partial<SearchIntelligenceAuditReport> | any,
    _targetUrl?: string
  ): SerpEvidence {
    if (!searchReport || !searchReport.queries?.length) {
      return {};
    }

    const firstQuery = searchReport.queries[0]?.query || '';
    const intentAlignment = searchReport.intentAlignments?.[firstQuery];
    const missingTopics = (searchReport.topicPatterns?.[firstQuery] || [])
      .filter((tp: any) => !tp.isCoveredInUserPage)
      .map((tp: any) => tp.topic);

    const competitorDomains = (searchReport.observedDomains || [])
      .slice(0, 5)
      .map((d: any) => d.domain);

    const firstSnapshot = searchReport.snapshots?.[0];
    const featuresPresent = firstSnapshot?.featureTypes || [];

    return {
      targetQuery: firstQuery,
      dominantSerpIntent: intentAlignment?.observedSerpIntentPattern,
      isMixedSerp: intentAlignment?.isMixedSerp ?? false,
      intentAlignmentStatus: intentAlignment?.level,
      dominantPageType: searchReport.pageTypeAlignments?.[firstQuery]?.dominantType,
      missingCompetitorTopics: missingTopics,
      serpFeaturesObserved: featuresPresent,
      competitorDomains,
    };
  }

  private static extractCompetitorEvidence(
    searchReport?: Partial<SearchIntelligenceAuditReport> | any
  ): CompetitorGapEvidence {
    if (!searchReport) return {};

    const topCompetitorUrls: string[] = [];
    (searchReport.snapshots || []).forEach((snap: any) => {
      (snap.results || []).slice(0, 3).forEach((res: any) => {
        if (res.url) topCompetitorUrls.push(res.url);
      });
    });

    const gaps: string[] = [];
    (searchReport.opportunities || []).forEach((opp: any) => {
      if (opp.contentGaps?.length) {
        gaps.push(...opp.contentGaps);
      }
    });

    return {
      topCompetitorUrls: Array.from(new Set(topCompetitorUrls)),
      contentGapsVsTopRanked: Array.from(new Set(gaps)),
    };
  }
}
