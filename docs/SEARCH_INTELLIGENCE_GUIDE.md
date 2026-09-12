# Phase 8: External Search Intelligence & SERP Analysis Guide

## 1. Executive Summary & Core Principles

Phase 8 extends the SEO Analyzer from authoritative single-page audits (Phases 1–6) and site-wide crawl intelligence (Phase 7) into evidence-based **External Search Intelligence & SERP Analysis**.

The search intelligence subsystem combines real-world SERP evidence with internal on-page and site-level findings **without replacing, modifying, or duplicating authoritative single-page audit scores**.

### Core Guarantees & Constraints
1. **Zero Metric Fabrication**: The system **never fabricates** Google rankings, ranking probabilities, traffic estimates, search volume, CPC, keyword difficulty (KD), Domain Authority (DA), Page Authority (PA), or Google PageRank.
2. **Provider Neutrality**: The entire analysis engine depends strictly on the `SearchProvider` interface and normalized data structures (`NormalizedSerpSnapshot`, `SerpResultItem`). Zero analyzer logic couples directly to vendor-specific APIs.
3. **No Silent Live→Mock Fallback**: If a live external provider (e.g. DataForSEO) is configured but fails, the system bubbles the provider failure to the user. Mock search data is strictly labeled as `DEMO/TEST DATA` with `isSyntheticTest: true`.
4. **Position Semantics**:
   - `serpPosition`: Continuous integer (1..N) reflecting total vertical placement across all SERP components (features, snippets, ads, organic results).
   - `organicPosition`: Integer (1..M) assigned **strictly** to standard organic listings (`resultType === 'ORGANIC'`). SERP features (PAA, Local Pack, Knowledge Panel) receive `organicPosition: undefined`.
5. **Cost Safety**: Provider request limits (`maxProviderRequestsPerAudit`) are enforced **before** dispatching any external HTTP request.
6. **Observation Provenance**: Every observation, snippet, and archetype carries structured provenance detailing source, provider, timestamp, device, and extraction method.

---

## 2. Architectural Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Search Intelligence Orchestrator                     │
│               (SEARCH_QUERY | PAGE_SEARCH | SITE_SEARCH)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Candidate Query Normalization                        │
│            (Unicode NFKC, Zero-Width Clean, Bounded Dedupe)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       SERP Collection Engine                           │
│     (Bounded Concurrency Pool, Pre-Check Cost Guard, Cache Check)      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ MockSearchProvider     │      │ DataForSeoSearchProvider│
       │ (DEMO/TEST - Synthetic)│      │ (Live Bounded Provider)│
       └────────────┬───────────┘      └────────────┬───────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       SERP Normalizer & Guard                          │
│        (SHA-256 Fingerprint, SSRF Validation, Private IP Drop,         │
│          serpPosition vs organicPosition, Feature Classification)      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ MemorySerpSnapshotStore│      │ SqliteSerpSnapshotStore│
       └────────────────────────┘      └────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Search Intelligence Analyzers                      │
│                                                                        │
│  ├─ Search Intent Pattern: Dominant Intent vs OBSERVED_SERP_INTENT_MIXED│
│  ├─ Page-Type Archetype: Inferred from SERP Metadata vs User Page     │
│  ├─ Topic Pattern & Gap: Provenance-Tagged (SERP vs Fetched HTML)     │
│  ├─ Observed SERP Domains: Non-speculative Frequency & Avg Rankings    │
│  ├─ Deep Competitor Enrichment: (Optional, Bounded, SSRF-Protected)    │
│  └─ Opportunity Engine: 6-Pillar Recs & Phase 7 Link Graph Integration │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Explicit Search Audit Modes

The subsystem operates in three distinct, explicit audit modes:

### 1. `SEARCH_QUERY`
- **Input**: User-provided query strings.
- **Workflow**: Normalizes queries, collects SERP snapshots, identifies observed intent and archetypes, extracts common topics, and aggregates observed domains.
- **Target Audience**: Ad-hoc keyword research and SERP layout inspection.

### 2. `PAGE_SEARCH_INTELLIGENCE`
- **Input**: User single-page SEO report (`SEOReport`).
- **Candidate Expansion**:
  1. User target keywords (`report.targetKeywords`)
  2. Extracted primary topics (`report.contentIntelligence.primaryTopics`)
  3. Recommended queries (`report.keywords.recommended`)
- **Workflow**: Binds on-page content with external search demand, detecting topic gaps, intent mismatches, and archetype divergences.

### 3. `SITE_SEARCH_INTELLIGENCE`
- **Input**: Multi-page website crawl report (`WebsiteCrawlReport`).
- **Candidate Expansion**:
  - Derived from top topic clusters (`crawl.topicClusterHealth` or `crawl.keywordStrategy.clusters`).
  - **Bounded strictly BEFORE dispatching provider requests** (capped by `limits.maxQueries`, default: 20).
- **Workflow**: Uncovers site-wide topical authority opportunities and generates cross-page internal link recommendations.

---

## 4. Position Semantics & Feature Taxonomy

### Position Semantics
| Field | Type | Description |
| :--- | :--- | :--- |
| `serpPosition` | `number` (1..N) | Physical layout rank in the SERP layout (including featured snippets, local packs, and organic results). |
| `organicPosition` | `number \| undefined` | Strictly populated (1..M) **only** for `resultType === 'ORGANIC'`. Undefined for features. |

### Supported SERP Features
1. `ORGANIC`: Standard web search result listing.
2. `FEATURED_SNIPPET`: Prominent answer card at top of SERP.
3. `LOCAL_PACK`: Map listing with business locations and ratings.
4. `PEOPLE_ALSO_ASK`: Accordion list of related questions with answer snippets.
5. `VIDEO`: Video carousels and rich video thumbnails.
6. `IMAGE`: Image pack or grid thumbnails.
7. `NEWS`: Top stories and news publisher carousels.
8. `SHOPPING`: Product carousel with pricing and merchant links.
9. `RELATED_SEARCHES`: End-of-page related search term chips.
10. `KNOWLEDGE_PANEL`: Sidebar entity overview card.

---

## 5. Provenance & Attribution Model

Every observation carries rigorous provenance tracking:

```typescript
export interface ObservationProvenance {
  source: 'EXTERNAL_SERP' | 'FETCHED_COMPETITOR_HTML' | 'PAGE_ANALYSIS';
  provider: string;
  collectedAt: string;
  location: string;
  language: string;
  device: SearchDevice;
  extractionMethod: 'SERP_SNIPPET' | 'FETCHED_HTML' | 'HEADING_AST';
  isSyntheticTest: boolean;
  fingerprint: string;
}
```

### Topic & Page-Type Provenance Types
- `PageTypeProvenance`:
  - `INFERRED_FROM_SERP_SNIPPET`: Rapid heuristic classification derived from SERP titles, snippets, and URL paths.
  - `ANALYZED_FROM_FETCHED_HTML`: High-fidelity structural analysis from full competitor page HTML.
- `TopicProvenance`:
  - `SERP_SNIPPET_DERIVED`: Extracted from SERP snippet text.
  - `FETCHED_PAGE_ANALYSIS`: Extracted from fetched competitor page body text.
  - `HEADING_DERIVED`: Extracted from competitor `<h1>`-`<h6>` AST hierarchy.

---

## 6. Search Opportunity Engine & 6-Pillar Format

All search recommendations strictly follow the established 6-pillar format:

1. **Observation**: Concrete statement of the observed search pattern or discrepancy.
2. **Evidence**: Verifiable citation of sampled SERP data, percentages, and snippet occurrences.
3. **Interpretation**: SEO significance explaining search engine and user expectations.
4. **Action**: Clear, actionable step for content teams or engineers.
5. **Expected Benefit**: Anticipated improvement in search relevance or intent satisfaction.
6. **Caution**: Risk guardrail preventing keyword stuffing, artificial link insertion, or unnecessary page restructuring.

### Phase 7 Internal Link Graph Integration
When a SERP content gap is detected on a target page, the engine inspects the site's `InternalLinkGraph`. If a dedicated page on the domain already covers the sub-topic, the engine emits a contextual internal link recommendation linking the source page to the sibling topic page.

---

## 7. Resource & Cost Budget Controls

| Parameter | Default | Purpose |
| :--- | :--- | :--- |
| `maxQueries` | 20 | Maximum queries processed in a single audit run. |
| `maxResultsPerQuery` | 20 | Maximum result listings normalized per query. |
| `maxConcurrentSearches` | 3 | Maximum simultaneous provider HTTP requests. |
| `maxProviderRequestsPerAudit` | 25 | Hard budget ceiling on billable API requests. |
| `maxCompetitorPages` | 5 | Maximum competitor URLs fetched for deep HTML analysis. |
| `maxCompetitorResponseBytes` | 15 MB | Cumulative byte limit for competitor page fetching. |
| `totalSearchTimeoutMs` | 60,000 ms | Overall search audit execution timeout. |

---

## 8. API Reference

### 1. Execute Search Audit
- **Endpoint**: `POST /api/search`
- **Payload**:
  ```json
  {
    "mode": "SEARCH_QUERY",
    "queries": ["best seo audit tool"],
    "location": "United States",
    "language": "en",
    "device": "DESKTOP",
    "forceRefresh": false
  }
  ```
- **Response**: `{ success: true, report: SearchIntelligenceAuditReport }`

### 2. Search Snapshot by Fingerprint / Query
- **Endpoint**: `GET /api/search/serp?query=...&location=...`
- **Response**: `{ success: true, snapshot: NormalizedSerpSnapshot }`

### 3. Search History & Snapshot Archive
- **Endpoint**: `GET /api/search/history?limit=50`
- **Response**: `{ success: true, snapshots: NormalizedSerpSnapshot[] }`

### 4. Search Opportunities Evaluation
- **Endpoint**: `POST /api/search/opportunities`
- **Payload**: `{ snapshot: ..., userPageReport: ... }`
- **Response**: `{ success: true, opportunities: [...], internalLinkIntegrations: [...] }`
