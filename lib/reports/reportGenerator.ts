import { safeFetch } from '../crawler/safeFetcher';
import { parseHtmlContent } from '../parser/htmlParser';
import { extractPageMetadata } from '../seo/metadataExtractor';
import { analyzeLinks } from '../links/linkAnalyzer';
import { analyzeImages } from '../images/imageAnalyzer';
import { extractStructuredData } from '../schema/schemaExtractor';
import { parseRobotsTxt } from '../robots/robotsParser';
import { parseSitemapXml } from '../sitemap/sitemapParser';
import { extractAndScoreKeywords } from '../keywords/keywordExtractor';
import { performTechnicalSeoAudit } from '../technical/technicalAuditor';
import { calculateSeoScores } from './seoScorer';
import { extractTagExplorerData } from '../parser/tagExplorer';
import { calculateContentContribution } from '../seo/contentContribution';
import { renderPageWithBrowser } from '../browser/browserRenderer';
import { buildPageSnapshot, calculateHydrationDelta } from '../browser/hydrationDelta';
import { classifyHttpStatus, auditRedirects, determineCrawlabilityStatus } from '../technical/crawlabilityAuditor';
import { auditIndexabilityAndRobots } from '../technical/indexabilityAuditor';
import { auditCanonicalization } from '../technical/canonicalAuditor';
import { auditHreflang } from '../technical/hreflangAuditor';
import { auditUrlStructure } from '../technical/urlQualityAuditor';
import { auditInfrastructure } from '../technical/infrastructureAuditor';
import {
  SEOReport,
  TechnicalSEO,
  OnPageData,
  TopicCoverageData,
  RenderMode,
  AnalysisMode,
  PageSnapshot,
  HydrationDelta,
  BrowserPerformanceMetrics,
  BrowserRenderStatus,
  SEOIssue,
  SitemapAssessment,
  InternalLinksAssessment,
  ImagesTechnicalAssessment,
  StructuredDataAssessment,
  SocialMetadataAssessment,
  MobileAssessment,
} from '@/types';
import { EXTERNAL_SEO_DISCLAIMER, DATA_SOURCE_DISCLOSURES } from '@/lib/constants';
import crypto from 'node:crypto';

export interface AnalysisOptions {
  checkRobots?: boolean;
  checkSitemap?: boolean;
  targetKeywords?: string[] | string;
  renderMode?: RenderMode;
}

export async function generateSeoReport(
  targetUrl: string,
  options: AnalysisOptions = {}
): Promise<SEOReport> {
  const startTime = Date.now();
  const checkRobots = options.checkRobots ?? true;
  const checkSitemap = options.checkSitemap ?? true;
  const renderMode: RenderMode = options.renderMode ?? 'auto';

  // Process optional user target keywords
  const targetKeywordsList = Array.isArray(options.targetKeywords)
    ? options.targetKeywords.map((k) => k.trim()).filter(Boolean)
    : typeof options.targetKeywords === 'string'
    ? options.targetKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  // 1. Fetch Target Webpage safely (Static HTTP Fetch)
  const fetchResult = await safeFetch(targetUrl);

  // 2. Parse Static HTML & structural elements
  const staticContent = parseHtmlContent(fetchResult.body);
  const staticMetadata = extractPageMetadata(staticContent.$, fetchResult.finalUrl);
  const staticLinks = analyzeLinks(staticContent.$, fetchResult.finalUrl);
  const staticImages = analyzeImages(staticContent.$, fetchResult.finalUrl);
  const staticSchemas = extractStructuredData(staticContent.$);

  // 3. Construct Static PageSnapshot
  const staticSnapshot: PageSnapshot = buildPageSnapshot('static', {
    url: fetchResult.finalUrl,
    $: staticContent.$,
    wordCount: staticContent.wordCount,
    headings: staticContent.headings.items,
    title: staticMetadata.title,
    metaDescription: staticMetadata.metaDescription,
    canonicalUrl: staticMetadata.canonicalUrl,
    robotsMeta: staticMetadata.robotsMeta,
    internalLinksCount: staticLinks.internalLinksCount,
    externalLinksCount: staticLinks.externalLinksCount,
    totalLinksCount: staticLinks.totalLinks,
    imagesCount: staticImages.totalImages,
    missingAltCount: staticImages.missingAlt,
    schemasCount: staticSchemas.length,
    schemaTypes: staticSchemas.map((s) => s.type),
  });

  // 4. Optionally Render via Playwright Browser if requested (auto or browser mode)
  let renderedSnapshot: PageSnapshot | undefined;
  let hydrationDelta: HydrationDelta | undefined;
  let browserPerformance: BrowserPerformanceMetrics | undefined;
  let browserRenderStatus: BrowserRenderStatus = {
    attempted: false,
    successful: false,
    renderModeRequested: renderMode,
  };
  let analysisMode: AnalysisMode = 'STATIC_ONLY';

  // Active working representations (initialized with static)
  let workingContent = staticContent;
  let workingMetadata = staticMetadata;
  let workingLinks = staticLinks;
  let workingImages = staticImages;
  let workingSchemas = staticSchemas;
  let workingBody = fetchResult.body;

  // Check if browser rendering should be executed
  const isMockOrLocalDomain =
    targetUrl.endsWith('.local') ||
    targetUrl.endsWith('.test') ||
    targetUrl.includes('mock') ||
    targetUrl.includes('localhost');

  const isSpaDetected =
    staticContent.wordCount < 150 ||
    staticContent.headings.h1Count === 0 ||
    fetchResult.body.includes('id="root"') ||
    fetchResult.body.includes('id="__next"') ||
    fetchResult.body.includes('id="app"');

  const shouldRenderWithBrowser =
    !isMockOrLocalDomain && (renderMode === 'browser' || (renderMode === 'auto' && isSpaDetected));

  if (shouldRenderWithBrowser) {
    browserRenderStatus.attempted = true;
    try {
      const renderResult = await renderPageWithBrowser(targetUrl, { timeoutMs: 8000 });
      browserRenderStatus.durationMs = renderResult.renderDurationMs;

      if (renderResult.success && renderResult.html) {
        browserRenderStatus.successful = true;
        analysisMode = 'STATIC_AND_RENDERED';
        browserPerformance = renderResult.performance;

        // Parse rendered DOM
        const renderedParsed = parseHtmlContent(renderResult.html);
        const renderedMeta = extractPageMetadata(
          renderedParsed.$,
          renderResult.finalUrl || fetchResult.finalUrl
        );
        const renderedLinksList = analyzeLinks(
          renderedParsed.$,
          renderResult.finalUrl || fetchResult.finalUrl
        );
        const renderedImagesList = analyzeImages(
          renderedParsed.$,
          renderResult.finalUrl || fetchResult.finalUrl
        );
        const renderedSchemasList = extractStructuredData(renderedParsed.$);

        renderedSnapshot = buildPageSnapshot('rendered', {
          url: renderResult.finalUrl || fetchResult.finalUrl,
          $: renderedParsed.$,
          wordCount: renderedParsed.wordCount,
          headings: renderedParsed.headings.items,
          title: renderedMeta.title,
          metaDescription: renderedMeta.metaDescription,
          canonicalUrl: renderedMeta.canonicalUrl,
          robotsMeta: renderedMeta.robotsMeta,
          internalLinksCount: renderedLinksList.internalLinksCount,
          externalLinksCount: renderedLinksList.externalLinksCount,
          totalLinksCount: renderedLinksList.totalLinks,
          imagesCount: renderedImagesList.totalImages,
          missingAltCount: renderedImagesList.missingAlt,
          schemasCount: renderedSchemasList.length,
          schemaTypes: renderedSchemasList.map((s) => s.type),
        });

        // Compute Hydration Delta
        hydrationDelta = calculateHydrationDelta(staticSnapshot, renderedSnapshot);

        // If rendered content has more substance or introduces H1, adopt rendered representation for content evaluation
        if (
          renderedParsed.wordCount >= staticContent.wordCount ||
          (staticContent.headings.h1Count === 0 && renderedParsed.headings.h1Count > 0)
        ) {
          workingContent = renderedParsed;
          workingMetadata = renderedMeta;
          workingLinks = renderedLinksList;
          workingImages = renderedImagesList;
          workingSchemas = renderedSchemasList;
          workingBody = renderResult.html;
        }
      } else {
        browserRenderStatus.fallbackReason = renderResult.error;
      }
    } catch (err: any) {
      browserRenderStatus.fallbackReason = err?.message || String(err);
    }
  }

  // 5. Assemble OnPageData
  const onPage: OnPageData = {
    title: workingMetadata.title,
    titleLength: workingMetadata.titleLength,
    metaDescription: workingMetadata.metaDescription,
    metaDescriptionLength: workingMetadata.metaDescriptionLength,
    canonicalUrl: workingMetadata.canonicalUrl,
    isCanonicalMatch: workingMetadata.isCanonicalMatch,
    robotsMeta: workingMetadata.robotsMeta,
    viewport: workingMetadata.viewport,
    language: workingMetadata.language,
    hreflang: workingMetadata.hreflang,
    ogTags: workingMetadata.ogTags,
    twitterTags: workingMetadata.twitterTags,
    wordCount: workingContent.wordCount,
    readingTimeMinutes: workingContent.readingTimeMinutes,
    textToHtmlRatio: workingContent.textToHtmlRatio,
    headings: workingContent.headings,
    paragraphsCount: workingContent.paragraphsCount,
    listsCount: workingContent.listsCount,
    tablesCount: workingContent.tablesCount,
  };

  // 6. Check Robots.txt & Sitemap in parallel
  const [robotsAnalysis, sitemapAnalysis] = await Promise.all([
    checkRobots
      ? parseRobotsTxt(fetchResult.finalUrl)
      : Promise.resolve({
          exists: false,
          url: '',
          status: 0,
          sitemaps: [],
          isBotAllowed: true,
          directivesCount: 0,
        }),
    checkSitemap
      ? parseSitemapXml(fetchResult.finalUrl)
      : Promise.resolve({
          exists: false,
          url: '',
          status: 0,
          totalUrls: 0,
          urlsSample: [],
          isIndex: false,
        }),
  ]);

  // 7. Perform Advanced Technical Sub-Audits
  const httpStatusClassification = classifyHttpStatus(fetchResult.statusCode);
  const redirectAssessment = auditRedirects({
    targetUrl,
    finalUrl: fetchResult.finalUrl,
    redirectCount: fetchResult.redirectCount,
    redirectChain: fetchResult.redirectChain,
  });
  const crawlabilityStatus = determineCrawlabilityStatus(
    httpStatusClassification,
    redirectAssessment,
    robotsAnalysis
  );
  const { robotsAssessment, indexabilityStatus } = auditIndexabilityAndRobots({
    $: workingContent.$,
    headers: fetchResult.headers || {},
    httpStatus: httpStatusClassification,
    robotsTxt: robotsAnalysis,
    canonicalUrl: workingMetadata.canonicalUrl,
    pageUrl: fetchResult.finalUrl,
  });
  const canonicalAssessment = auditCanonicalization({
    rawCanonical: workingMetadata.canonicalUrl,
    finalUrl: fetchResult.finalUrl,
    hasNoindex: robotsAssessment.hasNoindex,
  });
  const hreflangAssessment = auditHreflang({
    $: workingContent.$,
    finalUrl: fetchResult.finalUrl,
  });
  const urlStructureAssessment = auditUrlStructure(targetUrl);
  const infrastructureAssessment = auditInfrastructure({
    $: workingContent.$,
    finalUrl: fetchResult.finalUrl,
    headers: fetchResult.headers || {},
    contentTypeHeader: fetchResult.contentType || 'text/html',
  });

  // Sitemap Assessment
  let membershipStatus: 'IN_SITEMAP' | 'NOT_IN_SITEMAP' | 'SITEMAP_NOT_MEASURED' | 'SITEMAP_UNAVAILABLE' = 'SITEMAP_UNAVAILABLE';
  let isCanonicalConsistent = true;
  let sitemapCanonicalMismatch: { pageCanonical: string; sitemapEntry: string } | undefined;
  let sitemapSummary = 'No XML sitemap discovered or available.';

  if (sitemapAnalysis.exists) {
    const normFinal = fetchResult.finalUrl.toLowerCase().replace(/\/$/, '');
    const inSample = sitemapAnalysis.urlsSample.some(
      (u) => u.toLowerCase().replace(/\/$/, '') === normFinal
    );

    if (inSample) {
      membershipStatus = 'IN_SITEMAP';
      sitemapSummary = `Analyzed URL is listed in the XML sitemap (${sitemapAnalysis.url}).`;
    } else if (sitemapAnalysis.totalUrls > 0 && sitemapAnalysis.urlsSample.length >= sitemapAnalysis.totalUrls) {
      membershipStatus = 'NOT_IN_SITEMAP';
      sitemapSummary = `Analyzed URL is not listed among the ${sitemapAnalysis.totalUrls} URLs in ${sitemapAnalysis.url}.`;
    } else if (sitemapAnalysis.totalUrls > 0) {
      membershipStatus = 'SITEMAP_NOT_MEASURED';
      sitemapSummary = `Sitemap contains ${sitemapAnalysis.totalUrls} URLs (sample of ${sitemapAnalysis.urlsSample.length} checked).`;
    } else {
      membershipStatus = 'NOT_IN_SITEMAP';
      sitemapSummary = `Sitemap was located at ${sitemapAnalysis.url} but contained 0 valid URLs.`;
    }

    if (workingMetadata.canonicalUrl) {
      const normCanonical = workingMetadata.canonicalUrl.toLowerCase().replace(/\/$/, '');
      if (inSample && normCanonical !== normFinal) {
        isCanonicalConsistent = false;
        sitemapCanonicalMismatch = {
          pageCanonical: workingMetadata.canonicalUrl,
          sitemapEntry: fetchResult.finalUrl,
        };
        sitemapSummary += ` Warning: Sitemap lists non-canonical URL while page canonical points to "${workingMetadata.canonicalUrl}".`;
      }
    }
  }

  const sitemapAssessment: SitemapAssessment = {
    exists: sitemapAnalysis.exists,
    sitemapUrl: sitemapAnalysis.url,
    totalUrls: sitemapAnalysis.totalUrls,
    isIndex: sitemapAnalysis.isIndex,
    membershipStatus,
    isCanonicalConsistent,
    sitemapCanonicalMismatch,
    summary: sitemapSummary,
  };

  // Internal Links Assessment
  const internalLinks = workingLinks.internalLinks || [];
  const uniqueInternalSet = new Set(internalLinks.map((l) => l.url.toLowerCase().replace(/\/$/, '')));
  const emptyAnchors = internalLinks.filter((l) => !l.text || l.text.trim().length === 0);
  const genericKeywords = new Set(['click here', 'read more', 'learn more', 'here', 'more', 'link']);
  const genericAnchors = internalLinks.filter((l) => genericKeywords.has(l.text.trim().toLowerCase()));
  const nofollowInternals = internalLinks.filter((l) => l.isNofollow);
  const brokenInternals = workingLinks.brokenLinks.filter((l) => l.isInternal);

  const internalLinksAssessment: InternalLinksAssessment = {
    totalInternalLinks: workingLinks.internalLinksCount,
    uniqueInternalLinks: uniqueInternalSet.size,
    descriptiveAnchorCount: Math.max(0, workingLinks.internalLinksCount - emptyAnchors.length - genericAnchors.length),
    genericAnchorCount: genericAnchors.length,
    emptyAnchorCount: emptyAnchors.length,
    imageOnlyLinksMissingAltCount: 0,
    nofollowInternalCount: nofollowInternals.length,
    brokenInternalLinksCount: brokenInternals.length,
    redirectingInternalLinksCount: 0,
    linkValidationStatus: 'PARTIAL',
    summary: `Analyzed ${workingLinks.internalLinksCount} internal links across ${uniqueInternalSet.size} unique destinations.`,
  };

  // Images Technical Assessment
  const imagesAssessment: ImagesTechnicalAssessment = {
    totalImages: workingImages.totalImages,
    withAlt: workingImages.withAlt,
    missingAlt: workingImages.missingAlt,
    altCoverageRatio: workingImages.altCoverageRatio,
    imagesMissingDimensionsCount: workingImages.images.filter((img) => !img.width || !img.height).length,
    responsiveImagesCount: 0,
    lazyLoadedImagesCount: workingImages.images.filter((img) => img.loading === 'lazy').length,
    summary: `${workingImages.withAlt} of ${workingImages.totalImages} images have alt text (${workingImages.altCoverageRatio}% coverage).`,
  };

  // Structured Data Assessment
  const schemaTypes = workingSchemas.map((s) => s.type);
  const syntaxErrors = workingSchemas.filter((s) => !s.isValid).map((s) => s.type);
  const structuredDataAssessment: StructuredDataAssessment = {
    totalSchemas: workingSchemas.length,
    schemaTypes,
    hasValidSyntax: syntaxErrors.length === 0,
    syntaxErrors,
    missingContextCount: 0,
    missingTypeCount: 0,
    hasContentMismatch: false,
    summary: workingSchemas.length > 0
      ? `Detected ${workingSchemas.length} structured data schema(s): ${schemaTypes.join(', ')}.`
      : 'No structured data schemas detected.',
  };

  // Social Metadata Assessment
  const og = workingMetadata.ogTags || {};
  const tw = workingMetadata.twitterTags || {};
  const socialMetadataAssessment: SocialMetadataAssessment = {
    hasOpenGraph: Object.keys(og).length > 0,
    ogTitle: og['og:title'],
    ogDescription: og['og:description'],
    ogImage: og['og:image'],
    ogType: og['og:type'],
    hasTwitterCard: Object.keys(tw).length > 0,
    twitterCard: tw['twitter:card'],
    twitterTitle: tw['twitter:title'],
    twitterDescription: tw['twitter:description'],
    twitterImage: tw['twitter:image'],
    summary: Object.keys(og).length > 0 || Object.keys(tw).length > 0
      ? 'Social metadata configured for OpenGraph and Twitter cards.'
      : 'No social metadata tags detected.',
  };

  // Mobile Assessment
  const mobileAssessment: MobileAssessment = {
    hasViewportMeta: Boolean(workingMetadata.viewport),
    viewportContent: workingMetadata.viewport,
    isStandardViewport: Boolean(workingMetadata.viewport && workingMetadata.viewport.includes('width=device-width')),
    summary: workingMetadata.viewport
      ? 'Mobile viewport configured properly.'
      : 'Missing mobile viewport tag.',
  };

  const isCurrentlyIndexable =
    !robotsAssessment.hasNoindex &&
    robotsAnalysis.isBotAllowed &&
    fetchResult.statusCode < 400 &&
    indexabilityStatus !== 'NOT_INDEXABLE';

  const technical: TechnicalSEO = {
    httpStatus: fetchResult.statusCode,
    isHttps: fetchResult.finalUrl.startsWith('https://'),
    isIndexable: isCurrentlyIndexable,
    responseTimeMs: fetchResult.responseTimeMs,
    pageSizeBytes: fetchResult.pageSizeBytes,
    redirectCount: fetchResult.redirectCount,
    redirectChain: fetchResult.redirectChain,
    mobileViewportConfigured: Boolean(workingMetadata.viewport),
    contentType: fetchResult.contentType,
    charset: workingMetadata.charset,
    robotsAnalysis,
    sitemapAnalysis,
    // Phase 5 Intelligence Attachments
    crawlabilityStatus,
    indexabilityStatus,
    canonicalStatus: canonicalAssessment.status,
    httpStatusClassification,
    redirectAssessment,
    robotsAssessment,
    sitemapAssessment,
    canonicalAssessment,
    hreflangAssessment,
    urlStructureAssessment,
    internalLinksAssessment,
    imagesAssessment,
    structuredDataAssessment,
    socialMetadataAssessment,
    mobileAssessment,
    infrastructureAssessment,
  };

  // 8. Extract and score keywords, clusters, questions, and opportunities
  const keywords = extractAndScoreKeywords(
    workingContent.visibleText,
    onPage,
    workingLinks,
    workingImages,
    fetchResult.finalUrl,
    workingBody
  );

  // 9. Extract Tag Explorer Element Data
  const tagExplorer = extractTagExplorerData(workingContent.$, fetchResult.finalUrl);

  // 10. Calculate Content Contribution Analysis and Signal Heatmap
  const contentContribution = calculateContentContribution({
    onPage,
    links: workingLinks,
    images: workingImages,
    schemas: workingSchemas,
    keywords: keywords.all,
    entities: keywords.entities,
    pageUrl: fetchResult.finalUrl,
    targetKeywords: targetKeywordsList,
  });

  const primaryTopicsList = keywords.primary.map((p) => p.keyword);
  const secondaryTopicsList = keywords.secondary.map((s) => s.keyword);

  // 11. Perform Technical SEO Auditing
  const issues = performTechnicalSeoAudit({
    targetUrl,
    finalUrl: fetchResult.finalUrl,
    statusCode: fetchResult.statusCode,
    responseTimeMs: fetchResult.responseTimeMs,
    pageSizeBytes: fetchResult.pageSizeBytes,
    onPage,
    technical,
    links: workingLinks,
    images: workingImages,
    schemas: workingSchemas,
    keywords: keywords.all,
    targetKeywords: targetKeywordsList,
    primaryTopics: primaryTopicsList,
  });

  // 12. Convert critical/warning hydration discrepancies into structured SEO issues
  if (hydrationDelta && hydrationDelta.discrepancies.length > 0) {
    for (const disc of hydrationDelta.discrepancies) {
      if (disc.severity === 'CRITICAL' || disc.severity === 'WARNING') {
        const issueId = `hydration-${disc.type.toLowerCase().replace(/_/g, '-')}`;
        issues.push({
          id: issueId,
          code: disc.type,
          category: disc.type.includes('INDEXABILITY') ? 'indexability' : 'technical',
          severity: disc.severity,
          title: disc.title,
          description: disc.message,
          whyItMatters:
            'Differences between initial static HTML and rendered DOM can cause search engine crawlers that do not execute JavaScript (or execute it in a deferred queue) to index inaccurate or incomplete page data.',
          recommendation:
            'Ensure critical metadata, indexability directives, and primary content are present in the initial server response.',
          evidence: {
            staticValue: disc.staticValue,
            renderedValue: disc.renderedValue,
          },
          action: 'Align server-rendered HTML with client-rendered DOM.',
          whatToChange:
            disc.type === 'INDEXABILITY_MISMATCH'
              ? 'Synchronize robots meta directives between server and client.'
              : 'Include primary content and headings in server-side rendered HTML.',
          expectedBenefit: 'Guarantees reliable indexing across all search bots.',
          caution:
            'Dynamic client-side rendering is supported by major search engines, but server-rendered content ensures faster and more dependable indexing.',
          isMeasuredProblem: true,
        });
      }
    }
  }

  // 13. Calculate final SEO health scores
  const scores = calculateSeoScores({
    onPage,
    technical,
    links: workingLinks,
    images: workingImages,
    issues,
  });

  // 14. Construct TopicCoverageData
  const isTargetMode = targetKeywordsList.length > 0;
  let matchedTargetKeywords = 0;
  if (isTargetMode) {
    const visibleTextLower = workingContent.visibleText.toLowerCase();
    const titleLower = (onPage.title || '').toLowerCase();
    const h1TextLower = onPage.headings.items
      .filter((h) => h.level === 1)
      .map((h) => h.text)
      .join(' ')
      .toLowerCase();
    for (const tk of targetKeywordsList) {
      const tkLower = tk.toLowerCase();
      if (
        visibleTextLower.includes(tkLower) ||
        titleLower.includes(tkLower) ||
        h1TextLower.includes(tkLower)
      ) {
        matchedTargetKeywords++;
      }
    }
  }

  const topicCoverageData: TopicCoverageData = {
    mode: isTargetMode ? 'TARGET_KEYWORD_ANALYSIS' : 'AUTOMATIC_TOPIC_ANALYSIS',
    targetKeywords: targetKeywordsList,
    primaryTopicsDetected: primaryTopicsList,
    secondaryTopicsDetected: secondaryTopicsList,
    coveragePercentage: isTargetMode
      ? targetKeywordsList.length > 0
        ? Math.round((matchedTargetKeywords / targetKeywordsList.length) * 100)
        : 0
      : contentContribution.topicCoverageScore,
    coverageLabel: isTargetMode ? 'Target Keyword Coverage' : 'Topic Coverage',
    explanation: isTargetMode
      ? `Target Keyword Coverage measures the percentage of supplied target keywords (${matchedTargetKeywords}/${targetKeywordsList.length}) found across page title, headings, and body content.`
      : `Topic Coverage measures how consistently the ${primaryTopicsList.length} primary extracted topics are distributed across page title, headings, body text, and structural metadata.`,
  };

  const durationMs = Date.now() - startTime;

  return {
    id: crypto.randomUUID(),
    url: targetUrl,
    normalizedUrl: fetchResult.finalUrl,
    timestamp: new Date().toISOString(),
    durationMs,
    analysisMode,
    renderModeRequested: renderMode,
    staticSnapshot,
    renderedSnapshot,
    hydrationDelta,
    browserPerformance,
    browserRenderStatus,
    targetKeywords: targetKeywordsList,
    topicCoverageData,
    scores,
    onPage,
    technical,
    links: workingLinks,
    images: workingImages,
    schemas: workingSchemas,
    keywords,
    tagExplorer,
    contentContribution,
    issues,
    externalSeoDisclaimer: EXTERNAL_SEO_DISCLAIMER,
    dataSourceDisclosures: DATA_SOURCE_DISCLOSURES,
  };
}

