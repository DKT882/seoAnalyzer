import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProgressTrackerProps {
  url: string;
}

const PIPELINE_STEPS = [
  { id: 'validate', label: 'Validating URL & Protocol' },
  { id: 'ssrf', label: 'Pre-Request DNS & SSRF Validation' },
  { id: 'fetch', label: 'Connecting & Fetching HTML Headers / Stream' },
  { id: 'dom', label: 'Parsing DOM with Cheerio & Sanitizing Noise' },
  { id: 'metadata', label: 'Extracting Title, Meta, Canonical & OpenGraph' },
  { id: 'headings', label: 'Constructing Heading Hierarchy Tree (H1-H6)' },
  { id: 'links_images', label: 'Analyzing Links, Anchor Text & Image ALT Coverage' },
  { id: 'schema', label: 'Extracting JSON-LD & Structured Data' },
  { id: 'robots_sitemap', label: 'Inspecting robots.txt Rules & Discovering Sitemaps' },
  { id: 'nlp', label: 'Running NLP Tokenizer, Stemmer & N-Grams (1-4 Words)' },
  { id: 'keywords', label: 'Calculating TF-IDF, Prominence & 0-100 Scores' },
  { id: 'technical', label: 'Running Technical SEO Audits & Category Scoring' },
];

export function ProgressTracker({ url }: ProgressTrackerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '3rem auto',
        background: 'var(--bg-glass-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <Loader2 size={16} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Analyzing Webpage</span>
        </div>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Running Deep SEO Analysis
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
          {url}
        </p>
      </div>

      {/* Pipeline Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {PIPELINE_STEPS.map((step, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                border: isCurrent ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                opacity: isPending ? 0.35 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {isDone && <CheckCircle2 size={18} color="var(--accent-emerald)" />}
                {isCurrent && <Loader2 size={18} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />}
                {isPending && (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
