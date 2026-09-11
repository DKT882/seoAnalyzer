'use client';

import { useState, useMemo } from 'react';
import { KeywordItem, KeywordOpportunityItem, TopicCluster, EntityItem } from '@/types';
import { KeywordTable } from './KeywordTable';
import { TopicClustersView } from './TopicClustersView';
import { RankingOpportunityView } from './RankingOpportunityView';
import {
  Key,
  Star,
  Layers,
  Sparkles,
  HelpCircle,
  Hash,
  Boxes,
  X,
  Check,
} from 'lucide-react';

export interface KeywordIntelligenceViewProps {
  keywords: {
    all: KeywordItem[];
    primary: KeywordItem[];
    secondary: KeywordItem[];
    shortTail: KeywordItem[];
    longTail: KeywordItem[];
    related: KeywordItem[];
    questions: KeywordItem[];
    entities: EntityItem[];
    clusters: TopicCluster[];
    opportunities: KeywordOpportunityItem[];
    totalWords: number;
    uniqueWords: number;
  };
  initialSearch?: string;
  onSelectKeyword?: (kw: string) => void;
}

export function KeywordIntelligenceView({
  keywords,
  initialSearch = '',
}: KeywordIntelligenceViewProps) {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'primary' | 'secondary' | 'shortTail' | 'longTail' | 'questions' | 'opportunities' | 'clusters'
  >('all');
  const [selectedKeywordDetail, setSelectedKeywordDetail] = useState<KeywordItem | null>(null);

  const tabs = [
    { id: 'all', label: `All Keywords (${keywords.all.length})`, icon: <Key size={15} /> },
    { id: 'primary', label: `Primary (${keywords.primary.length})`, icon: <Star size={15} /> },
    { id: 'secondary', label: `Secondary (${keywords.secondary.length})`, icon: <Layers size={15} /> },
    { id: 'shortTail', label: `Short-Tail (${keywords.shortTail.length})`, icon: <Hash size={15} /> },
    { id: 'longTail', label: `Long-Tail (${keywords.longTail.length})`, icon: <Hash size={15} /> },
    { id: 'questions', label: `Questions (${keywords.questions.length})`, icon: <HelpCircle size={15} /> },
    { id: 'opportunities', label: `Opportunities (${keywords.opportunities.length})`, icon: <Sparkles size={15} /> },
    { id: 'clusters', label: `Clusters & Entities (${keywords.clusters.length})`, icon: <Boxes size={15} /> },
  ];

  const currentKeywordList = useMemo(() => {
    switch (activeCategory) {
      case 'primary':
        return keywords.primary;
      case 'secondary':
        return keywords.secondary;
      case 'shortTail':
        return keywords.shortTail;
      case 'longTail':
        return keywords.longTail;
      case 'questions':
        return keywords.questions;
      default:
        return keywords.all;
    }
  }, [activeCategory, keywords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Category Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveCategory(t.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: activeCategory === t.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
              color: activeCategory === t.id ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* View Rendering based on active category */}
      {activeCategory === 'opportunities' ? (
        <RankingOpportunityView
          opportunities={keywords.opportunities}
          onSelectKeyword={(kw: string) => {
            const found = keywords.all.find((k) => k.keyword.toLowerCase() === kw.toLowerCase());
            if (found) setSelectedKeywordDetail(found);
          }}
        />
      ) : activeCategory === 'clusters' ? (
        <TopicClustersView
          clusters={keywords.clusters}
          entities={keywords.entities}
          onSelectKeyword={(kw: string) => {
            const found = keywords.all.find((k) => k.keyword.toLowerCase() === kw.toLowerCase());
            if (found) setSelectedKeywordDetail(found);
          }}
        />
      ) : (
        <KeywordTable
          keywords={currentKeywordList}
          initialSearch={initialSearch}
          onSelectKeyword={(kwItem: KeywordItem) => setSelectedKeywordDetail(kwItem)}
        />
      )}

      {/* Keyword Detail Information Modal / Drawer */}
      {selectedKeywordDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedKeywordDetail(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              maxWidth: '620px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    "{selectedKeywordDetail.keyword}"
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--primary-hover)',
                    }}
                  >
                    {selectedKeywordDetail.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  N-Gram: {selectedKeywordDetail.nGramType} | Length: {selectedKeywordDetail.wordCount || selectedKeywordDetail.keyword.split(' ').length} words
                </div>
              </div>
              <button
                onClick={() => setSelectedKeywordDetail(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Direct On-Page Extracted Signals (Category A) */}
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                Directly Extracted On-Page Signals (Category A)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frequency</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedKeywordDetail.frequency}x</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Density</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedKeywordDetail.density}%</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prominence</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedKeywordDetail.prominenceScore}/100</div>
                </div>
              </div>

              {/* Location Checkmarks */}
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inTitle ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inTitle ? <Check size={14} /> : <X size={14} />} In Page Title
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inH1 ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inH1 ? <Check size={14} /> : <X size={14} />} In H1 Headline
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inH2H6 ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inH2H6 ? <Check size={14} /> : <X size={14} />} In H2-H6 Subheadings
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inMeta ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inMeta ? <Check size={14} /> : <X size={14} />} In Meta Description
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inUrl ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inUrl ? <Check size={14} /> : <X size={14} />} In URL Slug
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedKeywordDetail.inAlt ? '#10b981' : 'var(--text-muted)' }}>
                  {selectedKeywordDetail.inAlt ? <Check size={14} /> : <X size={14} />} In Image ALT Text
                </div>
              </div>
            </div>

            {/* External SEO Metrics (Category B Disclosure) */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  External SEO Metrics (Category B)
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  Requires Data Provider
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', fontSize: '0.82rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Global Search Volume:</span>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>External SEO data unavailable</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Keyword Difficulty:</span>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Requires SEO data provider</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated CPC:</span>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>External SEO data unavailable</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Search Intent:</span>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Requires SEO data provider</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
