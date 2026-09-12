# Comprehensive SEO Rule & Scoring Audit

## 1. Executive Summary

This document provides a systematic, exhaustive inventory and audit of all SEO rules, audit checks, scoring formulas, recommendation mechanisms, and status indicators in the SEO Analyzer codebase.

The goal of this audit is to guarantee that the SEO analysis is:
1. **Logically Sound & Transparent**: Scoring deductions are fully explainable with explicit mathematical formulas and itemized point penalties.
2. **Factually Accurate**: Never claiming Google ranking penalties without authoritative justification; distinguishing hard technical faults from content heuristics and optional best practices.
3. **Respectful of Data Boundaries**: Explicitly distinguishing **Directly Measured On-Page Data** from **External Provider SEO Data** and **Private Search Console Data**. Unavailable metrics are assigned `NOT_MEASURED` status and are **never** penalized with arbitrary zero scores.
4. **Strict in Terminology**:
   - **User Target Keywords**: Explicitly provided by the user. Only when supplied does the system evaluate Target Keyword Coverage, Target Keyword Placement, and Target H1 Alignment.
   - **Extracted Page Topics**: Derived automatically from webpage content using semantic frequency and heading prominence. Labeled as "Primary/Secondary Topics Detected" and "Extracted Topic Coverage".
   - **Recommended Keywords**: Semantic gap opportunities and topic expansions; kept strictly isolated from extracted candidates.

---

## 2. SEO Rule Inventory & Classification Matrix

Every rule in the analyzer is classified into one of three operational categories:
- **Deterministic Technical Check**: An objective, measurable standard defined by W3C, RFCs, HTTP specifications, or search engine robots protocols (e.g., HTTP status, HTTPS, robots.txt, canonical matching, valid JSON-LD).
- **Content / Semantic Heuristic**: A content quality or topical distribution guideline based on established search best practices (e.g., heading hierarchy, descriptive title length, natural topic distribution).
- **External SEO Signal**: Data derived from third-party APIs or external crawls (e.g., search volume, keyword difficulty, CPC, backlink authority). When unavailable, these are marked `NOT_MEASURED`.

### Detailed Rule Catalog

| Rule Name | Rule Code | Category | Type | Detection Logic & Input Data | Threshold | Severity | Score Impact | Evidence Format | Recommendation / Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HTTP Error Status** | `HTTP_ERROR` | Technical | Deterministic | Response `statusCode` from HTTP GET | $\ge 400$ | `CRITICAL` | -60 (Technical) | Server status code (e.g., 404, 500) | Fix server routing or broken URL to serve a valid 200 OK. |
| **HTTP Status OK** | `HTTP_STATUS_OK` | Technical | Deterministic | Response `statusCode` from HTTP GET | $200 \le \text{code} < 300$ | `PASS` / `GOOD` | 0 (No penalty) | `HTTP/1.1 200 OK` | No action needed. |
| **Insecure HTTP Protocol** | `INSECURE_HTTP` | Technical | Deterministic | URL protocol scheme | URL starts with `http://` | `CRITICAL` | -30 (Technical) | URL scheme: `http` | Install SSL/TLS certificate and configure 301 redirects to HTTPS. |
| **HTTPS Encryption Active** | `HTTPS_SECURE` | Technical | Deterministic | URL protocol scheme | URL starts with `https://` | `PASS` / `GOOD` | 0 (No penalty) | `https://` protocol confirmed | No action needed. |
| **Robots Noindex Directive** | `NOINDEX_TAG_FOUND` | Indexability | Deterministic | `<meta name="robots">` content attribute | Contains `noindex` | `CRITICAL` | -40 (Technical) | `<meta name="robots" content="noindex">` | Remove `noindex` directive if the page is intended for organic search indexing. |
| **Robots.txt Disallow** | `ROBOTS_DISALLOWED` | Indexability | Deterministic | Parsed `robots.txt` disallow rules against User-Agent | Bot disallowed for path | `CRITICAL` | -30 (Technical) | Matching `Disallow: /path` rule in robots.txt | Update robots.txt if this page should be crawled by search engines. |
| **Missing Canonical Tag** | `CANONICAL_MISSING` | On-Page | Heuristic | `<link rel="canonical">` element in `<head>` | Count === 0 | `WARNING` | -10 (On-Page) | No canonical tag found in `<head>` | Add `<link rel="canonical" href="...">` in the `<head>` pointing to authoritative URL. |
| **Canonical URL Mismatch** | `CANONICAL_MISMATCH` | On-Page | Heuristic | `canonicalUrl` vs normalized `currentUrl` | `canonicalUrl !== currentUrl` | `WARNING` | -5 (On-Page) | `Analyzed: <url>` vs `Canonical: <canonical>` | Verify if the page is intentionally canonicalized to another URL. |
| **Canonical Tag Valid** | `CANONICAL_VALID` | On-Page | Deterministic | `canonicalUrl` equals normalized `currentUrl` | Exact URL match | `PASS` / `GOOD` | 0 (No penalty) | Self-referencing canonical confirmed | No action needed. |
| **Missing Page Title** | `TITLE_MISSING` | On-Page | Deterministic | `<title>` tag presence in `<head>` | `title.length === 0` | `CRITICAL` | -35 (On-Page) | 0 `<title>` elements detected | Add a descriptive `<title>` tag (40–60 characters) inside `<head>`. |
| **Page Title Too Short** | `TITLE_TOO_SHORT` | On-Page | Heuristic | Character length of `<title>` | $\text{length} < 25$ characters | `WARNING` | -10 (On-Page) | Title length: X characters | Expand title with primary topic and branding context. |
| **Page Title Too Long** | `TITLE_TOO_LONG` | On-Page | Heuristic | Character length of `<title>` | $\text{length} > 65$ characters | `WARNING` | -10 (On-Page) | Title length: X characters | Shorten title to 40–60 characters to prevent SERP snippet truncation. |
| **Optimal Title Length** | `TITLE_OPTIMAL` | On-Page | Heuristic | Character length of `<title>` | $25 \le \text{length} \le 65$ | `PASS` / `GOOD` | 0 (No penalty) | Title length within boundaries | No action needed. |
| **Missing Meta Description** | `META_DESC_MISSING` | On-Page | Heuristic | `<meta name="description">` content | Length === 0 | `WARNING` | -15 (On-Page) | 0 meta description tags found | Add a concise 120–160 character meta description summarizing page value. |
| **Short Meta Description** | `META_DESC_TOO_SHORT` | On-Page | Heuristic | Character length of meta description | $0 < \text{length} < 70$ | `RECOMMENDATION` | -5 (On-Page) | Description length: X characters | Expand meta description to 120–160 characters with a clear call-to-action. |
| **Long Meta Description** | `META_DESC_TOO_LONG` | On-Page | Heuristic | Character length of meta description | $\text{length} > 165$ characters | `RECOMMENDATION` | -5 (On-Page) | Description length: X characters | Refine meta description to under 160 characters to avoid SERP clipping. |
| **Optimal Meta Description** | `META_DESC_OPTIMAL` | On-Page | Heuristic | Character length of meta description | $70 \le \text{length} \le 165$ | `PASS` / `GOOD` | 0 (No penalty) | Meta description length within bounds | No action needed. |
| **Missing H1 Heading** | `H1_MISSING` | Headings | Deterministic | Number of `<h1>` tags in document | `h1Count === 0` | `CRITICAL` | -25 (On-Page) | 0 `<h1>` tags detected | Add exactly one prominent `<h1>` tag representing the page's primary topic. |
| **Multiple H1 Headings** | `H1_MULTIPLE` | Headings | Heuristic | Number of `<h1>` tags in document | `h1Count > 1` | `WARNING` | -10 (On-Page) | Detected N `<h1>` tags with texts | Keep one primary `<h1>` and restructure secondary headings as `<h2>`/`<h3>`. |
| **Single H1 (Optimal)** | `H1_OPTIMAL` | Headings | Heuristic | Exactly 1 `<h1>` tag with topic/target alignment | `h1Count === 1` & aligned | `PASS` / `GOOD` | 0 (No penalty) | Single aligned `<h1>` text | No action needed. |
| **H1 Target Keyword Mismatch** | `H1_KEYWORD_MISMATCH` | Headings | Heuristic | Target mode: H1 text against user target keywords | Target keyword not in H1 | `RECOMMENDATION` | 0 (Guidance) | H1 text vs supplied target keywords | Naturally incorporate primary target keyword into the H1. |
| **H1 Extracted Topic Mismatch** | `H1_TOPIC_MISMATCH` | Headings | Heuristic | Automatic mode: H1 text against extracted primary topics | Primary topic not in H1 | `RECOMMENDATION` | 0 (Guidance) | H1 text vs extracted primary topics | Rewrite H1 to clearly communicate the page's primary subject. |
| **Skipped Heading Hierarchy** | `HEADING_LEVEL_SKIPPED` | Headings | Heuristic | Sequential order of heading levels (H1 $\to$ H3) | Non-sequential leap $> 1$ level | `WARNING` | -10 (On-Page) | Heading sequence jumps (e.g. H1 to H3) | Nest headings sequentially without skipping intermediate levels. |
| **Missing Viewport Meta Tag** | `VIEWPORT_MISSING` | Mobile | Deterministic | `<meta name="viewport">` tag presence | Count === 0 | `CRITICAL` | -60 (Mobile) | 0 viewport tags detected | Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. |
| **Viewport Configured** | `VIEWPORT_CONFIGURED` | Mobile | Deterministic | `<meta name="viewport">` content | Valid width directive | `PASS` / `GOOD` | 0 (No penalty) | Viewport tag verified | No action needed. |
| **Missing Image Alt Text** | `IMAGES_MISSING_ALT` | Images | Heuristic | `<img>` elements without valid `alt` attribute | `missingAlt > 0` | `WARNING` | Scaled -1 to -30 (Links/Images) | X of Y images lack alt text | Add concise, descriptive alt attributes to content images; use `alt=""` for decorative. |
| **100% Image Alt Coverage** | `IMAGE_ALT_OPTIMAL` | Images | Heuristic | Ratio of images with valid alt text | `altCoverageRatio === 100%` | `PASS` / `GOOD` | 0 (No penalty) | All images have alt attributes | No action needed. |
| **Thin Content / Low Words** | `LOW_WORD_COUNT` | Content | Heuristic | Total visible body word count | $\text{wordCount} < 250$ words | `WARNING` | -15 to -35 (Content) | Visible word count: X words | Expand content with detailed explanations, use cases, and supporting subtopics. |
| **Sufficient Content Volume** | `CONTENT_VOLUME_SUFFICIENT` | Content | Heuristic | Total visible body word count | $\text{wordCount} \ge 250$ words | `PASS` / `GOOD` | 0 (No penalty) | Word count: X words | No action needed. |
| **Missing Schema JSON-LD** | `SCHEMA_MISSING` | Structured Data | Heuristic | Schema.org JSON-LD scripts detected | Count === 0 | `RECOMMENDATION` | 0 (Guidance) | 0 schema scripts detected | Implement relevant Schema.org JSON-LD structured data (Article, WebPage, FAQ). |
| **Structured Data Detected** | `SCHEMA_DETECTED` | Structured Data | Deterministic | Schema.org JSON-LD scripts detected | Count $> 0$ | `PASS` / `GOOD` | 0 (No penalty) | Types: `Article, WebPage` | No action needed. |
| **Missing XML Sitemap** | `SITEMAP_MISSING` | Technical | Heuristic | Discovery at `/sitemap.xml` or in `robots.txt` | Sitemap not found | `RECOMMENDATION` | -10 (Technical) | No sitemap declaration | Create an XML sitemap and reference it in `robots.txt`. |
| **Keyword Stuffing Risk** | `KEYWORD_STUFFING_RISK` | Keywords | Heuristic | Any keyword density percentage | $\text{density} > 5.0\%$ | `WARNING` | -15 (Content) | Keyword density $> 5.0\%$ | Replace repetitive phrases with natural synonyms and pronouns. |
| **Slow Server Response Time** | `SLOW_RESPONSE_TIME` | Technical | Deterministic | Measured initial response time (TTFB) | $\text{responseTimeMs} > 2500\text{ms}$ | `RECOMMENDATION` | -15 (Technical) | Response time: X ms | Optimize server caching, database queries, or deploy CDN edge caching. |
| **Core Web Vitals** | `CORE_WEB_VITALS_STATUS` | Performance | External / Field | Real-user CWV metrics (LCP, CLS, INP) | Browser execution required | `NOT_MEASURED` | 0 (Excluded) | "Requires headless browser or CrUX data" | Performance data not measured in this static analysis. |
| **Search Volume / KD / CPC** | `EXTERNAL_METRICS_STATUS` | External | External API | Third-party provider API connection | API token configured | `NOT_MEASURED` | 0 (Excluded) | "External SEO data provider not connected" | Connect an SEO data provider for live search volume. |

---

## 3. Mathematical Scoring System

### Category Weights
The overall SEO score is a weighted linear combination of five normalized category scores ($0 \le S_{\text{cat}} \le 100$):

$$\text{Overall Score} = \min\left(100, \max\left(0, \text{round}\left( \sum_{i=1}^{5} W_i \cdot S_i \right)\right)\right)$$

Where the category weights $W_i$ are defined in `lib/constants/index.ts`:

| Category | Constant Key | Weight ($W_i$) | Category Max Points | Description |
| :--- | :--- | :--- | :--- | :--- |
| **On-Page SEO** | `SCORING_WEIGHTS.ON_PAGE` | **0.30** (30%) | 100 | Title, meta description, heading structure, canonical tags, OpenGraph. |
| **Technical SEO** | `SCORING_WEIGHTS.TECHNICAL` | **0.25** (25%) | 100 | HTTP status, HTTPS security, indexability directives, robots.txt, sitemaps, TTFB. |
| **Content & Topics** | `SCORING_WEIGHTS.CONTENT_KEYWORDS` | **0.25** (25%) | 100 | Content volume, semantic depth, text ratio, keyword density / stuffing guards. |
| **Links & Images** | `SCORING_WEIGHTS.LINKS_IMAGES` | **0.10** (10%) | 100 | Internal link presence, dead links, image alt text coverage ratio. |
| **Mobile & UX** | `SCORING_WEIGHTS.MOBILE_UX` | **0.10** (10%) | 100 | Responsive viewport meta tag, document language attribute. |
| **Total** | | **1.00** (100%) | | |

### Itemized Category Deduction Formulations

#### 1. On-Page Score ($S_{\text{onpage}}$)
Starting base: **100 points**
- Title missing: $-35$
- Title length non-optimal ($<25$ or $>65$ chars): $-10$
- Meta description missing: $-15$
- Meta description non-optimal ($<70$ or $>165$ chars): $-5$
- H1 missing: $-25$
- Multiple H1s ($h1Count > 1$): $-10$
- Skipped heading levels (e.g., H1 $\to$ H3): $-10$
- Missing canonical URL: $-10$
- Canonical mismatch: $-5$
- Missing OpenGraph tags: $-5$
$$S_{\text{onpage}} = \max(0, \min(100, 100 - \sum \text{Deductions}))$$

#### 2. Technical Score ($S_{\text{tech}}$)
Starting base: **100 points**
- HTTP error status ($\ge 400$): $-60$
- Insecure HTTP (no HTTPS): $-30$
- Robots `noindex` directive active: $-40$
- Robots.txt bot disallowed: $-30$
- XML sitemap missing: $-10$
- Server response time $> 2500\text{ms}$: $-15$ (or $> 1500\text{ms}$: $-5$)
$$S_{\text{tech}} = \max(0, \min(100, 100 - \sum \text{Deductions}))$$

#### 3. Content & Topics Score ($S_{\text{content}}$)
Starting base: **100 points**
- Very thin content ($\text{wordCount} < 100$): $-35$
- Low content volume ($100 \le \text{wordCount} < 250$): $-15$
- Code bloat ($\text{textToHtmlRatio} < 5\%$): $-10$
- Keyword stuffing risk ($\text{density} > 5.0\%$): $-15$
$$S_{\text{content}} = \max(0, \min(100, 100 - \sum \text{Deductions}))$$

#### 4. Links & Images Score ($S_{\text{links\_images}}$)
Starting base: **100 points**
- Missing Image Alt Text: $-\text{round}\left(\frac{100 - \text{altCoverageRatio}}{100} \times 30\right)$ (if totalImages $> 0$)
- Zero links on page: $-20$
$$S_{\text{links\_images}} = \max(0, \min(100, 100 - \sum \text{Deductions}))$$

#### 5. Mobile & UX Score ($S_{\text{mobile}}$)
Starting base: **100 points**
- Missing viewport meta tag: $-60$
- Missing language attribute (`<html lang>`): $-15$
$$S_{\text{mobile}} = \max(0, \min(100, 100 - \sum \text{Deductions}))$$

---

## 4. Itemized Score Deduction Breakdown Example

To guarantee complete audit transparency, the scoring engine produces an itemized deduction ledger:

```json
{
  "overallScore": 74,
  "categoryScores": {
    "onPage": 65,
    "technical": 90,
    "content": 85,
    "links": 70,
    "mobile": 85
  },
  "deductions": [
    { "category": "onPage", "ruleCode": "META_DESC_MISSING", "label": "Missing Meta Description", "pointsDeducted": 15, "reason": "No <meta name=\"description\"> tag detected in document head." },
    { "category": "onPage", "ruleCode": "H1_MULTIPLE", "label": "Multiple H1 Headings", "pointsDeducted": 10, "reason": "Detected 3 H1 elements on page." },
    { "category": "onPage", "ruleCode": "CANONICAL_MISSING", "label": "Missing Canonical Tag", "pointsDeducted": 10, "reason": "No rel=\"canonical\" tag found." },
    { "category": "technical", "ruleCode": "SITEMAP_MISSING", "label": "XML Sitemap Not Discovered", "pointsDeducted": 10, "reason": "No sitemap found at /sitemap.xml or in robots.txt." },
    { "category": "content", "ruleCode": "LOW_WORD_COUNT", "label": "Low Content Volume", "pointsDeducted": 15, "reason": "Body text contains 180 words (< 250 word recommendation)." },
    { "category": "links", "ruleCode": "IMAGES_MISSING_ALT", "label": "Missing Image Alt Text", "pointsDeducted": 30, "reason": "0% alt text coverage across 4 images." },
    { "category": "mobile", "ruleCode": "LANG_MISSING", "label": "Missing Document Language", "pointsDeducted": 15, "reason": "<html> tag missing lang attribute." }
  ]
}
```

---

## 5. Audit of Questionable Rules & Corrections

### Audit Finding 1: False-Positive Multiple-H1 Warning on Single H1 Pages
- **Original Code Location**: `lib/technical/technicalAuditor.ts`, `lib/recommendations/recommendationEngine.ts`
- **Previous Flawed Behavior**: Evaluated boolean flags or generic heading items without checking `h1Count === 1`, causing pages with a single `<h1>` to receive a false warning *"Consolidate multiple H1 headings into a single primary H1"*.
- **Why It Was Questionable**: Confused users whose pages already followed best practices by having exactly one `<h1>`.
- **Corrected Behavior**: `h1Count > 1` is strictly required to trigger `H1_MULTIPLE`. When `h1Count === 1`, the audit records `H1_OPTIMAL` (Pass).

### Audit Finding 2: Conflating Extracted Topics with Target Keywords
- **Original Code Location**: `lib/recommendations/recommendationEngine.ts`, `lib/reports/reportGenerator.ts`, `lib/seo/contentContribution.ts`
- **Previous Flawed Behavior**: When no target keywords were supplied, automatically extracted terms were labeled as "target keywords", producing confusing messages like *"H1 lacks target keyword alignment"*.
- **Why It Was Questionable**: The user did not supply target keywords; implying they did eroded credibility.
- **Corrected Behavior**: Strict separation into `USER_TARGET`, `EXTRACTED`, and `RECOMMENDED`. If no target keywords are supplied, `targetKeywords = []`, mode is `AUTOMATIC_TOPIC_ANALYSIS`, and messaging uses *"H1 has weak alignment with the primary topic identified from the page content."*

### Audit Finding 3: Arbitrary Word Count Penalties on Compact Pages
- **Original Code Location**: `lib/reports/seoScorer.ts`
- **Previous Flawed Behavior**: Subtracted 10 points for any page under 600 words (`wordCount < 600`), and 25 points for $< 300$ words.
- **Why It Was Questionable**: Word count is not a universal Google ranking factor. Contact pages, login screens, calculators, and concise reference pages do not need 600 words.
- **Corrected Behavior**: Reduced threshold to flag only thin pages ($\text{wordCount} < 250$ words: $-15$ pts; $< 100$ words: $-35$ pts). Pages with $\ge 250$ words receive full content volume points.

### Audit Finding 4: Aggressive Text-to-HTML Ratio Penalties on Modern Web Applications
- **Original Code Location**: `lib/reports/seoScorer.ts`
- **Previous Flawed Behavior**: Deducted 20 points if `textToHtmlRatio < 8%` and 10 points if $< 15\%$.
- **Why It Was Questionable**: Modern SSR/React/Next.js pages contain hydration scripts and SVG icons that naturally reduce the raw text-to-HTML ratio without harming SEO or user experience.
- **Corrected Behavior**: Calibrated to only penalize extreme code bloat ($\text{ratio} < 5\%$: $-10$ pts).

---

## 6. Actionable Fix Schemas with Before & After Examples

Every SEO recommendation adheres to a 10-point actionable schema:

### Example: Multiple H1 Headings
- **Issue**: Multiple H1 headings detected (3 found).
- **Why It Matters**: Multiple primary headings create ambiguity in document outline hierarchy for search crawlers and screen readers.
- **Evidence**: Detected 3 `<h1>` elements: `"SEO Analyzer"`, `"Keyword Intelligence"`, `"Technical Audit"`.
- **What To Change**: Retain only the first `<h1>` as the page headline and convert secondary `<h1>` elements to `<h2>` or `<h3>`.
- **Before**:
  ```html
  <h1>SEO Analyzer</h1>
  <h1>Keyword Intelligence</h1>
  <h1>Technical Audit</h1>
  ```
- **After**:
  ```html
  <h1>SEO Analyzer</h1>
  <h2>Keyword Intelligence</h2>
  <h2>Technical Audit</h2>
  ```
- **Expected Benefit**: Creates a clean, unambiguous document outline and reinforces primary topic focus.
- **Caution**: Use heading tags to reflect semantic document hierarchy, not visual font styling.

---

## 7. Not-Measured States & External SEO Providers

The analyzer never fabricates data or assigns zero penalties for unavailable external metrics:

| Metric | Source Category | Available State | Unavailable State | Score Impact |
| :--- | :--- | :--- | :--- | :--- |
| **On-Page HTML & DOM** | Category A (Direct Crawl) | Extracted & Analyzed | Parse Error | Factor in Category Scores |
| **HTTP Status & Headers** | Category A (Direct Crawl) | Extracted & Analyzed | Network Failure | Factor in Technical Score |
| **Search Volume & CPC** | Category B (SEO Data Provider) | Live Numeric Value | `NOT_MEASURED` / `null` | **0 deduction (Neutral)** |
| **Keyword Difficulty** | Category B (SEO Data Provider) | Live Metric (0–100) | `NOT_MEASURED` / `null` | **0 deduction (Neutral)** |
| **Core Web Vitals** | Category B/C (Browser / CrUX) | Field Data / CrUX | `NOT_MEASURED` | **0 deduction (Neutral)** |
| **Search Console Impressions** | Category C (Private GSC OAuth) | Verified API Data | `NOT_MEASURED` | **0 deduction (Neutral)** |

---

## 8. Verification & Test Strategy

The SEO rule and scoring suite is verified by comprehensive automated tests covering:
1. `calculateSeoScores` boundary tests: Guaranteed $0 \le \text{score} \le 100$.
2. Itemized deduction generation and transparency checks.
3. Strict zero-penalty rule for missing external metrics.
4. Single H1 vs Multiple H1 deterministic evaluation.
5. Target Keyword Mode vs Automatic Topic Analysis Mode differentiation.
6. Keyword stuffing penalty activation at density $> 5.0\%$.
7. Alt text missing ratio proportional deductions.
