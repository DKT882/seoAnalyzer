import { KeywordItem } from '@seo-analyzer/shared';
import { getScoreColor } from '../../utils/formatters.js';
import { X, Check, X as Cross, Key, Zap } from 'lucide-react';

interface KeywordDetailsModalProps {
  keyword: KeywordItem | null;
  onClose: () => void;
}

export function KeywordDetailsModal({ keyword, onClose }: KeywordDetailsModalProps) {
  if (!keyword) return null;

  const { color, label } = getScoreColor(keyword.overallScore);

  const locations = [
    { label: 'Page Title', inLocation: keyword.inTitle, weight: '+25 pts' },
    { label: 'H1 Main Heading', inLocation: keyword.inH1, weight: '+20 pts' },
    { label: 'URL Slug', inLocation: keyword.inUrl, weight: '+15 pts' },
    { label: 'Meta Description', inLocation: keyword.inMeta, weight: '+10 pts' },
    { label: 'H2–H6 Subheadings', inLocation: keyword.inH2H6, weight: '+10 pts' },
    { label: 'Body Content', inLocation: keyword.inBody, weight: '+10 pts' },
    { label: 'Anchor Text', inLocation: keyword.inAnchor, weight: '+5 pts' },
    { label: 'Image ALT Text', inLocation: keyword.inAlt, weight: '+5 pts' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '560px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Key size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              "{keyword.keyword}"
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {keyword.nGramType} | Classification: <strong>{keyword.category}</strong>
            </span>
          </div>
        </div>

        {/* Score & Core Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Relevance Score</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>
              {keyword.overallScore}
            </div>
            <div style={{ fontSize: '0.7rem', color }}>{label}</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frequency</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {keyword.frequency}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>occurrences</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keyword Density</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {keyword.density}%
            </div>
            <div style={{ fontSize: '0.7rem', color: keyword.density > 5 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              {keyword.density > 5 ? 'Stuffing Risk' : 'Optimal'}
            </div>
          </div>
        </div>

        {/* Positional Prominence */}
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Positional Prominence</span>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            +{keyword.prominenceScore} / 15 pts
          </span>
        </div>

        {/* Structural Location Matrix */}
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
          Structural Location Checklist
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {locations.map((loc) => (
            <div
              key={loc.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: loc.inLocation ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${loc.inLocation ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {loc.inLocation ? (
                  <Check size={14} color="var(--accent-emerald)" />
                ) : (
                  <Cross size={14} color="var(--text-muted)" opacity={0.5} />
                )}
                <span style={{ fontSize: '0.8rem', color: loc.inLocation ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {loc.label}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: loc.inLocation ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {loc.weight}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          *Note: This score measures on-page SEO structural relevance and topical focus. It is not an official search engine ranking metric.
        </p>
      </div>
    </div>
  );
}
