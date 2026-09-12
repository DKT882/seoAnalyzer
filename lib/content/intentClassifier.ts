import { ContentSearchIntent, SearchIntentAssessment, ConfidenceLevel, PageType } from '@/types';

interface IntentClassifierInput {
  pageType: PageType;
  title: string;
  metaDescription: string;
  h1Text?: string;
  mainContentText: string;
}

/**
 * Evaluates search intent alignment with conservative confidence.
 * Avoids rigid assumptions; explicitly accounts for mixed intents (e.g. informative product guides).
 */
export function classifySearchIntent(input: IntentClassifierInput): SearchIntentAssessment {
  const { pageType, title, metaDescription, h1Text, mainContentText } = input;
  const lowerTitle = (title || '').toLowerCase();
  const lowerDesc = (metaDescription || '').toLowerCase();
  const lowerH1 = (h1Text || '').toLowerCase();
  const lowerContent = (mainContentText || '').toLowerCase();
  const titleAndHeadings = `${lowerTitle} ${lowerDesc} ${lowerH1}`;

  const intentScores: Record<ContentSearchIntent, { score: number; signals: string[] }> = {
    INFORMATIONAL: { score: 0, signals: [] },
    COMMERCIAL_INVESTIGATION: { score: 0, signals: [] },
    TRANSACTIONAL: { score: 0, signals: [] },
    LOCAL: { score: 0, signals: [] },
    NAVIGATIONAL: { score: 0, signals: [] },
    MIXED: { score: 0, signals: [] },
    UNKNOWN: { score: 0, signals: [] },
  };

  // 1. Informational Signals
  const infoPatterns = ['how to', 'what is', 'guide to', 'tutorial', 'overview', 'explained', 'tips for', 'step by step', 'learn'];
  for (const pattern of infoPatterns) {
    if (titleAndHeadings.includes(pattern)) {
      intentScores.INFORMATIONAL.score += 4;
      intentScores.INFORMATIONAL.signals.push(`Informational indicator in heading/title: "${pattern}"`);
    }
  }
  if (pageType === 'ARTICLE' || pageType === 'DOCUMENTATION' || pageType === 'FAQ') {
    intentScores.INFORMATIONAL.score += 5;
    intentScores.INFORMATIONAL.signals.push(`Structural page type is ${pageType}`);
  }

  // 2. Commercial Investigation Signals
  const commInvPatterns = ['best', 'top 10', 'top 5', 'review', 'comparison', ' vs ', 'versus', 'pros and cons', 'alternatives to', 'buyer guide'];
  for (const pattern of commInvPatterns) {
    if (titleAndHeadings.includes(pattern)) {
      intentScores.COMMERCIAL_INVESTIGATION.score += 5;
      intentScores.COMMERCIAL_INVESTIGATION.signals.push(`Evaluation/Comparison marker: "${pattern}"`);
    }
  }
  if (lowerContent.includes('pros and cons') || lowerContent.includes('verdict') || lowerContent.includes('our recommendation')) {
    intentScores.COMMERCIAL_INVESTIGATION.score += 3;
    intentScores.COMMERCIAL_INVESTIGATION.signals.push('Comparative evaluation terminology in content body');
  }

  // 3. Transactional Signals
  const transPatterns = ['buy', 'order now', 'add to cart', 'discount', 'free shipping', 'coupon', 'checkout', 'pricing', 'subscribe now', 'purchase'];
  let transMatches = 0;
  for (const pattern of transPatterns) {
    if (titleAndHeadings.includes(pattern) || lowerContent.includes(pattern)) {
      transMatches++;
    }
  }
  if (transMatches >= 2) {
    intentScores.TRANSACTIONAL.score += Math.min(8, transMatches * 2);
    intentScores.TRANSACTIONAL.signals.push(`Direct commercial/transactional terms found (${transMatches} occurrences)`);
  }
  if (pageType === 'PRODUCT' || pageType === 'CATEGORY_PAGE') {
    intentScores.TRANSACTIONAL.score += 5;
    intentScores.TRANSACTIONAL.signals.push(`E-commerce page format (${pageType})`);
  }

  // 4. Local Signals
  if (pageType === 'LOCAL_BUSINESS' || titleAndHeadings.includes('near me') || lowerContent.includes('serving the greater') || lowerContent.includes('directions to our')) {
    intentScores.LOCAL.score += 6;
    intentScores.LOCAL.signals.push('Geographic location and service area indicators');
  }

  // 5. Navigational Signals
  if (pageType === 'HOMEPAGE' || titleAndHeadings.includes('login') || titleAndHeadings.includes('account portal') || pageType === 'CONTACT') {
    intentScores.NAVIGATIONAL.score += 4;
    intentScores.NAVIGATIONAL.signals.push('Brand gateway or dedicated utility navigation page');
  }

  // 6. Find Primary and Secondary Intents
  const sortedIntents = (Object.entries(intentScores) as [ContentSearchIntent, { score: number; signals: string[] }][])
    .filter(([k]) => k !== 'UNKNOWN' && k !== 'MIXED')
    .sort((a, b) => b[1].score - a[1].score);

  const top1 = sortedIntents[0];
  const top2 = sortedIntents[1];

  let primaryIntent: ContentSearchIntent = 'UNKNOWN';
  let secondaryIntent: ContentSearchIntent | undefined;
  let confidence: ConfidenceLevel = 'LOW';
  const finalSignals: string[] = [];

  if (top1 && top1[1].score >= 3) {
    // Check if closely balanced between informational and commercial/transactional
    if (top2 && top2[1].score >= 3 && top1[1].score - top2[1].score <= 2) {
      primaryIntent = 'MIXED';
      secondaryIntent = top1[0];
      confidence = 'MEDIUM';
      finalSignals.push(...top1[1].signals, ...top2[1].signals);
    } else {
      primaryIntent = top1[0];
      if (top2 && top2[1].score >= 3) {
        secondaryIntent = top2[0];
      }
      confidence = top1[1].score >= 8 ? 'HIGH' : top1[1].score >= 4 ? 'MEDIUM' : 'LOW';
      finalSignals.push(...top1[1].signals);
    }
  } else {
    primaryIntent = 'UNKNOWN';
    confidence = 'UNKNOWN';
    finalSignals.push('Insufficient query intent signals detected in visible page text');
  }

  let explanation = '';
  if (primaryIntent === 'UNKNOWN') {
    explanation = 'Search intent could not be conclusively determined from on-page textual indicators alone.';
  } else if (primaryIntent === 'MIXED') {
    explanation = `Page exhibits hybrid search intent characteristics (combining ${secondaryIntent} with secondary purchasing/educational pathways).`;
  } else {
    explanation = `Page content exhibits characteristics most aligned with ${primaryIntent} search intent (${confidence.toLowerCase()} confidence) based on observable on-page signals.`;
  }

  return {
    primaryIntent,
    secondaryIntent,
    confidence,
    signals: finalSignals,
    explanation,
  };
}
