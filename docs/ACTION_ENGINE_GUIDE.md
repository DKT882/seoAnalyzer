# Phase 9: SEO Action Engine & Optimization Workflow Guide

## 1. Overview & Architecture

The **Phase 9 SEO Action Engine** is an orchestration and actionable transformation layer built directly on top of the established SEO analysis systems:
- **Phase 1–6**: Page-level SEO, rules, and semantic content intelligence (Authoritative for single-page analysis).
- **Phase 7**: Site-wide multi-URL crawl intelligence, link graphs, duplicate grouping, and orphan candidates (Authoritative for site-wide analysis).
- **Phase 8**: External SERP intelligence, intent distributions, and competitor topic gaps (Authoritative for search landscape analysis).

Phase 9 transforms raw findings into a unified, evidence-based, prioritized, and safe **SEO Action Plan** without duplicating underlying analyzers.

```
┌────────────────────────────────────────────────────────┐
│                      PHASE 1-6                         │
│  Page Rules, On-Page, Technical, Content Intelligence  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                      PHASE 7                           │
│  Site-Wide Crawl, Link Graph, Duplicates, Orphans      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                      PHASE 8                           │
│  External Search & SERP Analysis, Competitor Gaps      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             PHASE 9: SEO ACTION ENGINE                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Unified Action Transformation (6 Pillars)     │  │
│  │ 2. Multi-Page Consolidation & Grouping           │  │
│  │ 3. Safety Guardrails & Destructive Action Check  │  │
│  │ 4. Dependency DAG & Topological Ordering         │  │
│  │ 5. Deterministic Fingerprinting (SHA-256)        │  │
│  │ 6. Transparent Optimization Priority (0-100)     │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│ Memory & SQLite Store │       │  Interactive Action   │
│   & Comparison Engine │       │    Center Dashboard   │
└───────────────────────┘       └───────────────────────┘
```

---

## 2. Core Pillars of Every Recommendation

Every generated `SeoAction` adheres strictly to the 6 Pillars of evidence-based optimization:

1. **Observation**: Concrete, measured fact detected during the audit (e.g., "Meta description is duplicated across 15 URLs").
2. **Measured Evidence**: Specific data points with full audit provenance, metric name, observed value, and URL context.
3. **Interpretation**: Plain-English explanation of why this matters for search engine indexing and user experience.
4. **Exact Action**: Actionable step-by-step instructions for implementation.
5. **Expected Benefit**: Realistic technical outcome (strictly avoiding fabricated ranking promises).
6. **Safety & Caution**: Risk warnings, destructive action safeguards, and staging verification checklists.

---

## 3. Transparent Optimization Priority (0–100)

The priority score is calculated deterministically with zero black-box scoring. It is never labeled "Ranking Impact", "Ranking Probability", or "Google Score".

### Formula:
$$\text{Optimization Priority} = \text{Base(Severity)} + \text{Scope(URLs)} + \text{Effort(ROI)} + \text{Confidence} + \text{BlockerBonus}$$

| Component | Values & Weighting |
| :--- | :--- |
| **Base Severity** | `CRITICAL`: 50 pts \| `WARNING`: 30 pts \| `INFO`: 10 pts |
| **Scope Scaling** | 1 URL: +4 pts \| 2–5 URLs: +8 pts \| 6–20 URLs: +14 pts \| >20 URLs: +20 pts |
| **Effort ROI** | `LOW` (Quick win): +15 pts \| `MEDIUM`: +8 pts \| `HIGH`: 0 pts |
| **Confidence** | `HIGH`: +10 pts \| `MEDIUM`: +5 pts \| `LOW`: 0 pts \| `INSUFFICIENT`: -5 pts |
| **Blocker Bonus** | +5 pts if this action unblocks dependent downstream actions |

### Priority Levels:
- **`IMMEDIATE`**: 80 – 100
- **`HIGH`**: 60 – 79
- **`MEDIUM`**: 35 – 59
- **`LOW`**: 1 – 34

---

## 4. Safety Guardrails & Destructive Action Engine

Actions involving destructive operations are automatically flagged with `isDestructive: true`, `riskLevel: HIGH/MODERATE`, and an actionable **Staging Verification Checklist**:

- **Noindex & Robots Disallow**: Checked for unintended de-indexing risks.
- **Canonical Changes**: Checked for target 200 OK status, redirect loops, and equity shifts.
- **301 Redirects & URL Modifications**: Verified against 1:1 destination mapping and internal link updates.
- **Schema Removal**: Checked for loss of rich snippet eligibility.
- **Bulk Multi-Page Overhauls**: Flagged with batch testing recommendations.

---

## 5. Dependency-Aware Ordering

The dependency engine maps prerequisites to prevent wasted effort:
- **Indexability precedes Content**: Fixing text on a 404 or noindexed page is blocked until indexation is resolved.
- **Canonical precedes Internal Links**: Link equity is not adjusted until authoritative canonical targets are decided.
- **Topological Sorting**: Kahn's DAG algorithm sorts actions in execution sequence and breaks cycles safely.

---

## 6. Multi-Finding Consolidation & Site-Wide Grouping

Overlapping findings are merged into unified site-wide action cards:
- Multi-page crawl findings (e.g. 37 pages with weak contextual internal linking or duplicate titles) become **1 unified action card** with an `affectedUrls` array rather than 37 repetitive cards.
- Evidence provenance is preserved across all merged records.

---

## 7. Storage & Comparison Engines

- **Decoupled Store Interface**: `SeoActionStore`
- **Memory Store**: `MemorySeoActionStore` (stateless, fast, ideal for tests).
- **SQLite Store**: `SqliteSeoActionStore` (persisted in SQLite `seo_action_plans` and `seo_actions` tables).
- **Audit Comparison**: Compares baseline and target audit plans using deterministic SHA-256 fingerprints to identify:
  - `resolvedActions`
  - `newActions`
  - `unchangedActions`
  - `statusChanges`
  - `metricDeltas`

---

## 8. REST API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/actions` | `GET` | List stored action plans with domain filtering & pagination |
| `/api/actions` | `POST` | Save or persist an action plan |
| `/api/actions/generate` | `POST` | Generate an action plan on-the-fly from reports |
| `/api/actions/[id]` | `GET` | Retrieve action plan by ID |
| `/api/actions/[id]` | `DELETE` | Delete action plan by ID |
| `/api/actions/[id]/status` | `PATCH` | Update status (`OPEN`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `DISMISSED`) |
| `/api/actions/compare` | `POST` | Compare two audit snapshots (baseline vs target) |

---

## 9. Anti-Fabrication Guarantees

The Action Engine strictly enforces:
- **Zero Ranking Guarantees**: Never claims guaranteed rankings, positions, or search traffic.
- **Zero Fabricated Metrics**: No fake Domain Authority (DA), Keyword Difficulty (KD), Cost Per Click (CPC), or Search Volume.
- **Measured Provenance**: Every observation derives directly from measured on-page, crawl, or SERP data.
