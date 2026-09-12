import { SeoAction, ActionEvidenceItem } from './actionTypes';
import { generateActionFingerprint } from './actionFingerprint';
import { calculateOptimizationPriority } from './actionPriority';
import { evaluateActionSafety } from './actionSafety';

export interface ConsolidationOptions {
  maxUrlsPerAction?: number;
  maxEvidenceItems?: number;
}

const DEFAULT_MAX_URLS = 100;
const DEFAULT_MAX_EVIDENCE = 25;

/**
 * Normalizes an issue identifier for clustering overlapping findings.
 */
function getConsolidationKey(action: SeoAction): string {
  // If issueCode exists, use it
  if (action.issueCode) {
    return `${action.category}::code:${action.issueCode.toLowerCase().trim()}`;
  }

  // Otherwise normalize the title structure
  const normTitle = action.title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  // Internal link clustering
  if (
    action.category === 'INTERNAL_LINKING' &&
    (normTitle.includes('internal link') || normTitle.includes('contextual link') || normTitle.includes('orphan'))
  ) {
    if (normTitle.includes('orphan')) return 'INTERNAL_LINKING::orphan_candidates';
    return 'INTERNAL_LINKING::contextual_internal_links';
  }

  // Meta description clustering
  if (normTitle.includes('meta description')) {
    if (normTitle.includes('duplicate')) return 'TECHNICAL_STRUCTURE::duplicate_meta_descriptions';
    if (normTitle.includes('missing')) return 'TECHNICAL_STRUCTURE::missing_meta_descriptions';
  }

  // Title clustering
  if (normTitle.includes('title')) {
    if (normTitle.includes('duplicate')) return 'TECHNICAL_STRUCTURE::duplicate_titles';
    if (normTitle.includes('short') || normTitle.includes('long') || normTitle.includes('missing')) {
      return 'TECHNICAL_STRUCTURE::title_optimization';
    }
  }

  return `${action.category}::title:${normTitle}`;
}

/**
 * Consolidates duplicate or overlapping actions and groups repeated multi-page findings
 * into unified site-wide action cards with aggregated URL arrays and evidence provenance.
 */
export function consolidateActions(
  actions: SeoAction[],
  options: ConsolidationOptions = {}
): SeoAction[] {
  if (!actions || actions.length === 0) return [];

  const maxUrls = options.maxUrlsPerAction || DEFAULT_MAX_URLS;
  const maxEvidence = options.maxEvidenceItems || DEFAULT_MAX_EVIDENCE;

  const clusterMap = new Map<string, SeoAction[]>();

  // 1. Group actions by consolidation key
  for (const act of actions) {
    const key = getConsolidationKey(act);
    const existing = clusterMap.get(key) || [];
    existing.push(act);
    clusterMap.set(key, existing);
  }

  const consolidated: SeoAction[] = [];

  // 2. Merge each cluster
  for (const [key, cluster] of clusterMap.entries()) {
    if (cluster.length === 1) {
      // Single action, enforce bounds
      const single = { ...cluster[0] };
      single.affectedCount = single.affectedUrls.length;
      single.affectedUrls = single.affectedUrls.slice(0, maxUrls);
      single.evidence = single.evidence.slice(0, maxEvidence);
      consolidated.push(single);
      continue;
    }

    // Multiple actions in cluster - merge into unified action
    const primary = cluster[0];
    const allUrls = new Set<string>();
    const allEvidence: ActionEvidenceItem[] = [];
    const seenEvidenceKeys = new Set<string>();

    let highestSeverity = primary.severity;
    let worstEffort = primary.effort;
    let highestConfidence = primary.confidence;
    let anyDestructive = false;
    const allVerificationSteps = new Set<string>();

    for (const act of cluster) {
      // Collect URLs
      for (const u of act.affectedUrls) {
        allUrls.add(u);
      }

      // Collect Evidence without exact duplicates
      for (const ev of act.evidence) {
        const evKey = `${ev.source}::${ev.metric}::${String(ev.observedValue)}::${ev.url || ''}`;
        if (!seenEvidenceKeys.has(evKey)) {
          seenEvidenceKeys.add(evKey);
          allEvidence.push(ev);
        }
      }

      // Severity precedence: CRITICAL > WARNING > INFO
      if (act.severity === 'CRITICAL' || highestSeverity === 'CRITICAL') {
        highestSeverity = 'CRITICAL';
      } else if (act.severity === 'WARNING' || highestSeverity === 'WARNING') {
        highestSeverity = 'WARNING';
      }

      // Effort precedence: HIGH > MEDIUM > LOW
      if (act.effort === 'HIGH' || worstEffort === 'HIGH') {
        worstEffort = 'HIGH';
      } else if (act.effort === 'MEDIUM' || worstEffort === 'MEDIUM') {
        worstEffort = 'MEDIUM';
      }

      // Confidence precedence
      if (act.confidence === 'HIGH') {
        highestConfidence = 'HIGH';
      }

      if (act.isDestructive) {
        anyDestructive = true;
      }

      if (act.verificationSteps) {
        for (const step of act.verificationSteps) {
          allVerificationSteps.add(step);
        }
      }
    }

    const uniqueUrlsList = Array.from(allUrls);
    const totalAffectedCount = uniqueUrlsList.length;
    const boundedUrls = uniqueUrlsList.slice(0, maxUrls);
    const boundedEvidence = allEvidence.slice(0, maxEvidence);

    // Build unified title and observation
    let unifiedTitle = primary.title;
    if (totalAffectedCount > 1 && !unifiedTitle.toLowerCase().includes('site-wide') && !unifiedTitle.toLowerCase().includes('multiple')) {
      unifiedTitle = `${primary.title} (${totalAffectedCount} pages affected)`;
    }

    const unifiedObservation = totalAffectedCount > 1
      ? `Detected across ${totalAffectedCount} pages. ${primary.observation}`
      : primary.observation;

    // Safety re-evaluation
    const safety = evaluateActionSafety({
      category: primary.category,
      severity: highestSeverity,
      title: unifiedTitle,
      actionText: primary.action,
      affectedUrlsCount: totalAffectedCount,
      issueCode: primary.issueCode
    });

    // Priority re-calculation
    const priorityResult = calculateOptimizationPriority({
      severity: highestSeverity,
      affectedUrlsCount: totalAffectedCount,
      effort: worstEffort,
      confidence: highestConfidence
    });

    // Fingerprint
    const fingerprint = generateActionFingerprint({
      category: primary.category,
      issueCode: primary.issueCode || key,
      title: primary.title,
      affectedUrls: boundedUrls,
      primaryEvidenceKey: boundedEvidence[0]?.metric
    });

    const mergedAction: SeoAction = {
      id: `act-merged-${fingerprint.substring(0, 10)}`,
      category: primary.category,
      severity: highestSeverity,
      priority: priorityResult.priorityScore,
      priorityLevel: priorityResult.priorityLevel,
      priorityExplanation: priorityResult.explanation,
      title: unifiedTitle,
      observation: unifiedObservation,
      evidence: boundedEvidence,
      interpretation: primary.interpretation,
      action: primary.action,
      expectedBenefit: primary.expectedBenefit,
      caution: safety.caution || primary.caution,
      before: primary.before,
      after: primary.after,
      effort: worstEffort,
      confidence: highestConfidence,
      isDestructive: anyDestructive || safety.isDestructive,
      verificationSteps: allVerificationSteps.size > 0
        ? Array.from(allVerificationSteps)
        : safety.verificationSteps,
      nonDestructiveAlternative: safety.nonDestructiveAlternative || primary.nonDestructiveAlternative,
      affectedUrls: boundedUrls,
      affectedCount: totalAffectedCount,
      sourcePhase: cluster.length > 1 ? 'CONSOLIDATED' : primary.sourcePhase,
      issueCode: primary.issueCode,
      dependencies: [],
      blockedBy: [],
      status: 'OPEN',
      createdAt: primary.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fingerprint,
      targetDomain: primary.targetDomain
    };

    consolidated.push(mergedAction);
  }

  return consolidated;
}
