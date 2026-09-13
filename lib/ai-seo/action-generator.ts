import {
  SeoAction,
  SeoActionPlan,
  ActionCategory,
  ActionSeverity,
  ActionEffort,
  ActionConfidence,
} from '@/lib/actions/actionTypes';
import { generateActionFingerprint } from '@/lib/actions/actionFingerprint';
import { evaluateActionSafety } from '@/lib/actions/actionSafety';
import { calculateOptimizationPriority } from '@/lib/actions/actionPriority';
import { resolveActionDependencies } from '@/lib/actions/actionDependencies';
import { consolidateActions } from '@/lib/actions/actionConsolidator';
import { AIRecommendation, SEOEvidence } from './types';

export class AIActionBridge {
  /**
   * Converts a structured AIRecommendation into a Phase 9 SeoAction item.
   */
  public static convertRecommendationToSeoAction(
    rec: AIRecommendation,
    targetDomain: string
  ): SeoAction {
    const category = this.mapCategoryToActionCategory(rec.category, rec.observation);
    const severity = this.mapPriorityToSeverity(rec.priority);
    const effort = this.estimateEffort(rec);
    const confidence = this.mapConfidence(rec.confidence);

    const safety = evaluateActionSafety({
      category,
      severity,
      title: rec.recommendedAction,
      actionText: rec.recommendedAction,
      affectedUrlsCount: 1,
      issueCode: rec.issueId,
    });

    const isDestructive = rec.risk === 'high' || safety.isDestructive;

    const actionObj: SeoAction = {
      id: `act-ai-${rec.issueId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      severity,
      priority: 50, // Will be calculated by Phase 9 priority engine
      priorityLevel: 'MEDIUM',
      title: rec.recommendedAction.length > 70 ? rec.recommendedAction.slice(0, 67) + '...' : rec.recommendedAction,
      observation: rec.observation,
      evidence: rec.evidence.map((ev) => ({
        source: rec.agentSource || 'AI_SEO_SPECIALIST',
        metric: 'AI Corroborated Evidence',
        observedValue: ev,
        url: rec.url,
      })),
      interpretation: rec.seoReason,
      action: rec.recommendedAction,
      expectedBenefit: rec.expectedBenefit || 'Improves technical search engine alignment and page user experience.',
      caution: rec.caution || (isDestructive ? 'Requires review before applying modifications.' : undefined),
      before: undefined,
      after: rec.implementation.proposedValue,
      effort,
      confidence,
      isDestructive,
      verificationSteps: rec.verificationChecklist && rec.verificationChecklist.length > 0
        ? rec.verificationChecklist
        : ['Verify changes in page source and validate in browser preview.'],
      nonDestructiveAlternative: safety.nonDestructiveAlternative,
      affectedUrls: [rec.url],
      affectedCount: 1,
      sourcePhase: 'CONSOLIDATED',
      issueCode: rec.issueId,
      dependencies: [],
      blockedBy: [],
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fingerprint: '',
      targetDomain,
    };

    actionObj.fingerprint = generateActionFingerprint({
      category: actionObj.category,
      issueCode: actionObj.issueCode,
      title: actionObj.title,
      affectedUrls: actionObj.affectedUrls,
      domain: targetDomain,
    });

    return actionObj;
  }

  /**
   * Enriches or builds a complete Phase 9 Action Plan integrating AI recommendations.
   * Phase 9 retains authoritative consolidation, DAG dependency ordering, and priority scores.
   */
  public static generateEnrichedActionPlan(options: {
    evidence: SEOEvidence;
    recommendations: AIRecommendation[];
    existingPlan?: SeoActionPlan;
    targetDomain?: string;
  }): SeoActionPlan {
    const domain = options.targetDomain || options.evidence.domain || 'example.com';
    const rawActions: SeoAction[] = options.existingPlan ? [...options.existingPlan.actions] : [];

    // Convert and append AI recommendations
    for (const rec of options.recommendations) {
      rawActions.push(this.convertRecommendationToSeoAction(rec, domain));
    }

    // Phase 9 Consolidation & Deduplication
    const consolidated = consolidateActions(rawActions);

    // Phase 9 Dependency Resolution (DAG topological sort)
    const dependencyOrdered = resolveActionDependencies(consolidated);

    // Phase 9 Priority Re-calculation with dependency blockers
    for (const act of dependencyOrdered) {
      const isBlocker = dependencyOrdered.some((other) => other.blockedBy.includes(act.id));
      const priorityResult = calculateOptimizationPriority({
        severity: act.severity,
        affectedUrlsCount: act.affectedCount,
        effort: act.effort,
        confidence: act.confidence,
        blocksOtherActions: isBlocker,
      });
      act.priority = priorityResult.priorityScore;
      act.priorityLevel = priorityResult.priorityLevel;
      act.priorityExplanation = priorityResult.explanation;
    }

    const planId = options.existingPlan?.id || `action-plan-ai-${Date.now().toString(36)}`;
    const statusCounts = { OPEN: 0, IN_PROGRESS: 0, IMPLEMENTED: 0, VERIFIED: 0, DISMISSED: 0 };
    const priorityCounts = { IMMEDIATE: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const categoryCounts: Record<ActionCategory, number> = {
      TECHNICAL_INDEXABILITY: 0,
      TECHNICAL_CANONICAL: 0,
      TECHNICAL_PERFORMANCE: 0,
      TECHNICAL_STRUCTURE: 0,
      CONTENT_DEPTH: 0,
      CONTENT_STRUCTURE: 0,
      SEMANTIC_TOPIC: 0,
      INTERNAL_LINKING: 0,
      SEARCH_SERP: 0,
      SITE_WIDE_ARCHITECTURE: 0,
    };

    let totalPriority = 0;
    let destructiveCount = 0;

    for (const a of dependencyOrdered) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      priorityCounts[a.priorityLevel] = (priorityCounts[a.priorityLevel] || 0) + 1;
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      totalPriority += a.priority;
      if (a.isDestructive) destructiveCount++;
    }

    const totalActions = dependencyOrdered.length;
    const averagePriority = totalActions > 0 ? Math.round(totalPriority / totalActions) : 0;

    return {
      id: planId,
      domain,
      targetUrl: options.evidence.url,
      generatedAt: new Date().toISOString(),
      sourceAudits: {
        pageAuditId: options.evidence.sourceAudits?.pageAuditId,
        crawlSessionId: options.evidence.sourceAudits?.crawlSessionId,
        searchAuditId: options.evidence.sourceAudits?.searchAuditId,
      },
      actions: dependencyOrdered,
      totalActions,
      statusCounts,
      priorityCounts,
      categoryCounts,
      averagePriority,
      destructiveActionCount: destructiveCount,
      summary: `SEO Action Plan synthesized with ${options.recommendations.length} AI specialist recommendations integrated into Phase 9 action engine.`,
    };
  }

  private static mapCategoryToActionCategory(
    category: string,
    observation: string
  ): ActionCategory {
    const text = `${category} ${observation}`.toLowerCase();
    if (text.includes('index') || text.includes('robots') || text.includes('noindex')) {
      return 'TECHNICAL_INDEXABILITY';
    }
    if (text.includes('canonical')) {
      return 'TECHNICAL_CANONICAL';
    }
    if (text.includes('performance') || text.includes('cwv') || text.includes('inp') || text.includes('lcp')) {
      return 'TECHNICAL_PERFORMANCE';
    }
    if (text.includes('link') || text.includes('orphan')) {
      return 'INTERNAL_LINKING';
    }
    if (text.includes('serp') || text.includes('search intent')) {
      return 'SEARCH_SERP';
    }
    if (text.includes('topic') || text.includes('gap') || text.includes('keyword')) {
      return 'SEMANTIC_TOPIC';
    }
    if (text.includes('content') || text.includes('thin') || text.includes('eeat') || text.includes('author')) {
      return 'CONTENT_DEPTH';
    }
    if (text.includes('schema') || text.includes('product') || text.includes('ecommerce') || text.includes('json-ld')) {
      return 'TECHNICAL_STRUCTURE';
    }
    return 'TECHNICAL_STRUCTURE';
  }

  private static mapPriorityToSeverity(priority: string): ActionSeverity {
    switch (priority) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'WARNING';
      case 'MEDIUM':
      case 'LOW':
      default:
        return 'INFO';
    }
  }

  private static estimateEffort(rec: AIRecommendation): ActionEffort {
    if (rec.implementation.type === 'metadata_update' || rec.implementation.type === 'schema_jsonld') {
      return 'LOW';
    }
    if (rec.implementation.type === 'html_patch' || rec.implementation.type === 'internal_link') {
      return 'MEDIUM';
    }
    return 'HIGH';
  }

  private static mapConfidence(score: number): ActionConfidence {
    if (score >= 0.85) return 'HIGH';
    if (score >= 0.65) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'INSUFFICIENT_EVIDENCE';
  }
}
