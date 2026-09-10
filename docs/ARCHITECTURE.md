# SEO Keyword & Website Analyzer Architecture

## System Overview

```text
               +----------------------------------------------------+
               |                React 19 Frontend (Vite)            |
               | - URL Input & Validation  - Live Progress Tracker  |
               | - SEO Gauge Dashboard     - Keyword Matrix Table   |
               | - Heading Visualizer      - Technical Issues Audit |
               | - Robots/Sitemap Viewer   - JSON/CSV Exporter      |
               +-------------------------+--------------------------+
                                         |
                                  REST API / JSON
                                         |
                                         v
               +----------------------------------------------------+
               |             Node.js + Express Backend              |
               +-------------------------+--------------------------+
                                         |
       +------------------+--------------+---------------+------------------+
       |                  |                              |                  |
       v                  v                              v                  v
+--------------+   +---------------+              +---------------+  +--------------+
| Safe Crawler |   | HTML Parser   |              |  NLP Engine   |  | Technical    |
| - SSRF Guard |   | - Cheerio DOM |              | - Tokenizer   |  | Auditor      |
| - DNS Lookup |   | - Text Clean  |              | - Porter Stem |  | - HTTP/SSL   |
| - Size/Time  |   | - Meta/OG     |              | - N-grams 1-4 |  | - H1 Tree    |
| - Redirects  |   | - Schema/LD   |              | - TF-IDF      |  | - Viewport   |
+--------------+   +---------------+              +---------------+  +--------------+
       |                  |                              |                  |
       +------------------+--------------+---------------+------------------+
                                         |
                                         v
                    +-----------------------------------------+
                    |        Aggregator & Scoring Engine      |
                    | - 0-100 Keyword Score                   |
                    | - 0-100 Overall SEO Score               |
                    | - Severity Issues (Critical, Warn, Rec) |
                    +--------------------+--------------------+
                                         |
                                         v
                    +-----------------------------------------+
                    |        SQLite Embedded Database         |
                    | - Jobs, URLs, Keywords, Metrics, Audits |
                    +-----------------------------------------+
```

## Data Separation
1. **Public Page Data**: Direct deterministic analysis of live HTML, HTTP headers, robots.txt, sitemap.xml.
2. **External SEO Data**: Placeholders & interfaces for third-party tools (Ahrefs, Semrush, Moz).
3. **Private Owner Data**: Placeholders & interfaces for Google Search Console & Google Analytics.
