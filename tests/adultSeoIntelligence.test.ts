import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AdultContentSafetyGuard, ADULT_PROHIBITED_CODE } from '../lib/ai-seo/content-safety';
import { ContentIntelligencePlanner } from '../lib/ai-seo/content-planner';
import { ContentScorer } from '../lib/ai-seo/content-scorer';
import { AIContentGenerator } from '../lib/ai-seo/content-generator';
import {
  AIContentGenerationRequest,
  ContentProfile,
  AdultContentProfile,
} from '../lib/ai-seo/content-types';

describe('Adult / 18+ SEO Content Intelligence Engine', () => {

  describe('1. Content Profile and Subprofile Configurations', () => {
    it('should support all standard and adult content profiles', () => {
      const profiles: ContentProfile[] = [
        'general',
        'ecommerce',
        'saas',
        'local-business',
        'publisher',
        'adult',
      ];
      assert.strictEqual(profiles.length, 6);

      const adultSubprofiles: AdultContentProfile[] = [
        'adult-entertainment',
        'adult-products',
        'sexual-wellness',
        'adult-creator',
        'adult-community',
        'adult-video',
        'escort-services',
        'adult-stories',
      ];
      assert.strictEqual(adultSubprofiles.length, 8);
    });

    it('should automatically infer adult profile and construct AdultSEOContext', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Premium Body-Safe Silicone Wellness Toy',
        primaryKeyword: 'body safe silicone adult toy',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
        wordLimit: 250,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      assert.strictEqual(plan.contentProfile, 'adult');
      assert.ok(plan.adultContext, 'Expected adultContext to be populated');
      assert.strictEqual(plan.adultContext?.profile, 'adult-products');
      assert.strictEqual(plan.adultContext?.isAdultSite, true);
      assert.strictEqual(plan.adultContext?.ageRestricted, true);
      assert.ok(
        plan.adultContext?.schemaRecommendations.some((s) => s.includes('SexualContentConsideration') || s.includes('Product'))
      );
    });
  });

  describe('2. Adult Search Intent Classification vs Domain Classification', () => {
    it('should map adult product queries to commercial/transactional search intent, not an artificial adult intent', () => {
      const commercialReq: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Rechargeable Waterproof Pleasure Wand',
        primaryKeyword: 'buy rechargeable pleasure wand',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
      };

      const plan = ContentIntelligencePlanner.constructPlan(commercialReq);
      // Intent must remain a standard search intent (commercial/transactional), not "adult"
      assert.ok(
        ['transactional', 'commercial', 'informational'].includes(plan.searchIntent.type),
        `Expected standard intent, got: ${plan.searchIntent.type}`
      );
    });

    it('should map sexual wellness guides to informational search intent', () => {
      const infoReq: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Guide to Intimate Wellness and Body-Safe Materials',
        primaryKeyword: 'sexual wellness guide for couples',
        contentProfile: 'adult',
        adultProfile: 'sexual-wellness',
        wordLimit: 800,
      };

      const plan = ContentIntelligencePlanner.constructPlan(infoReq);
      assert.strictEqual(plan.searchIntent.type, 'informational');
      assert.strictEqual(plan.adultContext?.profile, 'sexual-wellness');
      assert.ok(
        plan.adultContext?.trustRequirements?.some((s) =>
          s.toLowerCase().includes('wellness') || s.toLowerCase().includes('body-safe') || s.toLowerCase().includes('hygiene')
        )
      );
    });
  });

  describe('3. Strict Zero-Tolerance Safety Guardrails', () => {
    it('should block queries referencing minors, under-age or CSAM with ADULT_PROHIBITED_CONTENT', () => {
      const testCases = [
        'underage adult entertainment video',
        'teen minor sexual content',
        'school girl uniform adult model',
        'youth intimate photos',
      ];

      for (const query of testCases) {
        assert.throws(
          () => {
            AdultContentSafetyGuard.validateOrThrow({
              contentType: 'blog-article',
              mainTopic: query,
              primaryKeyword: query,
              contentProfile: 'adult',
            });
          },
          (err: any) => {
            assert.strictEqual(err.code, ADULT_PROHIBITED_CODE);
            assert.ok(err.message.includes('Safety policy violation'));
            return true;
          },
          `Expected query "${query}" to be blocked`
        );
      }
    });

    it('should block queries involving non-consensual content, coercion, or revenge porn', () => {
      const nonConsensualCases = [
        'forced non consensual adult video',
        'leaked hidden camera revenge porn',
        'coerced webcam recordings',
      ];

      for (const query of nonConsensualCases) {
        assert.throws(
          () => {
            AdultContentSafetyGuard.validateOrThrow({
              contentType: 'blog-article',
              mainTopic: query,
              primaryKeyword: query,
              contentProfile: 'adult',
            });
          },
          (err: any) => {
            assert.strictEqual(err.code, ADULT_PROHIBITED_CODE);
            return true;
          },
          `Expected non-consensual query "${query}" to be blocked`
        );
      }
    });

    it('should allow legitimate adult products and educational wellness content', () => {
      const validCases: AIContentGenerationRequest[] = [
        {
          contentType: 'product-description',
          mainTopic: 'Medical Grade Silicone Wand Massager',
          primaryKeyword: 'medical grade silicone vibrator',
          contentProfile: 'adult',
          adultProfile: 'adult-products',
        },
        {
          contentType: 'blog-article',
          mainTopic: 'Pelvic Floor Health and Sexual Wellness Guide',
          primaryKeyword: 'kegel exercises intimate health',
          contentProfile: 'adult',
          adultProfile: 'sexual-wellness',
        },
        {
          contentType: 'blog-article',
          mainTopic: 'Verified Adult Creator Membership and Official Content',
          primaryKeyword: 'official adult creator subscription',
          contentProfile: 'adult',
          adultProfile: 'adult-creator',
        },
      ];

      for (const req of validCases) {
        const check = AdultContentSafetyGuard.evaluate(req);
        assert.strictEqual(check.isSafe, true, `Expected valid request to pass safety check: ${req.mainTopic}`);
      }
    });
  });

  describe('4. Blueprint Construction and Adult Section Budgeting', () => {
    it('should create specialized adult product sections with body-safe materials and discreet shipping', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Dual Stimulation Sonic Massager',
        primaryKeyword: 'sonic pleasure massager',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
        wordLimit: 300,
      };

      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.contentProfile, 'adult');
      assert.ok(blueprint.sections.length >= 3);

      const sectionHeadings = blueprint.sections.map((s) => s.heading.toLowerCase());
      assert.ok(
        sectionHeadings.some((h) => h.includes('features') || h.includes('design') || h.includes('materials') || h.includes('overview')),
        'Expected product sections to include design/materials/features'
      );
    });

    it('should create specialized sexual wellness sections with educational and health disclaimers', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Complete Guide to Couples Intimacy and Communication',
        primaryKeyword: 'improving couples intimate wellness',
        contentProfile: 'adult',
        adultProfile: 'sexual-wellness',
        wordLimit: 800,
      };

      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.contentProfile, 'adult');
      assert.strictEqual(blueprint.adultContext?.profile, 'sexual-wellness');
      assert.strictEqual(blueprint.totalTargetWords, 800);

      const sectionHeadings = blueprint.sections.map((s) => s.heading.toLowerCase());
      assert.ok(
        sectionHeadings.some((h) => h.includes('understanding') || h.includes('wellness') || h.includes('guidelines') || h.includes('principles') || h.includes('guide'))
      );
    });

    it('should create specialized adult creator sections with anti-fabrication guardrails', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Verified Creator Showcase: Official Fan Club and Schedule',
        primaryKeyword: 'verified adult creator official channel',
        contentProfile: 'adult',
        adultProfile: 'adult-creator',
        wordLimit: 500,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.adultContext?.profile, 'adult-creator');
      assert.ok(
        plan.adultContext?.restrictedClaims.some((c) =>
          c.toLowerCase().includes('fabrication') || c.toLowerCase().includes('personal') || c.toLowerCase().includes('age') || c.toLowerCase().includes('invent')
        )
      );
    });

    it('should create specialized Call Girl / Escort Services sections with discretion and anti-fabrication rules', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'section',
        mainTopic: 'VIP Social Companionship & Dinner Accompaniment Directory',
        primaryKeyword: 'vip escort services and companion guide',
        contentProfile: 'adult',
        adultProfile: 'escort-services',
        wordLimit: 600,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.adultContext?.profile, 'escort-services');
      assert.strictEqual(blueprint.adultContext?.contentClassification, 'adult-service');
      assert.strictEqual(blueprint.adultContext?.ageRestricted, true);
      assert.ok(blueprint.sections.length >= 4);

      const sectionHeadings = blueprint.sections.map((s) => s.heading.toLowerCase());
      assert.ok(sectionHeadings.some((h) => h.includes('companionship') || h.includes('service overview')));
      assert.ok(sectionHeadings.some((h) => h.includes('discretion') || h.includes('privacy') || h.includes('safety')));
      assert.ok(sectionHeadings.some((h) => h.includes('etiquette') || h.includes('accompaniment')));
      assert.ok(sectionHeadings.some((h) => h.includes('screening') || h.includes('booking') || h.includes('reservation')));

      assert.ok(
        plan.adultContext?.restrictedClaims.some((c) =>
          c.toLowerCase().includes('anti-fabrication') || c.toLowerCase().includes('personal contact') || c.toLowerCase().includes('names')
        )
      );
    });

    it('should create specialized Adult Stories / Erotica Literature sections with narrative progression', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Midnight Rendezvous in Venice: Romantic Fiction Chapter',
        primaryKeyword: 'sensual romance stories erotica chapter',
        contentProfile: 'adult',
        adultProfile: 'adult-stories',
        wordLimit: 800,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      const blueprint = ContentIntelligencePlanner.constructBlueprint(req);
      assert.strictEqual(blueprint.adultContext?.profile, 'adult-stories');
      assert.strictEqual(blueprint.adultContext?.contentClassification, 'adult-literature');
      assert.strictEqual(blueprint.adultContext?.ageRestricted, true);
      assert.strictEqual(blueprint.sections.length, 5);

      const sectionHeadings = blueprint.sections.map((s) => s.heading.toLowerCase());
      assert.ok(sectionHeadings.some((h) => h.includes('premise') || h.includes('atmospheric') || h.includes('setting')));
      assert.ok(sectionHeadings.some((h) => h.includes('character') || h.includes('chemistry') || h.includes('tension')));
      assert.ok(sectionHeadings.some((h) => h.includes('core narrative') || h.includes('passion') || h.includes('intimate')));
      assert.ok(sectionHeadings.some((h) => h.includes('climax') || h.includes('resonance')));
      assert.ok(sectionHeadings.some((h) => h.includes('epilogue') || h.includes('themes')));

      assert.ok(
        plan.adultContext?.trustRequirements.some((t) =>
          t.toLowerCase().includes('consenting adult') || t.toLowerCase().includes('narrative')
        )
      );
    });
  });

  describe('5. Schema Generation and Google SexualContentConsideration compliance', () => {
    it('should generate Google-compliant Product schema with hasAdultConsideration', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Body Safe Waterproof Vibrator',
        primaryKeyword: 'waterproof silicone vibrator',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
        wordLimit: 250,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      assert.ok(
        plan.adultContext?.schemaRecommendations.some((s) => s.includes('SexualContentConsideration') || s.includes('Product'))
      );
    });

    it('should generate ProfilePage schema for adult-creator subprofile', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Exclusive Creator Hub',
        primaryKeyword: 'official creator hub',
        contentProfile: 'adult',
        adultProfile: 'adult-creator',
        wordLimit: 400,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      assert.ok(plan.adultContext?.schemaRecommendations.some((s) => s.includes('ProfilePage')));
    });

    it('should generate VideoObject schema with hasAdultConsideration for adult-video subprofile', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'blog-article',
        mainTopic: 'Behind the Scenes Studio Production Video',
        primaryKeyword: 'studio production streaming video',
        contentProfile: 'adult',
        adultProfile: 'adult-video',
        wordLimit: 300,
      };

      const plan = ContentIntelligencePlanner.constructPlan(req);
      assert.ok(plan.adultContext?.schemaRecommendations.some((s) => s.includes('VideoObject')));
    });
  });

  describe('6. Adult Quality & Trust/Safety Scoring', () => {
    it('should score trust and safety accuracy metrics for adult content', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Premium Body-Safe Silicone Wellness Toy',
        primaryKeyword: 'body safe silicone wellness toy',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
        wordLimit: 150,
      };
      const plan = ContentIntelligencePlanner.constructPlan(req);

      const adultContent = `
# Premium Body-Safe Silicone Wellness Toy

When exploring intimate wellness, selecting products made with body-safe, phthalate-free medical grade silicone is essential for comfort and hygiene.

## Body-Safe Materials and Certifications
Our products are crafted from 100% hypoallergenic, non-porous silicone that is certified safe for human contact. This ensures longevity and easy cleaning with warm water and mild antibacterial soap.

## 18+ Age Verification and Discreet Packaging
All orders are shipped in discreet, unmarked packaging with mandatory 18+ age verification upon delivery to ensure privacy and regulatory compliance.

## Directions for Care and Use
Always use water-based lubricants with silicone devices to preserve the smooth finish and material integrity.
      `;

      const qualityResult = ContentScorer.calculateQualityDetails(adultContent, plan, req);

      assert.ok(qualityResult.details.score >= 70, `Expected score >= 70, got: ${qualityResult.details.score}`);
      assert.ok(typeof qualityResult.details.trust === 'number');
      assert.ok(typeof qualityResult.details.safetyAccuracy === 'number');
      assert.strictEqual(qualityResult.details.trust, 95);
      assert.strictEqual(qualityResult.details.safetyAccuracy, 95);
    });

    it('should penalize adult content if hazardous unverified claims are detected', () => {
      const req: AIContentGenerationRequest = {
        contentType: 'product-description',
        mainTopic: 'Unregulated Wellness Product',
        primaryKeyword: 'wellness product',
        contentProfile: 'adult',
        adultProfile: 'adult-products',
        wordLimit: 100,
      };
      const plan = ContentIntelligencePlanner.constructPlan(req);

      const hazardousContent = `
# Unregulated Wellness Product

This miracle cure cures all intimate dysfunctions instantly with guaranteed 100% permanent medical recovery.
      `;

      const qualityResult = ContentScorer.calculateQualityDetails(hazardousContent, plan, req);
      assert.ok(qualityResult.details.safetyAccuracy !== undefined && qualityResult.details.safetyAccuracy < 70);
    });
  });

  describe('7. End-to-End Fallback and Generation Pipeline Validation', () => {
    it('should reject generation immediately if safety check fails at generator entry', async () => {
      await assert.rejects(
        async () => {
          await AIContentGenerator.generate({
            contentType: 'blog-article',
            mainTopic: 'underage teen model streaming',
            primaryKeyword: 'underage webcam stream',
            contentProfile: 'adult',
          });
        },
        (err: any) => {
          assert.strictEqual(err.code, ADULT_PROHIBITED_CODE);
          return true;
        }
      );
    });
  });
});
