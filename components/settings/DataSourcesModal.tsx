'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Database, KeyRound, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/apiClient';
import { DataProviderInfo } from '@/types';

interface DataSourcesModalProps {
  onClose: () => void;
}

export function DataSourcesModal({ onClose }: DataSourcesModalProps) {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<DataProviderInfo[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getDataSources()
      .then((res) => {
        if (isMounted) {
          setProviders(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: DataProviderInfo['status']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
            <CheckCircle2 size={12} /> Connected
          </span>
        );
      case 'QUOTA_EXCEEDED':
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
            <AlertTriangle size={12} /> Quota Exceeded
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Not Connected
          </span>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-strong)',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Database size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Data Sources & Metric Classification
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Zero Metric Fabrication Guarantee Banner */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981', marginBottom: '0.2rem' }}>
                Zero Metric Fabrication Commitment
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Our platform strictly computes on-page signals directly from real HTML and DOM structures. External metrics (search volume, keyword difficulty, domain rank) and private metrics (GSC clicks, GA4 traffic) are never estimated, simulated, or faked without live authorized API connections.
              </div>
            </div>
          </div>

          {/* Category A: Directly Extracted */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  CATEGORY A
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Directly Extracted HTML & Technical Signals
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                <CheckCircle2 size={13} /> Active (Local Engine)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
              Keywords, n-grams, tag explorer, schema validation, headings hierarchy, robots.txt, sitemaps, internal/external links, and content contribution heatmaps.
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Authentication: <strong>None Required</strong> | Latency: <strong>~200ms - 1.5s</strong> | Reliability: <strong>100% Deterministic</strong>
            </div>
          </div>

          {/* Category B: External SEO Providers */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  CATEGORY B
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  External SEO Aggregators & SERP Data
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                <AlertTriangle size={13} /> Not Connected
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
              Global search volumes, keyword difficulty estimates, estimated CPC, search intent classifications, and estimated competitor domain ranks.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', marginTop: '0.75rem' }}>
              {providers.length > 0 ? (
                providers
                  .filter((p) => p.type === 'SERP' || p.type === 'KEYWORD' || p.type === 'BACKLINK' || p.type === 'TRAFFIC')
                  .map((p) => (
                    <div key={p.providerId} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</span>
                      {getStatusBadge(p.status)}
                    </div>
                  ))
              ) : (
                ['DataForSEO', 'Semrush API', 'Ahrefs API'].map((provider) => (
                  <div key={provider} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{provider}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disconnected</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Category C: Private Google Analytics & Search Console */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-hover)' }}>
                  CATEGORY C
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Private Verified Property Data
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                <KeyRound size={13} /> OAuth Required
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
              Real organic clicks, impressions, average CTR, average SERP position, and live session bounce rates.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', marginTop: '0.75rem' }}>
              {providers.length > 0 ? (
                providers
                  .filter((p) => p.type === 'SEARCH_CONSOLE' || p.type === 'ANALYTICS')
                  .map((p) => (
                    <div key={p.providerId} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</span>
                      {getStatusBadge(p.status)}
                    </div>
                  ))
              ) : (
                ['Google Search Console (GSC)', 'Google Analytics 4 (GA4)'].map((property) => (
                  <div key={property} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{property}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Requires Owner Auth</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {loading && <RefreshCw size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
            <span>Status updated: Real-time provider checking</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
