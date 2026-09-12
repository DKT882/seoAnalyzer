'use client';

import React, { useState } from 'react';
import {
  WebsiteCrawlReport,
  SiteIssue,
  PageType,
} from '@/types';
import { ScoreGauge } from '../ui/ScoreGauge';
import {
  Globe,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowUpRight,
  Layers,
  Link as LinkIcon,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Copy,
  Split,
  Compass,
  FileWarning,
} from 'lucide-react';

interface SiteAuditDashboardProps {
  report: WebsiteCrawlReport;
  onSelectPage?: (pageUrl: string) => void;
}

export function SiteAuditDashboard({ report, onSelectPage }: SiteAuditDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'issues' | 'topics' | 'links' | 'sitemap'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [pageTypeFilter, setPageTypeFilter] = useState<string>('ALL');
  const [indexableFilter, setIndexableFilter] = useState<string>('ALL');

  const { overview, siteHealthScore, siteSummary, siteIssues = [] } = report;
  const healthOverall = siteHealthScore?.overall ?? overview.seoScores.averageOverall;
  const pageRecords = report.pageRecords || [];

  // Filter pages for Pages Table
  const filteredPages = pageRecords.filter((p) => {
    const matchesSearch =
      searchFilter === '' ||
      p.normalizedUrl.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.seoReport?.onPage.title || '').toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType = pageTypeFilter === 'ALL' || p.pageType === pageTypeFilter;
    const matchesIndex =
      indexableFilter === 'ALL' ||
      (indexableFilter === 'INDEXABLE' && p.isIndexable) ||
      (indexableFilter === 'NOINDEX' && !p.isIndexable);

    return matchesSearch && matchesType && matchesIndex;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Banner: Site Health & Crawl Scope */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <ScoreGauge score={healthOverall} size={115} strokeWidth={10} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Globe size={22} color="var(--primary)" />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {report.domain}
              </h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Mode: <strong>{report.crawlMode || 'DOMAIN_CRAWL'}</strong></span>
              <span>•</span>
              <span>Crawled <strong>{overview.coverage.pagesAnalyzed}</strong> pages</span>
              <span>•</span>
              <span>Coverage: <strong>{overview.coverage.coverageRatio}%</strong></span>
            </p>
          </div>
        </div>

        {/* 4 Category Score Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', minWidth: '320px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Crawl & Technical</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (siteHealthScore?.crawlabilityAndTechnical ?? 85) >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {siteHealthScore?.crawlabilityAndTechnical ?? 85}/100
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Indexability</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (siteHealthScore?.indexabilityAndDirectives ?? 85) >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {siteHealthScore?.indexabilityAndDirectives ?? 85}/100
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Content Uniqueness</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (siteHealthScore?.contentAndDuplication ?? 85) >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {siteHealthScore?.contentAndDuplication ?? 85}/100
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Architecture & Links</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (siteHealthScore?.siteArchitectureAndLinks ?? 85) >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {siteHealthScore?.siteArchitectureAndLinks ?? 85}/100
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Site Overview & Health', count: siteIssues.length },
          { id: 'pages', label: 'Pages Explorer', count: pageRecords.length },
          { id: 'issues', label: 'Issue Explorer', count: siteIssues.length },
          { id: 'topics', label: 'Topic Clusters & Intent Overlap', count: report.topicClusterHealth?.length || 0 },
          { id: 'links', label: 'Internal Links & Opportunities', count: report.internalLinkOpportunities?.length || 0 },
          { id: 'sitemap', label: 'Sitemap & Robots', count: report.sitemapConsistency?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: activeTab === tab.id ? 'var(--primary)' : 'var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 1.1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.72rem',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: SITE OVERVIEW & HEALTH */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Indexability Breakdown</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {siteSummary?.indexability.indexable || overview.coverage.pagesAnalyzed} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Indexable</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {siteSummary?.indexability.noindex || 0} Noindex • {siteSummary?.indexability.blocked || 0} Blocked
              </div>
            </div>

            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Content Quality Distribution</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {siteSummary?.content.strongPages || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>Strong Pages</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {siteSummary?.content.moderatePages || 0} Moderate • {siteSummary?.content.thinPages || 0} Thin
              </div>
            </div>

            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Internal Link Health</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {report.internalLinkGraph?.totalEdges || overview.siteStructure.totalInternalLinks} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Links</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: (report.internalLinkGraph?.brokenInternalLinksCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {report.internalLinkGraph?.brokenInternalLinksCount || 0} Broken • {report.orphanCandidates?.length || 0} Orphan Candidates
              </div>
            </div>

            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Topic Clusters</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {report.topicClusterHealth?.length || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Clusters</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {report.searchIntentOverlaps?.length || 0} Potential Search-Intent Overlaps
              </div>
            </div>
          </div>

          {/* Top Priority Issues Banner */}
          <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              Top Priority Site Actions ({siteIssues.length} total)
            </h3>
            {siteIssues.length === 0 ? (
              <div style={{ color: 'var(--accent-emerald)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> No critical or high-priority site-wide issues detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {siteIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span
                          style={{
                            background:
                              issue.priority === 'CRITICAL'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : issue.priority === 'HIGH'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(59, 130, 246, 0.2)',
                            color:
                              issue.priority === 'CRITICAL'
                                ? 'var(--accent-rose)'
                                : issue.priority === 'HIGH'
                                ? 'var(--accent-amber)'
                                : 'var(--primary)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {issue.priority}
                        </span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{issue.title}</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{issue.description}</p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Action:</strong> {issue.recommendation.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAGES TABLE (WITH DRILLDOWN) */}
      {activeTab === 'pages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'var(--bg-glass-card)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px', background: 'rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter by URL or Title..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.875rem' }}
              />
            </div>

            <select
              value={pageTypeFilter}
              onChange={(e) => setPageTypeFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">All Page Types</option>
              <option value="article">Article / Blog</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="documentation">Documentation</option>
              <option value="service">Service</option>
              <option value="contact">Contact</option>
              <option value="faq">FAQ</option>
            </select>

            <select
              value={indexableFilter}
              onChange={(e) => setIndexableFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">All Indexability</option>
              <option value="INDEXABLE">Indexable</option>
              <option value="NOINDEX">Noindex</option>
            </select>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredPages.length} of {pageRecords.length} pages
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>URL / Title</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Depth</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Indexable</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Semantic</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.seoReport?.onPage.title || 'Untitled Page'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.normalizedUrl}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {p.pageType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{p.depth}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ color: p.isIndexable ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600, fontSize: '0.8rem' }}>
                        {p.isIndexable ? 'Indexable' : 'Noindex'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: p.semanticScore >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {p.semanticScore}/100
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: p.overallScore >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {p.overallScore}/100
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectPage && onSelectPage(p.normalizedUrl)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: 'var(--primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        Audit <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ISSUE EXPLORER */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Duplicate Titles */}
          {report.duplicateTitles && report.duplicateTitles.length > 0 && (
            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Copy size={18} color="var(--accent-amber)" /> Duplicate Title Groups ({report.duplicateTitles.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {report.duplicateTitles.map((grp) => (
                  <div key={grp.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      "{grp.title}" ({grp.pages.length} pages)
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {grp.recommendation.observation}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {grp.pages.map((p, idx) => (
                        <span key={idx} onClick={() => onSelectPage && onSelectPage(p.url)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                          {p.url}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orphan Candidates */}
          {report.orphanCandidates && report.orphanCandidates.length > 0 && (
            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={18} color="var(--accent-amber)" /> Orphan Candidates ({report.orphanCandidates.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {report.orphanCandidates.map((orph, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span onClick={() => onSelectPage && onSelectPage(orph.url)} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.88rem' }}>
                        {orph.url}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {orph.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{orph.evidence}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TOPIC CLUSTERS & INTENT OVERLAP */}
      {activeTab === 'topics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Topic Clusters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {(report.topicClusterHealth || []).map((cluster) => (
              <div key={cluster.clusterId} style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cluster.primaryTopic}</h4>
                  <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {cluster.pagesCount} pages
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Avg Semantic Score: <strong>{cluster.averageSemanticScore}/100</strong> • Link Density: <strong>{cluster.clusterInternalLinkDensity}%</strong>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {cluster.subTopics.map((st, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Search Intent Overlaps */}
          {(report.searchIntentOverlaps || []).length > 0 && (
            <div style={{ background: 'var(--bg-glass-card)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Split size={20} /> Potential Search-Intent Overlaps ({report.searchIntentOverlaps?.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {report.searchIntentOverlaps?.map((overlap) => (
                  <div key={overlap.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ background: overlap.riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: overlap.riskLevel === 'HIGH' ? 'var(--accent-rose)' : 'var(--accent-amber)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {overlap.riskLevel} OVERLAP
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Topic: "{overlap.primaryTopic}"</h4>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{overlap.observation}</p>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <strong>Suggested Action:</strong> {overlap.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INTERNAL LINKS & OPPORTUNITIES */}
      {activeTab === 'links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LinkIcon size={18} color="var(--primary)" /> Contextual Internal Link Opportunities ({report.internalLinkOpportunities?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(report.internalLinkOpportunities || []).slice(0, 20).map((opp) => (
                <div key={opp.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                    <span onClick={() => onSelectPage && onSelectPage(opp.sourceUrl)} style={{ color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>
                      {opp.sourceTitle}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>→ Link to →</span>
                    <span onClick={() => onSelectPage && onSelectPage(opp.targetUrl)} style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>
                      {opp.targetTitle}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <strong>Concept:</strong> "{opp.suggestedAnchorConcept}" • {opp.reason}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-amber)' }}>
                    <strong>Caution:</strong> {opp.caution}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SITEMAP & ROBOTS */}
      {activeTab === 'sitemap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Sitemap Consistency Matrix ({report.sitemapConsistency?.length || 0} URLs)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(report.sitemapConsistency || []).map((sm, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                    {sm.url}
                  </span>
                  <span style={{ color: sm.status === 'SITEMAP_URL_HEALTHY' ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 600, fontSize: '0.8rem' }}>
                    {sm.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
