import {
  SeoAction,
  SeoActionPlan,
  ActionCategory,
  ActionSeverity,
  ActionEffort,
  ActionEvidenceItem,
  ActionPriorityLevel,
  ActionStatus
} from './actionTypes';
import { generateActionFingerprint } from './actionFingerprint';
import { evaluateActionSafety } from './actionSafety';
import { calculateOptimizationPriority } from './actionPriority';
import { resolveActionDependencies } from './actionDependencies';
import { consolidateActions } from './actionConsolidator';
import { SEOReport, WebsiteCrawlReport } from '@/types';
import { SearchIntelligenceAuditReport } from '../search/searchTypes';

export interface ActionEngineOptions {
  pageReport?: SEOReport;
  crawlReport?: WebsiteCrawlReport;
  searchAuditReport?: SearchIntelligenceAuditReport;
  targetDomain?: string;
  maxActions?: number;
  maxUrlsPerAction?: number;
  maxEvidenceItems?: number;
}

const MAX_ACTIONS_PER_PLAN = 250;

/**
 * Maps raw SEO issues into unified ActionCategory enum.
 */
function mapIssueCategoryToActionCategory(category: string, title: string): ActionCategory {
  const norm = `${category} ${title}`.toLowerCase();
  if (norm.includes('index') || norm.includes('robots') || norm.includes('404') || norm.includes('500') || norm.includes('status code')) {
    return 'TECHNICAL_INDEXABILITY';
  }
  if (norm.includes('canonical')) {
    return 'TECHNICAL_CANONICAL';
  }
  if (norm.includes('performance') || norm.includes('response time') || norm.includes('page size') || norm.includes('core web')) {
    return 'TECHNICAL_PERFORMANCE';
  }
  if (norm.includes('link') || norm.includes('orphan') || norm.includes('anchor')) {
    return 'INTERNAL_LINKING';
  }
  if (norm.includes('topic') || norm.includes('keyword') || norm.includes('semantic') || norm.includes('cannibal')) {
    return 'SEMANTIC_TOPIC';
  }
  if (norm.includes('content') || norm.includes('word count') || norm.includes('thin') || norm.includes('reading time')) {
    return 'CONTENT_DEPTH';
  }
  if (norm.includes('serp') || norm.includes('search intent') || norm.includes('competitor')) {
    return 'SEARCH_SERP';
  }
  if (norm.includes('site') || norm.includes('sitemap') || norm.includes('architecture') || norm.includes('crawl')) {
    return 'SITE_WIDE_ARCHITECTURE';
  }
  return 'TECHNICAL_STRUCTURE';
}

/**
 * Maps raw issue severity into standard ActionSeverity.
 */
function mapSeverity(severity: string): ActionSeverity {
  const norm = (severity || '').toUpperCase();
  if (norm === 'CRITICAL' || norm === 'ERROR') return 'CRITICAL';
  if (norm === 'WARNING' || norm === 'WARN') return 'WARNING';
  return 'INFO';
}

/**
 * Master Action Engine for Phase 9.
 * Ingests outputs from Phase 1-6 (Page), Phase 7 (Site Crawl), and Phase 8 (SERP Intelligence)
 * and generates a unified, prioritized, dependency-ordered, safe SEO Action Plan.
 */
export function generateSeoActionPlan(options: ActionEngineOptions): SeoActionPlan {
  const rawActions: SeoAction[] = [];
  const domain = options.targetDomain ||
    (options.pageReport ? new URL(options.pageReport.url).hostname : undefined) ||
    options.crawlReport?.domain ||
    options.searchAuditReport?.targetDomain ||
    'example.com';

  const planId = `action-plan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  // ==========================================
  // 1. INGEST PHASE 1–6 (PAGE-LEVEL REPORT)
  // ==========================================
  if (options.pageReport) {
    const report = options.pageReport;
    const url = report.url;

    // A. Technical & On-Page Issues from Rules
    if (report.issues && Array.isArray(report.issues)) {
      for (const issue of report.issues) {
        if (issue.severity === 'GOOD') continue; // Skip passed checks

        const category = mapIssueCategoryToActionCategory(issue.category, issue.title);
        const severity = mapSeverity(issue.severity);
        const effort: ActionEffort = severity === 'CRITICAL' ? 'MEDIUM' : 'LOW';

        const evidence: ActionEvidenceItem[] = [
          {
            source: 'PHASE_2_RULE',
            metric: issue.code || issue.title,
            observedValue: issue.description || 'Issue detected in page audit',
            url
          }
        ];

        if (issue.affectedElement) {
          evidence.push({
            source: 'PHASE_5_TECHNICAL',
            metric: 'Affected DOM Element',
            observedValue: issue.affectedElement,
            url
          });
        }

        const safety = evaluateActionSafety({
          category,
          severity,
          title: issue.title,
          actionText: issue.action || issue.recommendation || issue.description,
          affectedUrlsCount: 1,
          issueCode: issue.code
        });

        const priorityCalc = calculateOptimizationPriority({
          severity,
          affectedUrlsCount: 1,
          effort,
          confidence: 'HIGH'
        });

        const actionObj: SeoAction = {
          id: `act-p2-${issue.code || Math.random().toString(36).substring(2, 8)}`,
          category,
          severity,
          priority: priorityCalc.priorityScore,
          priorityLevel: priorityCalc.priorityLevel,
          priorityExplanation: priorityCalc.explanation,
          title: issue.title,
          observation: issue.description || issue.whyItMatters || `Detected ${issue.title} on ${url}`,
          evidence,
          interpretation: issue.whyItMatters || 'Resolving this helps search engine crawlers accurately parse and index page content.',
          action: issue.action || issue.recommendation || `Fix ${issue.title} according to standard SEO best practices.`,
          expectedBenefit: issue.expectedBenefit || 'Improves technical crawlability and content clarity for search indexing.',
          caution: safety.caution,
          before: issue.before,
          after: issue.after,
          effort,
          confidence: 'HIGH',
          isDestructive: safety.isDestructive,
          verificationSteps: safety.verificationSteps,
          nonDestructiveAlternative: safety.nonDestructiveAlternative,
          affectedUrls: [url],
          affectedCount: 1,
          sourcePhase: 'PHASE_5_TECHNICAL',
          issueCode: issue.code,
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };

        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });

        rawActions.push(actionObj);
      }
    }

    // B. Content Intelligence (Intent & Topic Coverage)
    if (report.contentIntelligence) {
      const ci = report.contentIntelligence;

      // Search Intent Alignment
      if (ci.searchIntent && ci.searchIntent.primaryIntent) {
        if (ci.searchIntent.confidence === 'LOW' || ci.searchIntent.confidence === 'UNKNOWN' || ci.searchIntent.primaryIntent === 'MIXED') {
          const actionObj: SeoAction = {
            id: `act-p6-intent-${Math.random().toString(36).substring(2, 8)}`,
            category: 'CONTENT_DEPTH',
            severity: 'WARNING',
            priority: 55,
            priorityLevel: 'MEDIUM',
            title: 'Ambiguous Content Search Intent',
            observation: `Page exhibits mixed or ambiguous intent signals (${ci.searchIntent.primaryIntent}).`,
            evidence: [
              {
                source: 'PHASE_6_CONTENT',
                metric: 'Primary Inferred Intent',
                observedValue: ci.searchIntent.primaryIntent,
                url
              }
            ],
            interpretation: 'Clear search intent signals help search engines match the page to user queries with matching informational or commercial goals.',
            action: 'Align headings, opening paragraphs, and call-to-actions with the primary intended user goal.',
            expectedBenefit: 'Clarifies topical focus and user expectation fulfillment.',
            caution: 'Ensure content adjustments preserve natural writing style and brand voice.',
            effort: 'MEDIUM',
            confidence: 'MEDIUM',
            isDestructive: false,
            verificationSteps: ['Review H1 and introduction to ensure value proposition matches target intent.'],
            affectedUrls: [url],
            affectedCount: 1,
            sourcePhase: 'PHASE_6_CONTENT',
            issueCode: 'CONTENT_INTENT_AMBIGUOUS',
            dependencies: [],
            blockedBy: [],
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fingerprint: '',
            targetDomain: domain
          };
          actionObj.fingerprint = generateActionFingerprint({
            category: actionObj.category,
            issueCode: actionObj.issueCode,
            title: actionObj.title,
            affectedUrls: actionObj.affectedUrls,
            domain
          });
          rawActions.push(actionObj);
        }
      }

      // Topic / Content Gaps
      if (ci.contentGaps && ci.contentGaps.length > 0) {
        const topGaps = ci.contentGaps.slice(0, 3).map((g: any) => g.topic).join(', ');
        const actionObj: SeoAction = {
          id: `act-p6-gaps-${Math.random().toString(36).substring(2, 8)}`,
          category: 'SEMANTIC_TOPIC',
          severity: 'INFO',
          priority: 45,
          priorityLevel: 'MEDIUM',
          title: 'Cover Missing Topical Entities',
          observation: `Key related topical concepts (${topGaps}) are missing from page content.`,
          evidence: [
            {
              source: 'PHASE_6_CONTENT',
              metric: 'Identified Topic Gaps',
              observedValue: topGaps,
              url
            }
          ],
          interpretation: 'Comprehensive topical coverage provides deeper contextual relevance for broad search queries.',
          action: `Integrate subheadings or contextual explanations covering: ${topGaps}.`,
          expectedBenefit: 'Enhances semantic depth and comprehensive topic coverage.',
          caution: 'Integrate topics contextually without keyword stuffing or awkward phrasing.',
          effort: 'MEDIUM',
          confidence: 'HIGH',
          isDestructive: false,
          verificationSteps: ['Ensure added sections answer relevant user questions without keyword stuffing.'],
          affectedUrls: [url],
          affectedCount: 1,
          sourcePhase: 'PHASE_6_CONTENT',
          issueCode: 'SEMANTIC_TOPIC_GAPS',
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });
        rawActions.push(actionObj);
      }
    }
  }

  // ==========================================
  // 2. INGEST PHASE 7 (SITE-WIDE CRAWL REPORT)
  // ==========================================
  if (options.crawlReport) {
    const crawl = options.crawlReport;

    // A. Duplicate Titles
    if (crawl.duplicateTitles && crawl.duplicateTitles.length > 0) {
      for (const group of crawl.duplicateTitles) {
        const groupUrls = group.pages.map((p: any) => p.url);
        const actionObj: SeoAction = {
          id: `act-p7-duptitle-${Math.random().toString(36).substring(2, 8)}`,
          category: 'TECHNICAL_STRUCTURE',
          severity: 'WARNING',
          priority: 65,
          priorityLevel: 'HIGH',
          title: 'Resolve Duplicate Page Titles',
          observation: `Title "${group.title}" is shared across ${groupUrls.length} distinct pages.`,
          evidence: groupUrls.map((u: string) => ({
            source: 'PHASE_7_SITE_CRAWL',
            metric: 'Duplicate Title Tag',
            observedValue: group.title,
            url: u
          })),
          interpretation: 'Identical title tags make it difficult for search engines and users to differentiate between pages in search listings.',
          action: group.recommendation?.action || 'Provide a unique, descriptive <title> tag tailored to the specific content of each page.',
          before: `<title>${group.title}</title>`,
          after: `<title>[Unique Subject / Product Name] - ${domain}</title>`,
          expectedBenefit: group.recommendation?.expectedBenefit || 'Prevents title duplication conflicts and improves SERP snippet clarity.',
          effort: 'LOW',
          confidence: 'HIGH',
          isDestructive: false,
          verificationSteps: ['Verify each affected URL returns a unique title tag in rendered HTML.'],
          affectedUrls: groupUrls,
          affectedCount: groupUrls.length,
          sourcePhase: 'PHASE_7_SITE_CRAWL',
          issueCode: 'DUPLICATE_TITLES',
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });
        rawActions.push(actionObj);
      }
    }

    // B. Duplicate Meta Descriptions
    if (crawl.duplicateMetaDescriptions && crawl.duplicateMetaDescriptions.length > 0) {
      for (const group of crawl.duplicateMetaDescriptions) {
        const groupUrls = group.pages.map((p: any) => p.url);
        const actionObj: SeoAction = {
          id: `act-p7-dupdesc-${Math.random().toString(36).substring(2, 8)}`,
          category: 'TECHNICAL_STRUCTURE',
          severity: 'INFO',
          priority: 45,
          priorityLevel: 'MEDIUM',
          title: 'Resolve Duplicate Meta Descriptions',
          observation: `Meta description is duplicated across ${groupUrls.length} URLs.`,
          evidence: groupUrls.map((u: string) => ({
            source: 'PHASE_7_SITE_CRAWL',
            metric: 'Duplicate Meta Description',
            observedValue: (group.metaDescription || '').substring(0, 60) + '...',
            url: u
          })),
          interpretation: 'Distinct meta descriptions provide unique SERP snippet summaries for different queries.',
          action: group.recommendation?.action || 'Craft a tailored 140-160 character meta description for each affected page.',
          before: `<meta name="description" content="${group.metaDescription}">`,
          after: `<meta name="description" content="[Unique summary of page content...]">`,
          expectedBenefit: group.recommendation?.expectedBenefit || 'Improves SERP presentation and CTR relevance.',
          effort: 'LOW',
          confidence: 'HIGH',
          isDestructive: false,
          verificationSteps: ['Inspect rendered meta description tag on affected pages.'],
          affectedUrls: groupUrls,
          affectedCount: groupUrls.length,
          sourcePhase: 'PHASE_7_SITE_CRAWL',
          issueCode: 'DUPLICATE_META_DESCRIPTIONS',
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });
        rawActions.push(actionObj);
      }
    }

    // C. Orphan Candidates
    if (crawl.orphanCandidates && crawl.orphanCandidates.length > 0) {
      const orphanUrls = crawl.orphanCandidates.map(o => o.url);
      const actionObj: SeoAction = {
        id: `act-p7-orphan-${Math.random().toString(36).substring(2, 8)}`,
        category: 'INTERNAL_LINKING',
        severity: 'WARNING',
        priority: 70,
        priorityLevel: 'HIGH',
        title: 'Integrate Orphan Candidates with Internal Links',
        observation: `${orphanUrls.length} pages have zero discovered internal inlinks from other crawled pages.`,
        evidence: crawl.orphanCandidates.map(o => ({
          source: 'PHASE_7_SITE_CRAWL',
          metric: 'Inlink Count',
          observedValue: o.inlinkCount || 0,
          expectedValue: '>= 1 internal link',
          url: o.url
        })),
        interpretation: 'Pages without internal inlinks are difficult for search crawlers to discover and receive minimal internal link equity.',
        action: 'Add contextual internal links from relevant parent categories or related articles pointing to these URLs.',
        expectedBenefit: 'Improves crawl discovery and structural link connectivity.',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        isDestructive: false,
        verificationSteps: ['Verify newly added internal links resolve to 200 OK and are crawlable.'],
        affectedUrls: orphanUrls,
        affectedCount: orphanUrls.length,
        sourcePhase: 'PHASE_7_SITE_CRAWL',
        issueCode: 'ORPHAN_PAGES',
        dependencies: [],
        blockedBy: [],
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fingerprint: '',
        targetDomain: domain
      };
      actionObj.fingerprint = generateActionFingerprint({
        category: actionObj.category,
        issueCode: actionObj.issueCode,
        title: actionObj.title,
        affectedUrls: actionObj.affectedUrls,
        domain
      });
      rawActions.push(actionObj);
    }

    // D. Canonical Consistency Issues
    if (crawl.canonicalConsistencyIssues && crawl.canonicalConsistencyIssues.length > 0) {
      for (const item of crawl.canonicalConsistencyIssues) {
        const actionText = item.recommendation?.action || 'Fix canonical tag mismatch';
        const safety = evaluateActionSafety({
          category: 'TECHNICAL_CANONICAL',
          severity: 'CRITICAL',
          title: 'Resolve Canonical URL Inconsistency',
          actionText,
          affectedUrlsCount: item.affectedUrls.length,
          issueCode: item.issueType
        });

        const actionObj: SeoAction = {
          id: `act-p7-canon-${Math.random().toString(36).substring(2, 8)}`,
          category: 'TECHNICAL_CANONICAL',
          severity: 'CRITICAL',
          priority: 85,
          priorityLevel: 'IMMEDIATE',
          title: 'Resolve Canonical URL Inconsistency',
          observation: item.evidence || `Canonical tag points to an inconsistent or redirected target.`,
          evidence: item.affectedUrls.map(u => ({
            source: 'PHASE_7_SITE_CRAWL',
            metric: 'Canonical Target',
            observedValue: item.canonicalUrl || 'Inconsistent target',
            url: u
          })),
          interpretation: item.recommendation?.interpretation || 'Conflicting canonical tags confuse search engine crawlers regarding the authoritative URL version.',
          action: actionText,
          expectedBenefit: item.recommendation?.expectedBenefit || 'Consolidates indexing signals and eliminates duplicate indexation confusion.',
          caution: safety.caution,
          effort: 'LOW',
          confidence: 'HIGH',
          isDestructive: true,
          verificationSteps: safety.verificationSteps,
          nonDestructiveAlternative: safety.nonDestructiveAlternative,
          affectedUrls: item.affectedUrls,
          affectedCount: item.affectedUrls.length,
          sourcePhase: 'PHASE_7_SITE_CRAWL',
          issueCode: item.issueType,
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });
        rawActions.push(actionObj);
      }
    }

    // E. Search Intent Overlaps (Potential Cannibalization Candidates)
    if (crawl.searchIntentOverlaps && crawl.searchIntentOverlaps.length > 0) {
      for (const overlap of crawl.searchIntentOverlaps) {
        const overlapUrls = overlap.competingPages.map(p => p.url);
        const actionObj: SeoAction = {
          id: `act-p7-overlap-${Math.random().toString(36).substring(2, 8)}`,
          category: 'SEMANTIC_TOPIC',
          severity: 'WARNING',
          priority: 60,
          priorityLevel: 'HIGH',
          title: 'Resolve Potential Search-Intent Overlap',
          observation: overlap.observation || `Pages target highly similar topic clusters (${overlap.primaryTopic}).`,
          evidence: overlap.competingPages.map(p => ({
            source: 'PHASE_7_SITE_CRAWL',
            metric: 'Competing Topic',
            observedValue: overlap.primaryTopic,
            url: p.url
          })),
          interpretation: overlap.interpretation || 'Multiple internal pages competing for the exact same search query intent can split internal signals.',
          action: overlap.action || 'Differentiate the focus of each page (e.g. guide vs product) or consolidate content if they serve identical user needs.',
          expectedBenefit: overlap.expectedBenefit || 'Strengthens topical focus and eliminates internal self-competition.',
          effort: 'HIGH',
          confidence: 'MEDIUM',
          isDestructive: false,
          verificationSteps: ['Review target keywords and value propositions for both URLs to establish clear separation.'],
          affectedUrls: overlapUrls,
          affectedCount: overlapUrls.length,
          sourcePhase: 'PHASE_7_SITE_CRAWL',
          issueCode: 'SEARCH_INTENT_OVERLAP',
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain
        });
        rawActions.push(actionObj);
      }
    }
  }

  // ==========================================
  // 3. INGEST PHASE 8 (SEARCH & SERP INTELLIGENCE)
  // ==========================================
  if (options.searchAuditReport) {
    const serpReport = options.searchAuditReport;
    const userUrl = serpReport.userPageUrl;

    // A. SERP Intent Alignment
    if (serpReport.intentAlignments) {
      for (const [query, align] of Object.entries(serpReport.intentAlignments)) {
        if (align.level === 'WEAK_ALIGNMENT') {
          const actionObj: SeoAction = {
            id: `act-p8-intent-${Math.random().toString(36).substring(2, 8)}`,
            category: 'SEARCH_SERP',
            severity: 'WARNING',
            priority: 72,
            priorityLevel: 'HIGH',
            title: 'Align Content Format with Dominant SERP Intent',
            observation: `Page provides ${align.userPageIntent || 'unclassified'} content, whereas top organic SERP results predominantly serve ${align.observedSerpIntentPattern} intent.`,
            evidence: [
              {
                source: 'PHASE_8_SEARCH_SERP',
                metric: 'Observed Dominant SERP Intent',
                observedValue: align.observedSerpIntentPattern,
                expectedValue: align.observedSerpIntentPattern,
                context: `SERP Query: "${query}"`,
                url: userUrl
              },
              {
                source: 'PHASE_8_SEARCH_SERP',
                metric: 'Page Primary Intent',
                observedValue: align.userPageIntent || 'Unknown',
                url: userUrl
              }
            ],
            interpretation: 'Search engines rank formats that satisfy user intent. If top ranking pages are informational guides while this page is purely transactional, users may bounce.',
            action: align.explanation || `Restructure content to fulfill ${align.observedSerpIntentPattern} format requirements while maintaining core conversions.`,
            expectedBenefit: 'Aligns content presentation with measured user search patterns.',
            effort: 'MEDIUM',
            confidence: 'HIGH',
            isDestructive: false,
            verificationSteps: ['Verify top competitor SERP layouts and match core functional sections.'],
            affectedUrls: userUrl ? [userUrl] : [],
            affectedCount: userUrl ? 1 : 0,
            sourcePhase: 'PHASE_8_SEARCH_SERP',
            issueCode: 'SERP_INTENT_MISALIGNMENT',
            dependencies: [],
            blockedBy: [],
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fingerprint: '',
            targetDomain: domain
          };
          actionObj.fingerprint = generateActionFingerprint({
            category: actionObj.category,
            issueCode: actionObj.issueCode,
            title: actionObj.title,
            affectedUrls: actionObj.affectedUrls,
            domain,
            primaryEvidenceKey: query
          });
          rawActions.push(actionObj);
        }
      }
    }

    // B. SERP Topic Patterns & Gaps
    if (serpReport.topicPatterns) {
      for (const [query, patterns] of Object.entries(serpReport.topicPatterns)) {
        const missing = patterns.filter(p => p.category === 'POTENTIAL_CONTENT_GAP' || !p.isCoveredInUserPage).slice(0, 4);
        if (missing.length > 0) {
          const missingTopicsStr = missing.map(m => m.topic).join(', ');

          const actionObj: SeoAction = {
            id: `act-p8-topics-${Math.random().toString(36).substring(2, 8)}`,
            category: 'SEARCH_SERP',
            severity: 'INFO',
            priority: 52,
            priorityLevel: 'MEDIUM',
            title: 'Include High-Frequency SERP Competitor Topics',
            observation: `Top ranking SERP competitors frequently discuss topics missing from this page: ${missingTopicsStr}.`,
            evidence: missing.map(m => ({
              source: 'PHASE_8_SEARCH_SERP',
              metric: 'Competitor Topic Frequency',
              observedValue: `${m.frequency} (${m.percentage}%)`,
              context: `Topic: "${m.topic}"`,
              url: userUrl
            })),
            interpretation: `Search engines correlate these subtopics with comprehensive answers for query "${query}".`,
            action: `Add dedicated paragraphs or FAQ entries addressing: ${missingTopicsStr}.`,
            expectedBenefit: 'Closes topical content gap against top ranking competitor pages.',
            effort: 'MEDIUM',
            confidence: 'HIGH',
            isDestructive: false,
            verificationSteps: ['Review added content sections to ensure accurate and authoritative coverage.'],
            affectedUrls: userUrl ? [userUrl] : [],
            affectedCount: userUrl ? 1 : 0,
            sourcePhase: 'PHASE_8_SEARCH_SERP',
            issueCode: 'SERP_TOPIC_GAPS',
            dependencies: [],
            blockedBy: [],
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fingerprint: '',
            targetDomain: domain
          };
          actionObj.fingerprint = generateActionFingerprint({
            category: actionObj.category,
            issueCode: actionObj.issueCode,
            title: actionObj.title,
            affectedUrls: actionObj.affectedUrls,
            domain,
            primaryEvidenceKey: query
          });
          rawActions.push(actionObj);
        }
      }
    }

    // C. SERP Opportunities
    if (serpReport.opportunities && serpReport.opportunities.length > 0) {
      for (const opp of serpReport.opportunities) {
        const actionObj: SeoAction = {
          id: `act-p8-opp-${opp.id || Math.random().toString(36).substring(2, 8)}`,
          category: 'SEARCH_SERP',
          severity: 'INFO',
          priority: 55,
          priorityLevel: 'MEDIUM',
          title: `SERP Opportunity for Query "${opp.query}"`,
          observation: opp.observedSerpPattern || opp.recommendation?.observation || 'Search intelligence opportunity detected',
          evidence: [
            {
              source: 'PHASE_8_SEARCH_SERP',
              metric: 'Observed SERP Pattern',
              observedValue: opp.observedSerpPattern,
              context: `Query: "${opp.query}"`,
              url: opp.userPageUrl || userUrl
            }
          ],
          interpretation: opp.recommendation?.interpretation || 'Addresses search landscape competition and snippet presentation.',
          action: opp.recommendation?.action || 'Optimize page content to match search landscape requirements.',
          expectedBenefit: opp.recommendation?.expectedBenefit || 'Improves alignment with observed SERP landscape.',
          effort: 'MEDIUM',
          confidence: opp.confidence || 'HIGH',
          isDestructive: false,
          verificationSteps: ['Verify changes reflect live search intent and competitor benchmarks.'],
          affectedUrls: opp.userPageUrl ? [opp.userPageUrl] : (userUrl ? [userUrl] : []),
          affectedCount: 1,
          sourcePhase: 'PHASE_8_SEARCH_SERP',
          issueCode: `SERP_OPP_${opp.source}`,
          dependencies: [],
          blockedBy: [],
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: '',
          targetDomain: domain
        };
        actionObj.fingerprint = generateActionFingerprint({
          category: actionObj.category,
          issueCode: actionObj.issueCode,
          title: actionObj.title,
          affectedUrls: actionObj.affectedUrls,
          domain,
          primaryEvidenceKey: opp.query
        });
        rawActions.push(actionObj);
      }
    }
  }

  // ==========================================
  // 4. CONSOLIDATION & DEDUPLICATION
  // ==========================================
  const consolidated = consolidateActions(rawActions, {
    maxUrlsPerAction: options.maxUrlsPerAction,
    maxEvidenceItems: options.maxEvidenceItems
  });

  // ==========================================
  // 5. DEPENDENCY RESOLUTION & TOPOLOGICAL SORT
  // ==========================================
  const dependencyOrdered = resolveActionDependencies(consolidated);

  // Re-calculate priority with dependency blocker bonus
  for (const act of dependencyOrdered) {
    const isBlocker = dependencyOrdered.some(other => other.blockedBy.includes(act.id));
    const priorityResult = calculateOptimizationPriority({
      severity: act.severity,
      affectedUrlsCount: act.affectedCount,
      effort: act.effort,
      confidence: act.confidence,
      blocksOtherActions: isBlocker
    });
    act.priority = priorityResult.priorityScore;
    act.priorityLevel = priorityResult.priorityLevel;
    act.priorityExplanation = priorityResult.explanation;
  }

  // Sort by priority (and dependency hierarchy preserved)
  const finalActions = dependencyOrdered.slice(0, options.maxActions || MAX_ACTIONS_PER_PLAN);

  // ==========================================
  // 6. AGGREGATE SUMMARY & COUNTS
  // ==========================================
  const statusCounts: Record<ActionStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    IMPLEMENTED: 0,
    VERIFIED: 0,
    DISMISSED: 0
  };

  const priorityCounts: Record<ActionPriorityLevel, number> = {
    IMMEDIATE: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  const categoryCounts: Record<ActionCategory, number> = {
    TECHNICAL_INDEXABILITY: 0,
    TECHNICAL_CANONICAL: 0,
    TECHNICAL_PERFORMANCE: 0,
    TECHNICAL_STRUCTURE: 0,
    CONTENT_DEPTH: 0,
    CONTENT_STRUCTURE: 0,
    SEMANTIC_TOPIC: 0,
    INTERNAL_LINKING: 0,
    SEARCH_SERP: 0,
    SITE_WIDE_ARCHITECTURE: 0
  };

  let totalPrioritySum = 0;
  let destructiveCount = 0;

  for (const act of finalActions) {
    statusCounts[act.status] = (statusCounts[act.status] || 0) + 1;
    priorityCounts[act.priorityLevel] = (priorityCounts[act.priorityLevel] || 0) + 1;
    categoryCounts[act.category] = (categoryCounts[act.category] || 0) + 1;
    totalPrioritySum += act.priority;
    if (act.isDestructive) destructiveCount++;
  }

  const averagePriority = finalActions.length > 0
    ? Math.round((totalPrioritySum / finalActions.length) * 10) / 10
    : 0;

  const immediateCount = priorityCounts.IMMEDIATE;
  const highCount = priorityCounts.HIGH;

  const summary = finalActions.length === 0
    ? `No actionable SEO issues identified for ${domain}. All monitored signals pass current standards.`
    : `Generated ${finalActions.length} SEO action${finalActions.length > 1 ? 's' : ''} for ${domain}. ` +
      `${immediateCount} immediate priority, ${highCount} high priority. ` +
      `${destructiveCount > 0 ? `${destructiveCount} require safety verification before implementation.` : 'All actions are safe.'}`;

  return {
    id: planId,
    domain,
    targetUrl: options.pageReport?.url,
    generatedAt: new Date().toISOString(),
    sourceAudits: {
      pageAuditId: options.pageReport?.id,
      crawlSessionId: options.crawlReport?.id,
      searchAuditId: options.searchAuditReport?.id
    },
    actions: finalActions,
    totalActions: finalActions.length,
    statusCounts,
    priorityCounts,
    categoryCounts,
    averagePriority,
    destructiveActionCount: destructiveCount,
    summary,
    resourceLimitsEnforced: {
      maxActions: options.maxActions || MAX_ACTIONS_PER_PLAN,
      maxUrlsPerAction: options.maxUrlsPerAction || 100,
      actionsTruncated: consolidated.length > finalActions.length
    }
  };
}
