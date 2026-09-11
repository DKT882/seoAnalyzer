'use client';

import { useState } from 'react';
import { DomainOverviewData } from '@/types';
import { apiClient } from '@/lib/api/apiClient';
import {
  Globe,
  Search,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Info,
} from 'lucide-react';

export function DomainOverviewView() {
  const [domainInput, setDomainInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DomainOverviewData | null>(null);

  const handleFetchDomainOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getDomainOverview(domainInput.trim());
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch domain overview.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Search Header */}
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
          <Globe size={24} color="var(--primary)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Domain SEO & Visibility Overview</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '800px' }}>
          Inspect domain health, technical indexability, and structural visibility with strict Category A (Directly Extracted) vs Category B (External API) data separation.
        </p>

        <form onSubmit={handleFetchDomainOverview} style={{ display: 'flex', gap: '0.75rem', maxWidth: '650px' }}>
          <input
            type="text"
            placeholder="Enter domain or URL (e.g. example.com or https://python.org)"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            required
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isLoading ? 'Analyzing...' : <><Search size={16} /> Inspect Domain</>}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      {overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Domain Headline & Confidence */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{overview.domain}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Analyzed at: {new Date(overview.timestamp).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 }}>
              <ShieldCheck size={14} /> Data Confidence: {overview.dataConfidence}
            </div>
          </div>

          {/* Section 1: Category A - Directly Extracted */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', borderTop: '4px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Category A — Directly Extracted HTML & Technical Signals</h4>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              Extracted deterministically from root page crawl and HTTP headers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Page Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-hover)' }}>{overview.categoryA.pageLevelScore}/100</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Technical Health Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{overview.categoryA.technicalScore}/100</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discovered Keywords</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{overview.categoryA.detectedKeywordsCount}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Internal Links</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{overview.categoryA.internalLinksCount}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Category B - External SEO Data Disclosures */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', borderTop: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Info size={18} color="#f59e0b" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Category B — External SEO / SERP Provider Metrics</h4>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              {overview.categoryB.message}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Global Organic Traffic', val: overview.categoryB.estimatedOrganicTraffic },
                { label: 'Paid Keywords / Ads', val: overview.categoryB.paidTraffic },
                { label: 'External Backlink Count', val: overview.categoryB.backlinksCount },
                { label: 'Referring Domains', val: overview.categoryB.referringDomains },
                { label: 'Domain Authority / Rating', val: overview.categoryB.domainRating },
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Category C - Private Owner Data Disclosures */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', borderTop: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lock size={18} color="#818cf8" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Category C — Private Owner Data (GSC & Analytics)</h4>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              {overview.categoryC.message}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Google Impressions', val: overview.categoryC.gscImpressions },
                { label: 'Google Clicks', val: overview.categoryC.gscClicks },
                { label: 'Average CTR', val: overview.categoryC.gscCtr },
                { label: 'Actual Average Position', val: overview.categoryC.gscAveragePosition },
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
