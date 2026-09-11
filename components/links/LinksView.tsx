'use client';

import { useState } from 'react';
import { LinksAnalysis } from '@/types';
import { MetricCard } from '@/components/ui/MetricCard';
import { Link2, ExternalLink, ShieldCheck, Search } from 'lucide-react';

interface LinksViewProps {
  links: LinksAnalysis;
}

export function LinksView({ links }: LinksViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'internal' | 'external' | 'nofollow'>('all');
  const [search, setSearch] = useState('');

  const allLinks = [...links.internalLinks, ...links.externalLinks];

  const filtered = allLinks.filter((l) => {
    if (filterType === 'internal' && !l.isInternal) return false;
    if (filterType === 'external' && !l.isExternal) return false;
    if (filterType === 'nofollow' && !l.isNofollow) return false;
    if (search && !l.url.toLowerCase().includes(search.toLowerCase()) && !l.text.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <MetricCard
          label="Total Links"
          value={links.totalLinks}
          sublabel="Detected <a> anchors"
          icon={<Link2 size={20} />}
        />
        <MetricCard
          label="Internal Links"
          value={links.internalLinksCount}
          sublabel="Same-domain links"
          icon={<ShieldCheck size={20} />}
        />
        <MetricCard
          label="External Links"
          value={links.externalLinksCount}
          sublabel="Outbound domain links"
          icon={<ExternalLink size={20} />}
        />
        <MetricCard
          label="Nofollow Links"
          value={links.nofollowCount}
          sublabel="rel='nofollow' tags"
          icon={<Link2 size={20} />}
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
          {(['all', 'internal', 'external', 'nofollow'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: filterType === type ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: filterType === type ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {type === 'all' ? `All (${allLinks.length})` : type}
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
            placeholder="Filter links or anchor text..."
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

      {/* Link Inventory Table */}
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
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Anchor Text</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Destination URL</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Attributes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((l, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '240px' }}>
                  {l.text || <em style={{ color: 'var(--text-muted)' }}>[No anchor text]</em>}
                </td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--primary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                    {l.url}
                  </a>
                </td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: l.isInternal ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      color: l.isInternal ? 'var(--primary)' : 'var(--accent-cyan)',
                    }}
                  >
                    {l.isInternal ? 'Internal' : 'External'}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>
                  {l.isNofollow ? <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>nofollow</span> : 'dofollow'}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No links found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
