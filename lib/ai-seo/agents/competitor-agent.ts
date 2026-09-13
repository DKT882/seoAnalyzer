import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class CompetitorGapAgent {
  readonly name = 'Competitor Gap & Strategy Specialist';
  readonly specialty = 'Content Depth Gaps, Competitor Structural Differences';

  shouldRun(evidence: SEOEvidence): boolean {
    // Constraint 14: Only run if competitor gap evidence is present
    return Boolean(
      (evidence.competitors?.contentGapsVsTopRanked && evidence.competitors.contentGapsVsTopRanked.length > 0) ||
      (evidence.competitors?.topCompetitorUrls && evidence.competitors.topCompetitorUrls.length > 0)
    );
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (!this.shouldRun(evidence)) {
      return [];
    }

    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getCompetitorGapAgentPrompt();
    const userPrompt = `Analyze competitor gap evidence for ${evidence.url}:\n${JSON.stringify(
      {
        competitors: evidence.competitors,
        content: evidence.content,
      },
      null,
      2
    )}`;

    try {
      const recs = await provider.generateStructured<AIRecommendation[]>(
        systemPrompt,
        userPrompt,
        'Array of AIRecommendation objects matching the 12 required fields.'
      );

      if (Array.isArray(recs) && recs.length > 0) {
        return recs.map((r) => this.sanitizeRecommendation(r, evidence));
      }
    } catch (err) {
      throw err;
    }

    return this.analyzeDeterministic(evidence);
  }

  public analyzeDeterministic(evidence: SEOEvidence): AIRecommendation[] {
    const recs: AIRecommendation[] = [];
    const comp = evidence.competitors;
    if (!comp || !this.shouldRun(evidence)) return recs;

    // Check 1: Unaddressed Competitor Content Gaps
    if (comp.contentGapsVsTopRanked && comp.contentGapsVsTopRanked.length > 0) {
      const gapList = comp.contentGapsVsTopRanked.slice(0, 3).join(', ');
      const rec: AIRecommendation = {
        issueId: 'COMP-CONTENT-GAPS',
        url: evidence.url,
        category: 'content',
        priority: 'MEDIUM',
        confidence: 0.80,
        observation: `Identified topics covered by top-ranking competitor pages but omitted on this page: ${gapList}.`,
        evidence: [
          `Competitor Gaps: ${gapList}`,
          `Analyzed competitors: ${(comp.topCompetitorUrls || []).length} URLs`,
        ],
        seoReason: 'Bridging topical differences allows your page to match or exceed the depth provided by established competitor resources.',
        recommendedAction: `Expand content with substantive paragraphs addressing: ${gapList}.`,
        implementation: {
          type: 'content_edit',
          targetElement: 'main',
          suggestedPattern: `Add comprehensive coverage for: ${gapList}.`,
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    return recs;
  }

  private sanitizeRecommendation(raw: any, evidence: SEOEvidence): AIRecommendation {
    const rec: AIRecommendation = {
      issueId: raw.issueId || `COMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'content',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed competitor gap opportunity.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in competitor comparison audit'],
      seoReason: raw.seoReason || 'Closing competitor topical gaps improves competitive content quality.',
      recommendedAction: raw.recommendedAction || 'Add missing topics to enhance content depth.',
      implementation: {
        type: raw.implementation?.type || 'content_edit',
        targetElement: raw.implementation?.targetElement,
        proposedValue: raw.implementation?.proposedValue,
        suggestedPattern: raw.implementation?.suggestedPattern,
      },
      risk: ['low', 'moderate', 'high'].includes(raw.risk) ? raw.risk : 'low',
      requiresApproval: true,
      agentSource: this.name,
      expectedBenefit: raw.expectedBenefit,
      caution: raw.caution,
    };
    rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
    return rec;
  }
}
