import 'server-only';
import {
  SEOReport,
  KeywordItem,
  KeywordStrategyItem,
  SearchIntent,
  KeywordPlacementSuggestion,
  CompetitorComparisonReport,
} from '@/types';

/**
 * Infers estimated search intent from keyword tokens deterministically.
 */
export function inferSearchIntent(keyword: string): SearchIntent {
  const lower = keyword.toLowerCase().trim();

  // Transactional signals
  if (
    /\b(buy|order|purchase|pricing|price|cost|discount|coupon|deal|quote|shop|store|hire|book)\b/i.test(
      lower
    )
  ) {
    return 'Transactional';
  }

  // Commercial investigation signals
  if (
    /\b(best|top|vs|versus|compare|comparison|review|reviews|rating|rated|features|alternatives|guide to choosing)\b/i.test(
      lower
    )
  ) {
    return 'Commercial';
  }

  // Navigational signals
  if (/\b(login|signin|sign in|portal|official website|account|dashboard|download app)\b/i.test(lower)) {
    return 'Navigational';
  }

  // Informational signals
  if (
    /\b(how|what|why|when|where|who|guide|tutorial|tips|examples|definition|meaning|ideas|learn|overview|explained)\b/i.test(
      lower
    )
  ) {
    return 'Informational';
  }

  // Default to Informational or Mixed based on word count
  return lower.split(/\s+/).length > 2 ? 'Informational' : 'Mixed / Uncertain';
}

/**
 * Calculates internal analytical opportunity score (0-100).
 */
export function calculateInternalOpportunityScore(
  relevanceScore: number,
  currentCoverageRatio: number, // 0 to 1
  placementCount: number, // in title, h1, etc.
  isCompetitorGap = false
): number {
  // Higher opportunity if relevance is high but website coverage / placement is low or competitor is ranking
  const relevanceWeight = relevanceScore * 0.45;
  const coverageGapWeight = (1 - Math.min(1, currentCoverageRatio)) * 30;
  const placementGapWeight = Math.max(0, 15 - placementCount * 3);
  const competitorBonus = isCompetitorGap ? 10 : 0;

  return Math.min(100, Math.max(10, Math.round(relevanceWeight + coverageGapWeight + placementGapWeight + competitorBonus)));
}

/**
 * Generates natural placement suggestions without encouraging keyword stuffing.
 */
export function generateNaturalPlacementSuggestions(
  keyword: string,
  category: string,
  currentPlacements: { inTitle: boolean; inH1: boolean; inMeta: boolean; inBody: boolean }
): KeywordPlacementSuggestion[] {
  const suggestions: KeywordPlacementSuggestion[] = [];

  if (!currentPlacements.inTitle && (category === 'primary' || category === 'secondary')) {
    suggestions.push({
      location: 'Title',
      suggestion: `Integrate "${keyword}" naturally in the page title tag.`,
      naturalUsageNote: 'Place near the front of the title without repeating other keywords.',
    });
  }

  if (!currentPlacements.inH1 && category === 'primary') {
    suggestions.push({
      location: 'H1',
      suggestion: `Feature "${keyword}" in the main <h1> heading.`,
      naturalUsageNote: 'Craft an engaging main heading that accurately promises what the article delivers.',
    });
  }

  if (!currentPlacements.inMeta) {
    suggestions.push({
      location: 'Meta Description',
      suggestion: `Include "${keyword}" in the meta description snippet.`,
      naturalUsageNote: 'Write a persuasive benefit-driven sentence to improve search click-through rate.',
    });
  }

  suggestions.push({
    location: 'H2',
    suggestion: `Use "${keyword}" as a section heading or sub-topic breakdown.`,
    naturalUsageNote: 'Structure sections logically for easy scanning and topical depth.',
  });

  suggestions.push({
    location: 'Body',
    suggestion: `Mention "${keyword}" contextually within introductory or body paragraphs.`,
    naturalUsageNote: 'Ensure fluid, natural reading. Avoid forced repetitions.',
  });

  if (category === 'question' || keyword.includes('?')) {
    suggestions.push({
      location: 'FAQ',
      suggestion: `Add "${keyword}" as a dedicated FAQ question item.`,
      naturalUsageNote: 'Provide a direct 2–3 sentence answer followed by relevant context.',
    });
  }

  return suggestions;
}
