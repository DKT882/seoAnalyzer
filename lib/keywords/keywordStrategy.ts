import 'server-only';
import {
  SEOReport,
  KeywordStrategyItem,
  TopicCluster,
  ContentBrief,
  CompetitorComparisonReport,
} from '@/types';
import {
  inferSearchIntent,
  calculateInternalOpportunityScore,
  generateNaturalPlacementSuggestions,
} from './keywordOpportunities';
import crypto from 'node:crypto';

/**
 * Generates an SEO Keyword Strategy based on primary keyword, website content, topic clusters, and competitors.
 */
export function generateKeywordStrategy(
  primaryKeywordOrPages: string | undefined | SEOReport[],
  pagesOrKeyword?: SEOReport[] | string,
  competitorReports?: CompetitorComparisonReport[]
): {
  primaryKeyword: string;
  topicCoverageScore: number;
  topicCoverageMethodology: string;
  keywords: KeywordStrategyItem[];
  clusters: TopicCluster[];
  briefs: ContentBrief[];
} {
  let primaryKeywordInput: string | undefined;
  let pages: SEOReport[] = [];

  if (Array.isArray(primaryKeywordOrPages)) {
    pages = primaryKeywordOrPages;
    primaryKeywordInput = typeof pagesOrKeyword === 'string' ? pagesOrKeyword : undefined;
  } else {
    primaryKeywordInput = primaryKeywordOrPages;
    pages = Array.isArray(pagesOrKeyword) ? pagesOrKeyword : [];
  }

  if (pages.length === 0) {
    const fallbackPrimary = (primaryKeywordInput || 'SEO Intelligence').trim();
    return {
      primaryKeyword: fallbackPrimary,
      topicCoverageScore: 0,
      topicCoverageMethodology: 'Requires analyzed pages to compute topic coverage.',
      keywords: [],
      clusters: [],
      briefs: [],
    };
  }

  // 1. Determine Primary Keyword (User-provided or Auto-detected)
  let primaryKeyword = (primaryKeywordInput || '').trim().toLowerCase();
  if (!primaryKeyword) {
    // Auto-detect from first page or highest-scoring primary keyword
    const firstPage = pages[0];
    if (firstPage.keywords.primary.length > 0) {
      primaryKeyword = firstPage.keywords.primary[0].keyword.toLowerCase();
    } else if (firstPage.keywords.all.length > 0) {
      primaryKeyword = firstPage.keywords.all[0].keyword.toLowerCase();
    } else {
      primaryKeyword = (firstPage.onPage.title || 'Main Topic').split(/[-|:]/)[0].trim().toLowerCase();
    }
  }

  const totalPagesCount = Math.max(1, pages.length);
  const strategyKeywords: KeywordStrategyItem[] = [];
  const seenKeywords = new Set<string>();

  // Collect all keywords from all pages
  const allPageKeywords: Array<{ kw: any; pageUrl: string; pageTitle: string }> = [];
  for (const page of pages) {
    for (const kw of page.keywords.all) {
      allPageKeywords.push({ kw, pageUrl: page.url, pageTitle: page.onPage.title || 'Untitled' });
    }
  }

  // Helper to calculate website coverage
  const getWebsiteCoverage = (kwStr: string) => {
    let count = 0;
    for (const page of pages) {
      if (page.keywords.all.some((k) => k.keyword.toLowerCase() === kwStr.toLowerCase())) {
        count++;
      }
    }
    return Math.round((count / totalPagesCount) * 100);
  };

  // Helper to find best matching recommended page
  const getRecommendedPage = (kwStr: string) => {
    let bestPage = pages[0].url;
    let bestScore = -1;
    for (const page of pages) {
      const match = page.keywords.all.find((k) => k.keyword.toLowerCase() === kwStr.toLowerCase());
      if (match && match.overallScore > bestScore) {
        bestScore = match.overallScore;
        bestPage = page.url;
      }
    }
    return bestPage;
  };

  // 1. Primary Keyword Item
  strategyKeywords.push({
    id: crypto.randomUUID(),
    keyword: primaryKeyword,
    category: 'primary',
    reason: 'Core focal topic for the website/landing page content architecture.',
    relationshipToPrimary: 'Primary focal subject',
    currentWebsiteCoverage: getWebsiteCoverage(primaryKeyword),
    recommendedPage: getRecommendedPage(primaryKeyword),
    placements: generateNaturalPlacementSuggestions(primaryKeyword, 'primary', {
      inTitle: pages[0]?.keywords.all.find((k) => k.keyword.toLowerCase() === primaryKeyword)?.inTitle || false,
      inH1: pages[0]?.keywords.all.find((k) => k.keyword.toLowerCase() === primaryKeyword)?.inH1 || false,
      inMeta: pages[0]?.keywords.all.find((k) => k.keyword.toLowerCase() === primaryKeyword)?.inMeta || false,
      inBody: pages[0]?.keywords.all.find((k) => k.keyword.toLowerCase() === primaryKeyword)?.inBody || false,
    }),
    topicCluster: 'Core Topic',
    estimatedIntent: inferSearchIntent(primaryKeyword),
    internalOpportunityScore: calculateInternalOpportunityScore(95, getWebsiteCoverage(primaryKeyword) / 100, 2),
  });
  seenKeywords.add(primaryKeyword);

  // 2. Secondary, Short-Tail, Long-Tail, Questions, Entities from pages
  for (const item of allPageKeywords) {
    const kwText = item.kw.keyword.toLowerCase().trim();
    if (seenKeywords.has(kwText) || kwText.length < 3) continue;
    seenKeywords.add(kwText);

    const coverage = getWebsiteCoverage(kwText);
    const intent = inferSearchIntent(kwText);
    const words = kwText.split(/\s+/).length;

    let category: KeywordStrategyItem['category'] = 'supporting';
    if (item.kw.category === 'question' || kwText.includes('how') || kwText.includes('what') || kwText.includes('why')) {
      category = 'question';
    } else if (item.kw.category === 'entity') {
      category = 'entity';
    } else if (words <= 2) {
      category = 'short-tail';
    } else if (words >= 3) {
      category = 'long-tail';
    }

    if (item.kw.category === 'secondary' || (words >= 2 && item.kw.overallScore >= 70)) {
      category = 'secondary';
    }

    const opportunityScore = calculateInternalOpportunityScore(
      item.kw.overallScore,
      coverage / 100,
      (item.kw.inTitle ? 1 : 0) + (item.kw.inH1 ? 1 : 0) + (item.kw.inMeta ? 1 : 0)
    );

    strategyKeywords.push({
      id: crypto.randomUUID(),
      keyword: kwText,
      category,
      reason: `Detected on ${item.pageTitle} with relevance score ${item.kw.overallScore}.`,
      relationshipToPrimary: `Contextually related to "${primaryKeyword}"`,
      currentWebsiteCoverage: coverage,
      recommendedPage: item.pageUrl,
      placements: generateNaturalPlacementSuggestions(kwText, category, {
        inTitle: item.kw.inTitle,
        inH1: item.kw.inH1,
        inMeta: item.kw.inMeta,
        inBody: item.kw.inBody,
      }),
      topicCluster: item.kw.topicCluster || 'Related Topics',
      estimatedIntent: intent,
      internalOpportunityScore: opportunityScore,
    });
  }

  // 3. Competitor Gap Keywords
  if (competitorReports && competitorReports.length > 0) {
    for (const comp of competitorReports) {
      for (const gap of comp.keywordGapMatrix) {
        if (gap.gapType === 'missing_in_target' && !seenKeywords.has(gap.keyword.toLowerCase())) {
          const kwText = gap.keyword.toLowerCase();
          seenKeywords.add(kwText);
          const compUrl = Object.keys(gap.competitorFrequencies || {})[0] || 'competitor';
          strategyKeywords.push({
            id: crypto.randomUUID(),
            keyword: kwText,
            category: 'topic-idea',
            reason: `Targeted by competitor (${compUrl}) but missing from your website content.`,
            relationshipToPrimary: `Competitive gap opportunity for "${primaryKeyword}"`,
            currentWebsiteCoverage: 0,
            recommendedPage: pages[0]?.url || '',
            placements: generateNaturalPlacementSuggestions(kwText, 'topic-idea', {
              inTitle: false,
              inH1: false,
              inMeta: false,
              inBody: false,
            }),
            topicCluster: 'Competitive Gaps',
            estimatedIntent: inferSearchIntent(kwText),
            internalOpportunityScore: gap.opportunityScore || 88,
          });
        }
      }
    }
  }

  // 4. Group into Topic Clusters
  const clusterMap = new Map<string, { keywords: string[]; scores: number[]; freq: number }>();
  for (const kwItem of strategyKeywords) {
    const clusterName = kwItem.topicCluster || 'General';
    let cluster = clusterMap.get(clusterName);
    if (!cluster) {
      cluster = { keywords: [], scores: [], freq: 0 };
      clusterMap.set(clusterName, cluster);
    }
    cluster.keywords.push(kwItem.keyword);
    cluster.scores.push(kwItem.internalOpportunityScore);
    cluster.freq += 1;
  }

  const clusters: TopicCluster[] = Array.from(clusterMap.entries()).map(([name, data]) => ({
    name,
    keywords: data.keywords.slice(0, 8),
    averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / Math.max(1, data.scores.length)),
    totalFrequency: data.freq,
  }));

  // 5. Calculate Topic Coverage Score (0-100)
  // Factors: Primary keyword placement, secondary keyword variety, questions answered, entity presence
  let coveragePoints = 0;
  const hasPrimaryInTitle = pages.some((p) => p.onPage.title?.toLowerCase().includes(primaryKeyword));
  const hasPrimaryInH1 = pages.some((p) => p.onPage.headings.items.some((h) => h.level === 1 && h.text.toLowerCase().includes(primaryKeyword)));
  const secondaryCount = strategyKeywords.filter((k) => k.category === 'secondary').length;
  const questionsCount = strategyKeywords.filter((k) => k.category === 'question').length;
  const entitiesCount = strategyKeywords.filter((k) => k.category === 'entity').length;

  if (hasPrimaryInTitle) coveragePoints += 25;
  if (hasPrimaryInH1) coveragePoints += 25;
  coveragePoints += Math.min(20, secondaryCount * 4);
  coveragePoints += Math.min(15, questionsCount * 3);
  coveragePoints += Math.min(15, entitiesCount * 3);

  const topicCoverageScore = Math.min(100, Math.max(10, coveragePoints));
  const topicCoverageMethodology =
    'Calculated from primary topic heading alignment (50%), supporting semantic variety (20%), questions answered (15%), and named entity breadth (15%).';

  // 5. Generate SEO Content Brief
  const brief = generateContentBrief(primaryKeyword, pages, strategyKeywords);

  return {
    primaryKeyword,
    topicCoverageScore,
    topicCoverageMethodology,
    keywords: strategyKeywords.sort((a, b) => b.internalOpportunityScore - a.internalOpportunityScore),
    clusters,
    briefs: [brief],
  };
}

/**
 * Generates an actionable SEO Content Brief for a primary keyword.
 */
export function generateContentBrief(
  primaryKeyword: string,
  pages: SEOReport[] = [],
  strategyKeywords: KeywordStrategyItem[] = []
): ContentBrief {
  const secondaryKws = strategyKeywords
    .filter((k) => k.category === 'secondary' || k.category === 'long-tail')
    .slice(0, 8)
    .map((k) => k.keyword);

  const supportingKws = strategyKeywords
    .filter((k) => k.category === 'supporting' || k.category === 'semantic-variation')
    .slice(0, 8)
    .map((k) => k.keyword);

  const questionsToAnswer = strategyKeywords
    .filter((k) => k.category === 'question')
    .slice(0, 6)
    .map((k) => k.keyword);

  const entitiesToCover = strategyKeywords
    .filter((k) => k.category === 'entity')
    .slice(0, 6)
    .map((k) => k.keyword);

  return {
    id: crypto.randomUUID(),
    primaryKeyword,
    targetUrl: pages[0]?.url,
    estimatedSearchIntent: inferSearchIntent(primaryKeyword),
    secondaryKeywords: secondaryKws.length > 0 ? secondaryKws : ['strategy', 'best practices', 'overview'],
    supportingKeywords: supportingKws.length > 0 ? supportingKws : ['guide', 'examples', 'tips', 'checklist'],
    suggestedH1: `Comprehensive Guide to ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}: Strategies & Best Practices`,
    suggestedH2s: [
      `What is ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} and Why Does It Matter?`,
      `Core Principles of Effective Implementation`,
      `Step-by-Step Optimization Process`,
      `Common Mistakes to Avoid`,
      `Frequently Asked Questions`,
    ],
    suggestedH3s: [
      `Key Benefits and Value Proposition`,
      `Tools, Metrics, and Performance Tracking`,
      `Advanced Tactical Recommendations`,
    ],
    questionsToAnswer: questionsToAnswer.length > 0 ? questionsToAnswer : [
      `How does ${primaryKeyword} work?`,
      `What are the best tools for ${primaryKeyword}?`,
      `Why is ${primaryKeyword} important for your strategy?`,
    ],
    entitiesToCover: entitiesToCover.length > 0 ? entitiesToCover : ['Industry Standards', 'Optimization Frameworks'],
    internalLinksToAdd: pages.slice(1, 4).map((p) => ({
      targetUrl: p.url,
      anchorText: p.onPage.title?.split(/[-|:]/)[0].trim() || 'Related Guide',
      reason: 'Provides relevant context and passes authority to supporting page.',
    })),
    contentGaps: [
      'Ensure practical real-world examples accompany every recommendation.',
      'Include clear data tables or structured comparisons where appropriate.',
    ],
    recommendedSections: [
      'Executive Summary & Definition',
      'In-Depth Practical Guide',
      'Comparative Analysis / Table',
      'Interactive FAQ Accordion',
    ],
    technicalImprovements: [
      'Add self-referencing canonical URL.',
      'Implement WebPage or Article JSON-LD schema.',
      'Optimize meta description length between 140–160 characters.',
    ],
  };
}
