import { useState } from 'react';
import {
  CompetitorComparisonReport,
  KeywordGapType,
} from '@seo-analyzer/shared';
import { apiClient } from '../../services/apiClient.js';
import {
  Users,
  Plus,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Search,
} from 'lucide-react';

export function CompetitorCompareView() {
  const [targetUrl, setTargetUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CompetitorComparisonReport | null>(null);

  // Sub-tabs in Comparison report
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'keyword_gap' | 'content_gap' | 'advantages' | 'outrank'>('matrix');

  // Keyword Gap Matrix filters
  const [gapFilter, setGapFilter] = useState<KeywordGapType | 'all'>('all');
  const [kwSearch, setKwSearch] = useState('');

  const handleAddCompetitor = () => {
    if (competitorUrls.length < 4) {
      setCompetitorUrls([...competitorUrls, '']);
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    if (competitorUrls.length > 1) {
      setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
    }
  };

  const handleCompetitorChange = (index: number, val: string) => {
    const updated = [...competitorUrls];
    updated[index] = val;
    setCompetitorUrls(updated);
  };

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      setError('Target webpage URL is required.');
      return;
    }

    const cleanCompetitors = competitorUrls.filter((u) => u.trim());
    if (cleanCompetitors.length === 0) {
      setError('Please provide at least 1 competitor URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.compareCompetitors({
        targetUrl: targetUrl.trim(),
        competitorUrls: cleanCompetitors,
      });

      if (res.report) {
        setReport(res.report);
      } else {
        throw new Error(res.error || 'Failed to compare competitor websites.');
      }
    } catch (err: any) {
      setError(err.message || 'Comparison failed. Please verify URLs are public and accessible.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGapRows = report
    ? report.keywordGapMatrix.filter((row) => {
        if (gapFilter !== 'all' && row.gapType !== gapFilter) return false;
        if (kwSearch.trim()) {
          return row.keyword.toLowerCase().includes(kwSearch.toLowerCase());
        }
        return true;
      })
    : [];

  const getGapBadge = (type: KeywordGapType) => {
    switch (type) {
      case 'missing_in_target':
        return (
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            Missing in Target
          </span>
        );
      case 'high_opportunity':
        return (
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            High Opportunity
          </span>
        );
      case 'shared_by_all':
        return (
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            Shared By All
          </span>
        );
      case 'target_unique':
        return (
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            Target Exclusive
          </span>
        );
      default:
        return (
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
            Competitor Only
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Form Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Users size={24} color="var(--primary)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Competitor SEO & Content Comparison</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '850px' }}>
          Compare your target webpage against up to 4 competitor URLs (2 to 5 websites total). Uncover keyword gaps, missing topical depth, structural differences, and actionable outrank opportunities.
        </p>

        <form onSubmit={handleRunComparison} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Target URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Target Webpage URL (Your Site)
            </label>
            <input
              type="url"
              placeholder="https://yourwebsite.com/target-page"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Competitor URLs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Competitor Webpages ({competitorUrls.length} of 4)
              </label>
              {competitorUrls.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddCompetitor}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary-hover)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Plus size={14} /> Add Another Competitor
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {competitorUrls.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder={`https://competitor-${idx + 1}.com/ranking-page`}
                    value={url}
                    onChange={(e) => handleCompetitorChange(idx, e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                    }}
                  />
                  {competitorUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetitor(idx)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem',
                        cursor: 'pointer',
                      }}
                      title="Remove competitor"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.85rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px var(--primary-glow)',
              alignSelf: 'flex-start',
            }}
          >
            {isLoading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Crawling & Comparing ({competitorUrls.filter(Boolean).length + 1} Sites)...
              </>
            ) : (
              <>
                <Play size={16} /> Run Competitor Intelligence
              </>
            )}
          </button>
        </form>
      </div>

      {/* Comparison Report Content */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Sub Navigation Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
            {[
              { id: 'matrix', label: 'Comparison Matrix', icon: <Layers size={15} /> },
              { id: 'keyword_gap', label: `Keyword Gap (${report.keywordGapMatrix.length})`, icon: <Sparkles size={15} /> },
              { id: 'content_gap', label: `Content Gap (${report.contentGap.missingTopics.length})`, icon: <TrendingUp size={15} /> },
              { id: 'advantages', label: 'Strengths & Deficiencies', icon: <Award size={15} /> },
              { id: 'outrank', label: `How to Outrank (${report.outrankRecommendations.length})`, icon: <Sparkles size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: activeSubTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SubTab 1: Side-by-Side Matrix */}
          {activeSubTab === 'matrix' && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700 }}>SEO & Content Metric</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary-hover)', background: 'rgba(99, 102, 241, 0.08)' }}>
                      {report.targetSummary.hostname} <br /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Target Page)</span>
                    </th>
                    {report.competitorsSummaries.map((comp) => (
                      <th key={comp.url} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700 }}>
                        {comp.hostname} <br /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Competitor)</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Overall SEO Score', key: 'overallScore', format: (v: number) => `${v}/100` },
                    { label: 'On-Page Score', key: 'onPageScore', format: (v: number) => `${v}/100` },
                    { label: 'Technical Score', key: 'technicalScore', format: (v: number) => `${v}/100` },
                    { label: 'Content Depth (Words)', key: 'wordCount', format: (v: number) => `${v.toLocaleString()} words` },
                    { label: 'Headings Count', key: 'headingCount', format: (v: number) => `${v} headings` },
                    { label: 'Discovered Keywords', key: 'keywordCount', format: (v: number) => `${v} terms` },
                    { label: 'Images Count', key: 'imageCount', format: (v: number) => `${v} images` },
                    { label: 'Image ALT Coverage', key: 'altCoverageRatio', format: (v: number) => `${Math.round(v)}%` },
                    { label: 'Internal Links', key: 'internalLinksCount', format: (v: number) => `${v} links` },
                    { label: 'External Outbound Links', key: 'externalLinksCount', format: (v: number) => `${v} links` },
                    { label: 'Schema Markup Types', key: 'schemaTypesCount', format: (v: number) => `${v} schemas` },
                    { label: 'Response Latency', key: 'responseTimeMs', format: (v: number) => `${v} ms` },
                  ].map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {row.label}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)', background: 'rgba(99, 102, 241, 0.04)' }}>
                        {row.format((report.targetSummary as any)[row.key])}
                      </td>
                      {report.competitorsSummaries.map((comp, cIdx) => (
                        <td key={cIdx} style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {row.format((comp as any)[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SubTab 2: Keyword Gap Matrix */}
          {activeSubTab === 'keyword_gap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', minWidth: '260px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search gap keywords..."
                    value={kwSearch}
                    onChange={(e) => setKwSearch(e.target.value)}
                    style={{
                      padding: '0.55rem 1rem 0.55rem 2.3rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {(['all', 'missing_in_target', 'high_opportunity', 'shared_by_all', 'target_unique'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setGapFilter(type)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: gapFilter === type ? 'var(--bg-surface-elevated)' : 'transparent',
                        color: gapFilter === type ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: gapFilter === type ? '1px solid var(--border-strong)' : '1px solid transparent',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Keyword</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Gap Type</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)' }}>Target Freq</th>
                      {report.competitorsSummaries.map((c) => (
                        <th key={c.hostname} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {c.hostname}
                        </th>
                      ))}
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Opp. Score</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Action Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGapRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {row.keyword}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          {getGapBadge(row.gapType)}
                        </td>
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'center', fontWeight: 700, color: row.targetFrequency > 0 ? '#10b981' : 'var(--text-muted)', background: 'rgba(99, 102, 241, 0.04)' }}>
                          {row.targetFrequency}x
                        </td>
                        {report.competitorsSummaries.map((c) => {
                          const freq = row.competitorFrequencies[c.hostname] || 0;
                          return (
                            <td key={c.hostname} style={{ padding: '0.7rem 1rem', textAlign: 'center', color: freq > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {freq > 0 ? `${freq}x` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'center', fontWeight: 700, color: row.opportunityScore >= 70 ? '#10b981' : '#f59e0b' }}>
                          {row.opportunityScore}/100
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {row.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 3: Content Gap Analysis */}
          {activeSubTab === 'content_gap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Missing Topics & Suggested Subsections
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Topical entities and clusters heavily covered by ranking competitor pages but completely missing from your target webpage.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {report.contentGap.missingTopics.map((mt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Topic: {mt.topic}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: mt.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: mt.priority === 'HIGH' ? '#ef4444' : '#f59e0b' }}>
                        {mt.priority} Priority
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <strong>Competitor Source:</strong> {mt.competitorsCovering.join(', ')}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.15)', padding: '0.5rem', borderRadius: '4px' }}>
                      <strong>Suggested Section:</strong> <code>{mt.suggestedSection}</code>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Supporting terms: {mt.suggestedKeywords.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SubTab 4: Strengths & Deficiencies */}
          {activeSubTab === 'advantages' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* What You Do Better */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', borderTop: '4px solid #10b981' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={18} /> What You Do Better
                </h3>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {report.whatYouDoBetter.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* What Competitors Do Better */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', borderTop: '4px solid #f59e0b' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={18} /> What Competitors Do Better
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {report.whatTheyDoBetter.map((c, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.competitor}:</strong>
                      <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {c.advantages.map((adv, aIdx) => (
                          <li key={aIdx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SubTab 5: How to Outrank */}
          {activeSubTab === 'outrank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Actionable Outrank Opportunity Recommendations
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Prioritized optimization steps derived from algorithmic comparison against all analyzed competitor pages.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report.outrankRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {rec.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: rec.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: rec.priority === 'HIGH' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {rec.priority} Priority
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>Problem:</strong> {rec.problem}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>Evidence:</strong> {rec.evidence}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(99, 102, 241, 0.08)', padding: '0.65rem', borderRadius: '4px', borderLeft: '3px solid var(--primary)' }}>
                      <strong>Action Plan:</strong> {rec.recommendedAction}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                      ✓ <strong>Expected Benefit:</strong> {rec.expectedBenefit}
                    </div>
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
