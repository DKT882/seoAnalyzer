'use client';

import { KeywordCannibalizationItem, ContentDuplicationItem } from '@/types';
import { AlertTriangle, Copy, ShieldAlert, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface CannibalizationViewProps {
  cannibalization: KeywordCannibalizationItem[];
  contentDuplication: ContentDuplicationItem[];
  onSelectPage?: (pageUrl: string) => void;
}

export function CannibalizationView({
  cannibalization,
  contentDuplication,
  onSelectPage,
}: CannibalizationViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Notice Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--accent-amber)',
          fontSize: '0.85rem',
        }}
      >
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Analytical Inference Notice:</strong> Potential keyword cannibalization and content similarity signals are calculated from internal heading and token overlap. Search engines evaluate sitewide context and user intent.
        </div>
      </div>

      {/* 1. Keyword Cannibalization Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="var(--accent-rose)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Keyword Cannibalization ({cannibalization.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Multiple pages competing for identical primary terms
          </span>
        </div>

        {cannibalization.length === 0 ? (
          <div style={{ background: 'var(--bg-glass-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem auto' }} />
            No significant keyword cannibalization detected across analyzed pages.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cannibalization.map((item) => {
              const isHighRisk = item.riskLevel === 'HIGH';
              const riskColor = isHighRisk ? 'var(--accent-rose)' : item.riskLevel === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--accent-cyan)';

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-glass-card)',
                    border: `1px solid ${riskColor}40`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        "{item.keyword}"
                      </span>
                      <span style={{ padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', background: `${riskColor}18`, border: `1px solid ${riskColor}40`, color: riskColor, fontSize: '0.72rem', fontWeight: 700 }}>
                        {item.riskLevel} RISK
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.competingPages.length} competing pages
                    </span>
                  </div>

                  {/* Competing Pages List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    {item.competingPages.map((page, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', gap: '1rem', flexWrap: 'wrap' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '240px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{page.title}</span>
                          <span
                            onClick={() => onSelectPage && onSelectPage(page.url)}
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            ({page.url})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {page.inTitle && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>In Title</span>}
                          {page.inH1 && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>In H1</span>}
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>Score: {page.relevanceScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action */}
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--primary)' }}>Recommended Action:</strong> {item.recommendedAction}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Content Duplication Signal Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Copy size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Content Duplication Signals ({contentDuplication.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            High token & structural overlap between page pairs
          </span>
        </div>

        {contentDuplication.length === 0 ? (
          <div style={{ background: 'var(--bg-glass-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem auto' }} />
            No substantial content duplication signals detected across pages.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            {contentDuplication.map((dup) => (
              <div
                key={dup.id}
                style={{
                  background: 'var(--bg-glass-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    Similarity Signal: <strong style={{ color: dup.similarityScore >= 80 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>{dup.similarityScore}%</strong>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Jaccard Token Match
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>• <strong>Page A:</strong> {dup.pageA.title} ({dup.pageA.wordCount} words)</div>
                  <div>• <strong>Page B:</strong> {dup.pageB.title} ({dup.pageB.wordCount} words)</div>
                </div>

                {dup.sharedTopics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {dup.sharedTopics.map((topic, i) => (
                      <span key={i} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--primary)' }}>Fix:</strong> {dup.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
