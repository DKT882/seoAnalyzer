'use client';

import { SiteContentStrategy } from '@/types';
import { Layers, Sparkles, AlertCircle, PlusCircle, ArrowRight, CheckCircle2, FileText } from 'lucide-react';

interface ContentStrategyViewProps {
  strategy: SiteContentStrategy;
  onGenerateBriefForTopic?: (topic: string) => void;
}

export function ContentStrategyView({ strategy, onGenerateBriefForTopic }: ContentStrategyViewProps) {
  const { strongTopics, weakTopics, missingTopics, newPageOpportunities, topicCoverageScore, topicCoverageMethodology } = strategy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Banner */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Sparkles size={16} />
            <span>Site-Wide Content Architecture</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Topic Coverage & Expansion Blueprint
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {topicCoverageMethodology}
          </p>
        </div>

        <div style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Topic Depth Score</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{topicCoverageScore}%</div>
        </div>
      </div>

      {/* New Page Opportunities */}
      {newPageOpportunities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            <PlusCircle size={18} color="var(--accent-emerald)" />
            <span>Recommended New Page Opportunities</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {newPageOpportunities.map((opp) => (
              <div
                key={opp.id}
                style={{
                  background: 'var(--bg-glass-card)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    New Pillar / Article Idea
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    {opp.suggestedTitle}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {opp.reason}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Target Keywords:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                    {opp.supportingKeywords.map((kw, idx) => (
                      <span key={idx} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>

                  {onGenerateBriefForTopic && (
                    <button
                      type="button"
                      onClick={() => onGenerateBriefForTopic(opp.primaryTopic)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--accent-emerald)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={13} />
                      <span>Create Content Brief</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strong vs Weak Topics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Strong Topics */}
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={16} />
            <span>Strongly Covered Topics ({strongTopics.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {strongTopics.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.topic}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    Score: {item.coverageScore}/100
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Covered across {item.pagesCount} pages • Keywords: {item.topKeywords.slice(0, 3).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics */}
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.75rem' }}>
            <AlertCircle size={16} />
            <span>Topics Needing Expansion ({weakTopics.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {weakTopics.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.topic}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 700 }}>
                    Score: {item.coverageScore}/100
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.missingAspects[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
