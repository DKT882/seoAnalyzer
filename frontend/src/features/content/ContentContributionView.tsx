import { useState } from 'react';
import { ContentContributionAnalysis } from '@seo-analyzer/shared';
import {
  Flame,
  Activity,
  Layers,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export interface ContentContributionViewProps {
  contribution: ContentContributionAnalysis;
}

export function ContentContributionView({ contribution }: ContentContributionViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    contribution.sections[0]?.sectionId || 'title'
  );

  const selectedSection = contribution.sections.find((s) => s.sectionId === selectedSectionId) || contribution.sections[0];

  const getIntensityColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return 'var(--primary)'; // blue/indigo
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner Overview */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Activity size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Page-Level SEO Content Signal Contribution</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '750px' }}>
            {contribution.summary}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Overall Signal Score
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: getIntensityColor(contribution.overallContributionScore) }}>
              {contribution.overallContributionScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Content Signal Heatmap Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Flame size={18} color="#f59e0b" />
          Content Signal Heatmap
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {contribution.heatmap.map((item) => {
            const isSelected = item.sectionId === selectedSectionId;
            const color = getIntensityColor(item.signalScore);
            return (
              <div
                key={item.sectionId}
                onClick={() => setSelectedSectionId(item.sectionId)}
                style={{
                  background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {item.sectionName}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color }}>
                    {item.signalScore}/100
                  </span>
                </div>

                {/* Heatmap Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.signalScore}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Intensity: <strong>{item.intensity}</strong></span>
                  <span style={{ color: 'var(--primary-hover)', display: 'flex', alignItems: 'center' }}>
                    Inspect <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Section Deep-Dive Card */}
      {selectedSection && (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-strong)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Layers size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Section Deep-Dive: {selectedSection.sectionName}
                </h3>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Signal Multiplier Weight: <strong>{Math.round(selectedSection.weight * 100)}%</strong> | Priority Rank: #{selectedSection.prominenceRank}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signal Strength</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getIntensityColor(selectedSection.signalScore) }}>
                {selectedSection.signalScore}/100
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keyword Coverage</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {selectedSection.keywordCoverageRatio}%
              </div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Keywords Detected</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {selectedSection.primaryKeywordCount}
              </div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Secondary Keywords Detected</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {selectedSection.secondaryKeywordCount}
              </div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Content Depth Words</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {selectedSection.contentDepthWordCount} words
              </div>
            </div>
          </div>

          {/* Key Findings */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Signal Findings
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selectedSection.findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations */}
          {selectedSection.recommendations.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <AlertTriangle size={15} />
                Optimization Recommendation:
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {selectedSection.recommendations.join(' ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
