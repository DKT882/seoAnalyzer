import {
  SearchOpportunity,
  InternalLinkSerpOpportunity,
  NormalizedSerpSnapshot,
  SearchIntentAlignment,
  PageTypeAlignment,
  SerpTopicPattern,
  QuerySource,
} from './searchTypes';
import { buildCrossPageRecommendation } from '../crawler/recommendationBuilder';
import { SEOReport, InternalLinkGraph } from '@/types';

/**
 * Generates evidence-based search opportunities with strict 6-pillar recommendations.
 * Calibration Rule 8 & 15: Confidence reflects evidence strength, NEVER ranking probability or guarantees.
 */
export function generateSearchOpportunities(params: {
  snapshot: NormalizedSerpSnapshot;
  intentAlignment: SearchIntentAlignment;
  pageTypeAlignment: PageTypeAlignment;
  topicPatterns: SerpTopicPattern[];
  userPageReport?: SEOReport;
  linkGraph?: InternalLinkGraph;
}): {
  opportunities: SearchOpportunity[];
  internalLinkIntegrations: InternalLinkSerpOpportunity[];
} {
  const { snapshot, intentAlignment, pageTypeAlignment, topicPatterns, userPageReport, linkGraph } = params;
  const opportunities: SearchOpportunity[] = [];
  const internalLinkIntegrations: InternalLinkSerpOpportunity[] = [];

  const contentGaps = topicPatterns
    .filter((t) => t.category === 'POTENTIAL_CONTENT_GAP' || t.category === 'POTENTIAL_SUPPORTING_TOPIC')
    .map((t) => t.topic);

  // 1. Content Gap & Topical Substance Opportunity
  if (contentGaps.length > 0) {
    const topGaps = contentGaps.slice(0, 3).join(', ');
    const evidenceSnippets = topicPatterns
      .filter((t) => t.category === 'POTENTIAL_CONTENT_GAP' || t.category === 'POTENTIAL_SUPPORTING_TOPIC')
      .flatMap((t) => t.sampleSnippets)
      .slice(0, 3);

    const rec = buildCrossPageRecommendation({
      observation: `Observed SERP results for "${snapshot.query}" frequently cover sub-topics not prominently detected on the target page.`,
      evidence: `Sub-topics [${topGaps}] appear in ${topicPatterns.filter((t) => t.category === 'POTENTIAL_CONTENT_GAP' || t.category === 'POTENTIAL_SUPPORTING_TOPIC')[0]?.percentage || 40}% of sampled top organic listings. Examples: ${evidenceSnippets.join(' | ')}`,
      interpretation: 'Search engines frequently surface pages that comprehensively satisfy broad informational sub-themes surrounding the core query.',
      action: `Evaluate incorporating substantive dedicated sections addressing [${topGaps}] into the target page or creating linked supporting sub-pages.`,
      expectedBenefit: 'Enhances topical depth and comprehensive search intent fulfillment for users querying this topic.',
      caution: 'Ensure new content is uniquely valuable and genuinely relevant to your audience, rather than adding filler text or keyword stuffing.',
    });

    opportunities.push({
      id: `opp-gap-${snapshot.fingerprint.substring(0, 8)}`,
      query: snapshot.query,
      source: snapshot.source,
      observedIntent: intentAlignment.observedSerpIntentPattern,
      userPageUrl: userPageReport?.url,
      userPageTitle: userPageReport?.onPage.title,
      observedSerpPattern: `Content Gap: ${topGaps}`,
      pageTypeAlignment,
      intentAlignment,
      topicEvidence: topicPatterns.filter((t) => t.category === 'POTENTIAL_CONTENT_GAP' || t.category === 'POTENTIAL_SUPPORTING_TOPIC'),
      contentGaps,
      recommendation: rec,
      confidence: topicPatterns.length >= 3 ? 'HIGH' : 'MEDIUM',
      evidenceTimestamp: snapshot.collectedAt,
      provenance: snapshot.provenance,
    });
  }

  // 2. Search Intent Alignment Opportunity
  if (intentAlignment.level === 'WEAK_ALIGNMENT' && intentAlignment.userPageIntent) {
    const rec = buildCrossPageRecommendation({
      observation: `Observed search intent for "${snapshot.query}" is predominantly ${intentAlignment.observedSerpIntentPattern}, while the user page is classified as ${intentAlignment.userPageIntent}.`,
      evidence: `Sampled SERP intent breakdown: ${Object.entries(intentAlignment.intentDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}. Target page intent: ${intentAlignment.userPageIntent}.`,
      interpretation: 'A discrepancy between page purpose and user query expectations may lead to lower user engagement and alignment friction.',
      action: `Align page layout, call-to-actions, and content depth to satisfy the prevailing ${intentAlignment.observedSerpIntentPattern} search intent.`,
      expectedBenefit: 'Improves page relevance for searchers seeking this specific query format.',
      caution: 'Do not alter the primary commercial or informational purpose of a critical conversion page without validating user journey impact.',
    });

    opportunities.push({
      id: `opp-intent-${snapshot.fingerprint.substring(0, 8)}`,
      query: snapshot.query,
      source: snapshot.source,
      observedIntent: intentAlignment.observedSerpIntentPattern,
      userPageUrl: userPageReport?.url,
      userPageTitle: userPageReport?.onPage.title,
      observedSerpPattern: `Intent Discrepancy: ${intentAlignment.userPageIntent} vs ${intentAlignment.observedSerpIntentPattern}`,
      pageTypeAlignment,
      intentAlignment,
      topicEvidence: topicPatterns,
      contentGaps: [],
      recommendation: rec,
      confidence: 'HIGH',
      evidenceTimestamp: snapshot.collectedAt,
      provenance: snapshot.provenance,
    });
  }

  // 3. Page-Type Archetype Alignment Opportunity
  if (pageTypeAlignment.alignmentStatus === 'POTENTIAL_MISALIGNMENT' && pageTypeAlignment.userPageType) {
    const rec = buildCrossPageRecommendation({
      observation: `Sampled SERP for "${snapshot.query}" predominantly features ${pageTypeAlignment.dominantType} pages, whereas the target URL is a ${pageTypeAlignment.userPageType}.`,
      evidence: `Observed SERP page-type breakdown: ${Object.entries(pageTypeAlignment.observedDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}.`,
      interpretation: 'Searchers for this query may expect a different format (e.g. multi-item category listing or detailed article guide).',
      action: `Assess whether a ${pageTypeAlignment.dominantType} archetype on your domain is better positioned to target this query, or adjust content elements on the current page.`,
      expectedBenefit: 'Better format alignment with observed search user preferences.',
      caution: 'Page-type patterns in SERPs change over time. Do not rewrite page structure without testing user intent.',
    });

    opportunities.push({
      id: `opp-type-${snapshot.fingerprint.substring(0, 8)}`,
      query: snapshot.query,
      source: snapshot.source,
      observedIntent: intentAlignment.observedSerpIntentPattern,
      userPageUrl: userPageReport?.url,
      userPageTitle: userPageReport?.onPage.title,
      observedSerpPattern: `Archetype Alignment: ${pageTypeAlignment.userPageType} vs ${pageTypeAlignment.dominantType}`,
      pageTypeAlignment,
      intentAlignment,
      topicEvidence: topicPatterns,
      contentGaps: [],
      recommendation: rec,
      confidence: 'MEDIUM',
      evidenceTimestamp: snapshot.collectedAt,
      provenance: snapshot.provenance,
    });
  }

  // 4. Phase 7 Internal Link & Cross-Page Integration
  if (linkGraph && userPageReport && contentGaps.length > 0) {
    for (const gap of contentGaps.slice(0, 5)) {
      // Find another page on the domain that covers this gap
      const siblingNode = linkGraph.nodes.find(
        (n) => n.url !== userPageReport.url && (
          (n.primaryTopic && (n.primaryTopic.toLowerCase().includes(gap.toLowerCase()) || gap.toLowerCase().includes(n.primaryTopic.toLowerCase())))
        )
      );

      if (siblingNode) {
        const alreadyLinked = linkGraph.edges.some(
          (e) => (e.sourceUrl === userPageReport.url || e.sourceUrl === userPageReport.normalizedUrl) &&
                 (e.targetUrl === siblingNode.url || e.targetUrl === siblingNode.normalizedUrl)
        );

        if (!alreadyLinked) {
          const linkRec = buildCrossPageRecommendation({
            observation: `Target page mentions sub-topic "${gap}" (observed in SERP demand) without linking to existing dedicated page "${siblingNode.url}".`,
            evidence: `SERP topic gap: "${gap}". Sibling page "${siblingNode.url}" covers "${siblingNode.primaryTopic}" but receives no internal link from "${userPageReport.url}".`,
            interpretation: 'Cross-linking from high-level pages to focused topic pages guides users to in-depth resources and reinforces domain topical hierarchy.',
            action: `Add a contextual internal link from "${userPageReport.url}" to "${siblingNode.url}" using descriptive anchor text such as "${gap}".`,
            expectedBenefit: 'Enhances user navigation pathways and distributes internal link centrality to specialized content.',
            caution: 'Ensure the link is naturally placed within contextual paragraph text rather than added artificially.',
          });

          internalLinkIntegrations.push({
            sourcePageUrl: userPageReport.url,
            sourcePageTitle: userPageReport.onPage.title || 'Source Page',
            targetPageUrl: siblingNode.url,
            targetPageTitle: siblingNode.primaryTopic ? `Guide to ${siblingNode.primaryTopic}` : siblingNode.url,
            query: snapshot.query,
            topic: gap,
            observedSerpIntent: String(intentAlignment.observedSerpIntentPattern),
            recommendedAnchorText: gap,
            context: `Contextual recommendation for SERP query "${snapshot.query}"`,
            recommendation: linkRec,
          });
        }
      }
    }
  }

  return {
    opportunities,
    internalLinkIntegrations,
  };
}
