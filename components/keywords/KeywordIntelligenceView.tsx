'use client';

import { useState, useMemo, useEffect } from 'react';
import { KeywordItem, KeywordOpportunityItem, TopicCluster, EntityItem } from '@/types';
import { EnrichedKeyword, ProviderStatusInfo } from '@/lib/providers/seo/types';
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
  Check,
  Target,
  ShieldCheck,
  Compass,
  Info,
  Globe,
  RefreshCw,
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
    recommended?: KeywordItem[];
    recommendationNotice?: string;
    primaryKeywordDetails?: {
      keyword: string;
      confidenceScore: number;
      evidence: string[];
    };
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
    'all' | 'primary' | 'secondary' | 'shortTail' | 'longTail' | 'questions' | 'recommended' | 'opportunities' | 'clusters'
  >('all');
  const [enrichedMap, setEnrichedMap] = useState<Map<string, EnrichedKeyword>>(new Map());
  const [providerStatus, setProviderStatus] = useState<ProviderStatusInfo | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const recommendedList = keywords.recommended || [];
  const primaryDetails = keywords.primaryKeywordDetails;

  // Check provider status on mount and enrich top keywords
  useEffect(() => {
    let isMounted = true;

    fetch('/api/seo/provider-status')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setProviderStatus(data.data);
        }
      })
      .catch(() => {});

    // Automatically trigger enrichment engine on client
    if (keywords.all.length > 0) {
      setIsEnriching(true);
      fetch('/api/seo/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.all.slice(0, 50),
          country: 'US',
          language: 'en',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          setIsEnriching(false);
          if (data.success && Array.isArray(data.data)) {
            const map = new Map<string, EnrichedKeyword>();
            for (const item of data.data) {
              map.set(item.keyword.toLowerCase().trim(), item);
            }
            setEnrichedMap(map);
          }
        })
        .catch(() => {
          if (isMounted) setIsEnriching(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [keywords.all]);

  const tabs = [
    { id: 'all', label: `All Extracted (${keywords.all.length})`, icon: <Key size={15} /> },
    { id: 'primary', label: `Primary (${keywords.primary.length})`, icon: <Star size={15} /> },
    { id: 'secondary', label: `Secondary (${keywords.secondary.length})`, icon: <Layers size={15} /> },
    { id: 'shortTail', label: `Short-Tail (${keywords.shortTail.length})`, icon: <Hash size={15} /> },
    { id: 'longTail', label: `Long-Tail (${keywords.longTail.length})`, icon: <Hash size={15} /> },
    { id: 'questions', label: `Questions (${keywords.questions.length})`, icon: <HelpCircle size={15} /> },
    { id: 'recommended', label: `Recommended Targets (${recommendedList.length})`, icon: <Target size={15} /> },
    { id: 'opportunities', label: `Opportunities (${keywords.opportunities.length})`, icon: <Sparkles size={15} /> },
    { id: 'clusters', label: `Clusters & Entities (${keywords.clusters.length})`, icon: <Boxes size={15} /> },
  ];

  const currentKeywordList = useMemo(() => {
    let baseList: KeywordItem[] = [];
    switch (activeCategory) {
      case 'primary':
        baseList = keywords.primary;
        break;
      case 'secondary':
        baseList = keywords.secondary;
        break;
      case 'shortTail':
        baseList = keywords.shortTail;
        break;
      case 'longTail':
        baseList = keywords.longTail;
        break;
      case 'questions':
        baseList = keywords.questions;
        break;
      case 'recommended':
        baseList = recommendedList;
        break;
      default:
        baseList = keywords.all;
        break;
    }

    // Map each keyword item to its enriched representation if available
    return baseList.map((item) => {
      const enriched = enrichedMap.get(item.keyword.toLowerCase().trim());
      return enriched || item;
    });
  }, [activeCategory, keywords, recommendedList, enrichedMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Status & Primary Topic Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: primaryDetails?.keyword ? '2fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Primary Keyword Intelligence Banner */}
        {primaryDetails && primaryDetails.keyword && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '12px',
              padding: '1.15rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    Detected Primary Focus Topic
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                    "{primaryDetails.keyword}"
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                }}
              >
                <Compass size={14} color="#10b981" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                  Confidence: {primaryDetails.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Evidence List */}
            {primaryDetails.evidence && primaryDetails.evidence.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                {primaryDetails.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    <Check size={11} color="#10b981" />
                    <span>{ev}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* External Provider Data Status Card */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Globe size={16} className="text-indigo-400" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>SEO Data Provider</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.12rem 0.45rem',
                borderRadius: '4px',
                background:
                  providerStatus?.configured && providerStatus.status === 'CONNECTED'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                color:
                  providerStatus?.configured && providerStatus.status === 'CONNECTED' ? '#34d399' : '#fbbf24',
                border:
                  providerStatus?.configured && providerStatus.status === 'CONNECTED'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {providerStatus?.configured ? 'Connected' : 'Not Configured'}
            </span>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
            {providerStatus?.configured
              ? `Connected to ${providerStatus.provider}. Live Google Ads search volume, KD, and SERP data active.`
              : 'External market provider not configured. Operating in high-precision On-Page Deterministic Mode.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Category A: Extracted | Category B: External</span>
            {isEnriching && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#818cf8' }}>
                <RefreshCw size={10} className="animate-spin" /> Enriching...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid #334155',
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
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: activeCategory === t.id ? '#6366f1' : '#1e293b',
              color: activeCategory === t.id ? '#ffffff' : '#cbd5e1',
              border: activeCategory === t.id ? '1px solid #818cf8' : '1px solid #334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
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
          onSelectKeyword={() => {}}
        />
      ) : activeCategory === 'clusters' ? (
        <TopicClustersView
          clusters={keywords.clusters}
          entities={keywords.entities}
          onSelectKeyword={() => {}}
        />
      ) : activeCategory === 'recommended' && recommendedList.length === 0 ? (
        <div
          style={{
            padding: '3.5rem 2rem',
            background: '#0f172a',
            borderRadius: '12px',
            border: '1px solid #1e293b',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <Info size={24} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
            No Synthetic Keyword Recommendations
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.6 }}>
            {keywords.recommendationNotice ||
              'Page contains insufficient topical depth to infer reliable secondary keyword opportunities without fabricating generic modifiers.'}
          </div>
        </div>
      ) : (
        <KeywordTable keywords={currentKeywordList} initialSearch={initialSearch} />
      )}
    </div>
  );
}
