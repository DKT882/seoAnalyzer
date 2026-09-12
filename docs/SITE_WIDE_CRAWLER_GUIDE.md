# Site-Wide SEO Intelligence & Multi-URL Crawler Guide (Phase 7)

A technical architecture, algorithmic guide, and operational manual for the whole-domain multi-URL SEO crawling and site-wide intelligence engine.

---

## 1. Overview & Architecture of Multi-URL Crawling

The Phase 7 Multi-URL Crawler elevates the SEO Analyzer from single-page audits to domain-wide intelligence. While individual page analysis (Phases 1–6) remains authoritative for single-URL content and technical signals, the site-wide crawler synthesizes graph relationships, cross-page consistency contradictions, topic clustering, and architectural health across the entire domain.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXECUTION PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘
  Seed URL / Domain
         │
         ├──► [Robots.txt Parser] ──────► Disallowed Path Filter
         ├──► [Sitemap Discoverer] ────► Ingest XML/GZ/Index URLs
         │
         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    BOUNDED CRAWL FRONTIER                   │
  │  Queue States: DISCOVERED ➔ QUEUED ➔ FETCHING ➔ ANALYZING   │
  │  End States:   COMPLETED | SKIPPED | FAILED | BLOCKED       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Concurrency (1..6 workers)
                                 ▼
                   [SafeFetcher / SSRF Guard]
                   [Playwright Browser Engine]
                   [Single-Page Report Generator]
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                CROSS-PAGE INTELLIGENCE ENGINE               │
  │  • Directed Link Graph (Inlink Centrality, Depth, PageType) │
  │  • Orphan Candidate Detector (4 Categorized Archetypes)    │
  │  • Duplicate & Content Similarity (3-gram Shingles/Jaccard) │
  │  • Consistency Auditor (Canonical, Indexability, Sitemap)   │
  │  • Topic Clusterer & Search-Intent Overlap Engine           │
  │  • Contextual Internal Link Opportunity Generator           │
  │  • Multi-Factor Site Health Scorer (Capped Deductions)      │
  │  • 6-Pillar Recommendation Builder (Evidence & Caution)     │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
                     [WebsiteCrawlReport JSON]
                     [Interactive UI Dashboard]
```

---

## 2. Seed URL & Domain Scope Rules

The crawler enforces explicit domain and path boundary rules based on the chosen `CrawlMode`:

- **`DOMAIN_CRAWL` (Default):** Restricts crawling to the exact registered hostname (and optionally `www.` vs apex equivalence). External domains and third-party links are tracked only as external outlink targets and never enqueued.
- **`SUBDOMAIN_CRAWL`:** Discovers and crawls all subdomains belonging to the apex domain (e.g., `docs.example.com`, `blog.example.com`, `shop.example.com`).
- **`SUBPATH_CRAWL`:** Constrains crawling to URLs that start with the seed URL path prefix (e.g., `https://example.com/blog/*`). Links outside this path are logged as external/out-of-scope.
- **`CUSTOM_LIST`:** Crawls a predefined list of specific URLs without traversing undiscovered hyperlinks.

---

## 3. Deterministic URL Normalization Pipeline

To eliminate duplicate page representations and prevent frontier explosion, every discovered URL undergoes an 8-stage normalization pipeline in [`lib/crawler/urlNormalizer.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/urlNormalizer.ts):

1. **Scheme & Host Lowercasing:** `HTTPS://EXAMPLE.COM/Page` ➔ `https://example.com/Page`
2. **Default Port Removal:** Strips `:80` on HTTP and `:443` on HTTPS.
3. **Trailing Slash Standardization:** Paths are stripped of trailing slashes (except root `/`).
4. **Fragment / Hash Removal:** `#section-2` is completely stripped.
5. **Path Canonicalization:** Resolves relative segments (`./`, `../`, `//`).
6. **Query Parameter Categorization & Sorting:**
   - **`TRACKING_VARIANT`:** Strips known analytics parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `ref`, `source`, `mc_eid`).
   - **`CANONICAL_VARIANT`:** Normalizes parameters alphabetically.
   - **`FACET_VARIANT`:** Preserves filtering parameters (`color`, `size`, `sort`).
   - **`PAGINATION`:** Preserves `page`, `p`, `offset`.
7. **Character Encoding Normalization:** Decodes safe percent-encoded ASCII bytes (`%20` ➔ space handling, uppercase hex encoding `%3D` ➔ `=`).
8. **Hash-Based Fingerprinting:** Computes MD5/SHA256 hex digests for O(1) set membership.

---

## 4. Recursive Crawl Trap & Infinite Loop Protection

The crawler actively identifies dynamic URL generation traps before enqueuing:

- **Path Repetition Traps:** Identifies repeating directory segments (e.g., `/products/clothing/products/clothing/...` or `/a/b/a/b/a/b`). Threshold: Any path segment repeating > 2 times is rejected.
- **Calendar & Date Traps:** Blocks infinite calendar generation matrices (e.g., `/calendar/2026/09/12/view?day=15&prev=2026-08`).
- **Session ID Traps:** Identifies and strips embedded path session tokens (e.g., `;jsessionid=XYZ`, `PHPSESSID=123`).
- **Query Depth Limiting:** URLs with > 8 query parameters or path depth > 10 are rejected with state `SKIPPED (CRAWL_TRAP)`.

---

## 5. Bounded Crawl Frontier & State Transitions

The Crawl Frontier ([`lib/crawler/crawlFrontier.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/crawlFrontier.ts)) acts as an atomic state machine governing every known URL:

```
                  ┌──────────────┐
                  │  DISCOVERED  │
                  └──────┬───────┘
                         │ (Accepted & within budget)
                         ▼
                  ┌──────────────┐
                  │    QUEUED    │
                  └──────┬───────┘
                         │ (Worker picks up)
                         ▼
                  ┌──────────────┐
                  │   FETCHING   │
                  └──────┬───────┘
                         │ (HTTP 200 / Safe)
                         ▼
                  ┌──────────────┐
                  │  ANALYZING   │
                  └──────┬───────┘
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
┌───────────┐      ┌───────────┐      ┌───────────┐
│ COMPLETED │      │  FAILED   │      │  BLOCKED  │
└───────────┘      └───────────┘      └───────────┘
```

### Supported Frontier States
1. `DISCOVERED`: Discovered via link extraction or sitemap; pending validation.
2. `QUEUED`: Validated, within budget, and ordered by crawl priority and depth.
3. `FETCHING`: Currently being retrieved over HTTP or Playwright browser.
4. `ANALYZING`: Running Phase 1–6 DOM, technical, and semantic audits.
5. `COMPLETED`: Analysis finished; metrics added to aggregate graph.
6. `SKIPPED`: Excluded due to depth limit, crawl trap, or file extension (e.g., `.pdf`, `.zip`, `.png`).
7. `FAILED`: Server error (5xx), network timeout, or SSRF security rejection.
8. `BLOCKED`: Blocked by `robots.txt` disallow directive.
9. `DUPLICATE`: Matches an already processed normalized URL or canonical target.

---

## 6. Resource Budget Management

To guarantee production resilience and prevent memory exhaustion or server flooding, every crawl session is bounded by a strict `CrawlResourceBudget`:

- **`maxRequests`:** Maximum total HTTP network requests (default: 50–500).
- **`maxResponseBytes`:** Maximum aggregate response payload (default: 100MB). Exceeding this halts further downloads.
- **`maxBrowserRenders`:** Maximum Playwright headless browser instances (default: 10–25).
- **`maxRetries`:** Maximum retry attempts per failed URL (default: 2).
- **`totalCrawlTimeoutMs`:** Global crawl execution deadline (default: 300,000ms / 5 minutes).

If any limit is reached, the crawler cleanly halts new frontier expansion, completes in-flight jobs, and generates the report with the current dataset.

---

## 7. Dynamic Concurrency & Rate Limiting

- **Worker Pool:** Bounded concurrency between 1 and 6 concurrent workers.
- **Per-Domain Delay:** Enforces a polite 150ms–500ms delay between consecutive requests to the same origin server.
- **Server Load Backoff:** If the origin returns `429 Too Many Requests` or `503 Service Unavailable`, concurrency is dynamically throttled and exponential backoff is applied.

---

## 8. Sitemap Discovery & Multi-Format Parsing

The sitemap ingestion engine automatically probes common locations:
- Direct references in `robots.txt` (`Sitemap: https://example.com/sitemap.xml`).
- Standard paths: `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap/sitemap.xml`.

### Features
- **Sitemap Index Support:** Recursively extracts nested sub-sitemaps up to 3 levels deep.
- **Gzip Decompression:** Transparently decompresses `.xml.gz` sitemaps in memory.
- **Metadata Extraction:** Extracts `<lastmod>`, `<changefreq>`, and `<priority>`.
- **Reconciliation:** Flags URLs present in sitemaps that return 404, 301, or noindex.

---

## 9. Robots.txt Parsing & Wildcard Matching

The robots engine ([`lib/technical/robotsAuditor.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/technical/robotsAuditor.ts)) parses standard RFC directives:
- Matches user agents: Specific `User-agent: SEOAnalyzerBot` first, falling back to `User-agent: *`.
- Evaluates `Allow` and `Disallow` directives with full path prefix and wildcard (`*`, `$`) support.
- When an internal link points to a disallowed URL, it is marked as `BLOCKED_BY_ROBOTS` in frontier records without attempting network connections.

---

## 10. Single-Page vs Site-Wide Authority Separation

The architecture maintains a strict boundary between single-page metrics and cross-page aggregations:
- **Single-Page Report:** Remains the definitive source for on-page tags, exact word counts, heading hierarchy, TF-IDF topic density, and local schema validation.
- **Site-Wide Report:** Computes structural metrics (inlinks, orphan status, site health, canonical contradictions, topic clusters). Single-page audits never fabricate site-wide link graph data in isolation.

---

## 11. Directed Internal Link Graph Architecture

The link graph module ([`lib/crawler/linkGraph.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/linkGraph.ts)) builds an in-memory directed graph $G = (V, E)$:
- **Vertices ($V$):** Every unique internal URL discovered. Attributes include `pageType`, `status`, `depth`, `inlinksCount`, `outlinksCount`, and `centralityScore`.
- **Edges ($E$):** Directed hyperlinks from source to target URL. Attributes include `anchorText`, `isNofollow`, `location` (header, body, footer), and `statusCode`.

---

## 12. Inlink Centrality & Structural Importance Calculation

> [!IMPORTANT]
> **Calibration Rule 1 & 9:** The system NEVER refers to internal link metrics as "Google PageRank", nor does it infer PageRank, Domain Authority, search volume, or ranking probability. All metrics are labeled **Internal Link Centrality** or **Structural Importance**.

### Mathematical Model
Internal Link Centrality is computed using a deterministic power-iteration random walk model with a damping factor $d = 0.85$:

$$C(u) = \frac{1 - d}{|V|} + d \sum_{v \in B(u)} \frac{C(v)}{L(v)}$$

Where:
- $B(u)$ is the set of pages linking to page $u$.
- $L(v)$ is the number of internal outlinks on page $v$.
- $|V|$ is the total number of crawled pages.

Iterates until convergence ($\Delta < 10^{-6}$) or maximum 50 iterations. Values are normalized to a 0.0–1.0 index.

---

## 13. Orphan Candidate Detection & Classification

> [!IMPORTANT]
> **Calibration Rule 2:** The system ALWAYS uses the designation **Orphan Candidate** rather than asserting a page is definitely orphaned, because unlinked pages may still receive direct traffic or external backlink discovery.

Every page with 0 internal inlinks is analyzed and assigned one of four contextual categories ([`lib/crawler/orphanDetector.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/orphanDetector.ts)):

1. **`sitemap_only`:** Discovered strictly through XML sitemap ingestion with 0 in-site hyperlinks.
2. **`canonical_target`:** A non-linked URL that is referenced as the `rel="canonical"` master by other active pages.
3. **`utility_isolated`:** Standalone legal, privacy, terms, login, or thank-you pages that are intentionally unlinked in navigation.
4. **`potential_crawl_orphan`:** Standard content, product, or article pages that have 0 discovered internal links and are at risk of being unindexed.

---

## 14. Near-Orphan & Deep Crawl Depth Detection

- **Near-Orphan:** A page that has exactly 1 internal inlink, making its indexability and internal visibility fragile.
- **Deep Crawl Depth:** Pages requiring $> 4$ clicks from the homepage ($depth \ge 4$) are flagged for architectural flattening.

---

## 15. Duplicate Title & Duplicate Meta Description Grouping

Identifies exact and near-exact metadata duplication across distinct canonical URLs:
- **Duplicate Titles:** Groups pages sharing identical `<title>` text (excluding common brand suffixes).
- **Duplicate Meta Descriptions:** Groups pages sharing identical `<meta name="description">` strings.
- **Recommendations:** Suggests unique template-driven titles and descriptions tailored to page type.

---

## 16. Content Similarity & 3-Gram Shingling Jaccard Model

Content duplication is audited using $k$-shingle set similarity ([`lib/crawler/duplicateDetector.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/duplicateDetector.ts)):

1. Clean visible main-content text is tokenized into word 3-grams ($s_1 = (w_1, w_2, w_3), s_2 = (w_2, w_3, w_4), \dots$).
2. The Jaccard similarity between page $A$ and page $B$ is computed:

$$J(A, B) = \frac{|S_A \cap S_B|}{|S_A \cup S_B|}$$

3. Similarity Thresholds:
   - $J(A, B) \ge 0.85$: **Near-Exact Duplicate**
   - $0.60 \le J(A, B) < 0.85$: **High Content Overlap**
   - $0.40 \le J(A, B) < 0.60$: **Moderate Content Overlap**

> [!CAUTION]
> **Calibration Rule 11:** The system NEVER automatically recommends deleting or redirecting pages merely because similarity is high. It classifies the situation as a potential overlap signal and prompts the user to review intent.

---

## 17. Canonical Cross-Page Consistency Matrix

Cross-page canonical integrity is audited across all crawled URLs ([`lib/crawler/consistencyAuditor.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/consistencyAuditor.ts)):

- **Canonical to 404/Error:** Flags pages whose `rel="canonical"` points to a non-existent or broken URL.
- **Canonical to Redirect (3xx):** Flags canonical targets that return HTTP redirects rather than final status 200 URLs.
- **Canonical Chains & Loops:** Detects $A \to B \to C$ and $A \to B \to A$ canonical loops.
- **Non-Reciprocal Cross-Domain:** Flags unexpected cross-domain canonical targets.
- **Self-Canonical Matching:** Correctly verifies matching self-canonicals without generating false errors.

---

## 18. Indexability & Robots Directives Cross-Page Auditor

Cross-validates indexability across HTML meta tags, HTTP headers, and robots.txt:
- **Noindex Page Linked in Navigation:** Flags pages with `noindex` that receive prominent internal links.
- **Noindex Page Included in Sitemap:** Flags contradiction where XML sitemap requests indexing but page specifies `noindex`.
- **Blocked Page with Inlinks:** Identifies pages disallowed in `robots.txt` that receive internal link equity.

---

## 19. Sitemap vs Crawl Frontier Reconciliation Matrix

Constructs a cross-reference matrix:
- **Sitemap URLs Crawled & Indexable:** Validated healthy URLs.
- **Sitemap URLs with 4xx/5xx Errors:** Dead links present in sitemap.
- **Sitemap URLs with Redirects (3xx):** Outdated URLs in sitemap.
- **Crawled Indexable URLs Missing from Sitemap:** Discovered organically but omitted from sitemap.

---

## 20. Site Redirect Graph & Chain Detection

Builds a directed redirect graph across all encountered 3xx responses:
- **Single-Hop Redirects:** $A \xrightarrow{301} B$ (Standard).
- **Redirect Chains:** $A \xrightarrow{301} B \xrightarrow{301} C$ (Flagged to update direct link $A \to C$).
- **Redirect Loops:** $A \xrightarrow{301} B \xrightarrow{301} A$ (Critical error).

---

## 21. Hreflang International Alternate Reciprocal Validation

Validates multi-language/multi-region alternate links across the entire crawl:
- **Missing Reciprocal Return Links:** If page $A$ (`en`) declares page $B$ (`es`) as an alternate, page $B$ MUST declare page $A$ (`en`). If missing, flags `MISSING_RECIPROCAL`.
- **Target URL Status:** Flags hreflang targets that return 404 or redirect.
- **Language Code Conformance:** Enforces ISO 639-1 language and ISO 3166-1 country code standards.

---

## 22. Contextual Structured Data (Schema.org) Patterns

> [!IMPORTANT]
> **Calibration Rule 3:** Missing schema is NEVER automatically treated as an SEO failure or score penalty. Contextual evidence is required based on page archetype.

The cross-page schema auditor summarizes site-wide structured data distribution:
- **E-commerce:** Checks for `Product`, `Offer`, `AggregateRating`, `BreadcrumbList`.
- **Editorial / Blog:** Checks for `Article`, `NewsArticle`, `Author`, `Organization`.
- **Local Business:** Checks for `LocalBusiness`, `PostalAddress`, `OpeningHoursSpecification`.
- **FAQ / Docs:** Checks for `FAQPage`, `TechArticle`.

---

## 23. Topic Clustering & Pillar-Cluster Hierarchy

Groups pages into topical semantic clusters ([`lib/crawler/topicClusterer.ts`](file:///c:/Users/kamle/OneDrive/Desktop/KeywordExtractor/lib/crawler/topicClusterer.ts)):
- **Pillar Page Identification:** Evaluates pages with broadest coverage, highest word count, and strongest centrality.
- **Cluster Pages:** Child pages covering specific subtopics.
- **Internal Link Health:** Evaluates whether cluster pages link back to the pillar and cross-link contextually to sister cluster pages.

---

## 24. Search-Intent Overlap Engine & Multi-Signal Corroboration

> [!IMPORTANT]
> **Calibration Rule 4:** The system NEVER asserts "keyword cannibalization" as fact. It uses **Potential Search-Intent Overlap** and strictly requires multiple independent signals.

### Multi-Signal Corroboration Matrix
A potential search-intent overlap is ONLY flagged when multiple independent signals agree:

| Signal | Evaluation | Required Weight |
|---|---|---|
| **1. Primary Topic Match** | Exact or lemmatized match on extracted primary topic | Required |
| **2. Search Intent Match** | Identical `primaryIntent` (e.g., both `TRANSACTIONAL`) | High weight |
| **3. Page Archetype Match** | Identical `pageType` (e.g., both `PRODUCT`) | High weight |
| **4. On-Page Prominence** | Topic appears in `<title>` or `<h1>` of both pages | Corroborating |
| **5. Content Overlap** | 3-gram text similarity $J \ge 0.40$ | Corroborating |

- **Risk Level HIGH:** Signals 1 + 2 + 3 + 4 all present.
- **Risk Level MEDIUM:** Signals 1 + 2 + 4 present, but different page types.
- **Risk Level LOW:** Signals 1 + 4 present, but distinct intents (e.g., `INFORMATIONAL` guide vs `TRANSACTIONAL` store).

---

## 25. Contextual Internal Link Opportunity Engine

Discovers high-value contextual linking opportunities across the site:
- Finds page $A$ where the primary topic or target entity of page $B$ is mentioned prominently in the body text of page $A$, but no hyperlink to page $B$ currently exists.
- Generates precise recommended anchor text based on the target page's primary topic.

---

## 26. Multi-Factor Site Health Scoring Architecture

> [!IMPORTANT]
> **Calibration Rule 7 & 8:** Site Health Score does NOT simply average page scores. It uses site-level categories, bounded deductions, affected-page context, and root-cause grouping. Widespread low-severity issues NEVER linearly multiply penalties.

### The 4 Category Breakdown (100-Point Scale)

```
Site Health Score = 100 - (D_Crawl + D_Index + D_Content + D_Arch)
```

1. **Crawlability (Weight: 25%):** Dead links (4xx/5xx), redirect chains, robots blocks, server errors.
2. **Indexability (Weight: 30%):** Canonical conflicts, sitemap discrepancies, indexability contradictions.
3. **Content & Semantic Health (Weight: 25%):** Duplicate titles, duplicate descriptions, search-intent overlaps.
4. **Site Architecture & Links (Weight: 20%):** Orphan candidates, link centrality dispersion, hreflang validity.

### Sublinear Penalty Capping Table

| Issue Type | Base Penalty Per Page | Category Cap | Rationale |
|---|---|---|---|
| Duplicate Title Tags | -2.0 pts | Max -15.0 pts | Capped so 100 duplicate pages do not zero the score |
| Duplicate Meta Descriptions | -1.0 pts | Max -10.0 pts | Low direct indexing impact |
| Orphan Candidate | -3.0 pts | Max -15.0 pts | Isolated pages capped at category level |
| Broken Internal Links (404) | -4.0 pts | Max -20.0 pts | High crawl impact but capped per root cause |
| Canonical Conflict | -5.0 pts | Max -25.0 pts | High indexability impact |
| Hreflang Missing Reciprocal | -2.0 pts | Max -10.0 pts | Regional targeting issue |

---

## 27. Issue Prioritization Engine & Root-Cause Deduplication

Issues are prioritized into three operational tiers:
- **`CRITICAL`:** Immediate crawl blockers, canonical loops, 5xx server errors, broken primary navigation.
- **`WARNING`:** Search-intent overlaps, orphan candidates, missing reciprocal hreflang, redirect chains.
- **`OPPORTUNITY`:** Unlinked contextual mentions, schema enhancement candidates, thin topic clusters.

### Root-Cause Deduplication
If a template header causes 500 pages to link to a single 404 URL, the issue engine reports **1 Root Cause Issue (Affecting 500 pages)** rather than 500 individual issues.

---

## 28. Standard 6-Pillar Cross-Page Recommendations

> [!IMPORTANT]
> **Calibration Rule 10:** Every cross-page recommendation follows the strict 6-pillar standard:
> **Observation ➔ Evidence ➔ Interpretation ➔ Action ➔ Expected Benefit ➔ Caution.**

### Example Recommendation Matrix

```typescript
{
  id: "rec-overlap-macbook-pro",
  category: "CONTENT",
  priority: "HIGH",
  title: "Potential Search-Intent Overlap for 'MacBook Pro'",
  observation: "Two pages strongly emphasize the same primary topic 'MacBook Pro' with identical TRANSACTIONAL search intent.",
  evidence: [
    "Page 1: https://example.com/buy-macbook-pro (Title: 'Buy MacBook Pro Deals')",
    "Page 2: https://example.com/store/macbook-pro (Title: 'Buy MacBook Pro Online')",
    "Intent: Both pages classified as TRANSACTIONAL with confidence HIGH"
  ],
  interpretation: "When multiple internal pages target identical intent and query topics, search engines may split topical authority or alternate between URLs.",
  action: "Review search performance and differentiate purpose: consider consolidating commercial offerings or focusing one URL on refurbished/specific models.",
  expectedBenefit: "Consolidates topical relevance and internal link authority onto a single authoritative URL.",
  caution: "Do not delete or 301 redirect either page without verifying historical conversion and organic traffic data."
}
```

---

## 29. Verification & Operational Health Check

To verify the multi-URL crawler and site-wide intelligence engine locally:

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Execute full test suite (296 tests across 46 suites)
npm test

# Build production Next.js bundle
npm run build
```
