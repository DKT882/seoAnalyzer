# Claude SEO Agent Architecture & Local LLM (Ollama) Integration Guide

## 1. Executive Summary

This guide documents the technical architecture, local model (Ollama) integration, provider abstraction, hardware-calibrated model selection, specialist agent reasoning, and Phase 9 integration of the **AI SEO Optimization Engine** (`lib/ai-seo/`).

The AI SEO layer transforms raw, deterministic measurements from Phases 1–8 into structured, prioritized, safe, and verifiable optimization patches without altering the authoritative measurements of the underlying analyzers.

```
┌────────────────────────────────────────────────────────┐
│     Existing SEO Analyzer (Phases 1–8 Deterministic)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          Evidence Builder (SEOEvidenceBuilder)         │
│          - Normalizes page, crawl, and SERP facts      │
│          - Zero fabrication / zero hallucinations      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          Claude SEO Knowledge Layer & Prompt Adapter   │
│          - Adapted from claude-seo/agents & skills     │
│          - 2026 Core Web Vitals (INP included, FID out)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│      SEOAIProvider Layer (Pluggable Local & Remote)    │
│  - OllamaProvider (Local Ollama daemon, native & v1)   │
│  - OpenAICompatibleProvider (vLLM / local endpoints)   │
│  - ClaudeAIProvider (Anthropic Claude API)             │
│  - RuleInformedProvider (100% Offline Deterministic)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│      Phase 9 Action Engine Integration (Authoritative)  │
│  - Deduplication & Consolidation                       │
│  - DAG Topological Dependency Resolution               │
│  - Deterministic Priority Scoring (0–100)              │
│  - Safety & Risk Assessment                            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Fix & Validation Pipeline              │
│  - Fix Generator: Creates unified diffs & code patches  │
│  - SEO Validator: Pre-flight syntax & safety checks     │
│  - Preview State: BEFORE / AFTER / WHY / RISK preview  │
│  - Explicit Approval: User authorization required      │
│  - Safe Applicator: Apply patch with 1-click rollback   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Local Machine Hardware Calibration & Recommended Model

Before selecting or downloading a local LLM, the development machine hardware was inspected:

### Hardware Specifications
- **Operating System**: Windows 11 Home 64-bit
- **CPU**: AMD Ryzen 7 7735HS (8 Cores, 16 Logical Processors, up to 4.75 GHz)
- **RAM**: 16 GB DDR5 System Memory
- **GPU**: NVIDIA GeForce RTX 4050 Laptop GPU (6 GB Dedicated GDDR6 VRAM, 4.3 GB direct budget) + AMD Radeon 680M iGPU

### Model Recommendation
| Tier | Model Identifier | Parameter Count | Quantization | VRAM Footprint | Description / Fit |
|---|---|---|---|---|---|
| **Primary (Recommended)** | `qwen2.5-coder:7b` | 7.6B | `q4_K_M` | ~4.7 GB | Fits entirely inside RTX 4050 6GB VRAM. Fast inference (35–55 tok/s), exceptional structured JSON and code-patch generation. |
| **Ultra-Fast Lightweight** | `llama3.2:3b` | 3.2B | `q4_K_M` | ~2.2 GB | Ultra-low latency, tiny memory footprint, ideal for rapid auditing on constrained resources. |
| **High-Capacity Option** | `qwen2.5:14b` | 14.7B | `q4_K_M` / `q2_K` | ~8.9 GB | Requires partial CPU RAM offloading on 6GB VRAM; higher reasoning depth at slightly lower speed. |

---

## 3. Configuration & Environment Variables

All LLM configuration is strictly **server-side**. Environment variables are never exposed to client-side bundles.

```bash
# AI Provider Selection: ollama | openai | claude | offline
AI_PROVIDER=ollama

# Ollama Local Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_TIMEOUT_MS=60000
OLLAMA_RETRIES=2

# (Optional) Remote Claude API Configuration
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

# (Optional) OpenAI-compatible endpoint Configuration
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=
```

---

## 4. Provider Abstraction & Fallback Architecture

### Provider Types (`lib/ai-seo/ai-provider.ts`):
1. **`OllamaProvider`**:
   - Communicates with local Ollama daemon via native `/api/chat` (using `format: 'json'`) or `/v1/chat/completions`.
   - Incorporates `AbortSignal.timeout(timeoutMs)` to prevent requests from hanging indefinitely.
   - Includes exponential backoff retry logic.
2. **`RuleInformedProvider`**:
   - 100% offline deterministic rule engine.
   - Operates with zero network calls and zero model dependencies.
3. **`OpenAICompatibleProvider`**:
   - Connects to vLLM, local OpenAI-compatible runtimes, or OpenAI endpoints.
4. **`ClaudeAIProvider`**:
   - Connects to Anthropic Claude Messages API.

### Transparent Fallback Mechanism:
If the configured local LLM (Ollama) is unavailable (e.g. daemon stopped, timeout, connection refused):
- The orchestrator **NEVER crashes**.
- It immediately triggers the deterministic `RuleInformedProvider` fallback.
- It records telemetry with `fallbackTriggered: true` and `providerUsed: "AI provider unavailable — deterministic fallback used (Reason: ...)"`.

---

## 5. Specialist Agent Routing Matrix

Specialist agents are invoked dynamically based on page archetype and evidence presence:

| Page Archetype | Technical Agent | Content Agent | Ecommerce Agent | Schema Agent | SERP Agent | Competitor Agent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **PRODUCT** | Yes | Yes | Yes | Yes | If SERP query present | If competitor gaps present |
| **CATEGORY** | Yes | Yes | Yes | Yes | If SERP query present | If competitor gaps present |
| **ARTICLE / BLOG** | Yes | Yes | No (Filtered) | Yes | If SERP query present | If competitor gaps present |
| **LEAD GEN / ABOUT** | Yes | Yes | No (Filtered) | Yes | If SERP query present | If competitor gaps present |

---

## 6. Anti-Hallucination & Anti-Fabrication Rules

1. **Zero Metric Fabrication**:
   - Prohibited: Invented Google rankings, search volumes, Cost Per Click (CPC), Keyword Difficulty (KD), Domain Authority (DA), PageRank, customer reviews, or author credentials.
   - Missing data must be reported as: *"Insufficient evidence"* or *"Unmeasured"*.
2. **Zero Ranking Promises**:
   - Prohibited: Claims such as *"Guaranteed #1"*, *"Guaranteed Top 5/Top 10"*, or *"Guaranteed traffic boost"*.
   - Replaced with: *"Improves search discoverability and relevance"*.
3. **2026 Core Web Vitals Standards**:
   - INP (Interaction to Next Paint): Good $\le$ 200ms, Needs Improvement 200–500ms, Poor > 500ms.
   - LCP (Largest Contentful Paint): Good $\le$ 2.5s, Needs Improvement 2.5–4s, Poor > 4s.
   - CLS (Cumulative Layout Shift): Good $\le$ 0.1, Needs Improvement 0.1–0.25, Poor > 0.25.
   - FID (First Input Delay) is deprecated and prohibited from all agent outputs.

---

## 7. Mandatory 12-Field AI Recommendation Contract

Every generated recommendation strictly contains:
1. `issueId`: Unique identifier (e.g. `TECH-TITLE-MISSING`, `ECOM-PRODUCT-SCHEMA-MISSING`)
2. `url`: Exact target URL
3. `category`: Category (`technical`, `onpage`, `content`, `schema`, `images`, `serp`, `links`)
4. `priority`: Priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
5. `confidence`: Calibrated score (0.00 to 1.00)
6. `observation`: Measured factual observation
7. `evidence`: Array of supporting data points
8. `seoReason`: Technical and search engine rationale
9. `recommendedAction`: Actionable instruction
10. `implementation`: Object with `type`, `targetElement`, `proposedValue`, `suggestedPattern`
11. `risk`: Risk assessment (`low`, `moderate`, `high`)
12. `requiresApproval`: Boolean (`true` by default)

---

## 8. Verification & Test Suite Metrics

- **Total Test Suite**: 485 tests across 92 suites (100% pass, 0 fail).
- **Dedicated AI SEO Tests**: 64 comprehensive tests covering provider abstraction, Ollama integration, JSON parsing, timeout handling, real ecommerce audit fixture, clean page audit (zero artificial work), anti-hallucination guardrails, fix generation, pre-flight validation, and rollback isolation.
- **TypeScript Typecheck**: 0 errors (`npx tsc --noEmit`).
- **Production Build**: 0 errors (`npm run build`).
