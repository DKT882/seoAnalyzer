import {
  NormalizedSerpSnapshot,
  SerpResultItem,
  SearchIntentAlignment,
  IntentAlignmentLevel,
  PageTypeAlignment,
  PageTypeAlignmentStatus,
  SerpTopicPattern,
  ObservedSerpDomain,
  ObservationProvenance,
} from './searchTypes';
import { CompetitorPageAnalysis } from './competitorFetcher';
import { SEOReport, PageType, ContentSearchIntent, ConfidenceLevel } from '@/types';

/**
 * Analyzes intent distribution across sampled organic SERP results and compares against the user's page.
 * Calibration Rule 6: Supports OBSERVED_SERP_INTENT_MIXED and never forces heterogeneous SERPs into a single class.
 */
export function analyzeSerpIntent(
  snapshot: NormalizedSerpSnapshot,
  userPageReport?: SEOReport
): SearchIntentAlignment {
  const organicResults = snapshot.results.filter((r) => r.resultType === 'ORGANIC' || r.resultType === 'FEATURED_SNIPPET');
  const total = organicResults.length;

  const distribution: Record<string, number> = {
    INFORMATIONAL: 0,
    TRANSACTIONAL: 0,
    COMMERCIAL_INVESTIGATION: 0,
    LOCAL: 0,
    NAVIGATIONAL: 0,
  };

  for (const r of organicResults) {
    const intent = r.detectedIntent || 'INFORMATIONAL';
    distribution[intent] = (distribution[intent] || 0) + 1;
  }

  // Determine dominant intent or mixed
  let dominantIntent: ContentSearchIntent | 'OBSERVED_SERP_INTENT_MIXED' = 'INFORMATIONAL';
  let maxCount = 0;
  let topCountIntents = 0;

  for (const [intent, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantIntent = intent as ContentSearchIntent;
    }
  }

  // If no single intent commands >= 60% of total results, classify as MIXED
  const isMixedSerp = total >= 4 && maxCount / total < 0.6;
  if (isMixedSerp) {
    dominantIntent = 'OBSERVED_SERP_INTENT_MIXED';
  }

  const userIntent = userPageReport?.contentIntelligence?.searchIntent?.primaryIntent;

  let level: IntentAlignmentLevel = 'INSUFFICIENT_EVIDENCE';
  let explanation = `Sampled SERP for "${snapshot.query}" displays `;

  if (total === 0) {
    explanation += 'no organic results to evaluate search intent pattern.';
  } else if (isMixedSerp) {
    explanation += `a mixed search intent pattern (${Object.entries(distribution)
      .filter(([_, c]) => c > 0)
      .map(([k, v]) => `${k}: ${v}/${total}`)
      .join(', ')}).`;

    if (userIntent) {
      const userCount = distribution[userIntent] || 0;
      if (userCount > 0) {
        level = 'MODERATE_ALIGNMENT';
        explanation += ` The user page intent (${userIntent}) aligns with ${userCount}/${total} sampled results.`;
      } else {
        level = 'WEAK_ALIGNMENT';
        explanation += ` The user page intent (${userIntent}) was not commonly observed among sampled listings.`;
      }
    } else {
      level = 'MODERATE_ALIGNMENT';
    }
  } else {
    explanation += `predominantly ${dominantIntent} search intent (${maxCount}/${total} sampled results).`;

    if (userIntent) {
      if (userIntent === dominantIntent) {
        level = 'STRONG_ALIGNMENT';
        explanation += ` The user page intent (${userIntent}) strongly matches the observed search landscape.`;
      } else if (
        (userIntent === 'COMMERCIAL_INVESTIGATION' && dominantIntent === 'TRANSACTIONAL') ||
        (userIntent === 'TRANSACTIONAL' && dominantIntent === 'COMMERCIAL_INVESTIGATION')
      ) {
        level = 'MODERATE_ALIGNMENT';
        explanation += ` The user page intent (${userIntent}) partially complements the observed ${dominantIntent} landscape.`;
      } else {
        level = 'WEAK_ALIGNMENT';
        explanation += ` The user page intent (${userIntent}) diverges from the observed ${dominantIntent} pattern.`;
      }
    } else {
      level = 'STRONG_ALIGNMENT';
    }
  }

  return {
    query: snapshot.query,
    level,
    userPageIntent: userIntent,
    observedSerpIntentPattern: dominantIntent,
    intentDistribution: distribution,
    isMixedSerp,
    confidence: total >= 5 ? 'HIGH' : 'MEDIUM',
    explanation,
    provenance: snapshot.provenance,
  };
}

/**
 * Analyzes organic page type distribution in the SERP and compares against the user page archetype.
 */
export function analyzeSerpPageTypes(
  snapshot: NormalizedSerpSnapshot,
  userPageReport?: SEOReport
): PageTypeAlignment {
  const organicResults = snapshot.results.filter((r) => r.resultType === 'ORGANIC' || r.resultType === 'FEATURED_SNIPPET');
  const total = Math.max(1, organicResults.length);

  const distribution: Record<string, number> = {};
  for (const r of organicResults) {
    const pt = r.detectedPageType || 'ARTICLE';
    distribution[pt] = (distribution[pt] || 0) + 1;
  }

  let dominantType: PageType | 'MIXED_PAGE_TYPES' = 'ARTICLE';
  let maxCount = 0;
  for (const [pt, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = pt as PageType;
    }
  }

  const isMixed = total >= 4 && maxCount / total < 0.55;
  if (isMixed) {
    dominantType = 'MIXED_PAGE_TYPES';
  }

  const userPageType = userPageReport?.contentIntelligence?.pageType?.detectedType;
  let alignmentStatus: PageTypeAlignmentStatus = 'INSUFFICIENT_EVIDENCE';
  let explanation = `Sampled SERP for "${snapshot.query}" exhibits `;

  if (organicResults.length === 0) {
    explanation += 'insufficient organic results to establish page-type pattern.';
  } else if (dominantType === 'MIXED_PAGE_TYPES') {
    alignmentStatus = 'DIVERSE_SERP';
    explanation += `a diverse page-type distribution (${Object.entries(distribution)
      .map(([k, v]) => `${k}: ${v}/${total}`)
      .join(', ')}). Multiple content archetypes appear represented.`;
  } else {
    explanation += `predominantly ${dominantType} pages (${maxCount}/${total} sampled results).`;
    if (userPageType) {
      if (userPageType === dominantType) {
        alignmentStatus = 'ALIGNED';
        explanation += ` The user page type (${userPageType}) matches the dominant archetype in the SERP.`;
      } else {
        alignmentStatus = 'POTENTIAL_MISALIGNMENT';
        explanation += ` The user page type (${userPageType}) differs from the prevailing ${dominantType} format observed in the SERP.`;
      }
    }
  }

  return {
    query: snapshot.query,
    userPageType,
    observedDistribution: distribution,
    dominantType,
    alignmentStatus,
    explanation,
    provenance: snapshot.provenance,
  };
}

/**
 * Extracts and classifies recurring topic patterns across SERP snippets and optional deep competitor HTML.
 * Calibration Rule 5: Distinguishes SERP_SNIPPET_DERIVED vs FETCHED_PAGE_ANALYSIS vs HEADING_DERIVED.
 */
export function analyzeSerpTopicPatterns(
  snapshot: NormalizedSerpSnapshot,
  userPageReport?: SEOReport,
  deepCompetitors: CompetitorPageAnalysis[] = []
): SerpTopicPattern[] {
  const topicCounts = new Map<string, { count: number; snippets: string[]; fromFetched: boolean }>();
  const userTopics = new Set<string>();

  if (userPageReport) {
    const pTopics = userPageReport.contentIntelligence?.primaryTopics || [];
    const sTopics = userPageReport.contentIntelligence?.secondaryTopics || [];
    for (const t of pTopics) userTopics.add(t.topic.toLowerCase().trim());
    for (const t of sTopics) userTopics.add(t.topic.toLowerCase().trim());
  }

  // 1. Extract from SERP titles & snippets
  for (const item of snapshot.results) {
    const words = `${item.title} ${item.snippet}`
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    // Form 2-grams and 3-grams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const existing = topicCounts.get(bigram) || { count: 0, snippets: [], fromFetched: false };
      existing.count++;
      if (existing.snippets.length < 2 && item.snippet) {
        existing.snippets.push(item.snippet);
      }
      topicCounts.set(bigram, existing);

      if (i < words.length - 2) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        const existingTri = topicCounts.get(trigram) || { count: 0, snippets: [], fromFetched: false };
        existingTri.count++;
        if (existingTri.snippets.length < 2 && item.snippet) {
          existingTri.snippets.push(item.snippet);
        }
        topicCounts.set(trigram, existingTri);
      }
    }
  }

  // 2. Incorporate deep competitor page headings & extracted topics if present
  for (const comp of deepCompetitors) {
    for (const h of comp.headings) {
      const cleanH = h.toLowerCase().trim();
      if (cleanH.length > 2) {
        const hWords = cleanH.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);

        const existingFull = topicCounts.get(cleanH) || { count: 0, snippets: [], fromFetched: true };
        existingFull.count += 2;
        existingFull.fromFetched = true;
        if (existingFull.snippets.length < 2) {
          existingFull.snippets.push(`Heading from ${comp.domain}: "${h}"`);
        }
        topicCounts.set(cleanH, existingFull);

        for (let i = 0; i < hWords.length - 1; i++) {
          const bigram = `${hWords[i]} ${hWords[i + 1]}`;
          const existing = topicCounts.get(bigram) || { count: 0, snippets: [], fromFetched: false };
          existing.count += 2;
          existing.fromFetched = true;
          if (existing.snippets.length < 2) {
            existing.snippets.push(`Heading from ${comp.domain}: "${h}"`);
          }
          topicCounts.set(bigram, existing);

          if (i < hWords.length - 2) {
            const trigram = `${hWords[i]} ${hWords[i + 1]} ${hWords[i + 2]}`;
            const existingTri = topicCounts.get(trigram) || { count: 0, snippets: [], fromFetched: false };
            existingTri.count += 2;
            existingTri.fromFetched = true;
            topicCounts.set(trigram, existingTri);
          }
        }
      }
    }

    for (const top of comp.extractedTopics || []) {
      const cleanTop = top.toLowerCase().trim();
      if (cleanTop.length > 3) {
        const existing = topicCounts.get(cleanTop) || { count: 0, snippets: [], fromFetched: true };
        existing.count += 2;
        existing.fromFetched = true;
        topicCounts.set(cleanTop, existing);
      }
    }
  }

  const totalResults = Math.max(1, snapshot.results.length);
  const patterns: SerpTopicPattern[] = [];

  for (const [topic, data] of topicCounts.entries()) {
    if (data.count >= 2) {
      const percentage = Math.min(100, Math.round((data.count / totalResults) * 100));
      const isCoveredInUserPage = userTopics.has(topic) || (userPageReport?.onPage.title || '').toLowerCase().includes(topic);

      let category: SerpTopicPattern['category'] = 'OBSERVED_COMMON_TOPIC';
      if (!isCoveredInUserPage) {
        category = (data.count >= 2 || percentage >= 30) ? 'POTENTIAL_CONTENT_GAP' : 'POTENTIAL_SUPPORTING_TOPIC';
      }

      patterns.push({
        topic,
        frequency: data.count,
        percentage,
        isCoveredInUserPage,
        provenance: data.fromFetched ? 'FETCHED_PAGE_ANALYSIS' : 'SERP_SNIPPET_DERIVED',
        category,
        sampleSnippets: data.snippets,
      });
    }
  }

  // Sort by frequency descending
  return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 15);
}

/**
 * Aggregates recurring domains across all queried SERPs without asserting direct business competitor status.
 * Calibration Rule 7: Uses "Observed SERP Domain" terminology.
 */
export function aggregateObservedSerpDomains(
  snapshots: NormalizedSerpSnapshot[]
): ObservedSerpDomain[] {
  const domainMap = new Map<
    string,
    {
      domain: string;
      positions: number[];
      organicPositions: number[];
      urls: Set<string>;
      queries: Set<string>;
      pageTypes: Map<PageType, number>;
      provenance: ObservationProvenance;
    }
  >();

  for (const snap of snapshots) {
    for (const res of snap.results) {
      if (!res.domain) continue;

      let entry = domainMap.get(res.domain);
      if (!entry) {
        entry = {
          domain: res.domain,
          positions: [],
          organicPositions: [],
          urls: new Set(),
          queries: new Set(),
          pageTypes: new Map(),
          provenance: res.provenance,
        };
        domainMap.set(res.domain, entry);
      }

      entry.positions.push(res.serpPosition);
      if (res.organicPosition !== undefined) {
        entry.organicPositions.push(res.organicPosition);
      }
      entry.urls.add(res.url);
      entry.queries.add(snap.query);

      if (res.detectedPageType) {
        entry.pageTypes.set(res.detectedPageType, (entry.pageTypes.get(res.detectedPageType) || 0) + 1);
      }
    }
  }

  const result: ObservedSerpDomain[] = [];

  for (const [dom, data] of domainMap.entries()) {
    const avgSerp = Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10;
    const avgOrg = data.organicPositions.length > 0
      ? Math.round((data.organicPositions.reduce((a, b) => a + b, 0) / data.organicPositions.length) * 10) / 10
      : undefined;
    const bestPos = Math.min(...data.positions);

    let dominantPageType: PageType | undefined;
    let maxPtCount = 0;
    for (const [pt, count] of data.pageTypes.entries()) {
      if (count > maxPtCount) {
        maxPtCount = count;
        dominantPageType = pt;
      }
    }

    result.push({
      domain: dom,
      frequency: data.positions.length,
      averageSerpPosition: avgSerp,
      averageOrganicPosition: avgOrg,
      bestPosition: bestPos,
      urls: Array.from(data.urls).slice(0, 10),
      dominantPageType,
      observedQueries: Array.from(data.queries),
      provenance: data.provenance,
    });
  }

  return result.sort((a, b) => b.frequency - a.frequency);
}
