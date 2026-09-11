'use client';

import { CrawlProgressStats } from '@/types';
import { Globe, StopCircle, Clock, CheckCircle2, AlertTriangle, ListChecks } from 'lucide-react';

interface CrawlProgressTrackerProps {
  stats: CrawlProgressStats;
  targetDomain: string;
  onCancel: () => void;
  isCancelling?: boolean;
}

export function CrawlProgressTracker({
  stats,
  targetDomain,
  onCancel,
  isCancelling,
}: CrawlProgressTrackerProps) {
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div
      style={{
        background: 'var(--bg-glass-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        maxWidth: '880px',
        margin: '2rem auto',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="spinner" style={{ width: '20px', height: '20px', border: '2.5px solid rgba(99,102,241,0.25)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Crawling & Analyzing Website: <span style={{ color: 'var(--primary)' }}>{targetDomain}</span>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Bounded concurrency queue with live SSRF checks and structural NLP analysis
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: 'var(--accent-rose)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: isCancelling ? 'not-allowed' : 'pointer',
            opacity: isCancelling ? 0.6 : 1,
          }}
        >
          <StopCircle size={16} />
          <span>{isCancelling ? 'Stopping...' : 'Cancel Crawl'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
          <span>Crawl Progress</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{stats.percentComplete}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(2, stats.percentComplete))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--accent-cyan))',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Discovered</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.discovered}</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Queued</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{stats.queued}</div>
        </div>

        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>Analyzed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.analyzed}</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Skipped</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)' }}>{stats.skipped}</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Failed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stats.failed > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>{stats.failed}</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Clock size={12} />
            Elapsed
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{formatTime(stats.elapsedTimeMs)}</div>
        </div>
      </div>

      {/* Current URL indicator */}
      {stats.currentUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <Globe size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>Active Page:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{stats.currentUrl}</span>
        </div>
      )}
    </div>
  );
}
