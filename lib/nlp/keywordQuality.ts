/**
 * SEO Intel Pro - Keyword Quality Score Engine (0-100)
 * Evaluates candidate phrases on lexical quality, grammatical coherence,
 * artifact absence, stopword balance, section prominence, and linguistic suitability.
 *
 * Minimum threshold: QUALITY_THRESHOLD = 60
 */

import { isArtifactOrGarbage, isLikelyArtifactToken } from './artifactFilter';
import { isStopWord, calculateStopwordRatio, isValidPhraseStructure, isQuestionStarter } from './stopwords';

export const QUALITY_THRESHOLD = 60;

export interface KeywordQualityContext {
  inTitle?: boolean;
  inH1?: boolean;
  inH2H6?: boolean;
  inMeta?: boolean;
  inMainContent?: boolean;
  inNavOnly?: boolean;
  inFooterOnly?: boolean;
  frequency?: number;
  wordCount?: number;
}

/**
 * Calculates a rigorous 0-100 Keyword Quality Score for a candidate keyword phrase.
 */
export function calculateKeywordQualityScore(
  phrase: string,
  context: KeywordQualityContext = {}
): number {
  if (!phrase || typeof phrase !== 'string') return 0;

  const clean = phrase.trim().toLowerCase();
  if (clean.length < 2) return 0;

  // 1. Artifact & Garbage Check (Hard rejection)
  if (isArtifactOrGarbage(clean)) {
    return 0;
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0 || wordCount > 6) {
    return 0;
  }

  // 2. Stopword & Grammatical Structure Check
  if (!isValidPhraseStructure(words)) {
    return 20; // Fails phrase structure
  }

  // 3. Base Score Allocation
  let score = 50;

  // 4. Lexical & Morphological Quality
  if (wordCount === 1) {
    const w = words[0];
    if (isStopWord(w) || isLikelyArtifactToken(w)) {
      return 0;
    }
    // High-value single terms (3-15 chars)
    if (w.length >= 3 && w.length <= 15) {
      score += 10;
    } else if (w.length === 2) {
      // 2-letter valid acronym
      score += 5;
    } else {
      score -= 10;
    }
  } else if (wordCount >= 2 && wordCount <= 4) {
    // 2 to 4 words is the sweet spot for search queries
    score += 15;
  } else if (wordCount >= 5) {
    // 5-6 words is long-tail; valid if question or natural phrase
    if (isQuestionStarter(words[0])) {
      score += 15;
    } else {
      score += 5;
    }
  }

  // 5. Stopword Ratio Adjustment
  const stopRatio = calculateStopwordRatio(words);
  if (stopRatio === 0) {
    score += 10; // Pure topical nouns/adjectives
  } else if (stopRatio <= 0.4) {
    score += 5; // Natural phrasing like "seo for beginners"
  } else if (stopRatio > 0.5) {
    score -= 20; // Too heavy on filler words
  }

  // 6. Section Prominence Bonuses
  if (context.inTitle) score += 15;
  if (context.inH1) score += 15;
  if (context.inH2H6) score += 10;
  if (context.inMeta) score += 8;
  if (context.inMainContent) score += 5;

  // 7. Frequency & Repetition
  const freq = context.frequency || 1;
  if (freq >= 4) {
    score += 10;
  } else if (freq >= 2) {
    score += 5;
  }

  // 8. Boilerplate & Isolation Penalties
  if (context.inNavOnly || context.inFooterOnly) {
    score -= 30;
  }

  // Clamp score to 0 - 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return finalScore;
}

/**
 * Validates whether a candidate passes the quality threshold for inclusion.
 */
export function passesQualityThreshold(
  phrase: string,
  context: KeywordQualityContext = {},
  threshold = QUALITY_THRESHOLD
): boolean {
  return calculateKeywordQualityScore(phrase, context) >= threshold;
}
