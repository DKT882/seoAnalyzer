import * as XLSX from 'xlsx';
import { SEOReport, CompetitorComparisonReport } from '@/types';

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

  // 8, 9, 10. Competitor sheets
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
  } else {
    // Default placeholder sheets when competitor analysis is not run
    const wsComp = XLSX.utils.aoa_to_sheet([['Notice', 'Competitor comparison data not attached to this report.']]);
    setCols(wsComp, [20, 60]);
    XLSX.utils.book_append_sheet(wb, wsComp, '8. Competitors');

    const wsGap = XLSX.utils.aoa_to_sheet([['Notice', 'Keyword gap analysis requires running a competitor comparison.']]);
    setCols(wsGap, [20, 60]);
    XLSX.utils.book_append_sheet(wb, wsGap, '9. Keyword Gap');

    const wsContentGap = XLSX.utils.aoa_to_sheet([['Notice', 'Content gap analysis requires running a competitor comparison.']]);
    setCols(wsContentGap, [20, 60]);
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

/**
 * Generates an expanded 28-sheet Excel workbook for whole-website crawl analyses.
 */
export function generateWebsiteExcelWorkbook(
  crawlReport: import('@/types').WebsiteCrawlReport
): Buffer {
  const firstPageReport = Object.values(crawlReport.pageReports)[0];
  const wb = XLSX.utils.book_new();

  // Helper to set column widths
  const setCols = (ws: XLSX.WorkSheet, colWidths: number[]) => {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  };

  let reportForSingleSheets = firstPageReport;
  if (!reportForSingleSheets && crawlReport.pages.length > 0) {
    const p0 = crawlReport.pages[0];
    reportForSingleSheets = {
      id: p0.id,
      url: p0.url,
      normalizedUrl: p0.url,
      timestamp: crawlReport.timestamp,
      durationMs: crawlReport.durationMs,
      scores: {
        overall: p0.overallScore,
        onPage: p0.onPageScore,
        technical: p0.technicalScore,
        content: p0.contentScore,
        links: p0.linksScore,
        mobile: 85,
      },
      onPage: {
        title: p0.title,
        titleLength: p0.title.length,
        metaDescription: p0.metaDescription || '',
        metaDescriptionLength: p0.metaDescription?.length || 0,
        canonicalUrl: p0.url,
        isCanonicalMatch: true,
        robotsMeta: p0.isIndexable ? 'index, follow' : 'noindex, follow',
        viewport: 'width=device-width',
        language: 'en',
        hreflang: [],
        ogTags: {},
        twitterTags: {},
        wordCount: p0.wordCount,
        readingTimeMinutes: Math.ceil(p0.wordCount / 200),
        textToHtmlRatio: 20,
        headings: {
          items: p0.h1 ? [{ level: 1, text: p0.h1 }] : [],
          h1Count: p0.h1 ? 1 : 0,
          h2Count: 0,
          h3Count: 0,
          h4Count: 0,
          h5Count: 0,
          h6Count: 0,
          hasMissingH1: !p0.h1,
          hasMultipleH1: false,
          hasSkippedLevels: false,
          issues: [],
        },
        paragraphsCount: Math.ceil(p0.wordCount / 50),
        listsCount: 1,
        tablesCount: 0,
      },
      technical: {
        httpStatus: p0.statusCode || 200,
        isHttps: p0.url.startsWith('https://'),
        isIndexable: p0.isIndexable,
        responseTimeMs: p0.responseTimeMs,
        pageSizeBytes: p0.wordCount * 10,
        redirectCount: 0,
        redirectChain: [],
        mobileViewportConfigured: true,
        contentType: 'text/html',
        charset: 'UTF-8',
        robotsAnalysis: { exists: true, url: '', status: 200, sitemaps: [], isBotAllowed: true, directivesCount: 1 },
        sitemapAnalysis: { exists: true, url: '', status: 200, totalUrls: crawlReport.pages.length, urlsSample: [], isIndex: false },
      },
      links: {
        totalLinks: crawlReport.overview.siteStructure.totalInternalLinks,
        internalLinksCount: crawlReport.overview.siteStructure.totalInternalLinks,
        externalLinksCount: crawlReport.overview.siteStructure.totalExternalLinks,
        nofollowCount: 0,
        internalLinks: [],
        externalLinks: [],
        brokenLinks: [],
        internalExternalRatio: 1,
      },
      images: {
        totalImages: crawlReport.overview.siteStructure.totalImages,
        withAlt: Math.max(0, crawlReport.overview.siteStructure.totalImages - crawlReport.overview.siteStructure.missingAltImagesCount),
        missingAlt: crawlReport.overview.siteStructure.missingAltImagesCount,
        altCoverageRatio: 90,
        images: [],
      },
      schemas: [],
      keywords: {
        all: [],
        primary: [],
        secondary: [],
        shortTail: [],
        longTail: [],
        related: [],
        questions: [],
        entities: [],
        clusters: [],
        opportunities: [],
        totalWords: p0.wordCount,
        uniqueWords: 200,
      },
      tagExplorer: {
        totalElementsCount: 10,
        metadata: [],
        headings: [],
        social: [],
        content: [],
        links: [],
        images: [],
        structuredData: [],
      },
      contentContribution: {
        overallContributionScore: p0.overallScore,
        sections: [],
        heatmap: [],
        strongestSection: 'Title',
        weakestSection: 'None',
        summary: 'Aggregated crawl overview',
      },
      issues: [],
      externalSeoDisclaimer: 'Disclaimer',
      dataSourceDisclosures: {
        categoryA: 'Directly Extracted',
        categoryB: 'External Data Unavailable',
        categoryC: 'Private Data Unauthorized',
      },
    };
  }

  // If we have a primary page report, build the initial 18 sheets
  if (reportForSingleSheets) {
    const singleBuf = generateExcelWorkbook(reportForSingleSheets);
    const tempWb = XLSX.read(singleBuf, { type: 'buffer' });
    for (const sheetName of tempWb.SheetNames) {
      XLSX.utils.book_append_sheet(wb, tempWb.Sheets[sheetName], sheetName);
    }
  }

  // 19. Sheet: Website Pages
  const pageRows = [
    ['URL', 'Status Code', 'Overall Score', 'On-Page', 'Technical', 'Content', 'Links', 'Word Count', 'Keywords Count', 'Title', 'H1', 'Indexable', 'Response Time (ms)', 'Issues'],
    ...crawlReport.pages.map((p) => [
      p.url,
      p.statusCode,
      p.overallScore,
      p.onPageScore,
      p.technicalScore,
      p.contentScore,
      p.linksScore,
      p.wordCount,
      p.keywordsCount,
      p.title,
      p.h1 || 'None',
      p.isIndexable ? 'Yes' : 'No',
      p.responseTimeMs,
      p.issuesCount,
    ]),
  ];
  const wsPages = XLSX.utils.aoa_to_sheet(pageRows);
  setCols(wsPages, [40, 12, 12, 10, 10, 10, 10, 12, 14, 30, 30, 10, 15, 10]);
  XLSX.utils.book_append_sheet(wb, wsPages, '19. Website Pages');

  // 20. Sheet: Site Keywords
  const siteKwRows = [
    ['Keyword', 'Occurrences', 'Pages Count', 'Average Score', 'Category', 'Topic Cluster', 'In Title (Pages)', 'In H1 (Pages)', 'In Meta (Pages)', 'In Body (Pages)', 'Internal Opportunity Score'],
    ...crawlReport.siteKeywords.map((k) => [
      k.keyword,
      k.occurrences,
      k.pagesCount,
      k.averageScore,
      k.category,
      k.topicCluster,
      k.placementCoverage.inTitleCount,
      k.placementCoverage.inH1Count,
      k.placementCoverage.inMetaCount,
      k.placementCoverage.inBodyCount,
      k.opportunityScore,
    ]),
  ];
  const wsSiteKws = XLSX.utils.aoa_to_sheet(siteKwRows);
  setCols(wsSiteKws, [30, 12, 12, 12, 15, 20, 14, 14, 14, 14, 20]);
  XLSX.utils.book_append_sheet(wb, wsSiteKws, '20. Site Keywords');

  // 21. Sheet: Keyword Strategy
  const stratRows = [
    ['Keyword', 'Category', 'Reason', 'Relationship to Primary', 'Current Website Coverage (%)', 'Recommended Page', 'Estimated Intent', 'Internal Opportunity Score', 'External Volume', 'External Difficulty'],
    ...crawlReport.keywordStrategy.keywords.map((k) => [
      k.keyword,
      k.category,
      k.reason,
      k.relationshipToPrimary,
      `${k.currentWebsiteCoverage}%`,
      k.recommendedPage || 'Site-wide',
      k.estimatedIntent,
      k.internalOpportunityScore,
      k.externalSearchVolume || 'Not Connected',
      k.externalDifficulty || 'Not Connected',
    ]),
  ];
  const wsStrat = XLSX.utils.aoa_to_sheet(stratRows);
  setCols(wsStrat, [30, 15, 45, 30, 20, 35, 15, 18, 18, 18]);
  XLSX.utils.book_append_sheet(wb, wsStrat, '21. Keyword Strategy');

  // 22. Sheet: Supporting Keywords
  const suppKeywords = crawlReport.keywordStrategy.keywords.filter((k) => k.category === 'supporting' || k.category === 'long-tail');
  const suppRows = [
    ['Supporting Keyword', 'Reason', 'Coverage (%)', 'Intent', 'Opportunity Score'],
    ...suppKeywords.map((k) => [k.keyword, k.reason, `${k.currentWebsiteCoverage}%`, k.estimatedIntent, k.internalOpportunityScore]),
  ];
  const wsSupp = XLSX.utils.aoa_to_sheet(suppRows);
  setCols(wsSupp, [30, 45, 15, 15, 18]);
  XLSX.utils.book_append_sheet(wb, wsSupp, '22. Supporting Keywords');

  // 23. Sheet: Keyword Opportunities
  const oppKeywords = crawlReport.keywordStrategy.keywords.filter((k) => k.internalOpportunityScore >= 60);
  const oppStrategyRows = [
    ['Opportunity Keyword', 'Category', 'Reason', 'Recommended Placement', 'Opportunity Score (0-100)'],
    ...oppKeywords.map((k) => [
      k.keyword,
      k.category,
      k.reason,
      k.placements.map((p) => `${p.location}: ${p.suggestion}`).join('; '),
      k.internalOpportunityScore,
    ]),
  ];
  const wsOppStrat = XLSX.utils.aoa_to_sheet(oppStrategyRows);
  setCols(wsOppStrat, [30, 15, 45, 50, 20]);
  XLSX.utils.book_append_sheet(wb, wsOppStrat, '23. Keyword Opportunities');

  // 24. Sheet: Keyword Clusters
  const clusterRows = [
    ['Cluster Name', 'Keyword Count', 'Average Score', 'Keywords Included'],
    ...crawlReport.keywordStrategy.clusters.map((c) => [
      c.name,
      c.keywords.length,
      c.averageScore,
      c.keywords.join(', '),
    ]),
  ];
  const wsClusters = XLSX.utils.aoa_to_sheet(clusterRows);
  setCols(wsClusters, [25, 15, 15, 65]);
  XLSX.utils.book_append_sheet(wb, wsClusters, '24. Keyword Clusters');

  // 25. Sheet: SEO Recommendations
  const siteRecRows = [
    ['Priority', 'Category', 'Recommendation Title', 'Affected URL', 'Impact', 'Effort', 'Quick Win', 'Recommended Action'],
    ...crawlReport.recommendations.all.map((r) => [
      r.priority,
      r.category,
      r.title,
      r.affectedUrl,
      r.impact,
      r.effort,
      r.quickWin ? 'Yes' : 'No',
      r.recommendedAction,
    ]),
  ];
  const wsSiteRecs = XLSX.utils.aoa_to_sheet(siteRecRows);
  setCols(wsSiteRecs, [12, 18, 35, 40, 40, 10, 10, 55]);
  XLSX.utils.book_append_sheet(wb, wsSiteRecs, '25. SEO Recommendations');

  // 26. Sheet: Content Strategy
  const contentStratRows = [
    ['Topic Type', 'Topic Name', 'Pages / Coverage', 'Details / Supporting Keywords'],
    ...crawlReport.contentStrategy.strongTopics.map((t) => ['Strong Topic', t.topic, `${t.pagesCount} pages (Score: ${t.coverageScore})`, t.topKeywords.join(', ')]),
    ...crawlReport.contentStrategy.weakTopics.map((t) => ['Weak Topic', t.topic, `${t.pagesCount} pages (Score: ${t.coverageScore})`, t.missingAspects.join('; ')]),
    ...crawlReport.contentStrategy.newPageOpportunities.map((o) => ['New Page Opportunity', o.suggestedTitle, `Topic: ${o.primaryTopic}`, `Supporting: ${o.supportingKeywords.join(', ')}`]),
  ];
  const wsContentStrat = XLSX.utils.aoa_to_sheet(contentStratRows);
  setCols(wsContentStrat, [22, 35, 30, 55]);
  XLSX.utils.book_append_sheet(wb, wsContentStrat, '26. Content Strategy');

  // 27. Sheet: Cannibalization
  const cannibalRows = [
    ['Keyword', 'Risk Level', 'Competing Pages Count', 'Competing URLs & Scores', 'Recommended Action'],
    ...crawlReport.cannibalization.map((c) => [
      c.keyword,
      c.riskLevel,
      c.competingPages.length,
      c.competingPages.map((p) => `${p.url} (Score: ${p.relevanceScore})`).join('; '),
      c.recommendedAction,
    ]),
  ];
  const wsCannibal = XLSX.utils.aoa_to_sheet(cannibalRows.length > 1 ? cannibalRows : [['Notice', 'No significant keyword cannibalization detected.']]);
  setCols(wsCannibal, [25, 12, 18, 60, 50]);
  XLSX.utils.book_append_sheet(wb, wsCannibal, '27. Cannibalization');

  // 28. Sheet: Duplicate Content Signals
  const dupRows = [
    ['Page A', 'Page B', 'Similarity Signal (%)', 'Shared Topics / Headings', 'Recommended Action'],
    ...crawlReport.contentDuplication.map((d) => [
      d.pageA.url,
      d.pageB.url,
      `${d.similarityScore}%`,
      d.sharedTopics.join(', '),
      d.recommendedAction,
    ]),
  ];
  const wsDup = XLSX.utils.aoa_to_sheet(dupRows.length > 1 ? dupRows : [['Notice', 'No substantial content duplication signals detected across pages.']]);
  setCols(wsDup, [35, 35, 15, 45, 50]);
  XLSX.utils.book_append_sheet(wb, wsDup, '28. Duplicate Content Signals');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

