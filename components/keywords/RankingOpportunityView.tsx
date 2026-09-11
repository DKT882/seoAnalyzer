'use client';

import { useState, useMemo } from 'react';
import { KeywordOpportunityItem } from '@/types';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, TrendingUp, Target, Zap } from 'lucide-react';
import { getScoreColor } from '@/lib/utils/formatters';

interface RankingOpportunityViewProps {
  opportunities: KeywordOpportunityItem[];
  onSelectKeyword?: (keyword: string) => void;
}

export function RankingOpportunityView({ opportunities, onSelectKeyword }: RankingOpportunityViewProps) {
  const [filterPotential, setFilterPotential] = useState<'all' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH'>('all');

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((op) => {
      if (filterPotential !== 'all' && op.potential !== filterPotential) return false;
      if (filterDifficulty !== 'all' && op.difficultyEstimate !== filterDifficulty) return false;
      return true;
    });
  }, [opportunities, filterPotential, filterDifficulty]);

  const getDifficultyBadge = (difficulty: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (difficulty) {
      case 'LOW':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            Easy Difficulty
          </span>
        );
      case 'MEDIUM':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            Medium Difficulty
          </span>
        );
      case 'HIGH':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            Competitive
          </span>
        );
    }
  };

  const getPotentialBadge = (potential: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (potential) {
      case 'HIGH':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-hover)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <TrendingUp size={11} /> High Potential
          </span>
        );
      case 'MEDIUM':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
            Moderate
          </span>
        );
      case 'LOW':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}>
            Low Potential
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <Sparkles size={20} color="var(--primary-hover)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            High-Impact Ranking Opportunities ({opportunities.length})
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '780px' }}>
          Actionable keyword placement opportunities detected on the page. These terms are used prominently in body content or subheadings but are missing from critical ranking tags (Title, H1, or Meta Description).
        </p>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Potential:</span>
          {(['all', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterPotential(lvl)}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: filterPotential === lvl ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: filterPotential === lvl ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {lvl === 'all' ? 'All' : lvl}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Difficulty:</span>
          {(['all', 'LOW', 'MEDIUM', 'HIGH'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: filterDifficulty === diff ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: filterDifficulty === diff ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {diff === 'all' ? 'All' : diff}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities Grid / Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {filteredOpportunities.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            No ranking opportunities match the active filters.
          </div>
        ) : (
          filteredOpportunities.map((op) => {
            const { color } = getScoreColor(op.opportunityScore);
            return (
              <div
                key={op.id || op.keyword}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div
                      onClick={() => onSelectKeyword && onSelectKeyword(op.keyword)}
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        cursor: onSelectKeyword ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>"{op.keyword}"</span>
                      {onSelectKeyword && <ArrowRight size={14} color="var(--primary-hover)" />}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {getPotentialBadge(op.potential)}
                      {getDifficultyBadge(op.difficultyEstimate)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>
                      {op.opportunityScore}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Opportunity Score
                    </div>
                  </div>
                </div>

                {/* Target Placement */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-hover)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    <Target size={13} /> Recommended Target Placement
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {op.targetPlacement}
                  </div>
                </div>

                {/* Recommended Action */}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    <Zap size={13} color="#f59e0b" /> Actionable Step:
                  </div>
                  {op.recommendedAction}
                </div>

                {/* Missing Placements Pills */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Placements Status:</div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                    {op.missingFromTitle ? (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertCircle size={11} /> Missing from Title
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={11} /> In Title
                      </span>
                    )}
                    <span>•</span>
                    {op.missingFromH1 ? (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertCircle size={11} /> Missing from H1
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={11} /> In H1
                      </span>
                    )}
                    <span>•</span>
                    {op.missingFromMeta ? (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertCircle size={11} /> Missing from Meta
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={11} /> In Meta
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
