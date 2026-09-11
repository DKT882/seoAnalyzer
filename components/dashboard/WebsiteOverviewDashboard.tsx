'use client';

import { WebsiteCrawlReport } from '@/types';
import { ScoreGauge } from '../ui/ScoreGauge';
import { Globe, FileText, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers, Link as LinkIcon, Image as ImageIcon, ShieldCheck, Sparkles } from 'lucide-react';

interface WebsiteOverviewDashboardProps {
  report: WebsiteCrawlReport;
  onSelectPage?: (pageUrl: string) => void;
}

export function WebsiteOverviewDashboard({ report, onSelectPage }: WebsiteOverviewDashboardProps) {
  const { overview } = report;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Domain & Health */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <ScoreGauge score={overview.seoScores.averageOverall} size={110} strokeWidth={9} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Globe size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {report.domain}
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Whole-Website Intelligence Audit • {overview.coverage.pagesAnalyzed} of {overview.coverage.pagesDiscovered} pages crawled ({overview.coverage.coverageRatio}% coverage)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>On-Page Avg</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overview.seoScores.averageOnPage >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {overview.seoScores.averageOnPage}/100
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Technical Avg</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overview.seoScores.averageTechnical >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {overview.seoScores.averageTechnical}/100
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Content Avg</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overview.seoScores.averageContent >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {overview.seoScores.averageContent}/100
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Links Avg</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overview.seoScores.averageLinks >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {overview.seoScores.averageLinks}/100
            </div>
          </div>
        </div>
      </div>

      {/* Best vs Weakest Page Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Best Page */}
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>
              <ArrowUpRight size={18} />
              Highest Scoring Page
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {overview.seoScores.bestPage.score}/100
            </span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {overview.seoScores.bestPage.title}
          </div>
          <div
            onClick={() => onSelectPage && onSelectPage(overview.seoScores.bestPage.url)}
            style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {overview.seoScores.bestPage.url}
          </div>
        </div>

        {/* Weakest Page */}
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.85rem' }}>
              <ArrowDownRight size={18} />
              Lowest Scoring Page (Priority Focus)
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
              {overview.seoScores.weakestPage.score}/100
            </span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {overview.seoScores.weakestPage.title}
          </div>
          <div
            onClick={() => onSelectPage && onSelectPage(overview.seoScores.weakestPage.url)}
            style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {overview.seoScores.weakestPage.url}
          </div>
        </div>
      </div>

      {/* Structural Totals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <FileText size={16} color="var(--primary)" />
            Average Word Count
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {overview.seoScores.averageWordCount.toLocaleString()} words
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            Total Site Keywords
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {report.siteKeywords.length.toLocaleString()} unique
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <LinkIcon size={16} color="var(--accent-amber)" />
            Total Internal Links
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {overview.siteStructure.totalInternalLinks.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <ImageIcon size={16} color="var(--accent-rose)" />
            Image ALT Issues
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: overview.siteStructure.missingAltImagesCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {overview.siteStructure.missingAltImagesCount} missing
          </div>
        </div>
      </div>
    </div>
  );
}
