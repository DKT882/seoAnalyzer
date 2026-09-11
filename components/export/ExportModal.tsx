'use client';

import { useState } from 'react';
import { SEOReport } from '@/types';
import { apiClient } from '@/lib/api/apiClient';
import { X, FileJson, FileSpreadsheet, Printer, Download, Table } from 'lucide-react';

export interface ExportModalProps {
  report?: SEOReport;
  crawlReport?: import('@/types').WebsiteCrawlReport;
  onClose: () => void;
}

export function ExportModal({ report, crawlReport, onClose }: ExportModalProps) {
  const [selectedCsvType, setSelectedCsvType] = useState('keywords');

  const targetId = crawlReport?.id || report?.id || '';
  const targetUrl = crawlReport?.startUrl || report?.url || 'Report';

  const xlsxUrl = apiClient.getExportUrl(targetId, 'xlsx');
  const jsonUrl = apiClient.getExportUrl(targetId, 'json');
  const htmlUrl = apiClient.getExportUrl(targetId, 'html');
  const dynamicCsvUrl = apiClient.getExportUrl(targetId, 'csv', selectedCsvType);

  const handlePrint = () => {
    window.print();
  };

  const csvOptions = crawlReport
    ? [
        { id: 'keywords', label: 'All Site Keywords CSV' },
        { id: 'recommendations', label: 'SEO Recommendations CSV' },
        { id: 'pages', label: 'Website Crawled Pages CSV' },
        { id: 'opportunities', label: 'Ranking Opportunities CSV' },
        { id: 'cannibalization', label: 'Cannibalization Matrix CSV' },
      ]
    : [
        { id: 'keywords', label: 'All Keywords CSV' },
        { id: 'keywords-primary', label: 'Primary Keywords CSV' },
        { id: 'keywords-secondary', label: 'Secondary Keywords CSV' },
        { id: 'keywords-shorttail', label: 'Short-Tail Keywords CSV' },
        { id: 'keywords-longtail', label: 'Long-Tail Keywords CSV' },
        { id: 'opportunities', label: 'Ranking Opportunities CSV' },
        { id: 'tags', label: 'Tags & Page Elements CSV' },
        { id: 'issues', label: 'Technical SEO Issues CSV' },
        { id: 'links', label: 'Internal & External Links CSV' },
        { id: 'images', label: 'Images & ALT Coverage CSV' },
      ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '560px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Export SEO Intelligence Report
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Choose your preferred export format for "{targetUrl}".
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Professional XLSX Workbook */}
          <a
            href={xlsxUrl}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileSpreadsheet size={26} color="#10b981" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>
                  Complete Excel Workbook (.xlsx)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {crawlReport
                    ? '28 formatted sheets: Overview, Strategy, Recommendations, Pages, Cannibalization & Audits'
                    : '18 formatted sheets: Overview, Keywords, Gaps, Signals, Tags, Links, Images & Schemas'}
                </div>
              </div>
            </div>
            <Download size={20} color="#10b981" />
          </a>

          {/* Granular CSV Downloads */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Table size={20} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Download Specific CSV Dataset</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedCsvType}
                onChange={(e) => setSelectedCsvType(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                {csvOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <a
                href={dynamicCsvUrl}
                download
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Download size={14} /> Download CSV
              </a>
            </div>
          </div>

          {/* JSON Export */}
          <a
            href={jsonUrl}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileJson size={22} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Complete JSON Report</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Raw machine-readable analysis schema</div>
              </div>
            </div>
            <Download size={18} color="var(--primary)" />
          </a>

          {/* Standalone HTML Report */}
          <a
            href={htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Download size={22} color="var(--accent-purple)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Standalone HTML Report</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Self-contained shareable HTML report</div>
              </div>
            </div>
            <Download size={18} color="var(--accent-purple)" />
          </a>

          {/* Printable Layout */}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Printer size={22} color="var(--accent-cyan)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Print / Save as PDF</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Executive report presentation layout</div>
              </div>
            </div>
            <Printer size={18} color="var(--accent-cyan)" />
          </button>
        </div>
      </div>
    </div>
  );
}
