import { SeoAction, ActionCategory } from './actionTypes';

/**
 * Checks if Action A is an evidence-based prerequisite for Action B.
 * 
 * Rules:
 * 1. TECHNICAL_INDEXABILITY blocks CONTENT_*, SEMANTIC_*, and INTERNAL_LINKING on the same affected URL(s).
 *    (Fixing content on a 404 or noindexed page is wasted effort until indexing is resolved).
 * 
 * 2. TECHNICAL_CANONICAL blocks INTERNAL_LINKING on non-canonical duplicate URLs.
 *    (Internal link anchors should not be adjusted until the authoritative canonical target is chosen).
 * 
 * 3. SITE_WIDE_ARCHITECTURE / CRAWL issues block deep orphan candidate linking.
 */
export function isActionDependency(prerequisite: SeoAction, dependent: SeoAction): boolean {
  // Never depend on oneself
  if (prerequisite.id === dependent.id || prerequisite.fingerprint === dependent.fingerprint) {
    return false;
  }

  // Check URL overlap
  const prereqUrls = new Set(prerequisite.affectedUrls.map(u => u.toLowerCase()));
  const hasUrlOverlap = dependent.affectedUrls.some(u => prereqUrls.has(u.toLowerCase()));

  // 1. Indexability blocks On-Page Content, Semantics, Structure, and Linking on the same page
  if (
    prerequisite.category === 'TECHNICAL_INDEXABILITY' &&
    (
      dependent.category === 'CONTENT_DEPTH' ||
      dependent.category === 'CONTENT_STRUCTURE' ||
      dependent.category === 'SEMANTIC_TOPIC' ||
      dependent.category === 'INTERNAL_LINKING' ||
      dependent.category === 'SEARCH_SERP'
    ) &&
    hasUrlOverlap
  ) {
    return true;
  }

  // 2. Canonical issues block internal link anchors or duplicate title/meta changes on duplicate URLs
  if (
    prerequisite.category === 'TECHNICAL_CANONICAL' &&
    (
      dependent.category === 'INTERNAL_LINKING' ||
      dependent.category === 'CONTENT_STRUCTURE' ||
      dependent.category === 'SEMANTIC_TOPIC'
    ) &&
    hasUrlOverlap
  ) {
    return true;
  }

  // 3. Site-wide crawl/robots blocking issues block site-wide link adjustments
  if (
    prerequisite.category === 'SITE_WIDE_ARCHITECTURE' &&
    prerequisite.severity === 'CRITICAL' &&
    dependent.category === 'INTERNAL_LINKING'
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves action dependencies across an entire action list:
 * - Populates `dependencies` and `blockedBy` arrays
 * - Performs cycle-safe topological sorting
 */
export function resolveActionDependencies(actions: SeoAction[]): SeoAction[] {
  if (!actions || actions.length === 0) return [];

  const actionMap = new Map<string, SeoAction>();
  for (const act of actions) {
    actionMap.set(act.id, act);
  }

  // 1. Establish dependency edges
  const dependencyGraph = new Map<string, Set<string>>(); // actionId -> Set of prerequisite actionIds
  const reverseGraph = new Map<string, Set<string>>();    // actionId -> Set of dependent actionIds

  for (const act of actions) {
    dependencyGraph.set(act.id, new Set());
    reverseGraph.set(act.id, new Set());
  }

  for (let i = 0; i < actions.length; i++) {
    for (let j = 0; j < actions.length; j++) {
      if (i === j) continue;
      const actA = actions[i];
      const actB = actions[j];

      if (isActionDependency(actA, actB)) {
        // actA is prerequisite for actB
        dependencyGraph.get(actB.id)!.add(actA.id);
        reverseGraph.get(actA.id)!.add(actB.id);
      }
    }
  }

  // 2. Populate dependencies and blockedBy fields on action objects
  for (const act of actions) {
    const prereqIds = Array.from(dependencyGraph.get(act.id) || []);
    act.dependencies = prereqIds;
    
    // An action is blockedBy any prerequisite that is NOT yet implemented or verified
    act.blockedBy = prereqIds.filter(prereqId => {
      const prereq = actionMap.get(prereqId);
      if (!prereq) return false;
      return prereq.status !== 'IMPLEMENTED' && prereq.status !== 'VERIFIED' && prereq.status !== 'DISMISSED';
    });
  }

  // 3. Topological sorting with cycle detection (Kahn's Algorithm + Priority secondary ordering)
  const inDegree = new Map<string, number>();
  for (const act of actions) {
    inDegree.set(act.id, dependencyGraph.get(act.id)!.size);
  }

  const queue: SeoAction[] = [];
  // Enqueue all nodes with inDegree 0, sorted by priority descending
  for (const act of actions) {
    if ((inDegree.get(act.id) || 0) === 0) {
      queue.push(act);
    }
  }
  queue.sort((a, b) => b.priority - a.priority);

  const sorted: SeoAction[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    sorted.push(current);

    // Decrease inDegree for dependents
    const dependents = reverseGraph.get(current.id) || new Set();
    const readyDependents: SeoAction[] = [];

    for (const depId of dependents) {
      const newDegree = (inDegree.get(depId) || 1) - 1;
      inDegree.set(depId, newDegree);
      if (newDegree === 0) {
        const depAct = actionMap.get(depId);
        if (depAct && !visited.has(depId)) {
          readyDependents.push(depAct);
        }
      }
    }

    if (readyDependents.length > 0) {
      readyDependents.sort((a, b) => b.priority - a.priority);
      queue.push(...readyDependents);
      // Keep queue sorted by priority for remaining root choices
      queue.sort((a, b) => b.priority - a.priority);
    }
  }

  // If cycle detected (some nodes were not visited), append remaining nodes sorted by priority
  if (sorted.length < actions.length) {
    const remaining = actions
      .filter(a => !visited.has(a.id))
      .sort((a, b) => b.priority - a.priority);
    sorted.push(...remaining);
  }

  return sorted;
}
