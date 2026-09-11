/**
 * SEO Intel Pro - Multi-Signal Primary Keyword Detector
 * Evaluates semantic prominence, title alignment, H1 matching, early appearance,
 * and contextual frequency to deterministically identify the primary keyword
 * along with a confidence score and verifiable evidence.
 */

import { CandidatePhrase } from './candidateGenerator';

export interface PrimaryKeywordDetectionResult {
  keyword: string;
  confidenceScore: number;
  evidence: string[];
}

export interface PrimaryDetectorInput {
  candidates: CandidatePhrase[];
  title: string;
  h1: string;
  metaDescription: string;
  totalWords: number;
}

/**
 * Determines the primary topic keyword and generates structured evidence.
 */
export function detectPrimaryKeyword(input: PrimaryDetectorInput): PrimaryKeywordDetectionResult {
  const { candidates, title, h1, metaDescription, totalWords } = input;

  if (!candidates || candidates.length === 0) {
    return {
      keyword: h1 || title || 'General Topic',
      confidenceScore: 50,
      evidence: ['Inferred from page metadata (no content candidates passed quality threshold)'],
    };
  }

  const titleLower = (title || '').toLowerCase();
  const h1Lower = (h1 || '').toLowerCase();
  const metaLower = (metaDescription || '').toLowerCase();

  let bestCandidate: CandidatePhrase | null = null;
  let bestScore = -1;
  let bestEvidence: string[] = [];

  for (const cand of candidates) {
    const p = cand.phrase.toLowerCase();
    const wordCount = cand.words.length;

    // Prefer 3-word and 2-word phrases for descriptive primary topic concepts
    let lengthMultiplier = 1.0;
    if (wordCount === 3) lengthMultiplier = 1.35;
    else if (wordCount === 2) lengthMultiplier = 1.30;
    else if (wordCount === 4) lengthMultiplier = 1.15;
    else if (wordCount === 1) lengthMultiplier = 0.90;
    else lengthMultiplier = 0.80;

    let score = 0;
    const evidence: string[] = [];

    // Title signal
    if (cand.inTitle || titleLower.includes(p)) {
      score += 35;
      evidence.push('Appears in the <title> tag');
    }

    // H1 signal
    if (cand.inH1 || h1Lower.includes(p)) {
      score += 30;
      evidence.push('Present in the primary H1 heading');
    }

    // Meta Description signal
    if (cand.inMeta || metaLower.includes(p)) {
      score += 15;
      evidence.push('Included in meta description');
    }

    // URL slug signal
    if (cand.inUrl) {
      score += 15;
      evidence.push('Reflected in the URL path');
    }

    // Positional prominence (early in body)
    if (cand.firstPosition < 50) {
      score += 15;
      evidence.push('Appears in the introductory section / lead paragraph');
    }

    // Frequency signal
    if (cand.frequency >= 5) {
      score += 20;
      evidence.push(`Repeated ${cand.frequency} times across the main content`);
    } else if (cand.frequency >= 2) {
      score += 10;
      evidence.push(`Present ${cand.frequency} times in the page content`);
    }

    // Quality score contribution
    score += (cand.qualityScore / 100) * 20;

    // Apply length multiplier
    const totalScore = score * lengthMultiplier;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = cand;
      bestEvidence = evidence;
    }
  }

  if (!bestCandidate) {
    return {
      keyword: candidates[0]?.phrase || title || 'Website Topic',
      confidenceScore: 60,
      evidence: ['Top ranked candidate by content quality score'],
    };
  }

  // Calculate normalized confidence score (50-98%)
  const confidenceScore = Math.min(98, Math.max(50, Math.round(bestScore / 1.4)));

  return {
    keyword: bestCandidate.phrase,
    confidenceScore,
    evidence: bestEvidence.length > 0 ? bestEvidence : ['High topical prominence in visible page content'],
  };
}
