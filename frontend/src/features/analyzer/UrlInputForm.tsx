import { useState } from 'react';
import { Search, Globe, Shield, Sparkles, CheckSquare, Square, AlertCircle, ArrowRight } from 'lucide-react';

interface UrlInputFormProps {
  onAnalyze: (url: string, checkRobots: boolean, checkSitemap: boolean) => void;
  isLoading: boolean;
  error?: string | null;
}

const PRESET_URLS = [
  { label: 'Wikipedia SEO', url: 'https://en.wikipedia.org/wiki/Search_engine_optimization' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development' },
  { label: 'W3C Standards', url: 'https://www.w3.org/standards/' },
  { label: 'Python Org', url: 'https://www.python.org/' },
];

export function UrlInputForm({ onAnalyze, isLoading, error }: UrlInputFormProps) {
  const [url, setUrl] = useState('');
  const [checkRobots, setCheckRobots] = useState(true);
  const [checkSitemap, setCheckSitemap] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a website URL to analyze.');
      return;
    }

    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      setValidationError('SSRF Protection Disallowed: Localhost and internal loopback addresses cannot be crawled.');
      return;
    }

    onAnalyze(trimmed, checkRobots, checkSitemap);
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrl(presetUrl);
    setValidationError(null);
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center' }}>
      {/* Title & Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        <Sparkles size={14} />
        <span>Deterministic Multi-Stage NLP & Technical Auditor</span>
      </div>

      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 800,
          fontFamily: 'var(--font-heading)',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Complete SEO Keyword & Website Analyzer
      </h1>

      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--text-secondary)',
          maxWidth: '680px',
          margin: '0 auto 2.5rem auto',
          lineHeight: 1.6,
        }}
      >
        Extract N-gram keyword candidates, evaluate heading trees, audit technical SEO health, verify robots.txt compliance, and discover sitemaps with zero metric fabrication.
      </p>

      {/* URL Input Box */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.6rem 0.75rem 0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          position: 'relative',
        }}
      >
        <Globe size={22} color="var(--primary)" style={{ flexShrink: 0 }} />

        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="Enter website URL (e.g. https://example.com/guide)"
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontFamily: 'inherit',
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.75rem',
            borderRadius: 'var(--radius-md)',
            background: isLoading
              ? 'var(--bg-surface)'
              : 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: isLoading ? 'none' : '0 4px 20px var(--primary-glow)',
            opacity: isLoading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>Analyze Webpage</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Validation or API Error Banner */}
      {(validationError || error) && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            textAlign: 'left',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{validationError || error}</span>
        </div>
      )}

      {/* Options & Presets */}
      <div
        style={{
          marginTop: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        {/* Toggle checkboxes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <label
            onClick={() => setCheckRobots(!checkRobots)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none' }}
          >
            {checkRobots ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
            <span>Inspect robots.txt</span>
          </label>

          <label
            onClick={() => setCheckSitemap(!checkSitemap)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none' }}
          >
            {checkSitemap ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
            <span>Discover XML Sitemap</span>
          </label>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try samples:</span>
          {PRESET_URLS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => handleSelectPreset(preset.url)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safety info footer */}
      <div
        style={{
          marginTop: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={16} color="var(--accent-emerald)" />
            SSRF Protection
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Pre-request DNS resolution blocks private, loopback, link-local, and cloud metadata IPs.
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            Multi-Stage NLP
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            N-grams (1-4 words), Porter stemming, positional prominence, and structural location weights.
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={16} color="var(--primary)" />
            Zero Metric Fabrication
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Strict separation of public page data vs external private analytics disclaimers.
          </div>
        </div>
      </div>
    </div>
  );
}
