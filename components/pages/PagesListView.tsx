'use client';

import { useState } from 'react';
import { CrawlPageSummary } from '@/types';
import { Search, ExternalLink, ArrowUpDown, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface PagesListViewProps {
  pages: CrawlPageSummary[];
  onSelectPage: (pageUrl: string) => void;
}

export function PagesListView({ pages, onSelectPage }: PagesListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<'overallScore' | 'wordCount' | 'keywordsCount' | 'url'>('overallScore');
  const [sortAsc, setSortAsc] = useState(false);

  // Filtering
  const filtered = pages.filter((page) => {
    const matchesSearch =
      page.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (page.h1 && page.h1.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (scoreFilter === 'high') return page.overallScore >= 80;
    if (scoreFilter === 'medium') return page.overallScore >= 60 && page.overallScore < 80;
    if (scoreFilter === 'low') return page.overallScore < 60;
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'url') diff = a.url.localeCompare(b.url);
    else diff = (a[sortField] || 0) - (b[sortField] || 0);
    return sortAsc ? diff : -diff;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'var(--bg-glass-card)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search pages by URL, Title, or H1..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Score Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Score Filter:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setScoreFilter(filter)}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: scoreFilter === filter ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: scoreFilter === filter ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: scoreFilter === filter ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {filter === 'all' ? 'All Pages' : filter === 'high' ? 'Optimal (80+)' : filter === 'medium' ? 'Fair (60-79)' : 'Needs Work (<60)'}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Table */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th onClick={() => handleSort('url')} style={{ padding: '0.85rem 1rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Page URL & Title</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('overallScore')} style={{ padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <span>SEO Score</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('wordCount')} style={{ padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                    <span>Words</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('keywordsCount')} style={{ padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                    <span>Keywords</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Indexable</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((page) => {
                const isOptimal = page.overallScore >= 80;
                const isFair = page.overallScore >= 60;
                const scoreColor = isOptimal ? 'var(--accent-emerald)' : isFair ? 'var(--accent-amber)' : 'var(--accent-rose)';

                return (
                  <tr
                    key={page.id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s ease' }}
                  >
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '400px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.url}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          background: `${scoreColor}18`,
                          border: `1px solid ${scoreColor}40`,
                          color: scoreColor,
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {page.overallScore}/100
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                      {page.wordCount.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                      {page.keywordsCount}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {page.isIndexable ? (
                        <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ margin: '0 auto' }} />
                      ) : (
                        <XCircle size={16} color="var(--accent-rose)" style={{ margin: '0 auto' }} />
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onSelectPage(page.url)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        <FileText size={13} />
                        <span>Inspect Page</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
