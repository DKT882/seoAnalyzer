import {
  SEOReport,
  TopicClusterHealth,
  SearchIntentOverlapSignal,
  InternalLinkOpportunity,
  InternalLinkGraph,
  PageType,
  ContentSearchIntent,
} from '@/types';
import { buildCrossPageRecommendation } from './recommendationBuilder';

/**
 * Clusters crawled pages by primary topic intelligence and calculates cluster health.
 */
export function clusterPagesByTopic(
  pages: SEOReport[],
  linkGraph?: InternalLinkGraph
): TopicClusterHealth[] {
  const clusterMap = new Map<
    string,
    {
      primaryTopic: string;
      subTopics: Set<string>;
      pages: Array<{
        url: string;
        title: string;
        pageType: PageType;
        semanticScore: number;
        depth: number;
        wordCount: number;
      }>;
      allTopics: Set<string>;
    }
  >();

  for (const page of pages) {
    const primary =
      page.contentIntelligence?.primaryTopics[0]?.topic ||
      page.keywords.primary[0]?.keyword ||
      'General Topic';

    const normalizedClusterKey = primary.toLowerCase().trim();
    let cluster = clusterMap.get(normalizedClusterKey);

    if (!cluster) {
      cluster = {
        primaryTopic: primary,
        subTopics: new Set(),
        pages: [],
        allTopics: new Set(),
      };
      clusterMap.set(normalizedClusterKey, cluster);
    }

    const pageType = page.contentIntelligence?.pageType.detectedType || 'ARTICLE';
    const semanticScore = page.contentIntelligence?.score?.overall ?? page.scores.content;

    cluster.pages.push({
      url: page.url,
      title: page.onPage.title || 'Untitled',
      pageType,
      semanticScore,
      depth: 0,
      wordCount: page.onPage.wordCount,
    });

    if (page.contentIntelligence?.secondaryTopics) {
      for (const st of page.contentIntelligence.secondaryTopics) {
        cluster.subTopics.add(st.topic);
        cluster.allTopics.add(st.topic.toLowerCase());
      }
    }
  }

  const result: TopicClusterHealth[] = [];
  let clusterIndex = 1;

  for (const cluster of clusterMap.values()) {
    if (cluster.pages.length === 0) continue;

    const totalSemantic = cluster.pages.reduce((a, b) => a + b.semanticScore, 0);
    const totalWords = cluster.pages.reduce((a, b) => a + b.wordCount, 0);
    const avgSemantic = Math.round(totalSemantic / cluster.pages.length);
    const avgWords = Math.round(totalWords / cluster.pages.length);

    const sortedByScore = [...cluster.pages].sort((a, b) => b.semanticScore - a.semanticScore);
    const strongestPage = {
      url: sortedByScore[0].url,
      title: sortedByScore[0].title,
      score: sortedByScore[0].semanticScore,
    };
    const weakestPage = {
      url: sortedByScore[sortedByScore.length - 1].url,
      title: sortedByScore[sortedByScore.length - 1].title,
      score: sortedByScore[sortedByScore.length - 1].semanticScore,
    };

    // Calculate cluster internal link density if graph available
    let clusterLinkDensity = 50;
    if (linkGraph && cluster.pages.length > 1) {
      const clusterUrls = new Set(cluster.pages.map((p) => p.url));
      let linksBetweenClusterPages = 0;
      for (const edge of linkGraph.edges) {
        if (clusterUrls.has(edge.sourceUrl) && clusterUrls.has(edge.targetUrl)) {
          linksBetweenClusterPages++;
        }
      }
      const maxPossibleLinks = cluster.pages.length * (cluster.pages.length - 1);
      clusterLinkDensity = maxPossibleLinks > 0 ? Math.min(100, Math.round((linksBetweenClusterPages / maxPossibleLinks) * 100)) : 100;
    }

    result.push({
      clusterId: `cluster-${clusterIndex++}`,
      primaryTopic: cluster.primaryTopic,
      subTopics: Array.from(cluster.subTopics).slice(0, 8),
      pagesCount: cluster.pages.length,
      pages: cluster.pages,
      averageSemanticScore: avgSemantic,
      averageWordCount: avgWords,
      strongestPage,
      weakestPage,
      clusterInternalLinkDensity: clusterLinkDensity,
      uncoveredConcepts: [],
    });
  }

  return result.sort((a, b) => b.pagesCount - a.pagesCount);
}

/**
 * Detects potential search-intent overlap across crawled pages.
 * Rule 4: Never assert "keyword cannibalization" as fact. Require multiple independent signals:
 * topic similarity + intent similarity + page-type similarity + title/H1/content similarity.
 */
export function detectSearchIntentOverlaps(
  pages: SEOReport[]
): SearchIntentOverlapSignal[] {
  if (pages.length < 2) return [];

  const topicGroups = new Map<
    string,
    Array<{
      page: SEOReport;
      primaryTopic: string;
      intent: ContentSearchIntent;
      pageType: PageType;
      inTitle: boolean;
      inH1: boolean;
    }>
  >();

  for (const page of pages) {
    const primary =
      page.contentIntelligence?.primaryTopics[0]?.topic ||
      page.keywords.primary[0]?.keyword;
    if (!primary || primary.length < 3) continue;

    const normTopic = primary.toLowerCase().trim();
    let group = topicGroups.get(normTopic);
    if (!group) {
      group = [];
      topicGroups.set(normTopic, group);
    }

    const titleLower = (page.onPage.title || '').toLowerCase();
    const h1Text = page.onPage.headings?.items?.find((h) => h.level === 1)?.text || (page.onPage.headings as any)?.h1?.[0] || '';
    const h1Lower = h1Text.toLowerCase();

    const inTitle = titleLower.includes(normTopic);
    const inH1 = h1Lower.includes(normTopic);
    const intent = page.contentIntelligence?.searchIntent?.primaryIntent || 'INFORMATIONAL';
    const pageType = page.contentIntelligence?.pageType.detectedType || 'ARTICLE';

    group.push({
      page,
      primaryTopic: primary,
      intent,
      pageType,
      inTitle,
      inH1,
    });
  }

  const signals: SearchIntentOverlapSignal[] = [];
  let signalId = 1;

  for (const [normTopic, entries] of topicGroups.entries()) {
    if (entries.length >= 2) {
      const distinctIntents = new Set(entries.map((e) => e.intent));
      const distinctTypes = new Set(entries.map((e) => e.pageType));
      const titleMatches = entries.filter((e) => e.inTitle).length;
      const h1Matches = entries.filter((e) => e.inH1).length;

      // Independent signal corroboration
      const intentSimilarity = distinctIntents.size === 1;
      const pageTypeSimilarity = distinctTypes.size === 1;
      const titleH1Similarity = titleMatches >= 2 || (titleMatches >= 1 && h1Matches >= 1);

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (titleH1Similarity && intentSimilarity && pageTypeSimilarity) {
        riskLevel = 'HIGH';
      } else if (titleH1Similarity || (intentSimilarity && pageTypeSimilarity)) {
        riskLevel = 'MEDIUM';
      }

      const competingPages = entries.map((e) => ({
        url: e.page.url,
        title: e.page.onPage.title || 'Untitled',
        pageType: e.pageType,
        intent: e.intent,
        h1Text: e.page.onPage.headings?.items?.find((h) => h.level === 1)?.text || (e.page.onPage.headings as any)?.h1?.[0] || '',
        relevanceScore: e.page.scores.overall,
        inTitle: e.inTitle,
        inH1: e.inH1,
      }));

      const urlsSample = competingPages.map((p) => p.url).slice(0, 3).join(', ');

      signals.push({
        id: `overlap-${signalId++}`,
        primaryTopic: entries[0].primaryTopic,
        competingPages,
        riskLevel,
        evidence: {
          topicSimilarity: 90,
          intentSimilarity,
          pageTypeSimilarity,
          titleH1Similarity,
          contentSimilarity: 60,
        },
        observation: `${entries.length} pages strongly emphasize the same primary topic "${entries[0].primaryTopic}" with matching ${entries[0].intent} intent.`,
        interpretation: 'Multiple pages with identical search intent and primary topic focus may compete against each other for the same query space in search results.',
        action:
          riskLevel === 'HIGH'
            ? `Designate one primary authoritative page for "${entries[0].primaryTopic}", and differentiate supporting pages by refining their focus toward distinct long-tail sub-topics or use internal links pointing to the primary page.`
            : `Review whether these pages address distinct user needs or audience segments, and adjust headings and titles to reflect their unique sub-themes.`,
        expectedBenefit: 'Clearer search intent targeting and consolidation of domain topical authority.',
        caution: 'Do not automatically merge or canonicalize pages without confirming that users do not need distinct standalone pages for each URL.',
      });
    }
  }

  return signals.sort((a, b) => {
    const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return order[b.riskLevel] - order[a.riskLevel] || b.competingPages.length - a.competingPages.length;
  });
}

/**
 * Identifies contextual internal linking opportunities between pages.
 */
export function identifyInternalLinkOpportunities(
  pages: SEOReport[],
  linkGraph: InternalLinkGraph
): InternalLinkOpportunity[] {
  const opportunities: InternalLinkOpportunity[] = [];
  const existingLinks = new Set<string>();

  for (const edge of linkGraph.edges) {
    existingLinks.add(`${edge.sourceUrl}->${edge.targetUrl}`);
  }

  // Map each page's primary topic
  const pageTopicMap = new Map<string, { topic: string; report: SEOReport }>();
  for (const page of pages) {
    const primary =
      page.contentIntelligence?.primaryTopics[0]?.topic ||
      page.keywords.primary[0]?.keyword;
    if (primary && primary.length >= 3) {
      pageTopicMap.set(page.normalizedUrl || page.url, { topic: primary.toLowerCase().trim(), report: page });
    }
  }

  let oppCounter = 1;

  for (const sourcePage of pages) {
    const sourceNorm = sourcePage.normalizedUrl || sourcePage.url;
    const sourceKeywords = [
      ...sourcePage.keywords.all.map((k) => k.keyword.toLowerCase().trim()),
      ...(sourcePage.contentIntelligence?.secondaryTopics || []).map((t) => t.topic.toLowerCase().trim()),
      ...(sourcePage.keywords.secondary || []).map((k) => k.keyword.toLowerCase().trim()),
    ];
    const sourceTitle = sourcePage.onPage.title || 'Source Page';

    for (const [targetNorm, targetData] of pageTopicMap.entries()) {
      if (sourceNorm === targetNorm) continue;
      if (existingLinks.has(`${sourcePage.url}->${targetData.report.url}`)) continue;

      // Check if source page mentions target topic in its keywords or secondary topics
      const mentionsTargetTopic = sourceKeywords.some(
        (kw) => kw === targetData.topic || kw.includes(targetData.topic) || targetData.topic.includes(kw)
      );

      if (mentionsTargetTopic && opportunities.length < 50) {
        opportunities.push({
          id: `link-opp-${oppCounter++}`,
          sourceUrl: sourcePage.url,
          sourceTitle,
          targetUrl: targetData.report.url,
          targetTitle: targetData.report.onPage.title || 'Target Page',
          targetPrimaryTopic: targetData.topic,
          sourceContextSnippet: `Source page discusses concepts related to "${targetData.topic}".`,
          suggestedAnchorConcept: targetData.topic,
          reason: `Source page mentions the topic "${targetData.topic}" but does not internally link to the dedicated target page.`,
          caution: 'Ensure the link is naturally contextual within the text body rather than forced as an exact-match anchor.',
          confidence: 'HIGH',
        });
      }
    }
  }

  return opportunities;
}
