import { safeFetch } from '../crawler/safeFetcher.js';
import { parseHtmlContent } from '../parser/htmlParser.js';
import { extractPageMetadata } from '../seo/metadataExtractor.js';
import { analyzeLinks } from '../links/linkAnalyzer.js';
import { analyzeImages } from '../images/imageAnalyzer.js';
import { extractStructuredData } from '../schema/schemaExtractor.js';
import { parseRobotsTxt } from '../robots/robotsParser.js';
import { parseSitemapXml } from '../sitemap/sitemapParser.js';
import { extractAndScoreKeywords } from '../keywords/keywordExtractor.js';
import { performTechnicalSeoAudit } from '../technical/technicalAuditor.js';
import { calculateSeoScores } from './seoScorer.js';
import { extractTagExplorerData } from '../parser/tagExplorer.js';
import { calculateContentContribution } from '../seo/contentContribution.js';
import {
  SEOReport,
  TechnicalSEO,
  OnPageData,
  EXTERNAL_SEO_DISCLAIMER,
  DATA_SOURCE_DISCLOSURES,
} from '@seo-analyzer/shared';
import crypto from 'node:crypto';

export interface AnalysisOptions {
  checkRobots?: boolean;
  checkSitemap?: boolean;
}

export async function generateSeoReport(
  targetUrl: string,
  options: AnalysisOptions = {}
): Promise<SEOReport> {
  const startTime = Date.now();
  const checkRobots = options.checkRobots ?? true;
  const checkSitemap = options.checkSitemap ?? true;

  // 1. Fetch Target Webpage safely
  const fetchResult = await safeFetch(targetUrl);

  // 2. Parse HTML & structural elements
  const parsedContent = parseHtmlContent(fetchResult.body);

  // 3. Extract On-Page SEO Metadata
  const metadata = extractPageMetadata(parsedContent.$, fetchResult.finalUrl);

  // 4. Assemble OnPageData
  const onPage: OnPageData = {
    title: metadata.title,
    titleLength: metadata.titleLength,
    metaDescription: metadata.metaDescription,
    metaDescriptionLength: metadata.metaDescriptionLength,
    canonicalUrl: metadata.canonicalUrl,
    isCanonicalMatch: metadata.isCanonicalMatch,
    robotsMeta: metadata.robotsMeta,
    viewport: metadata.viewport,
    language: metadata.language,
    hreflang: metadata.hreflang,
    ogTags: metadata.ogTags,
    twitterTags: metadata.twitterTags,
    wordCount: parsedContent.wordCount,
    readingTimeMinutes: parsedContent.readingTimeMinutes,
    textToHtmlRatio: parsedContent.textToHtmlRatio,
    headings: parsedContent.headings,
    paragraphsCount: parsedContent.paragraphsCount,
    listsCount: parsedContent.listsCount,
    tablesCount: parsedContent.tablesCount,
  };

  // 5. Analyze Links and Images
  const links = analyzeLinks(parsedContent.$, fetchResult.finalUrl);
  const images = analyzeImages(parsedContent.$, fetchResult.finalUrl);

  // 6. Extract Structured Data Schemas
  const schemas = extractStructuredData(parsedContent.$);

  // 7. Check Robots.txt & Sitemap in parallel
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

  // 8. Assemble TechnicalSEO object
  const technical: TechnicalSEO = {
    httpStatus: fetchResult.statusCode,
    isHttps: fetchResult.finalUrl.startsWith('https://'),
    isIndexable: !metadata.robotsMeta.includes('noindex') && robotsAnalysis.isBotAllowed,
    responseTimeMs: fetchResult.responseTimeMs,
    pageSizeBytes: fetchResult.pageSizeBytes,
    redirectCount: fetchResult.redirectCount,
    redirectChain: fetchResult.redirectChain,
    mobileViewportConfigured: Boolean(metadata.viewport),
    contentType: fetchResult.contentType,
    charset: metadata.charset,
    robotsAnalysis,
    sitemapAnalysis,
  };

  // 9. Extract and score keywords, clusters, questions, and opportunities
  const keywords = extractAndScoreKeywords(
    parsedContent.visibleText,
    onPage,
    links,
    images,
    fetchResult.finalUrl
  );

  // 10. Extract Tag Explorer Element Data
  const tagExplorer = extractTagExplorerData(parsedContent.$, fetchResult.finalUrl);

  // 11. Calculate Content Contribution Analysis and Signal Heatmap
  const contentContribution = calculateContentContribution({
    onPage,
    links,
    images,
    schemas,
    keywords: keywords.all,
    entities: keywords.entities,
    pageUrl: fetchResult.finalUrl,
  });

  // 12. Perform Technical SEO Auditing
  const issues = performTechnicalSeoAudit({
    targetUrl,
    finalUrl: fetchResult.finalUrl,
    statusCode: fetchResult.statusCode,
    responseTimeMs: fetchResult.responseTimeMs,
    pageSizeBytes: fetchResult.pageSizeBytes,
    onPage,
    technical,
    links,
    images,
    schemas,
    keywords: keywords.all,
  });

  // 13. Calculate final SEO health scores
  const scores = calculateSeoScores({
    onPage,
    technical,
    links,
    images,
    issues,
  });

  const durationMs = Date.now() - startTime;

  return {
    id: crypto.randomUUID(),
    url: targetUrl,
    normalizedUrl: fetchResult.finalUrl,
    timestamp: new Date().toISOString(),
    durationMs,
    scores,
    onPage,
    technical,
    links,
    images,
    schemas,
    keywords,
    tagExplorer,
    contentContribution,
    issues,
    externalSeoDisclaimer: EXTERNAL_SEO_DISCLAIMER,
    dataSourceDisclosures: DATA_SOURCE_DISCLOSURES,
  };
}
