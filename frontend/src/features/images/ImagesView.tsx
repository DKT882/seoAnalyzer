import { useState } from 'react';
import { ImagesAnalysis } from '@seo-analyzer/shared';
import { MetricCard } from '../../components/MetricCard.js';
import { Image, CheckCircle, AlertTriangle, Search, ExternalLink } from 'lucide-react';

interface ImagesViewProps {
  images: ImagesAnalysis;
}

export function ImagesView({ images }: ImagesViewProps) {
  const [filter, setFilter] = useState<'all' | 'missing' | 'hasAlt'>('all');
  const [search, setSearch] = useState('');

  const filtered = images.images.filter((img) => {
    if (filter === 'missing' && (img.hasAlt || img.isDecorative)) return false;
    if (filter === 'hasAlt' && !img.hasAlt) return false;
    if (search && !img.src.toLowerCase().includes(search.toLowerCase()) && !img.alt.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <MetricCard
          label="Total Images"
          value={images.totalImages}
          sublabel="Detected <img> elements"
          icon={<Image size={20} />}
        />
        <MetricCard
          label="ALT Text Coverage"
          value={`${images.altCoverageRatio}%`}
          sublabel="Images with valid ALT"
          icon={<CheckCircle size={20} />}
          statusColor={images.altCoverageRatio >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
        />
        <MetricCard
          label="With Descriptive ALT"
          value={images.withAlt}
          sublabel="Descriptive alt attribute"
          icon={<CheckCircle size={20} />}
        />
        <MetricCard
          label="Missing ALT Text"
          value={images.missingAlt}
          sublabel="Needs alt attribute"
          icon={<AlertTriangle size={20} />}
          statusColor={images.missingAlt > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { id: 'all', label: `All Images (${images.totalImages})` },
            { id: 'missing', label: `Missing ALT (${images.missingAlt})`, color: 'var(--accent-amber)' },
            { id: 'hasAlt', label: `With ALT (${images.withAlt})`, color: 'var(--accent-emerald)' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: filter === btn.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: filter === btn.id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem 0.75rem',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images or alt text..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              width: '180px',
            }}
          />
        </div>
      </div>

      {/* Image Inventory Table */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)' }}>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Image Source / File</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>ALT Text Attribute</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Dimensions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((img, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.65rem 1rem', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={img.src} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{img.filename || img.src}</span>
                    <ExternalLink size={12} />
                  </a>
                </td>

                <td style={{ padding: '0.65rem 1rem', color: img.hasAlt ? 'var(--text-primary)' : 'var(--accent-amber)', fontWeight: img.hasAlt ? 500 : 600 }}>
                  {img.alt ? `"${img.alt}"` : img.isDecorative ? <em style={{ color: 'var(--text-muted)' }}>[Marked decorative]</em> : <span>Missing ALT</span>}
                </td>

                <td style={{ padding: '0.65rem 1rem' }}>
                  {img.hasAlt ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                      Valid ALT
                    </span>
                  ) : img.isDecorative ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                      Decorative
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                      Missing ALT
                    </span>
                  )}
                </td>

                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>
                  {img.width && img.height ? `${img.width} × ${img.height}` : 'Responsive / Auto'}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No images match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
