import { SeoAction, SeoActionPlan, ActionComparisonResult } from './actionTypes';

/**
 * Compares two SeoActionPlans (Baseline vs Target) to evaluate progress and identify regressions.
 * 
 * Rules:
 * - Matching is performed via deterministic SHA-256 action fingerprints.
 * - Resolved actions: Present in baseline, absent or marked VERIFIED/IMPLEMENTED in target.
 * - New actions: Present in target, absent in baseline.
 * - Unchanged actions: Present in both with identical unresolved status.
 * - Never claims causal ranking guarantees.
 */
export function compareActionPlans(
  baselinePlan: SeoActionPlan,
  targetPlan: SeoActionPlan
): ActionComparisonResult {
  const baselineMap = new Map<string, SeoAction>();
  for (const act of baselinePlan.actions) {
    baselineMap.set(act.fingerprint, act);
  }

  const targetMap = new Map<string, SeoAction>();
  for (const act of targetPlan.actions) {
    targetMap.set(act.fingerprint, act);
  }

  const resolvedActions: SeoAction[] = [];
  const newActions: SeoAction[] = [];
  const unchangedActions: SeoAction[] = [];
  const statusChanges: ActionComparisonResult['statusChanges'] = [];

  // Check baseline actions against target
  for (const [fp, baseAct] of baselineMap.entries()) {
    const targetAct = targetMap.get(fp);

    if (!targetAct) {
      // Issue no longer detected in target audit -> Resolved!
      resolvedActions.push({
        ...baseAct,
        status: 'VERIFIED',
        updatedAt: new Date().toISOString()
      });
    } else {
      // Present in both
      if (targetAct.status === 'VERIFIED' || targetAct.status === 'IMPLEMENTED') {
        resolvedActions.push(targetAct);
      } else if (baseAct.status !== targetAct.status) {
        statusChanges.push({
          fingerprint: fp,
          actionId: targetAct.id,
          title: targetAct.title,
          fromStatus: baseAct.status,
          toStatus: targetAct.status
        });
      } else {
        unchangedActions.push(targetAct);
      }
    }
  }

  // Check target actions for newly introduced issues
  for (const [fp, targetAct] of targetMap.entries()) {
    if (!baselineMap.has(fp)) {
      newActions.push(targetAct);
    }
  }

  // Calculate progress metrics
  const totalTracked = baselinePlan.actions.length;
  const resolvedCount = resolvedActions.length;
  const progressPercentage = totalTracked > 0
    ? Math.round((resolvedCount / totalTracked) * 100)
    : 100;

  // Metric Deltas (Target minus Baseline)
  const baselineCrit = baselinePlan.priorityCounts.IMMEDIATE || 0;
  const targetCrit = targetPlan.priorityCounts.IMMEDIATE || 0;

  const baselineWarn = baselinePlan.priorityCounts.HIGH || 0;
  const targetWarn = targetPlan.priorityCounts.HIGH || 0;

  const metricDeltas = {
    criticalIssueDelta: targetCrit - baselineCrit,
    warningIssueDelta: targetWarn - baselineWarn,
    totalActionDelta: targetPlan.totalActions - baselinePlan.totalActions,
    averagePriorityDelta: Math.round((targetPlan.averagePriority - baselinePlan.averagePriority) * 10) / 10
  };

  return {
    baselinePlanId: baselinePlan.id,
    targetPlanId: targetPlan.id,
    comparedAt: new Date().toISOString(),
    resolvedActions,
    newActions,
    unchangedActions,
    progressPercentage,
    statusChanges,
    metricDeltas
  };
}
