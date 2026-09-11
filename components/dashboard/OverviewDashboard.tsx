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
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report.url}
            <a href={report.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
              <ExternalLink size={16} />
            </a>
          </h2>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Analyzed in <strong>{report.durationMs}ms</strong> | Page Size: <strong>{formatBytes(report.technical.pageSizeBytes)}</strong> | Response Time: <strong>{report.technical.responseTimeMs}ms</strong>
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
