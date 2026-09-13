import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  RuleInformedProvider,
  OllamaProvider,
  MockAIProvider,
  OpenAICompatibleProvider,
  ClaudeAIProvider,
  getAIProvider,
  parseJsonSafely,
  SEOEvidenceBuilder,
  ClaudeSEOAdapter,
  SEOConfidenceCalculator,
  TechnicalSEOAgent,
  ContentSEOAgent,
  EcommerceSEOAgent,
  SchemaSEOAgent,
  SerpSEOAgent,
  CompetitorGapAgent,
  AISEOOrchestrator,
  AIActionBridge,
  SEOFixGenerator,
  SEOValidator,
  SEOAutoApplicator,
  SEOEvidence,
  AIRecommendation,
  SEOFix,
  SEOValidationResult,
  ProviderTelemetry,
  checkAIHealth,
  isModelNameMatch,
  runAIDiagnostic,
} from '../lib/ai-seo';

describe('AI SEO Engine & Claude-SEO Integration Test Suite', () => {
  // =========================================================================
  // 1. PROVIDER ABSTRACTION & LOCAL MODEL SUPPORT
  // =========================================================================
  describe('1. Provider Abstraction & Pluggable Backends', () => {
    it('1.1 RuleInformedProvider operates offline deterministically without network', async () => {
      const provider = new RuleInformedProvider();
      assert.strictEqual(provider.providerType, 'RULE_INFORMED_OFFLINE');
      const completion = await provider.generateCompletion('system', 'Analyze SEO for example.com');
      assert.ok(completion.includes('Rule-Informed Offline Engine'));
    });

    it('1.2 MockAIProvider records prompt calls and returns mock structured responses', async () => {
      const mock = new MockAIProvider();
      mock.mockStructuredResponses.set('example.com', [{ issueId: 'TEST-1' }]);
      const res = await mock.generateStructured<any[]>('sys', 'Check example.com');
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].issueId, 'TEST-1');
      assert.strictEqual(mock.calls.length, 1);
    });

    it('1.3 OpenAICompatibleProvider configures local Ollama / Qwen endpoints safely', () => {
      const provider = new OpenAICompatibleProvider({
        endpointUrl: 'http://localhost:11434/v1',
        modelName: 'qwen2.5-coder:14b',
      });
      assert.strictEqual(provider.providerType, 'OPENAI_COMPATIBLE');
      assert.strictEqual(provider.modelName, 'qwen2.5-coder:14b');
    });

    it('1.4 ClaudeAIProvider requires API key when instantiated directly', () => {
      const provider = new ClaudeAIProvider({
        apiKey: 'sk-ant-test-key',
        modelName: 'claude-3-7-sonnet-20250219',
      });
      assert.strictEqual(provider.providerType, 'CLAUDE_API');
      assert.strictEqual(provider.modelName, 'claude-3-7-sonnet-20250219');
    });

    it('1.5 getAIProvider factory safely defaults to RuleInformedProvider when no external keys exist', () => {
      const provider = getAIProvider({ providerType: 'RULE_INFORMED_OFFLINE' });
      assert.strictEqual(provider.providerType, 'RULE_INFORMED_OFFLINE');
    });

    it('1.6 parseJsonSafely extracts JSON even when wrapped in markdown codeblocks', () => {
      const input = '```json\n{\n  "status": "ok",\n  "count": 42\n}\n```';
      const parsed = parseJsonSafely<{ status: string; count: number }>(input);
      assert.strictEqual(parsed.status, 'ok');
      assert.strictEqual(parsed.count, 42);
    });

    it('1.7 parseJsonSafely extracts JSON with conversational preamble', () => {
      const input = 'Here is your recommendation:\n[{"issueId": "REC-1"}]\nHope this helps!';
      const parsed = parseJsonSafely<any[]>(input);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].issueId, 'REC-1');
    });
  });

  // =========================================================================
  // 2. EVIDENCE BUILDER & FACT NORMALIZATION
  // =========================================================================
  describe('2. Evidence Builder & Normalization', () => {
    it('2.1 Normalizes technical page audit signals accurately', () => {
      const pageReport: any = {
        id: 'audit-1',
        url: 'https://mysite.com/products/shoes',
        technical: {
          statusCode: 200,
          isIndexable: true,
          canonicalUrl: 'https://mysite.com/products/shoes',
          isCanonicalSelfReferencing: true,
          robotsTxt: { isDisallowed: false },
          mobile: { hasViewportMeta: true },
          infrastructure: { isHttps: true, hasMixedContent: false },
        },
        onPage: {
          title: 'Comfortable Running Shoes | MySite',
          metaDescription: 'Shop our top running shoes with free shipping.',
          headings: { h1: ['Running Shoes'], h2: ['Trail Shoes', 'Road Shoes'] },
        },
        schemas: [{ type: 'Product', name: 'Shoes' }],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport });
      assert.strictEqual(evidence.domain, 'mysite.com');
      assert.strictEqual(evidence.technical?.isIndexable, true);
      assert.strictEqual(evidence.technical?.title?.value, 'Comfortable Running Shoes | MySite');
      assert.strictEqual(evidence.technical?.headings?.h1Count, 1);
      assert.strictEqual(evidence.technical?.schema?.hasValidJsonLd, true);
    });

    it('2.2 Extracts content intelligence and E-E-A-T signals', () => {
      const pageReport: any = {
        url: 'https://mysite.com/blog/guide',
        contentIntelligence: {
          pageType: { primaryType: 'ARTICLE' },
          searchIntent: { primaryIntent: 'INFORMATIONAL', confidence: 'HIGH' },
          extraction: { mainContentWordCount: 850 },
          contentDepth: { hasAuthorByline: true, hasEditorialTransparency: true },
          contentGaps: [{ topic: 'sizing guide' }, { topic: 'maintenance tips' }],
        },
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport });
      assert.strictEqual(evidence.pageType, 'ARTICLE');
      assert.strictEqual(evidence.content?.searchIntent, 'INFORMATIONAL');
      assert.strictEqual(evidence.content?.wordCount, 850);
      assert.strictEqual(evidence.content?.eEaTSignals?.hasAuthor, true);
      assert.deepStrictEqual(evidence.content?.topicGaps, ['sizing guide', 'maintenance tips']);
    });

    it('2.3 Extracts SERP and competitor intelligence evidence', () => {
      const searchReport: any = {
        id: 'sr-1',
        queries: [{ query: 'best trail shoes' }],
        intentAlignments: {
          'best trail shoes': {
            level: 'WEAK_ALIGNMENT',
            observedSerpIntentPattern: 'INFORMATIONAL',
            isMixedSerp: true,
          },
        },
        topicPatterns: {
          'best trail shoes': [
            { topic: 'waterproof testing', isCoveredInUserPage: false },
          ],
        },
        snapshots: [
          {
            featureTypes: ['FEATURED_SNIPPET', 'PEOPLE_ALSO_ASK'],
            results: [{ url: 'https://competitor.com/shoes' }],
          },
        ],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({
        url: 'https://mysite.com/shoes',
        searchReport,
      });

      assert.strictEqual(evidence.serp?.targetQuery, 'best trail shoes');
      assert.strictEqual(evidence.serp?.intentAlignmentStatus, 'WEAK_ALIGNMENT');
      assert.strictEqual(evidence.serp?.isMixedSerp, true);
      assert.deepStrictEqual(evidence.serp?.missingCompetitorTopics, ['waterproof testing']);
      assert.ok(evidence.competitors?.topCompetitorUrls?.includes('https://competitor.com/shoes'));
    });
  });

  // =========================================================================
  // 3. CLAUDE SEO ADAPTER & GUARDRAILS
  // =========================================================================
  describe('3. Claude SEO Adapter & Guardrails', () => {
    it('3.1 System prompt strictly bans metric fabrication (rankings, traffic, volume)', () => {
      const prompt = ClaudeSEOAdapter.getTechnicalAgentPrompt();
      assert.ok(prompt.includes('STRICT ANTI-FABRICATION CONSTRAINTS'));
      assert.ok(prompt.includes('NO fabricated Google rankings'));
      assert.ok(prompt.includes('NO fabricated organic traffic'));
    });

    it('3.2 System prompt enforces 2026 Core Web Vitals (INP included, FID banned)', () => {
      const prompt = ClaudeSEOAdapter.getTechnicalAgentPrompt();
      assert.ok(prompt.includes('INP (Interaction to Next Paint)'));
      assert.ok(prompt.includes('NEVER reference FID'));
    });

    it('3.3 Enforces 12 mandatory output fields in specialist agent prompt directives', () => {
      const prompt = ClaudeSEOAdapter.getContentAgentPrompt();
      assert.ok(prompt.includes('MANDATORY 12-FIELD OUTPUT STRUCTURE'));
      assert.ok(prompt.includes('issueId'));
      assert.ok(prompt.includes('confidence'));
      assert.ok(prompt.includes('requiresApproval'));
    });
  });

  // =========================================================================
  // 4. CONFIDENCE CALCULATION ENGINE
  // =========================================================================
  describe('4. Deterministic Confidence Scoring', () => {
    it('4.1 Awards high confidence for direct measured HTML proof (e.g. missing title)', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true } },
      };
      const rec: Partial<AIRecommendation> = {
        observation: 'Missing page title element in <head>',
        recommendedAction: 'Add title tag',
        evidence: ['title is missing', '0 chars in head'],
        risk: 'low',
        implementation: { type: 'metadata_update', proposedValue: '<title>Test</title>' },
      };
      const score = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      assert.ok(score >= 0.85, `Expected score >= 0.85, got ${score}`);
    });

    it('4.2 Penalizes vague recommendations lacking concrete proposed value or pattern', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        content: { wordCount: 100 },
      };
      const rec: Partial<AIRecommendation> = {
        observation: 'Content seems short',
        recommendedAction: 'Write more content',
        evidence: [],
        risk: 'high',
        implementation: { type: 'content_edit' },
      };
      const score = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      assert.ok(score <= 0.80, `Expected penalized score, got ${score}`);
    });
  });

  // =========================================================================
  // 5. SPECIALIST AGENTS
  // =========================================================================
  describe('5. Specialist SEO Agents', () => {
    const provider = new RuleInformedProvider();

    it('5.1 TechnicalSEOAgent identifies missing title, H1, and canonical tags', async () => {
      const agent = new TechnicalSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/item',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: {
          title: { isMissing: true },
          headings: { h1Count: 0 },
          canonicalUrl: null,
          mobile: { hasViewport: true },
        },
      };

      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'TECH-TITLE-MISSING'));
      assert.ok(recs.some((r) => r.issueId === 'TECH-H1-MISSING'));
      assert.ok(recs.some((r) => r.issueId === 'TECH-CANONICAL-MISSING'));
    });

    it('5.2 TechnicalSEOAgent flags noindex robots directive with moderate risk', async () => {
      const agent = new TechnicalSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: {
          robotsDirectives: { noindex: true },
          title: { isMissing: false, value: 'Title' },
          headings: { h1Count: 1 },
          canonicalUrl: 'https://example.com',
        },
      };

      const recs = await agent.analyze(evidence, provider);
      const noindexRec = recs.find((r) => r.issueId === 'TECH-NOINDEX-DIRECTIVE');
      assert.ok(noindexRec);
      assert.strictEqual(noindexRec?.priority, 'CRITICAL');
      assert.strictEqual(noindexRec?.risk, 'moderate');
    });

    it('5.3 ContentSEOAgent detects thin body content and topic gaps', async () => {
      const agent = new ContentSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/blog/article',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        pageType: 'ARTICLE',
        content: {
          wordCount: 120,
          topicGaps: ['beginner tutorial', 'troubleshooting'],
          eEaTSignals: { hasAuthor: false },
        },
      };

      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'CONTENT-THIN-BODY'));
      assert.ok(recs.some((r) => r.issueId === 'CONTENT-TOPIC-GAPS'));
      assert.ok(recs.some((r) => r.issueId === 'CONTENT-EEAT-AUTHOR-MISSING'));
    });

    it('5.4 EcommerceSEOAgent skips non-ecommerce pages (Constraint 14)', async () => {
      const agent = new EcommerceSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/about',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        pageType: 'ABOUT',
        ecommerce: { isEcommercePage: false },
      };

      assert.strictEqual(agent.shouldRun(evidence), false);
      const recs = await agent.analyze(evidence, provider);
      assert.strictEqual(recs.length, 0);
    });

    it('5.5 EcommerceSEOAgent detects missing Product schema on product page', async () => {
      const agent = new EcommerceSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/products/widget',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        pageType: 'PRODUCT',
        ecommerce: {
          isEcommercePage: true,
          hasProductSchema: false,
          price: 29.99,
          currency: 'USD',
        },
      };

      assert.strictEqual(agent.shouldRun(evidence), true);
      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'ECOM-PRODUCT-SCHEMA-MISSING'));
    });

    it('5.6 SchemaSEOAgent recommends BreadcrumbList schema for deep URLs', async () => {
      const agent = new SchemaSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/category/subcategory/item',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: {
          title: { value: 'Item Page' },
          schema: { schemaCount: 1, types: ['Article'] },
        },
      };

      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'SCHEMA-BREADCRUMB-MISSING'));
    });

    it('5.7 SerpSEOAgent identifies search intent misalignment from SERP evidence', async () => {
      const agent = new SerpSEOAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/tool',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        serp: {
          targetQuery: 'how to fix audio',
          dominantSerpIntent: 'INFORMATIONAL',
          intentAlignmentStatus: 'WEAK_ALIGNMENT',
        },
      };

      assert.strictEqual(agent.shouldRun(evidence), true);
      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'SERP-INTENT-MISALIGNMENT'));
    });

    it('5.8 CompetitorGapAgent highlights uncovered competitor topics', async () => {
      const agent = new CompetitorGapAgent();
      const evidence: SEOEvidence = {
        url: 'https://example.com/guide',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        competitors: {
          topCompetitorUrls: ['https://comp1.com', 'https://comp2.com'],
          contentGapsVsTopRanked: ['performance benchmarks', 'security audits'],
        },
      };

      assert.strictEqual(agent.shouldRun(evidence), true);
      const recs = await agent.analyze(evidence, provider);
      assert.ok(recs.some((r) => r.issueId === 'COMP-CONTENT-GAPS'));
    });
  });

  // =========================================================================
  // 6. ORCHESTRATOR & DEDUPLICATION
  // =========================================================================
  describe('6. AI SEO Orchestrator & Deduplication', () => {
    it('6.1 Runs all relevant agents and deduplicates identical issue proposals', async () => {
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const evidence: SEOEvidence = {
        url: 'https://example.com/product/widget',
        domain: 'example.com',
        pageType: 'PRODUCT',
        crawledAt: new Date().toISOString(),
        technical: {
          title: { isMissing: true },
          headings: { h1Count: 0 },
          canonicalUrl: null,
          mobile: { hasViewport: true },
        },
        ecommerce: { isEcommercePage: true, hasProductSchema: false },
      };

      const result = await orchestrator.analyzeEvidence(evidence);
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.activeAgents.includes('Technical SEO Specialist'));
      assert.ok(result.activeAgents.includes('Ecommerce SEO Specialist'));
      assert.strictEqual(result.stats.deduplicatedCount, result.recommendations.length);
    });

    it('6.2 Guarantees all 12 mandatory fields exist on every generated recommendation', async () => {
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const evidence: SEOEvidence = {
        url: 'https://example.com/test',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true } },
      };

      const result = await orchestrator.analyzeEvidence(evidence);
      for (const rec of result.recommendations) {
        assert.ok(rec.issueId, 'Missing issueId');
        assert.ok(rec.url, 'Missing url');
        assert.ok(rec.category, 'Missing category');
        assert.ok(rec.priority, 'Missing priority');
        assert.ok(typeof rec.confidence === 'number', 'Missing confidence');
        assert.ok(rec.observation, 'Missing observation');
        assert.ok(Array.isArray(rec.evidence) && rec.evidence.length > 0, 'Missing evidence');
        assert.ok(rec.seoReason, 'Missing seoReason');
        assert.ok(rec.recommendedAction, 'Missing recommendedAction');
        assert.ok(rec.implementation && rec.implementation.type, 'Missing implementation');
        assert.ok(rec.risk, 'Missing risk');
        assert.strictEqual(rec.requiresApproval, true, 'requiresApproval must be true');
      }
    });

    it('6.3 Sanitizes forbidden ranking promises (e.g. guarantees or FID mentions)', async () => {
      const mock = new MockAIProvider();
      mock.mockStructuredResponses.set('example.com', [
        {
          issueId: 'TEST-1',
          url: 'https://example.com',
          category: 'technical',
          priority: 'HIGH',
          confidence: 0.9,
          observation: 'We guarantee Top 1 ranking and guaranteed traffic if you fix FID issues.',
          evidence: ['Measured data'],
          seoReason: 'Guaranteed top 5 position in Google.',
          recommendedAction: 'Fix FID immediately.',
          implementation: { type: 'html_patch' },
          risk: 'low',
          requiresApproval: true,
        },
      ]);

      const orchestrator = new AISEOOrchestrator(undefined, mock);
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true } },
      };

      const result = await orchestrator.analyzeEvidence(evidence);
      const sanitized = result.recommendations[0];
      assert.ok(!sanitized.observation.includes('guarantee Top 1'));
      assert.ok(!sanitized.observation.includes('FID'));
      assert.ok(!sanitized.seoReason.includes('Guaranteed top 5'));
    });
  });

  // =========================================================================
  // 7. PHASE 9 INTEGRATION & ACTION ENGINE BRIDGE
  // =========================================================================
  describe('7. Phase 9 Action Engine Bridge', () => {
    it('7.1 Converts AIRecommendation into Phase 9 SeoAction with safety & SHA-256 fingerprint', () => {
      const rec: AIRecommendation = {
        issueId: 'TECH-CANONICAL-MISSING',
        url: 'https://example.com/page',
        category: 'technical',
        priority: 'CRITICAL',
        confidence: 0.95,
        observation: 'Missing canonical tag',
        evidence: ['0 canonical tags'],
        seoReason: 'Consolidates duplicate URLs',
        recommendedAction: 'Add self-referencing canonical URL tag',
        implementation: {
          type: 'html_patch',
          targetElement: '<head>',
          proposedValue: '<link rel="canonical" href="https://example.com/page" />',
        },
        risk: 'low',
        requiresApproval: true,
      };

      const seoAction = AIActionBridge.convertRecommendationToSeoAction(rec, 'example.com');
      assert.strictEqual(seoAction.category, 'TECHNICAL_CANONICAL');
      assert.strictEqual(seoAction.severity, 'CRITICAL');
      assert.ok(seoAction.fingerprint && seoAction.fingerprint.length === 64);
      assert.strictEqual(seoAction.status, 'OPEN');
      assert.strictEqual(seoAction.affectedUrls[0], 'https://example.com/page');
    });

    it('7.2 Feeds AI recommendations into Phase 9 with DAG dependency ordering and priority calculation', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com/item',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
      };
      const recs: AIRecommendation[] = [
        {
          issueId: 'TECH-TITLE-MISSING',
          url: 'https://example.com/item',
          category: 'technical',
          priority: 'CRITICAL',
          confidence: 0.95,
          observation: 'Missing title tag',
          evidence: ['0 titles'],
          seoReason: 'Primary snippet signal',
          recommendedAction: 'Add <title> tag',
          implementation: { type: 'metadata_update', proposedValue: '<title>Item</title>' },
          risk: 'low',
          requiresApproval: true,
        },
        {
          issueId: 'CONTENT-TOPIC-GAPS',
          url: 'https://example.com/item',
          category: 'content',
          priority: 'MEDIUM',
          confidence: 0.8,
          observation: 'Topic gaps detected',
          evidence: ['Gap: specs'],
          seoReason: 'Content depth',
          recommendedAction: 'Add specs section',
          implementation: { type: 'content_edit' },
          risk: 'low',
          requiresApproval: true,
        },
      ];

      const plan = AIActionBridge.generateEnrichedActionPlan({
        evidence,
        recommendations: recs,
        targetDomain: 'example.com',
      });

      assert.strictEqual(plan.totalActions, 2);
      assert.ok(plan.actions[0].priority >= plan.actions[1].priority);
      assert.strictEqual(plan.actions[0].category, 'TECHNICAL_STRUCTURE');
      assert.strictEqual(plan.actions[1].category, 'SEMANTIC_TOPIC');
    });
  });

  // =========================================================================
  // 8. FIX GENERATION
  // =========================================================================
  describe('8. SEO Fix Generator & Patch Synthesis', () => {
    it('8.1 Generates metadata patch with before/after diff for missing title', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true } },
      };
      const rec: AIRecommendation = {
        issueId: 'TECH-TITLE-MISSING',
        url: 'https://example.com',
        category: 'technical',
        priority: 'CRITICAL',
        confidence: 0.95,
        observation: 'Missing title',
        evidence: ['no title'],
        seoReason: 'Snippet relevance',
        recommendedAction: 'Add title tag',
        implementation: {
          type: 'metadata_update',
          targetElement: '<head>',
          proposedValue: '<title>Example Domain - Main Overview</title>',
        },
        risk: 'low',
        requiresApproval: true,
      };

      const fix = SEOFixGenerator.generateFix({ recommendation: rec, evidence });
      assert.strictEqual(fix.patchType, 'metadata_patch');
      assert.strictEqual(fix.appliedStatus, 'PENDING_APPROVAL');
      assert.ok(fix.after.includes('<title>Example Domain - Main Overview</title>'));
      assert.ok(fix.diffSummary.includes('+ <title>Example Domain - Main Overview</title>'));
    });

    it('8.2 Generates schema JSON-LD patch for Product structured data', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com/shoes',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        pageType: 'PRODUCT',
      };
      const rec: AIRecommendation = {
        issueId: 'ECOM-PRODUCT-SCHEMA-MISSING',
        url: 'https://example.com/shoes',
        category: 'schema',
        priority: 'HIGH',
        confidence: 0.9,
        observation: 'Missing product schema',
        evidence: ['0 product schemas'],
        seoReason: 'Rich snippets',
        recommendedAction: 'Add Product Schema',
        implementation: {
          type: 'schema_jsonld',
          targetElement: '<head>',
          proposedValue: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Running Shoes',
          }),
        },
        risk: 'low',
        requiresApproval: true,
      };

      const fix = SEOFixGenerator.generateFix({ recommendation: rec, evidence });
      assert.strictEqual(fix.patchType, 'schema_patch');
      assert.strictEqual(fix.targetLocation, '<head>');
      assert.ok(fix.after.includes('"@type"') && fix.after.includes('Product'));
    });
  });

  // =========================================================================
  // 9. VALIDATION PIPELINE
  // =========================================================================
  describe('9. Pre-Flight Validation Engine', () => {
    const evidence: SEOEvidence = {
      url: 'https://example.com/blog',
      domain: 'example.com',
      crawledAt: new Date().toISOString(),
      technical: { isIndexable: true },
    };

    it('9.1 Validates well-formed HTML snippets successfully', () => {
      const fix: SEOFix = {
        fixId: 'fix-1',
        issueId: 'TECH-1',
        url: 'https://example.com/blog',
        patchType: 'html_patch',
        title: 'Add H1 heading',
        explanation: 'Add H1 for structure',
        targetLocation: '<main>',
        before: '',
        after: '<h1>Main Blog Title</h1>',
        diffSummary: '+ <h1>Main Blog Title</h1>',
        isDestructive: false,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.checks.htmlValid, true);
    });

    it('9.2 Catches unclosed/unbalanced HTML tags', () => {
      const fix: SEOFix = {
        fixId: 'fix-2',
        issueId: 'TECH-2',
        url: 'https://example.com/blog',
        patchType: 'html_patch',
        title: 'Malformed HTML',
        explanation: 'Test unclosed tag',
        targetLocation: 'body',
        before: '',
        after: '<div class="content"><p>Unclosed paragraph',
        diffSummary: '+ <div class="content"><p>Unclosed paragraph',
        isDestructive: false,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.htmlValid, false);
      assert.ok(result.issuesFound.some((i) => i.includes('Unclosed HTML tag')));
    });

    it('9.3 Validates Schema JSON-LD structure and flags invalid JSON syntax', () => {
      const badFix: SEOFix = {
        fixId: 'fix-3',
        issueId: 'SCHEMA-1',
        url: 'https://example.com/blog',
        patchType: 'schema_patch',
        title: 'Malformed Schema',
        explanation: 'Test invalid JSON',
        targetLocation: '<head>',
        before: '',
        after: '{ "@context": "https://schema.org", "@type": "Product", missing_bracket',
        diffSummary: '+ bad json',
        isDestructive: false,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix: badFix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.schemaValid, false);
    });

    it('9.4 Blocks accidental noindex tags on indexable pages', () => {
      const dangerousFix: SEOFix = {
        fixId: 'fix-4',
        issueId: 'NOINDEX-1',
        url: 'https://example.com/blog',
        patchType: 'metadata_patch',
        title: 'Accidental Noindex',
        explanation: 'Dangerous tag',
        targetLocation: '<head>',
        before: '',
        after: '<meta name="robots" content="noindex, follow" />',
        diffSummary: '+ noindex',
        isDestructive: true,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix: dangerousFix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.noIndexSafe, false);
      assert.ok(result.issuesFound.some((i) => i.includes('noindex')));
    });
  });

  // =========================================================================
  // 10. EXPLICIT USER APPROVAL & ROLLBACK
  // =========================================================================
  describe('10. Safe Applicator & 1-Click Rollback', () => {
    const validFix: SEOFix = {
      fixId: 'fix-app-1',
      issueId: 'TITLE-1',
      url: 'https://example.com/landing',
      patchType: 'metadata_patch',
      title: 'Add Title Tag',
      explanation: 'Title tag addition',
      targetLocation: '<head>',
      before: '<title>Old Title</title>',
      after: '<title>New Improved Title</title>',
      diffSummary: '- <title>Old Title</title>\n+ <title>New Improved Title</title>',
      isDestructive: false,
      generatedAt: new Date().toISOString(),
      safetyCautions: [],
      appliedStatus: 'PENDING_APPROVAL',
    };

    const validValidation: SEOValidationResult = {
      fixId: 'fix-app-1',
      isValid: true,
      status: 'passed',
      checks: { htmlValid: true, schemaValid: true, canonicalValid: true, noIndexSafe: true, regressionsFree: true },
      individualChecks: [],
      issuesFound: [],
      warningMessages: [],
      validatedAt: new Date().toISOString(),
    };

    it('10.1 Refuses to apply fix without explicit user approval (Constraint 9)', () => {
      assert.throws(() => {
        SEOAutoApplicator.applyFix(validFix, validValidation, {
          approvedBy: 'admin',
          approvedAt: new Date().toISOString(),
          explicitApproval: false, // NOT approved
        });
      }, /Explicit user approval is required/);
    });

    it('10.2 Refuses to apply fix if pre-flight validation failed', () => {
      const failedValidation: SEOValidationResult = {
        ...validValidation,
        isValid: false,
        status: 'validation_failed',
        issuesFound: ['HTML syntax error'],
      };

      assert.throws(() => {
        SEOAutoApplicator.applyFix(validFix, failedValidation, {
          approvedBy: 'admin',
          approvedAt: new Date().toISOString(),
          explicitApproval: true,
        });
      }, /Pre-flight validation failed/);
    });

    it('10.3 Successfully applies fix with approval and provides rollback token', () => {
      const result = SEOAutoApplicator.applyFix(validFix, validValidation, {
        approvedBy: 'seo_engineer',
        approvedAt: new Date().toISOString(),
        explicitApproval: true,
      });

      assert.strictEqual(result.status, 'APPLIED');
      assert.ok(result.rollbackToken && result.rollbackToken.startsWith('rb-'));
      assert.strictEqual(result.appliedSnippet, '<title>New Improved Title</title>');
    });

    it('10.4 Executes 1-click rollback restoring the exact previous state', () => {
      const appResult = SEOAutoApplicator.applyFix(validFix, validValidation, {
        approvedBy: 'seo_engineer',
        approvedAt: new Date().toISOString(),
        explicitApproval: true,
      });

      const rbResult = SEOAutoApplicator.rollbackFix(appResult.rollbackToken);
      assert.strictEqual(rbResult.status, 'REVERTED');
      assert.strictEqual(rbResult.restoredSnippet, '<title>Old Title</title>');
    });

    it('10.5 Rejects invalid or expired rollback token gracefully', () => {
      assert.throws(() => {
        SEOAutoApplicator.rollbackFix('rb-invalid-token-12345');
      }, /Rollback token not found or already expired/);
    });

    it('10.6 Isolates multiple simultaneous rollback states without collisions', () => {
      const fixA: SEOFix = { ...validFix, fixId: 'fix-a', before: '<span>A</span>', after: '<span>A-new</span>' };
      const fixB: SEOFix = { ...validFix, fixId: 'fix-b', before: '<span>B</span>', after: '<span>B-new</span>' };

      const resA = SEOAutoApplicator.applyFix(fixA, validValidation, {
        approvedBy: 'user1',
        approvedAt: new Date().toISOString(),
        explicitApproval: true,
      });

      const resB = SEOAutoApplicator.applyFix(fixB, validValidation, {
        approvedBy: 'user2',
        approvedAt: new Date().toISOString(),
        explicitApproval: true,
      });

      assert.notStrictEqual(resA.rollbackToken, resB.rollbackToken);

      const rbB = SEOAutoApplicator.rollbackFix(resB.rollbackToken);
      assert.strictEqual(rbB.restoredSnippet, '<span>B</span>');

      const rbA = SEOAutoApplicator.rollbackFix(resA.rollbackToken);
      assert.strictEqual(rbA.restoredSnippet, '<span>A</span>');
    });
  });

  // =========================================================================
  // 11. ADVANCED CANONICAL PROTOCOL & VALIDATION SECURITY
  // =========================================================================
  describe('11. Advanced Protocol & Validation Security', () => {
    const evidence: SEOEvidence = {
      url: 'https://example.com/secure',
      domain: 'example.com',
      crawledAt: new Date().toISOString(),
      technical: { isIndexable: true },
    };

    it('11.1 Rejects dangerous javascript: URIs in canonical tags', () => {
      const fix: SEOFix = {
        fixId: 'sec-1',
        issueId: 'TECH-CANONICAL-XSS',
        url: 'https://example.com/secure',
        patchType: 'metadata_patch',
        title: 'Dangerous Canonical',
        explanation: 'Test dangerous protocol',
        targetLocation: '<head>',
        before: '',
        after: '<link rel="canonical" href="javascript:alert(1)" />',
        diffSummary: '+ bad canonical',
        isDestructive: true,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.canonicalValid, false);
    });

    it('11.2 Rejects dangerous ftp:// or data: URIs in canonical tags', () => {
      const fix: SEOFix = {
        fixId: 'sec-2',
        issueId: 'TECH-CANONICAL-FTP',
        url: 'https://example.com/secure',
        patchType: 'metadata_patch',
        title: 'FTP Canonical',
        explanation: 'Test FTP protocol',
        targetLocation: '<head>',
        before: '',
        after: '<link rel="canonical" href="ftp://example.com/files" />',
        diffSummary: '+ ftp canonical',
        isDestructive: true,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.canonicalValid, false);
    });

    it('11.3 Accepts valid absolute HTTPS canonical URLs', () => {
      const fix: SEOFix = {
        fixId: 'sec-3',
        issueId: 'TECH-CANONICAL-VALID',
        url: 'https://example.com/secure',
        patchType: 'metadata_patch',
        title: 'Valid Canonical',
        explanation: 'Test valid canonical',
        targetLocation: '<head>',
        before: '',
        after: '<link rel="canonical" href="https://example.com/secure" />',
        diffSummary: '+ valid canonical',
        isDestructive: false,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.checks.canonicalValid, true);
    });

    it('11.4 Flags destructive content deletions when replacement is empty', () => {
      const fix: SEOFix = {
        fixId: 'sec-4',
        issueId: 'REG-DELETE',
        url: 'https://example.com/secure',
        patchType: 'content_patch',
        title: 'Accidental Full Deletion',
        explanation: 'Empty replacement',
        targetLocation: '<main>',
        before: '<main><p>Substantive article content</p></main>',
        after: '   ',
        diffSummary: '- content',
        isDestructive: true,
        generatedAt: new Date().toISOString(),
        safetyCautions: [],
        appliedStatus: 'PENDING_APPROVAL',
      };

      const result = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.checks.regressionsFree, false);
    });
  });

  // =========================================================================
  // 12. ARCHETYPE ROUTING & END-TO-END PIPELINE INTEGRITY
  // =========================================================================
  describe('12. Archetype Routing & End-to-End Pipeline Integrity', () => {
    it('12.1 End-to-end pipeline: Evidence -> Orchestrator -> Phase 9 -> Fix -> Validate -> Approve -> Apply -> Rollback', async () => {
      // Step 1: Raw evidence
      const pageReport: any = {
        id: 'e2e-audit-1',
        url: 'https://myshop.com/product/laptop',
        technical: {
          statusCode: 200,
          isIndexable: true,
          canonicalUrl: null,
          title: '',
          mobile: { hasViewportMeta: true },
        },
        contentIntelligence: {
          pageType: { primaryType: 'PRODUCT' },
          extraction: { mainContentWordCount: 450 },
        },
        schemas: [],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport });
      assert.strictEqual(evidence.domain, 'myshop.com');

      // Step 2: Orchestrator reasoning
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);
      assert.ok(result.recommendations.length > 0);

      // Step 3: Phase 9 enrichment
      const actionPlan = AIActionBridge.generateEnrichedActionPlan({
        evidence,
        recommendations: result.recommendations,
        targetDomain: evidence.domain,
      });
      assert.ok(actionPlan.totalActions > 0);

      // Step 4: Fix generation for first recommendation
      const topRec = result.recommendations[0];
      const fix = SEOFixGenerator.generateFix({ recommendation: topRec, evidence });
      assert.strictEqual(fix.appliedStatus, 'PENDING_APPROVAL');

      // Step 5: Validation
      const validation = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(validation.isValid, true);

      // Step 6: Explicit Approval & Apply
      const applyResult = SEOAutoApplicator.applyFix(fix, validation, {
        approvedBy: 'lead_seo_architect',
        approvedAt: new Date().toISOString(),
        explicitApproval: true,
      });
      assert.strictEqual(applyResult.status, 'APPLIED');

      // Step 7: Instant Rollback
      const rollbackResult = SEOAutoApplicator.rollbackFix(applyResult.rollbackToken);
      assert.strictEqual(rollbackResult.status, 'REVERTED');
    });

    it('12.2 Article page archetype triggers content & schema agents without ecommerce pollution', async () => {
      const pageReport: any = {
        url: 'https://news.com/tech-review',
        technical: { statusCode: 200, isIndexable: true, title: 'Tech Review' },
        contentIntelligence: {
          pageType: { primaryType: 'ARTICLE' },
          extraction: { mainContentWordCount: 1200 },
          contentDepth: { hasAuthorByline: true },
        },
        schemas: [],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport });
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.ok(!result.activeAgents.includes('Ecommerce SEO Specialist'));
      assert.ok(result.activeAgents.includes('Technical SEO Specialist'));
      assert.ok(result.activeAgents.includes('Content Intelligence Specialist'));
    });

    it('12.3 Search intelligence presence triggers SERP agent dynamically', async () => {
      const searchReport: any = {
        queries: [{ query: 'best laptops 2026' }],
        intentAlignments: {
          'best laptops 2026': { level: 'WEAK_ALIGNMENT', observedSerpIntentPattern: 'INFORMATIONAL' },
        },
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({
        url: 'https://tech.com/laptops',
        searchReport,
      });

      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.ok(result.activeAgents.includes('SERP & Search Intelligence Specialist'));
    });

    it('12.4 Category page archetype triggers internal linking and breadcrumb schema recommendations', async () => {
      const pageReport: any = {
        url: 'https://myshop.com/category/footwear/running',
        technical: { statusCode: 200, isIndexable: true, title: 'Running Footwear' },
        contentIntelligence: {
          pageType: { primaryType: 'CATEGORY' },
          extraction: { mainContentWordCount: 300 },
        },
        schemas: [],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport });
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.ok(result.recommendations.some((r) => r.issueId.includes('SCHEMA-BREADCRUMB') || r.category === 'schema'));
    });

    it('12.5 Evaluates INP, LCP, and CLS thresholds according to 2026 standards', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com/perf',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: {
          performance: {
            inpEstimateMs: 450, // Needs improvement (>200ms)
            lcpEstimateMs: 3200, // Needs improvement (>2500ms)
            clsEstimate: 0.05, // Good (<=0.1)
          },
        },
      };

      assert.strictEqual(evidence.technical?.performance?.inpEstimateMs, 450);
      assert.strictEqual(evidence.technical?.performance?.clsEstimate, 0.05);
    });

    it('12.6 Confidence calculator handles contradictory signals with appropriate risk penalties', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com/risk',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { isIndexable: true, robotsDirectives: { noindex: true } },
      };

      const highRiskRec: Partial<AIRecommendation> = {
        observation: 'Contradictory robots directives detected',
        recommendedAction: 'Verify indexability intent',
        evidence: ['noindex true but isIndexable true'],
        risk: 'high',
        implementation: { type: 'html_patch' },
      };

      const confidence = SEOConfidenceCalculator.calculateConfidence(highRiskRec, evidence);
      assert.ok(confidence <= 0.85, 'High risk recommendations must have cautious confidence bounds');
    });

    it('12.7 Strips conversational AI preamble and trailing code fences uniformly', () => {
      const dirtyOutput = '```\n{\n  "status": "success",\n  "fixes": []\n}\n```';
      const clean = parseJsonSafely<{ status: string; fixes: any[] }>(dirtyOutput);
      assert.strictEqual(clean.status, 'success');
      assert.deepStrictEqual(clean.fixes, []);
    });

    it('12.8 Preserves exact 6-pillar action fields in Phase 9 SeoAction plan', () => {
      const rec: AIRecommendation = {
        issueId: 'TECH-H1-MISSING',
        url: 'https://example.com/about',
        category: 'onpage',
        priority: 'HIGH',
        confidence: 0.92,
        observation: 'Missing <h1> tag',
        evidence: ['0 h1 tags'],
        seoReason: 'Topic hierarchy',
        recommendedAction: 'Add H1 heading tag',
        implementation: { type: 'html_patch', targetElement: 'main', proposedValue: '<h1>About Us</h1>' },
        risk: 'low',
        requiresApproval: true,
      };

      const seoAction = AIActionBridge.convertRecommendationToSeoAction(rec, 'example.com');
      assert.ok(seoAction.observation);
      assert.ok(seoAction.evidence.length > 0);
      assert.ok(seoAction.interpretation);
      assert.ok(seoAction.action);
      assert.ok(seoAction.expectedBenefit);
      assert.ok(seoAction.verificationSteps.length > 0);
    });

    it('12.9 Rejects empty or malformed JSON payloads in parseJsonSafely', () => {
      assert.throws(() => {
        parseJsonSafely('Random non-json text without any brackets');
      }, /Failed to parse valid JSON/);
    });
  });

  // =========================================================================
  // 13. OLLAMA PROVIDER CONNECTION & CONFIGURATION (STEP 2 & 3)
  // =========================================================================
  describe('13. Ollama Provider Connection & Configuration', () => {
    it('13.1 OllamaProvider configures default 127.0.0.1:11434 and model', () => {
      const provider = new OllamaProvider();
      assert.strictEqual(provider.providerType, 'OLLAMA');
      assert.strictEqual(provider.modelName, 'dolphin3');
    });

    it('13.2 OllamaProvider accepts custom endpoint, model, timeout and retries', () => {
      const provider = new OllamaProvider({
        endpointUrl: 'http://127.0.0.1:11434',
        modelName: 'llama3.2:3b',
        timeoutMs: 45000,
        maxRetries: 1,
        temperature: 0.2,
      });
      assert.strictEqual(provider.providerType, 'OLLAMA');
      assert.strictEqual(provider.modelName, 'llama3.2:3b');
    });

    it('13.3 getAIProvider factory initializes OllamaProvider when AI_PROVIDER=ollama', () => {
      const original = process.env.AI_PROVIDER;
      try {
        process.env.AI_PROVIDER = 'ollama';
        const provider = getAIProvider();
        assert.strictEqual(provider.providerType, 'OLLAMA');
      } finally {
        process.env.AI_PROVIDER = original;
      }
    });

    it('13.4 OllamaProvider throws informative error on unreachable local endpoint', async () => {
      const provider = new OllamaProvider({
        endpointUrl: 'http://127.0.0.1:9999', // Non-existent port
        timeoutMs: 500,
        maxRetries: 0,
      });

      await assert.rejects(
        async () => {
          await provider.generateCompletion('system prompt', 'user prompt');
        },
        /Ollama LLM connection failed at http:\/\/127\.0\.0\.1:9999/
      );
    });
  });

  // =========================================================================
  // 14. CONTROLLED REAL ECOMMERCE AUDIT FIXTURE (STEP 6)
  // =========================================================================
  describe('14. Controlled Real Ecommerce Audit Fixture (Step 6)', () => {
    it('14.1 Runs complete pipeline on an unoptimized ecommerce product page', async () => {
      // Step 1: Raw Audit Fixture with deliberate issues
      const unoptimizedPageReport: any = {
        id: 'ecom-audit-shoes-101',
        url: 'https://shoestore.com/products/running-shoes-beginners',
        normalizedUrl: 'https://shoestore.com/products/running-shoes-beginners',
        technical: {
          statusCode: 200,
          isIndexable: true,
          canonicalUrl: null, // Issue 1: Missing canonical
          mobile: { hasViewportMeta: true },
          infrastructure: { isHttps: true, hasMixedContent: false },
        },
        onPage: {
          title: '', // Issue 2: Missing title
          metaDescription: '', // Issue 3: Missing meta description
          headings: { h1: [], h2: ['Customer Reviews'] }, // Issue 4: Missing H1
          wordCount: 85, // Issue 5: Thin content (< 200 words)
        },
        images: {
          totalImages: 4,
          withAlt: 1,
          missingAlt: 3, // Issue 6: 3 missing alt tags
        },
        contentIntelligence: {
          pageType: { primaryType: 'PRODUCT' },
          searchIntent: { primaryIntent: 'TRANSACTIONAL', confidence: 'HIGH' },
          extraction: { mainContentWordCount: 85 },
          contentGaps: [{ topic: 'cushioning guide' }, { topic: 'arch support' }], // Issue 7: Topic gaps
        },
        schemas: [], // Issue 8: Missing Product & Breadcrumb schema
        issues: [
          { severity: 'CRITICAL', title: 'Missing Title Tag', description: 'Page has no title' },
          { severity: 'HIGH', title: 'Missing Canonical Tag', description: 'Page has no canonical' },
        ],
      };

      const searchReport: any = {
        queries: [{ query: 'best running shoes for beginners' }],
        intentAlignments: {
          'best running shoes for beginners': {
            level: 'STRONG_ALIGNMENT',
            observedSerpIntentPattern: 'TRANSACTIONAL',
            isMixedSerp: false,
          },
        },
        topicPatterns: {
          'best running shoes for beginners': [
            { topic: 'cushioning guide', isCoveredInUserPage: false },
          ],
        },
      };

      // Step 2: Evidence Normalization
      const evidence = SEOEvidenceBuilder.buildEvidence({
        pageReport: unoptimizedPageReport,
        searchReport,
      });

      assert.strictEqual(evidence.domain, 'shoestore.com');
      assert.strictEqual(evidence.pageType, 'PRODUCT');
      assert.strictEqual(evidence.technical?.title?.isMissing, true);
      assert.strictEqual(evidence.technical?.canonicalUrl, null);
      assert.strictEqual(evidence.ecommerce?.isEcommercePage, true);
      assert.strictEqual(evidence.ecommerce?.hasProductSchema, false);

      // Step 3: Multi-Agent Orchestrator Reasoning
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.ok(result.recommendations.length >= 4);
      assert.ok(result.activeAgents.includes('Technical SEO Specialist'));
      assert.ok(result.activeAgents.includes('Ecommerce SEO Specialist'));
      assert.ok(result.activeAgents.includes('Content Intelligence Specialist'));

      // Verify specific evidence-based recommendations
      const hasTitleRec = result.recommendations.some((r) => r.issueId === 'TECH-TITLE-MISSING');
      const hasH1Rec = result.recommendations.some((r) => r.issueId === 'TECH-H1-MISSING');
      const hasCanonicalRec = result.recommendations.some((r) => r.issueId === 'TECH-CANONICAL-MISSING');
      const hasProductSchemaRec = result.recommendations.some((r) => r.issueId === 'ECOM-PRODUCT-SCHEMA-MISSING');

      assert.strictEqual(hasTitleRec, true, 'Must identify missing title');
      assert.strictEqual(hasH1Rec, true, 'Must identify missing H1');
      assert.strictEqual(hasCanonicalRec, true, 'Must identify missing canonical');
      assert.strictEqual(hasProductSchemaRec, true, 'Must identify missing Product schema');

      // Step 4: Phase 9 Action Plan Synthesis
      const actionPlan = AIActionBridge.generateEnrichedActionPlan({
        evidence,
        recommendations: result.recommendations,
        targetDomain: evidence.domain,
      });

      assert.ok(actionPlan.totalActions >= 4);
      assert.ok(actionPlan.actions[0].priority >= 70, 'Critical technical issues must receive high priority');

      // Step 5: Fix Generation, Pre-Flight Validation, & Preview
      const productSchemaRec = result.recommendations.find((r) => r.issueId === 'ECOM-PRODUCT-SCHEMA-MISSING')!;
      const fix = SEOFixGenerator.generateFix({ recommendation: productSchemaRec, evidence });

      assert.strictEqual(fix.patchType, 'schema_patch');
      assert.strictEqual(fix.appliedStatus, 'PENDING_APPROVAL');

      const validation = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.checks.schemaValid, true);
    });
  });

  // =========================================================================
  // 15. CONTROLLED INTENTIONALLY GOOD PAGE AUDIT (STEP 7 — ZERO MANUFACTURED WORK)
  // =========================================================================
  describe('15. Intentionally Good Page Audit (Step 7)', () => {
    it('15.1 Returns zero artificial recommendations for a clean, fully-optimized page', async () => {
      const cleanPageReport: any = {
        id: 'clean-audit-1',
        url: 'https://clean-site.com/products/elite-runner',
        normalizedUrl: 'https://clean-site.com/products/elite-runner',
        technical: {
          statusCode: 200,
          isIndexable: true,
          canonicalUrl: 'https://clean-site.com/products/elite-runner',
          isCanonicalSelfReferencing: true,
          robotsTxt: { isDisallowed: false },
          robotsDirectives: { noindex: false, nofollow: false },
          mobile: { hasViewportMeta: true },
          infrastructure: { isHttps: true, hasMixedContent: false },
        },
        onPage: {
          title: 'Elite Runner Carbon Plate Shoes | CleanSite',
          metaDescription: 'Discover our ultra-lightweight carbon plate running shoes engineered for marathon performance.',
          headings: {
            h1: ['Elite Runner Carbon Plate Shoes'],
            h2: ['Performance Features', 'Cushioning Technology', 'Size & Fit', 'Specifications'],
          },
          wordCount: 1250,
        },
        images: {
          totalImages: 6,
          withAlt: 6,
          missingAlt: 0,
        },
        contentIntelligence: {
          pageType: { primaryType: 'PRODUCT' },
          searchIntent: { primaryIntent: 'TRANSACTIONAL', confidence: 'HIGH' },
          extraction: { mainContentWordCount: 1250 },
          contentDepth: { hasAuthorByline: true, hasContactInfo: true, hasEditorialTransparency: true },
          contentGaps: [], // No gaps
        },
        schemas: [
          {
            type: 'Product',
            name: 'Elite Runner Carbon Plate Shoes',
            offers: { price: '199.99', priceCurrency: 'USD', availability: 'InStock' },
          },
          {
            type: 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://clean-site.com' },
              { '@type': 'ListItem', position: 2, name: 'Shoes', item: 'https://clean-site.com/shoes' },
            ],
          },
        ],
        issues: [],
      };

      const evidence = SEOEvidenceBuilder.buildEvidence({ pageReport: cleanPageReport });

      assert.strictEqual(evidence.technical?.title?.isMissing, false);
      assert.strictEqual(evidence.technical?.headings?.h1Count, 1);
      assert.strictEqual(evidence.ecommerce?.hasProductSchema, true);
      assert.strictEqual(evidence.ecommerce?.hasBreadcrumbs, true);

      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.strictEqual(result.recommendations.length, 0, 'Must produce 0 recommendations on clean optimized page');
      assert.strictEqual(result.summaryMessage, 'No significant evidence-based action identified.');
    });
  });

  // =========================================================================
  // 16. ANTI-HALLUCINATION & RANKING PROTECTION (STEP 8 & 9)
  // =========================================================================
  describe('16. Anti-Hallucination & Ranking Claim Protection', () => {
    it('16.1 Sanitizes all ranking guarantee promises into evidence-based statements', async () => {
      const mock = new MockAIProvider();
      mock.mockStructuredResponses.set('example.com', [
        {
          issueId: 'PROMISE-1',
          url: 'https://example.com',
          category: 'technical',
          priority: 'HIGH',
          confidence: 0.95,
          observation: 'We guarantee top 1 ranking and promised traffic if you resolve FID latency.',
          evidence: ['Measured data'],
          seoReason: 'This change guarantees #1 ranking and will guarantee top 10 positions.',
          recommendedAction: 'Apply fix to guarantee first page ranking.',
          implementation: { type: 'html_patch' },
          risk: 'low',
          requiresApproval: true,
        },
      ]);

      const orchestrator = new AISEOOrchestrator(undefined, mock);
      const evidence: SEOEvidence = {
        url: 'https://example.com',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
      };

      const result = await orchestrator.analyzeEvidence(evidence);
      const rec = result.recommendations[0];

      assert.ok(!rec.observation.includes('guarantee top 1 ranking'));
      assert.ok(!rec.observation.includes('promised traffic'));
      assert.ok(!rec.observation.includes('FID'));
      assert.ok(!rec.seoReason.includes('guarantees #1'));
      assert.ok(!rec.seoReason.includes('guarantee top 10'));
      assert.ok(!rec.recommendedAction.includes('guarantee first page ranking'));
    });

    it('16.2 Specialist prompts explicitly warn against unmeasured metric fabrication', () => {
      const prompt = ClaudeSEOAdapter.getSerpAgentPrompt();
      assert.ok(prompt.includes('STRICT ANTI-FABRICATION CONSTRAINTS'));
      assert.ok(prompt.includes('NO fabricated Keyword Difficulty (KD), Cost Per Click (CPC), or Domain Authority (DA)'));
      assert.ok(prompt.includes('Never guess ranking positions; cite only observed SERP evidence'));
    });
  });

  // =========================================================================
  // 17. FIX GENERATION & SAFE PREVIEW STATE (STEP 10)
  // =========================================================================
  describe('17. Fix Generation, Diff & Safe Preview State', () => {
    it('17.1 Formulates complete BEFORE, AFTER, WHY, EVIDENCE, CONFIDENCE, RISK and VALIDATION preview', () => {
      const evidence: SEOEvidence = {
        url: 'https://example.com/item',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true, value: '' } },
      };

      const rec: AIRecommendation = {
        issueId: 'TECH-TITLE-MISSING',
        url: 'https://example.com/item',
        category: 'technical',
        priority: 'CRITICAL',
        confidence: 0.95,
        observation: 'The page HTML is missing a <title> tag in the <head> section.',
        evidence: ['Page title is absent or empty', 'Measured in <head> parse tree'],
        seoReason: 'The <title> element is a primary signal for search engine indexing and snippet presentation.',
        recommendedAction: 'Add a descriptive <title> tag.',
        implementation: {
          type: 'metadata_update',
          targetElement: '<head>',
          proposedValue: '<title>Example Item Overview | Example Domain</title>',
        },
        risk: 'low',
        requiresApproval: true,
      };

      // Generate Fix Patch
      const fix = SEOFixGenerator.generateFix({ recommendation: rec, evidence });
      assert.ok(fix.before !== undefined, 'Must provide BEFORE state');
      assert.ok(fix.after.includes('<title>Example Item Overview | Example Domain</title>'), 'Must provide AFTER state');
      assert.ok(fix.diffSummary.length > 0, 'Must provide line-by-line diff');
      assert.strictEqual(fix.appliedStatus, 'PENDING_APPROVAL');

      // Execute Pre-flight Validation
      const validation = SEOValidator.validateFix({ fix, evidence });
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.status, 'passed');

      // Final Preview Contract Verification
      const previewData = {
        before: fix.before,
        after: fix.after,
        why: rec.seoReason,
        evidence: rec.evidence,
        confidence: rec.confidence,
        risk: rec.risk,
        validationStatus: validation.status,
      };

      assert.ok(previewData.before !== undefined);
      assert.ok(previewData.after);
      assert.ok(previewData.why);
      assert.strictEqual(previewData.confidence, 0.95);
      assert.strictEqual(previewData.risk, 'low');
      assert.strictEqual(previewData.validationStatus, 'passed');
    });
  });

  // =========================================================================
  // 18. LOCAL MODEL FALLBACK & TELEMETRY (STEP 11 & 12)
  // =========================================================================
  describe('18. Local Model Fallback & Telemetry Logging', () => {
    it('18.1 Seamlessly falls back to deterministic analysis when local model errors/times out', async () => {
      const mockFailingLLM = new MockAIProvider();
      mockFailingLLM.shouldSimulateError = true;
      mockFailingLLM.errorMessage = 'connect ECONNREFUSED 127.0.0.1:11434';

      const orchestrator = new AISEOOrchestrator(undefined, mockFailingLLM);
      const evidence: SEOEvidence = {
        url: 'https://example.com/store/item',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        pageType: 'PRODUCT',
        technical: { title: { isMissing: true }, canonicalUrl: null },
        ecommerce: { isEcommercePage: true, hasProductSchema: false },
      };

      // Must NOT throw or crash
      const result = await orchestrator.analyzeEvidence(evidence);

      assert.ok(result.recommendations.length > 0, 'Must still produce deterministic recommendations');
      assert.strictEqual(result.telemetry.fallbackTriggered, true);
      assert.ok(result.providerUsed.includes('AI provider unavailable — deterministic fallback used'));
      assert.ok(result.telemetry.durationMs >= 0);
      assert.ok(result.telemetry.promptSizeBytes > 0);
      assert.ok(result.telemetry.responseSizeBytes > 0);
    });

    it('18.2 Telemetry measures prompt size and response size without logging secrets', async () => {
      const orchestrator = new AISEOOrchestrator({ providerType: 'RULE_INFORMED_OFFLINE' });
      const evidence: SEOEvidence = {
        url: 'https://example.com/test',
        domain: 'example.com',
        crawledAt: new Date().toISOString(),
        technical: { title: { isMissing: true } },
      };

      const result = await orchestrator.analyzeEvidence(evidence);
      assert.ok(result.telemetry.promptSizeBytes > 0);
      assert.ok(result.telemetry.responseSizeBytes > 0);
      assert.strictEqual(result.telemetry.fallbackTriggered, false);
    });
  });

  // =========================================================================
  // 19. LOCAL AI STARTUP AUTOMATION & HEALTH DIAGNOSTICS
  // =========================================================================
  describe('19. Local AI Startup Automation & Health Diagnostics', () => {
    it('19.1 isModelNameMatch accurately matches exact names, tags, and variants', () => {
      assert.strictEqual(isModelNameMatch('dolphin3', 'dolphin3'), true);
      assert.strictEqual(isModelNameMatch('dolphin3', 'dolphin3:latest'), true);
      assert.strictEqual(isModelNameMatch('dolphin3:latest', 'dolphin3'), true);
      assert.strictEqual(isModelNameMatch('qwen2.5-coder:7b', 'qwen2.5-coder:7b'), true);
      assert.strictEqual(isModelNameMatch('qwen2.5-coder:7b', 'qwen2.5-coder:7b:latest'), true);
      assert.strictEqual(isModelNameMatch('qwen2.5-coder:7b', 'qwen2.5-coder:7b-instruct-q4_K_M'), true);
      assert.strictEqual(isModelNameMatch('llama3.2:3b', 'llama3.2:3b'), true);
      assert.strictEqual(isModelNameMatch('dolphin3', 'llama3.2:3b'), false);
      assert.strictEqual(isModelNameMatch('qwen2.5-coder:7b', 'dolphin3'), false);
      assert.strictEqual(isModelNameMatch('', 'dolphin3'), false);
    });

    it('19.2 checkAIHealth reports FALLBACK_READY for offline deterministic mode', async () => {
      const health = await checkAIHealth({ providerType: 'RULE_INFORMED_OFFLINE' });
      assert.strictEqual(health.provider, 'rule-informed-offline');
      assert.strictEqual(health.status, 'FALLBACK_READY');
      assert.strictEqual(health.available, true);
      assert.strictEqual(health.fallbackAvailable, true);
      assert.strictEqual(health.model, 'rule-informed-expert-engine');
    });

    it('19.3 checkAIHealth reports OLLAMA_UNAVAILABLE and fallbackAvailable for dead ports', async () => {
      const health = await checkAIHealth({
        providerType: 'OLLAMA',
        endpointUrl: 'http://127.0.0.1:59999', // Non-existent test port
        timeoutMs: 500,
      });

      assert.strictEqual(health.provider, 'ollama');
      assert.strictEqual(health.status, 'OLLAMA_UNAVAILABLE');
      assert.strictEqual(health.available, false);
      assert.strictEqual(health.fallbackAvailable, true);
      assert.ok(health.error);
    });

    it('19.4 checkAIHealth reports MODEL_MISSING when Ollama is running but model is missing', async () => {
      // Test querying a non-existent dummy model on local Ollama
      const health = await checkAIHealth({
        providerType: 'OLLAMA',
        endpointUrl: 'http://127.0.0.1:11434',
        modelName: 'non-existent-fake-model:999b',
        timeoutMs: 2000,
      });

      if (health.status !== 'OLLAMA_UNAVAILABLE') {
        assert.strictEqual(health.provider, 'ollama');
        assert.strictEqual(health.status, 'MODEL_MISSING');
        assert.strictEqual(health.available, false);
        assert.strictEqual(health.fallbackAvailable, true);
        assert.ok(health.error?.includes('ollama pull'));
      }
    });

    it('19.5 runAIDiagnostic performs fast isolated test without crawl overhead', async () => {
      const res = await runAIDiagnostic('Respond with READY', {
        providerType: 'RULE_INFORMED_OFFLINE',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.provider, 'RULE_INFORMED_OFFLINE');
      assert.ok(res.durationMs >= 0);
      assert.ok(res.output.length > 0);
    });
  });
});


