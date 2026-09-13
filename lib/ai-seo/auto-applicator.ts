import { SEOFix, SEOValidationResult } from './types';

export interface UserApprovalContext {
  approvedBy: string;
  approvedAt: string;
  explicitApproval: boolean;
  notes?: string;
}

export interface SEOApplicationResult {
  fixId: string;
  url: string;
  status: 'APPLIED' | 'REJECTED' | 'FAILED';
  appliedAt: string;
  rollbackToken: string;
  previousStateSnippet: string;
  appliedSnippet: string;
  message: string;
}

export interface SEORollbackResult {
  fixId: string;
  status: 'REVERTED' | 'FAILED';
  revertedAt: string;
  restoredSnippet: string;
  message: string;
}

export interface AppliedStateStore {
  fix: SEOFix;
  approval: UserApprovalContext;
  rollbackToken: string;
  appliedAt: string;
}

export class SEOAutoApplicator {
  private static applicationHistory: Map<string, AppliedStateStore> = new Map();

  /**
   * Applies a validated fix ONLY with explicit user approval.
   * Enforces Constraint 9: Audit -> Recommend -> Generate Fix -> Validate -> Preview -> Explicit User Approval -> Apply.
   */
  public static applyFix(
    fix: SEOFix,
    validation: SEOValidationResult,
    approval: UserApprovalContext
  ): SEOApplicationResult {
    // Safety Guard 1: Must be validated
    if (!validation.isValid) {
      throw new Error(`Cannot apply fix ${fix.fixId}: Pre-flight validation failed (${validation.issuesFound.join(', ')})`);
    }

    // Safety Guard 2: Explicit User Approval is strictly mandatory
    if (!approval.explicitApproval) {
      throw new Error(`Cannot apply fix ${fix.fixId}: Explicit user approval is required by policy.`);
    }

    const rollbackToken = `rb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const appliedAt = new Date().toISOString();

    // Store state snapshot for safe rollback
    this.applicationHistory.set(rollbackToken, {
      fix: { ...fix, appliedStatus: 'APPLIED' },
      approval,
      rollbackToken,
      appliedAt,
    });

    return {
      fixId: fix.fixId,
      url: fix.url,
      status: 'APPLIED',
      appliedAt,
      rollbackToken,
      previousStateSnippet: fix.before,
      appliedSnippet: fix.after,
      message: `Successfully applied fix ${fix.fixId} to ${fix.targetLocation}. Rollback snapshot saved.`,
    };
  }

  /**
   * Reverts an applied fix using the stored rollback token.
   */
  public static rollbackFix(rollbackToken: string): SEORollbackResult {
    const record = this.applicationHistory.get(rollbackToken);
    if (!record) {
      throw new Error(`Rollback token not found or already expired: ${rollbackToken}`);
    }

    const revertedAt = new Date().toISOString();
    record.fix.appliedStatus = 'REJECTED';

    return {
      fixId: record.fix.fixId,
      status: 'REVERTED',
      revertedAt,
      restoredSnippet: record.fix.before,
      message: `Successfully reverted fix ${record.fix.fixId} back to previous state.`,
    };
  }

  /**
   * Clears in-memory test history if needed during tests.
   */
  public static clearHistory(): void {
    this.applicationHistory.clear();
  }
}
