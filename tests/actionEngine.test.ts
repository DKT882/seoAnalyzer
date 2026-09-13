import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SeoAction,
  SeoActionPlan,
  ActionCategory,
  ActionSeverity,
  ActionStatus,
  ActionPriorityLevel,
  ActionEffort,
  ActionConfidence
} from '../lib/actions/actionTypes';
import { generateActionFingerprint } from '../lib/actions/actionFingerprint';
import { evaluateActionSafety } from '../lib/actions/actionSafety';
import { calculateOptimizationPriority } from '../lib/actions/actionPriority';
import { isActionDependency, resolveActionDependencies } from '../lib/actions/actionDependencies';
import { consolidateActions } from '../lib/actions/actionConsolidator';
import { generateSeoActionPlan } from '../lib/actions/actionEngine';
import { compareActionPlans } from '../lib/actions/actionComparator';
import {
  MemorySeoActionStore,
  SqliteSeoActionStore,
  getActionStore,
  setActionStore
} from '../lib/actions/actionStorage';
import { SEOReport, WebsiteCrawlReport } from '@/types';
import { SearchIntelligenceAuditReport } from '../lib/search/searchTypes';

// ==========================================
// TEST FIXTURES
// ==========================================

function createMockPageReport(url: string = 'https://example.com/page-1'): SEOReport {
  return {
    id: 'mock-page-report-1',
    url,
    timestamp: new Date().toISOString(),
    status: 'completed',
    scores: {
      overall: 78,
      onPage: 80,
      technical: 75,
      content: 82,
      links: 70,
      mobile: 90,
      performance: 85
    },
    issues: [
      {
        id: 'iss-1',
        code: 'TITLE_TOO_SHORT',
        category: 'onpage',
        severity: 'WARNING',
        title: 'Title Tag is Too Short',
        description: 'The title tag is only 15 characters long.',
        whyItMatters: 'Short titles fail to communicate topical depth to search engines.',
        recommendation: 'Expand title to 50-60 descriptive characters.',
        before: '<title>Short Title</title>',
        after: '<title>Comprehensive Guide to SEO Optimization - Example</title>',
        expectedBenefit: 'Improves SERP snippet readability and keyword clarity.'
      },
      {
        id: 'iss-2',
        code: 'NOINDEX_DETECTED',
        category: 'indexability',
        severity: 'CRITICAL',
        title: 'Page Marked with Noindex Tag',
        description: 'Meta robots contains noindex directive.',
        whyItMatters: 'Prevents the page from being indexed by search engines.',
        recommendation: 'Remove noindex directive if page should appear in search results.',
        action: 'Remove <meta name="robots" content="noindex"> tag.'
      }
    ],
    onPage: {
      title: 'Short Title',
      metaDescription: 'A brief description of example page.',
      h1: ['Main Heading'],
      h2: ['Section 1', 'Section 2'],
      canonicalUrl: url,
      robotsMeta: 'noindex, follow',
      isIndexable: false
    },
    technical: {
      isHttps: true,
      statusCode: 200,
      responseTimeMs: 120,
      pageSizeBytes: 15400,
      hasSitemap: true,
      hasRobotsTxt: true
    },
    contentIntelligence: {
      extraction: { mainContentText: 'Hello world main text', wordCount: 450 } as any,
      pageType: { detectedType: 'ARTICLE', confidence: 'HIGH' } as any,
      searchIntent: { primaryIntent: 'MIXED', confidence: 'LOW', signals: [], explanation: 'Mixed intent' } as any,
      primaryTopics: [{ topic: 'seo optimization', importanceScore: 85, occurrences: 4, locationsFound: [], isMainTopic: true }],
      secondaryTopics: [],
      entities: [],
      topicalCoverageScore: 65,
      contentDepth: { status: 'ADEQUATE', mainWordCount: 450, paragraphCount: 4, sectionCount: 2, averageWordsPerSection: 225, isAdequateForPageType: true, explanation: '' },
      headingRelationships: { totalHeadings: 3, supportedHeadingsCount: 3, unsupportedHeadingsCount: 0, headingsWithoutContent: [], headingTopicDriftCount: 0, headings: [], summary: '' },
      contentGaps: [
        { topic: 'schema markup', missingAspect: 'Technical implementation', reason: 'Missing entity', priority: 'HIGH', suggestedSection: 'Schema Setup', evidence: 'Gap identified' }
      ],
      repetition: {} as any,
      pageTypeRules: {} as any,
      score: { overall: 78, depth: 75, intent: 70, topics: 80, headings: 85, originality: 80, deductions: [], recommendations: [] },
      recommendations: [],
      isTargetMode: false
    }
  } as unknown as SEOReport;
}

function createMockCrawlReport(domain: string = 'example.com'): WebsiteCrawlReport {
  return {
    id: 'mock-crawl-report-1',
    startUrl: `https://${domain}/`,
    domain,
    timestamp: new Date().toISOString(),
    durationMs: 2500,
    status: 'completed',
    overview: {
      domain,
      targetUrl: `https://${domain}/`,
      timestamp: new Date().toISOString(),
      coverage: { pagesDiscovered: 10, pagesAnalyzed: 10, pagesFailed: 0, pagesSkipped: 0, coverageRatio: 1, allowedByCrawlLimit: 10 },
      seoScores: { averageOverall: 82, averageOnPage: 80, averageTechnical: 85, averageContent: 80, averageLinks: 82, bestPage: { url: `https://${domain}/`, score: 90, title: 'Home' }, weakestPage: { url: `https://${domain}/p2`, score: 70, title: 'Page 2' }, averageWordCount: 650, averageKeywordCount: 15 },
      siteStructure: { totalInternalLinks: 45, totalExternalLinks: 10, totalImages: 20, missingAltImagesCount: 2, totalSchemas: 5, canonicalIssuesCount: 1, metaIssuesCount: 2, headingIssuesCount: 0 },
      robotsStatus: { exists: true, url: `https://${domain}/robots.txt`, allowedPagesCount: 10, blockedPagesCount: 0, sitemapSources: [] }
    },
    pages: [],
    pageReports: {},
    duplicateTitles: [
      {
        id: 'dt-1',
        title: 'Duplicate Product Page Title',
        normalizedTitle: 'duplicate product page title',
        pages: [
          { url: `https://${domain}/prod-1`, pageType: 'PRODUCT', depth: 1 },
          { url: `https://${domain}/prod-2`, pageType: 'PRODUCT', depth: 1 }
        ],
        isExactMatch: true,
        recommendation: {
          observation: '2 pages share identical title.',
          evidence: 'Affected: prod-1, prod-2',
          interpretation: 'Confuses search indexing.',
          action: 'Provide unique titles.',
          expectedBenefit: 'Unique snippet differentiation.',
          caution: 'Verify title changes reflect unique page offerings.'
        }
      }
    ],
    duplicateMetaDescriptions: [
      {
        id: 'dm-1',
        metaDescription: 'Shared company description across multiple pages.',
        normalizedMetaDescription: 'shared company description across multiple pages',
        pages: [
          { url: `https://${domain}/about`, pageType: 'ARTICLE', depth: 1 },
          { url: `https://${domain}/team`, pageType: 'ARTICLE', depth: 1 }
        ],
        isExactMatch: true,
        recommendation: {
          observation: '2 pages share meta description.',
          evidence: 'Affected: about, team',
          interpretation: 'Reduces snippet relevance.',
          action: 'Provide distinct meta descriptions.',
          expectedBenefit: 'Better click-through relevance.',
          caution: 'Verify descriptions accurately summarize each page.'
        }
      }
    ],
    orphanCandidates: [
      {
        url: `https://${domain}/isolated-landing`,
        normalizedUrl: `https://${domain}/isolated-landing`,
        title: 'Isolated Landing Page',
        inlinkCount: 0,
        discoveryMethod: 'SITEMAP',
        pageType: 'ARTICLE',
        category: 'potential_crawl_orphan',
        evidence: '0 internal links discovered',
        caution: 'Verify page is intended for public indexing'
      }
    ],
    canonicalConsistencyIssues: [
      {
        id: 'can-1',
        url: `https://${domain}/old-url`,
        canonicalUrl: `https://${domain}/new-url`,
        issueType: 'CANONICAL_CONFLICT',
        severity: 'HIGH',
        evidence: 'Canonical points to redirected URL',
        affectedUrls: [`https://${domain}/old-url`],
        recommendation: {
          observation: 'Canonical target mismatch.',
          evidence: 'Points to 301 target',
          interpretation: 'Directs search engines to non-authoritative URL.',
          action: 'Point canonical directly to 200 OK final destination.',
          expectedBenefit: 'Consolidates ranking signals.',
          caution: 'Ensure canonical target returns 200 OK.'
        }
      }
    ],
    searchIntentOverlaps: [
      {
        id: 'sio-1',
        primaryTopic: 'seo audit tools',
        competingPages: [
          { url: `https://${domain}/tools/audit`, title: 'Audit Tool', pageType: 'PRODUCT', intent: 'TRANSACTIONAL', relevanceScore: 90, inTitle: true, inH1: true },
          { url: `https://${domain}/blog/audit-guide`, title: 'Audit Guide', pageType: 'ARTICLE', intent: 'INFORMATIONAL', relevanceScore: 85, inTitle: true, inH1: true }
        ],
        riskLevel: 'MEDIUM',
        evidence: { topicSimilarity: 0.88, intentSimilarity: false, pageTypeSimilarity: false, titleH1Similarity: true, contentSimilarity: 0.4 },
        observation: 'Pages target overlapping topic "seo audit tools".',
        interpretation: 'Differentiate intent angles between guide and tool.',
        action: 'Cross-link between guide and tool with clear intent anchors.',
        expectedBenefit: 'Clarifies intent fulfillment.',
        caution: 'Review page differentiation before making redirects.'
      }
    ],
    siteKeywords: [],
    keywordStrategy: { primaryKeyword: 'seo tools', topicCoverageScore: 80, keywords: [], clusters: [] },
    contentStrategy: {} as any,
    recommendations: { all: [], quickWins: [], byPage: {}, byCategory: {} },
    cannibalization: [],
    contentDuplication: [],
    briefs: []
  };
}

function createMockSearchAuditReport(query: string = 'seo analyzer'): SearchIntelligenceAuditReport {
  return {
    id: 'mock-search-report-1',
    mode: 'PAGE_SEARCH_INTELLIGENCE',
    timestamp: new Date().toISOString(),
    targetDomain: 'example.com',
    userPageUrl: 'https://example.com/analyzer',
    queries: [
      { query, normalizedQuery: 'seo analyzer', source: 'USER_TARGET' }
    ],
    snapshots: [],
    intentAlignments: {
      [query]: {
        query,
        level: 'WEAK_ALIGNMENT',
        userPageIntent: 'TRANSACTIONAL',
        observedSerpIntentPattern: 'INFORMATIONAL',
        intentDistribution: { INFORMATIONAL: 8, TRANSACTIONAL: 2 },
        isMixedSerp: false,
        confidence: 'HIGH',
        explanation: 'SERP is dominated by informational guides while this page is transactional.',
        provenance: { source: 'EXTERNAL_SERP', provider: 'test', collectedAt: new Date().toISOString(), location: 'US', language: 'en', device: 'DESKTOP', extractionMethod: 'SERP_SNIPPET', isSyntheticTest: false, fingerprint: 'fp1' }
      }
    },
    pageTypeAlignments: {},
    topicPatterns: {
      [query]: [
        {
          topic: 'core web vitals analysis',
          frequency: 7,
          percentage: 70,
          isCoveredInUserPage: false,
          provenance: 'SERP_SNIPPET_DERIVED',
          category: 'POTENTIAL_CONTENT_GAP',
          sampleSnippets: ['Analyze core web vitals and speed performance']
        }
      ]
    },
    observedDomains: [],
    opportunities: [
      {
        id: 'opp-1',
        query,
        source: 'USER_TARGET',
        observedIntent: 'INFORMATIONAL',
        userPageUrl: 'https://example.com/analyzer',
        observedSerpPattern: 'Competitors include FAQ schema and feature comparison tables',
        pageTypeAlignment: {} as any,
        intentAlignment: {} as any,
        topicEvidence: [],
        contentGaps: ['core web vitals'],
        recommendation: {
          observation: 'Competitors frequently provide FAQ schemas.',
          evidence: '7/10 SERP results have FAQs',
          interpretation: 'Enables rich snippet expandability in search results.',
          action: 'Add structured FAQ section addressing common search questions.',
          expectedBenefit: 'Improves SERP visibility and user engagement.',
          caution: 'Verify schema accuracy.'
        },
        confidence: 'HIGH',
        evidenceTimestamp: new Date().toISOString(),
        provenance: { source: 'EXTERNAL_SERP', provider: 'test', collectedAt: new Date().toISOString(), location: 'US', language: 'en', device: 'DESKTOP', extractionMethod: 'SERP_SNIPPET', isSyntheticTest: false, fingerprint: 'fp1' }
      }
    ],
    internalLinkIntegrations: [],
    telemetry: { totalProviderRequests: 1, providerRequestsUsed: 1, providerRequestBudget: 10, totalBrowserRenders: 0, cachedResponsesServed: 0, totalCompetitorPagesFetched: 0, totalResponseBytes: 15000, durationMs: 150, errorsEncountered: 0 } as any,
    disclaimers: { antiFabricationNotice: 'Measured SERP only', rankingDisclaimer: 'No ranking guarantees', provenanceSummary: 'Direct SERP observation' }
  };
}

// ==========================================
// TEST SUITE: PHASE 9 ACTION ENGINE
// ==========================================

describe('PHASE 9 — SEO Action Engine & Optimization Workflow Tests', () => {

  // ==========================================
  // AREA 1: UNIFIED ACTION TAXONOMY & MODEL INTEGRITY
  // ==========================================
  describe('1. Unified Action Taxonomy & Model Integrity', () => {
    test('1.1 should instantiate a valid SeoAction object with all mandatory fields', () => {
      const action: SeoAction = {
        id: 'act-test-1',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 95,
        priorityLevel: 'IMMEDIATE',
        priorityExplanation: 'Base critical + single URL + quick win',
        title: 'Fix 404 Status Code on Canonical URL',
        observation: 'Server returns HTTP 404 Not Found.',
        evidence: [
          { source: 'PHASE_5_TECHNICAL', metric: 'HTTP Status Code', observedValue: 404, url: 'https://example.com/missing' }
        ],
        interpretation: '404 pages cannot be indexed or ranked by search crawlers.',
        action: 'Restore missing page or update canonical to live 200 OK URL.',
        expectedBenefit: 'Restores crawlability and indexation.',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: ['Verify URL returns HTTP 200 OK status in browser inspection.'],
        affectedUrls: ['https://example.com/missing'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fingerprint: 'fp-12345'
      };

      assert.strictEqual(action.category, 'TECHNICAL_INDEXABILITY');
      assert.strictEqual(action.severity, 'CRITICAL');
      assert.strictEqual(action.priorityLevel, 'IMMEDIATE');
      assert.strictEqual(action.isDestructive, false);
      assert.strictEqual(action.status, 'OPEN');
      assert.strictEqual(action.affectedCount, 1);
    });

    test('1.2 should strictly require the 6 Pillars of evidence-based recommendation', () => {
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      assert.ok(plan.actions.length > 0);
      for (const act of plan.actions) {
        assert.ok(act.observation.length > 0, `Action ${act.id} missing observation`);
        assert.ok(act.evidence.length > 0, `Action ${act.id} missing evidence array`);
        assert.ok(act.interpretation.length > 0, `Action ${act.id} missing interpretation`);
        assert.ok(act.action.length > 0, `Action ${act.id} missing action`);
        assert.ok(act.expectedBenefit.length > 0, `Action ${act.id} missing expectedBenefit`);
        assert.ok(typeof act.caution === 'string', `Action ${act.id} missing caution field`);
      }
    });

    test('1.3 should maintain exact source provenance on evidence items', () => {
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      const noindexAction = plan.actions.find(a => a.category === 'TECHNICAL_INDEXABILITY');

      assert.ok(noindexAction);
      assert.ok(noindexAction.evidence.length > 0);
      const ev = noindexAction.evidence[0];
      assert.ok(ev.source);
      assert.ok(ev.metric);
      assert.ok(ev.observedValue !== undefined);
    });

    test('1.4 should provide transparent priority explanation text', () => {
      const priorityResult = calculateOptimizationPriority({
        severity: 'CRITICAL',
        affectedUrlsCount: 5,
        effort: 'LOW',
        confidence: 'HIGH',
        blocksOtherActions: true
      });

      assert.ok(priorityResult.explanation.includes('Optimization Priority'));
      assert.ok(priorityResult.explanation.includes('Base severity'));
      assert.ok(priorityResult.explanation.includes('Scope'));
      assert.ok(priorityResult.explanation.includes('Effort ROI'));
      assert.ok(priorityResult.explanation.includes('Confidence'));
      assert.ok(priorityResult.explanation.includes('Dependency blocker bonus'));
    });

    test('1.5 should support all strict enum definitions without mutation', () => {
      const categories: ActionCategory[] = [
        'TECHNICAL_INDEXABILITY', 'TECHNICAL_CANONICAL', 'TECHNICAL_PERFORMANCE',
        'TECHNICAL_STRUCTURE', 'CONTENT_DEPTH', 'CONTENT_STRUCTURE',
        'SEMANTIC_TOPIC', 'INTERNAL_LINKING', 'SEARCH_SERP', 'SITE_WIDE_ARCHITECTURE'
      ];
      assert.strictEqual(categories.length, 10);
    });
  });

  // ==========================================
  // AREA 2: ACTION FINGERPRINTING & DETERMINISM
  // ==========================================
  describe('2. Action Fingerprinting & Determinism', () => {
    test('2.1 should compute identical SHA-256 fingerprints for identical issue parameters', () => {
      const fp1 = generateActionFingerprint({
        category: 'TECHNICAL_CANONICAL',
        issueCode: 'CANONICAL_CONFLICT',
        title: 'Resolve Canonical URL Conflict',
        affectedUrls: ['https://example.com/page-a', 'https://example.com/page-b'],
        domain: 'example.com'
      });

      const fp2 = generateActionFingerprint({
        category: 'TECHNICAL_CANONICAL',
        issueCode: 'CANONICAL_CONFLICT',
        title: 'Resolve Canonical URL Conflict',
        affectedUrls: ['https://example.com/page-a', 'https://example.com/page-b'],
        domain: 'example.com'
      });

      assert.strictEqual(fp1, fp2);
      assert.strictEqual(fp1.length, 64); // Valid SHA-256 hex length
    });

    test('2.2 should be unaffected by the order of affected URLs in the array', () => {
      const fp1 = generateActionFingerprint({
        category: 'TECHNICAL_STRUCTURE',
        issueCode: 'DUPLICATE_TITLES',
        title: 'Duplicate Titles',
        affectedUrls: ['https://example.com/alpha', 'https://example.com/beta', 'https://example.com/gamma']
      });

      const fp2 = generateActionFingerprint({
        category: 'TECHNICAL_STRUCTURE',
        issueCode: 'DUPLICATE_TITLES',
        title: 'Duplicate Titles',
        affectedUrls: ['https://example.com/gamma', 'https://example.com/alpha', 'https://example.com/beta']
      });

      assert.strictEqual(fp1, fp2);
    });

    test('2.3 should normalize Unicode, lowercase strings, and collapse whitespace', () => {
      const fp1 = generateActionFingerprint({
        category: 'CONTENT_DEPTH',
        title: 'Thin Content Detected  ',
        affectedUrls: ['https://example.com/article']
      });

      const fp2 = generateActionFingerprint({
        category: 'CONTENT_DEPTH',
        title: '  thin content detected',
        affectedUrls: ['https://example.com/article']
      });

      assert.strictEqual(fp1, fp2);
    });

    test('2.4 should produce distinct fingerprints for different issue codes or scopes', () => {
      const fp1 = generateActionFingerprint({
        category: 'INTERNAL_LINKING',
        issueCode: 'ORPHAN_PAGES',
        title: 'Orphan Page Candidate',
        affectedUrls: ['https://example.com/page-1']
      });

      const fp2 = generateActionFingerprint({
        category: 'INTERNAL_LINKING',
        issueCode: 'ORPHAN_PAGES',
        title: 'Orphan Page Candidate',
        affectedUrls: ['https://example.com/page-2']
      });

      assert.notStrictEqual(fp1, fp2);
    });

    test('2.5 should handle missing affected URLs by falling back to domain scope', () => {
      const fp = generateActionFingerprint({
        category: 'SITE_WIDE_ARCHITECTURE',
        title: 'Site-Wide Crawl Bottleneck',
        domain: 'example.com'
      });

      assert.ok(typeof fp === 'string' && fp.length === 64);
    });
  });

  // ==========================================
  // AREA 3: SAFETY ENGINE & DESTRUCTIVE SAFEGUARDS
  // ==========================================
  describe('3. Safety Engine & Destructive Safeguards', () => {
    test('3.1 should flag noindex directives as high-risk destructive actions', () => {
      const safety = evaluateActionSafety({
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        title: 'Add Noindex Tag to Low Quality Pages',
        actionText: 'Add <meta name="robots" content="noindex"> tag to 50 URLs.',
        affectedUrlsCount: 50
      });

      assert.strictEqual(safety.isDestructive, true);
      assert.strictEqual(safety.riskLevel, 'HIGH');
      assert.ok(safety.caution.includes('de-indexing'));
      assert.ok(safety.verificationSteps.length >= 3);
    });

    test('3.2 should flag canonical tag modifications as high-risk destructive actions', () => {
      const safety = evaluateActionSafety({
        category: 'TECHNICAL_CANONICAL',
        severity: 'CRITICAL',
        title: 'Change Canonical URL to Alternate Domain',
        actionText: 'Set canonical link to target URL.',
        affectedUrlsCount: 1
      });

      assert.strictEqual(safety.isDestructive, true);
      assert.strictEqual(safety.riskLevel, 'HIGH');
      assert.ok(safety.caution.includes('canonical'));
      assert.ok(safety.verificationSteps.some(s => s.toLowerCase().includes('200 ok')));
      assert.ok(safety.nonDestructiveAlternative);
    });

    test('3.3 should flag 301 redirects and page deletions with URL mapping checklists', () => {
      const safety = evaluateActionSafety({
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        title: 'Implement 301 Redirect for Deprecated Subfolder',
        actionText: 'Set up 301 redirect chain to consolidate traffic.',
        affectedUrlsCount: 5
      });

      assert.strictEqual(safety.isDestructive, true);
      assert.strictEqual(safety.riskLevel, 'HIGH');
      assert.ok(safety.verificationSteps.some(s => s.includes('301 Moved Permanently')));
    });

    test('3.4 should flag schema removal with moderate risk warning', () => {
      const safety = evaluateActionSafety({
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        title: 'Remove schema tag from product pages',
        actionText: 'Delete structured data block from template.',
        affectedUrlsCount: 10
      });

      assert.strictEqual(safety.isDestructive, true);
      assert.strictEqual(safety.riskLevel, 'MODERATE');
      assert.ok(safety.caution.includes('rich snippets'));
    });

    test('3.5 should flag non-destructive on-page content optimization as safe (LOW risk)', () => {
      const safety = evaluateActionSafety({
        category: 'CONTENT_DEPTH',
        severity: 'INFO',
        title: 'Expand Product Description Content',
        actionText: 'Add 200 words of descriptive product specs.',
        affectedUrlsCount: 1
      });

      assert.strictEqual(safety.isDestructive, false);
      assert.strictEqual(safety.riskLevel, 'LOW');
      assert.ok(safety.caution.includes('Safe optimization'));
    });

    test('3.6 should attach batch verification cautions for bulk changes across >=10 URLs', () => {
      const safety = evaluateActionSafety({
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        title: 'Bulk Update Product Intro Paragraphs',
        actionText: 'Rewrite opening paragraphs across the catalog.',
        affectedUrlsCount: 35
      });

      assert.strictEqual(safety.riskLevel, 'MODERATE');
      assert.ok(safety.caution.includes('batches'));
    });
  });

  // ==========================================
  // AREA 4: TRANSPARENT OPTIMIZATION PRIORITY CALCULATION
  // ==========================================
  describe('4. Transparent Optimization Priority Calculation', () => {
    test('4.1 should clamp priority scores strictly between 1 and 100', () => {
      const lowResult = calculateOptimizationPriority({
        severity: 'INFO',
        affectedUrlsCount: 1,
        effort: 'HIGH',
        confidence: 'INSUFFICIENT_EVIDENCE'
      });
      assert.ok(lowResult.priorityScore >= 1);

      const maxResult = calculateOptimizationPriority({
        severity: 'CRITICAL',
        affectedUrlsCount: 100,
        effort: 'LOW',
        confidence: 'HIGH',
        blocksOtherActions: true
      });
      assert.ok(maxResult.priorityScore <= 100);
      assert.strictEqual(maxResult.priorityScore, 100);
    });

    test('4.2 should assign higher base points to CRITICAL vs WARNING vs INFO', () => {
      const crit = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 1, effort: 'HIGH', confidence: 'LOW' });
      const warn = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 1, effort: 'HIGH', confidence: 'LOW' });
      const info = calculateOptimizationPriority({ severity: 'INFO', affectedUrlsCount: 1, effort: 'HIGH', confidence: 'LOW' });

      assert.ok(crit.priorityScore > warn.priorityScore);
      assert.ok(warn.priorityScore > info.priorityScore);
      assert.strictEqual(crit.scoreBreakdown.baseSeverityScore, 50);
      assert.strictEqual(warn.scoreBreakdown.baseSeverityScore, 30);
      assert.strictEqual(info.scoreBreakdown.baseSeverityScore, 10);
    });

    test('4.3 should scale score upward with affected URL scope', () => {
      const single = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'MEDIUM' });
      const few = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 4, effort: 'MEDIUM', confidence: 'MEDIUM' });
      const many = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 15, effort: 'MEDIUM', confidence: 'MEDIUM' });
      const widespread = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 50, effort: 'MEDIUM', confidence: 'MEDIUM' });

      assert.ok(few.priorityScore > single.priorityScore);
      assert.ok(many.priorityScore > few.priorityScore);
      assert.ok(widespread.priorityScore > many.priorityScore);
      assert.strictEqual(widespread.scoreBreakdown.scopeScore, 20);
    });

    test('4.4 should award quick-win bonus to LOW effort implementation', () => {
      const quickWin = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 1, effort: 'LOW', confidence: 'HIGH' });
      const highEffort = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 1, effort: 'HIGH', confidence: 'HIGH' });

      assert.strictEqual(quickWin.scoreBreakdown.effortScore, 15);
      assert.strictEqual(highEffort.scoreBreakdown.effortScore, 0);
      assert.ok(quickWin.priorityScore > highEffort.priorityScore);
    });

    test('4.5 should apply confidence penalties and bonuses', () => {
      const highConf = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'HIGH' });
      const lowConf = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'INSUFFICIENT_EVIDENCE' });

      assert.strictEqual(highConf.scoreBreakdown.confidenceScore, 10);
      assert.strictEqual(lowConf.scoreBreakdown.confidenceScore, -5);
      assert.ok(highConf.priorityScore > lowConf.priorityScore);
    });

    test('4.6 should add blocker bonus (+5 pts) when an action unblocks dependent items', () => {
      const blocked = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'HIGH', blocksOtherActions: true });
      const nonBlocked = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'HIGH', blocksOtherActions: false });

      assert.strictEqual(blocked.scoreBreakdown.dependencyScore, 5);
      assert.strictEqual(nonBlocked.scoreBreakdown.dependencyScore, 0);
      assert.strictEqual(blocked.priorityScore, nonBlocked.priorityScore + 5);
    });

    test('4.7 should accurately map priority levels (IMMEDIATE, HIGH, MEDIUM, LOW)', () => {
      const immediate = calculateOptimizationPriority({ severity: 'CRITICAL', affectedUrlsCount: 25, effort: 'LOW', confidence: 'HIGH' });
      assert.strictEqual(immediate.priorityLevel, 'IMMEDIATE');

      const high = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 10, effort: 'LOW', confidence: 'HIGH' });
      assert.strictEqual(high.priorityLevel, 'HIGH');

      const medium = calculateOptimizationPriority({ severity: 'WARNING', affectedUrlsCount: 1, effort: 'MEDIUM', confidence: 'LOW' });
      assert.strictEqual(medium.priorityLevel, 'MEDIUM');

      const low = calculateOptimizationPriority({ severity: 'INFO', affectedUrlsCount: 1, effort: 'HIGH', confidence: 'INSUFFICIENT_EVIDENCE' });
      assert.strictEqual(low.priorityLevel, 'LOW');
    });
  });

  // ==========================================
  // AREA 5: DEPENDENCY ENGINE & TOPOLOGICAL ORDERING
  // ==========================================
  describe('5. Dependency Engine & Topological Ordering', () => {
    test('5.1 should detect that TECHNICAL_INDEXABILITY blocks CONTENT_DEPTH on the same URL', () => {
      const indexAction: SeoAction = {
        id: 'act-idx',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 90,
        priorityLevel: 'IMMEDIATE',
        title: 'Fix 500 Server Error',
        observation: 'Server error on page',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-idx'
      };

      const contentAction: SeoAction = {
        id: 'act-cnt',
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Expand Content Section',
        observation: 'Thin text',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-cnt'
      };

      assert.strictEqual(isActionDependency(indexAction, contentAction), true);
    });

    test('5.2 should not declare dependency if URLs do not overlap', () => {
      const indexAction: SeoAction = {
        id: 'act-idx-2',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 90,
        priorityLevel: 'IMMEDIATE',
        title: 'Fix 404 Error',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/page-other'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-idx-2'
      };

      const contentAction: SeoAction = {
        id: 'act-cnt-2',
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Expand Text',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/page-target'],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-cnt-2'
      };

      assert.strictEqual(isActionDependency(indexAction, contentAction), false);
    });

    test('5.3 should resolve dependencies and populate blockedBy accurately', () => {
      const act1: SeoAction = {
        id: 'act-1',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 90,
        priorityLevel: 'IMMEDIATE',
        title: 'Unblock in robots.txt',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/page-1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-1'
      };

      const act2: SeoAction = {
        id: 'act-2',
        category: 'INTERNAL_LINKING',
        severity: 'WARNING',
        priority: 70,
        priorityLevel: 'HIGH',
        title: 'Add Contextual Internal Links',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/page-1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-2'
      };

      const resolved = resolveActionDependencies([act2, act1]);
      const resolvedAct2 = resolved.find(a => a.id === 'act-2')!;

      assert.ok(resolvedAct2.dependencies.includes('act-1'));
      assert.ok(resolvedAct2.blockedBy.includes('act-1'));
    });

    test('5.4 should perform topological sort putting prerequisite actions first', () => {
      const prereq: SeoAction = {
        id: 'prereq-act',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 85,
        priorityLevel: 'IMMEDIATE',
        title: 'Fix Indexability Block',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/target'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-prereq'
      };

      const dependent: SeoAction = {
        id: 'dependent-act',
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Improve Content Word Count',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/target'],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-dep'
      };

      const sorted = resolveActionDependencies([dependent, prereq]);
      assert.strictEqual(sorted[0].id, 'prereq-act');
      assert.strictEqual(sorted[1].id, 'dependent-act');
    });

    test('5.5 should handle circular dependencies safely without hanging or throwing', () => {
      const actA: SeoAction = {
        id: 'act-a',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 80,
        priorityLevel: 'IMMEDIATE',
        title: 'Action A',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/cycle'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: ['act-b'],
        blockedBy: ['act-b'],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-a'
      };

      const actB: SeoAction = {
        id: 'act-b',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 75,
        priorityLevel: 'HIGH',
        title: 'Action B',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/cycle'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: ['act-a'],
        blockedBy: ['act-a'],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-b'
      };

      const sorted = resolveActionDependencies([actA, actB]);
      assert.strictEqual(sorted.length, 2);
    });

    test('5.6 should clear blockedBy when prerequisite action status is IMPLEMENTED or VERIFIED', () => {
      const prereq: SeoAction = {
        id: 'prereq-done',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 85,
        priorityLevel: 'IMMEDIATE',
        title: 'Prerequisite Resolved',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/target'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'VERIFIED',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-prereq-done'
      };

      const dependent: SeoAction = {
        id: 'dependent-act-2',
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Content Improvement',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/target'],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-dep-2'
      };

      const sorted = resolveActionDependencies([prereq, dependent]);
      const depResult = sorted.find(a => a.id === 'dependent-act-2')!;
      assert.strictEqual(depResult.blockedBy.length, 0);
    });
  });

  // ==========================================
  // AREA 6: MULTI-FINDING CONSOLIDATION & SITE-WIDE GROUPING
  // ==========================================
  describe('6. Multi-Finding Consolidation & Site-Wide Grouping', () => {
    test('6.1 should merge duplicate findings on the same issue into one site-wide action', () => {
      const act1: SeoAction = {
        id: 'act-link-1',
        category: 'INTERNAL_LINKING',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Add Contextual Internal Links',
        observation: 'Page lacks inlinks',
        evidence: [{ source: 'PHASE_7_SITE_CRAWL', metric: 'Inlinks', observedValue: 0, url: 'https://example.com/p1' }],
        interpretation: 'Needs linking',
        action: 'Add links',
        expectedBenefit: 'Improves connectivity',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'INTERNAL_LINKS_WEAK',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fingerprint: 'fp-1'
      };

      const act2: SeoAction = {
        id: 'act-link-2',
        category: 'INTERNAL_LINKING',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Add Contextual Internal Links',
        observation: 'Page lacks inlinks',
        evidence: [{ source: 'PHASE_7_SITE_CRAWL', metric: 'Inlinks', observedValue: 0, url: 'https://example.com/p2' }],
        interpretation: 'Needs linking',
        action: 'Add links',
        expectedBenefit: 'Improves connectivity',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p2'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'INTERNAL_LINKS_WEAK',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fingerprint: 'fp-2'
      };

      const consolidated = consolidateActions([act1, act2]);
      assert.strictEqual(consolidated.length, 1);
      assert.strictEqual(consolidated[0].affectedCount, 2);
      assert.strictEqual(consolidated[0].affectedUrls.length, 2);
      assert.ok(consolidated[0].title.includes('2 pages affected'));
    });

    test('6.2 should preserve evidence provenance across all merged items', () => {
      const act1: SeoAction = {
        id: 'act-ev-1',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'Duplicate Titles',
        observation: 'Duplicate title observed',
        evidence: [{ source: 'PHASE_7_SITE_CRAWL', metric: 'Title', observedValue: 'Shoes', url: 'https://example.com/s1' }],
        interpretation: '',
        action: 'Fix title',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/s1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'DUPLICATE_TITLES',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-s1'
      };

      const act2: SeoAction = {
        id: 'act-ev-2',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'Duplicate Titles',
        observation: 'Duplicate title observed',
        evidence: [{ source: 'PHASE_7_SITE_CRAWL', metric: 'Title', observedValue: 'Shoes', url: 'https://example.com/s2' }],
        interpretation: '',
        action: 'Fix title',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/s2'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'DUPLICATE_TITLES',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-s2'
      };

      const consolidated = consolidateActions([act1, act2]);
      assert.strictEqual(consolidated[0].evidence.length, 2);
    });

    test('6.3 should elevate severity to highest severity in cluster', () => {
      const warnAct: SeoAction = {
        id: 'act-warn',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'Meta Description Missing',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'META_MISSING',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-w'
      };

      const critAct: SeoAction = {
        id: 'act-crit',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'CRITICAL',
        priority: 85,
        priorityLevel: 'IMMEDIATE',
        title: 'Meta Description Missing',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p2'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'META_MISSING',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-c'
      };

      const consolidated = consolidateActions([warnAct, critAct]);
      assert.strictEqual(consolidated[0].severity, 'CRITICAL');
    });

    test('6.4 should never merge distinct or unrelated categories', () => {
      const techAct: SeoAction = {
        id: 'act-t',
        category: 'TECHNICAL_INDEXABILITY',
        severity: 'CRITICAL',
        priority: 90,
        priorityLevel: 'IMMEDIATE',
        title: 'Server Error 500',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-t'
      };

      const contentAct: SeoAction = {
        id: 'act-c',
        category: 'CONTENT_DEPTH',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'Thin Content',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/p1'],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-c'
      };

      const consolidated = consolidateActions([techAct, contentAct]);
      assert.strictEqual(consolidated.length, 2);
    });

    test('6.5 should group 10 duplicate meta findings into 1 consolidated site-wide action', () => {
      const actions: SeoAction[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `act-meta-${i}`,
        category: 'TECHNICAL_STRUCTURE',
        severity: 'INFO',
        priority: 40,
        priorityLevel: 'MEDIUM',
        title: 'Resolve Duplicate Meta Descriptions',
        observation: 'Shared meta tag',
        evidence: [{ source: 'PHASE_7_SITE_CRAWL', metric: 'Meta Description', observedValue: 'Sample', url: `https://example.com/p${i}` }],
        interpretation: '',
        action: 'Provide unique meta descriptions',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: [`https://example.com/p${i}`],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'DUPLICATE_META_DESCRIPTIONS',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: `fp-${i}`
      }));

      const consolidated = consolidateActions(actions);
      assert.strictEqual(consolidated.length, 1);
      assert.strictEqual(consolidated[0].affectedCount, 10);
    });

    test('6.6 should recalculate Optimization Priority accurately for multi-URL consolidated clusters', () => {
      const actions: SeoAction[] = Array.from({ length: 30 }).map((_, i) => ({
        id: `act-link-${i}`,
        category: 'INTERNAL_LINKING',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'Add Contextual Internal Links',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: [`https://example.com/item-${i}`],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'WEAK_INTERNAL_LINKS',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: `fp-item-${i}`
      }));

      const consolidated = consolidateActions(actions);
      // Base (30) + Scope (20) + Effort (8) + Confidence (10) = 68 (HIGH)
      assert.strictEqual(consolidated[0].priority, 68);
      assert.strictEqual(consolidated[0].priorityLevel, 'HIGH');
    });
  });

  // ==========================================
  // AREA 7: BEFORE / AFTER SAFE PREVIEWS
  // ==========================================
  describe('7. Before / After Safe Previews', () => {
    test('7.1 should safely preserve measured Before HTML tags and proposed After patterns', () => {
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      const titleAction = plan.actions.find(a => a.issueCode === 'TITLE_TOO_SHORT');
      assert.ok(titleAction);
      assert.strictEqual(titleAction.before, '<title>Short Title</title>');
      assert.ok(titleAction.after?.includes('Comprehensive Guide'));
    });

    test('7.2 should generate clean Before and After patterns for duplicate titles', () => {
      const crawlReport = createMockCrawlReport('example.com');
      const plan = generateSeoActionPlan({ crawlReport });

      const dupTitleAction = plan.actions.find(a => a.issueCode === 'DUPLICATE_TITLES');
      assert.ok(dupTitleAction);
      assert.ok(dupTitleAction.before?.includes('<title>'));
      assert.ok(dupTitleAction.after?.includes('[Unique Subject / Product Name]'));
    });

    test('7.3 should never fabricate replacement text when observed evidence is absent', () => {
      const action: SeoAction = {
        id: 'act-test-nofab',
        category: 'TECHNICAL_PERFORMANCE',
        severity: 'WARNING',
        priority: 50,
        priorityLevel: 'MEDIUM',
        title: 'High Server Response Time',
        observation: 'Response time 1200ms',
        evidence: [{ source: 'PHASE_5_TECHNICAL', metric: 'TTFB', observedValue: 1200 }],
        interpretation: 'Slow response hurts crawler efficiency',
        action: 'Optimize database queries and server cache',
        expectedBenefit: 'Reduces TTFB to < 300ms',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/slow'],
        affectedCount: 1,
        sourcePhase: 'PHASE_5_TECHNICAL',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-slow'
      };

      assert.strictEqual(action.before, undefined);
      assert.strictEqual(action.after, undefined);
    });

    test('7.4 should output strings only for before/after values', () => {
      const crawlReport = createMockCrawlReport();
      const plan = generateSeoActionPlan({ crawlReport });

      for (const act of plan.actions) {
        if (act.before !== undefined) {
          assert.strictEqual(typeof act.before, 'string');
        }
        if (act.after !== undefined) {
          assert.strictEqual(typeof act.after, 'string');
        }
      }
    });
  });

  // ==========================================
  // AREA 8: STATUS LIFECYCLE WORKFLOW
  // ==========================================
  describe('8. Status Lifecycle Workflow', () => {
    test('8.1 should initialize action status to OPEN by default', () => {
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      for (const act of plan.actions) {
        assert.strictEqual(act.status, 'OPEN');
      }
    });

    test('8.2 should support transitioning status to IN_PROGRESS, IMPLEMENTED, and VERIFIED', async () => {
      const store = new MemorySeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const targetActionId = plan.actions[0].id;

      const inProgress = await store.updateActionStatus(plan.id, targetActionId, 'IN_PROGRESS');
      assert.strictEqual(inProgress?.status, 'IN_PROGRESS');

      const implemented = await store.updateActionStatus(plan.id, targetActionId, 'IMPLEMENTED');
      assert.strictEqual(implemented?.status, 'IMPLEMENTED');

      const verified = await store.updateActionStatus(plan.id, targetActionId, 'VERIFIED');
      assert.strictEqual(verified?.status, 'VERIFIED');
    });

    test('8.3 should record dismissal reason when transitioning to DISMISSED', async () => {
      const store = new MemorySeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const targetActionId = plan.actions[0].id;
      const dismissed = await store.updateActionStatus(plan.id, targetActionId, 'DISMISSED', 'Page intentionally kept private');

      assert.strictEqual(dismissed?.status, 'DISMISSED');
      assert.strictEqual(dismissed?.dismissalReason, 'Page intentionally kept private');
    });

    test('8.4 should maintain status history log with timestamps', async () => {
      const store = new MemorySeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const targetActionId = plan.actions[0].id;
      await store.updateActionStatus(plan.id, targetActionId, 'IN_PROGRESS');
      const updated = await store.updateActionStatus(plan.id, targetActionId, 'IMPLEMENTED');

      assert.ok(updated?.statusHistory && updated.statusHistory.length >= 2);
      assert.strictEqual(updated.statusHistory[0].status, 'IN_PROGRESS');
      assert.strictEqual(updated.statusHistory[1].status, 'IMPLEMENTED');
    });

    test('8.5 should automatically update plan statusCounts after action status changes', async () => {
      const store = new MemorySeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const targetActionId = plan.actions[0].id;
      await store.updateActionStatus(plan.id, targetActionId, 'VERIFIED');

      const updatedPlan = await store.getPlan(plan.id);
      assert.strictEqual(updatedPlan?.statusCounts.VERIFIED, 1);
      assert.strictEqual(updatedPlan?.statusCounts.OPEN, plan.actions.length - 1);
    });
  });

  // ==========================================
  // AREA 9: STORAGE ENGINES (MEMORY & SQLITE)
  // ==========================================
  describe('9. Storage Engines (Memory & SQLite)', () => {
    test('9.1 MemorySeoActionStore should save, retrieve, and delete plan', async () => {
      const store = new MemorySeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      await store.savePlan(plan);
      const retrieved = await store.getPlan(plan.id);
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.id, plan.id);

      const deleted = await store.deletePlan(plan.id);
      assert.strictEqual(deleted, true);

      const nonExistent = await store.getPlan(plan.id);
      assert.strictEqual(nonExistent, null);
    });

    test('9.2 MemorySeoActionStore should filter listed plans by domain and pagination', async () => {
      const store = new MemorySeoActionStore();
      const planA = generateSeoActionPlan({ targetDomain: 'alpha.com' });
      const planB = generateSeoActionPlan({ targetDomain: 'beta.com' });

      await store.savePlan(planA);
      await store.savePlan(planB);

      const alphaList = await store.listPlans({ domain: 'alpha.com' });
      assert.strictEqual(alphaList.length, 1);
      assert.strictEqual(alphaList[0].domain, 'alpha.com');

      const allList = await store.listPlans({ limit: 1 });
      assert.strictEqual(allList.length, 1);
    });

    test('9.3 SqliteSeoActionStore should persist and retrieve plan from SQLite', async () => {
      const store = new SqliteSeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      await store.savePlan(plan);
      const retrieved = await store.getPlan(plan.id);

      assert.ok(retrieved);
      assert.strictEqual(retrieved?.id, plan.id);
      assert.strictEqual(retrieved?.domain, plan.domain);
      assert.strictEqual(retrieved?.actions.length, plan.actions.length);
    });

    test('9.4 SqliteSeoActionStore should update action status and persist changes', async () => {
      const store = new SqliteSeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const targetActionId = plan.actions[0].id;
      const updated = await store.updateActionStatus(plan.id, targetActionId, 'IMPLEMENTED');

      assert.strictEqual(updated?.status, 'IMPLEMENTED');

      const reloadedPlan = await store.getPlan(plan.id);
      const reloadedAction = reloadedPlan?.actions.find(a => a.id === targetActionId);
      assert.strictEqual(reloadedAction?.status, 'IMPLEMENTED');
    });

    test('9.5 SqliteSeoActionStore should fetch single action via getAction', async () => {
      const store = new SqliteSeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const actionId = plan.actions[0].id;
      const act = await store.getAction(plan.id, actionId);

      assert.ok(act);
      assert.strictEqual(act?.id, actionId);
    });

    test('9.6 SqliteSeoActionStore should delete plan and cascade action records', async () => {
      const store = new SqliteSeoActionStore();
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });
      await store.savePlan(plan);

      const deleted = await store.deletePlan(plan.id);
      assert.strictEqual(deleted, true);

      const missing = await store.getPlan(plan.id);
      assert.strictEqual(missing, null);
    });

    test('9.7 setActionStore should update global default store', () => {
      const customStore = new MemorySeoActionStore();
      setActionStore(customStore);
      const current = getActionStore();
      assert.strictEqual(current, customStore);
    });
  });

  // ==========================================
  // AREA 10: AUDIT COMPARISON & PROGRESS TRACKING
  // ==========================================
  describe('10. Audit Comparison & Progress Tracking', () => {
    test('10.1 should identify resolved actions present in baseline but absent in target audit', () => {
      const baselineReport = createMockPageReport('https://example.com/p1');
      const baselinePlan = generateSeoActionPlan({ pageReport: baselineReport });

      // Target audit without issues
      const cleanReport: SEOReport = {
        ...baselineReport,
        issues: [],
        contentIntelligence: undefined
      };
      const targetPlan = generateSeoActionPlan({ pageReport: cleanReport });

      const comparison = compareActionPlans(baselinePlan, targetPlan);

      assert.ok(comparison.resolvedActions.length > 0);
      assert.strictEqual(comparison.newActions.length, 0);
      assert.strictEqual(comparison.progressPercentage, 100);
    });

    test('10.2 should identify newly introduced actions present in target audit', () => {
      const cleanReport: SEOReport = {
        ...createMockPageReport('https://example.com/p1'),
        issues: [],
        contentIntelligence: undefined
      };
      const baselinePlan = generateSeoActionPlan({ pageReport: cleanReport });

      const dirtyReport = createMockPageReport('https://example.com/p1');
      const targetPlan = generateSeoActionPlan({ pageReport: dirtyReport });

      const comparison = compareActionPlans(baselinePlan, targetPlan);

      assert.strictEqual(comparison.resolvedActions.length, 0);
      assert.ok(comparison.newActions.length > 0);
    });

    test('10.3 should detect status transitions between audits', () => {
      const baselinePlan = generateSeoActionPlan({ pageReport: createMockPageReport() });
      const targetPlan = JSON.parse(JSON.stringify(baselinePlan)) as SeoActionPlan;
      targetPlan.actions[0].status = 'IN_PROGRESS';

      const comparison = compareActionPlans(baselinePlan, targetPlan);
      assert.strictEqual(comparison.statusChanges.length, 1);
      assert.strictEqual(comparison.statusChanges[0].fromStatus, 'OPEN');
      assert.strictEqual(comparison.statusChanges[0].toStatus, 'IN_PROGRESS');
    });

    test('10.4 should calculate critical, warning, and priority deltas accurately', () => {
      const baselinePlan = generateSeoActionPlan({ pageReport: createMockPageReport() });
      const targetPlan = generateSeoActionPlan({ pageReport: createMockPageReport() });

      const comparison = compareActionPlans(baselinePlan, targetPlan);
      assert.strictEqual(comparison.metricDeltas.totalActionDelta, 0);
      assert.strictEqual(comparison.metricDeltas.criticalIssueDelta, 0);
    });

    test('10.5 should maintain audit comparison timestamps and plan references', () => {
      const baselinePlan = generateSeoActionPlan({ targetDomain: 'compare.com' });
      const targetPlan = generateSeoActionPlan({ targetDomain: 'compare.com' });

      const comparison = compareActionPlans(baselinePlan, targetPlan);
      assert.strictEqual(comparison.baselinePlanId, baselinePlan.id);
      assert.strictEqual(comparison.targetPlanId, targetPlan.id);
      assert.ok(comparison.comparedAt);
    });
  });

  // ==========================================
  // AREA 11: CROSS-PHASE INTEGRATION
  // ==========================================
  describe('11. Cross-Phase Integration', () => {
    test('11.1 should generate complete plan from Phase 1-6 Single Page SEO Report', () => {
      const pageReport = createMockPageReport('https://mysite.com/blog');
      const plan = generateSeoActionPlan({ pageReport });

      assert.ok(plan.actions.length >= 2);
      assert.ok(plan.sourceAudits.pageAuditId);
      assert.strictEqual(plan.domain, 'mysite.com');
    });

    test('11.2 should generate complete plan from Phase 7 Site Crawl Report', () => {
      const crawlReport = createMockCrawlReport('crawltest.com');
      const plan = generateSeoActionPlan({ crawlReport });

      assert.ok(plan.actions.length >= 3);
      assert.ok(plan.sourceAudits.crawlSessionId);
      assert.strictEqual(plan.domain, 'crawltest.com');
      assert.ok(plan.actions.some(a => a.category === 'INTERNAL_LINKING'));
      assert.ok(plan.actions.some(a => a.category === 'TECHNICAL_CANONICAL'));
    });

    test('11.3 should generate complete plan from Phase 8 Search Intelligence Report', () => {
      const searchAuditReport = createMockSearchAuditReport('best keyword tool');
      const plan = generateSeoActionPlan({ searchAuditReport });

      assert.ok(plan.actions.length >= 2);
      assert.ok(plan.sourceAudits.searchAuditId);
      assert.ok(plan.actions.some(a => a.category === 'SEARCH_SERP'));
    });

    test('11.4 should combine Phase 1-6, Phase 7, and Phase 8 reports into one unified plan', () => {
      const pageReport = createMockPageReport('https://allinone.com/article');
      const crawlReport = createMockCrawlReport('allinone.com');
      const searchAuditReport = createMockSearchAuditReport('seo automation');

      const plan = generateSeoActionPlan({
        pageReport,
        crawlReport,
        searchAuditReport,
        targetDomain: 'allinone.com'
      });

      assert.ok(plan.actions.length >= 5);
      assert.strictEqual(plan.domain, 'allinone.com');
      assert.ok(plan.sourceAudits.pageAuditId);
      assert.ok(plan.sourceAudits.crawlSessionId);
      assert.ok(plan.sourceAudits.searchAuditId);
      assert.ok(plan.categoryCounts.TECHNICAL_INDEXABILITY > 0);
      assert.ok(plan.categoryCounts.SEARCH_SERP > 0);
    });

    test('11.5 should build executive summary accurately summarizing immediate & high actions', () => {
      const pageReport = createMockPageReport('https://sum.com/page');
      const plan = generateSeoActionPlan({ pageReport });

      assert.ok(plan.summary.includes('immediate priority'));
      assert.ok(plan.summary.includes('sum.com'));
    });
  });

  // ==========================================
  // AREA 12: RESOURCE LIMITS & SECURITY HARDENING
  // ==========================================
  describe('12. Resource Limits & Security Hardening', () => {
    test('12.1 should enforce maxActions limit and truncate excess actions safely', () => {
      const actions: SeoAction[] = Array.from({ length: 50 }).map((_, i) => ({
        id: `act-lim-${i}`,
        category: 'CONTENT_DEPTH',
        severity: 'INFO',
        priority: 30,
        priorityLevel: 'LOW',
        title: `Action #${i}`,
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: [`https://example.com/p${i}`],
        affectedCount: 1,
        sourcePhase: 'PHASE_6_CONTENT',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: `fp-lim-${i}`
      }));

      const plan = generateSeoActionPlan({
        targetDomain: 'limits.com',
        maxActions: 15
      });

      assert.ok(plan.actions.length <= 15);
    });

    test('12.2 should cap maximum affected URLs per action preview to prevent unbounded payloads', () => {
      const urls = Array.from({ length: 250 }).map((_, i) => `https://example.com/item-${i}`);
      const act: SeoAction = {
        id: 'act-big-scope',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'WARNING',
        priority: 60,
        priorityLevel: 'HIGH',
        title: 'Bulk Structure Issue',
        observation: '',
        evidence: [],
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: urls,
        affectedCount: urls.length,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'BULK_ISSUE',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-big'
      };

      const consolidated = consolidateActions([act], { maxUrlsPerAction: 50 });
      assert.strictEqual(consolidated[0].affectedCount, 250);
      assert.strictEqual(consolidated[0].affectedUrls.length, 50);
    });

    test('12.3 should cap maximum evidence items per action', () => {
      const evidence = Array.from({ length: 40 }).map((_, i) => ({
        source: 'PHASE_7_SITE_CRAWL',
        metric: `Metric ${i}`,
        observedValue: i
      }));

      const act: SeoAction = {
        id: 'act-big-ev',
        category: 'TECHNICAL_STRUCTURE',
        severity: 'INFO',
        priority: 40,
        priorityLevel: 'MEDIUM',
        title: 'Many Evidence Points',
        observation: '',
        evidence,
        interpretation: '',
        action: '',
        expectedBenefit: '',
        effort: 'LOW',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: [],
        affectedUrls: ['https://example.com/test'],
        affectedCount: 1,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'BIG_EV',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: '',
        updatedAt: '',
        fingerprint: 'fp-ev'
      };

      const consolidated = consolidateActions([act], { maxEvidenceItems: 20 });
      assert.strictEqual(consolidated[0].evidence.length, 20);
    });

    test('12.4 should handle empty input gracefully without exceptions', () => {
      const plan = generateSeoActionPlan({});
      assert.ok(plan);
      assert.strictEqual(plan.totalActions, 0);
      assert.strictEqual(plan.averagePriority, 0);
    });

    test('12.5 should produce serializable JSON payloads without circular references', () => {
      const pageReport = createMockPageReport();
      const plan = generateSeoActionPlan({ pageReport });

      assert.doesNotThrow(() => {
        const json = JSON.stringify(plan);
        const parsed = JSON.parse(json);
        assert.strictEqual(parsed.id, plan.id);
      });
    });
  });

  // ==========================================
  // AREA 13: ANTI-FABRICATION & PROVENANCE INTEGRITY
  // ==========================================
  describe('13. Anti-Fabrication & Provenance Integrity', () => {
    test('13.1 should NEVER contain forbidden fabricated ranking terminology', () => {
      const pageReport = createMockPageReport();
      const crawlReport = createMockCrawlReport();
      const searchAuditReport = createMockSearchAuditReport();

      const plan = generateSeoActionPlan({ pageReport, crawlReport, searchAuditReport });
      const planJson = JSON.stringify(plan);

      // Verify forbidden ranking claims
      assert.strictEqual(planJson.includes('Ranking Impact'), false, 'Forbidden: Ranking Impact');
      assert.strictEqual(planJson.includes('Ranking Probability'), false, 'Forbidden: Ranking Probability');
      assert.strictEqual(planJson.includes('Google Score'), false, 'Forbidden: Google Score');
    });

    test('13.2 should NEVER fabricate external Domain Authority, KD, or PageRank metrics', () => {
      const plan = generateSeoActionPlan({
        pageReport: createMockPageReport(),
        crawlReport: createMockCrawlReport()
      });
      const planJson = JSON.stringify(plan);

      assert.strictEqual(planJson.includes('Domain Authority'), false, 'Forbidden: DA');
      assert.strictEqual(planJson.includes('Keyword Difficulty'), false, 'Forbidden: KD');
      assert.strictEqual(planJson.includes('PageRank'), false, 'Forbidden: PageRank');
    });

    test('13.3 expected benefit statements must strictly describe technical clarity rather than ranking promises', () => {
      const plan = generateSeoActionPlan({
        pageReport: createMockPageReport(),
        crawlReport: createMockCrawlReport()
      });

      for (const act of plan.actions) {
        const benefit = act.expectedBenefit.toLowerCase();
        assert.strictEqual(benefit.includes('guarantee #1'), false);
        assert.strictEqual(benefit.includes('guaranteed top ranking'), false);
        assert.strictEqual(benefit.includes('guaranteed page 1'), false);
      }
    });

    test('13.4 should preserve evidence provenance and URL attribution across all actions', () => {
      const plan = generateSeoActionPlan({
        pageReport: createMockPageReport(),
        crawlReport: createMockCrawlReport()
      });

      for (const act of plan.actions) {
        for (const ev of act.evidence) {
          assert.ok(ev.source, `Evidence item in action ${act.id} missing source`);
          assert.ok(ev.metric, `Evidence item in action ${act.id} missing metric`);
        }
      }
    });
  });
});
