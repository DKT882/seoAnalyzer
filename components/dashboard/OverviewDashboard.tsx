'use client';

import { SEOReport } from '@/types';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { MetricCard } from '@/components/ui/MetricCard';
import { IssueBadge } from '@/components/ui/IssueBadge';
import { formatBytes, getScoreColor } from '@/lib/utils/formatters';
import {
  FileText,
  Clock,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Key,
  Cpu,
  Layers,
  Zap,
  Info,
} from 'lucide-react';

interface OverviewDashboardProps {
  report: SEOReport;
  onNavigateTab: (tabId: string) => void;
  onSelectKeyword?: (keyword: string) => void;
}

export function OverviewDashboard({ report, onNavigateTab, onSelectKeyword }: OverviewDashboardProps) {
  const criticalCount = report.issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = report.issues.filter((i) => i.severity === 'WARNING').length;
  const passedCount = report.issues.filter((i) => i.severity === 'GOOD').length;

  const { onPage, technical, content, links, mobile } = report.scores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner with URL & Key Status */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div style={{ minWidth: '280px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: report.technical.httpStatus === 200 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: report.technical.httpStatus === 200 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                border: report.technical.httpStatus === 200 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              HTTP {report.technical.httpStatus}
            </span>

            {report.technical.isHttps && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                HTTPS Secure
              </span>
            )}

            {report.technical.isIndexable ? (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                Indexable
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                Noindex Blocked
              </span>
            )}

            {report.analysisMode === 'STATIC_AND_RENDERED' ? (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-purple)', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                🌐 Static + Browser Rendered
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                ⚡ Static HTML Analysis
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report.url}
            <a href={report.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
              <ExternalLink size={16} />
            </a>
          </h2>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Analyzed in <strong>{report.durationMs}ms</strong> {report.browserRenderStatus?.durationMs ? `(Browser: ${report.browserRenderStatus.durationMs}ms) ` : ''}| Page Size: <strong>{formatBytes(report.technical.pageSizeBytes)}</strong> | Response Time: <strong>{report.technical.responseTimeMs}ms</strong>
          </div>
        </div>

        {/* Audit Issue Summary Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTab('technical')}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <IssueBadge severity="CRITICAL" count={criticalCount} />
          </button>
          <button
            onClick={() => onNavigateTab('technical')}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <IssueBadge severity="WARNING" count={warningCount} />
          </button>
          <button
            onClick={() => onNavigateTab('technical')}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <IssueBadge severity="GOOD" count={passedCount} />
          </button>
        </div>
      </div>

      {/* Keyword / Topic Analysis Mode Status Banner */}
      {(() => {
        const topicData = report.topicCoverageData;
        const isTargetMode = topicData?.mode === 'TARGET_KEYWORD_ANALYSIS';
        const targetKws = topicData?.targetKeywords || report.targetKeywords || [];

        return (
          <div
            style={{
              background: isTargetMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(6, 182, 212, 0.08)',
              border: `1px solid ${isTargetMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isTargetMode ? 'var(--primary)' : 'var(--accent-cyan)',
                    color: '#fff',
                  }}
                >
                  {isTargetMode ? '🎯 Target Keyword Analysis Mode' : '🔍 Automatic Page Topic Analysis Mode'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {isTargetMode
                    ? `Analyzing against ${targetKws.length} user-supplied target keyword(s)`
                    : 'Target keywords were not provided. Analysis is based on topics extracted from the webpage.'}
                </span>
              </div>
              {isTargetMode && targetKws.length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  <strong>Target Keywords:</strong> {targetKws.join(', ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {isTargetMode ? 'Target Keyword Coverage' : 'Topic Coverage'}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {topicData?.coveragePercentage ?? report.contentContribution?.topicCoverageScore ?? 100}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {isTargetMode ? 'Target Match Count' : 'Primary Topics'}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  {isTargetMode ? targetKws.length : (topicData?.primaryTopicsDetected?.length || report.keywords.primary.length)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Browser Rendering & Hydration Delta Section (when available or attempted) */}
      {report.hydrationDelta && (
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                <Cpu size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Browser Rendering & Hydration Delta
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
                  Comparing initial static HTML against JavaScript-rendered DOM snapshot.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                ✓ Rendered in {report.browserRenderStatus?.durationMs ?? 0}ms
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {report.hydrationDelta.seoRelevantChangeCount} SEO change{report.hydrationDelta.seoRelevantChangeCount === 1 ? '' : 's'} detected
              </span>
            </div>
          </div>

          {/* Snapshot Comparison Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {/* Word Count Delta */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Visible Word Count</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {report.hydrationDelta.renderedSnapshot.wordCount}
                </span>
                <span style={{ fontSize: '0.8rem', color: report.hydrationDelta.changed.wordCountDelta > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  ({report.hydrationDelta.staticSnapshot.wordCount} static {report.hydrationDelta.changed.wordCountDelta >= 0 ? `+${report.hydrationDelta.changed.wordCountDelta}` : report.hydrationDelta.changed.wordCountDelta})
                </span>
              </div>
            </div>

            {/* H1 Comparison */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>H1 Status</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {report.hydrationDelta.staticSnapshot.h1Count === 0 && report.hydrationDelta.renderedSnapshot.h1Count > 0 ? (
                  <span style={{ color: 'var(--accent-cyan)' }}>Injected via JS ({report.hydrationDelta.renderedSnapshot.h1Count})</span>
                ) : report.hydrationDelta.renderedSnapshot.h1Count === 1 ? (
                  <span style={{ color: 'var(--accent-emerald)' }}>Optimal (1 H1)</span>
                ) : report.hydrationDelta.renderedSnapshot.h1Count > 1 ? (
                  <span style={{ color: 'var(--accent-amber)' }}>Multiple ({report.hydrationDelta.renderedSnapshot.h1Count} H1s)</span>
                ) : (
                  <span style={{ color: 'var(--accent-rose)' }}>Missing (0 H1)</span>
                )}
              </div>
            </div>

            {/* Links Count */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Links Hydrated</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {report.hydrationDelta.renderedSnapshot.totalLinksCount}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({report.hydrationDelta.staticSnapshot.totalLinksCount} static)
                </span>
              </div>
            </div>

            {/* Structured Data */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Schemas Found</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {report.hydrationDelta.renderedSnapshot.schemasCount}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({report.hydrationDelta.staticSnapshot.schemasCount} static)
                </span>
              </div>
            </div>
          </div>

          {/* Discrepancies & Hydration Insights List */}
          {report.hydrationDelta.discrepancies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Hydration Insights & Discrepancies:
              </div>
              {report.hydrationDelta.discrepancies.map((disc, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background:
                      disc.severity === 'CRITICAL'
                        ? 'rgba(244, 63, 94, 0.08)'
                        : disc.severity === 'WARNING'
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(99, 102, 241, 0.08)',
                    borderLeft: `3px solid ${
                      disc.severity === 'CRITICAL'
                        ? 'var(--accent-rose)'
                        : disc.severity === 'WARNING'
                        ? 'var(--accent-amber)'
                        : 'var(--primary)'
                    }`,
                    fontSize: '0.825rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                    {disc.title}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{disc.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={15} />
              <span>Static HTML and Rendered DOM are in complete alignment. No hydration discrepancies detected.</span>
            </div>
          )}

          {/* Synthetic Performance Telemetry */}
          {report.browserPerformance && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ⚡ Synthetic Telemetry: Navigation: <strong>{report.browserPerformance.navigationTimingMs ?? 'N/A'}ms</strong> | DOMContentLoaded: <strong>{report.browserPerformance.domContentLoadedMs ?? 'N/A'}ms</strong> | Load: <strong>{report.browserPerformance.loadEventMs ?? 'N/A'}ms</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {report.browserPerformance.cruxNotice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback Note when Browser Rendering was attempted but failed */}
      {!report.hydrationDelta && report.browserRenderStatus?.attempted && !report.browserRenderStatus?.successful && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--accent-amber)',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Browser rendering fallback:</strong> Playwright rendering was unavailable or timed out ({report.browserRenderStatus.fallbackReason || 'Headless browser launch skipped'}). Results are based entirely on the high-fidelity initial HTML response.
          </div>
        </div>
      )}

      {/* Hero Score Gauge & 5 Category Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Main Overall Score Card */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <ScoreGauge score={report.scores.overall} size={190} strokeWidth={16} label="Overall SEO Health Score" />
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.75rem', maxWidth: '300px' }}>
            Weighted deterministic score aggregated across On-page, Technical, Content, Links, and Mobile signals.
          </p>
        </div>

        {/* 5 Category Sub-Scores Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            { label: 'On-Page SEO', score: onPage, weight: '30% weight', tab: 'onpage', desc: 'Title, Meta, H1, Canonical' },
            { label: 'Technical SEO', score: technical, weight: '25% weight', tab: 'technical', desc: 'HTTP, SSL, Robots, Sitemap' },
            { label: 'Content & Keywords', score: content, weight: '25% weight', tab: 'keywords', desc: 'Word count, Density, TF-IDF' },
            { label: 'Semantic Intel', score: report.contentIntelligence?.score.overall ?? 85, weight: 'Quality & Intent', tab: 'content_intelligence', desc: `${report.contentIntelligence?.pageType.detectedType || 'Content'} • ${report.contentIntelligence?.searchIntent.primaryIntent || 'Intent'}` },
            { label: 'Links & Images', score: links, weight: '10% weight', tab: 'links_images', desc: 'Internal links, ALT coverage' },
            { label: 'Mobile & UX', score: mobile, weight: '10% weight', tab: 'onpage', desc: 'Viewport, Language, Structure' },
          ].map((cat) => {
            const { color } = getScoreColor(cat.score);
            return (
              <div
                key={cat.label}
                onClick={() => onNavigateTab(cat.tab)}
                style={{
                  background: 'var(--bg-glass-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cat.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.weight}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {cat.desc}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color }}>
                    {cat.score}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cat.score}%`, background: color, borderRadius: '999px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        <MetricCard
          label="Total Word Count"
          value={report.onPage.wordCount}
          sublabel={`~${report.onPage.readingTimeMinutes} min read`}
          icon={<FileText size={20} />}
        />
        <MetricCard
          label="Heading Count"
          value={report.onPage.headings.items.length}
          sublabel={`H1: ${report.onPage.headings.h1Count} | H2: ${report.onPage.headings.h2Count}`}
          icon={<Code size={20} />}
        />
        <MetricCard
          label="Total Links"
          value={report.links.totalLinks}
          sublabel={`Internal: ${report.links.internalLinksCount} | External: ${report.links.externalLinksCount}`}
          icon={<LinkIcon size={20} />}
        />
        <MetricCard
          label="Image ALT Coverage"
          value={`${report.images.altCoverageRatio}%`}
          sublabel={`${report.images.withAlt} / ${report.images.totalImages} with alt`}
          icon={<ImageIcon size={20} />}
          statusColor={report.images.altCoverageRatio >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
        />
        <MetricCard
          label="Structured Data"
          value={report.schemas.length}
          sublabel={report.schemas.length > 0 ? report.schemas.map((s) => s.type).join(', ') : 'None detected'}
          icon={<CheckCircle size={20} />}
        />
        <MetricCard
          label="Server Response"
          value={`${report.technical.responseTimeMs}ms`}
          sublabel={report.technical.responseTimeMs < 1000 ? 'Fast response' : 'Consider caching'}
          icon={<Clock size={20} />}
          statusColor={report.technical.responseTimeMs < 1500 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
        />
      </div>

      {/* Top Primary Keywords Preview & Critical Callouts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Top Keywords Card */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem' }}>
              <Key size={18} color="var(--primary)" />
              <span>Top Extracted Keywords</span>
            </div>
            <button
              onClick={() => onNavigateTab('keywords')}
              style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              View All ({report.keywords.all.length}) →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {report.keywords.all.slice(0, 5).map((kw) => (
              <div
                key={kw.id}
                onClick={() => {
                  if (onSelectKeyword) onSelectKeyword(kw.keyword);
                  onNavigateTab('keywords');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {kw.keyword}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {kw.nGramType} | Freq: {kw.frequency} | Density: {kw.density}%
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      color: getScoreColor(kw.overallScore).color,
                    }}
                  >
                    {kw.overallScore}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>score</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Action Issues Card */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem' }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              <span>Priority SEO Fixes</span>
            </div>
            <button
              onClick={() => onNavigateTab('technical')}
              style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              All Audits ({report.issues.length}) →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.issues
              .filter((i) => i.severity === 'CRITICAL' || i.severity === 'WARNING')
              .slice(0, 4)
              .map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: issue.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    borderLeft: `3px solid ${issue.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-amber)'}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {issue.severity === 'CRITICAL' ? (
                      <XCircle size={15} color="var(--accent-rose)" />
                    ) : (
                      <AlertTriangle size={15} color="var(--accent-amber)" />
                    )}
                    {issue.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {issue.description}
                  </div>
                </div>
              ))}

            {report.issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'WARNING').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--accent-emerald)' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 600 }}>No Critical Issues or Warnings Found!</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page adheres to key on-page SEO best practices.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
