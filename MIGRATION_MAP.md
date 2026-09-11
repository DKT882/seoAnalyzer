# Next.js Full Architecture Migration Mapping

## 1. System Overview & Target Architecture
This document maps every module, file, route, and dependency in the current monorepo (React + Vite + Express) to the target unified **Next.js (App Router) + TypeScript** application.

---

## 2. Frontend Component & Page Mapping

| Existing React/Vite File | Target Next.js File | Server/Client Classification | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| `frontend/src/App.tsx` | `app/page.tsx` & `app/layout.tsx` | Client / Server Shell | Root layout and main analyzer page shell |
| `frontend/src/pages/HistoryPage.tsx` | `app/history/page.tsx` | Client Component | Historical report browsing & reloading |
| `frontend/src/pages/MethodologyPage.tsx` | `app/methodology/page.tsx` | Server Component | Static SEO scoring documentation & Category A/B/C disclosure |
| `frontend/src/components/Navbar.tsx` | `components/Navbar.tsx` | Client Component | Top navigation bar with Next.js `Link` & active pathname |
| `frontend/src/components/MetricCard.tsx` | `components/ui/MetricCard.tsx` | Client/Server Component | Metric cards with badges |
| `frontend/src/components/ScoreGauge.tsx` | `components/ui/ScoreGauge.tsx` | Client Component | Visual SVG radial score gauge |
| `frontend/src/components/IssueBadge.tsx` | `components/ui/IssueBadge.tsx` | Client/Server Component | Issue severity pills |
| `frontend/src/features/analyzer/UrlInputForm.tsx` | `components/analyzer/UrlInputForm.tsx` | Client Component | URL submission and configuration form |
| `frontend/src/features/analyzer/ProgressTracker.tsx` | `components/analyzer/ProgressTracker.tsx` | Client Component | Real-time analysis step progress tracker |
| `frontend/src/features/dashboard/OverviewDashboard.tsx` | `components/dashboard/OverviewDashboard.tsx` | Client Component | Overview metrics, summary cards, and score gauges |
| `frontend/src/features/keywords/KeywordIntelligenceView.tsx` | `components/keywords/KeywordIntelligenceView.tsx` | Client Component | Keyword categorization tabbed container |
| `frontend/src/features/keywords/KeywordTable.tsx` | `components/keywords/KeywordTable.tsx` | Client Component | Filterable, sortable, paginated keyword table |
| `frontend/src/features/keywords/RankingOpportunityView.tsx` | `components/keywords/RankingOpportunityView.tsx` | Client Component | Actionable ranking opportunity cards |
| `frontend/src/features/keywords/TopicClustersView.tsx` | `components/keywords/TopicClustersView.tsx` | Client Component | Topic cluster cards and named entities |
| `frontend/src/features/tags/TagExplorerView.tsx` | `components/tags/TagExplorerView.tsx` | Client Component | Deep structural HTML tag and element inspector |
| `frontend/src/features/content/ContentContributionView.tsx` | `components/content/ContentContributionView.tsx` | Client Component | Section contribution score and signal heatmap |
| `frontend/src/features/competitors/CompetitorCompareView.tsx` | `components/competitors/CompetitorCompareView.tsx` | Client Component | Multi-domain matrix, keyword gap, content gap, outrank engine |
| `frontend/src/features/domain/DomainOverviewView.tsx` | `components/domain/DomainOverviewView.tsx` | Client Component | Domain health summary with Category A/B/C metrics |
| `frontend/src/features/onpage/HeadingHierarchyView.tsx` | `components/onpage/HeadingHierarchyView.tsx` | Client Component | H1-H6 hierarchy tree view |
| `frontend/src/features/onpage/MetadataPreviewer.tsx` | `components/onpage/MetadataPreviewer.tsx` | Client Component | Google SERP preview and social meta cards |
| `frontend/src/features/onpage/ContentAnalysisView.tsx` | `components/onpage/ContentAnalysisView.tsx` | Client Component | Readability, word count, text-to-HTML ratio |
| `frontend/src/features/technical/TechnicalAuditsView.tsx` | `components/technical/TechnicalAuditsView.tsx` | Client Component | Categorized audit issues and recommendations |
| `frontend/src/features/technical/RobotsSitemapView.tsx` | `components/technical/RobotsSitemapView.tsx` | Client Component | Robots.txt and XML sitemap inspection |
| `frontend/src/features/links/LinksView.tsx` | `components/links/LinksView.tsx` | Client Component | Internal vs External links matrix |
| `frontend/src/features/images/ImagesView.tsx` | `components/images/ImagesView.tsx` | Client Component | Image ALT tags and missing attribute audits |
| `frontend/src/features/schema/SchemaView.tsx` | `components/schema/SchemaView.tsx` | Client Component | JSON-LD schema validator & microdata viewer |
| `frontend/src/features/export/ExportModal.tsx` | `components/export/ExportModal.tsx` | Client Component | 18-sheet XLSX, CSV, JSON, and HTML export dialog |
| `frontend/src/features/settings/DataSourcesModal.tsx` | `components/settings/DataSourcesModal.tsx` | Client Component | Data provider status and disclosures modal |
| `frontend/src/services/apiClient.ts` | `lib/api/apiClient.ts` | Client Safe | Client-side fetch helper communicating with `/api/*` |
| `frontend/src/styles/index.css` | `app/globals.css` | Global Stylesheet | Modern dark-mode glassmorphic theme tokens |
| `frontend/src/utils/formatters.ts` | `lib/utils/formatters.ts` | Shared Utility | Score colors, number formats, byte conversions |
| `frontend/src/utils/router.ts` | Next.js App Router | Replaced by Next.js | Replaced with native Next.js navigation |

---

## 3. Backend API & Route Handlers Mapping

| Existing Express Endpoint | Target Next.js Route Handler | HTTP Method | Server/Client Classification | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/analyze` | `app/api/analyze/route.ts` | `POST` | SERVER ONLY | Validate URL, queue job, start safe crawl & analysis |
| `GET /api/jobs/:id` | `app/api/jobs/[id]/route.ts` | `GET` | SERVER ONLY | Polling endpoint for analysis job progress and report |
| `GET /api/history` | `app/api/history/route.ts` | `GET` | SERVER ONLY | Return recent reports from SQLite database |
| `POST /api/competitors/compare` | `app/api/competitors/compare/route.ts` | `POST` | SERVER ONLY | Crawl & compare 2–5 URLs in parallel |
| `GET /api/domain-overview` | `app/api/domain-overview/route.ts` | `GET` | SERVER ONLY | Return domain-level health & provider disclosures |
| `GET /api/settings/data-sources` | `app/api/settings/data-sources/route.ts` | `GET` | SERVER ONLY | Return external provider connectivity statuses |
| `GET /api/export/:id` | `app/api/export/[id]/route.ts` | `GET` | SERVER ONLY | Multi-sheet XLSX, CSV, JSON, and HTML stream |
| `GET /api/health` | `app/api/health/route.ts` | `GET` | SERVER ONLY | Health check and environment metadata |

---

## 4. Backend Engine & Business Logic Mapping

| Existing Backend Module | Target Next.js Path | Server/Client Classification | Responsibility |
| :--- | :--- | :--- | :--- |
| `backend/src/crawler/safeFetcher.ts` | `lib/crawler/safeFetcher.ts` | SERVER ONLY | SSRF-protected HTTP client, redirect checks, size limits |
| `backend/src/crawler/browserFallback.ts` | `lib/crawler/browserFallback.ts` | SERVER ONLY | Headless/SPA fallback detector |
| `backend/src/utils/ssrfGuard.ts` | `lib/utils/ssrfGuard.ts` | SERVER ONLY | Private/reserved IPv4 & IPv6 DNS protection guard |
| `backend/src/utils/urlUtils.ts` | `lib/utils/urlUtils.ts` | SERVER ONLY | Safe URL normalization & protocol verification |
| `backend/src/utils/logger.ts` | `lib/utils/logger.ts` | SERVER ONLY | Structured logging |
| `backend/src/parser/htmlParser.ts` | `lib/parser/htmlParser.ts` | SERVER ONLY | Cheerio DOM traversal and content extraction |
| `backend/src/parser/headingTree.ts` | `lib/parser/headingTree.ts` | SERVER ONLY | Heading hierarchy tree builder |
| `backend/src/parser/tagExplorer.ts` | `lib/parser/tagExplorer.ts` | SERVER ONLY | Deep HTML tag, attribute, and metadata inspector |
| `backend/src/keywords/keywordExtractor.ts` | `lib/keywords/keywordExtractor.ts` | SERVER ONLY | N-gram generation, classification, frequency, density |
| `backend/src/keywords/prominence.ts` | `lib/keywords/prominence.ts` | SERVER ONLY | Positional prominence weighting |
| `backend/src/keywords/scoring.ts` | `lib/keywords/scoring.ts` | SERVER ONLY | 0–100 keyword scoring engine |
| `backend/src/nlp/tokenizer.ts` | `lib/nlp/tokenizer.ts` | SERVER ONLY | Text tokenization and sanitization |
| `backend/src/nlp/stemmer.ts` | `lib/nlp/stemmer.ts` | SERVER ONLY | Porter Stemmer algorithm |
| `backend/src/nlp/stopwords.ts` | `lib/nlp/stopwords.ts` | SERVER ONLY | Stopword dictionary & edge pruning |
| `backend/src/nlp/tfidf.ts` | `lib/nlp/tfidf.ts` | SERVER ONLY | Section-weighted TF-IDF calculation |
| `backend/src/nlp/clusterer.ts` | `lib/nlp/clusterer.ts` | SERVER ONLY | Deterministic semantic topic clusterer |
| `backend/src/seo/contentContribution.ts` | `lib/seo/contentContribution.ts` | SERVER ONLY | Section signal contribution & heatmap generation |
| `backend/src/seo/metadataExtractor.ts` | `lib/seo/metadataExtractor.ts` | SERVER ONLY | Title, description, canonical, robots meta |
| `backend/src/seo/socialMeta.ts` | `lib/seo/socialMeta.ts` | SERVER ONLY | OpenGraph & Twitter card parser |
| `backend/src/technical/technicalAuditor.ts` | `lib/technical/technicalAuditor.ts` | SERVER ONLY | 30+ technical SEO checks & recommendations |
| `backend/src/robots/robotsParser.ts` | `lib/robots/robotsParser.ts` | SERVER ONLY | Robots.txt fetching and rule analysis |
| `backend/src/sitemap/sitemapParser.ts` | `lib/sitemap/sitemapParser.ts` | SERVER ONLY | XML sitemap parsing & index handling |
| `backend/src/links/linkAnalyzer.ts` | `lib/links/linkAnalyzer.ts` | SERVER ONLY | Internal/external link extraction & anchor auditing |
| `backend/src/images/imageAnalyzer.ts` | `lib/images/imageAnalyzer.ts` | SERVER ONLY | Image ALT tag, dimension, and lazy loading audits |
| `backend/src/schema/schemaExtractor.ts` | `lib/schema/schemaExtractor.ts` | SERVER ONLY | JSON-LD & Microdata extraction & validation |
| `backend/src/competitors/competitorComparator.ts` | `lib/competitors/competitorComparator.ts` | SERVER ONLY | Multi-URL crawl, gap analysis, outrank engine |
| `backend/src/providers/index.ts` | `lib/providers/index.ts` | SERVER ONLY | Data provider status manager & abstractions |
| `backend/src/reports/reportGenerator.ts` | `lib/reports/reportGenerator.ts` | SERVER ONLY | Full SEO report builder & aggregator |
| `backend/src/reports/seoScorer.ts` | `lib/reports/seoScorer.ts` | SERVER ONLY | Category score weighting & composite grade |
| `backend/src/reports/xlsxExporter.ts` | `lib/reports/xlsxExporter.ts` | SERVER ONLY | 18-sheet XLSX workbook generator (SheetJS) |
| `backend/src/reports/exporter.ts` | `lib/reports/exporter.ts` | SERVER ONLY | Granular CSV, printable HTML, & JSON exporters |
| `backend/src/db/database.ts` | `lib/db/database.ts` | SERVER ONLY | SQLite connection singleton (better-sqlite3) |
| `backend/src/db/repository.ts` | `lib/db/repository.ts` | SERVER ONLY | Reports, jobs, and history data access layer |
| `backend/src/config.ts` | `lib/config.ts` | SERVER ONLY | Environment variable validation & defaults |

---

## 5. Types & Shared Package Mapping

| Existing File | Target Next.js Path | Classification |
| :--- | :--- | :--- |
| `shared/src/types/index.ts` | `types/index.ts` | SHARED |
| `shared/src/constants/index.ts` | `lib/constants/index.ts` | SHARED |
| `shared/src/index.ts` | `types/index.ts` | SHARED |

---

## 6. Dependencies Migration Audit

| Package | Current Usage | Migration Action | Reason |
| :--- | :--- | :--- | :--- |
| `next` | None | **ADD** (`^15.2.0` or `^15.x`) | Target framework |
| `react` | `^19.0.0` | **PRESERVE** (`^19.0.0`) | Next.js 15 UI |
| `react-dom` | `^19.0.0` | **PRESERVE** (`^19.0.0`) | Next.js 15 UI |
| `lucide-react` | `^1.16.0` | **PRESERVE** | Icon system |
| `better-sqlite3` | `^11.8.1` | **PRESERVE** | SQLite database engine |
| `cheerio` | `^1.0.0` | **PRESERVE** | HTML DOM extraction |
| `fast-xml-parser` | `^4.5.3` | **PRESERVE** | Sitemap XML parsing |
| `robots-parser` | `^3.0.1` | **PRESERVE** | Robots.txt parser |
| `ipaddr.js` | `^2.2.0` | **PRESERVE** | SSRF IP range guard |
| `xlsx` | `^0.18.5` | **PRESERVE** | 18-sheet Excel workbook export |
| `zod` | `^3.24.2` | **PRESERVE** | Schema & request validation |
| `express` | `^4.21.2` | **REMOVE** | Replaced by Next.js Route Handlers |
| `cors` | `^2.8.5` | **REMOVE** | Same-origin Next.js App Router |
| `vite` | `^6.2.0` | **REMOVE** | Replaced by Next.js bundler |
| `@vitejs/plugin-react` | `^4.3.4` | **REMOVE** | Replaced by Next.js |
| `tsx` | `^4.19.3` | **PRESERVE** | For running native test runner |
| `typescript` | `^5.8.2` | **PRESERVE** | TypeScript engine |

---

## 7. Long-Running Job Architecture in Next.js

1. **In-Memory & SQLite Job Store**: The existing `AnalysisJob` tracking in `database.ts` and `repository.ts` allows asynchronous background execution while client polling queries `/api/jobs/[id]`.
2. **Deterministic Timeouts**: `safeFetcher` enforces a 15-second strict timeout, preventing hung requests.
3. **Route Handlers Performance**: Next.js route handlers stream XLSX, CSV, and HTML directly using standard Web `Response` with appropriate MIME types and headers.
