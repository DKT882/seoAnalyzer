'use client';

import React, { useState } from 'react';
import {
  SeoActionPlan,
  SeoAction,
  ActionStatus,
  ActionCategory,
  ActionSeverity
} from '@/lib/actions/actionTypes';

interface SeoActionCenterProps {
  plan: SeoActionPlan;
  onStatusChange?: (actionId: string, newStatus: ActionStatus, reason?: string) => Promise<void> | void;
  onRefresh?: () => void;
}

export const SeoActionCenter: React.FC<SeoActionCenterProps> = ({
  plan: initialPlan,
  onStatusChange,
  onRefresh
}) => {
  const [plan, setPlan] = useState<SeoActionPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<
    | 'priority'
    | 'technical'
    | 'content'
    | 'semantic'
    | 'linking'
    | 'serp'
    | 'site_wide'
    | 'completed'
  >('priority');

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ActionSeverity>('ALL');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [dismissingActionId, setDismissingActionId] = useState<string | null>(null);
  const [dismissalReason, setDismissalReason] = useState('');

  // Handle local status transition
  const handleStatusUpdate = async (actionId: string, newStatus: ActionStatus, reason?: string) => {
    if (newStatus === 'DISMISSED' && !reason) {
      setDismissingActionId(actionId);
      return;
    }

    // Update local state
    setPlan(prev => {
      const updatedActions = prev.actions.map(act => {
        if (act.id === actionId) {
          return {
            ...act,
            status: newStatus,
            dismissalReason: reason,
            updatedAt: new Date().toISOString()
          };
        }
        return act;
      });

      const statusCounts: Record<ActionStatus, number> = {
        OPEN: 0,
        IN_PROGRESS: 0,
        IMPLEMENTED: 0,
        VERIFIED: 0,
        DISMISSED: 0
      };
      for (const a of updatedActions) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      }

      return {
        ...prev,
        actions: updatedActions,
        statusCounts
      };
    });

    if (onStatusChange) {
      await onStatusChange(actionId, newStatus, reason);
    }
  };

  const submitDismissal = async (actionId: string) => {
    if (!dismissalReason.trim()) return;
    await handleStatusUpdate(actionId, 'DISMISSED', dismissalReason.trim());
    setDismissingActionId(null);
    setDismissalReason('');
  };

  // Filter actions based on tab, search, and severity
  const filteredActions = plan.actions.filter(act => {
    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchAction = act.action.toLowerCase().includes(q);
      const matchObservation = act.observation.toLowerCase().includes(q);
      if (!matchTitle && !matchAction && !matchObservation) return false;
    }

    // Severity filter
    if (severityFilter !== 'ALL' && act.severity !== severityFilter) {
      return false;
    }

    // Tab filter
    if (activeTab === 'completed') {
      return act.status === 'IMPLEMENTED' || act.status === 'VERIFIED' || act.status === 'DISMISSED';
    }

    // Active items only for other tabs
    if (act.status === 'IMPLEMENTED' || act.status === 'VERIFIED' || act.status === 'DISMISSED') {
      return false;
    }

    if (activeTab === 'priority') {
      return act.priorityLevel === 'IMMEDIATE' || act.priorityLevel === 'HIGH';
    }
    if (activeTab === 'technical') {
      return (
        act.category === 'TECHNICAL_INDEXABILITY' ||
        act.category === 'TECHNICAL_CANONICAL' ||
        act.category === 'TECHNICAL_PERFORMANCE' ||
        act.category === 'TECHNICAL_STRUCTURE'
      );
    }
    if (activeTab === 'content') {
      return act.category === 'CONTENT_DEPTH' || act.category === 'CONTENT_STRUCTURE';
    }
    if (activeTab === 'semantic') {
      return act.category === 'SEMANTIC_TOPIC';
    }
    if (activeTab === 'linking') {
      return act.category === 'INTERNAL_LINKING';
    }
    if (activeTab === 'serp') {
      return act.category === 'SEARCH_SERP';
    }
    if (activeTab === 'site_wide') {
      return act.affectedCount > 1 || act.category === 'SITE_WIDE_ARCHITECTURE';
    }

    return true;
  });

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              SEO Action Center & Optimization Workflow
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
              Phase 9 Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Target Domain: <span className="text-slate-200 font-mono font-semibold">{plan.domain}</span>
            {plan.targetUrl && <span className="ml-2 text-xs text-slate-500">({plan.targetUrl})</span>}
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2 self-start md:self-auto"
          >
            <span>🔄</span> Refresh Plan
          </button>
        )}
      </div>

      {/* METRIC GAUGES CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">Total Actions</div>
          <div className="text-2xl font-bold text-white mt-1">{plan.totalActions}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">{plan.statusCounts.VERIFIED + plan.statusCounts.IMPLEMENTED} resolved</span>
            <span>•</span>
            <span className="text-amber-400 font-medium">{plan.statusCounts.OPEN + plan.statusCounts.IN_PROGRESS} open</span>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-red-500/20 rounded-xl p-4">
          <div className="text-xs text-red-400 uppercase font-medium tracking-wider">Immediate Priority</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{plan.priorityCounts.IMMEDIATE || 0}</div>
          <div className="text-xs text-slate-400 mt-1">
            {plan.priorityCounts.HIGH || 0} high priority items
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">Avg Optimization Priority</div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">{plan.averagePriority} <span className="text-sm text-slate-400 font-normal">/ 100</span></div>
          <div className="text-xs text-slate-400 mt-1">Transparent impact weight</div>
        </div>

        <div className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-4">
          <div className="text-xs text-amber-400 uppercase font-medium tracking-wider">Destructive Safeguards</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{plan.destructiveActionCount}</div>
          <div className="text-xs text-slate-400 mt-1">Require staging verification</div>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-slate-800/80 border border-slate-700/60 rounded-xl p-4 text-sm text-slate-300 flex items-start gap-3">
        <span className="text-lg mt-0.5">📋</span>
        <div className="flex-1">
          <span className="font-semibold text-slate-200">Executive Summary: </span>
          {plan.summary}
        </div>
      </div>

      {/* NAVIGATION TABS & FILTER BAR */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'priority', label: '🔥 Priority Actions', count: (plan.priorityCounts.IMMEDIATE || 0) + (plan.priorityCounts.HIGH || 0) },
            { id: 'technical', label: '⚙️ Technical', count: plan.actions.filter(a => a.category.startsWith('TECHNICAL_') && a.status === 'OPEN').length },
            { id: 'content', label: '📝 Content', count: plan.actions.filter(a => a.category.startsWith('CONTENT_') && a.status === 'OPEN').length },
            { id: 'semantic', label: '🧠 Semantic', count: plan.actions.filter(a => a.category === 'SEMANTIC_TOPIC' && a.status === 'OPEN').length },
            { id: 'linking', label: '🔗 Internal Linking', count: plan.actions.filter(a => a.category === 'INTERNAL_LINKING' && a.status === 'OPEN').length },
            { id: 'serp', label: '🌐 SERP & Search', count: plan.actions.filter(a => a.category === 'SEARCH_SERP' && a.status === 'OPEN').length },
            { id: 'site_wide', label: '🏢 Site-Wide Grouped', count: plan.actions.filter(a => a.affectedCount > 1 && a.status === 'OPEN').length },
            { id: 'completed', label: '✅ Completed / Dismissed', count: plan.statusCounts.IMPLEMENTED + plan.statusCounts.VERIFIED + plan.statusCounts.DISMISSED }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-indigo-800 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* SEARCH AND SEVERITY CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Search actions or evidence..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-slate-400 font-medium">Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  severityFilter === sev
                    ? sev === 'CRITICAL' ? 'bg-red-600 text-white'
                      : sev === 'WARNING' ? 'bg-amber-600 text-white'
                      : sev === 'INFO' ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTION CARDS LIST */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <div className="text-3xl">🎉</div>
            <div className="text-sm font-semibold text-slate-300 mt-2">No actions found</div>
            <div className="text-xs text-slate-500 mt-1">
              All items in this view are resolved or no criteria matched the filter.
            </div>
          </div>
        ) : (
          filteredActions.map(act => {
            const isExpanded = expandedActionId === act.id;
            return (
              <div
                key={act.id}
                className={`bg-slate-800/40 border rounded-xl transition shadow-md overflow-hidden ${
                  act.isDestructive
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : act.severity === 'CRITICAL'
                    ? 'border-red-500/30 hover:border-red-500/50'
                    : 'border-slate-700/60 hover:border-slate-600'
                }`}
              >
                {/* ACTION CARD HEADER */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* PRIORITY BADGE */}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        act.priority >= 80 ? 'bg-red-950 text-red-300 border border-red-500/40' :
                        act.priority >= 60 ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                        act.priority >= 35 ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        Priority: {act.priority}/100 ({act.priorityLevel})
                      </span>

                      {/* SEVERITY BADGE */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.severity === 'CRITICAL' ? 'bg-red-900/60 text-red-200' :
                        act.severity === 'WARNING' ? 'bg-amber-900/60 text-amber-200' :
                        'bg-blue-900/60 text-blue-200'
                      }`}>
                        {act.severity}
                      </span>

                      {/* EFFORT */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Effort: {act.effort}
                      </span>

                      {/* AFFECTED URLS COUNT */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Scope: {act.affectedCount} URL{act.affectedCount > 1 ? 's' : ''}
                      </span>

                      {/* DESTRUCTIVE WARNING */}
                      {act.isDestructive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-200 border border-amber-500/40 flex items-center gap-1">
                          ⚠️ Destructive Action
                        </span>
                      )}

                      {/* BLOCKED BY */}
                      {act.blockedBy && act.blockedBy.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-600/40">
                          🔒 Blocked by {act.blockedBy.length} prerequisite{act.blockedBy.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-semibold text-white hover:text-indigo-300 transition cursor-pointer" onClick={() => setExpandedActionId(isExpanded ? null : act.id)}>
                      {act.title}
                    </h2>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      <span className="text-slate-300 font-medium">Observation: </span>
                      {act.observation}
                    </p>
                  </div>

                  {/* STATUS SELECTOR & TOGGLE */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <select
                      value={act.status}
                      onChange={e => handleStatusUpdate(act.id, e.target.value as ActionStatus)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none transition ${
                        act.status === 'VERIFIED' || act.status === 'IMPLEMENTED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' :
                        act.status === 'IN_PROGRESS' ? 'bg-blue-950/80 text-blue-300 border-blue-500/40' :
                        act.status === 'DISMISSED' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                    >
                      <option value="OPEN">🟡 OPEN</option>
                      <option value="IN_PROGRESS">🔵 IN PROGRESS</option>
                      <option value="IMPLEMENTED">🟢 IMPLEMENTED</option>
                      <option value="VERIFIED">✨ VERIFIED</option>
                      <option value="DISMISSED">⚪ DISMISSED</option>
                    </select>

                    <button
                      onClick={() => setExpandedActionId(isExpanded ? null : act.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                    >
                      {isExpanded ? 'Hide Details ▲' : 'View Action ▼'}
                    </button>
                  </div>
                </div>

                {/* DISMISSAL REASON MODAL / INLINE PROMPT */}
                {dismissingActionId === act.id && (
                  <div className="bg-slate-900/90 border-t border-b border-amber-500/40 p-4 space-y-3">
                    <div className="text-xs font-semibold text-amber-300">
                      Specify a reason for dismissing this recommendation:
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Page is deliberately restricted, or alternate technical solution implemented..."
                      value={dismissalReason}
                      onChange={e => setDismissalReason(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setDismissingActionId(null); setDismissalReason(''); }}
                        className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitDismissal(act.id)}
                        disabled={!dismissalReason.trim()}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded text-xs"
                      >
                        Confirm Dismissal
                      </button>
                    </div>
                  </div>
                )}

                {/* EXPANDABLE 6-PILLAR DETAILS */}
                {isExpanded && (
                  <div className="border-t border-slate-700/60 bg-slate-900/60 p-5 space-y-5 text-xs">
                    {/* DESTRUCTIVE ACTION SAFETY WARNING */}
                    {act.isDestructive && (
                      <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                          <span>⚠️</span> High-Risk Operation Safety Guard
                        </div>
                        <p className="text-amber-200/90">{act.caution}</p>
                        {act.nonDestructiveAlternative && (
                          <p className="text-xs text-slate-300 mt-1">
                            <span className="text-amber-400 font-medium">Safer Alternative: </span>
                            {act.nonDestructiveAlternative}
                          </p>
                        )}
                        {act.verificationSteps && act.verificationSteps.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="font-semibold text-slate-200">Staging Verification Checklist:</span>
                            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                              {act.verificationSteps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6-PILLAR GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* PILLAR 1 & 2: OBSERVATION & EVIDENCE */}
                      <div className="space-y-4">
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1.5">
                          <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>🔍</span> 1. Observation
                          </div>
                          <p className="text-slate-300 leading-relaxed">{act.observation}</p>
                        </div>

                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-2">
                          <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>📊</span> 2. Measured Evidence Provenance
                          </div>
                          <div className="space-y-1.5">
                            {act.evidence.map((ev, i) => (
                              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded p-2 text-[11px] font-mono">
                                <div className="flex justify-between text-slate-400">
                                  <span className="text-indigo-400">{ev.source}</span>
                                  <span>{ev.metric}</span>
                                </div>
                                <div className="text-slate-200 mt-1 font-sans">
                                  Observed: <span className="font-semibold">{String(ev.observedValue)}</span>
                                </div>
                                {ev.context && (
                                  <div className="text-slate-400 text-[10px] mt-0.5">{ev.context}</div>
                                )}
                                {ev.url && (
                                  <div className="text-slate-500 text-[10px] truncate mt-0.5">{ev.url}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* PILLAR 3 & 4: INTERPRETATION & ACTION */}
                      <div className="space-y-4">
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1.5">
                          <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>💡</span> 3. Interpretation & Why It Matters
                          </div>
                          <p className="text-slate-300 leading-relaxed">{act.interpretation}</p>
                        </div>

                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1.5">
                          <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>🛠️</span> 4. Exact Action to Take
                          </div>
                          <p className="text-emerald-300 leading-relaxed font-medium">{act.action}</p>
                        </div>
                      </div>
                    </div>

                    {/* BEFORE / AFTER PREVIEW (IF PRESENT) */}
                    {(act.before || act.after) && (
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-2">
                        <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>🔄</span> Safe Before / After Preview
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                          <div className="bg-red-950/30 border border-red-900/60 rounded p-2.5">
                            <div className="text-red-400 font-bold text-[10px] uppercase mb-1">Before (Observed):</div>
                            <div className="text-slate-300 break-all">{act.before || 'N/A'}</div>
                          </div>
                          <div className="bg-emerald-950/30 border border-emerald-900/60 rounded p-2.5">
                            <div className="text-emerald-400 font-bold text-[10px] uppercase mb-1">After (Target Pattern):</div>
                            <div className="text-slate-200 break-all">{act.after || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PILLAR 5 & 6: EXPECTED BENEFIT & CAUTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1">
                        <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>📈</span> 5. Expected Benefit
                        </div>
                        <p className="text-slate-300">{act.expectedBenefit}</p>
                      </div>

                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1">
                        <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>⚠️</span> 6. Safety & Caution
                        </div>
                        <p className="text-slate-300">{act.caution || 'Standard safe change. Minimal risk.'}</p>
                      </div>
                    </div>

                    {/* AFFECTED URLS LIST */}
                    {act.affectedUrls && act.affectedUrls.length > 0 && (
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 space-y-1.5">
                        <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
                          <span>🌐 Affected URLs ({act.affectedCount})</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                          {act.affectedUrls.map((u, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300 truncate">
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SeoActionCenter;
