import { KEYWORD_LOCATION_WEIGHTS } from '@/lib/constants';

export interface KeywordScoringInput {
  frequency: number;
  density: number;
  prominenceScore: number;
  internalTfIdf: number;
  inTitle: boolean;
  inH1: boolean;
  inH2H6: boolean;
  inMeta: boolean;
  inUrl: boolean;
  inAnchor: boolean;
  inAlt: boolean;
  inBody: boolean;
  wordCountInPhrase: number;
}

export interface KeywordScoringResult {
  overallScore: number;
  frequencyScore: number;
  locationScore: number;
  prominenceScore: number;
  stuffingPenalty: number;
  isStuffingRisk: boolean;
}

/**
 * Calculates a transparent, explainable SEO Keyword Relevance Score from 0 to 100.
 */
export function calculateKeywordScore(input: KeywordScoringInput): KeywordScoringResult {
  // 1. Frequency & TF-IDF Component (max 25 points)
  const logFreq = Math.log(1 + input.frequency);
  const tfIdfMultiplier = 1 + Math.min(2, input.internalTfIdf);
  const rawFreqScore = 6 * logFreq * tfIdfMultiplier;
  const frequencyScore = Math.min(25, Math.max(0, parseFloat(rawFreqScore.toFixed(2))));

  // 2. Positional Prominence (max 15 points)
  const prominenceScore = Math.min(15, Math.max(0, input.prominenceScore));

  // 3. Structural Location Weights (max 55 points)
  let locationScore = 0;
  if (input.inTitle) locationScore += KEYWORD_LOCATION_WEIGHTS.TITLE; // +25
  if (input.inH1) locationScore += KEYWORD_LOCATION_WEIGHTS.H1;       // +20
  if (input.inUrl) locationScore += KEYWORD_LOCATION_WEIGHTS.URL_SLUG; // +15
  if (input.inMeta) locationScore += KEYWORD_LOCATION_WEIGHTS.META_DESCRIPTION; // +10
  if (input.inH2H6) locationScore += KEYWORD_LOCATION_WEIGHTS.H2_H3;  // +10
  if (input.inBody) locationScore += KEYWORD_LOCATION_WEIGHTS.BODY_CONTENT; // +10
  if (input.inAnchor) locationScore += KEYWORD_LOCATION_WEIGHTS.ANCHOR_TEXT; // +5
  if (input.inAlt) locationScore += KEYWORD_LOCATION_WEIGHTS.IMAGE_ALT; // +5

  // 4. Keyword Overuse / Repetition Penalty (Multi-signal model)
  let stuffingPenalty = 0;
  let isStuffingRisk = false;

  if (input.density > 5.0 && (input.frequency >= 3 || input.density > 8.0)) {
    isStuffingRisk = true;
    stuffingPenalty = parseFloat((Math.min(30, (input.density - 5.0) * 8)).toFixed(1));
  }

  // 5. Total Aggregated & Bounded Score
  const rawTotal = frequencyScore + prominenceScore + locationScore - stuffingPenalty;
  const overallScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  return {
    overallScore,
    frequencyScore,
    locationScore,
    prominenceScore,
    stuffingPenalty,
    isStuffingRisk,
  };
}
