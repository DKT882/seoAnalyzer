import {
  CompetitorComparisonReport,
  CompetitorPageSummary,
  KeywordGapMatrixRow,
  KeywordGapType,
  ContentGapReport,
  MissingTopicItem,
  OutrankRecommendation,
  SEOReport,
} from '@seo-analyzer/shared';
import { generateSeoReport } from '../reports/reportGenerator.js';
import crypto from 'node:crypto';

export interface CompareCompetitorsOptions {
  targetUrl: string;
  competitorUrls: string[];
}

export async function compareCompetitorWebsites(
  options: CompareCompetitorsOptions
): Promise<CompetitorComparisonReport> {
  const { targetUrl, competitorUrls } = options;

  // Ensure unique and filtered URL list (max 4 competitors + 1 target = 5 total)
  const cleanCompetitorUrls = Array.from(
    new Set(competitorUrls.filter((u) => u.trim() && u.trim() !== targetUrl))
  ).slice(0, 4);

  if (cleanCompetitorUrls.length === 0) {
    throw new Error('Please provide at least 1 competitor URL to compare against the target page.');
  }

  // 1. Parallel analysis of target and competitors
  const [targetReport, ...competitorReports] = await Promise.all([
    generateSeoReport(targetUrl),
    ...cleanCompetitorUrls.map((url) => generateSeoReport(url)),
  ]);

  // 2. Build Summaries
  const mapSummary = (report: SEOReport): CompetitorPageSummary => {
    let hostname = report.url;
    try {
      hostname = new URL(report.url).hostname;
    } catch {
      // fallback
    }

    return {
      url: report.url,
      hostname,
      overallScore: report.scores.overall,
      onPageScore: report.scores.onPage,
      technicalScore: report.scores.technical,
      contentScore: report.scores.content,
      wordCount: report.onPage.wordCount,
      headingCount: report.onPage.headings.items.length,
      keywordCount: report.keywords.all.length,
      imageCount: report.images.totalImages,
      altCoverageRatio: report.images.altCoverageRatio,
      internalLinksCount: report.links.internalLinksCount,
      externalLinksCount: report.links.externalLinksCount,
      schemaTypesCount: report.schemas.length,
      responseTimeMs: report.technical.responseTimeMs,
      topKeywords: report.keywords.primary.concat(report.keywords.secondary).slice(0, 6).map((k) => k.keyword),
      topTopics: report.keywords.clusters.slice(0, 4).map((c) => c.name),
      schemaTypes: report.schemas.map((s) => s.type),
    };
  };

  const targetSummary = mapSummary(targetReport);
  const competitorsSummaries = competitorReports.map(mapSummary);

  // 3. Keyword Gap Matrix
  const targetKwsMap = new Map(targetReport.keywords.all.map((k) => [k.keyword.toLowerCase(), k]));
  const allDiscoveredKeywords = new Map<string, { keyword: string; nGramType: any }>();

  targetReport.keywords.all.forEach((k) => {
    allDiscoveredKeywords.set(k.keyword.toLowerCase(), { keyword: k.keyword, nGramType: k.nGramType });
  });

  const competitorKwsMaps = competitorReports.map((cReport) => {
    const map = new Map(cReport.keywords.all.map((k) => [k.keyword.toLowerCase(), k]));
    cReport.keywords.all.forEach((k) => {
      if (!allDiscoveredKeywords.has(k.keyword.toLowerCase())) {
        allDiscoveredKeywords.set(k.keyword.toLowerCase(), { keyword: k.keyword, nGramType: k.nGramType });
      }
    });
    return { hostname: mapSummary(cReport).hostname, map };
  });

  const keywordGapMatrix: KeywordGapMatrixRow[] = [];

  for (const [kwLower, info] of allDiscoveredKeywords.entries()) {
    const targetKw = targetKwsMap.get(kwLower);
    const targetFreq = targetKw ? targetKw.frequency : 0;
    const targetDensity = targetKw ? targetKw.density : 0;

    const competitorFreqs: Record<string, number> = {};
    let competitorsCoveringCount = 0;

    competitorKwsMaps.forEach((c) => {
      const cKw = c.map.get(kwLower);
      const freq = cKw ? cKw.frequency : 0;
      competitorFreqs[c.hostname] = freq;
      if (freq > 0) competitorsCoveringCount++;
    });

    let gapType: KeywordGapType = 'target_unique';
    let opportunityScore = 0;
    let recommendation = 'Unique to target page.';

    if (targetFreq > 0 && competitorsCoveringCount === competitorReports.length) {
      gapType = 'shared_by_all';
      opportunityScore = 50;
      recommendation = 'Core industry keyword covered by all sites. Ensure prominent H1/H2 placement.';
    } else if (targetFreq === 0 && competitorsCoveringCount === competitorReports.length) {
      gapType = 'missing_in_target';
      opportunityScore = 90;
      recommendation = `High-value gap: All competitors cover "${info.keyword}", but target page is missing it entirely.`;
    } else if (targetFreq === 0 && competitorsCoveringCount > 0) {
      gapType = competitorsCoveringCount > 1 ? 'high_opportunity' : 'competitor_unique';
      opportunityScore = competitorsCoveringCount > 1 ? 80 : 60;
      recommendation = `Consider integrating "${info.keyword}" into body paragraphs or subheadings.`;
    } else if (targetFreq > 0 && competitorsCoveringCount === 0) {
      gapType = 'target_unique';
      opportunityScore = 30;
      recommendation = 'Target exclusive topic differentiator.';
    }

    keywordGapMatrix.push({
      keyword: info.keyword,
      nGramType: info.nGramType,
      targetFrequency: targetFreq,
      targetDensity,
      competitorFrequencies: competitorFreqs,
      gapType,
      opportunityScore,
      recommendation,
    });
  }

  // Sort Keyword Gap Matrix by opportunity score descending
  keywordGapMatrix.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // 4. Content Gap Analysis
  const targetTopics = new Set(targetReport.keywords.clusters.map((c) => c.name.toLowerCase()));
  const targetEntities = new Set(targetReport.keywords.entities.map((e) => e.name.toLowerCase()));
  const targetQuestions = new Set(targetReport.keywords.questions.map((q) => q.keyword.toLowerCase()));
  const targetSchemaTypes = new Set(targetReport.schemas.map((s) => s.type));

  const missingTopics: MissingTopicItem[] = [];
  const missingEntitiesSet = new Set<string>();
  const missingQuestionsSet = new Set<string>();
  const missingFaqs: Array<{ question: string; competitorSource: string }> = [];
  const missingSchemaSet = new Set<string>();

  competitorReports.forEach((cReport) => {
    const cSummary = mapSummary(cReport);

    // Topics
    cReport.keywords.clusters.forEach((cluster) => {
      const topicLower = cluster.name.toLowerCase();
      if (!targetTopics.has(topicLower) && !missingTopics.some((t) => t.topic.toLowerCase() === topicLower)) {
        missingTopics.push({
          topic: cluster.name,
          competitorsCovering: [cSummary.hostname],
          suggestedKeywords: cluster.keywords.slice(0, 4),
          suggestedSection: `Dedicated H2 Section: Understanding ${cluster.name}`,
          priority: cluster.keywords.length >= 3 ? 'HIGH' : 'MEDIUM',
          reason: `Competitor ${cSummary.hostname} builds authority around "${cluster.name}" which target page omits.`,
        });
      }
    });

    // Entities
    cReport.keywords.entities.forEach((entity) => {
      if (!targetEntities.has(entity.name.toLowerCase())) {
        missingEntitiesSet.add(entity.name);
      }
    });

    // Questions
    cReport.keywords.questions.forEach((q) => {
      if (!targetQuestions.has(q.keyword.toLowerCase())) {
        missingQuestionsSet.add(q.keyword);
      }
    });

    // FAQ schema items
    cReport.schemas.forEach((s) => {
      if (s.faqs) {
        s.faqs.forEach((faq) => {
          if (missingFaqs.length < 5) {
            missingFaqs.push({ question: faq.question, competitorSource: cSummary.hostname });
          }
        });
      }
      if (!targetSchemaTypes.has(s.type)) {
        missingSchemaSet.add(s.type);
      }
    });
  });

  const contentGap: ContentGapReport = {
    missingTopics: missingTopics.slice(0, 10),
    missingEntities: Array.from(missingEntitiesSet).slice(0, 15),
    missingQuestions: Array.from(missingQuestionsSet).slice(0, 10),
    missingFaqs,
    missingSchemaTypes: Array.from(missingSchemaSet),
    recommendedSections: missingTopics.slice(0, 5).map((mt) => ({
      title: mt.suggestedSection,
      reason: mt.reason,
      suggestedKeywords: mt.suggestedKeywords,
      priority: mt.priority,
    })),
  };

  // 5. "What They Do Better", "What You Do Better", "What They Are Missing"
  const whatTheyDoBetter: Array<{ competitor: string; advantages: string[] }> = [];
  const whatYouDoBetter: string[] = [];
  const whatTheyAreMissing: Array<{ competitor: string; gaps: string[] }> = [];

  // Target advantages
  if (targetSummary.wordCount > Math.max(...competitorsSummaries.map((c) => c.wordCount))) {
    whatYouDoBetter.push(`Highest comprehensive content depth (${targetSummary.wordCount} words vs competitor average of ${Math.round(competitorsSummaries.reduce((a, c) => a + c.wordCount, 0) / competitorsSummaries.length)} words).`);
  }
  if (targetSummary.overallScore >= Math.max(...competitorsSummaries.map((c) => c.overallScore))) {
    whatYouDoBetter.push(`Leading overall SEO health score (${targetSummary.overallScore}/100).`);
  }
  if (targetSummary.altCoverageRatio === 100) {
    whatYouDoBetter.push('Perfect 100% image ALT text coverage.');
  }
  if (targetSummary.schemaTypesCount > 0 && competitorsSummaries.every((c) => c.schemaTypesCount === 0)) {
    whatYouDoBetter.push('Active Schema.org structured data markup whereas competitors have none.');
  }
  if (whatYouDoBetter.length === 0) {
    whatYouDoBetter.push('Target page is online and structurally valid.');
  }

  competitorsSummaries.forEach((cSummary) => {
    const adv: string[] = [];
    const gaps: string[] = [];

    if (cSummary.wordCount > targetSummary.wordCount + 150) {
      adv.push(`Greater content depth (${cSummary.wordCount} words vs target's ${targetSummary.wordCount} words).`);
    } else if (cSummary.wordCount < targetSummary.wordCount - 200) {
      gaps.push(`Thinner content depth (${cSummary.wordCount} words vs target's ${targetSummary.wordCount} words).`);
    }

    if (cSummary.headingCount > targetSummary.headingCount + 3) {
      adv.push(`More granular heading breakdown (${cSummary.headingCount} headings vs ${targetSummary.headingCount}).`);
    }

    if (cSummary.schemaTypesCount > targetSummary.schemaTypesCount) {
      adv.push(`Implements structured data schemas (${cSummary.schemaTypes.join(', ')}).`);
    } else if (cSummary.schemaTypesCount === 0 && targetSummary.schemaTypesCount > 0) {
      gaps.push('Lacks Schema.org structured data markup.');
    }

    if (cSummary.altCoverageRatio > targetSummary.altCoverageRatio + 15) {
      adv.push(`Superior image ALT text coverage (${Math.round(cSummary.altCoverageRatio)}% vs ${Math.round(targetSummary.altCoverageRatio)}%).`);
    } else if (cSummary.altCoverageRatio < targetSummary.altCoverageRatio - 20) {
      gaps.push(`Poor image ALT coverage (${Math.round(cSummary.altCoverageRatio)}%).`);
    }

    if (cSummary.responseTimeMs < targetSummary.responseTimeMs - 200) {
      adv.push(`Faster page response time (${cSummary.responseTimeMs}ms vs ${targetSummary.responseTimeMs}ms).`);
    }

    if (adv.length === 0) adv.push('Comparable baseline technical configuration.');
    if (gaps.length === 0) gaps.push('No obvious structural deficiencies found.');

    whatTheyDoBetter.push({ competitor: cSummary.hostname, advantages: adv });
    whatTheyAreMissing.push({ competitor: cSummary.hostname, gaps });
  });

  // 6. Actionable Outrank Recommendations Engine
  const outrankRecommendations: OutrankRecommendation[] = [];

  // Rec 1: Content depth gap
  const maxCompetitorWords = Math.max(...competitorsSummaries.map((c) => c.wordCount));
  if (targetSummary.wordCount < maxCompetitorWords) {
    const leadingComp = competitorsSummaries.find((c) => c.wordCount === maxCompetitorWords);
    outrankRecommendations.push({
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      priority: 'HIGH',
      category: 'CONTENT',
      title: 'Close Content Depth Gap',
      problem: `Target page word count (${targetSummary.wordCount}) is behind ${leadingComp?.hostname} (${maxCompetitorWords} words).`,
      whyItMatters: 'Search algorithms favor comprehensive content depth that satisfies user search intent in a single visit.',
      evidence: `Top competitor ${leadingComp?.hostname} provides ${maxCompetitorWords - targetSummary.wordCount} more words of explanation.`,
      recommendedAction: `Expand target page by adding sections covering missing topics: ${missingTopics.slice(0, 3).map((t) => t.topic).join(', ')}.`,
      expectedBenefit: 'Improves topical authority and satisfies long-tail search intent.',
    });
  }

  // Rec 2: Missing shared keywords
  const missingShared = keywordGapMatrix.filter((k) => k.gapType === 'missing_in_target');
  if (missingShared.length > 0) {
    outrankRecommendations.push({
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      priority: 'HIGH',
      category: 'KEYWORDS',
      title: 'Incorporate Critical Industry Keywords',
      problem: `Target page is missing ${missingShared.length} core keywords shared by all competitors.`,
      whyItMatters: 'Failing to include standard industry terminology signals low topical relevance to search engines.',
      evidence: `Keywords present on all competitors but missing on target: "${missingShared.slice(0, 4).map((k) => k.keyword).join('", "')}".`,
      recommendedAction: 'Add H2 subheadings and body paragraphs targeting these missing terms.',
      expectedBenefit: 'Qualifies the page for broader query matching in semantic search.',
    });
  }

  // Rec 3: Missing Schema
  if (targetSummary.schemaTypesCount === 0 && competitorsSummaries.some((c) => c.schemaTypesCount > 0)) {
    const competitorSchemas = Array.from(new Set(competitorsSummaries.flatMap((c) => c.schemaTypes)));
    outrankRecommendations.push({
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      priority: 'MEDIUM',
      category: 'SCHEMA',
      title: 'Deploy Structured Data Schemas',
      problem: 'Competitors utilize Schema.org structured data, while target page has none.',
      whyItMatters: 'Schema markup enhances SERP appearance with rich snippets and strengthens entity comprehension.',
      evidence: `Competitors implement: ${competitorSchemas.join(', ')}.`,
      recommendedAction: `Add JSON-LD markup for ${competitorSchemas.slice(0, 2).join(' and ')} to the <head> section.`,
      expectedBenefit: 'Eligible for rich snippets and increased click-through rate (CTR).',
    });
  }

  // Rec 4: Image ALT coverage
  if (targetSummary.altCoverageRatio < 80) {
    outrankRecommendations.push({
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      priority: 'MEDIUM',
      category: 'STRUCTURE',
      title: 'Maximize Image Accessibility and ALT Signals',
      problem: `Target ALT text coverage is only ${Math.round(targetSummary.altCoverageRatio)}%.`,
      whyItMatters: 'Image ALT attributes provide semantic context for search crawlers and improve Google Image ranking.',
      evidence: `Target has ${targetReport.images.missingAlt} images missing ALT descriptions.`,
      recommendedAction: 'Add concise, descriptive ALT tags to all content-bearing images.',
      expectedBenefit: 'Boosts image search visibility and resolves accessibility warnings.',
    });
  }

  return {
    id: `comp-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    targetUrl,
    competitorUrls: cleanCompetitorUrls,
    targetSummary,
    competitorsSummaries,
    keywordGapMatrix: keywordGapMatrix.slice(0, 100),
    contentGap,
    whatTheyDoBetter,
    whatYouDoBetter,
    whatTheyAreMissing,
    outrankRecommendations,
    externalMetricsNotice:
      'Notice: External backlink authority, domain rating, and organic search traffic estimates require a third-party SEO data provider integration. All comparative metrics shown are directly computed from on-page HTML, DOM structure, and technical crawling.',
  };
}
