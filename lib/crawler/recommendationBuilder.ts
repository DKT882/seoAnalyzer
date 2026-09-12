import { CrossPageRecommendation } from '@/types';

/**
 * Builds a standardized, evidence-based cross-page recommendation.
 * Strictly adheres to the 6-pillar format:
 * Observation → Evidence → Interpretation → Action → Expected Benefit → Caution.
 */
export function buildCrossPageRecommendation(params: {
  observation: string;
  evidence: string;
  interpretation: string;
  action: string;
  expectedBenefit: string;
  caution: string;
}): CrossPageRecommendation {
  return {
    observation: params.observation.trim(),
    evidence: params.evidence.trim(),
    interpretation: params.interpretation.trim(),
    action: params.action.trim(),
    expectedBenefit: params.expectedBenefit.trim(),
    caution: params.caution.trim(),
  };
}
