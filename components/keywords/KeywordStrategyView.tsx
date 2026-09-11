'use client';

import { useState } from 'react';
import { KeywordStrategyItem, TopicCluster, ContentBrief } from '@/types';
import { Search, Sparkles, Target, Layers, HelpCircle, FileText, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface KeywordStrategyViewProps {
  primaryKeyword: string;
  topicCoverageScore: number;
  topicCoverageMethodology: string;
  keywords: KeywordStrategyItem[];
  clusters: TopicCluster[];
  briefs: ContentBrief[];
  onOpenBriefModal?: (brief: ContentBrief) => void;
  onUpdatePrimaryKeyword?: (newKeyword: string) => void;
}

export function KeywordStrategyView({
  primaryKeyword,
  topicCoverageScore,
  topicCoverageMethodology,
  keywords,
  clusters,
  briefs,
  onOpenBriefModal,
  onUpdatePrimaryKeyword,
}: KeywordStrategyViewProps) {
  const [activeTab, setActiveTab] = useState<
    'all' | 'primary_secondary' | 'short_tail' | 'long_tail' | 'supporting' | 'questions' | 'entities' | 'clusters' | 'opportunities'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [expandedKeywordId, setExpandedKeywordId] = useState<string | null>(null);

  // Filter keywords
  const filteredKeywords = keywords.filter((item) => {
    const matchesSearch = item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) || item.reason.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (intentFilter !== 'all' && item.estimatedIntent !== intentFilter) return false;

    switch (activeTab) {
      case 'primary_secondary':
        return item.category === 'primary' || item.category === 'secondary';
      case 'short_tail':
        return item.category === 'short-tail';
      case 'long_tail':
        return item.category === 'long-tail';
      case 'supporting':
        return item.category === 'supporting' || item.category === 'semantic-variation';
      case 'questions':
        return item.category === 'question';
      case 'entities':
        return item.category === 'entity';
      case 'opportunities':
        return item.internalOpportunityScore >= 60;
      default:
        return true;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Primary Topic & Topic Coverage Score */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '2px solid var(--primary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '1.25rem',
            }}
          >
            {topicCoverageScore}%
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>Coverage</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
              <Target size={14} />
              <span>Primary Strategic Keyword</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {primaryKeyword}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {topicCoverageMethodology}
            </div>
          </div>
        </div>

        {/* Content Brief CTA */}
        {briefs.length > 0 && onOpenBriefModal && (
          <button
            type="button"
            onClick={() => onOpenBriefModal(briefs[0])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              boxShadow: '0 4px 16px var(--primary-glow)',
              cursor: 'pointer',
            }}
          >
            <FileText size={16} />
            <span>Generate Content Brief</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        {[
          { id: 'all', label: `All Keywords (${keywords.length})` },
          { id: 'primary_secondary', label: `Primary & Secondary (${keywords.filter((k) => k.category === 'primary' || k.category === 'secondary').length})` },
          { id: 'short_tail', label: `Short-Tail (${keywords.filter((k) => k.category === 'short-tail').length})` },
          { id: 'long_tail', label: `Long-Tail (${keywords.filter((k) => k.category === 'long-tail').length})` },
          { id: 'supporting', label: `Supporting Terms (${keywords.filter((k) => k.category === 'supporting' || k.category === 'semantic-variation').length})` },
          { id: 'questions', label: `Questions (${keywords.filter((k) => k.category === 'question').length})` },
          { id: 'entities', label: `Entities (${keywords.filter((k) => k.category === 'entity').length})` },
          { id: 'opportunities', label: `High ROI Opportunities (${keywords.filter((k) => k.internalOpportunityScore >= 60).length})` },
          { id: 'clusters', label: `Topic Clusters (${clusters.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Topic Clusters View (if clusters tab active) */}
      {activeTab === 'clusters' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {clusters.map((cluster) => (
            <div
              key={cluster.name}
              style={{
                background: 'var(--bg-glass-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Layers size={16} color="var(--primary)" />
                  {cluster.name}
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontWeight: 700 }}>
                  Avg Score: {cluster.averageScore}/100
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {cluster.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Keywords Table */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px', background: 'var(--bg-glass-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search strategy keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Intent:</span>
              {['all', 'Informational', 'Commercial', 'Transactional', 'Navigational'].map((intent) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => setIntentFilter(intent)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: intentFilter === intent ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: intentFilter === intent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    color: intentFilter === intent ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {intent}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Keyword & Intent</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Site Coverage</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Opportunity Signal</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Placement Suggestions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((item) => {
                  const isExpanded = expandedKeywordId === item.id;
                  const oppColor = item.internalOpportunityScore >= 75 ? 'var(--accent-emerald)' : item.internalOpportunityScore >= 50 ? 'var(--accent-amber)' : 'var(--text-muted)';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '320px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {item.keyword}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', fontWeight: 600 }}>
                            {item.estimatedIntent}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.topicCluster}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {item.category.replace('-', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: item.currentWebsiteCoverage > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          {item.currentWebsiteCoverage}%
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', background: `${oppColor}18`, border: `1px solid ${oppColor}40`, color: oppColor, fontWeight: 700 }}>
                          {item.internalOpportunityScore}/100
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {item.placements[0]?.suggestion || 'Use naturally in headings and body'}
                          </div>
                          {item.placements.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedKeywordId(isExpanded ? null : item.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <span>{isExpanded ? 'Hide placements' : `+${item.placements.length - 1} more placements`}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                          {isExpanded && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                              {item.placements.slice(1).map((p, idx) => (
                                <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{p.location}:</strong> {p.suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
