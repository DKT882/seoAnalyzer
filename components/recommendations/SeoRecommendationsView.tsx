'use client';

import { useState } from 'react';
import { SeoRecommendationItem } from '@/types';
import { AlertTriangle, AlertCircle, Info, Zap, CheckCircle2, Filter, ArrowRight, ExternalLink } from 'lucide-react';

interface SeoRecommendationsViewProps {
  recommendations: {
    all: SeoRecommendationItem[];
    quickWins: SeoRecommendationItem[];
    byPage: Record<string, SeoRecommendationItem[]>;
    byCategory: Record<string, SeoRecommendationItem[]>;
  };
  onSelectPage?: (pageUrl: string) => void;
}

export function SeoRecommendationsView({ recommendations, onSelectPage }: SeoRecommendationsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quickWinsOnly, setQuickWinsOnly] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { all, quickWins } = recommendations;

  const criticalCount = all.filter((r) => r.priority === 'CRITICAL').length;
  const highCount = all.filter((r) => r.priority === 'HIGH').length;
  const mediumCount = all.filter((r) => r.priority === 'MEDIUM').length;
  const lowCount = all.filter((r) => r.priority === 'LOW').length;

  const filtered = (quickWinsOnly ? quickWins : all).filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Priority Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* Quick Wins Card */}
        <div
          onClick={() => setQuickWinsOnly(!quickWinsOnly)}
          style={{
            background: quickWinsOnly ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-glass-card)',
            border: quickWinsOnly ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>⚡ Quick Wins</span>
            <Zap size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{quickWins.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>High impact, low effort</div>
        </div>

        {/* Critical */}
        <div
          onClick={() => { setPriorityFilter(priorityFilter === 'CRITICAL' ? 'all' : 'CRITICAL'); setQuickWinsOnly(false); }}
          style={{
            background: priorityFilter === 'CRITICAL' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-glass-card)',
            border: priorityFilter === 'CRITICAL' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose)' }}>Critical Priority</span>
            <AlertCircle size={16} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{criticalCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Urgent indexing & errors</div>
        </div>

        {/* High */}
        <div
          onClick={() => { setPriorityFilter(priorityFilter === 'HIGH' ? 'all' : 'HIGH'); setQuickWinsOnly(false); }}
          style={{
            background: priorityFilter === 'HIGH' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-glass-card)',
            border: priorityFilter === 'HIGH' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-amber)' }}>High Priority</span>
            <AlertTriangle size={16} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{highCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Core ranking & meta signals</div>
        </div>

        {/* Medium */}
        <div
          onClick={() => { setPriorityFilter(priorityFilter === 'MEDIUM' ? 'all' : 'MEDIUM'); setQuickWinsOnly(false); }}
          style={{
            background: priorityFilter === 'MEDIUM' ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-glass-card)',
            border: priorityFilter === 'MEDIUM' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Medium Priority</span>
            <Info size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{mediumCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Content depth & schema</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Category:</span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'ON_PAGE', label: 'On-Page SEO' },
            { id: 'TECHNICAL', label: 'Technical' },
            { id: 'CONTENT', label: 'Content Depth' },
            { id: 'INTERNAL_LINKING', label: 'Internal Linking' },
            { id: 'SCHEMA', label: 'Schema' },
            { id: 'IMAGES', label: 'Images' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: 'var(--radius-sm)',
                border: categoryFilter === cat.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: categoryFilter === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                color: categoryFilter === cat.id ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {quickWinsOnly && (
          <button
            type="button"
            onClick={() => setQuickWinsOnly(false)}
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Quick Wins filter
          </button>
        )}
      </div>

      {/* Recommendations Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((item) => {
          const isCritical = item.priority === 'CRITICAL';
          const isHigh = item.priority === 'HIGH';
          const badgeColor = isCritical ? 'var(--accent-rose)' : isHigh ? 'var(--accent-amber)' : 'var(--accent-cyan)';

          return (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-glass-card)',
                border: `1px solid ${isCritical ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: `${badgeColor}18`,
                      border: `1px solid ${badgeColor}40`,
                      color: badgeColor,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.priority}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {item.category.replace('_', ' ')}
                  </span>
                  {item.quickWin && (
                    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', fontWeight: 600 }}>
                      ⚡ Quick Win
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Effort: <strong style={{ color: 'var(--text-secondary)' }}>{item.effort}</strong>
                  </span>
                </div>

                <div
                  onClick={() => onSelectPage && onSelectPage(item.affectedUrl)}
                  style={{ fontSize: '0.78rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.affectedUrl}
                  </span>
                  <ExternalLink size={12} />
                </div>
              </div>

              {/* Title & Reason */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  {item.title}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {item.reason}
                </div>
              </div>

              {/* Impact & Action */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--accent-emerald)' }}>Impact:</strong> {item.impact}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--primary)' }}>Recommended Action:</strong> {item.recommendedAction}
                </div>
              </div>

              {/* Structured Before / After Comparison */}
              {(item.before || item.after) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: item.before && item.after ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                    gap: '0.75rem',
                  }}
                >
                  {item.before && (
                    <div
                      style={{
                        background: 'rgba(244, 63, 94, 0.06)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.25rem' }}>
                        ❌ Example Before:
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {item.before}
                      </pre>
                    </div>
                  )}

                  {item.after && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.06)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.25rem' }}>
                        ✅ Example After:
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {item.after}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Actionable Caution Note */}
              {item.caution && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderLeft: '3px solid var(--accent-amber)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <strong style={{ color: 'var(--accent-amber)' }}>⚠️ Caution:</strong> {item.caution}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
