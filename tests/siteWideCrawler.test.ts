import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrlDeterministically,
  classifyQueryParameter,
  detectCrawlTrap,
} from '../lib/crawler/urlNormalizer';
import { CrawlFrontier } from '../lib/crawler/crawlFrontier';
import { buildInternalLinkGraph } from '../lib/crawler/linkGraph';
import { detectOrphanCandidates } from '../lib/crawler/orphanDetector';
import {
  detectDuplicateTitles,
  detectDuplicateMetaDescriptions,
  detectContentSimilarityPairs,
} from '../lib/crawler/duplicateDetector';
import {
  auditCanonicalConsistency,
  auditIndexabilityConsistency,
  compileSitemapConsistency,
  buildRedirectGraph,
  auditHreflangCrossPage,
  analyzeStructuredDataCrossPage,
} from '../lib/crawler/consistencyAuditor';
import {
  clusterPagesByTopic,
  detectSearchIntentOverlaps,
  identifyInternalLinkOpportunities,
} from '../lib/crawler/topicClusterer';
import { calculateSiteHealthScore } from '../lib/crawler/siteScorer';
import {
  SEOReport,
  CrawlPageRecord,
  PageType,
  ContentSearchIntent,
  SchemaItem,
  KeywordItem,
} from '../types';

// Helper to build realistic mock reports for crawler unit and cross-page tests
function createMockPage(params: {
  url: string;
  title: string;
  metaDescription?: string;
  wordCount?: number;
  score?: number;
  httpStatus?: number;
  isIndexable?: boolean;
  canonicalUrl?: string;
  primaryTopic?: string;
  secondaryTopics?: string[];
  pageType?: PageType;
  intent?: ContentSearchIntent;
  internalLinks?: Array<{ url: string; text?: string }>;
  schemas?: Array<SchemaItem>;
  hreflang?: Array<{ lang: string; href: string }>;
  redirectChain?: string[];
}): SEOReport {
  const url = params.url;
  const wordCount = params.wordCount ?? 400;
  const score = params.score ?? 85;
  const title = params.title;
  const metaDescription = params.metaDescription ?? `Detailed guide about ${title}`;
  const canonicalUrl = params.canonicalUrl ?? url;
  const isCanonicalMatch = canonicalUrl === url;
  const isIndexable = params.isIndexable ?? true;
  const httpStatus = params.httpStatus ?? 200;
  const primaryTopic = params.primaryTopic ?? 'Web Development';
  const pageType: PageType = params.pageType ?? 'ARTICLE';
  const intent: ContentSearchIntent = params.intent ?? 'INFORMATIONAL';

  const primaryKwItem: KeywordItem = {
    id: 'kw-1',
    keyword: primaryTopic.toLowerCase(),
    nGramType: '1-gram',
    category: 'primary',
    frequency: 6,
    density: 2.5,
    prominenceScore: 90,
    overallScore: 88,
    inTitle: true,
    inH1: true,
    inH2H6: true,
    inMeta: true,
    inBody: true,
    inUrl: false,
    inAnchor: false,
    inAlt: false,
  };

  const secondaryKwItems: KeywordItem[] = (params.secondaryTopics ?? []).map((t, idx) => ({
    id: `kw-sec-${idx}`,
    keyword: t.toLowerCase(),
    nGramType: '1-gram',
    category: 'secondary',
    frequency: 3,
    density: 1.2,
    prominenceScore: 75,
    overallScore: 70,
    inTitle: false,
    inH1: false,
    inH2H6: true,
    inMeta: false,
    inBody: true,
    inUrl: false,
    inAnchor: false,
    inAlt: false,
  }));

  const allKwItems = [primaryKwItem, ...secondaryKwItems];

  return {
    id: `mock-${Math.random().toString(36).substring(7)}`,
    url,
    normalizedUrl: url,
    timestamp: new Date().toISOString(),
    durationMs: 120,
    scores: {
      overall: score,
      onPage: score,
      technical: score,
      content: score,
      links: score,
      mobile: score,
    },
    onPage: {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      canonicalUrl,
      isCanonicalMatch,
      robotsMeta: isIndexable ? 'index, follow' : 'noindex, follow',
      viewport: 'width=device-width',
      language: 'en',
      hreflang: params.hreflang ?? [],
      ogTags: {},
      twitterTags: {},
      wordCount,
      readingTimeMinutes: Math.ceil(wordCount / 200),
      textToHtmlRatio: 25,
      headings: {
        items: [
          { level: 1, text: title },
          { level: 2, text: `Overview of ${primaryTopic}` },
        ],
        h1Count: 1,
        h2Count: 1,
        h3Count: 0,
        h4Count: 0,
        h5Count: 0,
        h6Count: 0,
        hasMissingH1: false,
        hasMultipleH1: false,
        hasSkippedLevels: false,
        issues: [],
      },
      paragraphsCount: 5,
      listsCount: 1,
      tablesCount: 0,
    },
    technical: {
      httpStatus,
      isHttps: true,
      isIndexable,
      responseTimeMs: 120,
      pageSizeBytes: 15000,
      redirectCount: params.redirectChain ? params.redirectChain.length - 1 : 0,
      redirectChain: params.redirectChain ?? [url],
      mobileViewportConfigured: true,
      contentType: 'text/html',
      charset: 'UTF-8',
      robotsAnalysis: { exists: true, url: '', status: 200, sitemaps: [], isBotAllowed: true, directivesCount: 1 },
      sitemapAnalysis: { exists: true, url: '', status: 200, totalUrls: 10, urlsSample: [], isIndex: false },
    },
    links: {
      totalLinks: (params.internalLinks?.length ?? 0) + 1,
      internalLinksCount: params.internalLinks?.length ?? 0,
      externalLinksCount: 1,
      nofollowCount: 0,
      internalLinks: (params.internalLinks ?? []).map((l) => ({
        url: l.url,
        text: l.text || 'Link Text',
        isInternal: true,
        isExternal: false,
        isNofollow: false,
      })),
      externalLinks: [],
      brokenLinks: [],
      internalExternalRatio: 4,
    },
    images: {
      totalImages: 1,
      withAlt: 1,
      missingAlt: 0,
      altCoverageRatio: 100,
      images: [],
    },
    schemas: params.schemas ?? [{ type: 'Article', rawJson: '{}', isValid: true }],
    keywords: {
      all: allKwItems,
      primary: [primaryKwItem],
      secondary: secondaryKwItems,
      shortTail: [],
      longTail: [],
      related: [],
      questions: [],
      entities: [],
      clusters: [],
      opportunities: [],
      recommended: [],
      totalWords: wordCount,
      uniqueWords: Math.floor(wordCount * 0.6),
    },
    contentIntelligence: {
      extraction: {
        mainContentBlocks: [],
        excludedBlocks: [],
        mainContentWordCount: wordCount,
        excludedWordCount: 50,
        mainContentText: metaDescription,
        totalRawWordCount: wordCount + 50,
        contentToHtmlRatio: 25,
        boilerPlateRatio: 10,
      },
      pageType: {
        detectedType: pageType,
        confidence: 'HIGH',
        detectedSignals: ['tag_article'],
        explanation: 'Page matches article structure',
      },
      searchIntent: {
        primaryIntent: intent,
        confidence: 'HIGH',
        signals: ['informational_terms'],
        explanation: 'Informational search intent',
      },
      primaryTopics: [{ topic: primaryTopic, status: 'DEEPLY_COVERED', occurrences: 6, locationsFound: ['title', 'h1'], isMainTopic: true }],
      secondaryTopics: (params.secondaryTopics ?? []).map((t) => ({ topic: t, status: 'MEANINGFULLY_COVERED', occurrences: 3, locationsFound: ['body'], isMainTopic: false })),
      entities: [],
      topicalCoverageScore: 85,
      contentDepth: { status: 'DEEP', mainWordCount: wordCount, paragraphCount: 5, sectionCount: 2, averageWordsPerSection: Math.floor(wordCount / 2), isAdequateForPageType: true, explanation: 'Deep coverage' },
      headingRelationships: { totalHeadings: 2, supportedHeadingsCount: 2, unsupportedHeadingsCount: 0, headingsWithoutContent: [], headingTopicDriftCount: 0, headings: [], summary: 'Properly supported' },
      contentGaps: [],
      repetition: { isRepetitive: false, repetitivePhrases: [], repetitiveSentencesCount: 0, vocabularyDiversityScore: 85, summary: 'Clean text' },
      pageTypeRules: { pageType: pageType, rulesEvaluated: [], passedCount: 3, failedCount: 0, summary: 'Passed baseline rules' },
      score: {
        overall: score,
        topicalDepth: score,
        structuralClarity: score,
        intentSatisfaction: score,
        originalityAndSubstance: score,
        deductions: [],
      },
      recommendations: [],
      isTargetMode: false,
    },
    issues: [],
    tagExplorer: {
      headings: [],
      meta: [],
      schema: [],
      openGraph: {},
      twitterCard: {},
      securityHeaders: {},
      links: [],
      images: [],
    } as any,
    contentContribution: {
      overallContributionScore: 100,
      sections: [],
      heatmap: [],
      strongestSection: 'body',
      weakestSection: '',
      summary: 'Strong content contribution',
    },
    externalSeoDisclaimer: 'Disclaimer',
    dataSourceDisclosures: {
      categoryA: 'Direct DOM Extraction',
      categoryB: 'Deterministic Rule Evaluation',
      categoryC: 'No third-party authority metrics',
    },
  };
}

describe('Phase 7: Site-Wide SEO Intelligence & Multi-URL Crawler Test Suite', () => {

  // Fixture 01: Simple 5-Page Site Crawl
  test('01. Simple 5-Page Site: Crawls root and builds directed link graph across all linked pages', () => {
    const pageA = createMockPage({ url: 'https://example.com/', title: 'Home Page', internalLinks: [{ url: 'https://example.com/about' }, { url: 'https://example.com/services' }] });
    const pageB = createMockPage({ url: 'https://example.com/about', title: 'About Us', internalLinks: [{ url: 'https://example.com/' }, { url: 'https://example.com/contact' }] });
    const pageC = createMockPage({ url: 'https://example.com/services', title: 'Our Services', internalLinks: [{ url: 'https://example.com/services/seo' }] });
    const pageD = createMockPage({ url: 'https://example.com/services/seo', title: 'SEO Services', internalLinks: [{ url: 'https://example.com/' }] });
    const pageE = createMockPage({ url: 'https://example.com/contact', title: 'Contact Us', pageType: 'CONTACT', internalLinks: [{ url: 'https://example.com/' }] });

    const pages = [pageA, pageB, pageC, pageD, pageE];
    const recordsMap = new Map<string, CrawlPageRecord>();
    const graph = buildInternalLinkGraph(pages, recordsMap);

    assert.equal(graph.nodes.length, 5);
    assert.ok(graph.totalEdges >= 6);
    assert.ok(graph.averageInlinksPerPage > 0);
    // Home should have highest centrality
    const homeNode = graph.nodes.find((n) => n.url === 'https://example.com/');
    assert.ok(homeNode && homeNode.internalInlinkCount >= 3);
    assert.ok(homeNode.internalLinkCentrality > 0);
  });

  // Fixture 02: 404 Page Handling
  test('02. 404 Page: Correctly handles 404 response without breaking crawl aggregation', () => {
    const page404 = createMockPage({ url: 'https://example.com/missing', title: '404 Not Found', httpStatus: 404, isIndexable: false });
    const pages = [page404];
    const sitemapConsistency = compileSitemapConsistency(['https://example.com/missing'], new Map([[page404.url, page404]]));

    assert.equal(sitemapConsistency[0].status, 'SITEMAP_URL_4XX');
    assert.equal(sitemapConsistency[0].httpStatus, 404);
  });

  // Fixture 03: 500 Server Error Page
  test('03. 500 Server Error: Categorizes 5xx server error and updates site health deductions', () => {
    const page500 = createMockPage({ url: 'https://example.com/broken-api', title: '500 Server Error', httpStatus: 500, isIndexable: false });
    const sitemapConsistency = compileSitemapConsistency(['https://example.com/broken-api'], new Map([[page500.url, page500]]));

    assert.equal(sitemapConsistency[0].status, 'SITEMAP_URL_5XX');
    assert.equal(sitemapConsistency[0].httpStatus, 500);
  });

  // Fixture 04: 301/302 Redirect
  test('04. Redirect: Tracks redirect status and destination URL', () => {
    const pageRedirect = createMockPage({
      url: 'https://example.com/old-path',
      title: 'Redirect Destination',
      redirectChain: ['https://example.com/old-path', 'https://example.com/new-path'],
    });

    const redirectGraph = buildRedirectGraph([pageRedirect]);
    assert.equal(redirectGraph.length, 1);
    assert.equal(redirectGraph[0].startUrl, 'https://example.com/old-path');
    assert.equal(redirectGraph[0].finalUrl, 'https://example.com/new-path');
    assert.equal(redirectGraph[0].hopCount, 1);
    assert.equal(redirectGraph[0].isLoop, false);
  });

  // Fixture 05: Multi-Hop Redirect Chain
  test('05. Redirect Chain: Detects multi-hop redirect chains (hopCount > 1)', () => {
    const pageChain = createMockPage({
      url: 'https://example.com/step1',
      title: 'Final Step',
      redirectChain: ['https://example.com/step1', 'https://example.com/step2', 'https://example.com/step3'],
    });

    const redirectGraph = buildRedirectGraph([pageChain]);
    assert.equal(redirectGraph.length, 1);
    assert.equal(redirectGraph[0].hopCount, 2);
    assert.equal(redirectGraph[0].finalUrl, 'https://example.com/step3');
  });

  // Fixture 06: Cyclic Redirect Loop
  test('06. Redirect Loop: Identifies cyclic redirect loops', () => {
    const pageLoop = createMockPage({
      url: 'https://example.com/loopA',
      title: 'Loop A',
      redirectChain: ['https://example.com/loopA', 'https://example.com/loopB', 'https://example.com/loopA'],
    });

    const redirectGraph = buildRedirectGraph([pageLoop]);
    assert.equal(redirectGraph.length, 1);
    assert.equal(redirectGraph[0].isLoop, true);
  });

  // Fixture 07: Canonical Conflict
  test('07. Canonical Conflict: Detects canonical pointing to 404 destination and canonical loops', () => {
    const pageA = createMockPage({ url: 'https://example.com/page-a', title: 'Page A', canonicalUrl: 'https://example.com/dead-canonical' });
    const pageDead = createMockPage({ url: 'https://example.com/dead-canonical', title: 'Not Found', httpStatus: 404, isIndexable: false });
    const map = new Map([
      [pageA.url, pageA],
      [pageDead.url, pageDead],
    ]);

    const issues = auditCanonicalConsistency([pageA, pageDead], map);
    assert.ok(issues.some((i) => i.issueType === 'CANONICAL_POINTS_TO_4XX'));
  });

  // Fixture 08: Noindex Page
  test('08. Noindex Page: Flags indexability state and detects sitemap noindex contradiction', () => {
    const noindexPage = createMockPage({
      url: 'https://example.com/private-portal',
      title: 'Private Portal',
      isIndexable: false,
    });

    const issues = auditIndexabilityConsistency([noindexPage], new Set(['https://example.com/private-portal']));
    assert.ok(issues.some((i) => i.issueType === 'SITEMAP_URL_NOINDEX'));
  });

  // Fixture 09: Robots Blocked Page
  test('09. Robots Blocked: Detects indexable page blocked by robots.txt', () => {
    const blockedPage = createMockPage({
      url: 'https://example.com/admin/login',
      title: 'Admin Portal',
      isIndexable: true,
    });
    blockedPage.technical.robotsAnalysis = {
      exists: true,
      url: 'https://example.com/robots.txt',
      status: 200,
      sitemaps: [],
      isBotAllowed: false, // Disallowed
      directivesCount: 2,
    };

    const issues = auditIndexabilityConsistency([blockedPage], new Set());
    assert.ok(issues.some((i) => i.issueType === 'INDEXABLE_BLOCKED_BY_ROBOTS'));
  });

  // Fixture 10: Sitemap-Only Page
  test('10. Sitemap-Only Page: Categorizes unlinked sitemap URL as sitemap_only orphan candidate', () => {
    const rootPage = createMockPage({ url: 'https://example.com/', title: 'Home', internalLinks: [] });
    const sitemapPage = createMockPage({ url: 'https://example.com/isolated-guide', title: 'Isolated Guide', internalLinks: [] });

    const pages = [rootPage, sitemapPage];
    const recordsMap = new Map<string, CrawlPageRecord>([
      ['https://example.com/', { depth: 0, discoveryMethod: 'START_URL' } as any],
      ['https://example.com/isolated-guide', { depth: 1, discoveryMethod: 'SITEMAP' } as any],
    ]);
    const graph = buildInternalLinkGraph(pages, recordsMap);

    const orphans = detectOrphanCandidates(graph, new Set(['https://example.com/isolated-guide']), new Set());
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0].url, 'https://example.com/isolated-guide');
    assert.equal(orphans[0].category, 'sitemap_only');
  });

  // Fixture 11: Orphan Candidate
  test('11. Orphan Candidate: Correctly labels 0-inlink standard article as potential_crawl_orphan', () => {
    const pageA = createMockPage({ url: 'https://example.com/', title: 'Home' });
    const pageOrphan = createMockPage({ url: 'https://example.com/orphan-article', title: 'Orphan Article', pageType: 'ARTICLE' });

    const pages = [pageA, pageOrphan];
    const recordsMap = new Map<string, CrawlPageRecord>([
      ['https://example.com/', { depth: 0, discoveryMethod: 'START_URL' } as any],
      ['https://example.com/orphan-article', { depth: 1, discoveryMethod: 'INTERNAL_LINK' } as any],
    ]);
    const graph = buildInternalLinkGraph(pages, recordsMap);

    const orphans = detectOrphanCandidates(graph, new Set(), new Set());
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0].url, 'https://example.com/orphan-article');
    assert.equal(orphans[0].category, 'potential_crawl_orphan');
  });

  // Fixture 12: Duplicate Title Group
  test('12. Duplicate Title Group: Groups pages sharing identical title and provides 6-pillar recommendation', () => {
    const page1 = createMockPage({ url: 'https://example.com/shoes-men', title: 'Best Running Shoes | Store' });
    const page2 = createMockPage({ url: 'https://example.com/shoes-women', title: 'Best Running Shoes | Store' });

    const groups = detectDuplicateTitles([page1, page2]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].pages.length, 2);
    assert.equal(groups[0].isExactMatch, true);
    assert.ok(groups[0].recommendation.observation.includes('2 pages share the exact same title tag'));
    assert.ok(groups[0].recommendation.caution.includes('Do not automatically merge or redirect'));
  });

  // Fixture 13: Duplicate Meta Group
  test('13. Duplicate Meta Group: Groups pages with identical meta descriptions', () => {
    const desc = 'Shop our premium collection of trail running sneakers with free shipping.';
    const page1 = createMockPage({ url: 'https://example.com/shoes/trail-1', title: 'Trail Shoe 1', metaDescription: desc });
    const page2 = createMockPage({ url: 'https://example.com/shoes/trail-2', title: 'Trail Shoe 2', metaDescription: desc });

    const groups = detectDuplicateMetaDescriptions([page1, page2]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].pages.length, 2);
    assert.ok(groups[0].recommendation.action.includes('Craft tailored meta descriptions'));
  });

  // Fixture 14: Near-Duplicate Content
  test('14. Near-Duplicate Content: Computes shingle similarity and flags pairs with >=50% overlap', () => {
    const page1 = createMockPage({
      url: 'https://example.com/product-v1',
      title: 'Noise Cancelling Headphones V1',
      primaryTopic: 'wireless noise cancelling headphones bluetooth audio',
    });
    const page2 = createMockPage({
      url: 'https://example.com/product-v2',
      title: 'Noise Cancelling Headphones V2',
      primaryTopic: 'wireless noise cancelling headphones bluetooth audio',
    });

    const pairs = detectContentSimilarityPairs([page1, page2]);
    assert.equal(pairs.length, 1);
    assert.ok(pairs[0].similarityScore >= 50);
    assert.ok(pairs[0].recommendation.caution.includes('Do not automatically merge or delete'));
  });

  // Fixture 15: Unique Pages
  test('15. Unique Pages: Diverse pages produce 0 high-similarity duplication pairs', () => {
    const pageA = createMockPage({ url: 'https://example.com/gardening', title: 'Organic Vegetable Gardening Tips', primaryTopic: 'gardening soil composting vegetables' });
    const pageB = createMockPage({ url: 'https://example.com/quantum', title: 'Quantum Computing Algorithms Guide', primaryTopic: 'quantum superposition qubits algorithms' });

    const pairs = detectContentSimilarityPairs([pageA, pageB]);
    assert.equal(pairs.length, 0);
  });

  // Fixture 16: Broken Internal Link
  test('16. Broken Internal Link: Identifies internal links pointing to 404 targets', () => {
    const pageSource = createMockPage({
      url: 'https://example.com/blog',
      title: 'Blog Hub',
      internalLinks: [{ url: 'https://example.com/deleted-post', text: 'Old Post' }],
    });
    const pageTarget = createMockPage({
      url: 'https://example.com/deleted-post',
      title: '404 Not Found',
      httpStatus: 404,
      isIndexable: false,
    });

    const graph = buildInternalLinkGraph([pageSource, pageTarget], new Map());
    assert.equal(graph.brokenInternalLinksCount, 1);
  });

  // Fixture 17: Redirecting Internal Link
  test('17. Redirecting Internal Link: Flags internal links pointing to 3xx redirect destinations', () => {
    const pageSource = createMockPage({
      url: 'https://example.com/home',
      title: 'Home',
      internalLinks: [{ url: 'https://example.com/legacy-url', text: 'Old Feature' }],
    });
    const pageTarget = createMockPage({
      url: 'https://example.com/legacy-url',
      title: 'New Feature',
      redirectChain: ['https://example.com/legacy-url', 'https://example.com/new-feature'],
    });

    const graph = buildInternalLinkGraph([pageSource, pageTarget], new Map());
    assert.equal(graph.redirectingInternalLinksCount, 1);
  });

  // Fixture 18: Noindex Internal Link
  test('18. Noindex Internal Link: Tracks followed internal links pointing to noindex pages', () => {
    const pageSource = createMockPage({
      url: 'https://example.com/dashboard',
      title: 'Dashboard',
      internalLinks: [{ url: 'https://example.com/terms-internal', text: 'Terms' }],
    });
    const pageTarget = createMockPage({
      url: 'https://example.com/terms-internal',
      title: 'Terms of Use',
      isIndexable: false,
    });

    const graph = buildInternalLinkGraph([pageSource, pageTarget], new Map());
    assert.equal(graph.noindexInternalLinksCount, 1);
  });

  // Fixture 19: Multiple Topic Clusters
  test('19. Multiple Topic Clusters: Groups multi-page domain into distinct topic clusters with health', () => {
    const page1 = createMockPage({ url: 'https://example.com/react-1', title: 'React Hooks Guide', primaryTopic: 'React Development' });
    const page2 = createMockPage({ url: 'https://example.com/react-2', title: 'React Router Guide', primaryTopic: 'React Development' });
    const page3 = createMockPage({ url: 'https://example.com/python-1', title: 'Python Asyncio Guide', primaryTopic: 'Python Programming' });

    const clusters = clusterPagesByTopic([page1, page2, page3]);
    assert.equal(clusters.length, 2);
    const reactCluster = clusters.find((c) => c.primaryTopic === 'React Development');
    assert.ok(reactCluster && reactCluster.pagesCount === 2);
    assert.ok(reactCluster.averageSemanticScore > 0);
  });

  // Fixture 20: Possible Topic Overlap
  test('20. Possible Topic Overlap: Detects pages sharing primary topic and checks intent similarity', () => {
    const page1 = createMockPage({ url: 'https://example.com/seo-guide', title: 'Complete SEO Guide', primaryTopic: 'SEO Optimization', intent: 'INFORMATIONAL' });
    const page2 = createMockPage({ url: 'https://example.com/seo-tips', title: 'Top SEO Tips', primaryTopic: 'SEO Optimization', intent: 'INFORMATIONAL' });

    const overlaps = detectSearchIntentOverlaps([page1, page2]);
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].primaryTopic, 'SEO Optimization');
    assert.ok(overlaps[0].riskLevel === 'HIGH' || overlaps[0].riskLevel === 'MEDIUM');
  });

  // Fixture 21: High Topic Overlap
  test('21. High Topic Overlap: Flags HIGH risk when topic + intent + pageType + title/H1 match', () => {
    const page1 = createMockPage({ url: 'https://example.com/buy-macbook-pro', title: 'Buy MacBook Pro Deals', primaryTopic: 'MacBook Pro', intent: 'TRANSACTIONAL', pageType: 'PRODUCT' });
    const page2 = createMockPage({ url: 'https://example.com/store/macbook-pro', title: 'Buy MacBook Pro Online', primaryTopic: 'MacBook Pro', intent: 'TRANSACTIONAL', pageType: 'PRODUCT' });

    const overlaps = detectSearchIntentOverlaps([page1, page2]);
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].riskLevel, 'HIGH');
    assert.ok(overlaps[0].observation.includes('strongly emphasize the same primary topic'));
  });

  // Fixture 22: Hreflang Relationship
  test('22. Hreflang Relationship: Validates reciprocal international alternate links', () => {
    const pageEn = createMockPage({
      url: 'https://example.com/en/page',
      title: 'English Page',
      hreflang: [
        { lang: 'en', href: 'https://example.com/en/page' },
        { lang: 'es', href: 'https://example.com/es/page' },
      ],
    });
    const pageEs = createMockPage({
      url: 'https://example.com/es/page',
      title: 'Spanish Page',
      hreflang: [
        { lang: 'es', href: 'https://example.com/es/page' },
        { lang: 'en', href: 'https://example.com/en/page' },
      ],
    });

    const issues = auditHreflangCrossPage([pageEn, pageEs], new Map([[pageEn.url, pageEn], [pageEs.url, pageEs]]));
    assert.equal(issues.length, 0); // Clean reciprocal links
  });

  // Fixture 23: Invalid Hreflang
  test('23. Invalid Hreflang: Flags missing reciprocal return link in alternate page', () => {
    const pageEn = createMockPage({
      url: 'https://example.com/en/article',
      title: 'English Article',
      hreflang: [{ lang: 'es', href: 'https://example.com/es/article' }],
    });
    const pageEs = createMockPage({
      url: 'https://example.com/es/article',
      title: 'Spanish Article',
      hreflang: [], // Missing reciprocal back to /en/article
    });

    const issues = auditHreflangCrossPage([pageEn, pageEs], new Map([[pageEn.url, pageEn], [pageEs.url, pageEs]]));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].issueType, 'MISSING_RECIPROCAL');
  });

  // Fixture 24: Schema Contextual Assessment
  test('24. Schema Contextual: Summarizes Schema.org distribution across site without false penalties', () => {
    const page1 = createMockPage({ url: 'https://example.com/blog/1', title: 'Post 1', schemas: [{ type: 'Article', rawJson: '{}', isValid: true }] });
    const page2 = createMockPage({ url: 'https://example.com/shop/1', title: 'Product 1', schemas: [{ type: 'Product', rawJson: '{}', isValid: true }] });

    const patterns = analyzeStructuredDataCrossPage([page1, page2]);
    assert.equal(patterns.length, 2);
    assert.ok(patterns.some((p) => p.schemaType === 'Article'));
    assert.ok(patterns.some((p) => p.schemaType === 'Product'));
  });

  // Fixture 25: Pagination Parameter Handling
  test('25. Pagination: Classifies pagination query parameters and prevents infinite traps', () => {
    const norm = normalizeUrlDeterministically('https://example.com/blog?page=2&sort=recent');
    assert.ok(norm);
    assert.equal(classifyQueryParameter('page', '2'), 'PAGINATION');

    const trapCheck = detectCrawlTrap(new URL('https://example.com/blog?page=9999'));
    assert.equal(trapCheck.isTrap, true);
  });

  // Fixture 26: Faceted Navigation Parameters
  test('26. Faceted Navigation: Correctly classifies facet filter parameters', () => {
    assert.equal(classifyQueryParameter('color', 'red'), 'FACET_VARIANT');
    assert.equal(classifyQueryParameter('size', 'XL'), 'FACET_VARIANT');
    assert.equal(classifyQueryParameter('price_max', '100'), 'FACET_VARIANT');
  });

  // Fixture 27: Tracking Parameters Stripping
  test('27. Tracking Parameters: Strips utm_source, fbclid, and gclid during URL normalization', () => {
    const norm = normalizeUrlDeterministically('https://example.com/landing?utm_source=twitter&utm_medium=social&fbclid=12345&keep_param=true');
    assert.ok(norm);
    assert.equal(norm.normalizedUrl, 'https://example.com/landing?keep_param=true');
  });

  // Fixture 28: External Links Scope
  test('28. External Links Scope: Excludes external domain URLs from same-origin crawl queue', () => {
    const frontier = new CrawlFrontier({
      maxPages: 10,
      maxDepth: 3,
      baseHostname: 'example.com',
    });

    const resInternal = frontier.addCandidate('https://example.com/internal-page', 1, 'INTERNAL_LINK');
    const resExternal = frontier.addCandidate('https://external-site.com/other-page', 1, 'INTERNAL_LINK');

    assert.equal(resInternal.added, true);
    assert.equal(resExternal.added, false);
    assert.ok(resExternal.reason?.includes('out-of-scope'));
  });

  // Fixture 29 & 30: JavaScript Rendered Page & Discrepancy Tracking
  test('29 & 30. JS Rendered Shell: Tracks rendered pages and updates browser render resource budget', () => {
    const frontier = new CrawlFrontier({
      maxPages: 5,
      maxDepth: 2,
      baseHostname: 'example.com',
      maxBrowserRenders: 2,
    });

    frontier.addCandidate('https://example.com/app', 0, 'START_URL');
    const item = frontier.getNext();
    assert.ok(item);
    frontier.markCompleted(item.normalizedUrl, 25000, true);

    const stats = frontier.getStats();
    assert.equal(stats.budget.usedBrowserRenders, 1);
    assert.equal(stats.budget.usedResponseBytes, 25000);
  });

  // Fixture 31: Crawl Depth Limit
  test('31. Crawl Depth Limit: Rejects candidates exceeding maxDepth', () => {
    const frontier = new CrawlFrontier({
      maxPages: 10,
      maxDepth: 2,
      baseHostname: 'example.com',
    });

    const resDepth2 = frontier.addCandidate('https://example.com/depth-2', 2, 'INTERNAL_LINK');
    const resDepth3 = frontier.addCandidate('https://example.com/depth-3', 3, 'INTERNAL_LINK');

    assert.equal(resDepth2.added, true);
    assert.equal(resDepth3.added, false);
    assert.ok(resDepth3.reason?.includes('Exceeds max depth'));
  });

  // Fixture 32: Max Page Limit
  test('32. Max Page Limit: Halts queuing when frontier capacity ceiling is reached', () => {
    const frontier = new CrawlFrontier({
      maxPages: 2,
      maxDepth: 3,
      baseHostname: 'example.com',
    });

    frontier.addCandidate('https://example.com/p1', 1, 'INTERNAL_LINK');
    frontier.addCandidate('https://example.com/p2', 1, 'INTERNAL_LINK');
    assert.equal(frontier.getStats().queued, 2);
  });

  // Fixture 33: Oversized Response Budget
  test('33. Oversized Response Budget: Enforces byte consumption ceilings', () => {
    const frontier = new CrawlFrontier({
      maxPages: 5,
      maxDepth: 2,
      baseHostname: 'example.com',
      maxResponseBytes: 1000, // 1KB limit
    });

    frontier.addCandidate('https://example.com/heavy', 0, 'START_URL');
    const item = frontier.getNext();
    assert.ok(item);
    frontier.markCompleted(item.normalizedUrl, 2000);

    assert.equal(frontier.isBudgetExceeded(), true);
  });

  // Fixture 34: Timeout & Transient Retry
  test('34. Timeout & Retry: Retries transient errors up to maxRetries without infinite loops', () => {
    const frontier = new CrawlFrontier({
      maxPages: 5,
      maxDepth: 2,
      baseHostname: 'example.com',
      maxRetries: 2,
    });

    frontier.addCandidate('https://example.com/transient', 0, 'START_URL');
    const item1 = frontier.getNext();
    assert.ok(item1);

    const willRetry1 = frontier.markFailed(item1.normalizedUrl, 'TIMEOUT', 'Connection timeout', true);
    assert.equal(willRetry1, true);

    const item2 = frontier.getNext();
    assert.ok(item2);
    const willRetry2 = frontier.markFailed(item2.normalizedUrl, 'TIMEOUT', 'Connection timeout', true);
    assert.equal(willRetry2, true);

    const item3 = frontier.getNext();
    assert.ok(item3);
    const willRetry3 = frontier.markFailed(item3.normalizedUrl, 'TIMEOUT', 'Connection timeout', true);
    assert.equal(willRetry3, false); // Exceeded maxRetries
  });

  // Fixture 35: Mixed Page Types
  test('35. Mixed Page Types: Correctly maps diverse page archetypes across the domain', () => {
    const article = createMockPage({ url: 'https://example.com/blog/ai', title: 'AI Guide', pageType: 'ARTICLE' });
    const product = createMockPage({ url: 'https://example.com/product/phone', title: 'Smartphone', pageType: 'PRODUCT' });
    const contact = createMockPage({ url: 'https://example.com/contact', title: 'Contact Us', pageType: 'CONTACT' });
    const faq = createMockPage({ url: 'https://example.com/faq', title: 'Frequently Asked Questions', pageType: 'FAQ' });

    const pages = [article, product, contact, faq];
    const graph = buildInternalLinkGraph(pages, new Map());

    assert.equal(graph.nodes.find((n) => n.url.includes('/blog/ai'))?.pageType, 'ARTICLE');
    assert.equal(graph.nodes.find((n) => n.url.includes('/product/phone'))?.pageType, 'PRODUCT');
    assert.equal(graph.nodes.find((n) => n.url.includes('/contact'))?.pageType, 'CONTACT');
    assert.equal(graph.nodes.find((n) => n.url.includes('/faq'))?.pageType, 'FAQ');
  });

  // Contextual Internal Link Opportunities
  test('Contextual Link Opportunities: Identifies unlinked topic mentions between pages', () => {
    const pageA = createMockPage({
      url: 'https://example.com/shoes-overview',
      title: 'Running Shoes Overview',
      primaryTopic: 'Footwear Guide',
      secondaryTopics: ['Trail Running Sneakers'],
      internalLinks: [],
    });
    const pageB = createMockPage({
      url: 'https://example.com/trail-running-sneakers',
      title: 'Dedicated Trail Running Sneakers Guide',
      primaryTopic: 'Trail Running Sneakers',
      internalLinks: [],
    });

    const graph = buildInternalLinkGraph([pageA, pageB], new Map());
    const opps = identifyInternalLinkOpportunities([pageA, pageB], graph);

    assert.ok(opps.length >= 1);
    assert.equal(opps[0].sourceUrl, pageA.url);
    assert.equal(opps[0].targetUrl, pageB.url);
    assert.ok(opps[0].caution.includes('natural'));
  });

  // Site Health Scoring & Deduplication
  test('Site Health Scoring: Uses bounded category penalties and root-cause grouping', () => {
    const page1 = createMockPage({ url: 'https://example.com/1', title: 'Dup Title', metaDescription: 'Dup Meta Description Text' });
    const page2 = createMockPage({ url: 'https://example.com/2', title: 'Dup Title', metaDescription: 'Dup Meta Description Text' });
    const page3 = createMockPage({ url: 'https://example.com/3', title: 'Dup Title', metaDescription: 'Dup Meta Description Text' });

    const pages = [page1, page2, page3];
    const graph = buildInternalLinkGraph(pages, new Map());
    const duplicateTitles = detectDuplicateTitles(pages);
    const duplicateMetas = detectDuplicateMetaDescriptions(pages);

    const { score, issues, summary } = calculateSiteHealthScore({
      pages,
      failedUrlsCount: 0,
      linkGraph: graph,
      duplicateTitles,
      duplicateMetas,
      contentSimilarities: [],
      canonicalIssues: [],
      indexabilityIssues: [],
      intentOverlaps: [],
      orphanCandidates: [],
    });

    assert.ok(score.overall >= 70, `Score should remain healthy and bounded despite 3 duplicate pages (actual: ${score.overall})`);
    assert.ok(score.deductions.some((d) => d.rootCauseId === 'DUPLICATE_TITLES'));
    assert.ok(score.deductions.some((d) => d.rootCauseId === 'DUPLICATE_METAS'));
    assert.equal(summary.pagesCrawled, 3);
  });

  // Security & Crawl Trap Guards
  test('Security & Crawl Trap Guards: Detects recursive paths, cyclic patterns, and extreme query depth', () => {
    const trap1 = detectCrawlTrap(new URL('https://example.com/a/b/a/b/a/b'));
    assert.equal(trap1.isTrap, true);

    const trap2 = detectCrawlTrap(new URL('https://example.com/category/tech/category/tech/category/tech'));
    assert.equal(trap2.isTrap, true);

    const trap3 = detectCrawlTrap(new URL('https://example.com/1/2/3/4/5/6/7/8/9/10/11/12/13/14'));
    assert.equal(trap3.isTrap, true);
  });
});
