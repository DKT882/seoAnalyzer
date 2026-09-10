# SEO Intel Pro — Competitive Intelligence & Content Analysis Platform

A modern, production-grade SEO Competitive Intelligence & Content Analysis Platform built with TypeScript, Node.js, Express, Cheerio, SQLite, React 19, and Vite.

---

## Key Highlights

- **Zero Metric Fabrication Rule**: Strict classification of Category A (Directly Extracted HTML/DOM/Signals), Category B (External SEO Data requiring provider with clear unavailable notices), and Category C (Private GSC/GA data requiring owner authorization).
- **Page Elements & Tag Explorer**: Complete DOM inspection across Metadata, Headings (H1–H6), Social (OG/Twitter), Content, Links, Images, and JSON-LD Structured Data with status indicators and actionable recommendations.
- **Categorized Keyword Intelligence**: Primary, Secondary, Short-Tail, Long-Tail, Questions (`what`, `how`, `why`, `can`, etc.), Entities, Topic Clusters, and Ranking Opportunities.
- **Content Contribution & Signal Heatmap**: Section-by-section signal evaluation (Title, H1, H2/H3, Intro, Body, Lists, Tables, Schema, ALT, Internal Links) and interactive Content Signal Heatmap.
- **Competitor Comparison (2–5 Websites)**: Parallel crawling, side-by-side matrices, Keyword Gap Matrix, Content Gap Analysis (missing topics, entities, questions), Strengths vs Deficiencies, and Outrank Opportunity Recommendations.
- **Domain Overview & Data Sources Settings**: Multi-category visibility dashboard and status reporting for DataForSEO, Semrush, Ahrefs, GSC, and GA4.
- **Multi-Sheet Excel (.xlsx) & Granular CSV Exports**: Professional 18-sheet formatted Excel workbook export, granular CSV downloads, printable HTML reports, and raw JSON export.
- **SSRF-Protected Safe Crawler**: Pre-request DNS resolution blocking IPv4/IPv6 private and loopback networks.
- **Browser Address Bar Routing**: Dynamic URL synchronization across `/analyzer`, `/competitors`, `/domain`, `/history`, `/methodology`, and `/report/:id/:subtab`.

---

## Architecture Overview

```text
├── backend/          # Node.js + Express + SQLite + Crawler + NLP Engine
│   ├── src/
│   │   ├── api/          # REST API routes & controllers
│   │   ├── crawler/      # SSRF-guarded HTTP client
│   │   ├── parser/       # Cheerio HTML parser & Tag Explorer
│   │   ├── seo/          # Metadata, Content Contribution & Heatmap
│   │   ├── keywords/     # N-gram extraction, scoring, opportunities
│   │   ├── competitors/  # 2-5 URL comparator, Keyword Gap & Content Gap
│   │   ├── providers/    # External SEO API provider abstractions
│   │   ├── reports/      # Multi-sheet XLSX & CSV exporters
│   │   ├── db/           # SQLite schema & repository
│   │   └── utils/        # SSRF guard, URL normalizer, logger
│   └── tests/            # Automated test suite (34 tests, 11 suites)
├── frontend/         # React 19 + TypeScript + Vite + Vanilla CSS design system
│   ├── src/
│   │   ├── components/   # Navbar, UI elements
│   │   ├── features/     # Analyzer, Keywords, Tags, Content, Competitors, Domain, Export, Settings
│   │   ├── pages/        # History, Methodology
│   │   ├── services/     # API Client
│   │   └── utils/        # Address bar router & formatters
├── shared/           # Shared TypeScript models, interfaces, constants
└── docs/             # Technical specifications & documentation
```

---

## Getting Started

### Prerequisites
- Node.js >= 20 (Node.js v22 recommended)
- npm >= 10

### Installation
```bash
# Install dependencies across all workspaces
npm install

# Build shared types package
npm run build:shared
```

### Running Locally
```bash
# Start backend server (Port 4000)
npm run dev:backend

# Start frontend development server (Port 3000)
npm run dev:frontend
```

### Testing & Verification
```bash
# Run unit and integration tests
npm run test

# Run TypeScript typechecks across all workspaces
npm run typecheck

# Build production bundles
npm run build
```

---

## License
MIT License
