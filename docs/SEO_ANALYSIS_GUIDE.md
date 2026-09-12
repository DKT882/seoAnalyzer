# SEO Analyzer & Intelligence Engine: Developer & User Guide

This guide provides a comprehensive technical and operational breakdown of the SEO Analyzer system. It details the analysis pipeline, core keyword taxonomy, heuristic models, scoring calculations, recommendation architecture, issue resolution examples, and safety constraints.

---

## 1. Overview

The SEO Analyzer is a high-precision, deterministic search engine optimization auditing and keyword intelligence engine built on Next.js 15 App Router, TypeScript, and SQLite.

Unlike generic tools that invent metrics or conflate extracted page topics with user target goals, this system maintains a strict conceptual and algorithmic separation between:
1. **User Target Keywords** (supplied explicitly by the user).
2. **Extracted Page Keywords / Topics** (extracted from the page's visible text and semantic markup).
3. **Recommended Keywords** (semantic opportunities and missing entity topics discovered through topical graph and intent analysis).

The system prioritizes transparency, explainability, actionable before/after fixes, and zero metric fabrication.

---

## 2. Analysis Pipeline

The audit execution pipeline runs sequentially through deterministic stages:

```
Target URL / Crawl Request
   │
   ├── 1. SSRF & Security Validation (DNS lookup, IP verification, private range filtering)
   ├── 2. Safe HTTP Fetching (Custom User-Agent, redirect tracking, size limits, timeout guards)
   ├── 3. DOM & HTML Parsing (Cheerio AST extraction, strip script/style/nav/svg noise)
   ├── 4. Structural Element Extraction (Title, Meta, Canonical, Robots, H1-H6, Links, Images, Schemas)
   ├── 5. Keyword & Entity Extraction (N-gram candidate generation, noise filtering, TF-IDF + Prominence scoring)
   ├── 6. Topic Classification (Primary Topics vs Secondary Topics vs Semantic Entities)
   ├── 7. Optional External Provider Enrichment (SQLite-cached DataForSEO / Mock provider)
   ├── 8. Content Contribution & Heatmap Analysis (Section-level signal strength & keyword coverage)
   ├── 9. Technical SEO & On-Page Rule Auditing (Deterministic rule evaluations)
   ├── 10. Multi-Dimensional SEO Scoring (Weighted category scores, neutral handling of missing data)
   └── 11. Prioritized Recommendation Generation (Structured before/after, whatToChange, caution)
```

---

## 3. Crawling & Safe Fetching

The crawling layer (`lib/crawler/safeFetcher.ts`) enforces strict security safeguards:
- **SSRF Protection:** Resolves domain DNS before connection and rejects private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 loopbacks).
- **Protocol Enforceability:** Strictly permits `http:` and `https:`. Rejects `file:`, `gopher:`, `ftp:`.
- **Response Size Cap:** Rejects or truncates responses exceeding 15MB to prevent memory exhaustion.
- **Timeout Management:** 12-second hard timeout per request.
- **Redirect Tracking:** Records full redirect hops to detect redirect chains and status codes (301, 302, 307, 308).

---

## 4. HTML Parsing & DOM Sanitation

HTML parsing (`lib/parser/htmlParser.ts`) constructs a sanitized Cheerio DOM:
1. Strips non-content elements: `<script>`, `<style>`, `<noscript>`, `<svg>`, `<iframe>`, `<canvas>`.
2. Preserves heading elements (`<h1>` through `<h6>`) with document order positions.
3. Separates main content containers (`<main>`, `<article>`, `#content`) from navigation/header/footer boilerplate.
4. Calculates accurate text-to-HTML ratios and word counts on clean visible text.

---

## 5. Content Extraction

Clean visible text extraction eliminates whitespace artifacts, converts block-level tags into natural sentence boundaries, and normalizes unicode characters. Words are tokenized respecting hyphenated terms, contractions, and alphanumeric product codes.

---

## 6. Keyword Extraction Pipeline

The keyword extraction engine (`lib/keywords/keywordExtractor.ts`) builds high-quality candidate phrases:
- Generates 1-gram, 2-gram, 3-gram, and 4-gram candidate phrases.
- Computes raw term frequency ($TF$) and length-normalized density.
- Applies structural location weighting (multipliers for occurrence in `<title>`, `<meta description>`, `<h1>`, `<h2>`, and `<strong>`).

---

## 7. Noise Rejection & Keyword Cleaning

To prevent meaningless fragments and crawler artifacts from entering candidate pools, the cleaning pipeline strictly filters:
- **HTML/CSS Fragments:** `div`, `span`, `class`, `px`, `rem`, `rgba`, `style`, `href`, `src`.
- **Dates & Timestamps:** `2026-09-11`, `daily1`, `00:00:00`, `updated on`, `posted by`.
- **URL/Protocol Artifacts:** `http`, `https`, `www`, `com`, `org`, `slug`, `permalink`.
- **Navigation & Template Boilerplate:** `home`, `next`, `previous`, `cookie policy`, `all rights reserved`, `skip to content`.
- **Malformed Tokens:** Isolated digits, standalone special characters, truncated fragments like `0https`.

---

## 8. Primary Topic Classification

Candidates qualifying as **Primary Topics** must meet strict relevance thresholds:
1. High composite prominence score (combining TF-IDF and structural placement).
2. Presence in at least two high-value locations (e.g. Title + Body, or H1 + H2, or Meta Description + First Paragraph).
3. Grammatically valid noun phrase structure.
4. Density between 0.5% and 4.5% (avoiding accidental single-mention noise and keyword stuffing).

---

## 9. Secondary Topic Classification

**Secondary Topics** represent supporting subtopics:
- 2-word to 4-word phrases appearing in `<h2>`/`<h3>` subheadings, bullet lists, or dedicated body paragraphs.
- Moderate frequency (2–6 occurrences) providing topical depth and context.

---

## 10. User Target Keyword Handling

Target Keywords exist **exclusively** when supplied by the user:
- Passed via `targetKeywords` in the request payload or UI input.
- If omitted, `targetKeywords = []`. The engine **never** invents or assigns target keywords automatically.
- When present, the system runs dedicated **Target Keyword Analysis**:
  - Target Keyword Coverage: $\frac{\text{Matched Target Keywords}}{\text{Total Target Keywords}} \times 100\%$
  - Target Keyword Density & Placement (Title, H1, Meta, Body).
  - Target Keyword in H1 check.

---

## 11. Recommended Keyword Handling

**Recommended Keywords** are opportunities generated by analyzing:
1. Content gaps relative to the extracted primary entities.
2. Question patterns ("how to", "what is", "best ways to").
3. Semantic entity co-occurrences.
4. Competitor gaps (when multiple URLs are compared).

Recommended keywords are **never** combined into the extracted keyword list and are never labeled as existing page keywords.

---

## 12. Core Keyword Taxonomy: Strict Distinction

| Concept | Source | Exists When | Metrics Allowed | UI Terminology |
| :--- | :--- | :--- | :--- | :--- |
| **User Target Keywords** | User Input | User explicitly enters keywords | Target Coverage, Target in Title, Target in H1 | "Target Keyword Analysis", "Target Coverage" |
| **Extracted Topics** | Webpage Content | Automatically parsed from page | Topic Coverage, Frequency, Density, Prominence | "Automatic Topic Analysis", "Primary Topics Detected" |
| **Recommended Keywords** | Semantic Gap Analysis | Discovered by rule engine / entity gap | Gap Score, Semantic Relevance, Intent Category | "Keyword Opportunities", "Recommended Subtopics" |

---

## 13. H1 Analysis: Two Distinct Paths

The H1 heading evaluation strictly separates user-targeted intent from automatic topic extraction:

### Case A: User Target Keywords Provided
- Evaluates whether the H1 incorporates the primary target keyword naturally.
- **Finding:** `"Supplied target keyword is not clearly represented in the H1."`
- **Recommendation:** `"Consider naturally incorporating the primary target topic into the H1 while keeping it readable."`
- **Before:** `<h1>Website Performance Tools</h1>`
- **After:** `<h1>SEO Analyzer - Website Performance Tools</h1>`

### Case B: No Target Keywords Provided (Automatic Analysis)
- Evaluates whether the H1 clearly reflects the primary extracted topic of the document.
- **Finding:** `"H1 has weak alignment with the primary topic identified from the page content."`
- **Recommendation:** `"Rewrite the H1 so it clearly communicates the page's primary topic."`
- **Before:** `<h1>Welcome to Our Service</h1>`
- **After:** `<h1>SEO Optimization Platform & Website Audit Tools</h1>`

---

## 14. Heading Hierarchy & Multiple H1 Analysis

### Multiple H1 Rule
- A multiple-H1 warning is generated **only** if the actual count of `<h1>` elements in the document is $> 1$.
- If `h1Count === 1`, the audit produces `H1_OPTIMAL` (Good), **never** a warning.
- If `h1Count > 1`, finding: `"Multiple H1 headings detected."`
- **Action:** `"Keep one clear primary H1 for the page and restructure the other headings as H2/H3 where they represent subsections."`

### Skipped Hierarchy Rule
- Evaluates sequential descent (H1 $\rightarrow$ H2 $\rightarrow$ H3).
- Flags jumps from H1 directly to H3 or H2 to H4 as structural warnings.

---

## 15. Page Title Analysis

Evaluates:
- **Presence:** `<title>` tag must exist in `<head>`.
- **Length:** Optimal between 40 and 60 characters (avoids SERP pixel truncation).
- **Relevance:** Front-loads core topic or target keyword.

---

## 16. Meta Description Analysis

Evaluates:
- **Presence:** `<meta name="description">` must exist in `<head>`.
- **Length:** Optimal between 120 and 160 characters.
- **Snippet Value:** Clear call to action and distinct summary of page value.

---

## 17. Content Depth Analysis

Evaluates:
- **Word Count:** Minimum 300 words recommended for indexable informational pages.
- **Thin Content Detection:** Under 250 words triggers a warning.
- **Reading Time:** Estimated based on 200 words/minute average reading speed.

---

## 18. Internal Link Analysis

Evaluates:
- **Internal Link Volume:** Measures links pointing to the same hostname.
- **Contextual Distribution:** Rewards links within main body content.
- **Anchor Text Quality:** Flags generic anchor text ("click here", "read more", "link").

---

## 19. External Link Analysis

Evaluates:
- **External Outbound Links:** Counts unique destination hostnames.
- **Safety Flags:** Verifies `rel="noopener"` or `rel="noreferrer"` on external links with `target="_blank"`.

---

## 20. Image & ALT Attribute Analysis

Evaluates:
- **ALT Coverage Ratio:** $\frac{\text{Images with non-empty ALT}}{\text{Total Images}} \times 100\%$.
- **Accessibility Compliance:** Purely decorative images should use `alt=""` or `role="presentation"`.

---

## 21. Technical SEO Checks

Audits fundamental web infrastructure:
- HTTP Status Code (200 OK vs 404, 500, 301).
- HTTPS SSL encryption enforcement.
- Response Time / TTFB (Time To First Byte).
- Viewport mobile responsiveness.

---

## 22. Structured Data (Schema.org) Checks

Audits JSON-LD and Microdata:
- Discovers `@context: "https://schema.org"` blocks.
- Identifies entity types (`WebPage`, `Article`, `Organization`, `FAQPage`, `Product`, `BreadcrumbList`).

---

## 23. Indexability & Robots Directives

Checks:
- `<meta name="robots" content="noindex">` tags.
- `robots.txt` Disallow directives matching the analyzer user-agent.
- Canonical tag match between requested URL and declared canonical.

---

## 24. Performance Checks: Measured Data vs Limitations

- **Measured:** Server Time to First Byte (TTFB) in milliseconds, page HTML payload size in bytes.
- **Limitation:** Browser-rendered Core Web Vitals (LCP, FID/INP, CLS) require a headless Chrome render engine or CrUX API access. When unavailable, the system states: *"Client-side rendering performance data not measured in this static analysis."*

---

## 25. SEO Issue Severity Taxonomy

| Severity | Color | Definition | Examples |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Rose (`#f43f5e`) | Prevents indexing, security failure, or complete absence of fundamental signals | HTTP 500/404, Noindex active, Insecure HTTP, Missing Title, Missing H1 |
| **WARNING** | Amber (`#f59e0b`) | Noticeable ranking or accessibility hindrance | Multiple H1s, Missing ALT text, Truncated Title, Skipped Headings, Missing Canonical |
| **RECOMMENDATION** | Indigo (`#6366f1`) | Best-practice optimization opportunity | Missing FAQ section, Short Meta Description, Missing Schema JSON-LD, Thin Content |
| **GOOD** | Emerald (`#10b981`) | Fully compliant checkpoint | HTTP 200 OK, HTTPS Active, Self-Referencing Canonical, Optimal Title Length |

---

## 26. Scoring System & Component Weights

The Overall SEO Health Score (0–100) is a weighted deterministic aggregation:

$$\text{Overall Score} = (0.30 \times \text{OnPage}) + (0.25 \times \text{Technical}) + (0.25 \times \text{Content}) + (0.10 \times \text{Links}) + (0.10 \times \text{Mobile})$$

### Category Breakdown:
1. **On-Page SEO (30%):** Title presence & length, Meta description, H1 count & alignment, Canonical validity.
2. **Technical SEO (25%):** HTTP 200, HTTPS encryption, Robots allow status, Sitemap discovery.
3. **Content & Keywords (25%):** Word count depth, Topic coverage, Heading structure, Keyword stuffing protection.
4. **Links & Images (10%):** Internal link count, Broken links count, Image ALT text coverage ratio.
5. **Mobile & UX (10%):** Viewport configuration, text-to-HTML ratio, language attribute declaration.

---

## 27. Handling Missing & Unavailable Metrics

- Missing external metrics (e.g. third-party search volume or keyword difficulty when API keys are not configured) are marked `isEstimated: true` or `N/A`.
- **Zero Fabricated Penalties:** The scoring engine does **not** deduct points for metrics that were never measured. It calculates scores exclusively on verified on-page and technical signals.

---

## 28. Structured Recommendation Architecture

Every recommendation conforms to the uniform schema:

```json
{
  "id": "rec-12345",
  "priority": "HIGH",
  "category": "ON_PAGE",
  "title": "Add a single main <h1> heading",
  "affectedUrl": "https://example.com/guide",
  "impact": "Clarifies main page topic hierarchy for search engines and screen readers.",
  "effort": "LOW",
  "confidence": "HIGH",
  "reason": "No <h1> heading was found in the HTML document.",
  "recommendedAction": "Add a concise <h1> heading defining the primary subject of the page.",
  "issue": "Missing <h1> heading tag.",
  "whyItMatters": "The H1 tag communicates the central topic of the page to search engines and users.",
  "evidence": "0 <h1> tags detected.",
  "action": "Add exactly one prominent <h1> tag.",
  "whatToChange": "Insert <h1> at top of main content.",
  "before": "<div class=\"title\">Welcome</div>",
  "after": "<h1>SEO Analyzer for Website Optimization</h1>",
  "expectedBenefit": "Clean semantic structure and clear topic outline.",
  "caution": "Keep only one primary H1 on the page."
}
```

---

## 29. Actionable Before & After Solutions

### Issue 1: Multiple H1 Headings
- **Problem:** Page contains 3 separate `<h1>` tags.
- **Why It Matters:** Dilutes topical focus and violates standard semantic outline hierarchy.
- **What to Change:** Convert secondary H1 elements to H2 or H3 tags.
- **Before:**
  ```html
  <h1>SEO Analyzer</h1>
  <h1>Keyword Analysis</h1>
  <h1>Technical SEO</h1>
  ```
- **After:**
  ```html
  <h1>SEO Analyzer</h1>
  <h2>Keyword Analysis</h2>
  <h2>Technical SEO</h2>
  ```
- **Caution:** Do not change heading levels purely to manipulate search algorithms. Structure headings according to actual content subsections.

---

### Issue 2: H1 Lacks Target Keyword Alignment (Target Keywords Provided)
- **Problem:** User specified target keyword `"seo analyzer"`, but H1 is `"Website Performance Tools"`.
- **Why It Matters:** Target keyword presence in H1 strongly reinforces relevance for user search queries.
- **What to Change:** Revise H1 text to incorporate the primary target term.
- **Before:**
  ```html
  <h1>Website Performance Tools</h1>
  ```
- **After:**
  ```html
  <h1>SEO Analyzer & Website Performance Tools</h1>
  ```
- **Caution:** Do NOT blindly stuff keywords. Maintain a natural, engaging reading flow for human visitors.

---

### Issue 3: H1 Weak Topical Alignment (No Target Keywords Provided)
- **Problem:** Extracted primary topic is `"SEO Audit"`, but H1 is `"Welcome to Our Website"`.
- **Why It Matters:** Generic H1 fails to communicate page subject matter to visitors and web crawlers.
- **What to Change:** Replace generic greeting with a descriptive headline.
- **Before:**
  ```html
  <h1>Welcome to Our Website</h1>
  ```
- **After:**
  ```html
  <h1>Comprehensive SEO Audit & Optimization Platform</h1>
  ```
- **Caution:** Ensure the H1 accurately reflects the content that follows.

---

### Issue 4: Missing Meta Description
- **Problem:** No `<meta name="description">` tag found in `<head>`.
- **Why It Matters:** Meta descriptions serve as promotional snippet copy in search results, driving organic CTR.
- **What to Change:** Add `<meta name="description" content="...">` to `<head>`.
- **Before:**
  ```html
  <head>
    <title>SEO Tools | Brand</title>
  </head>
  ```
- **After:**
  ```html
  <head>
    <title>SEO Tools | Brand</title>
    <meta name="description" content="Discover powerful SEO auditing and keyword extraction tools to boost organic search visibility. Start optimizing your website today.">
  </head>
  ```
- **Caution:** Keep description between 120 and 160 characters. Write for human searchers with a clear value proposition.

---

### Issue 5: Missing Image ALT Text
- **Problem:** 4 content images lack `alt` attributes.
- **Why It Matters:** Fails web accessibility (WCAG) and prevents images from indexing in Google Image Search.
- **What to Change:** Add descriptive `alt="..."` attributes to `<img>` tags.
- **Before:**
  ```html
  <img src="/assets/seo-workflow.png">
  ```
- **After:**
  ```html
  <img src="/assets/seo-workflow.png" alt="Step-by-step diagram of the SEO keyword analysis workflow">
  ```
- **Caution:** For purely decorative icons or background borders, use `alt=""` rather than omitting the attribute.

---

## 30. What Each Metric Means

- **Target Keyword Coverage:** The percentage of user-supplied target keywords present in the page title, headings, and body content.
- **Topic Coverage:** The consistency with which primary extracted topics are distributed across page title, headings, body text, and metadata.
- **Prominence Score:** A composite 0–100 score reflecting term frequency, position in document (early paragraphs score higher), and HTML tag weight (H1, Title, Strong).
- **Text-to-HTML Ratio:** Ratio of visible text characters to total HTML markup characters (healthy range: 15%–50%).

---

## 31. What Each UI Section Displays

1. **Top Status Bar:** HTTP status, HTTPS encryption, Indexability state, duration, and page size.
2. **Keyword Analysis Mode Banner:** Explicitly shows whether the report is in **Target Keyword Analysis Mode** or **Automatic Page Topic Analysis Mode**.
3. **Score Gauge:** Overall weighted SEO health score (0–100) with category breakdown.
4. **Technical Audits View:** Expandable list of all evaluated checkpoints with severity badges, observations, before/after code snippets, and cautions.
5. **Content Signal Heatmap:** Visual breakdown of keyword density and contribution across Title, H1, Headings, Body, and Metadata.
6. **SEO Recommendations View:** Prioritized list of actionable improvements with quick-win filters and category sorting.

---

## 32. External SEO Data Limitations

The analyzer operates directly on the fetched HTML document. It cannot unilaterally know:
- Actual search volume, CPC, or keyword difficulty without an authenticated third-party provider (e.g. DataForSEO).
- Competitor ranking positions or historical SERP volatility.
- Exact Google crawl frequencies or algorithm updates.

All external metrics are clearly marked with data source disclosures.

---

## 33. Why Fabricated Metrics Are Strictly Prohibited

Generating synthetic search volumes, fake keyword difficulties, or artificial ranking positions undermines developer and user trust. When external data is unconfigured, the system explicitly marks metrics as `"N/A - External data provider not connected"` or `"Estimated from on-page signal strength"`.

---

## 34. Developer Architecture & Backend Data Structures

```
lib/
├── crawler/
│   └── safeFetcher.ts          # SSRF-protected HTTP client
├── parser/
│   ├── htmlParser.ts           # Cheerio DOM builder & text extraction
│   └── tagExplorer.ts          # Tag-level inspection explorer
├── seo/
│   ├── metadataExtractor.ts    # Title, Meta, Canonical, Robots extraction
│   └── contentContribution.ts  # Heatmap & signal strength calculator
├── keywords/
│   ├── keywordExtractor.ts     # N-gram generation, TF-IDF, cleaning
│   └── topicClassifier.ts      # Primary vs Secondary topic classification
├── technical/
│   └── technicalAuditor.ts     # Deterministic SEO audit engine
├── recommendations/
│   └── recommendationEngine.ts # Actionable recommendation generator
├── reports/
│   ├── reportGenerator.ts      # Complete report orchestrator
│   └── seoScorer.ts            # Weighted scoring algorithms
├── db/
│   ├── database.ts             # SQLite schema & migrations
│   └── repository.ts           # Job and report persistence
└── providers/
    └── seo/                    # DataForSEO & Mock provider abstractions
```

---

## 35. How to Extend the Analyzer with a New SEO Rule

To add a new SEO audit rule:

1. **Define the Issue Code:** Add a constant in `lib/constants.ts` under `ISSUE_CODES`.
2. **Implement Evaluation:** In `lib/technical/technicalAuditor.ts`, add the check logic to `performTechnicalSeoAudit()`.
3. **Populate Structured Schema:** Provide `issue`, `whyItMatters`, `evidence`, `action`, `whatToChange`, `before`, `after`, `expectedBenefit`, and `caution`.
4. **Attach Recommendation:** In `lib/recommendations/recommendationEngine.ts`, add corresponding priority and impact estimates.
5. **Add Automated Test:** In `tests/keywordModelAndH1Analysis.test.ts`, add a test case validating true positive and true negative triggers.

---

## 36. Browser-Rendered Analysis & Hydration Delta Engine (Phase 4)

The analyzer supports headless Chromium rendering via Playwright to audit modern Single Page Applications (SPAs) and JavaScript-heavy websites:

- **Static Snapshot vs. Rendered Snapshot**: Compares the initial server HTTP response against the fully hydrated post-JavaScript DOM.
- **Hydration Delta**: Detects dynamically introduced/removed H1 headings, modified titles, expanded content volume, injected schemas, and critical indexability mismatches (e.g. static `noindex` vs. rendered `index`).
- **Graceful Fallback**: If browser execution fails or times out, the system automatically falls back to static HTML analysis without failing the audit.
- **Anti-Fabrication Notice**: Synthetic browser performance metrics (DOMContentLoaded, Load time) are explicitly demarcated as synthetic single-run telemetry, never conflated with Google CrUX real-user metrics.

For complete architectural details, see `docs/BROWSER_RENDERING_GUIDE.md`.

---

## 37. Advanced Technical SEO Intelligence Engine (Phase 5)

Phase 5 equips the analyzer with deep technical audits across the complete crawlability, indexability, canonicalization, and infrastructure spectrum:

- **Crawlability & HTTP Classification**: Semantic status taxonomy (200, 301, 302, 404, 410, 429, 5xx) with redirect chain and loop detection.
- **Indexability State Machine**: Cross-layer contradiction evaluation between `X-Robots-Tag` HTTP headers, `<meta name="robots">`, and bot-specific overrides (`googlebot`, `bingbot`).
- **Canonicalization Audits**: Automatic recognition of valid `SELF_CANONICAL` tags (no false warnings), `CANONICAL_REDIRECT_CONFLICT` detection, and `NOINDEX_CANONICAL_CONFLICT` resolution.
- **Robots.txt & XML Sitemaps**: Discovery, parser validation, sitemap membership verification, and sitemap canonical consistency checks.
- **Internationalization (Hreflang)**: ISO 639-1 / 3166-1 syntax validation, `x-default` checking, self-reference verification, and `<html lang="...">` alignment.
- **Security & Infrastructure**: Mixed content detection on HTTPS pages, HSTS headers, Content-Type enforcement, and server response time (TTFB).

For complete technical specifications, see `docs/ADVANCED_TECHNICAL_SEO_GUIDE.md`.

---

## 38. Content & Semantic SEO Intelligence Engine (Phase 6)

Phase 6 implements deep evaluation of content quality, structure, search intent, and topical depth:

- **Contextual Depth Benchmarks**: Tailors depth expectations to page types (Article: 300+ words; Product: 80+ words; Contact: 25+ words) to prevent false-positive "thin content" penalties on valid concise pages.
- **Conservative Classification**: Classifies page types (`ARTICLE`, `PRODUCT`, `SERVICE`, `LOCAL_BUSINESS`, `DOCUMENTATION`, `FAQ`, `CONTACT`, `UNKNOWN`) and search intent (`INFORMATIONAL`, `COMMERCIAL_INVESTIGATION`, `TRANSACTIONAL`, `LOCAL`, `NAVIGATIONAL`, `MIXED`, `UNKNOWN`) with explicit confidence levels.
- **Heading-to-Content Support**: Audits whether headings are backed by substantive explanation, flagging empty headings (`CONTENT_HEADING_WITHOUT_SUPPORT`) and topic drift.
- **Observable Content Gaps**: Identifies unfulfilled heading promises and missing target keywords without fabricating arbitrary topic requirements.
- **Repetition & Spam Guard**: Detects duplicated sentences and high-density n-gram repetition while protecting legitimate brand and model specifications.
- **Root-Cause Deduplication**: Calculates an explainable 0-100 `SemanticContentScore` where thin content is penalized once under `CONTENT_INSUFFICIENT_DEPTH` rather than compounding multiple duplicate deductions.

For complete documentation, see `docs/CONTENT_SEMANTIC_INTELLIGENCE_GUIDE.md`.

---

## 39. Site-Wide SEO Intelligence & Multi-URL Crawler Engine (Phase 7)

Phase 7 expands the system from single-URL audits to whole-domain crawling and architectural intelligence:

- **Bounded Crawl Frontier**: 9-state queue state machine (`DISCOVERED`, `QUEUED`, `FETCHING`, `ANALYZING`, `COMPLETED`, `SKIPPED`, `FAILED`, `BLOCKED`, `DUPLICATE`) bounded by strict resource budgets (max requests, response bytes, browser renders, retries, and total duration).
- **Deterministic URL Normalization**: Normalizes URLs across 8 stages and protects against recursive directory loops, calendar matrices, and session ID crawl traps.
- **Directed Internal Link Graph**: Calculates **Internal Link Centrality** using power iteration random walk models without misrepresenting metrics as "Google PageRank".
- **Orphan Candidate Detection**: Classifies 0-inlink URLs into 4 contextual archetypes (`sitemap_only`, `canonical_target`, `utility_isolated`, `potential_crawl_orphan`) without asserting absolute orphan status.
- **Duplicate Metadata & Shingled Content Similarity**: Groups duplicate `<title>` and `<meta name="description">` tags, and computes 3-gram shingle Jaccard content overlap.
- **Cross-Page Consistency Auditor**: Cross-audits canonical integrity (chains, loops, errors), indexability conflicts (noindex pages linked in navigation), sitemap-frontier reconciliation, redirect graphs, and reciprocal hreflang alternate links.
- **Topic Clustering & Search-Intent Overlaps**: Clusters domain pages by primary topics and identifies **Potential Search-Intent Overlap** only when corroborated by multiple independent signals (topic + intent + page type + title/H1).
- **Contextual Internal Link Opportunities**: Discovers high-value unlinked keyword mentions across pages and generates recommended anchor text.
- **Multi-Factor Site Health Scoring**: Calculates an explainable 0–100 domain score across 4 weighted categories with sublinear penalty caps to prevent widespread minor issues from unfairly zeroing scores.
- **Standardized 6-Pillar Recommendations**: Enforces the 6-pillar format: `Observation ➔ Evidence ➔ Interpretation ➔ Action ➔ Expected Benefit ➔ Caution`.

For complete architectural and operational details, see `docs/SITE_WIDE_CRAWLER_GUIDE.md`.

---

## 40. External Search Intelligence & SERP Analysis Engine (Phase 8)

Phase 8 introduces external search and SERP intelligence into the analysis pipeline:

- **Strict Provider Neutrality**: Pure interface abstraction (`SearchProvider`) decoupling all analysis logic from external vendor structures.
- **Explicit Search Audit Modes**: Dedicated workflows for `SEARCH_QUERY` (keyword level), `PAGE_SEARCH_INTELLIGENCE` (single-page topic demand), and `SITE_SEARCH_INTELLIGENCE` (domain cluster expansion bounded before requests).
- **Rigorous Position Semantics**: Distinguishes overall layout position (`serpPosition`) from strict organic rank (`organicPosition`). Non-organic SERP features (PAA, Local Pack, Video) receive `organicPosition: undefined`.
- **SERP Feature Taxonomy**: Classifies `FEATURED_SNIPPET`, `LOCAL_PACK`, `PEOPLE_ALSO_ASK`, `VIDEO`, `IMAGE`, `NEWS`, `SHOPPING`, `RELATED_SEARCHES`, and `KNOWLEDGE_PANEL`.
- **Search Intent Pattern Validation**: Recognizes dominant search intent patterns or classifies heterogeneous landscapes as `OBSERVED_SERP_INTENT_MIXED` without forcing arbitrary classifications.
- **Observed SERP Domain Analysis**: Aggregates ranking domain frequencies and average positions using neutral non-speculative terminology without fabricating business competitor relationships.
- **Observable Content Gaps & Opportunities**: Pinpoints common sub-topics surfacing in top SERP listings missing from user pages and integrates with Phase 7 internal link graphs to discover dedicated sibling pages.
- **Cost & Budget Safety**: Hard-capped provider request limits (`maxProviderRequestsPerAudit`) enforced before dispatching external HTTP calls.
- **Zero Metric Fabrication & Provenance**: Zero fabricated ranking probabilities, traffic estimates, DA/PA, or search volume. Every observation carries structured provenance (`source`, `provider`, `collectedAt`, `device`, `extractionMethod`, `isSyntheticTest`, `fingerprint`).

For complete specifications and API details, see `docs/SEARCH_INTELLIGENCE_GUIDE.md`.
