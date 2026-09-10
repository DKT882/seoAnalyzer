import { useState, useEffect, useCallback } from 'react';
import { SEOReport } from '@seo-analyzer/shared';
import { apiClient } from './services/apiClient.js';
import { Navbar } from './components/Navbar.js';
import { UrlInputForm } from './features/analyzer/UrlInputForm.js';
import { ProgressTracker } from './features/analyzer/ProgressTracker.js';
import { OverviewDashboard } from './features/dashboard/OverviewDashboard.js';
import { KeywordIntelligenceView } from './features/keywords/KeywordIntelligenceView.js';
import { TagExplorerView } from './features/tags/TagExplorerView.js';
import { ContentContributionView } from './features/content/ContentContributionView.js';
import { CompetitorCompareView } from './features/competitors/CompetitorCompareView.js';
import { DomainOverviewView } from './features/domain/DomainOverviewView.js';
import { HeadingHierarchyView } from './features/onpage/HeadingHierarchyView.js';
import { MetadataPreviewer } from './features/onpage/MetadataPreviewer.js';
import { ContentAnalysisView } from './features/onpage/ContentAnalysisView.js';
import { TechnicalAuditsView } from './features/technical/TechnicalAuditsView.js';
import { RobotsSitemapView } from './features/technical/RobotsSitemapView.js';
import { LinksView } from './features/links/LinksView.js';
import { ImagesView } from './features/images/ImagesView.js';
import { SchemaView } from './features/schema/SchemaView.js';
import { ExportModal } from './features/export/ExportModal.js';
import { DataSourcesModal } from './features/settings/DataSourcesModal.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { MethodologyPage } from './pages/MethodologyPage.js';
import { parseCurrentRoute, pushRoute, NavTab } from './utils/router.js';

import {
  LayoutDashboard,
  Key,
  Code,
  Flame,
  FileCode,
  ShieldAlert,
  Bot,
  Link,
  Code2,
} from 'lucide-react';

export default function App() {
  const initialRoute = parseCurrentRoute();
  const [navTab, setNavTabState] = useState<NavTab>(initialRoute.navTab);
  const [reportSubTab, setReportSubTabState] = useState<string>(initialRoute.reportSubTab);

  const [analyzingUrl, setAnalyzingUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SEOReport | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState<string>('');

  // Synchronize Tab & Address Bar
  const setNavTab = useCallback((tab: NavTab) => {
    setNavTabState(tab);
    pushRoute(tab, tab === 'analyzer' ? report?.id : undefined, reportSubTab);
  }, [report?.id, reportSubTab]);

  // Synchronize SubTab & Address Bar
  const setReportSubTab = useCallback((subTab: string) => {
    setReportSubTabState(subTab);
    pushRoute('analyzer', report?.id, subTab);
  }, [report?.id]);

  // Auto-load report if URL contains /report/:id on initial load
  useEffect(() => {
    if (initialRoute.reportId) {
      setIsLoading(true);
      apiClient
        .getJob(initialRoute.reportId)
        .then((job) => {
          if (job && job.report) {
            setReport(job.report);
            setNavTabState('analyzer');
            setReportSubTabState(initialRoute.reportSubTab || 'overview');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load report from URL.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  // Listen for browser Back & Forward button events in Chrome
  useEffect(() => {
    const handlePopState = () => {
      const current = parseCurrentRoute();
      setNavTabState(current.navTab);
      setReportSubTabState(current.reportSubTab);

      if (current.reportId && current.reportId !== report?.id) {
        setIsLoading(true);
        apiClient
          .getJob(current.reportId)
          .then((job) => {
            if (job && job.report) {
              setReport(job.report);
            }
          })
          .catch(() => {})
          .finally(() => setIsLoading(false));
      } else if (!current.reportId && current.navTab === 'analyzer' && window.location.pathname === '/analyzer') {
        setReport(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [report?.id]);

  const handleAnalyze = async (url: string, checkRobots: boolean, checkSitemap: boolean) => {
    setIsLoading(true);
    setError(null);
    setAnalyzingUrl(url);

    try {
      const response = await apiClient.analyzeUrl({
        url,
        checkRobots,
        checkSitemap,
      });

      if (response.report) {
        setReport(response.report);
        setReportSubTabState('overview');
        setNavTabState('analyzer');
        pushRoute('analyzer', response.report.id, 'overview');
      } else {
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please verify the URL is public and accessible.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectJobFromHistory = async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const job = await apiClient.getJob(jobId);
      if (job && job.report) {
        setReport(job.report);
        setNavTabState('analyzer');
        setReportSubTabState('overview');
        pushRoute('analyzer', jobId, 'overview');
      } else {
        throw new Error('Report data unavailable for this archived job.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load archived report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setReport(null);
    setError(null);
    setNavTabState('analyzer');
    pushRoute('analyzer');
  };

  const handleSelectKeyword = (keyword: string) => {
    setSelectedKeywordFilter(keyword);
    setReportSubTab('keywords');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Main Navigation Bar */}
      <Navbar
        activeTab={navTab}
        setActiveTab={setNavTab}
        hasActiveReport={Boolean(report)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDataSources={() => setIsDataSourcesOpen(true)}
        onNewAnalysis={handleNewAnalysis}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        {/* View 1: History Page */}
        {navTab === 'history' && (
          <HistoryPage onSelectJob={handleSelectJobFromHistory} />
        )}

        {/* View 2: Methodology Page */}
        {navTab === 'methodology' && (
          <MethodologyPage />
        )}

        {/* View 3: Competitor Comparison (2-5 Sites) */}
        {navTab === 'competitors' && (
          <CompetitorCompareView />
        )}

        {/* View 4: Domain Overview */}
        {navTab === 'domain' && (
          <DomainOverviewView />
        )}

        {/* View 5: Analyzer Mode */}
        {navTab === 'analyzer' && (
          <>
            {/* If no active report and not loading, show URL Input Hero */}
            {!report && !isLoading && (
              <div style={{ padding: '3rem 0' }}>
                <UrlInputForm onAnalyze={handleAnalyze} isLoading={isLoading} error={error} />
              </div>
            )}

            {/* If loading, show live pipeline tracker */}
            {isLoading && (
              <ProgressTracker url={analyzingUrl} />
            )}

            {/* If report is loaded, show sub-tab bar and dashboard views */}
            {report && !isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Secondary Report Navigation Tabs */}
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
                    { id: 'links_images', label: `Links & Images`, icon: <Link size={15} /> },
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
                  <TechnicalAuditsView issues={report.issues} />
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

      {/* Export Modal */}
      {isExportOpen && report && (
        <ExportModal report={report} onClose={() => setIsExportOpen(false)} />
      )}

      {/* Data Sources Settings Modal */}
      {isDataSourcesOpen && (
        <DataSourcesModal onClose={() => setIsDataSourcesOpen(false)} />
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 2rem', background: 'var(--bg-glass)', marginTop: 'auto', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <strong>SEO Intel Pro Platform Expansion</strong> — Competitive Intelligence & Content Analysis
          </div>
          <div>
            Zero Metric Fabrication | Category A/B/C Classification | 18-Sheet XLSX & CSV Exports
          </div>
        </div>
      </footer>
    </div>
  );
}
