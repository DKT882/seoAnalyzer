import {
  SEOReport,
  DuplicateTitleGroup,
  DuplicateMetaGroup,
  ContentSimilarityPair,
  PageType,
} from '@/types';
import { buildCrossPageRecommendation } from './recommendationBuilder';

function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Groups pages with identical or near-identical title tags.
 */
export function detectDuplicateTitles(pages: SEOReport[]): DuplicateTitleGroup[] {
  const groupsMap = new Map<
    string,
    {
      title: string;
      normalizedTitle: string;
      pages: Array<{ url: string; pageType: PageType; depth: number }>;
      rawTitles: Set<string>;
    }
  >();

  for (const page of pages) {
    const rawTitle = page.onPage.title?.trim();
    if (!rawTitle) continue;

    const norm = normalizeTextForComparison(rawTitle);
    if (!norm) continue;

    let group = groupsMap.get(norm);
    if (!group) {
      group = {
        title: rawTitle,
        normalizedTitle: norm,
        pages: [],
        rawTitles: new Set(),
      };
      groupsMap.set(norm, group);
    }

    const pageType = page.contentIntelligence?.pageType.detectedType || 'ARTICLE';
    group.pages.push({
      url: page.url,
      pageType,
      depth: 0,
    });
    group.rawTitles.add(rawTitle);
  }

  const result: DuplicateTitleGroup[] = [];
  let idCounter = 1;

  for (const group of groupsMap.values()) {
    if (group.pages.length >= 2) {
      const isExactMatch = group.rawTitles.size === 1;
      const urlsSample = group.pages.map((p) => p.url).slice(0, 4).join(', ');

      const recommendation = buildCrossPageRecommendation({
        observation: `${group.pages.length} pages share the ${isExactMatch ? 'exact same' : 'near-identical'} title tag: "${group.title}".`,
        evidence: `Affected URLs (${group.pages.length} total): ${urlsSample}`,
        interpretation: 'Shared titles make it harder for search engines and users to differentiate between these pages in search results and browser tabs.',
        action: 'Review whether these URLs serve distinct purposes. If they do, customize each title tag with page-specific differentiators (e.g. category, product attributes, or location).',
        expectedBenefit: 'Clearer search snippet differentiation and improved topical clarity for each distinct page.',
        caution: 'Do not automatically merge or redirect pages without verifying whether they serve distinct user search intents.',
      });

      result.push({
        id: `dup-title-${idCounter++}`,
        title: group.title,
        normalizedTitle: group.normalizedTitle,
        pages: group.pages,
        isExactMatch,
        recommendation,
      });
    }
  }

  return result.sort((a, b) => b.pages.length - a.pages.length);
}

/**
 * Groups pages with identical or near-identical meta descriptions.
 */
export function detectDuplicateMetaDescriptions(pages: SEOReport[]): DuplicateMetaGroup[] {
  const groupsMap = new Map<
    string,
    {
      metaDescription: string;
      normalizedMetaDescription: string;
      pages: Array<{ url: string; pageType: PageType; depth: number }>;
      rawMetas: Set<string>;
    }
  >();

  for (const page of pages) {
    const rawMeta = page.onPage.metaDescription?.trim();
    if (!rawMeta || rawMeta.length < 15) continue;

    const norm = normalizeTextForComparison(rawMeta);
    if (!norm) continue;

    let group = groupsMap.get(norm);
    if (!group) {
      group = {
        metaDescription: rawMeta,
        normalizedMetaDescription: norm,
        pages: [],
        rawMetas: new Set(),
      };
      groupsMap.set(norm, group);
    }

    const pageType = page.contentIntelligence?.pageType.detectedType || 'ARTICLE';
    group.pages.push({
      url: page.url,
      pageType,
      depth: 0,
    });
    group.rawMetas.add(rawMeta);
  }

  const result: DuplicateMetaGroup[] = [];
  let idCounter = 1;

  for (const group of groupsMap.values()) {
    if (group.pages.length >= 2) {
      const isExactMatch = group.rawMetas.size === 1;
      const urlsSample = group.pages.map((p) => p.url).slice(0, 4).join(', ');

      const recommendation = buildCrossPageRecommendation({
        observation: `${group.pages.length} pages share ${isExactMatch ? 'identical' : 'very similar'} meta descriptions.`,
        evidence: `Snippet: "${group.metaDescription.substring(0, 80)}..." across ${group.pages.length} URLs including ${urlsSample}`,
        interpretation: 'Duplicate meta descriptions reduce how clearly each page is differentiated in search engine results snippets.',
        action: 'Craft tailored meta descriptions highlighting the unique value and specific content of each page.',
        expectedBenefit: 'Higher search result preview clarity and improved click-through relevance.',
        caution: 'Meta description duplication is an optimization signal, not an algorithmic penalty.',
      });

      result.push({
        id: `dup-meta-${idCounter++}`,
        metaDescription: group.metaDescription,
        normalizedMetaDescription: group.normalizedMetaDescription,
        pages: group.pages,
        isExactMatch,
        recommendation,
      });
    }
  }

  return result.sort((a, b) => b.pages.length - a.pages.length);
}

/**
 * Detects pairwise content similarity using 3-gram shingles and Jaccard token overlap.
 */
export function detectContentSimilarityPairs(pages: SEOReport[]): ContentSimilarityPair[] {
  if (pages.length < 2) return [];

  const pageShingles = new Map<string, Set<string>>();

  // Extract 3-gram shingles from body keywords and headings
  for (const page of pages) {
    const shingles = new Set<string>();
    
    // Use keywords
    for (const kw of page.keywords.all) {
      const words = kw.keyword.toLowerCase().split(/\s+/).filter(Boolean);
      for (let i = 0; i <= words.length - 2; i++) {
        shingles.add(`${words[i]}_${words[i + 1]}`);
      }
      shingles.add(kw.keyword.toLowerCase());
    }

    // Use headings
    for (const h of page.onPage.headings.items) {
      const words = h.text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
      for (let i = 0; i <= words.length - 3; i++) {
        shingles.add(`${words[i]}_${words[i + 1]}_${words[i + 2]}`);
      }
    }

    pageShingles.set(page.normalizedUrl || page.url, shingles);
  }

  const result: ContentSimilarityPair[] = [];
  const limitComparisons = Math.min(pages.length, 100); // Bounded N to prevent runaway loops

  for (let i = 0; i < limitComparisons; i++) {
    for (let j = i + 1; j < limitComparisons; j++) {
      const pageA = pages[i];
      const pageB = pages[j];

      const urlA = pageA.normalizedUrl || pageA.url;
      const urlB = pageB.normalizedUrl || pageB.url;

      const setA = pageShingles.get(urlA) || new Set();
      const setB = pageShingles.get(urlB) || new Set();

      if (setA.size < 5 || setB.size < 5) continue;

      let intersectionCount = 0;
      const sharedNgrams: string[] = [];

      for (const shingle of Array.from(setA)) {
        if (setB.has(shingle)) {
          intersectionCount++;
          if (sharedNgrams.length < 6) {
            sharedNgrams.push(shingle.replace(/_/g, ' '));
          }
        }
      }

      const unionCount = setA.size + setB.size - intersectionCount;
      const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;
      const similarityScore = Math.round(jaccard * 100);

      if (similarityScore >= 50) {
        let similarityStatus: ContentSimilarityPair['similarityStatus'] = 'SIMILAR';
        if (similarityScore >= 85) {
          similarityStatus = 'DUPLICATE_LIKELY';
        } else if (similarityScore >= 70) {
          similarityStatus = 'NEAR_DUPLICATE';
        }

        const typeA = pageA.contentIntelligence?.pageType.detectedType || 'ARTICLE';
        const typeB = pageB.contentIntelligence?.pageType.detectedType || 'ARTICLE';

        const recommendation = buildCrossPageRecommendation({
          observation: `High content similarity (${similarityScore}%) observed between "${pageA.url}" and "${pageB.url}".`,
          evidence: `Shared phrases/shingles include: ${sharedNgrams.join(', ')}. Word counts: ${pageA.onPage.wordCount} vs ${pageB.onPage.wordCount}.`,
          interpretation: 'Significant overlapping content may dilute search relevance between these two pages or indicate templated/redundant copy.',
          action: 'Evaluate whether these URLs serve distinct user intents. If they do, expand distinct section content and unique value propositions. If they are accidental duplicate variants, consider canonicalization or 301 redirection.',
          expectedBenefit: 'Strengthens individual topical depth and prevents internal search competition.',
          caution: 'Do not automatically merge or delete pages without human review of their respective user conversion or informational goals.',
        });

        result.push({
          id: `sim-${i}-${j}`,
          pageA: { url: pageA.url, title: pageA.onPage.title || 'Untitled', wordCount: pageA.onPage.wordCount, pageType: typeA },
          pageB: { url: pageB.url, title: pageB.onPage.title || 'Untitled', wordCount: pageB.onPage.wordCount, pageType: typeB },
          similarityScore,
          similarityStatus,
          sharedNgrams,
          recommendation,
        });
      }
    }
  }

  return result.sort((a, b) => b.similarityScore - a.similarityScore);
}
