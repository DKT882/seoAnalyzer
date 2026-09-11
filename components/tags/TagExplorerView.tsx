'use client';

import { useState, useMemo } from 'react';
import { TagExplorerData, PageElementItem, PageElementCategory, ElementIssueStatus } from '@/types';
import {
  Code,
  Tag,
  Heading,
  Share2,
  FileText,
  Link2,
  Image as ImageIcon,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TagExplorerViewProps {
  tagExplorer: TagExplorerData;
}

export function TagExplorerView({ tagExplorer }: TagExplorerViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<PageElementCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ElementIssueStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = [
    { id: 'all', label: `All Elements (${tagExplorer.totalElementsCount})`, icon: <Code size={15} /> },
    { id: 'metadata', label: `Metadata (${tagExplorer.metadata.length})`, icon: <Tag size={15} /> },
    { id: 'headings', label: `Headings (${tagExplorer.headings.length})`, icon: <Heading size={15} /> },
    { id: 'social', label: `Social & OpenGraph (${tagExplorer.social.length})`, icon: <Share2 size={15} /> },
    { id: 'content', label: `Content Elements (${tagExplorer.content.length})`, icon: <FileText size={15} /> },
    { id: 'links', label: `Links (${tagExplorer.links.length})`, icon: <Link2 size={15} /> },
    { id: 'images', label: `Images (${tagExplorer.images.length})`, icon: <ImageIcon size={15} /> },
    { id: 'structuredData', label: `Structured Data (${tagExplorer.structuredData.length})`, icon: <Layers size={15} /> },
  ];

  const allElements: PageElementItem[] = useMemo(() => {
    return [
      ...tagExplorer.metadata,
      ...tagExplorer.headings,
      ...tagExplorer.social,
      ...tagExplorer.content,
      ...tagExplorer.links,
      ...tagExplorer.images,
      ...tagExplorer.structuredData,
    ];
  }, [tagExplorer]);

  const filteredElements = useMemo(() => {
    return allElements.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.value.toLowerCase().includes(q) ||
          item.recommendation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allElements, selectedCategory, statusFilter, searchQuery]);

  const getStatusBadge = (status: ElementIssueStatus) => {
    switch (status) {
      case 'OPTIMAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={12} /> Optimal
          </span>
        );
      case 'WARNING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <AlertTriangle size={12} /> Warning
          </span>
        );
      case 'CRITICAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={12} /> Critical
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Info size={12} /> Info
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Description */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Code size={20} color="var(--primary)" />
          Page Elements & Tag Explorer
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Comprehensive structural inspection of all meaningful SEO-related HTML tags, attributes, and social graphs discovered on the page.
        </p>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: selectedCategory === cat.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedCategory === cat.id ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Filter and Search Controls */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '450px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tags, names, or values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {(['all', 'OPTIMAL', 'WARNING', 'CRITICAL', 'INFO'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: statusFilter === status ? 'var(--bg-surface-elevated)' : 'transparent',
                color: statusFilter === status ? 'var(--text-primary)' : 'var(--text-muted)',
                border: statusFilter === status ? '1px solid var(--border-strong)' : '1px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Elements List Table / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredElements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            No page elements match the selected filter criteria.
          </div>
        ) : (
          filteredElements.map((elem) => {
            const isExpanded = Boolean(expandedItems[elem.id]);
            return (
              <div
                key={elem.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <code style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>
                      {elem.tag}
                    </code>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {elem.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      {elem.location}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Relevance: <strong>{elem.seoRelevance}</strong>
                    </span>
                    {getStatusBadge(elem.status)}
                    <button
                      onClick={() => toggleExpand(elem.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Expand details"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Value Snippet */}
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '4px', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}>
                  {elem.value}
                </div>

                {/* Recommendation Box */}
                <div style={{ fontSize: '0.82rem', color: elem.status === 'CRITICAL' ? '#fca5a5' : elem.status === 'WARNING' ? '#fde68a' : 'var(--text-secondary)', background: elem.status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : elem.status === 'WARNING' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)', padding: '0.45rem 0.75rem', borderRadius: '4px', borderLeft: `3px solid ${elem.status === 'CRITICAL' ? '#ef4444' : elem.status === 'WARNING' ? '#f59e0b' : '#10b981'}` }}>
                  <strong>Recommendation:</strong> {elem.recommendation}
                </div>

                {/* Expandable Attributes */}
                {isExpanded && elem.attributes && Object.keys(elem.attributes).length > 0 && (
                  <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Attributes & Metadata:</div>
                    {Object.entries(elem.attributes).map(([k, v]) => (
                      <div key={k} style={{ color: 'var(--text-secondary)' }}>
                        <code>{k}</code>: {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
