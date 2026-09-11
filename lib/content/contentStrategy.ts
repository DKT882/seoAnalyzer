import 'server-only';
import { SEOReport, SiteContentStrategy, SiteKeywordItem, CompetitorComparisonReport } from '@/types';
import crypto from 'node:crypto';

/**
 * Generates a site-wide content strategy identifying strong, weak, missing topics, and new page opportunities.
 */
export function generateSiteContentStrategy(
  pages: SEOReport[],
  siteKeywords: SiteKeywordItem[],
  competitorReports?: CompetitorComparisonReport[]
): SiteContentStrategy {
  if (pages.length === 0) {
    return {
      strongTopics: [],
      weakTopics: [],
      missingTopics: [],
      newPageOpportunities: [],
      topicCoverageScore: 0,
      topicCoverageMethodology: 'Requires analyzed pages to generate site content strategy.',
    };
  }

  // 1. Group topics by clusters
  const clusterPagesMap = new Map<
    string,
    { pages: Set<string>; keywords: string[]; totalWords: number; scores: number[] }
  >();

  for (const page of pages) {
    for (const kw of page.keywords.all) {
      const cluster = kw.topicCluster || 'General Content';
      let entry = clusterPagesMap.get(cluster);
      if (!entry) {
        entry = { pages: new Set(), keywords: [], totalWords: 0, scores: [] };
        clusterPagesMap.set(cluster, entry);
      }
      entry.pages.add(page.url);
      if (!entry.keywords.includes(kw.keyword)) {
        entry.keywords.push(kw.keyword);
      }
      entry.totalWords += page.onPage.wordCount;
      entry.scores.push(kw.overallScore);
    }
  }

  const strongTopics: SiteContentStrategy['strongTopics'] = [];
  const weakTopics: SiteContentStrategy['weakTopics'] = [];
  const missingTopics: SiteContentStrategy['missingTopics'] = [];
  const newPageOpportunities: SiteContentStrategy['newPageOpportunities'] = [];

  for (const [topic, data] of Array.from(clusterPagesMap.entries())) {
    const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / Math.max(1, data.scores.length));
    const pagesCount = data.pages.size;

    if (pagesCount >= 2 && avgScore >= 65) {
      strongTopics.push({
        topic,
        pagesCount,
        coverageScore: avgScore,
        topKeywords: data.keywords.slice(0, 6),
      });
    } else {
      weakTopics.push({
        topic,
        pagesCount,
        coverageScore: avgScore,
        missingAspects: [
          'Needs supporting sub-topic articles or dedicated FAQ expansion.',
          'Under-represented in site-wide internal link architecture.',
        ],
      });
    }
  }

  // 2. Identify missing topics from competitor gaps or top questions
  if (competitorReports && competitorReports.length > 0) {
    for (const comp of competitorReports) {
      for (const gap of comp.keywordGapMatrix) {
        if (gap.gapType === 'missing_in_target') {
          const compUrl = Object.keys(gap.competitorFrequencies || {})[0] || 'competitor';
          missingTopics.push({
            topic: gap.keyword,
            relevanceScore: gap.opportunityScore || 80,
            reason: `Covered by competitor (${compUrl}) but missing from your website content.`,
            suggestedKeywords: [gap.keyword, `best ${gap.keyword}`, `${gap.keyword} guide`],
          });
        }
      }
    }
  }

  // Add default missing topic opportunities if few are found
  if (missingTopics.length === 0) {
    const topKeywords = siteKeywords.slice(0, 3);
    for (const kw of topKeywords) {
      missingTopics.push({
        topic: `${kw.keyword} Best Practices & Framework`,
        relevanceScore: 78,
        reason: 'High organic search interest with opportunity for dedicated comprehensive pillar page.',
        suggestedKeywords: [`${kw.keyword} checklist`, `${kw.keyword} examples`, `${kw.keyword} comparison`],
      });
    }
  }

  // 3. Generate New Page Opportunities
  for (const missing of missingTopics.slice(0, 5)) {
    const primary = missing.topic;
    newPageOpportunities.push({
      id: crypto.randomUUID(),
      suggestedTitle: `The Ultimate Guide to ${primary.charAt(0).toUpperCase() + primary.slice(1)}: Strategies & Checklist`,
      primaryTopic: primary,
      reason: missing.reason,
      supportingKeywords: missing.suggestedKeywords,
      suggestedInternalLinks: pages.slice(0, 3).map((p) => p.url),
      expectedRelevance: 'HIGH',
    });
  }

  const topicCoverageScore = Math.min(
    100,
    Math.max(20, Math.round((strongTopics.length / Math.max(1, strongTopics.length + weakTopics.length)) * 100))
  );

  return {
    strongTopics: strongTopics.sort((a, b) => b.coverageScore - a.coverageScore),
    weakTopics: weakTopics.sort((a, b) => a.coverageScore - b.coverageScore),
    missingTopics: missingTopics.slice(0, 10),
    newPageOpportunities,
    topicCoverageScore,
    topicCoverageMethodology:
      'Calculated as the proportion of content clusters with multi-page depth (2+ pages) and composite relevance score >= 65.',
  };
}
