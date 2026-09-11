'use client';

import { ContentBrief } from '@/types';
import { X, Copy, Check, FileText, Sparkles, HelpCircle, Link2, Layers, CheckSquare } from 'lucide-react';
import { useState } from 'react';

interface ContentBriefModalProps {
  brief: ContentBrief;
  onClose: () => void;
}

export function ContentBriefModal({ brief, onClose }: ContentBriefModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `
SEO CONTENT BRIEF: ${brief.primaryKeyword.toUpperCase()}
Search Intent: ${brief.estimatedSearchIntent}

SUGGESTED H1:
${brief.suggestedH1}

SUGGESTED H2 SECTIONS:
${brief.suggestedH2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}

SUGGESTED H3 SUB-SECTIONS:
${brief.suggestedH3s.map((h, i) => `${i + 1}. ${h}`).join('\n')}

SECONDARY KEYWORDS TO INCLUDE:
${brief.secondaryKeywords.join(', ')}

SUPPORTING KEYWORDS:
${brief.supportingKeywords.join(', ')}

QUESTIONS TO ANSWER:
${brief.questionsToAnswer.map((q, i) => `${i + 1}. ${q}`).join('\n')}

NAMED ENTITIES & CONCEPTS TO COVER:
${brief.entitiesToCover.join(', ')}

INTERNAL LINKS TO ADD:
${brief.internalLinksToAdd.map((l) => `- ${l.anchorText} -> ${l.targetUrl} (${l.reason})`).join('\n')}

RECOMMENDED SECTIONS:
${brief.recommendedSections.map((s) => `- ${s}`).join('\n')}

TECHNICAL REQUIREMENTS:
${brief.technicalImprovements.map((t) => `- ${t}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-glass-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              SEO Content Brief: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{brief.primaryKeyword}</span>
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                border: copied ? '1px solid var(--accent-emerald)' : '1px solid var(--primary)',
                color: copied ? 'var(--accent-emerald)' : 'var(--primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied Brief' : 'Copy Brief'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Intent & Target */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Search Intent</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{brief.estimatedSearchIntent}</div>
            </div>
            {brief.targetUrl && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flex: 2 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Page</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brief.targetUrl}</div>
              </div>
            )}
          </div>

          {/* Heading Blueprint */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="var(--primary)" />
              Heading Outline Structure
            </div>
            <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--accent-emerald)' }}>H1:</strong> {brief.suggestedH1}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: '1rem', borderLeft: '2px solid rgba(99,102,241,0.3)', paddingLeft: '0.75rem' }}>
              {brief.suggestedH2s.map((h2, i) => (
                <div key={i} style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--primary)' }}>H2:</strong> {h2}
                </div>
              ))}
            </div>
          </div>

          {/* Keywords & Questions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Secondary & Supporting Keywords
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[...brief.secondaryKeywords, ...brief.supportingKeywords].map((kw, i) => (
                  <span key={i} style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--primary)' }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Questions to Answer
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {brief.questionsToAnswer.map((q, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    • {q}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Internal Links & Technical Requirements */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Link2 size={15} color="var(--accent-amber)" />
              Internal Links & Authority Distribution
            </div>
            {brief.internalLinksToAdd.map((link, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                • Link anchor <strong style={{ color: 'var(--text-primary)' }}>"{link.anchorText}"</strong> to{' '}
                <span style={{ color: 'var(--primary)' }}>{link.targetUrl}</span> ({link.reason})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
