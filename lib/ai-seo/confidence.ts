import { SEOEvidence, AIRecommendation } from './types';

export interface ConfidenceFactors {
  evidenceCount: number;
  hasDirectHtmlProof: boolean;
  hasMeasuredIssueMatch: boolean;
  hasSerpCorroboration: boolean;
  hasAmbiguity: boolean;
}

export class SEOConfidenceCalculator {
  /**
   * Calculates a deterministic confidence score (0.00 to 1.00) for an AI Recommendation.
   */
  public static calculateConfidence(
    rec: Partial<AIRecommendation>,
    evidence: SEOEvidence
  ): number {
    let baseConfidence = 0.70;

    const evidenceCount = rec.evidence?.length || 0;
    const observation = (rec.observation || '').toLowerCase();
    const recommendedAction = (rec.recommendedAction || '').toLowerCase();

    // Factor 1: Corroboration by direct measured evidence
    let directProof = false;
    if (evidence.technical) {
      if (evidence.technical.title?.isMissing && (observation.includes('title') || recommendedAction.includes('title'))) {
        directProof = true;
      }
      if (evidence.technical.headings?.h1Count === 0 && (observation.includes('h1') || recommendedAction.includes('h1'))) {
        directProof = true;
      }
      if (evidence.technical.canonicalUrl === null && observation.includes('canonical')) {
        directProof = true;
      }
      if (evidence.technical.robotsDirectives?.noindex && observation.includes('noindex')) {
        directProof = true;
      }
      if (!evidence.technical.mobile?.hasViewport && observation.includes('viewport')) {
        directProof = true;
      }
    }

    if (evidence.content) {
      if ((evidence.content.wordCount || 0) < 150 && (observation.includes('thin') || observation.includes('word count'))) {
        directProof = true;
      }
      if (evidence.content.topicGaps && evidence.content.topicGaps.length > 0 && observation.includes('topic')) {
        directProof = true;
      }
    }

    if (evidence.ecommerce?.isEcommercePage && !evidence.ecommerce.hasProductSchema && observation.includes('product schema')) {
      directProof = true;
    }

    if (directProof) {
      baseConfidence = 0.85;
    }

    // Factor 2: Number of supporting evidence items (+0.03 per point, max +0.12)
    const evidenceBonus = Math.min(evidenceCount * 0.03, 0.12);
    let confidence = baseConfidence + evidenceBonus;

    // Factor 3: Search/SERP corroboration
    if (evidence.serp?.intentAlignmentStatus === 'WEAK_ALIGNMENT' && observation.includes('intent')) {
      confidence += 0.05;
    }

    // Factor 4: Penalties for vague recommendations or high ambiguity
    if (rec.risk === 'high') {
      confidence -= 0.05; // Extra caution for risky changes
    }
    if (!rec.implementation?.proposedValue && !rec.implementation?.suggestedPattern) {
      confidence -= 0.08; // Vague implementation
    }

    // Clamp between 0.10 and 0.98 (never claim 100% infallible certainty for AI recommendations)
    const clamped = Math.max(0.1, Math.min(0.98, confidence));
    return Math.round(clamped * 100) / 100;
  }
}
