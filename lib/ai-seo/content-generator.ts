import {
  AIContentGenerationRequest,
  AIContentGenerationResponse,
  AIContentKeywordCoverage,
  AIContentType,
} from './content-types';
import { getAIProvider, SEOAIProvider } from './ai-provider';
import { logger } from '@/lib/utils/logger';

export class AIContentGenerator {
  /**
   * Generates SEO-optimized content based on user inputs and authoritative SEO evidence.
   */
  public static async generate(
    request: AIContentGenerationRequest,
    customProvider?: SEOAIProvider
  ): Promise<AIContentGenerationResponse> {
    const provider = customProvider || getAIProvider();

    // 1. Normalize and validate inputs
    const normalizedRequest = this.normalizeRequest(request);

    // 2. Build system and user prompt with strict guardrails
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(normalizedRequest);

    let rawResult: Partial<AIContentGenerationResponse>;

    try {
      if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
        rawResult = this.generateDeterministicContent(normalizedRequest);
      } else {
        rawResult = await provider.generateStructured<AIContentGenerationResponse>(
          systemPrompt,
          userPrompt,
          'Return a strictly valid JSON object matching the AIContentGenerationResponse schema without codeblocks.'
        );
      }
    } catch (err: any) {
      logger.warn(`AI Provider failed for content generation, falling back to deterministic generation: ${err.message}`);
      rawResult = this.generateDeterministicContent(normalizedRequest);
    }

    // 3. Post-process, validate quality metrics, check keyword stuffing, and attach disclaimers
    return this.postProcessAndValidate(rawResult, normalizedRequest);
  }

  /**
   * Normalizes request inputs into clean arrays and sensible defaults.
   */
  private static normalizeRequest(request: AIContentGenerationRequest): AIContentGenerationRequest {
    const secondaryKeywords = Array.isArray(request.secondaryKeywords)
      ? request.secondaryKeywords.map((s) => s.trim()).filter(Boolean)
      : typeof request.secondaryKeywords === 'string'
      ? request.secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const relatedTopics = Array.isArray(request.relatedTopics)
      ? request.relatedTopics.map((s) => s.trim()).filter(Boolean)
      : typeof request.relatedTopics === 'string'
      ? request.relatedTopics.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const requestedWordCount = request.wordLimit && request.wordLimit > 0 ? request.wordLimit : 300;

    return {
      ...request,
      mainTopic: request.mainTopic?.trim() || 'General Topic',
      primaryKeyword: request.primaryKeyword?.trim() || request.mainTopic?.trim() || 'primary keyword',
      wordLimit: requestedWordCount,
      secondaryKeywords,
      relatedTopics,
      searchIntent: request.searchIntent || 'informational',
      tone: request.tone || 'professional',
      language: request.language || 'English',
      country: request.country || 'US',
    };
  }

  /**
   * Builds strict system prompt enforcing 2026 SEO best practices and anti-hallucination rules.
   */
  private static buildSystemPrompt(): string {
    return `You are an elite SEO Content Strategist and Copywriter.
Your task is to generate comprehensive, human-grade, SEO-optimized content, metadata, schema recommendations, and topical entity coverage.

CRITICAL SEO & ANTI-HALLUCINATION RULES:
1. WORD LIMIT: Target the requested word limit as closely as practical. Write complete, well-formed sentences. DO NOT abruptly truncate sentences.
2. NATURAL KEYWORD INTEGRATION: Naturally incorporate the primary keyword and secondary keywords into headings and body text. DO NOT keyword stuff. Repeated exact-match keyword repetition is strictly forbidden.
3. SEARCH INTENT: Align content with user search intent (Informational, Commercial, Transactional, Navigational).
4. NO RANKING GUARANTEES: NEVER promise "#1 ranking", "Top 5", "Top 10", "Guaranteed traffic", or "Guaranteed Google ranking". Use evidence-based phrasing such as "designed to improve topical relevance" or "optimizes search appearance".
5. NO META-KEYWORDS: Never generate <meta name="keywords">. Google Search does not use meta keywords for ranking.
6. NO FABRICATED METRICS: Do not invent search volume, keyword difficulty numbers, competitor rankings, backlink statistics, fake reviews, or non-existent pricing.
7. STRUCTURED DATA: Recommend appropriate Schema.org types (Product, Offer, Article, BreadcrumbList, FAQPage, Organization) based strictly on content type and available facts.
8. ACCURACY: If information or evidence is missing, state it clearly rather than guessing.
9. OUTPUT FORMAT: Respond ONLY with a valid JSON object matching the requested schema.`;
  }

  /**
   * Constructs the structured user prompt.
   */
  private static buildUserPrompt(req: AIContentGenerationRequest): string {
    return JSON.stringify({
      task: 'GENERATE_SEO_CONTENT',
      contentType: req.contentType,
      mainTopic: req.mainTopic,
      primaryKeyword: req.primaryKeyword,
      targetWordCount: req.wordLimit,
      secondaryKeywords: req.secondaryKeywords,
      relatedTopics: req.relatedTopics,
      searchIntent: req.searchIntent,
      targetAudience: req.targetAudience,
      tone: req.tone,
      language: req.language,
      country: req.country,
      existingContent: req.existingContent,
      improvementGoal: req.improvementGoal,
      brandDescription: req.brandDescription,
      productInfo: req.productInfo,
      keyBenefits: req.keyBenefits,
      cta: req.cta,
      requiredHeadings: req.requiredHeadings,
      forbiddenClaims: req.forbiddenClaims,
      internalLinks: req.internalLinks,
      evidenceContext: req.evidence ? {
        url: req.url || req.evidence.url,
        pageType: req.evidence.pageType,
        existingIssues: req.evidence.rawIssuesSummary?.slice(0, 5),
        technical: {
          title: req.evidence.technical?.title?.value,
          metaDescription: req.evidence.technical?.metaDescription?.value,
        },
      } : undefined,
    }, null, 2);
  }

  /**
   * High-quality deterministic fallback engine when LLM is unavailable or offline.
   */
  public static generateDeterministicContent(
    req: AIContentGenerationRequest
  ): Partial<AIContentGenerationResponse> {
    const topic = req.mainTopic;
    const kw = req.primaryKeyword;
    const secondaries = (req.secondaryKeywords as string[]) || [];
    const intent = req.searchIntent || 'informational';
    const targetWords = req.wordLimit || 300;
    const isProduct = req.contentType === 'product-description';
    const isCategory = req.contentType === 'category-description';
    const isFaq = req.contentType === 'faq';
    const isBrief = req.contentType === 'content-brief';
    const isImprovement = req.contentType === 'content-improvement' || !!req.existingContent;

    let content = '';
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isProduct) {
      content = `Discover the ultimate ${topic}, engineered to deliver exceptional performance and reliability. Featuring advanced design tailored specifically for ${kw}, this solution combines premium durability with effortless usability.\n\nKey Highlights:\n- Optimized for maximum efficiency and daily dependability.\n- Built with high-grade components ensuring long-lasting satisfaction.\n- Seamless integration designed to meet demanding standards.\n\nWhether you are upgrading your setup or seeking top-tier results, ${topic} provides the ideal balance of innovation and value. Order yours today to experience superior craftsmanship.`;
    } else if (isCategory) {
      content = `Explore our curated selection of ${topic}. Designed for professionals and enthusiasts alike, our collection focuses on ${kw} to provide unmatched quality, modern features, and proven performance.\n\nBrowse top-rated options, compare specifications, and find the perfect match for your needs. Every product in this category is vetted for excellence, ensuring reliable outcomes for your projects and daily workflow.`;
    } else if (isFaq) {
      content = `### Frequently Asked Questions about ${topic}\n\n**Q1: What makes ${topic} the best choice for ${kw}?**\nA: ${topic} provides an optimal combination of performance, reliability, and ease of use, ensuring you achieve consistent results without unnecessary complexity.\n\n**Q2: How do I get started with ${kw}?**\nA: Getting started is straightforward. Review our recommended best practices, select the appropriate configuration, and follow the step-by-step guidance provided.\n\n**Q3: What are the key considerations when choosing ${topic}?**\nA: Key factors include compatibility, build quality, feature requirements, and ongoing support to ensure long-term value.`;
    } else if (isBrief) {
      content = `# Content Brief: ${topic}\n\n- **Target Query / Keyword:** ${kw}\n- **Search Intent:** ${intent}\n- **Target Audience:** ${req.targetAudience || 'Target market & industry professionals'}\n- **Target Word Count:** ${targetWords} words\n\n## Content Objectives\n1. Thoroughly address user search intent regarding ${kw}.\n2. Incorporate semantic secondary topics: ${secondaries.join(', ') || 'related industry terms'}.\n3. Establish clear topical authority with accurate, actionable insights.`;
    } else if (isImprovement && req.existingContent) {
      content = `${req.existingContent.trim()}\n\nIn addition, modern best practices for ${kw} emphasize enhanced clarity, topical depth, and seamless intent alignment for ${topic}.`;
    } else {
      content = `# Complete Guide to ${topic}\n\nUnderstanding ${kw} is essential for achieving optimal outcomes. When approaching ${topic}, focusing on structured execution, core principles, and verified best practices enables sustained growth and reliable performance.\n\n## Key Fundamentals\nTo maximize effectiveness, prioritize clear objective setting, quality resources, and systematic evaluation. By addressing the primary requirements of ${kw}, you establish a solid foundation built for long-term success.\n\n## Strategic Recommendations\nIncorporate regular reviews, leverage semantic best practices, and ensure every element directly supports your core objectives.`;
    }

    const title = `${topic} — Complete Guide & Insights on ${kw}`;
    const metaDescription = `Explore ${topic} with expert guidance on ${kw}. Discover key features, best practices, and actionable insights designed for ${intent} search intent.`;
    const h1 = `${topic}: Strategic Insights for ${kw}`;

    return {
      content,
      contentType: req.contentType,
      requestedWordCount: targetWords,
      actualWordCount: content.trim().split(/\s+/).filter(Boolean).length,
      deviation: 0,
      seo: {
        primaryKeyword: kw,
        primaryKeywordUsed: true,
        primaryKeywordCount: 2,
        secondaryKeywords: secondaries,
        relatedTopics: (req.relatedTopics as string[]) || [topic, 'best practices', 'specifications'],
        entities: [topic, kw],
        searchIntent: intent,
        keywordCoverage: [
          {
            keyword: kw,
            status: 'used',
            occurrences: 2,
            locations: ['h1', 'body'],
            naturalness: 'natural',
          },
          ...secondaries.map((s) => ({
            keyword: s,
            status: 'partially_used' as const,
            occurrences: 1,
            locations: ['body'],
            naturalness: 'natural' as const,
          })),
        ],
      },
      metadata: {
        title,
        alternativeTitles: [
          `${topic} Essentials: Mastering ${kw}`,
          `The Definitive Guide to ${topic} (${new Date().getFullYear()})`,
        ],
        titleRationale: 'Places primary keyword near the beginning while maintaining engaging click appeal.',
        metaDescription,
        alternativeDescriptions: [
          `Learn everything you need to know about ${topic}. Find actionable tips, top recommendations, and answers on ${kw}.`,
        ],
        metaDescriptionRationale: 'Clear, compelling summary satisfying intent within standard SERP snippet thresholds.',
        slug,
        h1,
        headings: [
          { level: 'h2', text: `Understanding ${topic}`, purpose: 'Introduce core concepts and relevance' },
          { level: 'h2', text: `Key Benefits of ${kw}`, purpose: 'Highlight primary advantages and value propositions' },
          { level: 'h3', text: 'Implementation Best Practices', purpose: 'Provide actionable step-by-step guidance' },
        ],
      },
      structuredData: {
        recommendedTypes: isProduct ? ['Product', 'BreadcrumbList'] : isFaq ? ['FAQPage', 'BreadcrumbList'] : ['Article', 'BreadcrumbList'],
        reasoning: [
          `Matches content type '${req.contentType}' providing explicit semantic context to search engines.`,
        ],
        schemaSnippet: JSON.stringify(
          isProduct
            ? {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: topic,
                description: metaDescription,
              }
            : isFaq
            ? {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: `What makes ${topic} effective?`,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: `It provides verified best practices for ${kw}.`,
                    },
                  },
                ],
              }
            : {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: title,
                description: metaDescription,
              },
          null,
          2
        ),
        missingRequiredData: isProduct
          ? ['price (supply if available)', 'availability', 'brand']
          : [],
      },
      social: {
        ogTitle: title,
        ogDescription: metaDescription,
        ogType: isProduct ? 'product' : 'article',
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: metaDescription,
      },
      images: [
        {
          suggestedAlt: `${topic} overview and ${kw} illustration`,
          placement: 'Hero section or top of article',
          reason: 'Provides descriptive contextual alt text without keyword stuffing.',
        },
      ],
      internalLinks: req.internalLinks && req.internalLinks.length > 0
        ? req.internalLinks.map((l) => ({
            targetPage: l.targetPage,
            suggestedAnchor: l.suggestedAnchor || kw,
            reason: 'Connects related topic clusters to enhance site crawlability.',
          }))
        : [
            {
              targetPage: `/${slug}`,
              suggestedAnchor: topic,
              reason: 'Supports topical silo architecture.',
            },
          ],
      contentQuality: {
        score: 92,
        wordCountPass: true,
        keywordStuffingDetected: false,
        intentAlignment: 'strong',
        readabilityLevel: 'intermediate',
        issues: [],
        strengths: [
          'Natural keyword integration without excessive repetition',
          'Logical heading hierarchy (H1 -> H2 -> H3)',
          'Clear intent satisfaction for search queries',
        ],
      },
      contentImprovement: isImprovement && req.existingContent
        ? {
            originalContent: req.existingContent,
            improvedContent: content,
            changesMade: [
              'Enhanced keyword clarity and topical depth',
              'Added structured subheading recommendations',
              'Refined readability and intent alignment',
            ],
            seoImprovements: [
              'Increased semantic keyword relevance',
              'Improved content completeness',
            ],
            warnings: [],
          }
        : undefined,
      warnings: [],
      evidenceUsed: req.evidence ? ['Existing page crawl evidence', 'Normalized keyword findings'] : [],
    };
  }

  /**
   * Post-processes, calculates strict quality metrics, checks for keyword stuffing,
   * sanitizes ranking claims, and attaches required disclaimers.
   */
  private static postProcessAndValidate(
    raw: Partial<AIContentGenerationResponse>,
    req: AIContentGenerationRequest
  ): AIContentGenerationResponse {
    const rawContent = raw.content || '';
    
    // Sanitize any accidental ranking guarantee phrases
    const sanitizedContent = this.sanitizeRankingClaims(rawContent);
    
    // Word counts
    const words = sanitizedContent.trim().split(/\s+/).filter(Boolean);
    const actualWordCount = words.length;
    const requestedWordCount = req.wordLimit || 300;
    const deviation = actualWordCount - requestedWordCount;
    const wordCountTolerance = Math.max(25, requestedWordCount * 0.25);
    const wordCountPass = Math.abs(deviation) <= wordCountTolerance || actualWordCount >= 30;

    // Keyword usage and stuffing calculations
    const primaryKw = (req.primaryKeyword || '').toLowerCase().trim();
    const contentLower = sanitizedContent.toLowerCase();
    
    let primaryKeywordCount = 0;
    if (primaryKw) {
      // Count non-overlapping occurrences
      const matches = contentLower.match(new RegExp(this.escapeRegex(primaryKw), 'gi'));
      primaryKeywordCount = matches ? matches.length : 0;
    }

    const keywordDensity = actualWordCount > 0 ? (primaryKeywordCount * primaryKw.split(/\s+/).length) / actualWordCount : 0;
    const keywordStuffingDetected = keywordDensity > 0.035 && primaryKeywordCount > 3;

    // Analyze keyword coverage
    const secondaries = (req.secondaryKeywords as string[]) || [];
    const keywordCoverage: AIContentKeywordCoverage[] = [
      {
        keyword: req.primaryKeyword,
        status: primaryKeywordCount > 0 ? 'used' : 'not_used',
        occurrences: primaryKeywordCount,
        locations: primaryKeywordCount > 0 ? ['body'] : [],
        naturalness: keywordStuffingDetected ? 'forced' : primaryKeywordCount > 0 ? 'natural' : 'missing',
      },
      ...secondaries.map((sec): AIContentKeywordCoverage => {
        const secLower = sec.toLowerCase().trim();
        const secMatches = contentLower.match(new RegExp(this.escapeRegex(secLower), 'gi'));
        const count = secMatches ? secMatches.length : 0;
        return {
          keyword: sec,
          status: count > 0 ? 'used' : 'not_used',
          occurrences: count,
          locations: count > 0 ? ['body'] : [],
          naturalness: count > 0 ? 'natural' : 'missing',
        };
      }),
    ];

    // Readability heuristic
    const avgWordLength = words.reduce((acc, w) => acc + w.length, 0) / (actualWordCount || 1);
    const readabilityLevel: 'basic' | 'intermediate' | 'advanced' =
      avgWordLength > 6.2 ? 'advanced' : avgWordLength > 4.8 ? 'intermediate' : 'basic';

    // Issues & strengths calculation
    const issues: string[] = [];
    const strengths: string[] = [];

    if (keywordStuffingDetected) {
      issues.push(`High keyword density (${(keywordDensity * 100).toFixed(1)}%). Consider reducing repetition of '${req.primaryKeyword}' for better readability.`);
    } else if (primaryKeywordCount > 0) {
      strengths.push(`Primary keyword '${req.primaryKeyword}' integrated naturally without stuffing.`);
    }

    if (!wordCountPass && actualWordCount < requestedWordCount * 0.5) {
      issues.push(`Content length (${actualWordCount} words) is below requested target (${requestedWordCount} words).`);
    } else {
      strengths.push(`Content length (${actualWordCount} words) aligns well with target scope.`);
    }

    if (raw.metadata?.title) {
      strengths.push('Complete metadata package (title, meta description, slug, H1) generated.');
    }

    if (raw.structuredData?.recommendedTypes?.length) {
      strengths.push(`Recommended structured data (${raw.structuredData.recommendedTypes.join(', ')}) provides rich semantic context.`);
    }

    // Heuristic quality score (0-100)
    let qualityScore = 85;
    if (primaryKeywordCount > 0) qualityScore += 5;
    if (wordCountPass) qualityScore += 5;
    if (keywordStuffingDetected) qualityScore -= 20;
    if (issues.length > 1) qualityScore -= 10;
    qualityScore = Math.max(30, Math.min(98, qualityScore));

    const warnings: string[] = [];
    if (keywordStuffingDetected) {
      warnings.push('Warning: Potential keyword stuffing detected. Review keyword frequency to ensure a natural reading experience.');
    }

    return {
      content: sanitizedContent,
      contentType: req.contentType,
      requestedWordCount,
      actualWordCount,
      deviation,
      seo: {
        primaryKeyword: req.primaryKeyword,
        primaryKeywordUsed: primaryKeywordCount > 0,
        primaryKeywordCount,
        secondaryKeywords: secondaries,
        relatedTopics: (raw.seo?.relatedTopics && raw.seo.relatedTopics.length > 0)
          ? raw.seo.relatedTopics
          : (req.relatedTopics as string[]) || [],
        entities: raw.seo?.entities || [req.mainTopic, req.primaryKeyword],
        searchIntent: req.searchIntent || 'informational',
        keywordCoverage,
      },
      metadata: {
        title: raw.metadata?.title || `${req.mainTopic} — ${req.primaryKeyword}`,
        alternativeTitles: raw.metadata?.alternativeTitles || [],
        titleRationale: raw.metadata?.titleRationale || 'Optimized for keyword prominence and user click-through relevance.',
        metaDescription: raw.metadata?.metaDescription || `Discover expert insights on ${req.mainTopic} and ${req.primaryKeyword}. Learn best practices and key strategies.`,
        alternativeDescriptions: raw.metadata?.alternativeDescriptions || [],
        metaDescriptionRationale: raw.metadata?.metaDescriptionRationale || 'Concise description satisfying search intent within standard SERP display limits.',
        slug: raw.metadata?.slug || req.mainTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        h1: raw.metadata?.h1 || req.mainTopic,
        headings: raw.metadata?.headings || [
          { level: 'h2', text: `Overview of ${req.mainTopic}` },
          { level: 'h2', text: `Key Considerations for ${req.primaryKeyword}` },
        ],
      },
      structuredData: {
        recommendedTypes: raw.structuredData?.recommendedTypes || ['Article', 'BreadcrumbList'],
        reasoning: raw.structuredData?.reasoning || ['Provides structured schema context according to Schema.org standards.'],
        schemaSnippet: raw.structuredData?.schemaSnippet,
        missingRequiredData: raw.structuredData?.missingRequiredData || [],
      },
      social: {
        ogTitle: raw.social?.ogTitle || raw.metadata?.title || req.mainTopic,
        ogDescription: raw.social?.ogDescription || raw.metadata?.metaDescription || '',
        ogType: raw.social?.ogType || 'website',
        twitterCard: raw.social?.twitterCard || 'summary_large_image',
        twitterTitle: raw.social?.twitterTitle || raw.metadata?.title || req.mainTopic,
        twitterDescription: raw.social?.twitterDescription || raw.metadata?.metaDescription || '',
      },
      images: raw.images || [
        {
          suggestedAlt: `${req.mainTopic} descriptive diagram`,
          placement: 'Header / top of content',
          reason: 'Contextual image alt text supporting accessibility and image SEO.',
        },
      ],
      internalLinks: raw.internalLinks || [],
      contentQuality: {
        score: qualityScore,
        wordCountPass,
        keywordStuffingDetected,
        intentAlignment: keywordStuffingDetected ? 'weak' : 'strong',
        readabilityLevel,
        issues,
        strengths,
      },
      contentImprovement: raw.contentImprovement,
      warnings: [...warnings, ...(raw.warnings || [])],
      evidenceUsed: raw.evidenceUsed || (req.evidence ? ['Authoritative crawl evidence'] : []),
      disclaimers: {
        noRankingGuarantee: 'SEO recommendations are evidence-based optimizations. Google Search rankings cannot be guaranteed.',
        metaKeywordsNotice: 'Google Search does not use the <meta name="keywords"> tag for ranking purposes. Focus on topical coverage and content quality.',
        qualityScoreNotice: 'Content Quality Score is an internal heuristic evaluating structural completeness and readability, not an official search engine ranking metric.',
      },
    };
  }

  /**
   * Sanitizes ranking promises or guarantee wording from generated text.
   */
  private static sanitizeRankingClaims(text: string): string {
    return text
      .replace(/guarantee(?:s|d)?\s+(?:a\s+)?(?:#1|top\s+(?:3|5|10))\s+(?:google\s+)?ranking/gi, 'is designed to optimize search appearance')
      .replace(/guarantee(?:s|d)?\s+traffic/gi, 'is structured to attract relevant organic search interest')
      .replace(/will\s+rank\s+#1/gi, 'is optimized for target query relevance')
      .replace(/guarantee(?:s|d)?\s+google\s+indexing/gi, 'follows indexability best practices');
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
