# SEO Intel Pro & AI SEO Content Intelligence Engine

A modern, production-grade SEO Competitive Intelligence, Content Analysis, and Evidence-Driven AI Content Generation Platform built with Next.js 14, React 19, TypeScript, Tailwind CSS / Vanilla Design Tokens, Cheerio, and Local GPU-Accelerated LLM Inference (Ollama Dolphin3 on NVIDIA GeForce RTX 4050).

---

## 🌟 Key Highlights

### 1. Evidence-Driven AI Content Intelligence Engine (Phases 1–9)
- **Multi-Stage Strategic Architecture**: Synthesizes search intent, competitor gap matrices, user goal synthesis, and structural blueprints before calling generation models.
- **Bounded Multi-Section Batch Generation**: Generates comprehensive guides in 1–3 bounded LLM batches with clean JSON schemas, avoiding expensive per-section roundtrips and timeout cascades.
- **Deterministic Quality Scoring & Metrics**:
  - Real word count calculation (0 LLM hallucination).
  - Flesch-Kincaid Readability & Reading Ease scoring.
  - Keyword naturalness, density, and placement analysis.
  - Schema.org JSON-LD generation (Article, HowTo, FAQPage).
  - Claim extraction & source provenance binding.
- **Fail-Safe Timeout & Global Deadline Architecture**:
  - Configurable batch timeout (`OLLAMA_CONTENT_TIMEOUT_MS`).
  - Strict global generation deadline (`AI_CONTENT_MAX_GENERATION_MS`).
  - Zero retries on expensive calls (`OLLAMA_CONTENT_RETRIES=0`) to eliminate retry storms.
  - Truncated JSON recovery and graceful per-batch deterministic fallback.
  - Transparent error signaling (`CONTENT_GENERATION_LLM_TIMEOUT`) if all LLM batches fail.

### 2. Local GPU Acceleration (NVIDIA RTX 4050)
- Seamless local inference via **Ollama** running `dolphin3:latest`.
- ~4.1 GB VRAM offload on NVIDIA GeForce RTX 4050 Laptop GPU.
- Benchmark-calibrated token budgets matching measured inference speeds (~1.53 tokens/sec).
- Unified single-command startup via `npm run dev` (orchestrates Next.js + Ollama background health check).

### 3. Real-Time UI Progress & Generation State Machine
- Dynamic multi-stage state transitions: `planning` ➔ `generating` ➔ `validating` ➔ `completed` / `degraded` / `failed`.
- Live elapsed timer and active GPU hardware telemetry badge.
- Fallback notice indicators if deterministic recovery is utilized for any section.
- Non-blocking error handling with clear retry capabilities.

### 4. SEO Competitive Intelligence & Analysis Suite
- **Zero Metric Fabrication Rule**: Strict classification of Category A (Direct DOM signals), Category B (External API data with unavailable notices), and Category C (Private GSC/GA data).
- **Page Elements & Tag Explorer**: Complete DOM inspection across Metadata, Headings (H1–H6), Social tags, Images, and JSON-LD.
- **Competitor Comparison Matrix (2–5 Websites)**: Parallel crawling, Keyword Gap, and Content Gap analysis.
- **Multi-Format Exporting**: 18-sheet formatted Excel workbook (.xlsx), CSV, and JSON data exports.

---

## 📐 Architecture

```text
├── app/
│   ├── api/
│   │   ├── ai-seo/               # AI SEO Content Generation & Analysis APIs
│   │   │   ├── content/generate/ # Bounded batch content generation endpoint
│   │   │   └── health/           # Ollama / GPU health check endpoint
│   │   └── analyze/              # Core page & competitor crawl endpoints
│   ├── page.tsx                  # Main application dashboard
│   └── layout.tsx                # Root layout & font configuration
├── components/
│   ├── content/                  # AI Content Generator view & state machines
│   ├── Navbar.tsx                # Navigation & live GPU status indicator
│   └── ...                       # SEO analysis UI components
├── lib/
│   ├── ai-seo/                   # AI SEO Engine
│   │   ├── ai-provider.ts        # Provider abstractions (Ollama, Claude, OpenAI, Mock, RuleInformed)
│   │   ├── content-generator.ts  # Bounded batching, deadline enforcement, assembly
│   │   ├── content-planner.ts    # Intent classification, gap synthesis, blueprint builder
│   │   ├── content-scorer.ts     # Flesch-Kincaid, keyword density, claim extraction
│   │   └── content-types.ts      # TypeScript schemas, contracts & telemetry models
│   ├── crawler/                  # SSRF-protected crawler & DOM parser
│   └── utils/                    # Logger, metrics, formatters
├── scripts/
│   ├── dev-ai.mjs                # Single-command startup (Next.js + Ollama health check)
│   ├── benchmark-dolphin3.mjs    # Controlled inference speed benchmark suite
│   └── test-real-generator.ts    # End-to-end integration test runner
└── tests/                        # 503+ Unit & Integration Test Suite
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20 (Node.js v22 recommended)
- **npm** >= 10
- **Ollama** (optional, for local AI content generation) with `dolphin3` model:
  ```bash
  ollama pull dolphin3
  ```

### Installation
```bash
# Clone the repository
git clone https://github.com/kamlesh/KeywordExtractor.git
cd KeywordExtractor

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env.local` file in the root directory (refer to `.env.example`):
```env
# AI Content Provider Configuration
AI_SEO_PROVIDER=OLLAMA_LOCAL
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=dolphin3

# Bounded Generation Performance & Deadlines
OLLAMA_CONTENT_TIMEOUT_MS=240000
AI_CONTENT_MAX_GENERATION_MS=540000
OLLAMA_CONTENT_RETRIES=0
```

### Running Locally
To run the full stack with automatic Ollama model discovery and local GPU check:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the comprehensive test suite (503+ automated tests covering intent classification, blueprints, bounded batching, fallbacks, readability, and schemas):
```bash
# Run all test suites
npm test

# Run TypeScript typechecks
npm run typecheck

# Build production Next.js bundle
npm run build
```

---

## 📊 Benchmark & Performance Telemetry

Controlled benchmarks for `dolphin3` on **NVIDIA GeForce RTX 4050 Laptop GPU (6 GB VRAM)**:

| Test | Output Tokens | Eval Rate | Total Duration | VRAM Used | GPU Utilization |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Test A** | 50 tokens | 1.55 tok/s | 47.1s | 4,131 MiB | 100% |
| **Test B** | 100 tokens | 1.54 tok/s | 65.6s | 4,131 MiB | 63% |
| **Test C** | 150 tokens | 1.53 tok/s | 98.4s | 4,131 MiB | 100% |
| **Test D** | 250 tokens | 1.53 tok/s | 164.4s | 4,131 MiB | 100% |

- **Inference Speed**: ~1.53 – 1.55 tokens/second.
- **800-Word Content Strategy**: 2 bounded batches (~300 tokens each) completing reliably within bounded windows without timeout cascading or infinite hangs.

---

## 📄 License
MIT License
