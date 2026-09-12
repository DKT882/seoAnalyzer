# Browser Rendering Architecture Plan (Phase 4 Roadmap)

## 1. Executive Summary

The current SEO Analyzer engine operates via high-throughput **Static HTML Ingestion** (`fetch` + Cheerio parser). While this is lightning fast (< 100ms parse time) and completely accurate for standard server-rendered HTML (SSG/SSR), modern single-page applications (React/Next.js client-side navigations, Vue/Nuxt SPAs, Angular, Svelte) frequently inject critical SEO elements on the client side after JavaScript execution.

This document outlines the architectural plan for integrating a **Headless Chromium / Playwright Rendering Layer** in future phases without breaking existing static analysis or introducing false assumptions.

---

## 2. Current Architecture vs. Future Hybrid Architecture

### 2.1 Current Pipeline (Static Extraction)

```
Target URL
   │
   ▼
SSRF Guard & Safe HTTP Fetch (GET)
   │
   ▼
Raw Static HTML Response
   │
   ▼
Cheerio DOM Parser (lib/parser/cheerioParser.ts)
   │
   ├── Technical SEO Auditor (lib/technical/technicalAuditor.ts)
   ├── Keyword & Topic Extractor (lib/keywords/keywordExtractor.ts)
   └── Structured Data Extractor (lib/parser/schemaParser.ts)
   │
   ▼
Audit Findings + Evidence Merging
   │
   ▼
SEO Score Ledger & Structured Recommendations
```

### 2.2 Future Hybrid Pipeline (Static + Headless Chromium Execution)

```
Target URL
   │
   ▼
Safe HTTP Fetch (Static HTML) ───► Static Pre-Filter & Fast Audit (<100ms)
   │
   ├── (If SPA / JS detected or User selects "Deep Render")
   │
   ▼
Playwright / Puppeteer Pool (Headless Chromium)
   │
   ├── Network Idle / Hydration Wait (`networkidle` / custom selector wait)
   ├── Console & Runtime Error Capture
   ├── Resource Timing & Layout Shift Telemetry
   │
   ▼
Hydrated / Post-Render DOM Snapshot
   │
   ▼
Cheerio Parser (Rendered DOM)
   │
   ▼
Dual-DOM Evidence Comparator (Static vs. Rendered Diff)
   │
   ├── Identifies Client-Only Injected Headings & Metadata
   ├── Identifies JavaScript Hydration Mismatches (SSR Drift)
   └── Detects Content Hidden Behind Client Interaction
   │
   ▼
Unified SEO Report (with `rendering_mode: "HYBRID_DOM"`)
```

---

## 3. SEO Signals Requiring Rendered DOM Inspection

When analyzing client-rendered websites (SPA / CSR), the rendered DOM provides signals invisible or incomplete in the raw initial HTML payload:

| Signal Category | Initial Static HTML (Raw) | Post-Hydration DOM (Rendered) | SEO Risk / Diagnostic Value |
|---|---|---|---|
| **H1 & Heading Structure** | Placeholder (`<h1 id="title"></h1>` or generic loader) | Full text (`<h1>Enterprise Cloud Security Platform</h1>`) | Prevents false `H1_MISSING` flags on SPAs. |
| **Meta Description & Title** | Default template string or empty tags | Injected by `react-helmet`, `next/head`, or client router | Verifies whether client-side metadata actually mounts. |
| **Body Content & Word Count** | 50–100 words (shell/scripts only) | 1,200 words (dynamically hydrated content) | Prevents false `THIN_CONTENT` flags on legitimate SPAs. |
| **Internal & External Links** | Only `<script>` tags, zero `<a>` tags | Hydrated `<a href="/...">` navigation links | Enables accurate crawlability & link equity analysis. |
| **Images & Responsive `srcset`** | Raw `data-src` or lazy-loading placeholders | Computed `src`, actual dimensional attributes | Audits real image load states and lazy-loading safety. |
| **JSON-LD / Structured Data** | None or static root schema | Dynamic product/article schema injected by client components | Catches schema injected at runtime. |
| **Indexability Directives** | `robots.txt` + static headers | Dynamically inserted `<meta name="robots" content="noindex">` | Catches dynamic blocking tags injected via tag managers (GTM). |

---

## 4. Dual-DOM Diffing & Diagnostic Insights

Rather than simply replacing static analysis, the future engine will analyze **both** and compute a **Hydration & Render Delta**:

```typescript
interface HydrationDelta {
  staticTitle: string | null;
  renderedTitle: string | null;
  titleHydratedByClient: boolean;
  
  staticH1Count: number;
  renderedH1Count: number;
  headingsInjectedByJs: boolean;
  
  staticWordCount: number;
  renderedWordCount: number;
  contentJsDependent: boolean;
  
  staticLinkCount: number;
  renderedLinkCount: number;
  crawlableWithoutJs: boolean;
}
```

### Key Diagnostic Rules Enabled by the Delta:
1. **`JS_CONTENT_DEPENDENCY`**: Page has < 150 words statically but > 500 words rendered.
   - *Impact*: Search engines that do not reliably render JavaScript (or throttle second-wave rendering) will miss main content.
2. **`METADATA_HYDRATION_DRIFT`**: Static `<title>` differs from client-injected `<title>`.
   - *Impact*: Snippet generators may display conflicting information before JS triggers.
3. **`CLIENT_ONLY_LINKS`**: Critical navigation links are rendered exclusively via JavaScript `onClick` without standard `<a href="...">` attributes.
   - *Impact*: Search bots cannot discover deep links during standard crawling.

---

## 5. Implementation Roadmap & Milestones

### Phase 4.1: Headless Worker Service (Isolated Sidecar)
- Deploy Playwright/Chromium as a pooled background worker (or stateless microservice).
- Enforce strict resource constraints (timeout 8,000ms, max memory per page 128MB, disable media downloads/fonts/analytics scripts to keep render times < 1.5s).
- Apply identical SSRF protection (`ipaddr.js` private IP blocker) on navigation requests.

### Phase 4.2: Ingestion Adapter Pattern
- Refactor `fetchPageHtml(url)` in `lib/crawler/httpFetcher.ts` into a strategy:
  - `StaticFetcher` (Default, instant, zero overhead).
  - `HeadlessBrowserFetcher` (Optionally triggered when `is_spa_detected === true` or requested by user).
- Both fetchers output standard HTML strings parsed uniformly by `cheerioParser.ts`.

### Phase 4.3: Telemetry & Real-User Performance (CrUX / CWV)
- Capture genuine **LCP (Largest Contentful Paint)**, **CLS (Cumulative Layout Shift)**, and **INP (Interaction to Next Paint)** via Chrome DevTools Protocol (CDP) Performance timeline.
- Replace `NOT_MEASURED` states with live, measured rendering metrics only when browser rendering is executed.

---

## 6. Safety & Anti-Fabrication Principles

1. **No Phantom Execution**: If browser rendering is disabled or unavailable, all rendering-dependent metrics (layout shifts, paint timings, dynamic hydration diffs) MUST remain marked as `NOT_MEASURED`.
2. **Clear Methodology Tagging**: Every generated SEO report will explicitly state its analysis mode:
   - `ANALYSIS_MODE: "STATIC_DOM"` (Fast HTML parsing).
   - `ANALYSIS_MODE: "HYBRID_RENDERED_DOM"` (Static + Headless Chromium DOM).
3. **Graceful Fallback**: If a headless browser render encounters a timeout or crash, the engine automatically falls back to static HTML analysis without terminating the scan.
