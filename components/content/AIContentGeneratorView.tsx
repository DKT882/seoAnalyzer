'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  AlertCircle,
  RefreshCw,
  Code2,
  Share2,
  FileText,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
  ArrowRight,
  BookOpen,
  Compass,
  Database,
  BarChart3,
  Target,
  Info,
  ListChecks,
  XCircle,
  ShieldAlert,
  EyeOff,
  Lock,
  FileCheck,
} from 'lucide-react';
import {
  AIContentGenerationRequest,
  AIContentGenerationResponse,
  AIContentType,
  AISearchIntent,
  AIContentTone,
  ContentProfile,
  AdultContentProfile,
} from '@/lib/ai-seo/content-types';

interface AIContentGeneratorViewProps {
  initialTopic?: string;
  initialKeyword?: string;
  initialContentType?: AIContentType;
  initialEvidence?: any;
  onApplyFix?: (fixContent: string) => void;
}

const CONTENT_PROFILES: Array<{ id: ContentProfile; label: string; description: string }> = [
  { id: 'general', label: 'General Web (Standard)', description: 'Standard editorial and informational web content.' },
  { id: 'ecommerce', label: 'E-Commerce', description: 'Product and category pages optimized for conversion.' },
  { id: 'saas', label: 'SaaS & Software', description: 'Technical software, B2B, and feature pages.' },
  { id: 'publisher', label: 'Publisher & Media', description: 'News, magazines, and long-form articles.' },
  { id: 'local-business', label: 'Local Business', description: 'Geo-targeted local service and location pages.' },
  { id: 'adult', label: 'Adult / 18+ SEO', description: 'Legitimate adult products, sexual wellness, creators, and media.' },
];

const ADULT_SUBPROFILES: Array<{ id: AdultContentProfile; label: string; description: string }> = [
  { id: 'adult-products', label: 'Adult Products & Novelties', description: 'Product descriptions, body safety, materials, and buying guides.' },
  { id: 'sexual-wellness', label: 'Sexual Wellness & Education', description: 'Evidence-based health, intimacy, and educational wellness guides.' },
  { id: 'escort-services', label: 'Call Girl & Escort Services (Agency/Directory)', description: 'Legitimate directory, booking etiquette, discretion, and city service SEO guides.' },
  { id: 'adult-stories', label: 'Adult Stories & Erotica Literature', description: 'Narrative storytelling, romantic fiction, sensual chapters, and literary themes.' },
  { id: 'adult-entertainment', label: 'Adult Entertainment & Portals', description: 'Category descriptions, platform overviews, and directories.' },
  { id: 'adult-creator', label: 'Adult Creator & Performer', description: 'Verified creator profiles, tiers, schedules, and official channels.' },
  { id: 'adult-community', label: 'Adult Community & Forums', description: 'Community rules, discussions, safety, and moderation policies.' },
  { id: 'adult-video', label: 'Adult Video & Streaming', description: 'Video descriptions, duration, performers, and safe metadata.' },
];

const CONTENT_TYPES: Array<{ id: AIContentType; label: string; defaultWords: number }> = [
  { id: 'product-description', label: 'Product Description', defaultWords: 250 },
  { id: 'category-description', label: 'Category Description', defaultWords: 300 },
  { id: 'blog-article', label: 'Full Blog Article', defaultWords: 800 },
  { id: 'blog-intro', label: 'Blog Introduction', defaultWords: 150 },
  { id: 'blog-conclusion', label: 'Blog Conclusion', defaultWords: 150 },
  { id: 'section', label: 'Article / Landing Section', defaultWords: 350 },
  { id: 'faq', label: 'FAQ Section (Q&A)', defaultWords: 300 },
  { id: 'paragraph', label: 'SEO Paragraph', defaultWords: 100 },
  { id: 'meta-title', label: 'SEO Title Package', defaultWords: 50 },
  { id: 'meta-description', label: 'Meta Description Package', defaultWords: 60 },
  { id: 'headings', label: 'SEO Heading Hierarchy', defaultWords: 100 },
  { id: 'image-alt', label: 'Image Alt Text Suggestions', defaultWords: 80 },
  { id: 'content-brief', label: 'SEO Content Brief', defaultWords: 400 },
  { id: 'content-improvement', label: 'Content Rewrite / Improvement', defaultWords: 350 },
];

const WORD_PRESETS = [50, 100, 250, 300, 500, 800, 1200, 1500];

export function AIContentGeneratorView({
  initialTopic = '',
  initialKeyword = '',
  initialContentType = 'product-description',
  initialEvidence,
}: AIContentGeneratorViewProps) {
  // Input form state
  const [contentProfile, setContentProfile] = useState<ContentProfile>('general');
  const [adultProfile, setAdultProfile] = useState<AdultContentProfile>('adult-products');
  const [contentType, setContentType] = useState<AIContentType>(initialContentType);
  const [mainTopic, setMainTopic] = useState<string>(initialTopic || initialEvidence?.topic || '');
  const [primaryKeyword, setPrimaryKeyword] = useState<string>(initialKeyword || initialEvidence?.primaryKeyword || '');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string>('');
  const [wordLimit, setWordLimit] = useState<number>(250);
  const [searchIntent, setSearchIntent] = useState<AISearchIntent>('informational');
  const [tone, setTone] = useState<AIContentTone>('professional');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');
  const [country, setCountry] = useState<string>('US');

  // Advanced / Improvement state
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [existingContent, setExistingContent] = useState<string>('');
  const [improvementGoal, setImprovementGoal] = useState<'improve_seo' | 'rewrite' | 'expand' | 'shorten' | 'readability'>('improve_seo');
  const [brandDescription, setBrandDescription] = useState<string>('');
  const [keyBenefits, setKeyBenefits] = useState<string>('');
  const [cta, setCta] = useState<string>('');
  const [forbiddenClaims, setForbiddenClaims] = useState<string>('');

  // Generation state & Abort Controller
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>('Analyzing search intent...');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<AIContentGenerationResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Active view tab in results
  const [activeResultTab, setActiveResultTab] = useState<'strategy' | 'content' | 'seo' | 'metadata' | 'schema' | 'social' | 'quality' | 'improvement'>('strategy');

  // Copy feedback state
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [copiedPackage, setCopiedPackage] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Real elapsed timer and stage progression during generation
  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next < 5) {
          setGenerationStage('Constructing content intelligence plan & blueprint...');
        } else if (next < 30) {
          setGenerationStage('Generating structured content via Dolphin3 on RTX 4050...');
        } else if (next < 90) {
          setGenerationStage('Generating sections via Dolphin3 local GPU...');
        } else if (next < 140) {
          setGenerationStage('Validating readability, topic coverage, and schema...');
        } else {
          setGenerationStage(`Finalizing content on RTX 4050 (${Math.floor(next / 60)}m ${next % 60}s elapsed)...`);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialTopic) setMainTopic(initialTopic);
    if (initialKeyword) setPrimaryKeyword(initialKeyword);
    if (initialContentType) setContentType(initialContentType);
    if (initialEvidence?.url) {
      if (!mainTopic && initialEvidence.technical?.title?.value) {
        setMainTopic(initialEvidence.technical.title.value);
      }
      if (!primaryKeyword && initialEvidence.keywords?.targetKeyword) {
        setPrimaryKeyword(initialEvidence.keywords.targetKeyword);
      }
    }
  }, [initialTopic, initialKeyword, initialContentType, initialEvidence]);

  // Handle content type preset changes
  const handleContentTypeChange = (type: AIContentType) => {
    setContentType(type);
    const preset = CONTENT_TYPES.find((t) => t.id === type);
    if (preset) {
      setWordLimit(preset.defaultWords);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationStage('Generation cancelled');
    setGenerationError('Content generation was cancelled by user.');
  };

  const handleGenerate = async () => {
    // Guard against duplicate submissions
    if (isGenerating) return;

    if (!mainTopic.trim()) {
      setGenerationError('Please enter a main topic or subject.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setElapsedSeconds(0);
    setGenerationStage('Constructing content intelligence plan & blueprint...');
    setGenerationError(null);

    const payload: AIContentGenerationRequest = {
      contentProfile,
      adultProfile: contentProfile === 'adult' ? adultProfile : undefined,
      isAdultSite: contentProfile === 'adult',
      contentType,
      mainTopic: mainTopic.trim(),
      primaryKeyword: primaryKeyword.trim() || mainTopic.trim(),
      wordLimit,
      secondaryKeywords: secondaryKeywords ? secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
      searchIntent,
      tone,
      targetAudience: targetAudience.trim() || undefined,
      language,
      country,
      existingContent: existingContent.trim() || undefined,
      improvementGoal: existingContent ? improvementGoal : undefined,
      brandDescription: brandDescription.trim() || undefined,
      keyBenefits: keyBenefits ? keyBenefits.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
      cta: cta.trim() || undefined,
      forbiddenClaims: forbiddenClaims ? forbiddenClaims.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
      evidence: initialEvidence,
    };

    try {
      const res = await fetch('/api/ai-seo/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg =
          data.error?.message ||
          (typeof data.error === 'string' ? data.error : null) ||
          `Generation request failed (${res.status})`;

        if (errorMsg.includes('timed out') || data.error?.code === 'CONTENT_GENERATION_LLM_TIMEOUT') {
          throw new Error(
            'Local Dolphin3 inference timed out. Your RTX 4050 took longer than the generation deadline. Try reducing requested word count or retry.'
          );
        }
        throw new Error(errorMsg);
      }

      if (data.result) {
        setResult(data.result);
        if (data.result.contentImprovement) {
          setActiveResultTab('improvement');
        } else {
          setActiveResultTab('strategy');
        }
      } else {
        throw new Error('Failed to parse generation result.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setGenerationError('Content generation was cancelled.');
      } else {
        setGenerationError(err.message || 'An unexpected error occurred during generation.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopy = (text: string, type: 'content' | 'package' | 'schema') => {
    navigator.clipboard.writeText(text);
    if (type === 'content') {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } else if (type === 'package') {
      setCopiedPackage(true);
      setTimeout(() => setCopiedPackage(false), 2000);
    } else if (type === 'schema') {
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    }
  };

  return (
    <div className="ai-generator-root">
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px', minWidth: 0 }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff', wordBreak: 'break-word' }}>
              AI SEO Content Generator
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
              Generate comprehensive, human-grade, evidence-backed SEO content, metadata, schema, and topical packages.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
            }}
          >
            <ShieldCheck size={14} />
            <span>Local AI Ready (Ollama + Dolphin3)</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Inputs Left, Results Right */}
      <div className={`ai-generator-grid ${result ? 'has-results' : ''}`}>
        {/* ========================================================================= */}
        {/* INPUT FORM PANEL (Grows naturally in normal document flow) */}
        {/* ========================================================================= */}
        <div className="ai-generator-left-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--primary)" />
              <span>Generation Parameters</span>
            </h3>
            {initialEvidence?.url && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                Audited Page Linked
              </span>
            )}
          </div>

          {/* Content Profile */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Content Profile / Industry Archetype
            </label>
            <select
              value={contentProfile}
              onChange={(e) => setContentProfile(e.target.value as ContentProfile)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: contentProfile === 'adult' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                border: contentProfile === 'adult' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                color: contentProfile === 'adult' ? '#fca5a5' : '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                fontWeight: contentProfile === 'adult' ? 600 : 400,
              }}
            >
              {CONTENT_PROFILES.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#1e1e24', color: '#fff' }}>
                  {p.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {CONTENT_PROFILES.find((p) => p.id === contentProfile)?.description}
            </div>
          </div>

          {/* Adult Subprofile Selector & Safety Badge (if adult) */}
          {contentProfile === 'adult' && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <ShieldAlert size={15} color="#f87171" />
                  <span>Adult 18+ Content Category</span>
                </label>
                <select
                  value={adultProfile}
                  onChange={(e) => setAdultProfile(e.target.value as AdultContentProfile)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {ADULT_SUBPROFILES.map((sub) => (
                    <option key={sub.id} value={sub.id} style={{ background: '#1e1e24', color: '#fff' }}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.25rem' }}>
                  {ADULT_SUBPROFILES.find((sub) => sub.id === adultProfile)?.description}
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                  borderTop: '1px solid rgba(239, 68, 68, 0.15)',
                  paddingTop: '0.5rem',
                }}
              >
                <Lock size={13} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Strict 18+ Safety Guardrails Active:</strong> Minors, CSAM, non-consensual content, and unverified personal attributes are strictly prohibited. SafeSearch metadata and adult schema are automatically formatted.
                </span>
              </div>
            </div>
          )}

          {/* Content Type */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => handleContentTypeChange(e.target.value as AIContentType)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.id} value={t.id} style={{ background: '#1e1e24', color: '#fff' }}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Main Topic */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Main Topic / Subject *
            </label>
            <input
              type="text"
              placeholder="e.g. Pro Runner Running Shoes or SaaS Onboarding Guide"
              value={mainTopic}
              onChange={(e) => setMainTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Primary Keyword */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Primary Target Keyword *
            </label>
            <input
              type="text"
              placeholder="e.g. best running shoes for beginners"
              value={primaryKeyword}
              onChange={(e) => setPrimaryKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Secondary Keywords */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Secondary Keywords (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. cushioned footwear, lightweight trainers, arch support"
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Word Limit Selector & Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Target Word Count: <span style={{ color: 'var(--primary)' }}>{wordLimit} words</span>
              </label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {WORD_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWordLimit(preset)}
                  style={{
                    padding: '0.3rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: wordLimit === preset ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: wordLimit === preset ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  {preset}w
                </button>
              ))}
            </div>
            <input
              type="range"
              min={30}
              max={2000}
              step={10}
              value={wordLimit}
              onChange={(e) => setWordLimit(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Search Intent & Tone Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Search Intent
              </label>
              <select
                value={searchIntent}
                onChange={(e) => setSearchIntent(e.target.value as AISearchIntent)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Tone of Voice
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as AIContentTone)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="authoritative">Authoritative</option>
                <option value="persuasive">Persuasive</option>
                <option value="educational">Educational</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          {/* Advanced / Content Improvement Accordion Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.5rem 0',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: '0.5rem',
            }}
          >
            <span>{showAdvanced ? 'Hide Advanced Options & Rewrite Mode' : 'Show Advanced Options & Rewrite Mode'}</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
              {/* Existing Content for Rewrite */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Existing Content (For Improvement / Rewrite Mode)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste existing copy here to analyze gaps, expand, or improve search intent alignment..."
                  value={existingContent}
                  onChange={(e) => setExistingContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {existingContent && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                    Improvement Goal
                  </label>
                  <select
                    value={improvementGoal}
                    onChange={(e) => setImprovementGoal(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="improve_seo">Improve Overall SEO & Keyword Depth</option>
                    <option value="rewrite">Complete Rewrite with Modern Tone</option>
                    <option value="expand">Expand with Missing Subtopics</option>
                    <option value="shorten">Condense & Tighten Readability</option>
                    <option value="readability">Simplify Language & Flow</option>
                  </select>
                </div>
              )}

              {/* Target Audience & CTA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                    Target Audience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marathon runners"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                    Call to Action (CTA)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Now, Start Free Trial"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {/* Forbidden Claims */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Forbidden Claims / Negative Constraints
                </label>
                <input
                  type="text"
                  placeholder="e.g. Do not claim medical benefits, do not mention competitors"
                  value={forbiddenClaims}
                  onChange={(e) => setForbiddenClaims(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {generationError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{generationError}</span>
            </div>
          )}

          {/* Submit and Cancel Button Row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--primary), #a855f7)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.8 : 1,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{generationStage}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate SEO Content Package</span>
                </>
              )}
            </button>

            {isGenerating && (
              <button
                type="button"
                onClick={handleCancel}
                title="Cancel ongoing generation request"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <XCircle size={16} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Active Generation GPU Info Box */}
          {isGenerating && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#c7d2fe',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Dolphin3 Local GPU Inference Active</span>
                <span style={{ color: '#a5b4fc', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {Math.floor(elapsedSeconds / 60)}m {String(elapsedSeconds % 60).padStart(2, '0')}s
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Generating content on NVIDIA GeForce RTX 4050 GPU. Recent benchmark: ~1.54 tok/s | Bounded deadline: 3m.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RESULTS PANEL (Independently scrollable on desktop) */}
        {/* ========================================================================= */}
        {result ? (
          <div className="ai-generator-right-panel custom-scrollbar">
            {/* Fallback Telemetry Warning Banner */}
            {result.generation?.fallbackUsed && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: '#fde047',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Info size={16} />
                <span>
                  <strong>Partial Fallback Active:</strong> Deterministic engine synthesized content for{' '}
                  {result.generation.failedSections?.length
                    ? `${result.generation.failedSections.length} section(s) (${result.generation.failedSections.join(', ')})`
                    : 'some sections'}{' '}
                  due to local inference timeout. Search intent and topic coverage remain preserved.
                </span>
              </div>
            )}
            {/* Tab Navigation for Results */}
            <div className="ai-generator-tabs-nav custom-scrollbar">
              {[
                { id: 'strategy', label: 'Strategy & Blueprint', icon: <Compass size={15} /> },
                { id: 'content', label: 'Generated Content', icon: <FileText size={15} /> },
                { id: 'seo', label: 'SEO & Keywords', icon: <Tag size={15} /> },
                { id: 'metadata', label: 'Metadata & Headings', icon: <BookOpen size={15} /> },
                { id: 'schema', label: 'Structured Data', icon: <Code2 size={15} /> },
                { id: 'social', label: 'Social Sharing', icon: <Share2 size={15} /> },
                { id: 'quality', label: `Quality & Opportunities (${result.contentQuality.score}/100)`, icon: <ShieldCheck size={15} /> },
                ...(result.contentImprovement ? [{ id: 'improvement', label: 'Rewrite Diff', icon: <Layers size={15} /> }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveResultTab(tab.id as any)}
                  className="ai-generator-tab-btn"
                  style={{
                    background: activeResultTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                    color: activeResultTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB 0: CONTENT STRATEGY & BLUEPRINT */}
            {activeResultTab === 'strategy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Search Intent & User Goal Card */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Compass size={20} color="var(--primary)" />
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                        Search Intent & User Goal Analysis
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background:
                            result.contentPlan?.searchIntent.type === 'informational'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : result.contentPlan?.searchIntent.type === 'commercial'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(34, 197, 94, 0.15)',
                          color:
                            result.contentPlan?.searchIntent.type === 'informational'
                              ? '#60a5fa'
                              : result.contentPlan?.searchIntent.type === 'commercial'
                              ? '#c084fc'
                              : '#4ade80',
                          border: '1px solid currentColor',
                        }}
                      >
                        {result.contentPlan?.searchIntent.type || result.seo.searchIntent} Intent ({Math.round((result.contentPlan?.searchIntent.confidence || 0.9) * 100)}% Confidence)
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: '#fff' }}>Strategic Rationale: </strong>
                    {result.contentPlan?.searchIntent.explanation || 'Analyzed intent based on query semantics and page type.'}
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <strong style={{ color: '#38bdf8' }}>Primary User Goal: </strong>
                    <span style={{ color: '#fff' }}>{result.contentPlan?.userGoal || `Satisfy search interest for ${result.seo.primaryKeyword}.`}</span>
                  </div>
                </div>

                {/* 1.5. Adult / 18+ SEO Strategy & Compliance Card (if Adult profile) */}
                {(result.adultContext || result.contentPlan?.adultContext || result.isAdultSite) && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <ShieldAlert size={20} color="#f87171" />
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fca5a5' }}>
                          Adult / 18+ SEO Strategy & Policy Compliance
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid #f87171',
                            textTransform: 'uppercase',
                          }}
                        >
                          {result.adultContext?.contentClassification || result.adultContext?.profile || result.contentPlan?.adultContext?.profile || 'Adult 18+'}
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        >
                          Age Restricted: 18+ Mandatory
                        </span>
                      </div>
                    </div>

                    <div className="ai-grid-2col">
                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <EyeOff size={13} />
                          <span>SafeSearch Engine Filter Behavior</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '0.25rem', lineHeight: 1.4 }}>
                          {result.adultContext?.safeSearchConsiderations?.[0] ||
                            'Standard SafeSearch may restrict explicit visual SERP features. Textual rankings rely on verified entity relevance, exact intent alignment, and compliance trust signals.'}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <ShieldCheck size={13} />
                          <span>Trust & Health/Safety Standards</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '0.25rem', lineHeight: 1.4 }}>
                          {result.adultContext?.trustRequirements?.[0] ||
                            'Body-safe materials, phthalate-free certifications, educational tone, and clear 18+ age verification disclaimers.'}
                        </div>
                      </div>
                    </div>

                    {result.adultContext?.restrictedClaims && result.adultContext.restrictedClaims.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.25)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <strong style={{ color: '#fca5a5' }}>Prohibited & Restricted Claims Guardrails: </strong>
                        <span>{result.adultContext.restrictedClaims.join(' • ')}</span>
                      </div>
                    )}

                    {result.adultContext?.schemaRecommendations && result.adultContext.schemaRecommendations.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#38bdf8' }}>Google-Compliant Schema Directive: </strong>
                        <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.5rem', borderRadius: '3px', wordBreak: 'break-all' }}>
                          {result.adultContext.schemaRecommendations.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Evidence Availability Bar */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={18} color="#a855f7" />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                      Evidence Availability Tracking (Phases 1–8 Grounding)
                    </h4>
                  </div>

                  <div className="ai-grid-4col">
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Keyword Evidence</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: result.evidenceAvailability?.keywordEvidence ? '#4ade80' : '#fbbf24', marginTop: '0.2rem' }}>
                        {result.evidenceAvailability?.keywordEvidence ? '✓ Verified Query Signals' : '○ Default Fallback'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SERP Patterns</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: result.evidenceAvailability?.serpEvidence ? '#4ade80' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {result.evidenceAvailability?.serpEvidence ? '✓ Evidence-Backed SERP' : '○ Unavailable / Limited'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crawl Evidence</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: result.evidenceAvailability?.crawlEvidence ? '#4ade80' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {result.evidenceAvailability?.crawlEvidence ? '✓ Authoritative Page Signals' : '○ Standalone Generation'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Competitor Gaps</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: result.evidenceAvailability?.competitorEvidence ? '#4ade80' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {result.evidenceAvailability?.competitorEvidence ? '✓ Gap Matrix Active' : '○ Standard Semantic Baseline'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Deterministic Topic Coverage Visualizer */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={18} color="#38bdf8" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                        Topical Coverage & Intent Satisfaction
                      </h4>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                      {result.topicCoverage?.overallScore || result.seo.topicCoverage || 85}% Coverage
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Critical Topic Clusters</span>
                        <strong style={{ color: '#fff' }}>{result.topicCoverage?.criticalTopicsCovered ?? 90}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${result.topicCoverage?.criticalTopicsCovered ?? 90}%`, height: '100%', background: '#4ade80', borderRadius: '3px' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Important Supporting Topics</span>
                        <strong style={{ color: '#fff' }}>{result.topicCoverage?.importantTopicsCovered ?? 85}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${result.topicCoverage?.importantTopicsCovered ?? 85}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>User Questions Answered</span>
                        <strong style={{ color: '#fff' }}>{result.topicCoverage?.questionsCovered ?? 80}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${result.topicCoverage?.questionsCovered ?? 80}%`, height: '100%', background: '#a855f7', borderRadius: '3px' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Named Entities Integrated</span>
                        <strong style={{ color: '#fff' }}>{result.topicCoverage?.entitiesCovered ?? 85}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${result.topicCoverage?.entitiesCovered ?? 85}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>

                  {result.topicCoverage?.coveredList && result.topicCoverage.coveredList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {result.topicCoverage.coveredList.slice(0, 8).map((c, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            color: '#4ade80',
                            fontSize: '0.75rem',
                          }}
                        >
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Section Architecture & Word Budget Table */}
                {result.blueprint && result.blueprint.sections.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={18} color="#f59e0b" />
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                          ContentBlueprint Section Architecture & Budget
                        </h4>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Target Budget: <strong style={{ color: '#fff' }}>{result.blueprint.totalTargetWords} words</strong> across {result.blueprint.sections.length} sections
                      </span>
                    </div>

                    <div className="ai-table-responsive custom-scrollbar">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Section Heading</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Purpose & Intent</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Target Words</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Required Topics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.blueprint.sections.map((sec, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{i + 1}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#fff' }}>{sec.heading}</td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{sec.purpose}</td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#38bdf8' }}>
                                ~{sec.targetWords}w
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  {sec.requiredTopics.map((t, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.05)',
                                        fontSize: '0.72rem',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: GENERATED CONTENT */}
            {activeResultTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Word Count & Stats Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Actual Length: </span>
                      <strong style={{ color: '#fff' }}>{result.actualWordCount} words</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Target: </span>
                      <span>{result.requestedWordCount} words</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Deviation: </span>
                      <span style={{ color: Math.abs(result.deviation) <= 40 ? '#4ade80' : '#fbbf24' }}>
                        {result.deviation > 0 ? `+${result.deviation}` : result.deviation} words
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(result.content, 'content')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: copiedContent ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid var(--primary)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedContent ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      <span>{copiedContent ? 'Copied!' : 'Copy Content'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([result.content], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${result.metadata.slug || 'seo-content'}.md`;
                        a.click();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                {/* Editable Content Area */}
                <textarea
                  rows={14}
                  value={result.content}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const count = newText.trim().split(/\s+/).filter(Boolean).length;
                    setResult({
                      ...result,
                      content: newText,
                      actualWordCount: count,
                      deviation: count - result.requestedWordCount,
                    });
                  }}
                  className="custom-scrollbar"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '350px',
                  }}
                />
              </div>
            )}

            {/* TAB 2: SEO & KEYWORDS */}
            {activeResultTab === 'seo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="ai-grid-4col">
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Primary Keyword</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{result.seo.primaryKeyword}</div>
                    <div style={{ fontSize: '0.8rem', color: result.seo.primaryKeywordUsed ? '#4ade80' : '#f87171', marginTop: '0.25rem' }}>
                      {result.seo.primaryKeywordUsed ? `✓ Used (${result.seo.primaryKeywordCount}x)` : '✗ Not detected in body'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Search Intent</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem', textTransform: 'capitalize' }}>
                      {result.seo.searchIntent}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Aligned with SERP query type
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Keyword Stuffing Guard</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: result.contentQuality.keywordStuffingDetected ? '#f87171' : '#4ade80', marginTop: '0.25rem' }}>
                      {result.contentQuality.keywordStuffingDetected ? 'Warning: High Density' : 'Natural Frequency Passed'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Google spam penalty compliant
                    </div>
                  </div>
                </div>

                {/* Keyword Coverage Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>
                    Keyword & Topical Coverage Analysis
                  </h4>
                  <div className="ai-table-responsive custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>Keyword</th>
                          <th style={{ padding: '0.5rem' }}>Status</th>
                          <th style={{ padding: '0.5rem' }}>Occurrences</th>
                          <th style={{ padding: '0.5rem' }}>Naturalness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.seo.keywordCoverage.map((kw, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: '#fff' }}>{kw.keyword}</td>
                            <td style={{ padding: '0.5rem' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: kw.status === 'used' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: kw.status === 'used' ? '#4ade80' : '#f87171',
                                }}
                              >
                                {kw.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{kw.occurrences}x</td>
                            <td style={{ padding: '0.5rem', color: kw.naturalness === 'forced' ? '#f87171' : '#4ade80', textTransform: 'capitalize' }}>
                              {kw.naturalness}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Topical Entities */}
                {result.seo.entities.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                      Topical Entities & Semantic Concepts
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {result.seo.entities.map((entity, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '20px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: 'var(--primary)',
                            fontSize: '0.8rem',
                          }}
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: METADATA & HEADINGS */}
            {activeResultTab === 'metadata' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Meta Keywords Educational Notice */}
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    color: '#93c5fd',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <HelpCircle size={18} />
                  <span>
                    <strong>Google SEO Standard:</strong> Google Search does NOT use the <code>&lt;meta name=&quot;keywords&quot;&gt;</code> tag for ranking. The metadata below focuses on CTR-optimized Title, Description, and Heading structure.
                  </span>
                </div>

                {/* Recommended Title */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Recommended SEO Title</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{result.metadata.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{result.metadata.titleRationale}</div>
                  {result.metadata.alternativeTitles.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Alternative Titles:</div>
                      {result.metadata.alternativeTitles.map((alt, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {alt}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Meta Description */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Recommended Meta Description</div>
                  <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: '1.5' }}>{result.metadata.metaDescription}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{result.metadata.metaDescriptionRationale}</div>
                </div>

                {/* URL Slug & H1 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Suggested Clean Slug</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>/{result.metadata.slug}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recommended H1</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '0.25rem' }}>{result.metadata.h1}</div>
                  </div>
                </div>

                {/* Heading Hierarchy Outline */}
                {result.metadata.headings.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Suggested Heading Outline</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {result.metadata.headings.map((h, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                            {h.level.toUpperCase()}
                          </span>
                          <span style={{ color: '#fff' }}>{h.text}</span>
                          {h.purpose && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({h.purpose})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: STRUCTURED DATA */}
            {activeResultTab === 'schema' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#fff' }}>
                      Recommended Schema.org Structured Data
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      Types: {result.structuredData.recommendedTypes.join(', ')}
                    </p>
                  </div>

                  {result.structuredData.schemaSnippet && (
                    <button
                      type="button"
                      onClick={() => handleCopy(result.structuredData.schemaSnippet!, 'schema')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: copiedSchema ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid var(--primary)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedSchema ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      <span>{copiedSchema ? 'Copied JSON-LD!' : 'Copy Schema JSON-LD'}</span>
                    </button>
                  )}
                </div>

                {result.structuredData.missingRequiredData.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      color: '#fde047',
                      fontSize: '0.85rem',
                    }}
                  >
                    <strong>Notice:</strong> To be eligible for Google Rich Results, ensure you provide: {result.structuredData.missingRequiredData.join(', ')}.
                  </div>
                )}

                {result.structuredData.schemaSnippet && (
                  <pre
                    className="ai-code-block custom-scrollbar"
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      color: '#a5f3fc',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    <code>{result.structuredData.schemaSnippet}</code>
                  </pre>
                )}
              </div>
            )}

            {/* TAB 5: SOCIAL SHARING */}
            {activeResultTab === 'social' && (
              <div className="ai-grid-2col">
                {/* OpenGraph Preview */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Share2 size={16} color="var(--primary)" />
                    <span>Open Graph Metadata (Facebook, LinkedIn)</span>
                  </h4>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>og:title:</strong> <span style={{ color: '#fff' }}>{result.social.ogTitle}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>og:description:</strong> <span style={{ color: '#fff' }}>{result.social.ogDescription}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>og:type:</strong> <span style={{ color: 'var(--primary)' }}>{result.social.ogType}</span></div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Share2 size={16} color="#38bdf8" />
                    <span>Twitter / X Card Metadata</span>
                  </h4>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>twitter:card:</strong> <span style={{ color: '#38bdf8' }}>{result.social.twitterCard}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>twitter:title:</strong> <span style={{ color: '#fff' }}>{result.social.twitterTitle}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>twitter:description:</strong> <span style={{ color: '#fff' }}>{result.social.twitterDescription}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: QUALITY & OPPORTUNITY */}
            {activeResultTab === 'quality' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Two-Card Header: Quality Heuristic & SEO Opportunity */}
                <div className="ai-grid-2col">
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>People-First Content Quality</div>
                      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: result.contentQuality.score >= 80 ? '#4ade80' : '#fbbf24' }}>
                        {result.contentQuality.score} / 100
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Structural completeness & readability
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div>Readability: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{result.contentQuality.readabilityLevel}</strong></div>
                      <div>Intent Alignment: <strong style={{ color: '#4ade80', textTransform: 'capitalize' }}>{result.contentQuality.intentAlignment}</strong></div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>SEO Opportunity Score</div>
                      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: (result.contentQuality.seoOpportunity ?? 85) >= 80 ? '#38bdf8' : '#fbbf24' }}>
                        {result.contentQuality.seoOpportunity ?? 85} / 100
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Topical readiness & search alignment
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div>Target Word Budget: <strong style={{ color: '#fff' }}>{result.requestedWordCount}w</strong></div>
                      <div>Keyword Density: <strong style={{ color: '#4ade80' }}>Natural</strong></div>
                    </div>
                  </div>
                </div>

                {/* Sub-Metrics Grid */}
                {result.contentQuality.details && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>
                      Quality Sub-Metrics Breakdown (0–100)
                    </h4>
                    <div className="ai-grid-metrics">
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Intent Fit</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>{result.contentQuality.details.intentSatisfaction}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Topic Coverage</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{result.contentQuality.details.topicCoverage}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original Value</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c084fc' }}>{result.contentQuality.details.originalValue}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evidence Support</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{result.contentQuality.details.evidenceSupport}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Readability</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{result.contentQuality.details.readability}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Naturalness</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>{result.contentQuality.details.keywordNaturalness}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Structure</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>{result.contentQuality.details.structure}</div>
                      </div>
                      {typeof result.contentQuality.details.trust === 'number' && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>Trust / Safety Standard</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>{result.contentQuality.details.trust}</div>
                        </div>
                      )}
                      {typeof result.contentQuality.details.safetyAccuracy === 'number' && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Safety & Policy Score</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>{result.contentQuality.details.safetyAccuracy}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Evidence-Backed Claims & Source Provenance Table */}
                {result.claims && result.claims.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} color="#4ade80" />
                      <span>Evidence-Backed Claims & Source Provenance</span>
                    </h4>
                    <div className="ai-table-responsive custom-scrollbar">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Claim / Proposition</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Type</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Evidence Provenance</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.claims.map((claim, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#fff', maxWidth: '380px' }}>"{claim.text}"</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>
                                <span
                                  style={{
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    background:
                                      claim.type === 'site-fact'
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : claim.type === 'provided-fact'
                                        ? 'rgba(59, 130, 246, 0.15)'
                                        : 'rgba(168, 85, 247, 0.15)',
                                    color:
                                      claim.type === 'site-fact'
                                        ? '#4ade80'
                                        : claim.type === 'provided-fact'
                                        ? '#60a5fa'
                                        : '#c084fc',
                                  }}
                                >
                                  {claim.type}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-secondary)' }}>{claim.evidence || 'Semantic synthesis'}</td>
                              <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
                                {Math.round(claim.confidence * 100)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {result.contentQuality.strengths.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.5rem' }}>
                      Key Content Strengths:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {result.contentQuality.strengths.map((str, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={15} color="#4ade80" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {result.contentQuality.issues.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f87171', marginBottom: '0.5rem' }}>
                      Recommendations for Improvement:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {result.contentQuality.issues.map((iss, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={15} color="#f87171" />
                          <span>{iss}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>{result.disclaimers.qualityScoreNotice}</div>
                  <div>{result.disclaimers.seoOpportunityNotice}</div>
                  <div>{result.disclaimers.noRankingGuarantee}</div>
                </div>
              </div>
            )}

            {/* TAB 7: CONTENT IMPROVEMENT DIFF */}
            {activeResultTab === 'improvement' && result.contentImprovement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="ai-grid-2col">
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f87171', marginBottom: '0.4rem' }}>Original Text</div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {result.contentImprovement.originalContent}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.4rem' }}>Improved SEO Content</div>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap' }}>
                      {result.contentImprovement.improvedContent}
                    </div>
                  </div>
                </div>

                {result.contentImprovement.changesMade.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>Changes Implemented:</div>
                    {result.contentImprovement.changesMade.map((ch, i) => (
                      <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {ch}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
