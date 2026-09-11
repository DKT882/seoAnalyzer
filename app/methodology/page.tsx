'use client';

import { useState } from 'react';
import { BookOpen, ShieldCheck, Cpu, Scale } from 'lucide-react';
import { EXTERNAL_SEO_DISCLAIMER } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { DataSourcesModal } from '@/components/settings/DataSourcesModal';

export default function MethodologyPage() {
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar
        activeTab="methodology"
        onOpenDataSources={() => setIsDataSourcesOpen(true)}
      />

      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <BookOpen size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Keyword Engine & SEO Audit Methodology
              </h2>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Transparent, deterministic, and explainable computational formulas driving our analysis.
            </p>
          </div>

          {/* Zero Fabrication Notice */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              borderLeft: '4px solid var(--primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              <span>SEO Data Integrity & Public Boundary Notice</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {EXTERNAL_SEO_DISCLAIMER}
            </p>
          </div>

          {/* Keyword Scoring Formula Card */}
          <div
            style={{
              background: 'var(--bg-glass-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                1. Keyword Relevance Scoring Formula (0–100)
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Rather than relying on raw keyword frequency, candidate phrases (1-gram, 2-gram, 3-gram, 4-gram) are scored using a normalized multi-factor model:
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
              Score = min(100, max(0, S_freq + S_prominence + ∑ W_locations - P_stuffing))
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>• Frequency & TF-IDF (S_freq, max 25 pts):</strong> Uses logarithmic frequency scaling multiplied by structural section discrimination (TF-ISF).
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>• Positional Prominence (S_prominence, max 15 pts):</strong> Terms appearing within the first 100 words (lead paragraph) receive full bonus; gradually decays up to word 1000.
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>• Structural Location Weights (∑ W_locations, max 55 pts):</strong>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                  <li>Page &lt;title&gt; tag: <strong>+25 pts</strong></li>
                  <li>Main &lt;h1&gt; heading: <strong>+20 pts</strong></li>
                  <li>URL path slug: <strong>+15 pts</strong></li>
                  <li>Meta description: <strong>+10 pts</strong></li>
                  <li>Subheadings &lt;h2&gt;–&lt;h6&gt;: <strong>+10 pts</strong></li>
                  <li>Body text context: <strong>+10 pts</strong></li>
                  <li>Anchor text links: <strong>+5 pts</strong></li>
                  <li>Image ALT attributes: <strong>+5 pts</strong></li>
                </ul>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>• Keyword Stuffing Penalty (P_stuffing):</strong> Phrases exceeding 5.0% density incur an automatic penalty of <code>(Density - 5.0) * 10</code>.
              </div>
            </div>
          </div>

          {/* NLP Engine Card */}
          <div
            style={{
              background: 'var(--bg-glass-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                2. Multi-Stage NLP Pipeline
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Porter Stemmer</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Normalizes inflectional variants (e.g. "optimizing" → "optim") internally while preserving human-readable surface phrases in the UI.
                </p>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Stop-Word Edge Pruning</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Prunes meaningless leading/trailing stop words while preserving crucial intent compounds (e.g. "software for developers").
                </p>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Topic Clusters</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Groups terms by root stem and structural co-occurrence into coherent semantic clusters without fabricating non-existent AI data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isDataSourcesOpen && (
        <DataSourcesModal onClose={() => setIsDataSourcesOpen(false)} />
      )}

      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 2rem', background: 'var(--bg-glass)', marginTop: 'auto', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <strong>SEO Intel Pro Platform Expansion</strong> — Competitive Intelligence & Content Analysis
          </div>
          <div>
            Zero Metric Fabrication | Category A/B/C Classification | 18-Sheet XLSX & CSV Exports
          </div>
        </div>
      </footer>
    </div>
  );
}
