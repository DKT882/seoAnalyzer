import { useState } from 'react';
import { SchemaItem } from '@seo-analyzer/shared';
import { Code2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface SchemaViewProps {
  schemas: SchemaItem[];
}

export function SchemaView({ schemas }: SchemaViewProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (json: string, idx: number) => {
    navigator.clipboard.writeText(json);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Code2 size={22} color="var(--primary)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Structured Data & Schema.org Inspector
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Extracted JSON-LD and Microdata schemas. Enables Google rich snippets (FAQs, Breadcrumbs, Articles, Products).
        </p>
      </div>

      {schemas.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {schemas.map((schema, idx) => (
            <div
              key={idx}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    @type: {schema.type}
                  </span>

                  {schema.isValid ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      <CheckCircle2 size={14} />
                      Detected & Valid Syntax
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)' }}>
                      <AlertCircle size={14} />
                      Syntax Warning
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleCopy(schema.rawJson, idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: copiedIdx === idx ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {copiedIdx === idx ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedIdx === idx ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              {/* Breadcrumbs extractor display if present */}
              {schema.breadcrumbs && schema.breadcrumbs.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Breadcrumbs Detected:</div>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {schema.breadcrumbs.join(' → ')}
                  </div>
                </div>
              )}

              {/* FAQs extractor display if present */}
              {schema.faqs && schema.faqs.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FAQs Detected ({schema.faqs.length}):</div>
                  {schema.faqs.map((faq, fIdx) => (
                    <div key={fIdx} style={{ fontSize: '0.825rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Q: {faq.question}</strong>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>A: {faq.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formatted Code Block */}
              <pre
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  fontSize: '0.775rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {schema.rawJson}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3.5rem', background: 'var(--bg-glass-card)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          <Code2 size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.35rem' }}>
            No Structured Data (JSON-LD) Detected
          </div>
          <p style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.85rem' }}>
            Adding Schema.org markup (such as Article, WebPage, Organization, or FAQPage) can help search engines display rich results in SERPs.
          </p>
        </div>
      )}
    </div>
  );
}
