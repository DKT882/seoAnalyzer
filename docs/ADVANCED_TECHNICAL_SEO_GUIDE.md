# Advanced Technical SEO Intelligence Guide (Phase 5)

## 1. Overview & Architecture

Phase 5 of the SEO Analyzer implements an enterprise-grade **Technical SEO Intelligence Engine**. Its objective is to answer with deterministic accuracy:

> *"Can this page be crawled, understood, indexed, canonicalized, and technically presented correctly by modern search engines?"*

The system adheres strictly to the **Evidence-Based Technical SEO Principle**:

```
OBSERVATION
    ↓
EVIDENCE
    ↓
INTERPRETATION
    ↓
ACTION
    ↓
BEFORE / AFTER REMEDIATION
    ↓
EXPECTED BENEFIT
    ↓
CAUTION / BOUNDARIES
```

---

## 2. Core Technical Audit Pillars

### A. HTTP Status Semantic Classification
Every response status is classified semantically:
- **`200 / 201` (OK):** Fully accessible for search bot retrieval.
- **`301 / 308` (Permanent Redirect):** Directs crawlers to transfer link equity and consolidate canonical signals to the target.
- **`302 / 303 / 307` (Temporary Redirect):** Temporary redirection where search engines retain the original URL in the index.
- **`404` (Not Found):** Resource absent; de-indexed naturally over time.
- **`410` (Gone):** Permanent removal; de-indexed immediately.
- **`429` (Too Many Requests):** Rate limiting active; crawlers back off crawl rates.
- **`5xx` (Server Failure):** Catastrophic server outage; search bots retry with exponential backoff.

### B. Redirect Assessment & Loop Prevention
- **Redirect Types:** `NONE`, `PERMANENT`, `TEMPORARY`, `CHAIN`, `LOOP`.
- **Redirect Chain:** Detects multi-hop sequences (e.g. `http://example.com` → `https://example.com` → `https://example.com/home` → `https://example.com/home/`). Recommends consolidating hops into a single direct 301.
- **Redirect Loop:** Detects cyclical hops (e.g. `A` → `B` → `A`) and flags critical errors with exact hop telemetry.
- **Migration Normalization:** Validates HTTP → HTTPS, www ↔ non-www, and trailing slash consistency.

### C. Canonicalization Deep Audit
- **`SELF_CANONICAL`:** Self-referencing canonicals that match the current URL are recognized as completely valid and are **never** flagged for modification.
- **`CANONICALIZED_TO_OTHER`:** Acknowledges intentional pagination, filter, or parameter consolidation.
- **`CANONICAL_REDIRECT_CONFLICT`:** Detects canonical tags pointing to URLs that respond with redirects (`301`/`302`). Recommends updating canonical directly to the final destination.
- **`CANONICAL_CROSS_DOMAIN`:** Detects syndication canonicals pointing to external domains.
- **`NOINDEX_CANONICAL_CONFLICT`:** Detects pages pairing `noindex` directives with non-matching canonicals, flagging contradictory indexing vs consolidation instructions.
- **`CANONICAL_MISSING`:** Flags missing canonical link tags and generates copy-paste before/after markup.

### D. Robots Meta & Bot-Specific Directives
- **Directives Extracted:** `index`, `noindex`, `follow`, `nofollow`, `noarchive`, `nosnippet`, `noimageindex`, `max-snippet`, `max-image-preview`, `max-video-preview`.
- **Bot Overrides:** Evaluates `<meta name="googlebot">` and `<meta name="bingbot">` independently. Detects bot-specific overrides without misclassifying intentional targeting.
- **Contradiction Detection:** Detects mutually exclusive directives within the same tag (e.g. `content="index, noindex"` or `content="follow, nofollow"`).
- **Cross-Layer Signal Alignment:** Analyzes HTTP `X-Robots-Tag` headers and verifies consistency with HTML `<meta name="robots">`. Flags `INDEXABILITY_SIGNAL_CONFLICT` when headers contradict HTML tags.

### E. Robots.txt Compliance
- **File Discovery:** Checks `/robots.txt` safely using the security-hardened fetcher.
- **Directive Evaluation:** Parses `User-agent`, `Allow`, `Disallow`, `Crawl-delay`, and `Sitemap` declarations.
- **Page Disallow Check:** Evaluates whether the analyzed URL path is disallowed for the search crawler user-agent.
- **Non-Requirement Principle:** Missing `robots.txt` is classified as informational/neutral, as a website does not require `robots.txt` to be indexable.

### F. XML Sitemap Intelligence
- **Discovery:** Auto-discovers sitemaps declared in `robots.txt` as well as conventional `/sitemap.xml` and `/sitemap_index.xml`.
- **Parsing:** Safely parses standard `<urlset>` and `<sitemapindex>` feeds.
- **Membership Status:** Categorized as `IN_SITEMAP`, `NOT_IN_SITEMAP`, `SITEMAP_NOT_MEASURED` (when sample is bounded), or `SITEMAP_UNAVAILABLE`.
- **Sitemap Canonical Consistency:** Flags `SITEMAP_CANONICAL_MISMATCH` when the sitemap lists a URL that differs from the page's declared canonical tag.

### G. Internationalization (Hreflang)
- **Tag Validation:** Validates ISO 639-1 language codes and optional ISO 3166-1 region suffixes (e.g. `en`, `en-US`, `es-ES`, `de-DE`, `x-default`).
- **Cluster Integrity:** Flags invalid language codes, duplicate language alternates, and missing `x-default` fallbacks.
- **Self-Reference:** Ensures localized pages include a self-referencing alternate tag matching the page URL.
- **HTML Lang Alignment:** Verifies alignment between `<html lang="...">` and the hreflang alternate cluster.

### H. URL Architecture & Hygiene
- **Structural Integrity:** Analyzes length, encoded characters, spaces, and repeated directory segments (`/category/category/`).
- **Session Identifier Leaks:** Detects session state parameters (`phpsessid`, `jsessionid`, `sid`, `sessionid`) and recommends cookie-based session management.
- **Tracking Parameter Hygiene:** Tracks analytics query parameters (`utm_*`, `gclid`, `fbclid`).

### I. Internal Link Graph & Navigation
- **Link Auditing:** Categorizes internal vs external links, nofollow distribution, and anchor text quality.
- **Anchor Text Quality:** Identifies empty anchors, generic phrases ("click here", "read more"), and repeated anchor text.
- **Broken Link Detection:** Tracks 4xx/5xx dead links with exact source and destination coordinates.

### J. Image Technical SEO
- **ALT Coverage:** Measures exact percentage of images with descriptive alt text.
- **Dimension Attributes:** Detects missing `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).
- **Responsive & Lazy Loading:** Audits `loading="lazy"`, `srcset`, and `<picture>` implementations.

### K. Structured Data (JSON-LD)
- **Extraction & Syntax:** Extracts and validates Schema.org JSON-LD and Microdata blocks.
- **Syntax Error Detection:** Flags malformed JSON, unclosed brackets, and missing required properties.
- **Schema/Content Coherence:** Compares visible page text with schema entity names.

### L. Social Card Metadata
- **Open Graph:** Audits `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
- **Twitter Cards:** Audits `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- **Informational Classification:** Categorized as social preview enhancements rather than direct search ranking factors.

### M. Infrastructure & Security
- **HTTPS & Mixed Content:** Detects insecure `http://` subresources (images, scripts, stylesheets) on HTTPS pages.
- **Security Headers:** Inspects `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), and `X-Content-Type-Options`.
- **Content-Type Verification:** Ensures responses return valid `text/html` or `application/xhtml+xml`. Rejects binary/unsupported types (`application/json`, `application/pdf`).

---

## 3. Indexability & Crawlability Decision Models

The system enforces a strict separation between **Crawlability** (can bots fetch the document?) and **Indexability** (can bots index the document?):

### Crawlability Decision States
- **`CRAWLABLE`:** 200 OK status + allowed in `robots.txt` + no redirect loops.
- **`BLOCKED_BY_ROBOTS`:** Matching Disallow rule in `robots.txt`.
- **`REDIRECTED`:** Server returned 3xx redirect.
- **`HTTP_ERROR`:** Server returned 4xx or 5xx error.
- **`NOT_MEASURED`:** Crawlability could not be evaluated.

### Indexability Decision States
- **`INDEXABLE`:** No `noindex` directives, HTTP 200, valid canonical, no blocking conflicts.
- **`NOT_INDEXABLE`:** Explicit `noindex` in meta or X-Robots-Tag, or 4xx/5xx status.
- **`CONDITIONAL`:** Canonical points to another URL, or page is blocked in `robots.txt`.
- **`CONFLICTING_SIGNALS`:** Header contradicts HTML (e.g. `X-Robots-Tag: noindex` vs `<meta name="robots" content="index">`).
- **`NOT_MEASURED`:** Signals cannot be observed.

---

## 4. Scoring Methodology & Deduplication

### Deduplication Rules
To prevent compounding penalties for a single underlying issue:
1. **Multiple `noindex` signals:** If both HTML meta and `X-Robots-Tag` specify `noindex`, the indexability deduction (-40 pts) is applied **once**.
2. **Canonical Mismatches & Conflicts:** If a canonical URL points to a redirect, canonical deductions are deduplicated to avoid double penalties.
3. **HTTP Errors:** A 500 error applies the -60 pt HTTP error penalty and bounds technical score to [0, 100].

### Benchmark Ordering
The calibrated scoring hierarchy ensures deterministic score ordering:
$$\text{Clean Optimized Page (95-100)} > \text{Minor Metadata Issue (85-90)} > \text{Canonical Conflict (75-80)} > \text{Indexability Conflict / Noindex (45-55)} > \text{Server Error 5xx (0-20)}$$

---

## 5. Security & SSRF Safeguards

All technical network requests (target page fetching, `robots.txt` discovery, `sitemap.xml` parsing, subresource checks) strictly route through the hardened `safeFetch` client:
- DNS pre-resolution blocks RFC-1918 private ranges, loopbacks, and cloud metadata endpoints (`169.254.169.254`).
- Strict HTTP/HTTPS protocol whitelisting.
- Bounded memory limits (1MB for robots.txt, 5MB for sitemaps, 15MB for HTML).
- Hard timeouts prevent hanging background tasks.

---

## 6. What We Do NOT Measure (Anti-Fabrication Standard)

In accordance with strict production integrity, the analyzer explicitly marks the following as `NOT_MEASURED`:
- Google's internal index status or actual Googlebot crawl frequency.
- Google's internal canonical algorithm decision when signals conflict.
- Keyword search volume or keyword difficulty without a live external data provider.
- Actual real-user Core Web Vitals (CrUX) field metrics.
- Guaranteed ranking positions or percentage traffic increases.
