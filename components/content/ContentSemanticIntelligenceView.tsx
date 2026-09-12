'use client';

import { useState } from 'react';
import { ContentIntelligence, SEOIssue } from '@/types';
import {
  FileText,
  Compass,
  Layers,
  Heading,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BarChart3,
  HelpCircle,
  Tag,
  ShieldCheck,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export interface ContentSemanticIntelligenceViewProps {
  intelligence: ContentIntelligence;
}

export function ContentSemanticIntelligenceView({ intelligence }: ContentSemanticIntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<'topics' | 'structure' | 'headings' | 'gaps' | 'repetition'>('topics');

  const {
    extraction,
    pageType,
    searchIntent,
    primaryTopics,
    secondaryTopics,
    entities,
    contentDepth,
    headingRelationships,
    contentGaps,
    repetition,
    pageTypeRules,
    score,
    isTargetMode,
    targetKeywordAlignment,
  } = intelligence;

  const getScoreColor = (val: number) => {
    if (val >= 85) return '#10b981';
    if (val >= 70) return '#3b82f6';
    if (val >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DEEPLY_COVERED':
        return { label: 'Deeply Covered', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'MEANINGFULLY_COVERED':
        return { label: 'Meaningfully Covered', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'BRIEFLY_COVERED':
        return { label: 'Briefly Covered', bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      case 'MENTIONED':
        return { label: 'Mentioned', bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
      default:
        return { label: 'Not Detected', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Score & Classifications */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '1.75rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left: Overall Semantic Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${getScoreColor(score.overall)}22 0%, ${getScoreColor(score.overall)}44 100%)`,
              border: `3px solid ${getScoreColor(score.overall)}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: getScoreColor(score.overall) }}>
              {score.overall}
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Semantic
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Sparkles size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Content & Semantic SEO Intelligence</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '450px' }}>
              Contextual quality evaluation measuring topical depth, search intent satisfaction, and heading support.
            </p>
          </div>
        </div>

        {/* Middle: Page Type & Intent Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '85px' }}>Page Type:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <FileText size={14} />
              {pageType.detectedType}
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({pageType.confidence} conf)</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '85px' }}>Search Intent:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <Compass size={14} />
              {searchIntent.primaryIntent}
              {searchIntent.secondaryIntent && <span style={{ fontSize: '0.7rem' }}>+ {searchIntent.secondaryIntent}</span>}
            </span>
          </div>
        </div>

        {/* Right: Sub-Score Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Topical Depth</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: getScoreColor(score.topicalDepth) }}>
              {score.topicalDepth}/100
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Structure & Headings</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: getScoreColor(score.structuralClarity) }}>
              {score.structuralClarity}/100
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Intent Fulfillment</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: getScoreColor(score.intentSatisfaction) }}>
              {score.intentSatisfaction}/100
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Vocabulary Diversity</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: getScoreColor(score.originalityAndSubstance) }}>
              {score.originalityAndSubstance}/100
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'topics', label: 'Topical Coverage & Entities', icon: BookOpen },
          { id: 'structure', label: 'Content Depth & Extraction', icon: Layers },
          { id: 'headings', label: `Headings & Structure (${headingRelationships.totalHeadings})`, icon: Heading },
          { id: 'gaps', label: `Content Gaps (${contentGaps.length})`, icon: AlertTriangle },
          { id: 'repetition', label: 'Repetition & Vocabulary', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary-subtle, rgba(59,130,246,0.08))' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TOPICAL COVERAGE & ENTITIES */}
      {activeTab === 'topics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isTargetMode && targetKeywordAlignment && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.5rem' }}>
                Target Keyword Alignment Mode ({targetKeywordAlignment.coverageRatio}% Matched)
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {targetKeywordAlignment.targetKeywords.map((tk) => {
                  const isCovered = !targetKeywordAlignment.gaps.includes(tk);
                  return (
                    <span
                      key={tk}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: isCovered ? '#ecfdf5' : '#fef2f2',
                        color: isCovered ? '#059669' : '#dc2626',
                        border: `1px solid ${isCovered ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    >
                      {isCovered ? '✓ ' : '✗ '} {tk}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Topics Table */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Primary Detected Topics & Coverage Status</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Topic Concept</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Coverage Level</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Occurrences</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Locations Found</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Sample Context</th>
                  </tr>
                </thead>
                <tbody>
                  {primaryTopics.map((topic, idx) => {
                    const badge = getStatusBadge(topic.status);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>{topic.topic}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{topic.occurrences}x</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {topic.locationsFound.join(', ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                          {topic.contextSnippet || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Secondary Topics & Entities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Secondary Topics ({secondaryTopics.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {secondaryTopics.map((st, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.25rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                    }}
                  >
                    {st.topic} <span style={{ opacity: 0.6 }}>({st.occurrences}x)</span>
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Detected Entities ({entities.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {entities.map((ent, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      color: '#7c3aed',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      padding: '0.25rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                    }}
                  >
                    <Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {ent.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT DEPTH & EXTRACTION */}
      {activeTab === 'structure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Main Content Words</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {extraction.mainContentWordCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Excludes headers, footers & ads
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Excluded Boilerplate Words</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {extraction.excludedWordCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {extraction.boilerPlateRatio}% of total page words
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Content-to-HTML Ratio</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                {extraction.contentToHtmlRatio}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Clean text density ratio
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Page Type Rule Assessment</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem', color: pageTypeRules.failedCount === 0 ? '#10b981' : '#f59e0b' }}>
                {pageTypeRules.passedCount}/{pageTypeRules.rulesEvaluated.length} Passed
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {pageTypeRules.summary}
              </div>
            </div>
          </div>

          {/* Explanation Box */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Contextual Depth Benchmark Evaluation</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {contentDepth.explanation}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: HEADINGS & STRUCTURE */}
      {activeTab === 'headings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            {headingRelationships.summary}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {headingRelationships.headings.map((h, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${h.isSupported ? 'var(--border-subtle)' : '#fca5a5'}`,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'var(--bg-subtle)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '3px',
                      }}
                    >
                      H{h.level}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{h.headingText}</span>
                  </div>
                  {h.issue && (
                    <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.35rem' }}>
                      ⚠️ {h.issue}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: h.supportingWordCount >= 15 ? '#10b981' : '#f59e0b' }}>
                    {h.supportingWordCount} words
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {h.subHeadingCount} sub-headings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONTENT GAPS */}
      {activeTab === 'gaps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {contentGaps.length === 0 ? (
            <div
              style={{
                padding: '2.5rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>No Explicit Content Gaps Detected</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                All declared heading topics and expected page type components are adequately supported with text.
              </p>
            </div>
          ) : (
            contentGaps.map((gap, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #fecaca',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} color="#dc2626" />
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{gap.topic}</h4>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: gap.priority === 'HIGH' ? '#fef2f2' : '#fef3c7',
                      color: gap.priority === 'HIGH' ? '#dc2626' : '#d97706',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {gap.priority} PRIORITY GAP
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{gap.missingAspect}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}><strong>Evidence:</strong> {gap.evidence}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  💡 <strong>Action:</strong> Create section &ldquo;{gap.suggestedSection}&rdquo; with clear explanatory details.
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: REPETITION & VOCABULARY */}
      {activeTab === 'repetition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Vocabulary Diversity & Phrasing Variation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{repetition.summary}</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem' }}>
                Diversity Score: <strong>{repetition.vocabularyDiversityScore}/100</strong>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Duplicated Sentences: <strong>{repetition.repetitiveSentencesCount}</strong>
              </div>
            </div>
          </div>

          {repetition.repetitivePhrases.length > 0 && (
            <div
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Frequent Repeating Phrases</h4>
              </div>
              <div style={{ padding: '0.5rem 1.25rem' }}>
                {repetition.repetitivePhrases.map((rp, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.65rem 0',
                      borderBottom: i < repetition.repetitivePhrases.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span>&ldquo;{rp.phrase}&rdquo;</span>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>{rp.occurrences} occurrences</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
