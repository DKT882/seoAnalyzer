'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SEOReport, WebsiteCrawlReport, CrawlProgressStats, ContentBrief, RenderMode } from '@/types';
import { apiClient } from '@/lib/api/apiClient';
import { Navbar, NavTab } from '@/components/Navbar';
import { UrlInputForm, AnalysisType } from '@/components/analyzer/UrlInputForm';
import { ProgressTracker } from '@/components/analyzer/ProgressTracker';
import { CrawlProgressTracker } from '@/components/analyzer/CrawlProgressTracker';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { WebsiteOverviewDashboard } from '@/components/dashboard/WebsiteOverviewDashboard';
import { PagesListView } from '@/components/pages/PagesListView';
import { KeywordIntelligenceView } from '@/components/keywords/KeywordIntelligenceView';
import { KeywordStrategyView } from '@/components/keywords/KeywordStrategyView';
import { SeoRecommendationsView } from '@/components/recommendations/SeoRecommendationsView';
import { ContentStrategyView } from '@/components/content/ContentStrategyView';
import { ContentBriefModal } from '@/components/content/ContentBriefModal';
import { CannibalizationView } from '@/components/cannibalization/CannibalizationView';
import { TagExplorerView } from '@/components/tags/TagExplorerView';
import { ContentContributionView } from '@/components/content/ContentContributionView';
import { CompetitorCompareView } from '@/components/competitors/CompetitorCompareView';
import { DomainOverviewView } from '@/components/domain/DomainOverviewView';
import { HeadingHierarchyView } from '@/components/onpage/HeadingHierarchyView';
import { MetadataPreviewer } from '@/components/onpage/MetadataPreviewer';
import { ContentAnalysisView } from '@/components/onpage/ContentAnalysisView';
import { TechnicalAuditsView } from '@/components/technical/TechnicalAuditsView';
import { TechnicalSeoIntelligenceView } from '@/components/technical/TechnicalSeoIntelligenceView';
import { RobotsSitemapView } from '@/components/technical/RobotsSitemapView';
import { LinksView } from '@/components/links/LinksView';
import { ImagesView } from '@/components/images/ImagesView';
import { SchemaView } from '@/components/schema/SchemaView';
import { ContentSemanticIntelligenceView } from '@/components/content/ContentSemanticIntelligenceView';
import { ExportModal } from '@/components/export/ExportModal';
import { DataSourcesModal } from '@/components/settings/DataSourcesModal';

import {
  LayoutDashboard,
  Key,
  Code,
  Flame,
  FileCode,
  ShieldAlert,
  Bot,
  Link as LinkIcon,
  Code2,
  Globe,
  FileText,
  Sparkles,
  Zap,
  Layers,
  ArrowLeft,
  AlertCircle,
  Copy,
} from 'lucide-react';

function AnalyzerContent() {
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('reportId') || searchParams.get('id');
  const crawlIdParam = searchParams.get('crawlId');

  const [navTab, setNavTab] = useState<NavTab>('analyzer');

  // Multi-page crawl vs single-page sub-tabs
  const [crawlSubTab, setCrawlSubTab] = useState<string>('site_overview');
  const [reportSubTab, setReportSubTab] = useState<string>('overview');

  // Single-page analysis state
  const [analyzingUrl, setAnalyzingUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<SEOReport | null>(null);

  // Whole-website crawl state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgressStats | null>(null);
  const [crawlTargetDomain, setCrawlTargetDomain] = useState<string>('');
  const [activeCrawlId, setActiveCrawlId] = useState<string | null>(null);
  const [isCancellingCrawl, setIsCancellingCrawl] = useState(false);
  const [crawlReport, setCrawlReport] = useState<WebsiteCrawlReport | null>(null);

  // Drill-down inspection state for single page inside a crawl
  const [inspectedPageReport, setInspectedPageReport] = useState<SEOReport | null>(null);
  const [isDrillDown, setIsDrillDown] = useState(false);

  // Brief modal state
  const [activeBrief, setActiveBrief] = useState<ContentBrief | null>(null);

  // Common UI state
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState<string>('');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-load crawl if query param exists
  useEffect(() => {
    if (crawlIdParam && !crawlReport && !isCrawling) {
      setIsLoading(true);
      apiClient
        .getCrawlSession(crawlIdParam)
        .then((session) => {
          if (session && session.report) {
            setCrawlReport(session.report);
            setCrawlTargetDomain(session.domain || (session.url ? new URL(session.url).hostname : ''));
            setActiveCrawlId(session.id);
            setNavTab('analyzer');
            setCrawlSubTab('site_overview');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load crawl report from URL parameter.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [crawlIdParam]);

  // Auto-load single page report if query param exists
  useEffect(() => {
    if (reportIdParam && !report && !isLoading) {
      setIsLoading(true);
      apiClient
        .getJob(reportIdParam)
        .then((job) => {
          if (job && job.report) {
            setReport(job.report);
            setNavTab('analyzer');
            setReportSubTab('overview');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load report from URL parameter.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [reportIdParam]);

  // Handle hash navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'competitors') setNavTab('competitors');
      else if (hash === 'domain') setNavTab('domain');
      else if (hash === 'analyzer') setNavTab('analyzer');
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleAnalyze = async (
    url: string,
    mode: AnalysisType,
    pageLimit: number,
    checkRobots: boolean,
    checkSitemap: boolean,
    primaryKeyword?: string,
    renderMode?: RenderMode
  ) => {
    setError(null);
    setAnalyzingUrl(url);

    if (mode === 'single') {
      // Single Page Analysis Mode
      setIsLoading(true);
      setReport(null);
      setCrawlReport(null);
      setInspectedPageReport(null);
      setIsDrillDown(false);

      try {
        const response = await apiClient.analyzeUrl({
          url,
          checkRobots,
          checkSitemap,
          targetKeywords: primaryKeyword || undefined,
          renderMode,
        });

        if (response.report) {
          setReport(response.report);
          setReportSubTab('overview');
          setNavTab('analyzer');
        } else {
          throw new Error(response.error || 'Failed to generate report');
        }
      } catch (err: any) {
        setError(err.message || 'Analysis failed. Please verify the URL is public and accessible.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Whole Website Crawl Mode
      setIsCrawling(true);
      setCrawlReport(null);
      setReport(null);
      setInspectedPageReport(null);
      setIsDrillDown(false);
      setIsCancellingCrawl(false);

      try {
        let domain = url;
        try {
          domain = new URL(url).hostname;
        } catch {}
        setCrawlTargetDomain(domain);

        const initStats: CrawlProgressStats = {
          discovered: 1,
          queued: 1,
          analyzed: 0,
          skipped: 0,
          failed: 0,
          elapsedTimeMs: 0,
          percentComplete: 5,
          currentUrl: url,
        };
        setCrawlProgress(initStats);

        const startRes = await apiClient.startCrawl({
          url,
          startUrl: url,
          maxPages: pageLimit,
          checkRobots,
          checkSitemap,
          primaryKeyword,
        });

        const crawlId = startRes.crawlId;
        setActiveCrawlId(crawlId);

        // Start polling progress
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
          try {
            const session = await apiClient.getCrawlSession(crawlId);
            if (!session) return;

            setCrawlProgress(session.progress);

            if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsCrawling(false);

              if (session.report && session.report.pages.length > 0) {
                setCrawlReport(session.report);
                setCrawlSubTab('site_overview');
                setNavTab('analyzer');
              } else if (session.status === 'failed') {
                setError(session.errorMessage || 'Crawl session failed. Please verify URL accessibility.');
              }
            }
          } catch (pollErr: any) {
            console.error('Polling error:', pollErr);
          }
        }, 750);
      } catch (err: any) {
        setIsCrawling(false);
        setError(err.message || 'Failed to start website crawl.');
      }
    }
  };

  const handleCancelCrawl = async () => {
    if (!activeCrawlId || isCancellingCrawl) return;
    setIsCancellingCrawl(true);
    try {
      await apiClient.cancelCrawl(activeCrawlId);
    } catch (err: any) {
      console.error('Cancel error:', err);
    }
  };

  const handleInspectPage = async (pageUrl: string) => {
    if (!activeCrawlId && !crawlReport) return;
    setIsLoading(true);
    setError(null);

    try {
      const crawlId = activeCrawlId || crawlReport?.id || '';
      const data = await apiClient.getCrawlPages(crawlId, pageUrl);
      if (data && data.page && data.page.report) {
        setInspectedPageReport(data.page.report);
        setIsDrillDown(true);
        setReportSubTab('overview');
      } else {
        // Fallback: analyze page directly if not full cached report
        const resp = await apiClient.analyzeUrl({ url: pageUrl });
        if (resp.report) {
          setInspectedPageReport(resp.report);
          setIsDrillDown(true);
          setReportSubTab('overview');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load detailed page report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToWebsiteCrawl = () => {
    setIsDrillDown(false);
    setInspectedPageReport(null);
  };

  const handleNewAnalysis = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setReport(null);
    setCrawlReport(null);
    setInspectedPageReport(null);
    setIsDrillDown(false);
    setIsCrawling(false);
    setError(null);
    setNavTab('analyzer');
  };

  const handleSelectKeyword = (keyword: string) => {
    setSelectedKeywordFilter(keyword);
    setReportSubTab('keywords');
  };

  const hasActiveAnyReport = Boolean(crawlReport || report || inspectedPageReport);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Main Navigation Bar */}
      <Navbar
        activeTab={navTab}
        setActiveTab={setNavTab}
        hasActiveReport={hasActiveAnyReport}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDataSources={() => setIsDataSourcesOpen(true)}
        onNewAnalysis={handleNewAnalysis}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        {/* View 1: Competitor Comparison (2-5 Sites) */}
        {navTab === 'competitors' && <CompetitorCompareView />}

        {/* View 2: Domain Overview */}
        {navTab === 'domain' && <DomainOverviewView />}

        {/* View 3: Analyzer Mode */}
        {navTab === 'analyzer' && (
          <>
            {/* If no active report and not crawling or loading, show URL Input Hero */}
            {!report && !crawlReport && !isLoading && !isCrawling && (
              <div style={{ padding: '3rem 0' }}>
                <UrlInputForm onAnalyze={handleAnalyze} isLoading={isLoading || isCrawling} error={error} />
              </div>
            )}

            {/* If crawling multi-page website, show live crawl tracker */}
            {isCrawling && crawlProgress && (
              <CrawlProgressTracker
                stats={crawlProgress}
                targetDomain={crawlTargetDomain}
                onCancel={handleCancelCrawl}
                isCancelling={isCancellingCrawl}
              />
            )}

            {/* If single page analysis is loading, show single page pipeline tracker */}
            {isLoading && !isCrawling && !isDrillDown && <ProgressTracker url={analyzingUrl} />}

            {/* Drill-down: Single Page View inside a Crawl */}
            {isDrillDown && inspectedPageReport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Back to Crawl Bar */}
                <div
                  style={{
                    background: 'var(--bg-glass-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBackToWebsiteCrawl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid var(--primary)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Website Crawl Overview</span>
                  </button>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={15} color="var(--primary)" />
                    <span>Inspecting: <strong>{inspectedPageReport.url}</strong></span>
                  </div>
                </div>

                {/* Sub-tab navigation for inspected page */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.75rem',
                    overflowX: 'auto',
                  }}
                >
                  {[
                    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
                    { id: 'keywords', label: `Keyword Intel (${inspectedPageReport.keywords.all.length})`, icon: <Key size={15} /> },
                    { id: 'tags', label: `Tag Explorer (${inspectedPageReport.tagExplorer?.totalElementsCount || 'All'})`, icon: <Code size={15} /> },
                    { id: 'content_signals', label: `Content Signals & Heatmap`, icon: <Flame size={15} /> },
                    { id: 'onpage', label: 'On-Page & Headings', icon: <FileCode size={15} /> },
                    { id: 'technical', label: `Technical Audits (${inspectedPageReport.issues.length})`, icon: <ShieldAlert size={15} /> },
                    { id: 'robots_sitemap', label: 'Robots & Sitemap', icon: <Bot size={15} /> },
                    { id: 'content_intelligence', label: 'Semantic & Content Intel', icon: <Sparkles size={15} /> },
                    { id: 'links_images', label: `Links & Images`, icon: <LinkIcon size={15} /> },
                    { id: 'schema', label: `Schema (${inspectedPageReport.schemas.length})`, icon: <Code2 size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setReportSubTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: reportSubTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                        color: reportSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* SubTab Views for inspected page */}
                {reportSubTab === 'overview' && (
                  <OverviewDashboard
                    report={inspectedPageReport}
                    onNavigateTab={setReportSubTab}
                    onSelectKeyword={handleSelectKeyword}
                  />
                )}
                {reportSubTab === 'keywords' && (
                  <KeywordIntelligenceView
                    keywords={inspectedPageReport.keywords}
                    initialSearch={selectedKeywordFilter}
                    onSelectKeyword={(kw) => setSelectedKeywordFilter(kw)}
                  />
                )}
                {reportSubTab === 'tags' && inspectedPageReport.tagExplorer && (
                  <TagExplorerView tagExplorer={inspectedPageReport.tagExplorer} />
                )}
                {reportSubTab === 'content_signals' && inspectedPageReport.contentContribution && (
                  <ContentContributionView contribution={inspectedPageReport.contentContribution} />
                )}
                {reportSubTab === 'content_intelligence' && inspectedPageReport.contentIntelligence && (
                  <ContentSemanticIntelligenceView intelligence={inspectedPageReport.contentIntelligence} />
                )}
                {reportSubTab === 'onpage' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <MetadataPreviewer onPage={inspectedPageReport.onPage} pageUrl={inspectedPageReport.url} />
                    <HeadingHierarchyView headings={inspectedPageReport.onPage.headings} />
                    <ContentAnalysisView onPage={inspectedPageReport.onPage} />
                  </div>
                )}
                {reportSubTab === 'technical' && (
                  <TechnicalSeoIntelligenceView
                    technical={inspectedPageReport.technical}
                    onPage={inspectedPageReport.onPage}
                    issues={inspectedPageReport.issues}
                  />
                )}
                {reportSubTab === 'robots_sitemap' && (
                  <RobotsSitemapView
                    robots={inspectedPageReport.technical.robotsAnalysis}
                    sitemap={inspectedPageReport.technical.sitemapAnalysis}
                  />
                )}
                {reportSubTab === 'links_images' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <LinksView links={inspectedPageReport.links} />
                    <ImagesView images={inspectedPageReport.images} />
                  </div>
                )}
                {reportSubTab === 'schema' && (
                  <SchemaView schemas={inspectedPageReport.schemas} />
                )}
              </div>
            )}

            {/* Whole Website Crawl Report Mode */}
            {crawlReport && !isCrawling && !isDrillDown && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Multi-Page Crawl Sub-Tab Navigation Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.75rem',
                    overflowX: 'auto',
                  }}
                >
                  {[
                    { id: 'site_overview', label: 'Website Overview', icon: <LayoutDashboard size={15} /> },
                    { id: 'pages_list', label: `Pages Crawled (${crawlReport.pages.length})`, icon: <FileText size={15} /> },
                    { id: 'keyword_strategy', label: `Keyword Strategy (${crawlReport.keywordStrategy.keywords.length})`, icon: <Sparkles size={15} /> },
                    { id: 'seo_recommendations', label: `SEO Recommendations (${crawlReport.recommendations.all.length})`, icon: <Zap size={15} /> },
                    { id: 'content_strategy', label: 'Content Strategy & Gaps', icon: <Layers size={15} /> },
                    { id: 'cannibalization', label: `Cannibalization (${crawlReport.cannibalization.length})`, icon: <ShieldAlert size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCrawlSubTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: crawlSubTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                        color: crawlSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Crawl Tab 1: Website Overview */}
                {crawlSubTab === 'site_overview' && (
                  <WebsiteOverviewDashboard
                    report={crawlReport}
                    onSelectPage={handleInspectPage}
                  />
                )}

                {/* Crawl Tab 2: Pages List */}
                {crawlSubTab === 'pages_list' && (
                  <PagesListView
                    pages={crawlReport.pages}
                    onSelectPage={handleInspectPage}
                  />
                )}

                {/* Crawl Tab 3: Keyword Strategy */}
                {crawlSubTab === 'keyword_strategy' && (
                  <KeywordStrategyView
                    primaryKeyword={crawlReport.keywordStrategy.primaryKeyword}
                    topicCoverageScore={crawlReport.keywordStrategy.topicCoverageScore}
                    topicCoverageMethodology={crawlReport.keywordStrategy.topicCoverageMethodology || crawlReport.contentStrategy.topicCoverageMethodology}
                    keywords={crawlReport.keywordStrategy.keywords}
                    clusters={crawlReport.keywordStrategy.clusters}
                    briefs={crawlReport.keywordStrategy.briefs || crawlReport.briefs || []}
                    onOpenBriefModal={(brief) => setActiveBrief(brief)}
                  />
                )}

                {/* Crawl Tab 4: SEO Recommendations */}
                {crawlSubTab === 'seo_recommendations' && (
                  <SeoRecommendationsView
                    recommendations={crawlReport.recommendations}
                    onSelectPage={handleInspectPage}
                  />
                )}

                {/* Crawl Tab 5: Content Strategy */}
                {crawlSubTab === 'content_strategy' && (
                  <ContentStrategyView
                    strategy={crawlReport.contentStrategy}
                    onGenerateBriefForTopic={(topic) => {
                      const allBriefs = crawlReport.keywordStrategy.briefs || crawlReport.briefs || [];
                      const brief: ContentBrief = allBriefs.find(
                        (b: ContentBrief) => b.primaryKeyword.toLowerCase() === topic.toLowerCase()
                      ) || {
                        id: `brief-${Math.random().toString(36).slice(2, 9)}`,
                        primaryKeyword: topic,
                        estimatedSearchIntent: 'Informational',
                        suggestedH1: `Comprehensive Guide to ${topic}`,
                        suggestedH2s: [`What is ${topic}?`, `Key Benefits of ${topic}`, `Best Practices & Strategies`, `Common Mistakes to Avoid`],
                        suggestedH3s: [`Step-by-step implementation`, `Tools and Resources`],
                        secondaryKeywords: [`${topic} guide`, `${topic} tips`, `${topic} overview`],
                        supportingKeywords: ['best practices', 'strategy', 'implementation'],
                        questionsToAnswer: [`How does ${topic} work?`, `Why is ${topic} important?`],
                        entitiesToCover: [topic, 'Optimization', 'Content Quality'],
                        internalLinksToAdd: [{ anchorText: topic, targetUrl: '/', reason: 'Hub context' }],
                        contentGaps: ['Ensure in-depth coverage and practical examples.'],
                        recommendedSections: ['Introduction', 'Key Concepts', 'Action Plan', 'FAQ'],
                        technicalImprovements: ['Ensure fast loading speed', 'Implement structured Article schema'],
                      };
                      setActiveBrief(brief);
                    }}
                  />
                )}

                {/* Crawl Tab 6: Cannibalization & Duplication */}
                {crawlSubTab === 'cannibalization' && (
                  <CannibalizationView
                    cannibalization={crawlReport.cannibalization}
                    contentDuplication={crawlReport.contentDuplication}
                    onSelectPage={handleInspectPage}
                  />
                )}
              </div>
            )}

            {/* Single Page Report Mode (Direct Single Page Audit) */}
            {report && !crawlReport && !isLoading && !isDrillDown && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Secondary Single-Page Navigation Tabs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.75rem',
                    overflowX: 'auto',
                  }}
                >
                  {[
                    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
                    { id: 'keywords', label: `Keyword Intel (${report.keywords.all.length})`, icon: <Key size={15} /> },
                    { id: 'tags', label: `Tag Explorer (${report.tagExplorer?.totalElementsCount || 'All'})`, icon: <Code size={15} /> },
                    { id: 'content_signals', label: `Content Signals & Heatmap`, icon: <Flame size={15} /> },
                    { id: 'onpage', label: 'On-Page & Headings', icon: <FileCode size={15} /> },
                    { id: 'technical', label: `Technical Audits (${report.issues.length})`, icon: <ShieldAlert size={15} /> },
                    { id: 'robots_sitemap', label: 'Robots & Sitemap', icon: <Bot size={15} /> },
                    { id: 'content_intelligence', label: 'Semantic & Content Intel', icon: <Sparkles size={15} /> },
                    { id: 'links_images', label: `Links & Images`, icon: <LinkIcon size={15} /> },
                    { id: 'schema', label: `Schema (${report.schemas.length})`, icon: <Code2 size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setReportSubTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: reportSubTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                        color: reportSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* SubTab 1: Overview Dashboard */}
                {reportSubTab === 'overview' && (
                  <OverviewDashboard
                    report={report}
                    onNavigateTab={setReportSubTab}
                    onSelectKeyword={handleSelectKeyword}
                  />
                )}

                {/* SubTab 2: Keyword Intelligence Suite */}
                {reportSubTab === 'keywords' && (
                  <KeywordIntelligenceView
                    keywords={report.keywords}
                    initialSearch={selectedKeywordFilter}
                    onSelectKeyword={(kw) => setSelectedKeywordFilter(kw)}
                  />
                )}

                {/* SubTab 3: Tag / Page Element Explorer */}
                {reportSubTab === 'tags' && report.tagExplorer && (
                  <TagExplorerView tagExplorer={report.tagExplorer} />
                )}

                {/* SubTab 4: Content Signal Contribution & Heatmap */}
                {reportSubTab === 'content_signals' && report.contentContribution && (
                  <ContentContributionView contribution={report.contentContribution} />
                )}

                {/* SubTab 4.5: Semantic & Content Intelligence */}
                {reportSubTab === 'content_intelligence' && report.contentIntelligence && (
                  <ContentSemanticIntelligenceView intelligence={report.contentIntelligence} />
                )}

                {/* SubTab 5: On-Page & Headings */}
                {reportSubTab === 'onpage' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <MetadataPreviewer onPage={report.onPage} pageUrl={report.url} />
                    <HeadingHierarchyView headings={report.onPage.headings} />
                    <ContentAnalysisView onPage={report.onPage} />
                  </div>
                )}

                {/* SubTab 6: Technical SEO Audits */}
                {reportSubTab === 'technical' && (
                  <TechnicalSeoIntelligenceView
                    technical={report.technical}
                    onPage={report.onPage}
                    issues={report.issues}
                  />
                )}

                {/* SubTab 7: Robots.txt & Sitemap */}
                {reportSubTab === 'robots_sitemap' && (
                  <RobotsSitemapView
                    robots={report.technical.robotsAnalysis}
                    sitemap={report.technical.sitemapAnalysis}
                  />
                )}

                {/* SubTab 8: Links & Images */}
                {reportSubTab === 'links_images' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <LinksView links={report.links} />
                    <ImagesView images={report.images} />
                  </div>
                )}

                {/* SubTab 9: Schema / Structured Data */}
                {reportSubTab === 'schema' && (
                  <SchemaView schemas={report.schemas} />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Content Brief Modal */}
      {activeBrief && (
        <ContentBriefModal brief={activeBrief} onClose={() => setActiveBrief(null)} />
      )}

      {/* Export Modal (Supports both single page and whole website crawl) */}
      {isExportOpen && (report || crawlReport || inspectedPageReport) && (
        <ExportModal
          report={report || inspectedPageReport || undefined}
          crawlReport={crawlReport || undefined}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Data Sources Settings Modal */}
      {isDataSourcesOpen && (
        <DataSourcesModal onClose={() => setIsDataSourcesOpen(false)} />
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 2rem', background: 'var(--bg-glass)', marginTop: 'auto', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <strong>SEO Intel Pro Platform Expansion</strong> — Multi-Page Website Analysis & Keyword Strategy
          </div>
          <div>
            Zero Metric Fabrication | Category A/B/C Classification | 28-Sheet XLSX & CSV Exports
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading SEO Analyzer...</div>}>
      <AnalyzerContent />
    </Suspense>
  );
}
