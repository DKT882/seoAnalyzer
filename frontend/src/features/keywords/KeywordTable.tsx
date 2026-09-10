import { useState, useMemo } from 'react';
import { KeywordItem } from '@seo-analyzer/shared';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getScoreColor } from '../../utils/formatters.js';

interface KeywordTableProps {
  keywords: KeywordItem[];
  initialSearch?: string;
  onSelectKeyword?: (keyword: KeywordItem) => void;
}

type SortField = 'keyword' | 'frequency' | 'density' | 'prominenceScore' | 'overallScore' | 'wordCount';
type SortOrder = 'asc' | 'desc';

export function KeywordTable({ keywords, initialSearch = '', onSelectKeyword }: KeywordTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortField, setSortField] = useState<SortField>('overallScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSortedKeywords = useMemo(() => {
    let result = [...keywords];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (k) =>
          k.keyword.toLowerCase().includes(q) ||
          k.category.toLowerCase().includes(q) ||
          (k.semanticCategory && k.semanticCategory.toLowerCase().includes(q)) ||
          (k.topicCluster && k.topicCluster.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'wordCount') {
        valA = a.wordCount || a.keyword.split(' ').length;
        valB = b.wordCount || b.keyword.split(' ').length;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0);
    });

    return result;
  }, [keywords, searchTerm, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedKeywords.length / pageSize));
  const paginatedKeywords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedKeywords.slice(start, start + pageSize);
  }, [filteredAndSortedKeywords, currentPage, pageSize]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortOrder === 'asc' ? <ArrowUp size={13} color="var(--primary)" /> : <ArrowDown size={13} color="var(--primary)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search and summary controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search keywords or clusters..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.3rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredAndSortedKeywords.length}</strong> keywords
        </div>
      </div>

      {/* Keywords Table */}
      <div style={{ overflowX: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th
                onClick={() => handleSort('keyword')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Keyword {renderSortIcon('keyword')}
                </div>
              </th>
              <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Category
              </th>
              <th
                onClick={() => handleSort('frequency')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  Freq {renderSortIcon('frequency')}
                </div>
              </th>
              <th
                onClick={() => handleSort('density')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  Density {renderSortIcon('density')}
                </div>
              </th>
              <th
                onClick={() => handleSort('prominenceScore')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  Prominence {renderSortIcon('prominenceScore')}
                </div>
              </th>
              <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Key Placements
              </th>
              <th
                onClick={() => handleSort('overallScore')}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  SEO Score {renderSortIcon('overallScore')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedKeywords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No keywords match the current filter.
                </td>
              </tr>
            ) : (
              paginatedKeywords.map((item) => {
                const { color } = getScoreColor(item.overallScore);
                return (
                  <tr
                    key={item.id || item.keyword}
                    onClick={() => onSelectKeyword && onSelectKeyword(item)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: onSelectKeyword ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Keyword Name */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{item.keyword}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                          {item.nGramType}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: item.category === 'primary' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: item.category === 'primary' ? 'var(--primary-hover)' : 'var(--text-secondary)',
                          border: item.category === 'primary' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* Frequency */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.frequency}
                    </td>

                    {/* Density */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {item.density}%
                    </td>

                    {/* Prominence */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {item.prominenceScore}/100
                    </td>

                    {/* Key Placements */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <span
                          title="Title Tag"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: item.inTitle ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            color: item.inTitle ? '#10b981' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {item.inTitle ? <Check size={10} /> : <X size={10} />} Title
                        </span>
                        <span
                          title="H1 Headline"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: item.inH1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            color: item.inH1 ? '#10b981' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {item.inH1 ? <Check size={10} /> : <X size={10} />} H1
                        </span>
                        <span
                          title="H2-H6 Subheadings"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: item.inH2H6 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            color: item.inH2H6 ? '#10b981' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {item.inH2H6 ? <Check size={10} /> : <X size={10} />} H2-6
                        </span>
                        <span
                          title="Meta Description"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: item.inMeta ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            color: item.inMeta ? '#10b981' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {item.inMeta ? <Check size={10} /> : <X size={10} />} Meta
                        </span>
                      </div>
                    </td>

                    {/* Overall Score */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color, fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
                        {item.overallScore}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
