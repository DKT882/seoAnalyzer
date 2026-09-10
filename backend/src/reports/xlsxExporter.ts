import * as XLSX from 'xlsx';
import { SEOReport, CompetitorComparisonReport } from '@seo-analyzer/shared';

export function generateExcelWorkbook(
  report: SEOReport,
  competitorReport?: CompetitorComparisonReport
): Buffer {
  const wb = XLSX.utils.book_new();

  // Helper to set column widths
  const setCols = (ws: XLSX.WorkSheet, colWidths: number[]) => {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  };

  // 1. Sheet: Overview
  const overviewData = [
    ['SEO INTEL PRO — EXECUTIVE SUMMARY'],
    ['URL', report.url],
    ['Normalized URL', report.normalizedUrl],
    ['Timestamp', report.timestamp],
    ['Analysis Duration', `${report.durationMs} ms`],
    [],
    ['SEO HEALTH SCORES', 'Score (0-100)', 'Assessment'],
    ['Overall SEO Score', report.scores.overall, report.scores.overall >= 80 ? 'Optimal' : report.scores.overall >= 60 ? 'Moderate' : 'Needs Work'],
    ['On-Page Score', report.scores.onPage, report.scores.onPage >= 80 ? 'Optimal' : 'Needs Attention'],
    ['Technical Score', report.scores.technical, report.scores.technical >= 80 ? 'Optimal' : 'Needs Attention'],
    ['Content Score', report.scores.content, report.scores.content >= 80 ? 'Optimal' : 'Needs Attention'],
    ['Links Score', report.scores.links, report.scores.links >= 80 ? 'Optimal' : 'Needs Attention'],
    ['Mobile UX Score', report.scores.mobile, report.scores.mobile >= 80 ? 'Optimal' : 'Needs Attention'],
    [],
    ['CONTENT & STRUCTURAL METRICS', 'Value'],
    ['Word Count', report.onPage.wordCount],
    ['Reading Time', `${report.onPage.readingTimeMinutes} min`],
    ['Text-to-HTML Ratio', `${report.onPage.textToHtmlRatio}%`],
    ['Total Headings', report.onPage.headings.items.length],
    ['Total Links', report.links.totalLinks],
    ['Internal Links', report.links.internalLinksCount],
    ['External Links', report.links.externalLinksCount],
    ['Total Images', report.images.totalImages],
    ['Image ALT Coverage', `${Math.round(report.images.altCoverageRatio)}%`],
    ['Structured Data Schemas', report.schemas.length],
    ['Identified Issues', report.issues.length],
    [],
    ['DATA INTEGRITY NOTICE'],
    [report.externalSeoDisclaimer],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  setCols(wsOverview, [30, 45, 20]);
  XLSX.utils.book_append_sheet(wb, wsOverview, '1. Overview');

  // Helper for keyword rows
  const formatKwRows = (kws: typeof report.keywords.all) => [
    ['Keyword', 'Category', 'N-Gram', 'Score', 'Frequency', 'Density (%)', 'Prominence', 'In Title', 'In H1', 'In Meta', 'In URL', 'In ALT', 'External Volume', 'External Difficulty'],
    ...kws.map((k) => [
      k.keyword,
      k.category,
      k.nGramType,
      k.overallScore,
      k.frequency,
      `${k.density}%`,
      k.prominenceScore,
      k.inTitle ? 'Yes' : 'No',
      k.inH1 ? 'Yes' : 'No',
      k.inMeta ? 'Yes' : 'No',
      k.inUrl ? 'Yes' : 'No',
      k.inAlt ? 'Yes' : 'No',
      k.externalSearchVolume || 'Unavailable',
      k.externalDifficulty || 'Unavailable',
    ]),
  ];

  // 2. Sheet: Keywords (All)
  const wsAllKws = XLSX.utils.aoa_to_sheet(formatKwRows(report.keywords.all));
  setCols(wsAllKws, [30, 15, 12, 10, 12, 14, 14, 10, 10, 10, 10, 10, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsAllKws, '2. All Keywords');

  // 3. Sheet: Primary Keywords
  const wsPrimary = XLSX.utils.aoa_to_sheet(formatKwRows(report.keywords.primary));
  setCols(wsPrimary, [30, 15, 12, 10, 12, 14, 14, 10, 10, 10, 10, 10, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsPrimary, '3. Primary Keywords');

  // 4. Sheet: Secondary Keywords
  const wsSecondary = XLSX.utils.aoa_to_sheet(formatKwRows(report.keywords.secondary));
  setCols(wsSecondary, [30, 15, 12, 10, 12, 14, 14, 10, 10, 10, 10, 10, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsSecondary, '4. Secondary Keywords');

  // 5. Sheet: Short Tail
  const wsShortTail = XLSX.utils.aoa_to_sheet(formatKwRows(report.keywords.shortTail));
  setCols(wsShortTail, [30, 15, 12, 10, 12, 14, 14, 10, 10, 10, 10, 10, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsShortTail, '5. Short Tail');

  // 6. Sheet: Long Tail
  const wsLongTail = XLSX.utils.aoa_to_sheet(formatKwRows(report.keywords.longTail));
  setCols(wsLongTail, [30, 15, 12, 10, 12, 14, 14, 10, 10, 10, 10, 10, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsLongTail, '6. Long Tail');

  // 7. Sheet: Keyword Opportunities
  const oppRows = [
    ['Keyword', 'Category', 'Word Count', 'Frequency', 'Density (%)', 'Prominence', 'Opportunity Score', 'Difficulty Est.', 'Potential', 'Target Placement', 'Recommended Optimization Action'],
    ...report.keywords.opportunities.map((o) => [
      o.keyword,
      o.keywordType,
      o.wordCount,
      o.frequency,
      `${o.density}%`,
      o.prominenceScore,
      o.opportunityScore,
      o.difficultyEstimate,
      o.potential,
      o.targetPlacement,
      o.recommendedAction,
    ]),
  ];
  const wsOpp = XLSX.utils.aoa_to_sheet(oppRows);
  setCols(wsOpp, [28, 15, 12, 12, 12, 12, 18, 16, 12, 28, 60]);
  XLSX.utils.book_append_sheet(wb, wsOpp, '7. Opportunities');

  // 8, 9, 10. Competitor sheets (if available)
  if (competitorReport) {
    // 8. Competitors Overview
    const compOverviewData = [
      ['Metric', competitorReport.targetSummary.hostname + ' (Target)', ...competitorReport.competitorsSummaries.map((c) => c.hostname)],
      ['Overall SEO Score', competitorReport.targetSummary.overallScore, ...competitorReport.competitorsSummaries.map((c) => c.overallScore)],
      ['On-Page Score', competitorReport.targetSummary.onPageScore, ...competitorReport.competitorsSummaries.map((c) => c.onPageScore)],
      ['Technical Score', competitorReport.targetSummary.technicalScore, ...competitorReport.competitorsSummaries.map((c) => c.technicalScore)],
      ['Content Score', competitorReport.targetSummary.contentScore, ...competitorReport.competitorsSummaries.map((c) => c.contentScore)],
      ['Word Count', competitorReport.targetSummary.wordCount, ...competitorReport.competitorsSummaries.map((c) => c.wordCount)],
      ['Headings Count', competitorReport.targetSummary.headingCount, ...competitorReport.competitorsSummaries.map((c) => c.headingCount)],
      ['Keywords Count', competitorReport.targetSummary.keywordCount, ...competitorReport.competitorsSummaries.map((c) => c.keywordCount)],
      ['Images Count', competitorReport.targetSummary.imageCount, ...competitorReport.competitorsSummaries.map((c) => c.imageCount)],
      ['ALT Coverage (%)', `${Math.round(competitorReport.targetSummary.altCoverageRatio)}%`, ...competitorReport.competitorsSummaries.map((c) => `${Math.round(c.altCoverageRatio)}%`)],
      ['Internal Links', competitorReport.targetSummary.internalLinksCount, ...competitorReport.competitorsSummaries.map((c) => c.internalLinksCount)],
      ['External Links', competitorReport.targetSummary.externalLinksCount, ...competitorReport.competitorsSummaries.map((c) => c.externalLinksCount)],
      ['Schema Markup Count', competitorReport.targetSummary.schemaTypesCount, ...competitorReport.competitorsSummaries.map((c) => c.schemaTypesCount)],
    ];
    const wsComp = XLSX.utils.aoa_to_sheet(compOverviewData);
    setCols(wsComp, [25, 30, 30, 30, 30]);
    XLSX.utils.book_append_sheet(wb, wsComp, '8. Competitors');

    // 9. Keyword Gap
    const gapHeaders = ['Keyword', 'N-Gram', 'Target Freq', ...competitorReport.competitorsSummaries.map((c) => `${c.hostname} Freq`), 'Gap Type', 'Opportunity Score', 'Action Recommendation'];
    const gapRows = [
      gapHeaders,
      ...competitorReport.keywordGapMatrix.map((g) => [
        g.keyword,
        g.nGramType,
        g.targetFrequency,
        ...competitorReport.competitorsSummaries.map((c) => g.competitorFrequencies[c.hostname] || 0),
        g.gapType,
        g.opportunityScore,
        g.recommendation,
      ]),
    ];
    const wsGap = XLSX.utils.aoa_to_sheet(gapRows);
    setCols(wsGap, [28, 12, 14, 18, 18, 18, 20, 18, 50]);
    XLSX.utils.book_append_sheet(wb, wsGap, '9. Keyword Gap');

    // 10. Content Gap
    const contentGapRows = [
      ['Missing Topic', 'Competitor Source', 'Suggested Section', 'Priority', 'Reason / SEO Impact'],
      ...competitorReport.contentGap.missingTopics.map((t) => [
        t.topic,
        t.competitorsCovering.join(', '),
        t.suggestedSection,
        t.priority,
        t.reason,
      ]),
    ];
    const wsContentGap = XLSX.utils.aoa_to_sheet(contentGapRows);
    setCols(wsContentGap, [25, 25, 35, 12, 55]);
    XLSX.utils.book_append_sheet(wb, wsContentGap, '10. Content Gap');
  }

  // 11. Sheet: Content Contribution
  const contribRows = [
    ['Section Name', 'Weight Multiplier', 'Signal Score (0-100)', 'Keyword Coverage (%)', 'Primary KWs Count', 'Secondary KWs Count', 'Content Depth (Words)', 'Key Findings', 'Recommendation'],
    ...report.contentContribution.sections.map((s) => [
      s.sectionName,
      s.weight,
      s.signalScore,
      `${s.keywordCoverageRatio}%`,
      s.primaryKeywordCount,
      s.secondaryKeywordCount,
      s.contentDepthWordCount,
      s.findings.join(' | '),
      s.recommendations.join(' | ') || 'Section is optimal.',
    ]),
  ];
  const wsContrib = XLSX.utils.aoa_to_sheet(contribRows);
  setCols(wsContrib, [30, 18, 22, 22, 18, 20, 22, 45, 45]);
  XLSX.utils.book_append_sheet(wb, wsContrib, '11. Content Contribution');

  // 12. Sheet: Technical SEO
  const techRows = [
    ['Technical Audit Parameter', 'Value / Status', 'SEO Best Practice Requirement'],
    ['HTTP Status Code', report.technical.httpStatus, '200 OK'],
    ['HTTPS Encryption', report.technical.isHttps ? 'Enabled (Secure)' : 'Disabled (Insecure)', 'SSL/TLS Required'],
    ['Indexability', report.technical.isIndexable ? 'Indexable' : 'Blocked / Noindex', 'Must allow index/follow for organic visibility'],
    ['Response Time', `${report.technical.responseTimeMs} ms`, '< 500 ms optimal'],
    ['Page Size', `${Math.round(report.technical.pageSizeBytes / 1024)} KB`, '< 2000 KB recommended'],
    ['Redirect Count', report.technical.redirectCount, '0 redirects (Direct URL)'],
    ['Mobile Viewport', report.technical.mobileViewportConfigured ? 'Configured' : 'Missing', '<meta name="viewport"> required'],
    ['Robots.txt Exists', report.technical.robotsAnalysis.exists ? 'Yes' : 'No', 'robots.txt presence'],
    ['Sitemap.xml Exists', report.technical.sitemapAnalysis.exists ? 'Yes' : 'No', 'XML sitemap in robots.txt or root'],
  ];
  const wsTech = XLSX.utils.aoa_to_sheet(techRows);
  setCols(wsTech, [30, 30, 50]);
  XLSX.utils.book_append_sheet(wb, wsTech, '12. Technical SEO');

  // 13. Sheet: Tags & Metadata
  const allTagItems = [
    ...report.tagExplorer.metadata,
    ...report.tagExplorer.headings,
    ...report.tagExplorer.social,
    ...report.tagExplorer.content,
    ...report.tagExplorer.links,
    ...report.tagExplorer.images,
    ...report.tagExplorer.structuredData,
  ];
  const tagRows = [
    ['Category', 'Tag / Element', 'Name', 'Extracted Value / Preview', 'Location', 'Count', 'SEO Relevance', 'Status', 'Recommendation'],
    ...allTagItems.map((t) => [
      t.category,
      t.tag,
      t.name,
      t.value,
      t.location,
      t.count,
      t.seoRelevance,
      t.status,
      t.recommendation,
    ]),
  ];
  const wsTags = XLSX.utils.aoa_to_sheet(tagRows);
  setCols(wsTags, [16, 25, 25, 40, 15, 10, 15, 12, 50]);
  XLSX.utils.book_append_sheet(wb, wsTags, '13. Tags & Metadata');

  // 14. Sheet: Links
  const linkRows = [
    ['Type', 'URL / Target', 'Anchor Text', 'Nofollow', 'Status'],
    ...report.links.internalLinks.map((l) => ['Internal', l.url, l.text || '(Empty Anchor)', l.isNofollow ? 'Yes' : 'No', l.statusCode || 200]),
    ...report.links.externalLinks.map((l) => ['External', l.url, l.text || '(Empty Anchor)', l.isNofollow ? 'Yes' : 'No', l.statusCode || 200]),
  ];
  const wsLinks = XLSX.utils.aoa_to_sheet(linkRows);
  setCols(wsLinks, [12, 45, 30, 12, 10]);
  XLSX.utils.book_append_sheet(wb, wsLinks, '14. Links');

  // 15. Sheet: Images
  const imgRows = [
    ['Image Source', 'ALT Text', 'Has ALT', 'Decorative', 'Width', 'Height', 'Loading'],
    ...report.images.images.map((img) => [
      img.src,
      img.alt || '(Missing ALT)',
      img.hasAlt ? 'Yes' : 'No',
      img.isDecorative ? 'Yes' : 'No',
      img.width || 'Auto',
      img.height || 'Auto',
      img.loading || 'Eager',
    ]),
  ];
  const wsImgs = XLSX.utils.aoa_to_sheet(imgRows);
  setCols(wsImgs, [45, 35, 10, 12, 10, 10, 12]);
  XLSX.utils.book_append_sheet(wb, wsImgs, '15. Images');

  // 16. Sheet: Schema
  const schemaRows = [
    ['Schema Type', 'Valid JSON-LD', 'Preview / Properties'],
    ...report.schemas.map((s) => [s.type, s.isValid ? 'Yes' : 'No', s.rawJson.slice(0, 150)]),
  ];
  const wsSchema = XLSX.utils.aoa_to_sheet(schemaRows.length > 1 ? schemaRows : [['Notice', 'No JSON-LD schemas detected on target page.']]);
  setCols(wsSchema, [25, 15, 60]);
  XLSX.utils.book_append_sheet(wb, wsSchema, '16. Schema');

  // 17. Sheet: Recommendations
  const recRows = [
    ['Severity', 'Category', 'Issue Title', 'Description', 'Why It Matters', 'Recommended Fix Action'],
    ...report.issues.map((i) => [
      i.severity,
      i.category,
      i.title,
      i.description,
      i.whyItMatters,
      i.recommendation,
    ]),
  ];
  const wsRecs = XLSX.utils.aoa_to_sheet(recRows);
  setCols(wsRecs, [15, 15, 30, 45, 45, 55]);
  XLSX.utils.book_append_sheet(wb, wsRecs, '17. Recommendations');

  // 18. Sheet: External SEO Data
  const extDataRows = [
    ['DATA CATEGORY & SOURCE TRANSPARENCY'],
    [],
    ['Category A (Directly Extracted)', 'Status: COMPLETED (100% Extracted)', report.dataSourceDisclosures.categoryA],
    ['Category B (External SEO Data)', 'Status: UNAVAILABLE (No API Connected)', report.dataSourceDisclosures.categoryB],
    ['Category C (Private Owner Data)', 'Status: UNAUTHORIZED (Requires GSC/GA)', report.dataSourceDisclosures.categoryC],
    [],
    ['EXTERNAL METRICS BREAKDOWN', 'Current Value', 'Requirement'],
    ['Search Volume', 'External SEO data unavailable', 'Requires DataForSEO or Semrush API'],
    ['Keyword Difficulty', 'Requires SEO data provider', 'Requires DataForSEO or Semrush API'],
    ['Estimated Organic Traffic', 'External SEO data unavailable', 'Requires SEO provider or GSC auth'],
    ['External Backlink Count', 'External SEO data unavailable', 'Requires Ahrefs or Semrush API'],
    ['Domain Authority / Rating', 'External SEO data unavailable', 'Requires SEO API provider'],
    ['Google Search Console Clicks', 'Requires Google Search Console authorization', 'Requires verified domain ownership'],
    ['Google Search Console Impressions', 'Requires Google Search Console authorization', 'Requires verified domain ownership'],
  ];
  const wsExt = XLSX.utils.aoa_to_sheet(extDataRows);
  setCols(wsExt, [35, 40, 55]);
  XLSX.utils.book_append_sheet(wb, wsExt, '18. External SEO Data');

  // Return workbook buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
