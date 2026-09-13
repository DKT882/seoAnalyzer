import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class ContentSEOAgent {
  readonly name = 'Content Intelligence Specialist';
  readonly specialty = 'Topical Depth, Search Intent Alignment, E-E-A-T Signals, Content Gaps';

  shouldRun(evidence: SEOEvidence): boolean {
    // Content agent runs if page has content or topic evidence
    return !!evidence.content || (evidence.technical?.statusCode === 200);
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getContentAgentPrompt();
    const userPrompt = `Analyze content SEO evidence for ${evidence.url}:\n${JSON.stringify(
      {
        content: evidence.content,
        keywords: evidence.keywords,
        rawIssues: evidence.rawIssuesSummary,
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
    const content = evidence.content;
    if (!content) return recs;

    // Check 1: Thin Content Detection (< 200 words on non-utility page)
    if ((content.wordCount || 0) < 200 && content.pageType !== 'CONTACT' && content.pageType !== 'LOGIN') {
      const rec: AIRecommendation = {
        issueId: 'CONTENT-THIN-BODY',
        url: evidence.url,
        category: 'content',
        priority: 'HIGH',
        confidence: 0.88,
        observation: `The page contains only ${content.wordCount || 0} words of main body text, indicating thin content.`,
        evidence: [`Measured wordCount: ${content.wordCount || 0}`, 'Threshold for substantive coverage: 300+ words'],
        seoReason: 'Thin content provides insufficient depth for search intent satisfaction and struggles to rank for competitive topic queries.',
        recommendedAction: 'Expand the primary body content with comprehensive explanations, practical steps, or structured FAQ sections.',
        implementation: {
          type: 'content_edit',
          targetElement: '<article>',
          suggestedPattern: 'Add 2-3 substantive paragraphs explaining core concepts and answering primary user questions.',
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 2: Topic Coverage Gaps
    if (content.topicGaps && content.topicGaps.length > 0) {
      const gapList = content.topicGaps.slice(0, 4).join(', ');
      const rec: AIRecommendation = {
        issueId: 'CONTENT-TOPIC-GAPS',
        url: evidence.url,
        category: 'content',
        priority: 'MEDIUM',
        confidence: 0.82,
        observation: `Detected topical gaps in page content compared to expected topic breadth: ${gapList}.`,
        evidence: [`Identified topic gaps: ${gapList}`, `Topic coverage score: ${content.topicCoverageScore ?? 'unmeasured'}`],
        seoReason: 'Addressing relevant subtopics signals topical completeness to search engines and satisfies diverse user search queries.',
        recommendedAction: `Create dedicated subsections or H2/H3 blocks addressing: ${gapList}.`,
        implementation: {
          type: 'content_edit',
          targetElement: 'main',
          proposedValue: `<!-- Suggested Subsections -->\n<h2>Key Details on ${content.topicGaps[0]}</h2>\n<p>Provide focused context and actionable details.</p>`,
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 3: E-E-A-T Author Transparency Signals
    const isArticle = evidence.pageType === 'ARTICLE' || evidence.pageType === 'BLOG_POST' || content.pageType === 'ARTICLE' || content.pageType === 'BLOG_POST';
    if (content.eEaTSignals && !content.eEaTSignals.hasAuthor && isArticle) {
      const rec: AIRecommendation = {
        issueId: 'CONTENT-EEAT-AUTHOR-MISSING',
        url: evidence.url,
        category: 'content',
        priority: 'MEDIUM',
        confidence: 0.85,
        observation: 'Informational article lacks explicit author byline or editorial attribution.',
        evidence: ['eEaTSignals.hasAuthor is false', 'Page classified as editorial article'],
        seoReason: 'Clear author attribution and editorial transparency reinforce E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) quality rater expectations.',
        recommendedAction: 'Add a clear author byline with author name, credentials, and link to author biography.',
        implementation: {
          type: 'html_patch',
          targetElement: 'header.article-header',
          proposedValue: '<div class="author-bio"><p>Written by <span class="author-name">Editorial Team</span></p></div>',
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
      issueId: raw.issueId || `CONTENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'content',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed content optimization opportunity.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in content intelligence audit'],
      seoReason: raw.seoReason || 'Content depth and search intent alignment improve search discoverability.',
      recommendedAction: raw.recommendedAction || 'Enrich page copy to satisfy target search intent.',
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
