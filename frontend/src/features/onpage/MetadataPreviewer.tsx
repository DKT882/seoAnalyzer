import { useState } from 'react';
import { OnPageData } from '@seo-analyzer/shared';
import { Eye, Smartphone, Monitor, Share2, MessageSquare } from 'lucide-react';

interface MetadataPreviewerProps {
  onPage: OnPageData;
  pageUrl: string;
}

export function MetadataPreviewer({ onPage, pageUrl }: MetadataPreviewerProps) {
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [socialTab, setSocialTab] = useState<'serp' | 'og' | 'twitter'>('serp');

  let domain = '';
  let displayPath = '';
  try {
    const parsed = new URL(pageUrl);
    domain = parsed.hostname;
    displayPath = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, ' > ');
  } catch {
    domain = pageUrl;
  }

  const ogImage = onPage.ogTags['og:image'] || onPage.twitterTags['twitter:image'] || '';
  const ogTitle = onPage.ogTags['og:title'] || onPage.title || 'Page Title Preview';
  const ogDesc = onPage.ogTags['og:description'] || onPage.metaDescription || 'No description available for social cards.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setSocialTab('serp')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: socialTab === 'serp' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: socialTab === 'serp' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Eye size={15} />
            Google SERP Snippet
          </button>

          <button
            onClick={() => setSocialTab('og')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: socialTab === 'og' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: socialTab === 'og' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Share2 size={15} />
            OpenGraph Card
          </button>

          <button
            onClick={() => setSocialTab('twitter')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: socialTab === 'twitter' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: socialTab === 'twitter' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <MessageSquare size={15} />
            Twitter / X Card
          </button>
        </div>

        {socialTab === 'serp' && (
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setSerpDevice('desktop')}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: serpDevice === 'desktop' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: serpDevice === 'desktop' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
              }}
            >
              <Monitor size={14} />
              Desktop
            </button>
            <button
              onClick={() => setSerpDevice('mobile')}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: serpDevice === 'mobile' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: serpDevice === 'mobile' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
              }}
            >
              <Smartphone size={14} />
              Mobile
            </button>
          </div>
        )}
      </div>

      {/* SERP Snippet Preview */}
      {socialTab === 'serp' && (
        <div
          style={{
            background: '#ffffff',
            color: '#202124',
            borderRadius: 'var(--radius-md)',
            padding: serpDevice === 'desktop' ? '1.5rem 2rem' : '1.25rem',
            maxWidth: serpDevice === 'desktop' ? '650px' : '380px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            fontFamily: 'arial, sans-serif',
            transition: 'max-width 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#e8eaed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                color: '#5f6368',
              }}
            >
              🌐
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#202124', fontWeight: 500, lineHeight: 1.2 }}>
                {domain}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#5f6368', lineHeight: 1.2 }}>
                https://{domain}{displayPath ? ` > ${displayPath}` : ''}
              </div>
            </div>
          </div>

          <h3
            style={{
              fontSize: serpDevice === 'desktop' ? '1.25rem' : '1.1rem',
              color: '#1a0dab',
              fontWeight: 400,
              lineHeight: 1.3,
              margin: '0.35rem 0',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            {onPage.title || 'Untitled Page Document'}
          </h3>

          <p
            style={{
              fontSize: '0.875rem',
              color: '#4d5156',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {onPage.metaDescription ||
              'No meta description provided. Google will dynamically extract a snippet from visible body text matching the searcher query.'}
          </p>
        </div>
      )}

      {/* OpenGraph Preview Card */}
      {socialTab === 'og' && (
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '520px',
            overflow: 'hidden',
          }}
        >
          {ogImage ? (
            <div style={{ height: '220px', overflow: 'hidden', background: '#000' }}>
              <img src={ogImage} alt="OG Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-surface-elevated))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No og:image specified
            </div>
          )}

          <div style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {domain}
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
              {ogTitle}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {ogDesc}
            </p>
          </div>
        </div>
      )}

      {/* Twitter / X Preview Card */}
      {socialTab === 'twitter' && (
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '520px',
            overflow: 'hidden',
          }}
        >
          {ogImage ? (
            <div style={{ height: '220px', overflow: 'hidden', background: '#000' }}>
              <img src={ogImage} alt="Twitter Card Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-surface-elevated))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No twitter:image specified
            </div>
          )}

          <div style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {domain}
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
              {onPage.twitterTags['twitter:title'] || onPage.title}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {onPage.twitterTags['twitter:description'] || onPage.metaDescription}
            </p>
          </div>
        </div>
      )}

      {/* Character Length Audit Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        <div style={{ background: 'var(--bg-glass-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Title Tag Length</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: onPage.titleLength >= 30 && onPage.titleLength <= 65 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {onPage.titleLength} / 60 chars
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (onPage.titleLength / 60) * 100)}%`, background: onPage.titleLength >= 30 && onPage.titleLength <= 65 ? 'var(--accent-emerald)' : 'var(--accent-amber)', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Recommended: 40-60 characters for desktop/mobile SERP clarity.
          </div>
        </div>

        <div style={{ background: 'var(--bg-glass-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Meta Description Length</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: onPage.metaDescriptionLength >= 70 && onPage.metaDescriptionLength <= 165 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {onPage.metaDescriptionLength} / 160 chars
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (onPage.metaDescriptionLength / 160) * 100)}%`, background: onPage.metaDescriptionLength >= 70 && onPage.metaDescriptionLength <= 165 ? 'var(--accent-emerald)' : 'var(--accent-amber)', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Recommended: 120-160 characters to avoid truncation.
          </div>
        </div>
      </div>
    </div>
  );
}
