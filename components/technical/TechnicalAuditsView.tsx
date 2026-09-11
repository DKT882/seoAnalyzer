'use client';

import { useState } from 'react';
import { SEOIssue } from '@/types';
import { IssueBadge } from '@/components/ui/IssueBadge';
import { ChevronDown, ChevronUp, AlertCircle, HelpCircle, Wrench } from 'lucide-react';

interface TechnicalAuditsViewProps {
  issues: SEOIssue[];
}

export function TechnicalAuditsView({ issues }: TechnicalAuditsViewProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity === 'all') return true;
    return i.severity === filterSeverity;
  });

  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const recCount = issues.filter((i) => i.severity === 'RECOMMENDATION').length;
  const goodCount = issues.filter((i) => i.severity === 'GOOD').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Tabs Header */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Technical SEO & On-Page Audits
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Evaluated <strong>{issues.length}</strong> automated SEO compliance checkpoints.
          </p>
        </div>

        {/* Severity Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${issues.length})` },
            { id: 'CRITICAL', label: `Critical (${criticalCount})`, color: 'var(--accent-rose)' },
            { id: 'WARNING', label: `Warnings (${warningCount})`, color: 'var(--accent-amber)' },
            { id: 'RECOMMENDATION', label: `Recommendations (${recCount})`, color: 'var(--primary)' },
            { id: 'GOOD', label: `Passed (${goodCount})`, color: 'var(--accent-emerald)' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterSeverity(btn.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: filterSeverity === btn.id ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.04)',
                color: filterSeverity === btn.id ? (btn.color || 'var(--text-primary)') : 'var(--text-muted)',
                border: filterSeverity === btn.id ? `1px solid ${btn.color || 'var(--border-strong)'}` : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredIssues.map((issue) => {
          const isExpanded = expandedIssues.has(issue.id);
          const isGood = issue.severity === 'GOOD';

          return (
            <div
              key={issue.id}
              style={{
                background: 'var(--bg-glass-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Header row */}
              <div
                onClick={() => toggleExpand(issue.id)}
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <IssueBadge severity={issue.severity} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {issue.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Category: <span style={{ textTransform: 'capitalize' }}>{issue.category}</span> | Code: {issue.code}
                    </div>
                  </div>
                </div>

                <div style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expandable details */}
              {isExpanded && (
                <div
                  style={{
                    padding: '1.25rem',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {/* Problem Description */}
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={15} color="var(--primary)" />
                      <span>Observation</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                      {issue.description}
                    </p>
                  </div>

                  {/* Why It Matters */}
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <HelpCircle size={15} color="var(--accent-cyan)" />
                      <span>Why It Matters for SEO</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {issue.whyItMatters}
                    </p>
                  </div>

                  {/* Recommended Action */}
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isGood ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                      border: `1px solid ${isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: isGood ? 'var(--accent-emerald)' : 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Wrench size={15} />
                      <span>{isGood ? 'Status' : 'Recommended Fix'}</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                      {issue.recommendation}
                    </p>
                  </div>

                  {issue.affectedElement && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Target Element:</strong> <code>{issue.affectedElement}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            No audit items match the selected severity filter.
          </div>
        )}
      </div>
    </div>
  );
}
