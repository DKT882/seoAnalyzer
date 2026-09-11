import 'server-only';
import {
  KeywordMarketData,
  SEOOpportunityBreakdown,
  SEOOpportunityFactor,
} from '../providers/seo/types';
import { KeywordCategory, SearchIntent } from '@/types';

export interface ScorerInput {
  keyword: string;
  category: KeywordCategory;
  internalRelevance: number; // 0-100
  qualityScore?: number; // 0-100
  frequency: number;
  coverageStatus: 'Strong' | 'Weak' | 'Missing';
  estimatedIntent?: SearchIntent;
  marketData?: KeywordMarketData | null;
}

export function calculateOpportunityScore(input: ScorerInput): SEOOpportunityBreakdown {
  const factors: SEOOpportunityFactor[] = [];
  const relevance = Math.max(0, Math.min(100, Math.round(input.internalRelevance)));

  factors.push({
    factor: 'Internal Topical Relevance',
    impact: relevance >= 70 ? 'POSITIVE' : relevance >= 40 ? 'NEUTRAL' : 'NEGATIVE',
    description: `Page semantic alignment score: ${relevance}/100`,
    weight: 0.4,
  });

  // Gap Bonus
  let gapBonus = 0;
  if (input.coverageStatus === 'Missing') {
    gapBonus = 20;
    factors.push({
      factor: 'Content Gap Opportunity',
      impact: 'POSITIVE',
      description: 'Term is missing from current page content (High expansion potential)',
      weight: 0.2,
    });
  } else if (input.coverageStatus === 'Weak') {
    gapBonus = 10;
    factors.push({
      factor: 'Content Under-Optimization',
      impact: 'POSITIVE',
      description: 'Term is mentioned weakly or missing from key heading/meta locations',
      weight: 0.1,
    });
  } else {
    factors.push({
      factor: 'Existing Strong Coverage',
      impact: 'NEUTRAL',
      description: 'Term is already well-covered on page',
      weight: 0.05,
    });
  }

  // Intent Alignment Bonus
  let intentBonus = 0;
  if (input.estimatedIntent === 'Commercial' || input.estimatedIntent === 'Transactional') {
    intentBonus = 8;
    factors.push({
      factor: 'High-Intent Alignment',
      impact: 'POSITIVE',
      description: `Target term exhibits ${input.estimatedIntent} user intent`,
      weight: 0.1,
    });
  } else if (input.estimatedIntent === 'Informational') {
    intentBonus = 5;
    factors.push({
      factor: 'Informational Authority Alignment',
      impact: 'POSITIVE',
      description: 'Supports informational thought leadership and topic depth',
      weight: 0.05,
    });
  }

  // Market Demand & Difficulty if external data exists
  let marketDemandScore: number | null = null;
  let difficultyScore: number | null = null;

  if (input.marketData && input.marketData.providerStatus === 'CONNECTED') {
    // Search Volume conversion (logarithmic scale)
    if (typeof input.marketData.searchVolume === 'number') {
      const vol = input.marketData.searchVolume;
      if (vol <= 0) {
        marketDemandScore = 10;
      } else if (vol < 50) {
        marketDemandScore = 30;
      } else if (vol < 500) {
        marketDemandScore = 55;
      } else if (vol < 2000) {
        marketDemandScore = 75;
      } else if (vol < 10000) {
        marketDemandScore = 90;
      } else {
        marketDemandScore = 100;
      }

      factors.push({
        factor: 'Verified Search Demand',
        impact: marketDemandScore >= 60 ? 'POSITIVE' : 'NEUTRAL',
        description: `Monthly Search Volume: ${vol.toLocaleString()} (Demand score: ${marketDemandScore}/100)`,
        weight: 0.25,
      });
    }

    // Keyword Difficulty (lower KD = higher opportunity)
    if (typeof input.marketData.keywordDifficulty === 'number') {
      const kd = input.marketData.keywordDifficulty;
      // Invert KD: KD 10 -> difficultyScore 90, KD 80 -> difficultyScore 20
      difficultyScore = Math.max(5, Math.min(100, Math.round(100 - kd)));

      factors.push({
        factor: 'Ranking Feasibility (KD)',
        impact: kd <= 35 ? 'POSITIVE' : kd <= 65 ? 'NEUTRAL' : 'NEGATIVE',
        description: `Keyword Difficulty: ${kd}/100 (Feasibility score: ${difficultyScore}/100)`,
        weight: 0.2,
      });
    }

    // Commercial CPC signal
    if (typeof input.marketData.cpc === 'number' && input.marketData.cpc > 0) {
      factors.push({
        factor: 'Commercial Value (CPC)',
        impact: 'POSITIVE',
        description: `Average CPC: $${input.marketData.cpc.toFixed(2)} (High advertiser monetization value)`,
        weight: 0.05,
      });
    }
  }

  // Calculate Final Score
  let finalScore: number;
  let explanation: string;

  if (marketDemandScore !== null && difficultyScore !== null) {
    // Weighted combination when full market data is available
    // 35% Internal Relevance + 25% Search Demand + 20% Feasibility (KD) + 10% Gap + 10% Intent
    const raw =
      relevance * 0.35 +
      marketDemandScore * 0.25 +
      difficultyScore * 0.2 +
      gapBonus * 0.5 +
      intentBonus * 1.0;

    finalScore = Math.max(10, Math.min(99, Math.round(raw)));
    explanation = `Comprehensive SEO Opportunity Score combining verified monthly search volume (${input.marketData?.searchVolume?.toLocaleString() || 'N/A'}), ranking feasibility (KD ${input.marketData?.keywordDifficulty ?? 'N/A'}/100), and internal page topical relevance (${relevance}/100).`;
  } else {
    // Honest Internal-only scoring
    // 60% Internal Relevance + Gap Bonus + Intent Bonus
    const raw = relevance * 0.7 + gapBonus * 1.0 + intentBonus * 1.0;
    finalScore = Math.max(10, Math.min(95, Math.round(raw)));
    explanation = `Topical SEO Opportunity Score derived from internal semantic relevance (${relevance}/100), content depth, and topic gap analysis. (External search demand data not connected).`;
  }

  return {
    finalScore,
    internalRelevance: relevance,
    marketDemandScore,
    difficultyScore,
    gapBonus,
    intentAlignmentBonus: intentBonus,
    explanation,
    factors,
  };
}
