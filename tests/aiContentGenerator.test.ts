import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AIContentGenerator,
  AIContentGenerationRequest,
  MockAIProvider,
  RuleInformedProvider,
} from '../lib/ai-seo';

describe('AI SEO Content Generator Test Suite', () => {
  // =========================================================================
  // 1. WORD LIMIT HANDLING & DEVIATION
  // =========================================================================
  describe('1. Word Limit Handling & Deviation', () => {
    it('1.1 Computes actual word count, deviation, and tolerance pass accurately', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Pro Runner Carbon X',
        primaryKeyword: 'carbon running shoes',
        wordLimit: 100,
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());

      assert.strictEqual(result.requestedWordCount, 100);
      assert.ok(result.actualWordCount > 0);
      assert.strictEqual(result.deviation, result.actualWordCount - 100);
      assert.ok(result.contentQuality.wordCountPass);
    });

    it('1.2 Default word count is applied when not explicitly specified', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'section',
        mainTopic: 'Core Web Vitals Optimization',
        primaryKeyword: 'INP optimization',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.strictEqual(result.requestedWordCount, 300); // default
      assert.ok(result.actualWordCount > 0);
    });
  });

  // =========================================================================
  // 2. INPUT VALIDATION & DEFAULTS
  // =========================================================================
  describe('2. Input Validation & Default Normalization', () => {
    it('2.1 Gracefully normalizes empty or missing secondary keywords and related topics', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'paragraph',
        mainTopic: 'Website Speed',
        primaryKeyword: 'page speed',
        secondaryKeywords: 'fast loading, cdn, caching', // comma-separated string
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.strictEqual(result.seo.secondaryKeywords.length, 3);
      assert.deepStrictEqual(result.seo.secondaryKeywords, ['fast loading', 'cdn', 'caching']);
    });
  });

  // =========================================================================
  // 3. KEYWORD USAGE & STUFFING DETECTION
  // =========================================================================
  describe('3. Keyword Usage & Anti-Stuffing Detection', () => {
    it('3.1 Detects natural primary keyword usage without triggering stuffing flag', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'category-description',
        mainTopic: 'Trail Running Gear',
        primaryKeyword: 'trail running shoes',
        wordLimit: 200,
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.strictEqual(result.seo.primaryKeywordUsed, true);
      assert.strictEqual(result.contentQuality.keywordStuffingDetected, false);
      assert.ok(result.contentQuality.score >= 80);
    });

    it('3.2 Detects keyword stuffing when keyword density exceeds threshold', async () => {
      const mockStuffedProvider = new MockAIProvider();
      // Simulate an over-stuffed completion from an unaligned model
      mockStuffedProvider.mockStructuredResponses.set('GENERATE_SEO_CONTENT', {
        content: 'trail shoes trail shoes trail shoes trail shoes trail shoes are great trail shoes for trail shoes runners looking for trail shoes.',
        contentType: 'paragraph',
        seo: { primaryKeyword: 'trail shoes', secondaryKeywords: [] },
        metadata: { title: 'Trail Shoes', metaDescription: 'Trail shoes' },
      });

      const req: AIContentGenerationRequest = {
        contentType: 'paragraph',
        mainTopic: 'Trail Shoes',
        primaryKeyword: 'trail shoes',
        wordLimit: 50,
      };

      const result = await AIContentGenerator.generate(req, mockStuffedProvider);
      assert.strictEqual(result.contentQuality.keywordStuffingDetected, true);
      assert.ok(result.warnings.some((w) => w.includes('keyword stuffing')));
      assert.strictEqual(result.contentQuality.intentAlignment, 'weak');
    });
  });

  // =========================================================================
  // 4. METADATA GENERATION & META-KEYWORDS PROHIBITION
  // =========================================================================
  describe('4. Metadata Package & Meta-Keywords Prohibition', () => {
    it('4.1 Generates complete title, meta description, slug, H1, and heading hierarchy', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Technical SEO Auditing',
        primaryKeyword: 'technical seo checklist',
        wordLimit: 500,
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.metadata.title.includes('Technical SEO'));
      assert.ok(result.metadata.metaDescription.length > 20);
      assert.ok(result.metadata.slug.includes('technical-seo'));
      assert.ok(result.metadata.h1.length > 0);
      assert.ok(result.metadata.headings.length >= 2);
    });

    it('4.2 Explains Google stance and prohibits <meta name="keywords"> tags', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Search Algorithms',
        primaryKeyword: 'google ranking factors',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      // Disclaimers must explicitly educate on meta-keywords
      assert.ok(result.disclaimers.metaKeywordsNotice.includes('meta name="keywords"'));
      assert.ok(result.disclaimers.metaKeywordsNotice.includes('does not use'));
      // Must not have metaKeywords property in metadata
      assert.strictEqual((result.metadata as any).keywords, undefined);
    });
  });

  // =========================================================================
  // 5. STRUCTURED DATA / SCHEMA ACCURACY BY PAGE TYPE
  // =========================================================================
  describe('5. Structured Data Recommendations by Page Type', () => {
    it('5.1 Recommends Product & BreadcrumbList for product descriptions with missing field warnings', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Carbon Running Shoes X1',
        primaryKeyword: 'carbon running shoe',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.structuredData.recommendedTypes.includes('Product'));
      assert.ok(result.structuredData.recommendedTypes.includes('BreadcrumbList'));
      assert.ok(result.structuredData.schemaSnippet?.includes('Product'));
      assert.ok(result.structuredData.missingRequiredData.some((m) => m.includes('price')));
    });

    it('5.2 Recommends FAQPage structured data for FAQ content types', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'faq',
        mainTopic: 'Ecommerce Shipping FAQ',
        primaryKeyword: 'express shipping times',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.structuredData.recommendedTypes.includes('FAQPage'));
      assert.ok(result.structuredData.schemaSnippet?.includes('FAQPage'));
      assert.ok(result.structuredData.schemaSnippet?.includes('Question'));
    });

    it('5.3 Recommends Article for blog content', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Guide to Crawl Budget',
        primaryKeyword: 'crawl budget optimization',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.structuredData.recommendedTypes.includes('Article'));
      assert.ok(result.structuredData.schemaSnippet?.includes('Article'));
    });
  });

  // =========================================================================
  // 6. RANKING CLAIM & HALLUCINATION PROTECTION
  // =========================================================================
  describe('6. Ranking Claim & Metric Hallucination Protection', () => {
    it('6.1 Sanitizes and removes ranking guarantees (#1 ranking, guaranteed traffic)', async () => {
      const mockOverpromisingLLM = new MockAIProvider();
      mockStuffed: mockOverpromisingLLM.mockStructuredResponses.set('GENERATE_SEO_CONTENT', {
        content: 'This strategy will guarantee a #1 Google ranking and guarantee traffic to your site.',
        contentType: 'paragraph',
        seo: { primaryKeyword: 'seo strategy' },
        metadata: { title: 'Guaranteed #1 Ranking Strategy' },
      });

      const req: AIContentGenerationRequest = {
        contentType: 'paragraph',
        mainTopic: 'SEO Strategy',
        primaryKeyword: 'seo strategy',
      };

      const result = await AIContentGenerator.generate(req, mockOverpromisingLLM);

      // The content must be sanitized
      assert.ok(!result.content.includes('guarantee a #1 Google ranking'));
      assert.ok(!result.content.includes('guarantee traffic'));
      assert.ok(result.disclaimers.noRankingGuarantee.includes('rankings cannot be guaranteed'));
    });

    it('6.2 Disclaimers clearly state quality score is an internal heuristic, not Google ranking score', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'section',
        mainTopic: 'Internal Linking',
        primaryKeyword: 'link hierarchy',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.disclaimers.qualityScoreNotice.includes('internal heuristic'));
      assert.ok(result.disclaimers.qualityScoreNotice.includes('not an official search engine ranking metric'));
    });
  });

  // =========================================================================
  // 7. CONTENT IMPROVEMENT / REWRITE MODE
  // =========================================================================
  describe('7. Content Improvement & Rewrite Mode', () => {
    it('7.1 Compares original text with improved text and records change log', async () => {
      const original = 'We sell running shoes. They are good shoes for people who run outside.';
      const req: AIContentGenerationRequest = {
        contentType: 'content-improvement',
        mainTopic: 'Performance Running Footwear',
        primaryKeyword: 'breathable running shoes',
        existingContent: original,
        improvementGoal: 'improve_seo',
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());

      assert.ok(result.contentImprovement !== undefined);
      assert.strictEqual(result.contentImprovement.originalContent, original);
      assert.ok(result.contentImprovement.improvedContent.length > original.length);
      assert.ok(result.contentImprovement.changesMade.length > 0);
      assert.ok(result.contentImprovement.seoImprovements.length > 0);
    });
  });

  // =========================================================================
  // 8. EVIDENCE INTEGRATION FROM AUDITED PAGES
  // =========================================================================
  describe('8. SEO Evidence Integration from Audited Pages', () => {
    it('8.1 Ingests evidence from previous SEO audits without fabricating missing data', async () => {
      const req: AIContentGenerationRequest = {
        contentType: 'category-description',
        mainTopic: 'Men Running Shoes Category',
        primaryKeyword: 'men running footwear',
        evidence: {
          url: 'https://example.com/collections/men-running',
          domain: 'example.com',
          crawledAt: new Date().toISOString(),
          pageType: 'CATEGORY',
          technical: {
            title: { value: 'Men Running Collection', isMissing: false },
            metaDescription: { exists: false },
          },
          rawIssuesSummary: ['Missing meta description', 'Thin category copy (42 words)'],
        },
      };

      const result = await AIContentGenerator.generate(req, new RuleInformedProvider());
      assert.ok(result.actualWordCount >= 50);
      assert.ok(result.metadata.metaDescription.length > 30);
      assert.ok(result.evidenceUsed.length > 0);
    });
  });
});
