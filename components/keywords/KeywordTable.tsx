'use client';

import { useState, useMemo } from 'react';
import { KeywordItem } from '@/types';
import { EnrichedKeyword, KeywordMarketData } from '@/lib/providers/seo/types';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  TrendingUp,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getScoreColor } from '@/lib/utils/formatters';
import { KeywordDetailModal } from './KeywordDetailModal';

interface KeywordTableProps {
  keywords: (KeywordItem | EnrichedKeyword)[];
  initialSearch?: string;
  onSelectKeyword?: (keyword: KeywordItem | EnrichedKeyword) => void;
}

type SortField =
  | 'keyword'
  | 'searchVolume'
  | 'keywordDifficulty'
  | 'cpc'
  | 'relevance'
  | 'opportunity'
  | 'frequency';

type SortOrder = 'asc' | 'desc';

export function KeywordTable({ keywords, initialSearch = '', onSelectKeyword }: KeywordTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>('ALL');
  const [selectedCoverageFilter, setSelectedCoverageFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('opportunity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModalKeyword, setActiveModalKeyword] = useState<KeywordItem | EnrichedKeyword | null>(null);
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

    // Text Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((item) => {
        const kw = item.keyword.toLowerCase();
        const isEnriched = 'internalMetrics' in item;
        const enriched = isEnriched ? (item as EnrichedKeyword) : null;
        const standard = !isEnriched ? (item as KeywordItem) : null;
        const intent = (enriched?.internalMetrics?.estimatedIntent || standard?.searchIntent || '').toLowerCase();
        const cat = item.category.toLowerCase();
        return kw.includes(q) || intent.includes(q) || cat.includes(q);
      });
    }

    // Source Filter
    if (selectedSourceFilter !== 'ALL') {
      result = result.filter((item) => {
        const isEnriched = 'internalMetrics' in item;
        const sources = isEnriched
          ? (item as EnrichedKeyword).sources
          : [(item as KeywordItem).source || 'EXTRACTED'];
        return sources.includes(selectedSourceFilter as any);
      });
    }

    // Intent Filter
    if (selectedIntentFilter !== 'ALL') {
      result = result.filter((item) => {
        const isEnriched = 'internalMetrics' in item;
        const intent = isEnriched
          ? (item as EnrichedKeyword).internalMetrics.estimatedIntent
          : (item as KeywordItem).searchIntent;
        return intent === selectedIntentFilter;
      });
    }

    // Coverage Filter
    if (selectedCoverageFilter !== 'ALL') {
      result = result.filter((item) => {
        const isEnriched = 'internalMetrics' in item;
        const coverage = isEnriched
          ? (item as EnrichedKeyword).internalMetrics.coverageStatus
          : (item as KeywordItem).inTitle || (item as KeywordItem).inH1
          ? 'Strong'
          : 'Weak';
        return coverage === selectedCoverageFilter;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const isEnrichedA = 'internalMetrics' in a;
      const isEnrichedB = 'internalMetrics' in b;
      const enA = isEnrichedA ? (a as EnrichedKeyword) : null;
      const enB = isEnrichedB ? (b as EnrichedKeyword) : null;
      const stA = !isEnrichedA ? (a as KeywordItem) : null;
      const stB = !isEnrichedB ? (b as KeywordItem) : null;

      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'keyword':
          valA = a.keyword;
          valB = b.keyword;
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'searchVolume':
          valA = enA?.marketData?.searchVolume ?? -1;
          valB = enB?.marketData?.searchVolume ?? -1;
          break;
        case 'keywordDifficulty':
          valA = enA?.marketData?.keywordDifficulty ?? -1;
          valB = enB?.marketData?.keywordDifficulty ?? -1;
          break;
        case 'cpc':
          valA = enA?.marketData?.cpc ?? -1;
          valB = enB?.marketData?.cpc ?? -1;
          break;
        case 'relevance':
          valA = enA?.internalMetrics?.relevanceScore ?? stA?.overallScore ?? 0;
          valB = enB?.internalMetrics?.relevanceScore ?? stB?.overallScore ?? 0;
          break;
        case 'opportunity':
          valA = enA?.opportunityScore?.finalScore ?? stA?.overallScore ?? 0;
          valB = enB?.opportunityScore?.finalScore ?? stB?.overallScore ?? 0;
          break;
        case 'frequency':
          valA = enA?.internalMetrics?.frequency ?? stA?.frequency ?? 0;
          valB = enB?.internalMetrics?.frequency ?? stB?.frequency ?? 0;
          break;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [keywords, searchTerm, selectedSourceFilter, selectedIntentFilter, selectedCoverageFilter, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedKeywords.length / pageSize));
  const paginatedKeywords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedKeywords.slice(start, start + pageSize);
  }, [filteredAndSortedKeywords, currentPage, pageSize]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortOrder === 'asc' ? <ArrowUp size={13} color="#818cf8" /> : <ArrowDown size={13} color="#818cf8" />;
  };

  const handleInspect = (item: KeywordItem | EnrichedKeyword) => {
    setActiveModalKeyword(item);
    if (onSelectKeyword) {
      onSelectKeyword(item);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controls & Multi-Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search keywords, intent..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.3rem',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.82rem',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Source Filter */}
          <select
            value={selectedSourceFilter}
            onChange={(e) => {
              setSelectedSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.78rem',
            }}
          >
            <option value="ALL">All Sources</option>
            <option value="EXTRACTED">Extracted</option>
            <option value="RECOMMENDED">Recommended</option>
            <option value="COMPETITOR_GAP">Competitor Gap</option>
            <option value="EXTERNAL">External</option>
          </select>

          {/* Intent Filter */}
          <select
            value={selectedIntentFilter}
            onChange={(e) => {
              setSelectedIntentFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.78rem',
            }}
          >
            <option value="ALL">All Intents</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
            <option value="Navigational">Navigational</option>
          </select>

          {/* Coverage Filter */}
          <select
            value={selectedCoverageFilter}
            onChange={(e) => {
              setSelectedCoverageFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.78rem',
            }}
          >
            <option value="ALL">All Coverage</option>
            <option value="Strong">Strong</option>
            <option value="Weak">Weak</option>
            <option value="Missing">Missing</option>
          </select>

          <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '0.25rem' }}>
            ({filteredAndSortedKeywords.length} terms)
          </span>
        </div>
      </div>

      {/* Keywords Table */}
      <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'rgba(30, 41, 59, 0.7)', borderBottom: '1px solid #334155' }}>
              <th
                onClick={() => handleSort('keyword')}
                style={{ padding: '0.8rem 1rem', cursor: 'pointer', userSelect: 'none', color: '#94a3b8', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Keyword {renderSortIcon('keyword')}
                </div>
              </th>
              <th style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Source</th>
              <th style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Intent</th>
              <th
                onClick={() => handleSort('searchVolume')}
                style={{ padding: '0.8rem 0.75rem', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}
                title="Monthly Search Volume (DataForSEO / Google Ads)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  <TrendingUp size={12} className="text-emerald-400" /> Vol {renderSortIcon('searchVolume')}
                </div>
              </th>
              <th
                onClick={() => handleSort('keywordDifficulty')}
                style={{ padding: '0.8rem 0.75rem', cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}
                title="Keyword Difficulty (0-100)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                  <Award size={12} className="text-amber-400" /> KD {renderSortIcon('keywordDifficulty')}
                </div>
              </th>
              <th
                onClick={() => handleSort('cpc')}
                style={{ padding: '0.8rem 0.75rem', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  CPC {renderSortIcon('cpc')}
                </div>
              </th>
              <th
                onClick={() => handleSort('relevance')}
                style={{ padding: '0.8rem 0.75rem', cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                  Relevance {renderSortIcon('relevance')}
                </div>
              </th>
              <th style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                Coverage
              </th>
              <th
                onClick={() => handleSort('opportunity')}
                style={{ padding: '0.8rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}
                title="SEO Opportunity Score (Transparent combination of internal relevance, content gap, and market demand)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  <Zap size={12} className="text-indigo-400" /> Opp Score {renderSortIcon('opportunity')}
                </div>
              </th>
              <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedKeywords.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No keywords match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedKeywords.map((item) => {
                const isEnriched = 'internalMetrics' in item;
                const enriched = isEnriched ? (item as EnrichedKeyword) : null;
                const standard = !isEnriched ? (item as KeywordItem) : null;

                const kw = item.keyword;
                const sources = enriched?.sources || (standard?.source ? [standard.source] : ['EXTRACTED']);
                const intent = enriched?.internalMetrics?.estimatedIntent || standard?.searchIntent || 'Informational';
                const marketData: KeywordMarketData | null = enriched?.marketData || null;

                const relevance = enriched?.internalMetrics?.relevanceScore ?? standard?.overallScore ?? standard?.prominenceScore ?? 50;
                const oppScore = enriched?.opportunityScore?.finalScore ?? standard?.overallScore ?? 50;
                const coverage = enriched?.internalMetrics?.coverageStatus ?? (standard?.inTitle || standard?.inH1 ? 'Strong' : 'Weak');
                const { color } = getScoreColor(oppScore);

                return (
                  <tr
                    key={kw}
                    onClick={() => handleInspect(item)}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(51, 65, 85, 0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Keyword */}
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span>{kw}</span>
                      </div>
                    </td>

                    {/* Source Badges */}
                    <td style={{ padding: '0.8rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {sources.map((src) => (
                          <span
                            key={src}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              background:
                                src === 'RECOMMENDED'
                                  ? 'rgba(168, 85, 247, 0.15)'
                                  : src === 'COMPETITOR_GAP'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : src === 'EXTERNAL'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                              color:
                                src === 'RECOMMENDED'
                                  ? '#c084fc'
                                  : src === 'COMPETITOR_GAP'
                                  ? '#fbbf24'
                                  : src === 'EXTERNAL'
                                  ? '#34d399'
                                  : '#60a5fa',
                              border: `1px solid ${
                                src === 'RECOMMENDED'
                                  ? 'rgba(168, 85, 247, 0.3)'
                                  : src === 'COMPETITOR_GAP'
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : src === 'EXTERNAL'
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'rgba(59, 130, 246, 0.3)'
                              }`,
                            }}
                          >
                            {src.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Intent */}
                    <td style={{ padding: '0.8rem 0.75rem', color: '#cbd5e1', fontSize: '0.78rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background:
                            intent === 'Commercial' || intent === 'Transactional'
                              ? 'rgba(99, 102, 241, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: intent === 'Commercial' || intent === 'Transactional' ? '#a5b4fc' : '#94a3b8',
                        }}
                      >
                        {intent}
                      </span>
                    </td>

                    {/* Monthly Search Volume */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {marketData && typeof marketData.searchVolume === 'number' ? (
                        <span style={{ color: '#34d399' }}>{marketData.searchVolume.toLocaleString()}</span>
                      ) : (
                        <span title="External market data unavailable without configured provider" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          N/A
                        </span>
                      )}
                    </td>

                    {/* KD */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                      {marketData && typeof marketData.keywordDifficulty === 'number' ? (
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background:
                              marketData.keywordDifficulty <= 35
                                ? 'rgba(16, 185, 129, 0.15)'
                                : marketData.keywordDifficulty <= 65
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              marketData.keywordDifficulty <= 35
                                ? '#34d399'
                                : marketData.keywordDifficulty <= 65
                                ? '#fbbf24'
                                : '#f87171',
                          }}
                        >
                          {marketData.keywordDifficulty}
                        </span>
                      ) : (
                        <span title="External KD unavailable" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          N/A
                        </span>
                      )}
                    </td>

                    {/* CPC */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: '#94a3b8' }}>
                      {marketData && typeof marketData.cpc === 'number' ? (
                        `$${marketData.cpc.toFixed(2)}`
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>N/A</span>
                      )}
                    </td>

                    {/* Internal Relevance */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', color: '#e2e8f0', fontWeight: 600 }}>
                      {relevance}/100
                    </td>

                    {/* Coverage */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.12rem 0.4rem',
                          borderRadius: '4px',
                          background:
                            coverage === 'Strong'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : coverage === 'Weak'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(168, 85, 247, 0.15)',
                          color:
                            coverage === 'Strong'
                              ? '#34d399'
                              : coverage === 'Weak'
                              ? '#fbbf24'
                              : '#c084fc',
                        }}
                      >
                        {coverage}
                      </span>
                    </td>

                    {/* Opportunity Score */}
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color, fontSize: '0.95rem' }}>{oppScore}</span>
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(item);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#818cf8',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} /> Inspect
                      </button>
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
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
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
                borderRadius: '6px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: currentPage === 1 ? '#64748b' : '#f8fafc',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
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
                borderRadius: '6px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: currentPage === totalPages ? '#64748b' : '#f8fafc',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Keyword Detail Modal */}
      {activeModalKeyword && (
        <KeywordDetailModal keywordItem={activeModalKeyword} onClose={() => setActiveModalKeyword(null)} />
      )}
    </div>
  );
}
