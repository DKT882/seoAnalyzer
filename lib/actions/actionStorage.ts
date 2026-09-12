import {
  SeoAction,
  SeoActionPlan,
  ActionStatus,
  ActionPriorityLevel,
  ActionCategory
} from './actionTypes';
import { getDatabase } from '../db/database';
import { logger } from '../utils/logger';

export interface ListPlansOptions {
  domain?: string;
  limit?: number;
  offset?: number;
}

export interface SeoActionStore {
  savePlan(plan: SeoActionPlan): Promise<void>;
  getPlan(id: string): Promise<SeoActionPlan | null>;
  listPlans(options?: ListPlansOptions): Promise<SeoActionPlan[]>;
  deletePlan(id: string): Promise<boolean>;
  updateActionStatus(
    planId: string,
    actionId: string,
    status: ActionStatus,
    dismissalReason?: string
  ): Promise<SeoAction | null>;
  getAction(planId: string, actionId: string): Promise<SeoAction | null>;
}

// ==========================================
// 1. IN-MEMORY STORAGE IMPLEMENTATION
// ==========================================

export class MemorySeoActionStore implements SeoActionStore {
  private plans = new Map<string, SeoActionPlan>();

  async savePlan(plan: SeoActionPlan): Promise<void> {
    // Deep clone to prevent external mutation
    this.plans.set(plan.id, JSON.parse(JSON.stringify(plan)));
  }

  async getPlan(id: string): Promise<SeoActionPlan | null> {
    const plan = this.plans.get(id);
    if (!plan) return null;
    return JSON.parse(JSON.stringify(plan));
  }

  async listPlans(options?: ListPlansOptions): Promise<SeoActionPlan[]> {
    let result = Array.from(this.plans.values());
    if (options?.domain) {
      const d = options.domain.toLowerCase();
      result = result.filter(p => p.domain.toLowerCase() === d);
    }
    result.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return result.slice(offset, offset + limit).map(p => JSON.parse(JSON.stringify(p)));
  }

  async deletePlan(id: string): Promise<boolean> {
    return this.plans.delete(id);
  }

  async updateActionStatus(
    planId: string,
    actionId: string,
    status: ActionStatus,
    dismissalReason?: string
  ): Promise<SeoAction | null> {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const action = plan.actions.find(a => a.id === actionId);
    if (!action) return null;

    action.status = status;
    action.updatedAt = new Date().toISOString();
    if (status === 'DISMISSED') {
      action.dismissalReason = dismissalReason || 'Dismissed by user';
    } else {
      action.dismissalReason = undefined;
    }

    if (!action.statusHistory) {
      action.statusHistory = [];
    }
    action.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: dismissalReason
    });

    // Recalculate plan metrics
    this.recalculatePlanMetrics(plan);
    return JSON.parse(JSON.stringify(action));
  }

  async getAction(planId: string, actionId: string): Promise<SeoAction | null> {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    const action = plan.actions.find(a => a.id === actionId);
    if (!action) return null;
    return JSON.parse(JSON.stringify(action));
  }

  private recalculatePlanMetrics(plan: SeoActionPlan): void {
    const statusCounts: Record<ActionStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      IMPLEMENTED: 0,
      VERIFIED: 0,
      DISMISSED: 0
    };
    const priorityCounts: Record<ActionPriorityLevel, number> = {
      IMMEDIATE: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
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
      SITE_WIDE_ARCHITECTURE: 0
    };

    let totalPriority = 0;
    let destructive = 0;

    for (const a of plan.actions) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      priorityCounts[a.priorityLevel] = (priorityCounts[a.priorityLevel] || 0) + 1;
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      totalPriority += a.priority;
      if (a.isDestructive) destructive++;
    }

    plan.statusCounts = statusCounts;
    plan.priorityCounts = priorityCounts;
    plan.categoryCounts = categoryCounts;
    plan.totalActions = plan.actions.length;
    plan.destructiveActionCount = destructive;
    plan.averagePriority = plan.actions.length > 0
      ? Math.round((totalPriority / plan.actions.length) * 10) / 10
      : 0;
  }
}

// ==========================================
// 2. SQLITE STORAGE IMPLEMENTATION
// ==========================================

export class SqliteSeoActionStore implements SeoActionStore {
  async savePlan(plan: SeoActionPlan): Promise<void> {
    const db = getDatabase();
    const insertPlan = db.prepare(`
      INSERT OR REPLACE INTO seo_action_plans (
        id, domain, target_url, plan_json, total_actions, average_priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAction = db.prepare(`
      INSERT OR REPLACE INTO seo_actions (
        id, plan_id, fingerprint, category, severity, priority, priority_level, status,
        title, is_destructive, affected_urls_count, action_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertPlan.run(
        plan.id,
        plan.domain,
        plan.targetUrl || null,
        JSON.stringify(plan),
        plan.totalActions,
        plan.averagePriority,
        plan.generatedAt
      );

      // Clean old actions for this plan if updating
      db.prepare('DELETE FROM seo_actions WHERE plan_id = ?').run(plan.id);

      for (const act of plan.actions) {
        insertAction.run(
          act.id,
          plan.id,
          act.fingerprint,
          act.category,
          act.severity,
          act.priority,
          act.priorityLevel,
          act.status,
          act.title,
          act.isDestructive ? 1 : 0,
          act.affectedCount,
          JSON.stringify(act),
          act.createdAt,
          act.updatedAt
        );
      }
    });

    tx();
  }

  async getPlan(id: string): Promise<SeoActionPlan | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT plan_json FROM seo_action_plans WHERE id = ?').get(id) as { plan_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.plan_json);
    } catch (err) {
      logger.error(`Failed to parse plan_json for ${id}:`, err);
      return null;
    }
  }

  async listPlans(options?: ListPlansOptions): Promise<SeoActionPlan[]> {
    const db = getDatabase();
    let query = 'SELECT plan_json FROM seo_action_plans';
    const params: any[] = [];

    if (options?.domain) {
      query += ' WHERE LOWER(domain) = LOWER(?)';
      params.push(options.domain);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(options?.limit || 50, options?.offset || 0);

    const rows = db.prepare(query).all(...params) as Array<{ plan_json: string }>;
    const plans: SeoActionPlan[] = [];

    for (const r of rows) {
      try {
        plans.push(JSON.parse(r.plan_json));
      } catch (err) {
        logger.error('Failed to parse plan row in listPlans', err);
      }
    }
    return plans;
  }

  async deletePlan(id: string): Promise<boolean> {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM seo_action_plans WHERE id = ?').run(id);
    return res.changes > 0;
  }

  async updateActionStatus(
    planId: string,
    actionId: string,
    status: ActionStatus,
    dismissalReason?: string
  ): Promise<SeoAction | null> {
    const plan = await this.getPlan(planId);
    if (!plan) return null;

    const action = plan.actions.find(a => a.id === actionId);
    if (!action) return null;

    action.status = status;
    action.updatedAt = new Date().toISOString();
    if (status === 'DISMISSED') {
      action.dismissalReason = dismissalReason || 'Dismissed by user';
    } else {
      action.dismissalReason = undefined;
    }

    if (!action.statusHistory) {
      action.statusHistory = [];
    }
    action.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: dismissalReason
    });

    // Update in-memory plan counts and save
    const statusCounts: Record<ActionStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      IMPLEMENTED: 0,
      VERIFIED: 0,
      DISMISSED: 0
    };
    for (const a of plan.actions) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    }
    plan.statusCounts = statusCounts;

    await this.savePlan(plan);
    return action;
  }

  async getAction(planId: string, actionId: string): Promise<SeoAction | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT action_json FROM seo_actions WHERE plan_id = ? AND id = ?').get(planId, actionId) as { action_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.action_json);
    } catch {
      return null;
    }
  }
}

// Global default instance
let defaultStore: SeoActionStore | null = null;

export function getActionStore(): SeoActionStore {
  if (defaultStore) return defaultStore;
  defaultStore = new SqliteSeoActionStore();
  return defaultStore;
}

export function setActionStore(store: SeoActionStore): void {
  defaultStore = store;
}
