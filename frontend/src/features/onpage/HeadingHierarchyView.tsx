import { HeadingHierarchy } from '@seo-analyzer/shared';
import { ListTree, AlertTriangle } from 'lucide-react';

interface HeadingHierarchyViewProps {
  headings: HeadingHierarchy;
}

export function HeadingHierarchyView({ headings }: HeadingHierarchyViewProps) {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#6366f1';
      case 2: return '#06b6d4';
      case 3: return '#10b981';
      case 4: return '#f59e0b';
      case 5: return '#a855f7';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Stats Bar */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ListTree size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Heading Outline & Hierarchy Tree
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total of <strong>{headings.items.length}</strong> headings extracted. Evaluates logical topical outline for crawlers and screen readers.
          </p>
        </div>

        {/* Heading Count Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { tag: 'H1', count: headings.h1Count, color: '#6366f1' },
            { tag: 'H2', count: headings.h2Count, color: '#06b6d4' },
            { tag: 'H3', count: headings.h3Count, color: '#10b981' },
            { tag: 'H4', count: headings.h4Count, color: '#f59e0b' },
            { tag: 'H5', count: headings.h5Count, color: '#a855f7' },
            { tag: 'H6', count: headings.h6Count, color: '#94a3b8' },
          ].map((h) => (
            <div
              key={h.tag}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: h.color }}>{h.tag}:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{h.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Issues callout if hierarchy problems detected */}
      {headings.issues.length > 0 && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid var(--accent-amber)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
            <AlertTriangle size={16} />
            <span>Heading Structure Warnings</span>
          </div>
          {headings.issues.map((issue, idx) => (
            <div key={idx} style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              • {issue}
            </div>
          ))}
        </div>
      )}

      {/* Visual Heading Tree */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        {headings.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {headings.items.map((heading, index) => {
              const indentLevel = Math.max(0, heading.level - 1);
              const color = getLevelColor(heading.level);

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginLeft: `${indentLevel * 1.5}rem`,
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: heading.level === 1 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color,
                      background: `${color}1a`,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    H{heading.level}
                  </span>

                  <span
                    style={{
                      fontSize: heading.level === 1 ? '1.05rem' : heading.level === 2 ? '0.95rem' : '0.875rem',
                      fontWeight: heading.level <= 2 ? 700 : 500,
                      color: heading.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {heading.text}
                  </span>

                  {heading.id && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      #{heading.id}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No HTML headings (H1–H6) detected in this webpage.
          </div>
        )}
      </div>
    </div>
  );
}
