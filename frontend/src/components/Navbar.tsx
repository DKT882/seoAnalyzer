import { Globe, Users, BarChart3, History, BookOpen, Download, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { NavTab } from '../utils/router.js';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  hasActiveReport: boolean;
  onOpenExport?: () => void;
  onOpenDataSources?: () => void;
  onNewAnalysis?: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  hasActiveReport,
  onOpenExport,
  onOpenDataSources,
  onNewAnalysis,
}: NavbarProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.85rem 2rem',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand / Logo */}
        <div
          onClick={() => {
            setActiveTab('analyzer');
            if (onNewAnalysis) onNewAnalysis();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 16px var(--primary-glow)',
            }}
          >
            <Globe size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                SEO Intel Pro
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--accent-emerald)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                }}
              >
                Expansion
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Competitive Intelligence & Content Platform
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setActiveTab('analyzer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'analyzer' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeTab === 'analyzer' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'analyzer' ? '1px solid var(--border-strong)' : '1px solid transparent',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Globe size={15} />
            Analyzer
          </button>

          <button
            onClick={() => setActiveTab('competitors')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'competitors' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeTab === 'competitors' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'competitors' ? '1px solid var(--border-strong)' : '1px solid transparent',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Users size={15} />
            Competitors (2-5)
          </button>

          <button
            onClick={() => setActiveTab('domain')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'domain' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeTab === 'domain' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'domain' ? '1px solid var(--border-strong)' : '1px solid transparent',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <BarChart3 size={15} />
            Domain Overview
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'history' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'history' ? '1px solid var(--border-strong)' : '1px solid transparent',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <History size={15} />
            History
          </button>

          <button
            onClick={() => setActiveTab('methodology')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'methodology' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeTab === 'methodology' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'methodology' ? '1px solid var(--border-strong)' : '1px solid transparent',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={15} />
            Methodology
          </button>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onOpenDataSources}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Configure External Data Providers"
          >
            <Database size={14} color="var(--primary-hover)" />
            Data Sources
          </button>

          {hasActiveReport && (
            <>
              <button
                onClick={onOpenExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={15} />
                Export (.xlsx)
              </button>

              <button
                onClick={onNewAnalysis}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 10px var(--primary-glow)',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                New Analysis
              </button>
            </>
          )}

          {!hasActiveReport && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              <span>SSRF-Guarded</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
