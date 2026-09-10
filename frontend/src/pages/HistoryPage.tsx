import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import { formatDate, getScoreColor } from '../utils/formatters.js';
import { History, Globe, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

interface HistoryItem {
  id: string;
  url: string;
  createdAt: string;
  status: string;
  overallScore?: number;
  wordCount?: number;
  title?: string;
}

interface HistoryPageProps {
  onSelectJob: (jobId: string) => void;
}

export function HistoryPage({ onSelectJob }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await apiClient.getHistory();
      setHistory(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <History size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              Analysis History & Audit Archive
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Persistent history stored in local SQLite database. Re-open previous SEO audit reports instantly.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin-icon" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading analysis history...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)' }}>
          {error}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          <Globe size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>No Analysis History Found</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Enter a URL on the Analyzer tab to run your first report.</div>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.map((item) => {
            const score = item.overallScore ?? 0;
            const { color } = getScoreColor(score);

            return (
              <div
                key={item.id}
                onClick={() => onSelectJob(item.id)}
                style={{
                  background: 'var(--bg-glass-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  {item.overallScore !== undefined ? (
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: `${color}15`,
                        border: `1px solid ${color}40`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color }}>
                        {item.overallScore}
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      N/A
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.url}
                    </div>
                    {item.title && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
                        {item.title}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {formatDate(item.createdAt)} | {item.wordCount ? `${item.wordCount} words` : 'Report archived'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>
                  <span>Open Report</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
