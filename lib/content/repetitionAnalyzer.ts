import {
  ContentBlock,
  ContentRepetitionResult,
  RepetitivePhraseItem,
} from '@/types';

/**
 * Analyzes content for sentence duplication, unnatural phrase repetition, and vocabulary diversity.
 * Calibrated to avoid penalizing legitimate technical specifications, model numbers, or natural brand names.
 */
export function analyzeContentRepetition(
  blocks: ContentBlock[],
  mainContentText: string
): ContentRepetitionResult {
  const mainBlocks = blocks.filter((b) => b.isMainContent && b.type === 'paragraph');
  const repetitivePhrases: RepetitivePhraseItem[] = [];

  // 1. Exact Sentence Duplication Detection
  const sentenceMap = new Map<string, { count: number; locations: string[] }>();
  let duplicateSentencesCount = 0;

  mainBlocks.forEach((b, blockIdx) => {
    const rawSentences = b.text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 25);
    rawSentences.forEach((sentence) => {
      const normalized = sentence.toLowerCase().replace(/\s+/g, ' ');
      // Exclude short copyright/boilerplate snippets
      if (normalized.includes('rights reserved') || normalized.includes('terms of service')) return;

      let entry = sentenceMap.get(normalized);
      if (!entry) {
        entry = { count: 0, locations: [] };
        sentenceMap.set(normalized, entry);
      }
      entry.count += 1;
      entry.locations.push(`Block #${blockIdx + 1}`);
    });
  });

  sentenceMap.forEach((val, sentence) => {
    if (val.count >= 2) {
      duplicateSentencesCount += (val.count - 1);
      if (repetitivePhrases.length < 5) {
        repetitivePhrases.push({
          phrase: sentence.length > 60 ? `${sentence.slice(0, 57)}...` : sentence,
          occurrences: val.count,
          locations: val.locations,
          density: Math.round((val.count / Math.max(1, mainBlocks.length)) * 100) / 100,
          issueType: 'EXACT_REPETITION',
        });
      }
    }
  });

  // 2. Unnatural N-Gram Phrase Repetition (4-6 words repeated excessively)
  const words = mainContentText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const totalWords = words.length;
  const fourGramCounts = new Map<string, number>();

  if (totalWords > 40) {
    for (let i = 0; i < totalWords - 3; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
      fourGramCounts.set(phrase, (fourGramCounts.get(phrase) || 0) + 1);
    }
  }

  Array.from(fourGramCounts.entries())
    .filter(([_, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([phrase, count]) => {
      // Check if already covered
      if (!repetitivePhrases.some((rp) => rp.phrase.includes(phrase))) {
        repetitivePhrases.push({
          phrase,
          occurrences: count,
          locations: ['Main Content Body'],
          density: Math.round(((count * 4) / Math.max(1, totalWords)) * 1000) / 10,
          issueType: 'KEYWORD_STUFFING_SYMPTOM',
        });
      }
    });

  // 3. Vocabulary Diversity Score (Type-Token Ratio calibrated for length)
  const uniqueWords = new Set(words).size;
  let vocabularyDiversityScore = 100;
  if (totalWords > 30) {
    const ttr = uniqueWords / totalWords;
    // For short texts TTR is naturally higher, for longer texts it decreases logarithmically
    const expectedTtr = Math.max(0.25, 1 - Math.log10(Math.max(10, totalWords)) * 0.2);
    const relativeRatio = ttr / expectedTtr;
    vocabularyDiversityScore = Math.min(100, Math.max(20, Math.round(relativeRatio * 85)));
  }

  const isRepetitive = duplicateSentencesCount >= 2 || repetitivePhrases.some((p) => p.occurrences >= 4 && p.density > 5);

  let summary = '';
  if (!isRepetitive) {
    summary = 'Natural vocabulary distribution with healthy phrasing variation and no spam repetition detected.';
  } else {
    summary = `Detected ${duplicateSentencesCount} duplicated sentence instance(s) and ${repetitivePhrases.length} highly repetitive phrase pattern(s).`;
  }

  return {
    isRepetitive,
    repetitivePhrases,
    repetitiveSentencesCount: duplicateSentencesCount,
    vocabularyDiversityScore,
    summary,
  };
}
