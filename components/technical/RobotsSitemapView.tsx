'use client';

import { RobotsAnalysis, SitemapAnalysis } from '@/types';
import { Bot, Map, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface RobotsSitemapViewProps {
  robots: RobotsAnalysis;
  sitemap: SitemapAnalysis;
}

export function RobotsSitemapView({ robots, sitemap }: RobotsSitemapViewProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
      {/* Robots.txt Inspector Card */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              robots.txt Analysis
            </h3>
          </div>

          {robots.exists ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle size={14} />
              Detected (200 OK)
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <AlertCircle size={14} />
              Not Found (404)
            </span>
          )}
        </div>

        {/* Crawlability for declared bot */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: robots.isBotAllowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${robots.isBotAllowed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {robots.isBotAllowed ? (
            <CheckCircle size={20} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
          ) : (
            <XCircle size={20} color="var(--accent-rose)" style={{ flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {robots.isBotAllowed ? 'Crawl Permitted for Analyzer Bot' : 'Disallowed in robots.txt'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {robots.isBotAllowed
                ? 'Target URL is permitted under declared robots.txt rules.'
                : 'Target URL matches a Disallow rule for our declared crawler user agent.'}
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Robots URL:</span>
            {robots.url ? (
              <a href={robots.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>View File</span>
                <ExternalLink size={12} />
              </a>
            ) : (
              <span>N/A</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Directives Count:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{robots.directivesCount}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Crawl Delay:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{robots.crawlDelay !== undefined ? `${robots.crawlDelay}s` : 'None specified'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Declared Sitemaps:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{robots.sitemaps.length}</strong>
          </div>
        </div>

        {/* Raw Content Preview */}
        {robots.content && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              robots.txt Content Preview
            </div>
            <pre
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                maxHeight: '180px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {robots.content}
            </pre>
          </div>
        )}
      </div>

      {/* XML Sitemap Inspector Card */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              XML Sitemap Analysis
            </h3>
          </div>

          {sitemap.exists ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle size={14} />
              Found ({sitemap.isIndex ? 'Sitemap Index' : 'Standard URLset'})
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <AlertCircle size={14} />
              Not Detected
            </span>
          )}
        </div>

        {/* Total URLs Count Banner */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discovered URLs in Sitemap</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {sitemap.totalUrls}
            </div>
          </div>

          {sitemap.url && (
            <a
              href={sitemap.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                color: 'var(--accent-cyan)',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              <span>View XML</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Sample URLs inside Sitemap */}
        {sitemap.urlsSample.length > 0 ? (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Sample Discovered Sitemap URLs ({sitemap.urlsSample.length} shown)
            </div>
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {sitemap.urlsSample.map((u, idx) => (
                <div key={idx} style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {u}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No sample URLs extracted from sitemap.
          </div>
        )}
      </div>
    </div>
  );
}
