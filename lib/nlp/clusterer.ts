import { KeywordItem, TopicCluster, EntityItem } from '@/types';
import { stemWord } from './stemmer';

/**
 * Deterministically clusters keywords into Topic Clusters based on root stems and phrase overlap.
 */
export function clusterKeywords(keywords: KeywordItem[]): TopicCluster[] {
  const clustersMap = new Map<string, KeywordItem[]>();

  for (const kw of keywords) {
    // Identify primary stem anchor
    const words = kw.keyword.split(' ');
    const primaryStem = stemWord(words[0]);

    const clusterKey = primaryStem.length >= 3 ? primaryStem : kw.keyword;
    const existing = clustersMap.get(clusterKey) || [];
    existing.push(kw);
    clustersMap.set(clusterKey, existing);
  }

  const clusters: TopicCluster[] = [];

  for (const [stem, kws] of clustersMap.entries()) {
    if (kws.length >= 2 || kws.some((k) => k.overallScore >= 60)) {
      // Pick best display name for the cluster (the highest scoring keyword in cluster)
      const sorted = [...kws].sort((a, b) => b.overallScore - a.overallScore);
      const clusterName = sorted[0].keyword;
      const totalFreq = kws.reduce((sum, k) => sum + k.frequency, 0);
      const avgScore = parseFloat(
        (kws.reduce((sum, k) => sum + k.overallScore, 0) / kws.length).toFixed(1)
      );

      clusters.push({
        name: clusterName,
        keywords: kws.map((k) => k.keyword),
        totalFrequency: totalFreq,
        averageScore: avgScore,
      });
    }
  }

  // Sort clusters by average score descending
  return clusters.sort((a, b) => b.averageScore - a.averageScore).slice(0, 12);
}

/**
 * Extracts potential Named Entities (Proper nouns, brand terms, tech stacks) from document text.
 */
export function extractEntities(rawText: string, keywords: KeywordItem[]): EntityItem[] {
  const entityCounts = new Map<string, number>();

  // Regex matching Title Cased 2-3 word entity candidates (e.g. "Google Search", "Next.js", "United States")
  const entityRegex = /\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){1,2}\b/g;
  let match: RegExpExecArray | null;

  while ((match = entityRegex.exec(rawText)) !== null) {
    const entity = match[0].trim();
    if (entity.length > 3 && !/^(The|This|That|When|Where|What|How|Why|Then|There|Because)\b/i.test(entity)) {
      entityCounts.set(entity, (entityCounts.get(entity) || 0) + 1);
    }
  }

  const entities: EntityItem[] = [];

  for (const [name, count] of entityCounts.entries()) {
    if (count >= 2) {
      // Calculate relevance based on whether it appears in keywords
      const matchingKw = keywords.find((k) => k.keyword.toLowerCase() === name.toLowerCase());
      const relevance = matchingKw ? matchingKw.overallScore : Math.min(80, count * 15);

      entities.push({
        name,
        type: 'Organization / Topic Entity',
        occurrences: count,
        relevance: parseFloat(relevance.toFixed(1)),
      });
    }
  }

  return entities.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}
