import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class SerpSEOAgent {
  readonly name = 'SERP & Search Intelligence Specialist';
  readonly specialty = 'SERP Intent Alignment, Rich Snippet Opportunities, SERP Feature Gaps';

  shouldRun(evidence: SEOEvidence): boolean {
    // Constraint 14: Only run if SERP or search query evidence is available
    return !!evidence.serp?.targetQuery;
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (!this.shouldRun(evidence)) {
      return [];
    }

    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getSerpAgentPrompt();
    const userPrompt = `Analyze SERP search intelligence evidence for ${evidence.url}:\n${JSON.stringify(
      {
        serp: evidence.serp,
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
    const serp = evidence.serp;
    if (!serp || !this.shouldRun(evidence)) return recs;

    // Check 1: Search Intent Misalignment
    if (serp.intentAlignmentStatus === 'WEAK_ALIGNMENT') {
      const rec: AIRecommendation = {
        issueId: 'SERP-INTENT-MISALIGNMENT',
        url: evidence.url,
        category: 'serp',
        priority: 'HIGH',
        confidence: 0.85,
        observation: `Page search intent appears misaligned with observed search engine results for query "${serp.targetQuery}". Observed SERP pattern is ${serp.dominantSerpIntent}.`,
        evidence: [
          `Target Query: "${serp.targetQuery}"`,
          `Observed SERP Intent: ${serp.dominantSerpIntent}`,
          `Alignment Status: WEAK_ALIGNMENT`,
        ],
        seoReason: 'Pages matching the dominant user search intent have a much higher likelihood of meeting searcher satisfaction signals.',
        recommendedAction: `Adjust page framing and format to better serve ${serp.dominantSerpIntent} intent (e.g. guide/comparison vs transactional product).`,
        implementation: {
          type: 'content_edit',
          targetElement: 'main',
          suggestedPattern: `Refactor top-of-page content to directly answer ${serp.dominantSerpIntent} user intent before secondary sections.`,
        },
        risk: 'moderate',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 2: Missing Topics Observed in Top Search Results
    if (serp.missingCompetitorTopics && serp.missingCompetitorTopics.length > 0) {
      const missingList = serp.missingCompetitorTopics.slice(0, 3).join(', ');
      const rec: AIRecommendation = {
        issueId: 'SERP-MISSING-COMPETITOR-TOPICS',
        url: evidence.url,
        category: 'serp',
        priority: 'MEDIUM',
        confidence: 0.82,
        observation: `Search results for "${serp.targetQuery}" frequently feature coverage of: ${missingList}, which are missing from this page.`,
        evidence: [
          `Target Query: "${serp.targetQuery}"`,
          `Uncovered SERP Topics: ${missingList}`,
        ],
        seoReason: 'Covering key entities and subtopics observed across top search results improves contextual completeness.',
        recommendedAction: `Incorporate dedicated sections or FAQs covering ${missingList}.`,
        implementation: {
          type: 'content_edit',
          targetElement: 'article',
          suggestedPattern: `Add structured answers for: ${missingList}.`,
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
      issueId: raw.issueId || `SERP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'serp',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed SERP search intelligence opportunity.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in external search intelligence audit'],
      seoReason: raw.seoReason || 'Aligning with SERP patterns and user expectations enhances search visibility.',
      recommendedAction: raw.recommendedAction || 'Update page structure and content to match search intent.',
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
