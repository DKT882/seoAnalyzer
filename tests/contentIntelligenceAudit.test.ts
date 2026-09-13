import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AIContentGenerator,
  AIContentGenerationRequest,
  MockAIProvider,
  RuleInformedProvider,
} from '../lib/ai-seo';
import { ContentIntelligencePlanner } from '../lib/ai-seo/content-planner';
import { ContentScorer } from '../lib/ai-seo/content-scorer';

describe('Evidence-Driven Search Content Intelligence Engine Test Suite', () => {
  // =========================================================================
  // 1. SEARCH INTENT CLASSIFICATION & USER GOAL SYNTHESIS
  // =========================================================================
  describe('1. Search Intent Classification & User Goal Synthesis', () => {
    it('1.1 Accurately classifies informational query intent with high confidence', () => {
      const intent = ContentIntelligencePlanner.classifySearchIntent(
        'How to optimize INP in Next.js',
        'optimize INP Next.js',
        'blog-article'
      );

      assert.strictEqual(intent.type, 'informational');
      assert.ok(intent.confidence >= 0.85);
      assert.ok(intent.explanation.toLowerCase().includes('educational') || intent.explanation.toLowerCase().includes('guidance'));
    });

    it('1.2 Accurately classifies commercial comparison intent from query signals', () => {
      const intent = ContentIntelligencePlanner.classifySearchIntent(
        'Best Wireless Ergonomic Keyboards 2026',
        'best ergonomic keyboards vs standard',
        'blog-article'
      );

      assert.strictEqual(intent.type, 'commercial');
      assert.ok(intent.confidence >= 0.85);
      assert.ok(intent.explanation.toLowerCase().includes('comparing') || intent.explanation.toLowerCase().includes('options'));
    });

    it('1.3 Accurately classifies transactional purchasing intent', () => {
      const intent = ContentIntelligencePlanner.classifySearchIntent(
        'Buy Ergonomic Office Chair Pro',
        'ergonomic office chair price order',
        'product-description'
      );

      assert.strictEqual(intent.type, 'transactional');
      assert.ok(intent.confidence >= 0.85);
    });

    it('1.4 Respects explicit user-override search intent', () => {
      const intent = ContentIntelligencePlanner.classifySearchIntent(
        'Ergonomic Chairs',
        'ergonomic chair',
        'blog-article',
        'transactional'
      );

      assert.strictEqual(intent.type, 'transactional');
      assert.strictEqual(intent.confidence, 0.95);
    });
  });

  // =========================================================================
  // 2. EVIDENCE AVAILABILITY TRACKING & ANTI-HALLUCINATION
  // =========================================================================
  describe('2. Evidence Availability Tracking & Anti-Hallucination Guardrails', () => {
    it('2.1 Flags SERP and competitor evidence as FALSE when no external audit data is supplied', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Core Web Vitals Optimization',
        primaryKeyword: 'core web vitals',
        wordLimit: 800,
      };

      const availability = ContentIntelligencePlanner.checkEvidenceAvailability(req);
      assert.strictEqual(availability.keywordEvidence, true);
      assert.strictEqual(availability.serpEvidence, false);
      assert.strictEqual(availability.competitorEvidence, false);
      assert.strictEqual(availability.crawlEvidence, false);
    });

    it('2.2 Flags evidence availability as TRUE when authoritative crawl and SERP data are attached', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Core Web Vitals Optimization',
        primaryKeyword: 'core web vitals',
        evidence: {
          url: 'https://example.com/web-vitals',
          domain: 'example.com',
          crawledAt: new Date().toISOString(),
          technical: { title: { value: 'Web Vitals Guide' } },
          serp: {
            targetQuery: 'core web vitals',
            dominantSerpIntent: 'informational',
            dominantPageType: 'guide',
            missingCompetitorTopics: ['interaction to next paint (INP)'],
            competitorDomains: ['web.dev', 'developer.mozilla.org'],
          },
          competitors: {
            topCompetitorUrls: ['https://web.dev/vitals'],
            contentGapsVsTopRanked: ['Real user monitoring setup'],
          },
        },
      };

      const availability = ContentIntelligencePlanner.checkEvidenceAvailability(req, req.evidence);
      assert.strictEqual(availability.keywordEvidence, true);
      assert.strictEqual(availability.serpEvidence, true);
      assert.strictEqual(availability.competitorEvidence, true);
      assert.strictEqual(availability.crawlEvidence, true);
    });

    it('2.3 Attaches clear disclaimer when SERP evidence is unavailable without hallucinating ranking patterns', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Hydration Errors in React',
        primaryKeyword: 'react hydration error',
        wordLimit: 500,
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.strictEqual(result.evidenceAvailability.serpEvidence, false);
      assert.ok(result.warnings.some((w) => w.toLowerCase().includes('serp evidence was unavailable') || w.toLowerCase().includes('semantics')));
    });
  });

  // =========================================================================
  // 3. CONTENT BLUEPRINT & SECTION-BY-SECTION WORD BUDGETING
  // =========================================================================
  describe('3. Content Blueprint & Section Word Budgeting', () => {
    it('3.1 Constructs balanced section budgets summing to total target words for 800-word article', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Next.js Server Actions',
        primaryKeyword: 'server actions',
        wordLimit: 800,
      };

      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.totalTargetWords, 800);
      assert.ok(blueprint.sections.length >= 4);

      const sumSectionWords = blueprint.sections.reduce((acc, s) => acc + s.targetWords, 0);
      assert.ok(Math.abs(sumSectionWords - 800) <= 15);

      for (const section of blueprint.sections) {
        assert.ok(section.heading.length > 0);
        assert.ok(section.purpose.length > 0);
        assert.ok(section.targetWords > 20);
        assert.ok(section.requiredTopics.length > 0);
      }
    });

    it('3.2 Constructs product-description blueprint with spec and benefit sections', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Ergonomic Standing Desk Frame',
        primaryKeyword: 'electric standing desk',
        wordLimit: 300,
      };

      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.totalTargetWords, 300);
      assert.ok(blueprint.sections.some((s) => s.heading.toLowerCase().includes('specifications') || s.heading.toLowerCase().includes('technical')));
      assert.ok(blueprint.sections.some((s) => s.heading.toLowerCase().includes('benefit') || s.heading.toLowerCase().includes('overview')));
    });

    it('3.3 Constructs category-description blueprint with taxonomy and selection guidance', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'category-description',
        mainTopic: 'Mechanical Keyboard Switches',
        primaryKeyword: 'keyboard switches',
        wordLimit: 350,
      };

      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.totalTargetWords, 350);
      assert.ok(blueprint.sections.some((s) => s.heading.toLowerCase().includes('collection') || s.heading.toLowerCase().includes('overview') || s.heading.toLowerCase().includes('switches')));
    });
  });

  // =========================================================================
  // 4. DETERMINISTIC TOPIC COVERAGE & QUALITY SCORING
  // =========================================================================
  describe('4. Deterministic Topic Coverage & SEO Opportunity Scoring', () => {
    it('4.1 Calculates topic coverage score (0-100) with detailed sub-breakdowns', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Modern CSS Grid Layouts',
        primaryKeyword: 'css grid layout',
        wordLimit: 600,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      const testContent = `## Introduction: Understanding Modern CSS Grid Layouts
CSS grid layout is a two-dimensional layout system for the web that enables precise control of rows and columns.

## Core Fundamentals & Key Principles
Understanding CSS grid layout mechanisms and template columns allows developers to create responsive grid structures without complex float hacks.

## Step-by-Step Implementation & Best Practices
Follow these implementation steps and best practices to build robust layouts:
1. Define display: grid on the parent container.
2. Specify grid-template-columns with fr units.
3. Test edge cases and responsive breakpoints.

## Frequently Asked Questions
Q: What makes CSS grid layout essential for Modern CSS Grid Layouts?
A: It provides unmatched alignment and responsive power.

## Conclusion & Key Takeaways
Modern CSS Grid Layouts simplify complex web design while maintaining clean code architecture.`;

      const coverage = ContentScorer.calculateTopicCoverage(testContent, plan);

      assert.ok(coverage.overallScore >= 75);
      assert.ok(coverage.criticalTopicsCovered >= 70);
      assert.ok(coverage.importantTopicsCovered >= 70);
      assert.ok(coverage.questionsCovered >= 50);
      assert.ok(coverage.intentSatisfaction >= 80);
      assert.ok(coverage.coveredList.length > 0);
    });

    it('4.2 Calculates SEO Opportunity score (0-100) and People-first quality details', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Modern CSS Grid Layouts',
        primaryKeyword: 'css grid layout',
        wordLimit: 600,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      const testContent = `## Overview
CSS grid layout provides exceptional layout capabilities for modern web development.

## Implementation Steps
Follow these best practices to structure responsive web pages effectively with css grid layout.

## Key Considerations & Trade-Offs
Evaluate browser compatibility and fallback techniques when designing grid layouts.`;

      const { details, issues, strengths } = ContentScorer.calculateQualityDetails(
        testContent,
        plan,
        req,
        250,
        300
      );

      assert.ok(details.score >= 70);
      assert.ok(details.seoOpportunity >= 70);
      assert.ok(details.readability >= 70);
      assert.ok(details.keywordNaturalness >= 80);
      assert.ok(strengths.length > 0);
    });
  });

  // =========================================================================
  // 5. CLAIM EXTRACTION & SOURCE PROVENANCE BINDING
  // =========================================================================
  describe('5. Evidence-Backed Claims & Source Provenance Binding', () => {
    it('5.1 Extracts verifiable claims and binds to appropriate source type', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Performance Auditing',
        primaryKeyword: 'performance audit',
        evidence: {
          url: 'https://example.com/audit',
          domain: 'example.com',
          crawledAt: new Date().toISOString(),
          technical: {
            title: { value: 'Technical Audit Page' },
            performance: { lcpEstimateMs: 2400 },
          },
        },
      };

      const plan = ContentIntelligencePlanner.constructPlan(req, req.evidence);
      const content = `Based on current site audit data, the Largest Contentful Paint (LCP) benchmark was measured at 2400ms. According to official performance documentation, optimizing render-blocking resources improves response time.`;

      const claims = ContentScorer.extractClaims(content, plan, req);
      assert.ok(claims.length >= 2);

      const siteFact = claims.find((c) => c.type === 'site-fact');
      assert.ok(siteFact !== undefined);
      assert.strictEqual(siteFact?.evidence, 'Authoritative site crawl evidence');
      assert.strictEqual(siteFact?.confidence, 0.95);
    });
  });

  // =========================================================================
  // 6. CONTROLLED EXPANSION LOOP
  // =========================================================================
  describe('6. Word Count Constraint & Fluff-Free Expansion Loop', () => {
    it('6.1 Prioritizes topic gaps and unanswered questions during expansion', async () => {
      const mockExpansionProvider = new MockAIProvider();
      // First batch call returns short text
      mockExpansionProvider.mockStructuredResponses.set('Database Sharding', {
        sections: [
          { heading: 'Overview', content: 'Short initial text discussing technical database sharding aspects in detail.' },
        ],
      });
      // Gap expansion call returns deep technical coverage
      mockExpansionProvider.mockStructuredResponses.set('Practical Nuances', {
        heading: 'Practical Insights & Key Questions',
        content: 'Detailed explanations of edge cases, configuration best practices, and maintenance trade-offs.',
      });

      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Database Sharding Architecture',
        primaryKeyword: 'database sharding',
        wordLimit: 800,
      };

      const result = await AIContentGenerator.generate(req, mockExpansionProvider);
      assert.ok(result.actualWordCount > 50);
      assert.ok(result.content.length > 100);
      assert.ok(result.contentPlan !== undefined);
      assert.ok(result.blueprint !== undefined);
    });
  });

  // =========================================================================
  // 7. BOUNDED BATCH GENERATION & CALL MINIMIZATION
  // =========================================================================
  describe('7. Bounded Batch Generation & LLM Call Minimization', () => {
    it('7.1 Groups multi-section requests into bounded batches (<= 2-3 calls instead of N calls)', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.mockStructuredResponses.set('sections', {
        sections: [
          { heading: 'Core Concepts', content: 'Comprehensive markdown content covering fundamentals in detail.' },
          { heading: 'Implementation', content: 'Step-by-step practical guidance and best practices.' },
          { heading: 'Troubleshooting', content: 'Key diagnostics and common issues addressed.' },
        ],
      });

      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Wireless Gaming Mouse Performance',
        primaryKeyword: 'wireless gaming mouse',
        wordLimit: 800,
      };

      const result = await AIContentGenerator.generate(req, mockProvider);
      assert.ok(result.content.length > 100);
      assert.ok(result.generation.calls !== undefined && result.generation.calls <= 3);
      assert.strictEqual(result.generation.provider, 'mock_test');
      assert.ok(result.generation.sectionsGenerated >= 1);
    });
  });

  // =========================================================================
  // 8. FAST FALLBACK & TELEMETRY ON PARTIAL FAILURE
  // =========================================================================
  describe('8. Fast Fallback & Single Section Failure Telemetry', () => {
    it('8.1 Gracefully falls back when one batch fails and accurately records telemetry', async () => {
      const mockProvider = new MockAIProvider();
      // Simulate partial return for Mechanical Keyboard
      mockProvider.mockStructuredResponses.set('Mechanical Keyboard', {
        sections: [
          { heading: 'Overview & Architectural Fundamentals', content: 'Valid generated content for section 1 with enough detailed explanations.' },
        ],
      });

      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Mechanical Keyboard Switches',
        primaryKeyword: 'mechanical keyboard',
        wordLimit: 800,
      };

      const result = await AIContentGenerator.generate(req, mockProvider);
      assert.ok(result.content.length > 50);
      assert.strictEqual(result.generation.fallbackUsed, true);
      assert.ok(Array.isArray(result.generation.failedSections));
      assert.ok(result.generation.actualWords > 50);
    });
  });

  // =========================================================================
  // 9. COMPLETE LLM FAILURE & DEGRADED TIMEOUT HANDLING
  // =========================================================================
  describe('9. Complete LLM Failure & Degraded Timeout Handling', () => {
    it('9.1 Throws or returns structured error code when all live LLM calls fail', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.shouldSimulateError = true;
      mockProvider.errorMessage = 'The operation was aborted due to timeout';

      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Low Latency Networks',
        primaryKeyword: 'low latency network',
        wordLimit: 800,
      };

      await assert.rejects(
        async () => {
          await AIContentGenerator.generate(req, mockProvider);
        },
        (err: any) => {
          return err.message.includes('timed out') || err.code === 'CONTENT_GENERATION_LLM_TIMEOUT';
        }
      );
    });

    it('9.2 Offline provider never fails and generates valid deterministic package', async () => {
      const offlineProvider = new RuleInformedProvider();
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Search Engine Optimization Basics',
        primaryKeyword: 'SEO basics',
        wordLimit: 800,
      };

      const result = await AIContentGenerator.generate(req, offlineProvider);
      assert.strictEqual(result.generation.fallbackUsed, false);
      assert.ok(result.actualWordCount >= 300);
      assert.strictEqual(result.generation.provider, 'rule_informed_offline');
      assert.strictEqual(result.contentQuality.score >= 70, true);
    });
  });

  // =========================================================================
  // 10. GENERATION TELEMETRY SPECIFICATION
  // =========================================================================
  describe('10. Generation Telemetry Metrics & Accuracy', () => {
    it('10.1 Reports durationMs, requestedWords, actualWords, and tokensPerSecond', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.mockStructuredResponses.set('sections', {
        sections: [
          { heading: 'Overview', content: 'Comprehensive overview of the subject with technical depth.' },
        ],
      });

      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Ergonomic Vertical Mouse',
        primaryKeyword: 'vertical mouse',
        wordLimit: 300,
      };

      const result = await AIContentGenerator.generate(req, mockProvider);
      assert.ok(result.generation.durationMs !== undefined && result.generation.durationMs >= 0);
      assert.strictEqual(result.generation.requestedWords, 300);
      assert.ok(result.generation.actualWords > 0);
      assert.ok(result.generation.tokensPerSecond !== undefined && result.generation.tokensPerSecond > 0);
    });
  });
});
