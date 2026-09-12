'use client';

import React, { useState } from 'react';
import { TechnicalSEO, SEOIssue, OnPageData } from '@/types';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Search,
  FileCode,
  Link as LinkIcon,
  Layers,
  Smartphone,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Languages,
  ArrowRight,
  ExternalLink,
  Lock,
  Unlock,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';

interface TechnicalSeoIntelligenceViewProps {
  technical: TechnicalSEO;
  onPage: OnPageData;
  issues: SEOIssue[];
}

export function TechnicalSeoIntelligenceView({
  technical,
  onPage,
  issues,
}: TechnicalSeoIntelligenceViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const toggleIssue = (id: string) => {
    setExpandedIssueId((prev) => (prev === id ? null : id));
  };

  // Filter technical issues
  const technicalIssues = issues.filter(
    (i) => i.category === 'technical' || i.category === 'indexability' || i.category === 'onpage' || i.category === 'structured_data'
  );

  const criticalCount = technicalIssues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = technicalIssues.filter((i) => i.severity === 'WARNING').length;
  const passedCount = technicalIssues.filter((i) => i.severity === 'GOOD').length;

  // Status color helpers
  const getCrawlColor = (status?: string) => {
    switch (status) {
      case 'CRAWLABLE':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'REDIRECTED':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--accent-amber)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'BLOCKED_BY_ROBOTS':
      case 'HTTP_ERROR':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: 'var(--accent-rose)', border: 'rgba(244, 63, 94, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text-muted)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const getIndexColor = (status?: string) => {
    switch (status) {
      case 'INDEXABLE':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'CONDITIONAL':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--accent-amber)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'NOT_INDEXABLE':
      case 'CONFLICTING_SIGNALS':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: 'var(--accent-rose)', border: 'rgba(244, 63, 94, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text-muted)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const getCanonicalColor = (status?: string) => {
    switch (status) {
      case 'SELF_CANONICAL':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'CANONICALIZED_TO_OTHER':
      case 'CANONICAL_CROSS_DOMAIN':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: 'var(--accent-cyan)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'CANONICAL_REDIRECT_CONFLICT':
      case 'NOINDEX_CANONICAL_CONFLICT':
      case 'CANONICAL_MISSING':
      case 'CANONICAL_INVALID':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: 'var(--accent-rose)', border: 'rgba(244, 63, 94, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text-muted)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const crawlStyle = getCrawlColor(technical.crawlabilityStatus);
  const indexStyle = getIndexColor(technical.indexabilityStatus);
  const canonStyle = getCanonicalColor(technical.canonicalStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              Phase 5 Technical SEO Intelligence
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Deterministic Crawlability & Indexability Audit
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Technical SEO Architecture & Diagnostics
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginBottom: 0 }}>
            Comprehensive analysis of HTTP protocols, robots directives, canonical consolidation, XML sitemaps, and internationalization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{criticalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Critical</div>
          </div>
          <div
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{warningCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Warnings</div>
          </div>
          <div
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{passedCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Passed</div>
          </div>
        </div>
      </div>

      {/* 2. Core Technical Pillar Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Card A: Crawlability & HTTP */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                <Globe size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Crawlability</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>HTTP & Crawler Access</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: crawlStyle.bg,
                color: crawlStyle.text,
                border: `1px solid ${crawlStyle.border}`,
              }}
            >
              {technical.crawlabilityStatus || 'CRAWLABLE'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>HTTP Status</span>
              <strong style={{ color: technical.httpStatus < 400 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {technical.httpStatus} {technical.httpStatusClassification?.statusText || ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Redirect Hops</span>
              <strong style={{ color: technical.redirectCount > 1 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                {technical.redirectCount} {technical.redirectAssessment?.redirectType ? `(${technical.redirectAssessment.redirectType})` : ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Initial TTFB</span>
              <strong style={{ color: technical.responseTimeMs < 1500 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {technical.responseTimeMs}ms
              </strong>
            </div>
          </div>
        </div>

        {/* Card B: Indexability & Robots Directives */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
                <Search size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Indexability</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Robots & Meta Directives</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: indexStyle.bg,
                color: indexStyle.text,
                border: `1px solid ${indexStyle.border}`,
              }}
            >
              {technical.indexabilityStatus || (technical.isIndexable ? 'INDEXABLE' : 'NOT_INDEXABLE')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>HTML Robots Meta</span>
              <code style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                {onPage.robotsMeta || 'index, follow (default)'}
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>X-Robots-Tag Header</span>
              <code style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                {technical.robotsAssessment?.xRobotsTagDirectives.join(', ') || 'None (allowed)'}
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Directive Contradictions</span>
              <strong style={{ color: technical.robotsAssessment?.hasSignalConflict ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {technical.robotsAssessment?.hasSignalConflict ? 'Conflicting Signals' : 'None (Aligned)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Card C: Canonicalization */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
                <LinkIcon size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Canonicalization</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Signal Consolidation</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: canonStyle.bg,
                color: canonStyle.text,
                border: `1px solid ${canonStyle.border}`,
              }}
            >
              {technical.canonicalStatus || (onPage.isCanonicalMatch ? 'SELF_CANONICAL' : 'CANONICALIZED_TO_OTHER')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Canonical URL</span>
              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={onPage.canonicalUrl}>
                {onPage.canonicalUrl || 'Missing'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Points to Redirect</span>
              <strong style={{ color: technical.canonicalAssessment?.pointsToRedirect ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {technical.canonicalAssessment?.pointsToRedirect ? 'Yes (Conflict)' : 'No (Direct)'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cross-Domain</span>
              <strong style={{ color: technical.canonicalAssessment?.isCrossDomain ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                {technical.canonicalAssessment?.isCrossDomain ? 'Yes (External)' : 'No (Same Domain)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Card D: Robots.txt & XML Sitemap */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-pink)' }}>
                <FileCode size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sitemap & Robots.txt</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Discovery Directives</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: technical.robotsAnalysis.isBotAllowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: technical.robotsAnalysis.isBotAllowed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                border: technical.robotsAnalysis.isBotAllowed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              {technical.robotsAnalysis.isBotAllowed ? 'BOT ALLOWED' : 'BOT DISALLOWED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>robots.txt File</span>
              <strong>{technical.robotsAnalysis.exists ? `Found (${technical.robotsAnalysis.directivesCount} directives)` : 'Not Found'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>XML Sitemap</span>
              <strong>{technical.sitemapAnalysis.exists ? `Found (${technical.sitemapAnalysis.totalUrls} URLs)` : 'Not Found'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sitemap Membership</span>
              <strong style={{ color: technical.sitemapAssessment?.membershipStatus === 'IN_SITEMAP' ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                {technical.sitemapAssessment?.membershipStatus || (technical.sitemapAnalysis.exists ? 'IN_SITEMAP' : 'SITEMAP_UNAVAILABLE')}
              </strong>
            </div>
          </div>
        </div>

        {/* Card E: Hreflang & Internationalization */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
                <Languages size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Internationalization</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hreflang & Language Signals</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: technical.hreflangAssessment?.hasHreflang ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: technical.hreflangAssessment?.hasHreflang ? 'var(--primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {technical.hreflangAssessment?.hasHreflang ? `${technical.hreflangAssessment.totalEntries} ALTERNATES` : 'SINGLE LANGUAGE'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>HTML Lang Attribute</span>
              <strong style={{ color: onPage.language ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {onPage.language ? `<html lang="${onPage.language}">` : 'Missing'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Self-Reference Alternate</span>
              <strong style={{ color: technical.hreflangAssessment?.hasSelfReference ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                {technical.hreflangAssessment?.hasHreflang ? (technical.hreflangAssessment.hasSelfReference ? 'Present' : 'Missing') : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>x-default Alternate</span>
              <strong>{technical.hreflangAssessment?.hasXDefault ? 'Declared' : 'Not Declared'}</strong>
            </div>
          </div>
        </div>

        {/* Card F: Security & Infrastructure */}
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-cyan)' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Infrastructure & Security</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>HTTPS, Mixed Content & Headers</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: technical.isHttps ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: technical.isHttps ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                border: technical.isHttps ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              {technical.isHttps ? 'HTTPS SECURE' : 'INSECURE HTTP'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mixed Content</span>
              <strong style={{ color: technical.infrastructureAssessment?.hasMixedContent ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {technical.infrastructureAssessment?.hasMixedContent ? `${technical.infrastructureAssessment.insecureResourceUrls.length} Insecure Resources` : '0 (Clean)'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>HSTS Header</span>
              <strong>{technical.infrastructureAssessment?.securityHeaders?.hsts ? 'Active' : 'Not Detected'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Content-Type</span>
              <code>{technical.contentType || 'text/html'}</code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Technical SEO Finding Accordions */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Technical Audit Findings & Actionable Remediation
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Structured diagnostics following the required <strong>Observation → Evidence → Action → Before/After → Expected Benefit → Caution</strong> format.
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${technicalIssues.length})` },
              { id: 'CRITICAL', label: `Critical (${criticalCount})`, color: 'var(--accent-rose)' },
              { id: 'WARNING', label: `Warnings (${warningCount})`, color: 'var(--accent-amber)' },
              { id: 'GOOD', label: `Passed (${passedCount})`, color: 'var(--accent-emerald)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveCategory(btn.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: activeCategory === btn.id ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeCategory === btn.id ? (btn.color || 'var(--text-primary)') : 'var(--text-muted)',
                  border: activeCategory === btn.id ? `1px solid ${btn.color || 'var(--border-strong)'}` : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {technicalIssues
            .filter((iss) => (activeCategory === 'all' ? true : iss.severity === activeCategory))
            .map((issue) => {
              const isExpanded = expandedIssueId === issue.id;
              const isGood = issue.severity === 'GOOD';

              const badgeColor =
                issue.severity === 'CRITICAL'
                  ? 'var(--accent-rose)'
                  : issue.severity === 'WARNING'
                  ? 'var(--accent-amber)'
                  : issue.severity === 'GOOD'
                  ? 'var(--accent-emerald)'
                  : 'var(--primary)';

              return (
                <div
                  key={issue.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: isExpanded ? `1px solid ${badgeColor}` : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleIssue(issue.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {issue.severity === 'CRITICAL' && <XCircle size={18} color="var(--accent-rose)" />}
                      {issue.severity === 'WARNING' && <AlertTriangle size={18} color="var(--accent-amber)" />}
                      {issue.severity === 'GOOD' && <CheckCircle2 size={18} color="var(--accent-emerald)" />}
                      {issue.severity === 'RECOMMENDATION' && <HelpCircle size={18} color="var(--primary)" />}

                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {issue.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {issue.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: `${badgeColor}22`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}44`,
                        }}
                      >
                        {issue.severity}
                      </span>
                      {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1.25rem 1.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      {/* Evidence & Why it matters */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                            Evidence Observed
                          </span>
                          <div style={{ color: 'var(--text-primary)', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {typeof issue.evidence === 'string' ? issue.evidence : JSON.stringify(issue.evidence, null, 2)}
                          </div>
                        </div>

                        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                            Technical Impact
                          </span>
                          <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {issue.whyItMatters}
                          </div>
                        </div>
                      </div>

                      {/* Action & Before/After */}
                      {!isGood && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)' }}>
                              Recommended Remediation
                            </span>
                            <div style={{ color: 'var(--text-primary)', marginTop: '0.25rem', fontWeight: 500 }}>
                              {issue.action || issue.recommendation}
                            </div>
                          </div>

                          {(issue.before || issue.after) && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                              {issue.before && (
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)' }}>CURRENT IMPLEMENTATION (BEFORE)</span>
                                  <pre style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                                    {issue.before}
                                  </pre>
                                </div>
                              )}
                              {issue.after && (
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>RECOMMENDED CODE (AFTER)</span>
                                  <pre style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                                    {issue.after}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expected Benefit & Caution */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                            {issue.expectedBenefit && (
                              <div style={{ color: 'var(--accent-emerald)' }}>
                                <strong>Expected Benefit:</strong> {issue.expectedBenefit}
                              </div>
                            )}
                            {issue.caution && (
                              <div style={{ color: 'var(--accent-amber)' }}>
                                <strong>Caution:</strong> {issue.caution}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
