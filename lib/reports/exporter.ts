import {
  SEOReport,
  CompetitorComparisonReport,
  WebsiteCrawlReport,
  KeywordItem,
} from '@/types';

export function exportToJson(report: SEOReport | CompetitorComparisonReport | WebsiteCrawlReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export function formatKeywordCsvRows(kws: KeywordItem[]): string {
  const headers = [
    'Keyword',
    'Category',
    'N-Gram Type',
    'Overall Score',
    'Frequency',
    'Density (%)',
    'Prominence Score',
    'In Title',
    'In H1',
    'In H2-H6',
    'In Meta',
    'In URL',
    'In Anchor',
    'In ALT',
    'External Search Volume',
    'External Difficulty',
  ];

  const rows = kws.map((k) => [
    escapeCsvField(k.keyword),
    escapeCsvField(k.category),
    escapeCsvField(k.nGramType),
    k.overallScore,
    k.frequency,
    k.density,
    k.prominenceScore,
    k.inTitle ? 'Yes' : 'No',
    k.inH1 ? 'Yes' : 'No',
    k.inH2H6 ? 'Yes' : 'No',
    k.inMeta ? 'Yes' : 'No',
    k.inUrl ? 'Yes' : 'No',
    k.inAnchor ? 'Yes' : 'No',
    k.inAlt ? 'Yes' : 'No',
    escapeCsvField(k.externalSearchVolume || 'Unavailable'),
    escapeCsvField(k.externalDifficulty || 'Unavailable'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportKeywordsToCsv(report: SEOReport): string {
  return formatKeywordCsvRows(report.keywords.all);
}

export function exportPrimaryKeywordsToCsv(report: SEOReport): string {
  return formatKeywordCsvRows(report.keywords.primary);
}

export function exportSecondaryKeywordsToCsv(report: SEOReport): string {
  return formatKeywordCsvRows(report.keywords.secondary);
}

export function exportShortTailKeywordsToCsv(report: SEOReport): string {
  return formatKeywordCsvRows(report.keywords.shortTail);
}

export function exportLongTailKeywordsToCsv(report: SEOReport): string {
  return formatKeywordCsvRows(report.keywords.longTail);
}

export function exportOpportunitiesToCsv(report: SEOReport): string {
  const headers = [
    'Keyword',
    'Keyword Type',
    'Word Count',
    'Frequency',
    'Density (%)',
    'Prominence Score',
    'Opportunity Score',
    'Difficulty Estimate',
    'Potential',
    'Target Placement',
    'Recommended Action',
  ];

  const rows = report.keywords.opportunities.map((o) => [
    escapeCsvField(o.keyword),
    escapeCsvField(o.keywordType),
    o.wordCount,
    o.frequency,
    o.density,
    o.prominenceScore,
    o.opportunityScore,
    escapeCsvField(o.difficultyEstimate),
    escapeCsvField(o.potential),
    escapeCsvField(o.targetPlacement),
    escapeCsvField(o.recommendedAction),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportIssuesToCsv(report: SEOReport): string {
  const headers = ['Severity', 'Category', 'Code', 'Title', 'Description', 'Why It Matters', 'Recommendation'];

  const rows = report.issues.map((i) => [
    escapeCsvField(i.severity),
    escapeCsvField(i.category),
    escapeCsvField(i.code),
    escapeCsvField(i.title),
    escapeCsvField(i.description),
    escapeCsvField(i.whyItMatters),
    escapeCsvField(i.recommendation),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportTagsToCsv(report: SEOReport): string {
  const headers = ['Category', 'Tag', 'Name', 'Value', 'Location', 'Count', 'SEO Relevance', 'Status', 'Recommendation'];
  const allTags = [
    ...report.tagExplorer.metadata,
    ...report.tagExplorer.headings,
    ...report.tagExplorer.social,
    ...report.tagExplorer.content,
    ...report.tagExplorer.links,
    ...report.tagExplorer.images,
    ...report.tagExplorer.structuredData,
  ];

  const rows = allTags.map((t) => [
    escapeCsvField(t.category),
    escapeCsvField(t.tag),
    escapeCsvField(t.name),
    escapeCsvField(t.value),
    escapeCsvField(t.location),
    t.count,
    escapeCsvField(t.seoRelevance),
    escapeCsvField(t.status),
    escapeCsvField(t.recommendation),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportLinksToCsv(report: SEOReport): string {
  const headers = ['Type', 'URL', 'Anchor Text', 'Is Nofollow', 'Status Code'];
  const rows = [
    ...report.links.internalLinks.map((l) => [
      'Internal',
      escapeCsvField(l.url),
      escapeCsvField(l.text || '(Empty Anchor)'),
      l.isNofollow ? 'Yes' : 'No',
      l.statusCode || 200,
    ]),
    ...report.links.externalLinks.map((l) => [
      'External',
      escapeCsvField(l.url),
      escapeCsvField(l.text || '(Empty Anchor)'),
      l.isNofollow ? 'Yes' : 'No',
      l.statusCode || 200,
    ]),
  ];

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportImagesToCsv(report: SEOReport): string {
  const headers = ['Source', 'ALT Text', 'Has ALT', 'Is Decorative', 'Width', 'Height', 'Loading'];
  const rows = report.images.images.map((img) => [
    escapeCsvField(img.src),
    escapeCsvField(img.alt || ''),
    img.hasAlt ? 'Yes' : 'No',
    img.isDecorative ? 'Yes' : 'No',
    img.width || '',
    img.height || '',
    escapeCsvField(img.loading || 'eager'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportCompetitorComparisonToCsv(compReport: CompetitorComparisonReport): string {
  const hostnames = [compReport.targetSummary.hostname + ' (Target)', ...compReport.competitorsSummaries.map((c) => c.hostname)];
  const headers = ['Metric', ...hostnames];

  const rows = [
    ['Overall Score', compReport.targetSummary.overallScore, ...compReport.competitorsSummaries.map((c) => c.overallScore)],
    ['On-Page Score', compReport.targetSummary.onPageScore, ...compReport.competitorsSummaries.map((c) => c.onPageScore)],
    ['Technical Score', compReport.targetSummary.technicalScore, ...compReport.competitorsSummaries.map((c) => c.technicalScore)],
    ['Content Score', compReport.targetSummary.contentScore, ...compReport.competitorsSummaries.map((c) => c.contentScore)],
    ['Word Count', compReport.targetSummary.wordCount, ...compReport.competitorsSummaries.map((c) => c.wordCount)],
    ['Heading Count', compReport.targetSummary.headingCount, ...compReport.competitorsSummaries.map((c) => c.headingCount)],
    ['Keyword Count', compReport.targetSummary.keywordCount, ...compReport.competitorsSummaries.map((c) => c.keywordCount)],
    ['Image Count', compReport.targetSummary.imageCount, ...compReport.competitorsSummaries.map((c) => c.imageCount)],
    ['ALT Coverage (%)', compReport.targetSummary.altCoverageRatio, ...compReport.competitorsSummaries.map((c) => c.altCoverageRatio)],
    ['Internal Links', compReport.targetSummary.internalLinksCount, ...compReport.competitorsSummaries.map((c) => c.internalLinksCount)],
    ['External Links', compReport.targetSummary.externalLinksCount, ...compReport.competitorsSummaries.map((c) => c.externalLinksCount)],
    ['Schema Types Count', compReport.targetSummary.schemaTypesCount, ...compReport.competitorsSummaries.map((c) => c.schemaTypesCount)],
  ];

  return [headers.map(escapeCsvField).join(','), ...rows.map((r) => r.map(escapeCsvField).join(','))].join('\n');
}

export function exportKeywordGapToCsv(compReport: CompetitorComparisonReport): string {
  const compHosts = compReport.competitorsSummaries.map((c) => c.hostname);
  const headers = ['Keyword', 'N-Gram', 'Target Freq', ...compHosts.map((h) => `${h} Freq`), 'Gap Type', 'Opportunity Score', 'Recommendation'];

  const rows = compReport.keywordGapMatrix.map((g) => [
    escapeCsvField(g.keyword),
    escapeCsvField(g.nGramType),
    g.targetFrequency,
    ...compHosts.map((h) => g.competitorFrequencies[h] || 0),
    escapeCsvField(g.gapType),
    g.opportunityScore,
    escapeCsvField(g.recommendation),
  ]);

  return [headers.map(escapeCsvField).join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportContentGapToCsv(compReport: CompetitorComparisonReport): string {
  const headers = ['Missing Topic', 'Competitor Source', 'Suggested Section', 'Priority', 'Reason'];
  const rows = compReport.contentGap.missingTopics.map((t) => [
    escapeCsvField(t.topic),
    escapeCsvField(t.competitorsCovering.join('; ')),
    escapeCsvField(t.suggestedSection),
    escapeCsvField(t.priority),
    escapeCsvField(t.reason),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generatePrintableHtml(report: SEOReport): string {
  const dateStr = escapeHtml(new Date(report.timestamp).toLocaleString());
  const safeUrl = escapeHtml(report.url);
  const criticalIssues = report.issues.filter((i) => i.severity === 'CRITICAL');
  const warnings = report.issues.filter((i) => i.severity === 'WARNING');
  const recommendations = report.issues.filter((i) => i.severity === 'RECOMMENDATION');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEO Analysis Report - ${safeUrl}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 2rem; max-width: 1000px; margin: 0 auto; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5rem; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem; }
    .score-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.5rem; display: flex; gap: 2rem; align-items: center; margin-bottom: 2rem; }
    .score-circle { font-size: 3rem; font-weight: 800; color: #4f46e5; }
    .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .table th, .table td { border: 1px solid #e2e8f0; padding: 0.6rem; text-align: left; font-size: 0.9rem; }
    .table th { background: #f1f5f9; font-weight: 600; }
    .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-recommendation { background: #e0e7ff; color: #3730a3; }
    .disclaimer { font-size: 0.8rem; color: #64748b; margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SEO Competitive Intelligence & Content Analysis Report</h1>
    <p><strong>Target URL:</strong> <a href="${safeUrl}">${safeUrl}</a></p>
    <p><strong>Generated:</strong> ${dateStr} | <strong>Execution Time:</strong> ${escapeHtml(report.durationMs)}ms</p>
  </div>

  <div class="score-box">
    <div class="score-circle">${escapeHtml(report.scores.overall)}/100</div>
    <div>
      <h3>Overall SEO Health Score</h3>
      <p>On-Page: <strong>${escapeHtml(report.scores.onPage)}/100</strong> | Technical: <strong>${escapeHtml(report.scores.technical)}/100</strong> | Content: <strong>${escapeHtml(report.scores.content)}/100</strong> | Links: <strong>${escapeHtml(report.scores.links)}/100</strong> | Mobile: <strong>${escapeHtml(report.scores.mobile)}/100</strong></p>
      <p>Content Signal Contribution: <strong>${escapeHtml(report.contentContribution.overallContributionScore)}/100</strong> (${escapeHtml(report.contentContribution.strongestSection)} leads)</p>
    </div>
  </div>

  <h2>Top Extracted Keywords & Opportunities</h2>
  <table class="table">
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Category</th>
        <th>Score</th>
        <th>Freq</th>
        <th>Density</th>
        <th>In Title</th>
        <th>In H1</th>
      </tr>
    </thead>
    <tbody>
      ${report.keywords.all.slice(0, 20).map((k) => `
        <tr>
          <td><strong>${escapeHtml(k.keyword)}</strong></td>
          <td>${escapeHtml(k.category)}</td>
          <td>${escapeHtml(k.overallScore)}</td>
          <td>${escapeHtml(k.frequency)}</td>
          <td>${escapeHtml(k.density)}%</td>
          <td>${k.inTitle ? '✓' : '-'}</td>
          <td>${k.inH1 ? '✓' : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Audits & Recommendations (${report.issues.length})</h2>
  ${criticalIssues.length > 0 ? `
    <h3>Critical Issues (${criticalIssues.length})</h3>
    ${criticalIssues.map((i) => `
      <div style="margin-bottom: 1rem; padding: 0.75rem; background: #fff1f2; border-left: 4px solid #e11d48;">
        <strong>${escapeHtml(i.title)}</strong>
        <p>${escapeHtml(i.description)}</p>
        <p><em>Fix:</em> ${escapeHtml(i.recommendation)}</p>
      </div>
    `).join('')}
  ` : ''}

  ${warnings.length > 0 ? `
    <h3>Warnings (${warnings.length})</h3>
    ${warnings.map((i) => `
      <div style="margin-bottom: 1rem; padding: 0.75rem; background: #fffbeb; border-left: 4px solid #f59e0b;">
        <strong>${escapeHtml(i.title)}</strong>
        <p>${escapeHtml(i.description)}</p>
        <p><em>Fix:</em> ${escapeHtml(i.recommendation)}</p>
      </div>
    `).join('')}
  ` : ''}

  <div class="disclaimer">
    <p><strong>Data Transparency:</strong> ${escapeHtml(report.dataSourceDisclosures.categoryA)}</p>
    <p>${escapeHtml(report.dataSourceDisclosures.categoryB)}</p>
    <p>${escapeHtml(report.dataSourceDisclosures.categoryC)}</p>
  </div>
</body>
</html>`;
}
