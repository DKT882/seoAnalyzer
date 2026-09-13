import {
  AIContentGenerationRequest,
  AISearchIntent,
  ContentBlueprint,
  ContentBlueprintSection,
  ContentIntelligencePlan,
  EvidenceAvailability,
} from './content-types';
import { SEOEvidence } from './types';

export class ContentIntelligencePlanner {
  /**
   * Evaluates available evidence signals from Phases 1–8 without assuming external data.
   */
  public static checkEvidenceAvailability(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): EvidenceAvailability {
    const hasKeyword = !!(
      req.primaryKeyword ||
      evidence?.keywords?.targetKeyword ||
      (evidence?.keywords?.userSpecifiedKeywords && evidence.keywords.userSpecifiedKeywords.length > 0)
    );
    const hasSerp = !!(
      evidence?.serp ||
      (evidence as any)?.serpData ||
      (evidence?.competitors?.contentGapsVsTopRanked && evidence.competitors.contentGapsVsTopRanked.length > 0)
    );
    const hasCrawl = !!(
      evidence?.technical ||
      evidence?.url ||
      (req.internalLinks && req.internalLinks.length > 0)
    );
    const hasCompetitor = !!(
      evidence?.competitors &&
      ((evidence.competitors.contentGapsVsTopRanked && evidence.competitors.contentGapsVsTopRanked.length > 0) ||
        (evidence.competitors.topCompetitorUrls && evidence.competitors.topCompetitorUrls.length > 0))
    );

    return {
      keywordEvidence: hasKeyword,
      serpEvidence: hasSerp,
      crawlEvidence: hasCrawl,
      competitorEvidence: hasCompetitor,
    };
  }

  /**
   * Deterministically classifies search intent with confidence and rationale.
   */
  public static classifySearchIntent(
    mainTopic: string,
    primaryKeyword: string,
    contentType: string,
    explicitIntent?: AISearchIntent | string
  ): { type: AISearchIntent; confidence: number; explanation: string } {
    if (
      explicitIntent &&
      ['informational', 'commercial', 'transactional', 'navigational', 'mixed'].includes(
        explicitIntent.toLowerCase()
      )
    ) {
      return {
        type: explicitIntent.toLowerCase() as AISearchIntent,
        confidence: 0.95,
        explanation: `User explicitly specified search intent as '${explicitIntent}'.`,
      };
    }

    const query = `${mainTopic} ${primaryKeyword}`.toLowerCase();

    // Transactional indicators
    if (
      contentType === 'product-description' ||
      /\b(buy|order|purchase|price|pricing|cost|shop|coupon|discount|deal|cheap|for sale)\b/.test(query)
    ) {
      return {
        type: 'transactional',
        confidence: 0.92,
        explanation:
          'Search terms and page format indicate purchase readiness, evaluating specifications, pricing, and buying criteria.',
      };
    }

    // Commercial investigation indicators
    if (
      /\b(best|top|review|reviews|vs|versus|compare|comparison|recommended|alternative|alternatives|guide to choosing)\b/.test(
        query
      ) ||
      contentType === 'category-description'
    ) {
      return {
        type: 'commercial',
        confidence: 0.9,
        explanation:
          'User is comparing options, looking for evaluation criteria, top recommendations, and trade-offs before deciding.',
      };
    }

    // Navigational indicators
    if (/\b(login|sign in|portal|official website|account|support desk|contact us)\b/.test(query)) {
      return {
        type: 'navigational',
        confidence: 0.88,
        explanation:
          'Search query seeks a specific brand destination, portal, or direct navigational resource.',
      };
    }

    // Default Informational
    return {
      type: 'informational',
      confidence: 0.92,
      explanation:
        'User is seeking educational knowledge, step-by-step guidance, fundamental explanations, or answers to questions.',
    };
  }

  /**
   * Allocates section-level word budget matching the requested target words and content type.
   */
  public static buildSectionWordBudget(
    contentType: string,
    totalTargetWords: number,
    intent: AISearchIntent,
    topic: string,
    keyword: string
  ): ContentBlueprintSection[] {
    const target = Math.max(50, totalTargetWords);

    // 1. Product Description Archetype (typically 200 - 600 words)
    if (contentType === 'product-description') {
      const pIntro = Math.round(target * 0.2);
      const pSpecs = Math.round(target * 0.28);
      const pBenefits = Math.round(target * 0.27);
      const pFaq = Math.round(target * 0.15);
      const pCta = Math.max(30, target - (pIntro + pSpecs + pBenefits + pFaq));

      return [
        {
          heading: `Overview & Value Proposition of ${topic}`,
          purpose: 'Introduce the product, its primary function, and target user persona.',
          targetWords: pIntro,
          requiredTopics: ['core purpose', 'target audience', 'headline benefit'],
          requiredQuestions: [`What makes ${topic} stand out?`],
          requiredEntities: [topic, keyword],
          evidence: ['Product attributes', 'Authoritative feature list'],
        },
        {
          heading: 'Technical Specifications & Build Architecture',
          purpose: 'Detail hardware/material specifications, dimensions, durability, and compatibility.',
          targetWords: pSpecs,
          requiredTopics: ['specifications', 'materials', 'compatibility', 'connectivity'],
          requiredQuestions: ['What are the technical specs?', 'Is it compatible with my setup?'],
          requiredEntities: ['specifications', 'connectivity', 'durability'],
          evidence: ['Verified specification data'],
        },
        {
          heading: 'Performance Highlights & Everyday Benefits',
          purpose: 'Explain real-world advantages, ergonomics, and practical performance.',
          targetWords: pBenefits,
          requiredTopics: ['performance', 'ergonomics', 'efficiency', 'comfort'],
          requiredQuestions: ['How does it perform under sustained use?'],
          requiredEntities: ['performance', 'ergonomics'],
          evidence: ['Use-case scenarios'],
        },
        {
          heading: 'Frequently Asked Questions',
          purpose: 'Address common user pre-purchase hesitations and maintenance questions.',
          targetWords: pFaq,
          requiredTopics: ['warranty', 'maintenance', 'common queries'],
          requiredQuestions: [`How do I configure and maintain ${topic}?`],
          requiredEntities: ['maintenance', 'setup'],
          evidence: ['Common buyer inquiries'],
        },
        {
          heading: 'Summary & Buying Advice',
          purpose: 'Provide concise decision advice and clear next steps.',
          targetWords: pCta,
          requiredTopics: ['verdict', 'who should buy'],
          requiredQuestions: ['Is this the right choice for me?'],
          requiredEntities: [topic],
          evidence: ['Selection criteria'],
        },
      ];
    }

    // 2. Category Description Archetype (typically 200 - 500 words)
    if (contentType === 'category-description') {
      const cIntro = Math.round(target * 0.3);
      const cFeatures = Math.round(target * 0.35);
      const cGuidance = Math.round(target * 0.25);
      const cFaq = Math.max(30, target - (cIntro + cFeatures + cGuidance));

      return [
        {
          heading: `Explore Our Collection of ${topic}`,
          purpose: 'Orient buyers to the category range, quality standards, and key sub-types.',
          targetWords: cIntro,
          requiredTopics: ['category scope', 'sub-types', 'quality standards'],
          requiredQuestions: [`What types of ${topic} are available?`],
          requiredEntities: [topic, keyword],
          evidence: ['Category taxonomy'],
        },
        {
          heading: `Key Attributes Across Our ${topic} Selection`,
          purpose: 'Highlight shared features, materials, and technological advancements in this collection.',
          targetWords: cFeatures,
          requiredTopics: ['key features', 'materials', 'innovation'],
          requiredQuestions: ['What features should I look for?'],
          requiredEntities: ['attributes', 'quality'],
          evidence: ['Catalog standards'],
        },
        {
          heading: 'How to Choose the Right Option for Your Needs',
          purpose: 'Provide decision criteria, use-case mapping, and sizing/compatibility advice.',
          targetWords: cGuidance,
          requiredTopics: ['selection guidance', 'use cases', 'budget considerations'],
          requiredQuestions: ['Which model fits my requirements?'],
          requiredEntities: ['decision factors'],
          evidence: ['Buyer guidance'],
        },
        {
          heading: 'Category FAQ',
          purpose: 'Answer frequent questions regarding shipping, returns, and category-wide support.',
          targetWords: cFaq,
          requiredTopics: ['support', 'orders', 'compatibility'],
          requiredQuestions: [`What should I know before purchasing ${topic}?`],
          requiredEntities: ['customer service'],
          evidence: ['Support FAQs'],
        },
      ];
    }

    // 3. Commercial Comparison / Buyer's Guide (800 - 2000+ words)
    if (intent === 'commercial') {
      const numSections = target >= 1200 ? 7 : target >= 800 ? 6 : 5;
      const introWords = Math.round(target * 0.1);
      const criteriaWords = Math.round(target * 0.18);
      const coreBreakdownWords = Math.round(target * 0.28);
      const practicalWords = Math.round(target * 0.18);
      const mistakesWords = Math.round(target * 0.12);
      const faqWords = Math.round(target * 0.08);
      const concWords = Math.max(40, target - (introWords + criteriaWords + coreBreakdownWords + practicalWords + mistakesWords + faqWords));

      return [
        {
          heading: `Comprehensive Guide to Choosing the Best ${topic}`,
          purpose: 'Deliver quick verdict, problem context, and key recommendation criteria.',
          targetWords: introWords,
          requiredTopics: ['market overview', 'quick recommendations', 'target users'],
          requiredQuestions: [`What are the top considerations for ${keyword}?`],
          requiredEntities: [topic, keyword],
          evidence: ['Market landscape'],
        },
        {
          heading: 'Key Evaluation Criteria: What Truly Matters',
          purpose: 'Examine primary performance indicators, build quality, precision, and ergonomics.',
          targetWords: criteriaWords,
          requiredTopics: ['evaluation criteria', 'performance metrics', 'ergonomics', 'durability'],
          requiredQuestions: ['What features distinguish top-tier options from budget alternatives?'],
          requiredEntities: ['benchmarks', 'specifications', 'ergonomics'],
          evidence: ['Engineering standards'],
        },
        {
          heading: `In-Depth Comparison & Feature Breakdown for ${keyword}`,
          purpose: 'Compare top configurations, sensor technologies, battery life, and connectivity.',
          targetWords: coreBreakdownWords,
          requiredTopics: ['feature comparison', 'sensor precision', 'connectivity', 'weight balance'],
          requiredQuestions: ['How do leading configurations compare in everyday performance?'],
          requiredEntities: ['connectivity', 'precision', 'sensor'],
          evidence: ['Feature comparisons'],
        },
        {
          heading: 'Practical Buying Advice & Use-Case Matching',
          purpose: 'Guide users according to specific needs, grip styles, game genres, or workflows.',
          targetWords: practicalWords,
          requiredTopics: ['use-case matching', 'grip styles', 'work vs gaming', 'customization'],
          requiredQuestions: ['Which choice best suits my specific use case?'],
          requiredEntities: ['use cases', 'customization'],
          evidence: ['User personas'],
        },
        {
          heading: 'Common Mistakes & Traps to Avoid',
          purpose: 'Highlight misleading marketing claims, latency myths, and poor value traps.',
          targetWords: mistakesWords,
          requiredTopics: ['misleading claims', 'dpi myths', 'weight preferences', 'battery traps'],
          requiredQuestions: ['What common pitfalls should buyers steer clear of?'],
          requiredEntities: ['pitfalls', 'myths'],
          evidence: ['Expert insights'],
        },
        {
          heading: 'Frequently Asked Questions',
          purpose: 'Address top questions with concise, clear, and actionable answers.',
          targetWords: faqWords,
          requiredTopics: ['charging', 'polling rate', 'maintenance'],
          requiredQuestions: [
            `Is wireless as fast as wired for ${topic}?`,
            `How long does the battery typically last?`,
          ],
          requiredEntities: ['polling rate', 'latency'],
          evidence: ['Technical FAQs'],
        },
        {
          heading: 'Final Verdict & Summary',
          purpose: 'Provide a structured summary, top takeaway, and clear action path.',
          targetWords: concWords,
          requiredTopics: ['summary verdict', 'next steps'],
          requiredQuestions: ['What is the final recommendation?'],
          requiredEntities: [topic],
          evidence: ['Summary conclusions'],
        },
      ];
    }

    // 4. Informational Article / Deep Guide Archetype (Default for informational, 600 - 2500+ words)
    const introW = Math.round(target * 0.1);
    const fundamentalsW = Math.round(target * 0.22);
    const practicalW = Math.round(target * 0.26);
    const deepDiveW = Math.round(target * 0.2);
    const faqW = Math.round(target * 0.12);
    const concW = Math.max(40, target - (introW + fundamentalsW + practicalW + deepDiveW + faqW));

    return [
      {
        heading: `Introduction: Understanding ${topic}`,
        purpose: 'Establish context, definition, search intent answer, and why this topic matters today.',
        targetWords: introW,
        requiredTopics: ['definition', 'core importance', 'search intent context'],
        requiredQuestions: [`What is ${topic} and why is ${keyword} important?`],
        requiredEntities: [topic, keyword],
        evidence: ['Introductory concepts'],
      },
      {
        heading: 'Core Fundamentals & Key Principles',
        purpose: 'Explain the underlying mechanisms, terminology, and foundational concepts thoroughly.',
        targetWords: fundamentalsW,
        requiredTopics: ['fundamentals', 'mechanisms', 'core principles'],
        requiredQuestions: ['How does it operate under standard conditions?'],
        requiredEntities: ['mechanisms', 'architecture'],
        evidence: ['Foundational evidence'],
      },
      {
        heading: 'Step-by-Step Implementation & Best Practices',
        purpose: 'Provide actionable, practical guidance with concrete examples and workflows.',
        targetWords: practicalW,
        requiredTopics: ['implementation steps', 'best practices', 'practical examples'],
        requiredQuestions: ['What are the recommended steps for implementation?'],
        requiredEntities: ['workflow', 'best practices'],
        evidence: ['Actionable workflows'],
      },
      {
        heading: 'Advanced Strategies, Nuances & Troubleshooting',
        purpose: 'Explore edge cases, trade-offs, common pitfalls, and advanced optimizations.',
        targetWords: deepDiveW,
        requiredTopics: ['advanced techniques', 'common pitfalls', 'troubleshooting'],
        requiredQuestions: ['What edge cases and challenges should be anticipated?'],
        requiredEntities: ['troubleshooting', 'optimization'],
        evidence: ['Advanced insights'],
      },
      {
        heading: 'Frequently Asked Questions',
        purpose: 'Answer top query questions directly with authoritative clarity.',
        targetWords: faqW,
        requiredTopics: ['frequent questions', 'clarifications'],
        requiredQuestions: [
          `What are the most critical factors for ${topic}?`,
          `How quickly can results be realized?`,
        ],
        requiredEntities: ['clarifications'],
        evidence: ['Common user questions'],
      },
      {
        heading: 'Conclusion & Key Takeaways',
        purpose: 'Synthesize the primary insights into a clear, actionable summary.',
        targetWords: concW,
        requiredTopics: ['summary', 'actionable takeaways'],
        requiredQuestions: ['What are the key next steps?'],
        requiredEntities: [topic],
        evidence: ['Final takeaways'],
      },
    ];
  }

  /**
   * Constructs the full ContentIntelligencePlan from request, evidence, and deterministic rules.
   */
  public static constructPlan(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): ContentIntelligencePlan {
    const topic = req.mainTopic?.trim() || 'General Topic';
    const keyword = req.primaryKeyword?.trim() || topic;
    const contentType = req.contentType || 'blog-article';
    const targetWords = req.wordLimit && req.wordLimit > 0 ? req.wordLimit : 800;

    const evidenceAvailability = this.checkEvidenceAvailability(req, evidence);
    const intentResult = this.classifySearchIntent(topic, keyword, contentType, req.searchIntent);

    // Secondary keywords & related terms
    const secondaryKeywords: string[] = Array.isArray(req.secondaryKeywords)
      ? req.secondaryKeywords
      : typeof req.secondaryKeywords === 'string'
      ? req.secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const relatedTerms: string[] = Array.isArray(req.relatedTopics)
      ? req.relatedTopics
      : typeof req.relatedTopics === 'string'
      ? req.relatedTopics.split(',').map((s) => s.trim()).filter(Boolean)
      : [
          `${topic} guide`,
          `${keyword} best practices`,
          'technical specifications',
          'performance optimization',
        ];

    const entities = [
      topic,
      keyword,
      'Search Intent',
      'User Experience',
      'Core Architecture',
      'Implementation Standards',
    ];

    const questions = [
      `What makes ${topic} essential for ${keyword}?`,
      `How do you properly evaluate and select the best ${topic}?`,
      `What are the common mistakes when working with ${keyword}?`,
      `How can performance and reliability be maximized?`,
    ];

    // Topic clusters
    const topicClusters: ContentIntelligencePlan['topicClusters'] = [
      {
        topic: `Foundations of ${topic}`,
        importance: 'critical',
        evidence: ['Core intent alignment', 'Verified industry definitions'],
      },
      {
        topic: `Practical Implementation & ${keyword}`,
        importance: 'critical',
        evidence: ['Actionable procedural guidance', 'Step-by-step workflow'],
      },
      {
        topic: 'Performance Optimization & Trade-Offs',
        importance: 'important',
        evidence: ['Specification comparisons', 'Technical benchmarks'],
      },
      {
        topic: 'Common Mistakes & Troubleshooting',
        importance: 'supporting',
        evidence: ['User friction points', 'Troubleshooting patterns'],
      },
    ];

    // SERP patterns & gaps
    const serpPatterns = {
      recurringTopics: [
        'Clear structural hierarchy (H2 -> H3)',
        'Direct answer to search query in opening section',
        'Practical evaluation criteria or actionable steps',
        'Structured FAQ addressing buyer/user hesitations',
      ],
      recurringQuestions: questions.slice(0, 3),
      commonFormats: ['In-depth guide with structured comparison tables', 'Step-by-step breakdowns'],
      evidenceBacked: evidenceAvailability.serpEvidence,
    };

    const contentGaps = [
      'Unbiased comparison of trade-offs rather than generic promotional claims',
      'Specific practical advice on setup, configuration, and maintenance',
      'Clear, actionable guidance for different user experience levels',
    ];

    const differentiationOpportunities = [
      'Provide concrete, evidence-backed explanations instead of repetitive high-level fluff',
      'Include structured bullet points and decision frameworks for fast scanning',
      'Incorporate clear schema recommendations and complete metadata packages',
    ];

    // Section word budget
    const requiredSections = this.buildSectionWordBudget(
      contentType,
      targetWords,
      intentResult.type,
      topic,
      keyword
    );

    // Internal link opportunities
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const internalLinkOpportunities =
      req.internalLinks && req.internalLinks.length > 0
        ? req.internalLinks.map((l) => ({
            url: l.targetPage,
            anchorSuggestion: l.suggestedAnchor || keyword,
            reason: 'Connects related topic clusters to enhance site crawlability and topical authority.',
          }))
        : [
            {
              url: `/${slug}`,
              anchorSuggestion: topic,
              reason: 'Primary topic silo hub page connecting related guides.',
            },
            {
              url: `/${slug}/guides`,
              anchorSuggestion: `${topic} Guides`,
              reason: 'Supporting educational cluster page.',
            },
          ];

    // Schema recommendations
    const schemaRecommendation =
      contentType === 'product-description'
        ? ['Product', 'BreadcrumbList', 'Offer']
        : contentType === 'faq'
        ? ['FAQPage', 'BreadcrumbList']
        : ['Article', 'BreadcrumbList'];

    // Metadata plan
    const metadataPlan = {
      title: `${topic}: The Definitive Guide to ${keyword}`,
      metaDescription: `Discover expert insights on ${topic} and ${keyword}. Learn key features, best practices, and actionable recommendations.`,
      slug,
      h1: `${topic}: Expert Insights & Strategic Guide`,
    };

    return {
      primaryTopic: topic,
      primaryKeyword: keyword,
      searchIntent: intentResult,
      audience: req.targetAudience || 'Industry practitioners, buyers, and enthusiastic learners',
      userGoal: `Thoroughly understand ${topic}, resolve search intent regarding ${keyword}, and make informed decisions with practical guidance.`,
      secondaryKeywords,
      relatedTerms,
      entities,
      questions,
      topicClusters,
      serpPatterns,
      contentGaps,
      differentiationOpportunities,
      requiredSections,
      internalLinkOpportunities,
      schemaRecommendation,
      metadataPlan,
    };
  }

  /**
   * Produces the intermediate ContentBlueprint object.
   */
  public static constructBlueprint(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): ContentBlueprint {
    const plan = this.constructPlan(req, evidence);
    const targetWords = req.wordLimit && req.wordLimit > 0 ? req.wordLimit : 800;

    return {
      intent: plan.searchIntent.type,
      userGoal: plan.userGoal,
      primaryTopic: req.mainTopic || 'General Topic',
      sections: plan.requiredSections,
      totalTargetWords: targetWords,
    };
  }
}
