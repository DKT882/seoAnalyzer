/**
 * PHASE 9: SEO ACTION ENGINE & OPTIMIZATION WORKFLOW
 * Canonical Data Types and Taxonomy
 * 
 * Strict, non-fabricated, evidence-based data contracts for the SEO Action Layer.
 */

// ==========================================
// 1. ACTION CATEGORIES & SEVERITIES
// ==========================================

export type ActionCategory =
  | 'TECHNICAL_INDEXABILITY'
  | 'TECHNICAL_CANONICAL'
  | 'TECHNICAL_PERFORMANCE'
  | 'TECHNICAL_STRUCTURE'
  | 'CONTENT_DEPTH'
  | 'CONTENT_STRUCTURE'
  | 'SEMANTIC_TOPIC'
  | 'INTERNAL_LINKING'
  | 'SEARCH_SERP'
  | 'SITE_WIDE_ARCHITECTURE';

export type ActionSeverity =
  | 'CRITICAL'
  | 'WARNING'
  | 'INFO';

export type ActionPriorityLevel =
  | 'IMMEDIATE'  // 80 - 100
  | 'HIGH'       // 60 - 79
  | 'MEDIUM'     // 35 - 59
  | 'LOW';       // 1 - 34

export type ActionEffort =
  | 'LOW'        // Quick win, < 15 mins (e.g. meta tag, title tweak)
  | 'MEDIUM'     // Moderate, 1 - 2 hours (e.g. content paragraph, internal link addition)
  | 'HIGH';      // High effort, multi-hour/systemic (e.g. site architecture, content rewrite)

export type ActionConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_EVIDENCE';

export type ActionStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'VERIFIED'
  | 'DISMISSED';

export type ActionSourcePhase =
  | 'PHASE_1_KEYWORD'
  | 'PHASE_2_RULE'
  | 'PHASE_4_BROWSER'
  | 'PHASE_5_TECHNICAL'
  | 'PHASE_6_CONTENT'
  | 'PHASE_7_SITE_CRAWL'
  | 'PHASE_8_SEARCH_SERP'
  | 'CONSOLIDATED';

// ==========================================
// 2. EVIDENCE & AUDIT PROVENANCE
// ==========================================

export interface ActionEvidenceItem {
  source: ActionSourcePhase | string;
  metric: string;
  observedValue: string | number | boolean;
  expectedValue?: string | number | boolean;
  context?: string;
  url?: string;
  timestamp?: string;
}

// ==========================================
// 3. CORE SEO ACTION MODEL
// ==========================================

export interface SeoAction {
  id: string;
  category: ActionCategory;
  severity: ActionSeverity;
  
  /**
   * Transparent Optimization Priority score from 1 to 100.
   * Calculated deterministically from severity, affected URLs, effort, confidence, and blockers.
   * (NEVER named "Ranking Impact", "Ranking Probability", or "Google Score").
   */
  priority: number;
  priorityLevel: ActionPriorityLevel;
  priorityExplanation?: string;

  title: string;

  // 6 PILLARS OF EVIDENCE-BASED RECOMMENDATION
  observation: string;        // What was measured/detected
  evidence: ActionEvidenceItem[]; // Specific data points & provenance
  interpretation: string;     // Why this matters for search crawlers/users
  action: string;             // Concrete, actionable instructions to fix
  expectedBenefit: string;    // Technical/SEO outcome (NO ranking guarantees)
  caution?: string;           // Risk warnings if applicable

  // SAFE BEFORE / AFTER PREVIEW (Strictly evidence-supported, never fabricated)
  before?: string;
  after?: string;

  effort: ActionEffort;
  confidence: ActionConfidence;

  // SAFETY & VERIFICATION GUARDS
  isDestructive: boolean;
  verificationSteps: string[];
  nonDestructiveAlternative?: string;

  // AFFECTED SCOPE & DEPENDENCIES
  affectedUrls: string[];
  affectedCount: number;
  sourcePhase: ActionSourcePhase;
  issueCode?: string;

  dependencies: string[];     // IDs or fingerprints of actions that should be completed before this one
  blockedBy: string[];        // IDs of actions currently blocking this one

  // LIFECYCLE & TRACKING
  status: ActionStatus;
  dismissalReason?: string;
  statusHistory?: Array<{
    status: ActionStatus;
    timestamp: string;
    note?: string;
  }>;

  createdAt: string;
  updatedAt: string;
  fingerprint: string;        // Deterministic SHA-256 for audit deduplication
  targetDomain?: string;
}

// ==========================================
// 4. ACTION PLAN CONTAINER
// ==========================================

export interface SeoActionPlan {
  id: string;
  domain: string;
  targetUrl?: string;
  generatedAt: string;
  sourceAudits: {
    pageAuditId?: string;
    crawlSessionId?: string;
    searchAuditId?: string;
  };
  actions: SeoAction[];
  totalActions: number;
  statusCounts: Record<ActionStatus, number>;
  priorityCounts: Record<ActionPriorityLevel, number>;
  categoryCounts: Record<ActionCategory, number>;
  averagePriority: number;
  destructiveActionCount: number;
  summary: string;
  resourceLimitsEnforced?: {
    maxActions: number;
    maxUrlsPerAction: number;
    actionsTruncated: boolean;
  };
}

// ==========================================
// 5. AUDIT COMPARISON RESULT
// ==========================================

export interface ActionComparisonResult {
  baselinePlanId: string;
  targetPlanId: string;
  comparedAt: string;
  resolvedActions: SeoAction[];
  newActions: SeoAction[];
  unchangedActions: SeoAction[];
  progressPercentage: number;
  statusChanges: Array<{
    fingerprint: string;
    actionId: string;
    title: string;
    fromStatus: ActionStatus;
    toStatus: ActionStatus;
  }>;
  metricDeltas: {
    criticalIssueDelta: number;
    warningIssueDelta: number;
    totalActionDelta: number;
    averagePriorityDelta: number;
  };
  observedSerpDeltas?: Array<{
    query: string;
    previousPosition?: number;
    currentPosition?: number;
    timestamp: string;
    provenance: string;
  }>;
}
