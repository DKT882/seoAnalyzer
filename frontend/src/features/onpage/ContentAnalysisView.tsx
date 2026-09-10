import { OnPageData } from '@seo-analyzer/shared';
import { MetricCard } from '../../components/MetricCard.js';
import { FileText, AlignLeft, List, Table, Clock, Percent } from 'lucide-react';

interface ContentAnalysisViewProps {
  onPage: OnPageData;
}

export function ContentAnalysisView({ onPage }: ContentAnalysisViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Content Volume & Readability Metrics
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Detailed breakdown of visible copy, structural paragraphs, lists, and code-to-text density.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <MetricCard
          label="Total Word Count"
          value={onPage.wordCount}
          sublabel="Total visible content words"
          icon={<FileText size={20} />}
          statusColor={onPage.wordCount >= 600 ? 'var(--accent-emerald)' : onPage.wordCount >= 300 ? 'var(--accent-cyan)' : 'var(--accent-amber)'}
        />

        <MetricCard
          label="Estimated Reading Time"
          value={`~${onPage.readingTimeMinutes} min`}
          sublabel="At 200 words/min average"
          icon={<Clock size={20} />}
        />

        <MetricCard
          label="Text-to-HTML Ratio"
          value={`${onPage.textToHtmlRatio}%`}
          sublabel={onPage.textToHtmlRatio >= 15 ? 'Good text density' : 'Heavy markup'}
          icon={<Percent size={20} />}
          statusColor={onPage.textToHtmlRatio >= 15 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
        />

        <MetricCard
          label="Paragraphs Count"
          value={onPage.paragraphsCount}
          sublabel="<p> blocks in document"
          icon={<AlignLeft size={20} />}
        />

        <MetricCard
          label="Lists Count"
          value={onPage.listsCount}
          sublabel="<ul> and <ol> containers"
          icon={<List size={20} />}
        />

        <MetricCard
          label="Tables Count"
          value={onPage.tablesCount}
          sublabel="<table> data structures"
          icon={<Table size={20} />}
        />
      </div>

      {/* Content Quality Insights */}
      <div
        style={{
          background: 'var(--bg-glass-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Topical Depth & Coverage Insights
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <div>
            <strong>Document Depth:</strong>{' '}
            {onPage.wordCount >= 1000
              ? 'Comprehensive in-depth content. Excellent for covering multiple related sub-intents.'
              : onPage.wordCount >= 400
              ? 'Standard article length. Good topical coverage.'
              : 'Thin content volume. May struggle to compete against comprehensive long-form resources.'}
          </div>

          <div>
            <strong>Content Structure:</strong>{' '}
            {onPage.listsCount > 0 || onPage.tablesCount > 0
              ? 'Rich formatting with bulleted lists or tabular data. Highly scannable for users and AI overviews.'
              : 'Primarily plain paragraph blocks. Consider adding structured lists or comparison tables.'}
          </div>
        </div>
      </div>
    </div>
  );
}
