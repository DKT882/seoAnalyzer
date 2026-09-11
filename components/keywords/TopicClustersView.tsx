'use client';

import { TopicCluster, EntityItem } from '@/types';
import { Layers, Tag } from 'lucide-react';
import { getScoreColor } from '@/lib/utils/formatters';

interface TopicClustersViewProps {
  clusters: TopicCluster[];
  entities: EntityItem[];
  onSelectKeyword?: (keyword: string) => void;
}

export function TopicClustersView({ clusters, entities, onSelectKeyword }: TopicClustersViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Topic Clusters Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Layers size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Semantic Topic Clusters
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Keywords grouped deterministically by root stems, phrase co-occurrence, and semantic topic overlap.
        </p>

        {clusters.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {clusters.map((cluster) => {
              const { color } = getScoreColor(cluster.averageScore);
              return (
                <div
                  key={cluster.name}
                  style={{
                    background: 'var(--bg-glass-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {cluster.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cluster.keywords.length} terms | {cluster.totalFrequency} total mentions
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>
                          {cluster.averageScore}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>avg score</div>
                      </div>
                    </div>

                    {/* Keywords inside cluster */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {cluster.keywords.map((kw) => (
                        <span
                          key={kw}
                          onClick={() => onSelectKeyword && onSelectKeyword(kw)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            No distinct multi-term topic clusters identified in this document.
          </div>
        )}
      </div>

      {/* Named Entities Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Tag size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Named Entities & Proper Nouns
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Extracted brand names, technologies, organizations, and capitalized concepts detected in the content.
        </p>

        {entities.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {entities.map((entity) => (
              <div
                key={entity.name}
                style={{
                  background: 'var(--bg-glass-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {entity.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {entity.occurrences} mentions | Relevance: {entity.relevance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            No prominent named entities detected.
          </div>
        )}
      </div>
    </div>
  );
}
