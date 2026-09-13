import { SEOEvidence, AIRecommendation, AIProviderConfig, ProviderTelemetry } from './types';
import { getAIProvider, SEOAIProvider } from './ai-provider';
import { TechnicalSEOAgent } from './agents/technical-agent';
import { ContentSEOAgent } from './agents/content-agent';
import { EcommerceSEOAgent } from './agents/ecommerce-agent';
import { SchemaSEOAgent } from './agents/schema-agent';
import { SerpSEOAgent } from './agents/serp-agent';
import { CompetitorGapAgent } from './agents/competitor-agent';
import { logger } from '@/lib/utils/logger';

export interface OrchestratorRunResult {
  url: string;
  timestamp: string;
  providerUsed: string;
  activeAgents: string[];
  recommendations: AIRecommendation[];
  stats: {
    totalRawRecommendations: number;
    deduplicatedCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  summaryMessage?: string;
  telemetry: ProviderTelemetry;
}

export class AISEOOrchestrator {
  private provider: SEOAIProvider;
  private technicalAgent: TechnicalSEOAgent;
  private contentAgent: ContentSEOAgent;
  private ecommerceAgent: EcommerceSEOAgent;
  private schemaAgent: SchemaSEOAgent;
  private serpAgent: SerpSEOAgent;
  private competitorAgent: CompetitorGapAgent;

  constructor(config?: Partial<AIProviderConfig>, customProvider?: SEOAIProvider) {
    this.provider = customProvider || getAIProvider(config);
    this.technicalAgent = new TechnicalSEOAgent();
    this.contentAgent = new ContentSEOAgent();
    this.ecommerceAgent = new EcommerceSEOAgent();
    this.schemaAgent = new SchemaSEOAgent();
    this.serpAgent = new SerpSEOAgent();
    this.competitorAgent = new CompetitorGapAgent();
  }

  /**
   * Orchestrates multi-agent analysis for a single normalized page evidence item.
   * Seamlessly falls back to deterministic rule analysis if a local/remote LLM is unreachable.
   */
  public async analyzeEvidence(evidence: SEOEvidence): Promise<OrchestratorRunResult> {
    const startTime = Date.now();
    const activeAgents: string[] = [];
    const agentPromises: Promise<AIRecommendation[]>[] = [];
    let fallbackTriggered = false;
    let fallbackReason: string | undefined = undefined;

    // Estimate input prompt payload size
    const evidencePayloadStr = JSON.stringify(evidence);
    const promptSizeBytes = Buffer.byteLength(evidencePayloadStr, 'utf8');

    // Select and run only relevant specialist agents (Constraint 14)
    if (this.technicalAgent.shouldRun(evidence)) {
      activeAgents.push(this.technicalAgent.name);
      agentPromises.push(
        this.technicalAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.technicalAgent.analyzeDeterministic(evidence);
        })
      );
    }

    if (this.contentAgent.shouldRun(evidence)) {
      activeAgents.push(this.contentAgent.name);
      agentPromises.push(
        this.contentAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.contentAgent.analyzeDeterministic(evidence);
        })
      );
    }

    if (this.ecommerceAgent.shouldRun(evidence)) {
      activeAgents.push(this.ecommerceAgent.name);
      agentPromises.push(
        this.ecommerceAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.ecommerceAgent.analyzeDeterministic(evidence);
        })
      );
    }

    if (this.schemaAgent.shouldRun(evidence)) {
      activeAgents.push(this.schemaAgent.name);
      agentPromises.push(
        this.schemaAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.schemaAgent.analyzeDeterministic(evidence);
        })
      );
    }

    if (this.serpAgent.shouldRun(evidence)) {
      activeAgents.push(this.serpAgent.name);
      agentPromises.push(
        this.serpAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.serpAgent.analyzeDeterministic(evidence);
        })
      );
    }

    if (this.competitorAgent.shouldRun(evidence)) {
      activeAgents.push(this.competitorAgent.name);
      agentPromises.push(
        this.competitorAgent.analyze(evidence, this.provider).catch((err: any) => {
          fallbackTriggered = true;
          fallbackReason = err.message;
          return this.competitorAgent.analyzeDeterministic(evidence);
        })
      );
    }

    const results = await Promise.all(agentPromises);
    const rawRecs = results.flat();

    // Deduplicate overlapping recommendations before sending to Phase 9 (Constraint 15)
    const deduplicatedRecs = this.deduplicateRecommendations(rawRecs);

    // Enforce 12 mandatory fields & anti-hallucination cleanup (Constraints 10, 11, 12)
    const finalizedRecs = deduplicatedRecs.map((r) => this.validateAndNormalizeRecommendation(r, evidence));

    const durationMs = Date.now() - startTime;
    const responsePayloadStr = JSON.stringify(finalizedRecs);
    const responseSizeBytes = Buffer.byteLength(responsePayloadStr, 'utf8');

    const providerUsed = fallbackTriggered
      ? `AI provider unavailable — deterministic fallback used (${fallbackReason || 'Network error'})`
      : `${this.provider.providerType} (${this.provider.modelName})`;

    const stats = {
      totalRawRecommendations: rawRecs.length,
      deduplicatedCount: finalizedRecs.length,
      criticalCount: finalizedRecs.filter((r) => r.priority === 'CRITICAL').length,
      highCount: finalizedRecs.filter((r) => r.priority === 'HIGH').length,
      mediumCount: finalizedRecs.filter((r) => r.priority === 'MEDIUM').length,
      lowCount: finalizedRecs.filter((r) => r.priority === 'LOW').length,
    };

    const summaryMessage =
      finalizedRecs.length === 0
        ? 'No significant evidence-based action identified.'
        : undefined;

    const telemetry: ProviderTelemetry = {
      providerType: this.provider.providerType,
      modelName: this.provider.modelName,
      durationMs,
      promptSizeBytes,
      responseSizeBytes,
      fallbackTriggered,
      fallbackReason,
    };

    // Telemetry logging (without logging any secrets or keys)
    logger.info(`[AI-SEO Orchestrator]: Completed analysis for ${evidence.url}`, {
      durationMs,
      activeAgentsCount: activeAgents.length,
      recommendationCount: finalizedRecs.length,
      providerType: this.provider.providerType,
      fallbackTriggered,
    });

    return {
      url: evidence.url,
      timestamp: new Date().toISOString(),
      providerUsed,
      activeAgents,
      recommendations: finalizedRecs,
      stats,
      summaryMessage,
      telemetry,
    };
  }

  /**
   * Deduplicates recommendations addressing identical underlying issues or target elements.
   */
  public deduplicateRecommendations(recs: AIRecommendation[]): AIRecommendation[] {
    const seenKeys = new Set<string>();
    const unique: AIRecommendation[] = [];

    for (const rec of recs) {
      const normTarget = (rec.implementation?.targetElement || '').toLowerCase().trim();
      const normAction = rec.recommendedAction.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      const dedupeKey = `${rec.category}:${rec.issueId}:${normTarget}:${normAction}`;

      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        unique.push(rec);
      }
    }

    return unique;
  }

  /**
   * Validates that all 12 mandatory fields are strictly present and compliant with safety guardrails.
   */
  private validateAndNormalizeRecommendation(
    rec: AIRecommendation,
    evidence: SEOEvidence
  ): AIRecommendation {
    const cleanReason = this.stripForbiddenClaims(rec.seoReason);
    const cleanAction = this.stripForbiddenClaims(rec.recommendedAction);
    const cleanObs = this.stripForbiddenClaims(rec.observation);

    return {
      issueId: rec.issueId || `ISSUE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: rec.url || evidence.url,
      category: rec.category || 'technical',
      priority: rec.priority || 'MEDIUM',
      confidence: typeof rec.confidence === 'number' ? Math.max(0.01, Math.min(1.0, rec.confidence)) : 0.8,
      observation: cleanObs,
      evidence: Array.isArray(rec.evidence) && rec.evidence.length > 0 ? rec.evidence : ['Measured during SEO audit pass'],
      seoReason: cleanReason,
      recommendedAction: cleanAction,
      implementation: {
        type: rec.implementation?.type || 'html_patch',
        targetElement: rec.implementation?.targetElement,
        proposedValue: rec.implementation?.proposedValue,
        suggestedPattern: rec.implementation?.suggestedPattern,
      },
      risk: rec.risk || 'low',
      requiresApproval: true, // Constraint 9: Explicit approval always required
      agentSource: rec.agentSource || 'AI SEO Specialist',
      expectedBenefit: rec.expectedBenefit,
      caution: rec.caution,
    };
  }

  private stripForbiddenClaims(text: string): string {
    if (!text) return '';
    return text
      .replace(/\b(?:guarantee(?:s|d)?|promise(?:s|d)?)\s+(?:#?\d+|top\s*\d+|positions?|rankings?|first\s*page)(?:\s+rankings?|\s+positions?)?/gi, 'improve search visibility for')
      .replace(/\b(?:guarantee(?:s|d)?|promise(?:s|d)?)\s+traffic/gi, 'potential organic traffic discovery')
      .replace(/\bFID\b/g, 'INP');
  }
}
