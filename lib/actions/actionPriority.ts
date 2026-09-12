import {
  ActionSeverity,
  ActionEffort,
  ActionConfidence,
  ActionPriorityLevel
} from './actionTypes';

export interface PriorityCalculationParams {
  severity: ActionSeverity;
  affectedUrlsCount: number;
  effort: ActionEffort;
  confidence: ActionConfidence;
  blocksOtherActions?: boolean;
}

export interface PriorityCalculationResult {
  priorityScore: number;
  priorityLevel: ActionPriorityLevel;
  explanation: string;
  scoreBreakdown: {
    baseSeverityScore: number;
    scopeScore: number;
    effortScore: number;
    confidenceScore: number;
    dependencyScore: number;
    totalCalculated: number;
    clampedScore: number;
  };
}

/**
 * Calculates a transparent, deterministic Optimization Priority score (1-100).
 * 
 * Formula:
 * Optimization Priority = Base(Severity) + Scope(Affected URLs) + QuickWinBonus(Effort) + ConfidenceAdj + DependencyBonus
 * 
 * Clamped strictly between 1 and 100.
 */
export function calculateOptimizationPriority(params: PriorityCalculationParams): PriorityCalculationResult {
  // 1. Severity Base (10 - 50 points)
  let baseSeverityScore = 10;
  if (params.severity === 'CRITICAL') {
    baseSeverityScore = 50;
  } else if (params.severity === 'WARNING') {
    baseSeverityScore = 30;
  } else if (params.severity === 'INFO') {
    baseSeverityScore = 10;
  }

  // 2. Scope Weight (4 - 20 points)
  const count = Math.max(1, params.affectedUrlsCount || 1);
  let scopeScore = 4;
  if (count > 20) {
    scopeScore = 20;
  } else if (count >= 6) {
    scopeScore = 14;
  } else if (count >= 2) {
    scopeScore = 8;
  } else {
    scopeScore = 4;
  }

  // 3. Implementation Effort / Quick Win Bonus (0 - 15 points)
  // Lower effort with high severity represents higher ROI / immediate priority
  let effortScore = 0;
  if (params.effort === 'LOW') {
    effortScore = 15;
  } else if (params.effort === 'MEDIUM') {
    effortScore = 8;
  } else {
    effortScore = 0;
  }

  // 4. Evidence Confidence Adjustment (-5 to +10 points)
  let confidenceScore = 0;
  if (params.confidence === 'HIGH') {
    confidenceScore = 10;
  } else if (params.confidence === 'MEDIUM') {
    confidenceScore = 5;
  } else if (params.confidence === 'LOW') {
    confidenceScore = 0;
  } else if (params.confidence === 'INSUFFICIENT_EVIDENCE') {
    confidenceScore = -5;
  }

  // 5. Dependency Blocker Bonus (0 or 5 points)
  const dependencyScore = params.blocksOtherActions ? 5 : 0;

  const totalCalculated = baseSeverityScore + scopeScore + effortScore + confidenceScore + dependencyScore;
  const clampedScore = Math.max(1, Math.min(100, Math.round(totalCalculated)));

  // Priority Level
  let priorityLevel: ActionPriorityLevel = 'LOW';
  if (clampedScore >= 80) {
    priorityLevel = 'IMMEDIATE';
  } else if (clampedScore >= 60) {
    priorityLevel = 'HIGH';
  } else if (clampedScore >= 35) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  const explanation = `Optimization Priority ${clampedScore}/100 (${priorityLevel}): ` +
    `Base severity (${params.severity}: ${baseSeverityScore} pts) + ` +
    `Scope (${count} URL${count > 1 ? 's' : ''}: +${scopeScore} pts) + ` +
    `Effort ROI (${params.effort} effort: +${effortScore} pts) + ` +
    `Confidence (${params.confidence}: ${confidenceScore >= 0 ? '+' : ''}${confidenceScore} pts)` +
    (dependencyScore > 0 ? ` + Dependency blocker bonus (+${dependencyScore} pts)` : '') + '.';

  return {
    priorityScore: clampedScore,
    priorityLevel,
    explanation,
    scoreBreakdown: {
      baseSeverityScore,
      scopeScore,
      effortScore,
      confidenceScore,
      dependencyScore,
      totalCalculated,
      clampedScore
    }
  };
}
