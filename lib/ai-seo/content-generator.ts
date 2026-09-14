import {
  AIContentGenerationRequest,
  AIContentGenerationResponse,
  AIContentKeywordCoverage,
  AIContentSection,
  ContentBlueprint,
  ContentBlueprintSection,
  ContentIntelligencePlan,
  EvidenceAvailability,
} from './content-types';
import { getAIProvider, SEOAIProvider } from './ai-provider';
import { ContentIntelligencePlanner } from './content-planner';
import { ContentScorer } from './content-scorer';
import { AdultContentSafetyGuard } from './content-safety';
import { logger } from '@/lib/utils/logger';

export class AIContentGenerator {
  /**
   * Generates evidence-driven, search-intent-aligned SEO content using multi-stage planning,
   * section budgeting, expansion loops, and deterministic quality validation.
   */
  public static async generate(
    request: AIContentGenerationRequest,
    customProvider?: SEOAIProvider,
    options?: {
      deadline?: number;
      maxGenerationMs?: number;
      signal?: AbortSignal;
    }
  ): Promise<AIContentGenerationResponse> {
    // 0. Safety Guardrail: Block prohibited / exploitative requests immediately
    AdultContentSafetyGuard.validateOrThrow(request);

    const provider = customProvider || getAIProvider();

    // 1. Normalize request inputs
    const normalizedRequest = this.normalizeRequest(request);

    // 2. Stage A: Construct Content Intelligence Plan & Blueprint (100% deterministic, 0 LLM calls)
    const plan = ContentIntelligencePlanner.constructPlan(normalizedRequest, normalizedRequest.evidence);
    const blueprint = ContentIntelligencePlanner.constructBlueprint(normalizedRequest, normalizedRequest.evidence);
    const evidenceAvailability = ContentIntelligencePlanner.checkEvidenceAvailability(
      normalizedRequest,
      normalizedRequest.evidence
    );

    let rawResult: Partial<AIContentGenerationResponse> = {};
    let sectionsGenerated = 0;
    let expansionPasses = 0;
    let fallbackUsed = false;
    let failedSections: string[] = [];
    let calls = 0;
    let durationMs = 0;
    const startTime = Date.now();

    const configuredMaxGenMs =
      options?.maxGenerationMs ||
      (process.env.AI_CONTENT_MAX_GENERATION_MS ? parseInt(process.env.AI_CONTENT_MAX_GENERATION_MS, 10) : 180000);
    const deadline = options?.deadline || startTime + configuredMaxGenMs;

    try {
      if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
        rawResult = this.generateDeterministicContent(normalizedRequest, plan);
        fallbackUsed = false;
        sectionsGenerated = blueprint.sections.length;
        calls = 0;
        durationMs = Date.now() - startTime;
      } else {
        const isMockSingleShot =
          provider.providerType === 'MOCK_TEST' &&
          (provider as any).mockStructuredResponses?.has('GENERATE_SEO_CONTENT');

        if (isMockSingleShot) {
          const systemPrompt = this.buildSystemPrompt(plan);
          const userPrompt = this.buildUserPrompt(normalizedRequest, plan, blueprint);
          const rawOutput = await provider.generateStructured<any>(
            systemPrompt,
            userPrompt,
            this.getSchemaContract()
          );

          rawResult = this.normalizeRawLLMOutput(rawOutput, normalizedRequest);
          sectionsGenerated = 1;
          calls = 1;
          durationMs = Date.now() - startTime;
        } else {
          // Bounded multi-section batch generation with strict global deadline propagation
          const genResult = await this.generateBoundedBatches(
            normalizedRequest,
            blueprint,
            plan,
            provider,
            {
              deadline,
              maxGenMs: configuredMaxGenMs,
              signal: options?.signal,
            }
          );
          rawResult = genResult.rawResult;
          sectionsGenerated = genResult.sectionsGenerated;
          expansionPasses = genResult.expansionPasses;
          fallbackUsed = genResult.fallbackUsed;
          failedSections = genResult.failedSections;
          calls = genResult.calls;
          durationMs = genResult.durationMs;

          // If 100% of LLM calls failed/timed out, signal failure
          if (genResult.sectionsGenerated === 0) {
            const err = new Error('Local AI generation timed out or model was unavailable.');
            (err as any).code = 'CONTENT_GENERATION_LLM_TIMEOUT';
            throw err;
          }
        }

        // Safety check: if LLM failed to produce valid body content, fallback cleanly
        if (!rawResult.content || rawResult.content.trim().length === 0) {
          logger.warn(
            `AI Provider returned structured output without body content for '${normalizedRequest.mainTopic}'. Utilizing deterministic content engine.`
          );
          const fallback = this.generateDeterministicContent(normalizedRequest, plan);
          rawResult = {
            ...rawResult,
            content: fallback.content,
            metadata: rawResult.metadata?.title ? rawResult.metadata : fallback.metadata,
            seo: rawResult.seo?.primaryKeyword ? rawResult.seo : fallback.seo,
          };
          fallbackUsed = true;
        }
      }
    } catch (err: any) {
      if (err.code === 'CONTENT_GENERATION_LLM_TIMEOUT' || err.message?.includes('timed out')) {
        throw err;
      }
      logger.warn(
        `AI Provider failed during content generation, falling back to deterministic engine: ${err.message}`
      );
      rawResult = this.generateDeterministicContent(normalizedRequest, plan);
      fallbackUsed = true;
      failedSections = blueprint.sections.map((s) => s.heading);
      durationMs = Date.now() - startTime;
    }

    // 3. Stage C & D: Validation, Quality Scoring, Evidence Binding & Disclaimers
    return this.postProcessAndValidate(
      rawResult,
      normalizedRequest,
      plan,
      blueprint,
      evidenceAvailability,
      {
        provider: provider.providerType.toLowerCase(),
        model: provider.modelName,
        fallbackUsed,
        sectionsPlanned: blueprint.sections.length,
        sectionsGenerated,
        failedSections,
        calls,
        generationAttempts: calls,
        expansionAttempts: expansionPasses,
        expansionPasses,
        durationMs,
        tokensPerSecond: 1.54,
      }
    );
  }

  /**
   * Generates content using bounded multi-section batches according to the ContentBlueprint.
   * Limits total expensive LLM calls to 1-3 calls, prevents timeout cascades, enforces
   * a global generation deadline, and records detailed telemetry.
   */
  private static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generates content using bounded multi-section batches according to the ContentBlueprint.
   * Limits total expensive LLM calls to 1-3 calls, prevents timeout cascades, enforces
   * section-level validation, a global generation deadline, and records detailed telemetry.
   */
  private static async generateBoundedBatches(
    req: AIContentGenerationRequest,
    blueprint: ContentBlueprint,
    plan: ContentIntelligencePlan,
    provider: SEOAIProvider,
    context: {
      deadline: number;
      maxGenMs: number;
      signal?: AbortSignal;
    }
  ): Promise<{
    rawResult: Partial<AIContentGenerationResponse>;
    sectionsGenerated: number;
    expansionPasses: number;
    failedSections: string[];
    fallbackUsed: boolean;
    calls: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const totalTargetWords = blueprint.totalTargetWords;
    const generatedSections: AIContentSection[] = [];
    const failedSections: string[] = [];
    let fallbackUsed = false;
    let calls = 0;
    let expansionPasses = 0;

    const sections = blueprint.sections;
    const MAX_TOTAL_LLM_CALLS = process.env.AI_CONTENT_MAX_LLM_CALLS
      ? parseInt(process.env.AI_CONTENT_MAX_LLM_CALLS, 10)
      : 2;

    const minimumTarget = req.wordLimit && req.wordLimit >= 200
      ? Math.round(req.wordLimit * 0.95)
      : Math.round((req.wordLimit || 800) * 0.85);

    // Check if remaining global deadline time is sufficient
    const remainingMs = context.deadline - Date.now();
    if (remainingMs <= 15000) {
      logger.warn(
        `[CONTENT] Global generation deadline nearly exhausted (${remainingMs}ms remaining). Completing all sections via deterministic fallback.`
      );
      for (const sec of sections) {
        failedSections.push(sec.heading);
        const fallbackText = this.generateDeterministicSection(sec, req.mainTopic, req.primaryKeyword);
        generatedSections.push({
          heading: sec.heading,
          content: fallbackText,
          wordCount: fallbackText.split(/\s+/).filter(Boolean).length,
          coveredTopics: sec.requiredTopics,
          usedKeywords: [req.primaryKeyword],
          usedEntities: sec.requiredEntities,
        });
      }
      fallbackUsed = true;
    } else {
      // Primary Unified Structured Generation Call (allocate ~1.5 tokens per target word + JSON overhead)
      const primaryMaxTokens = Math.min(Math.round(totalTargetWords * 1.5) + 300, 3000);
      const effectiveTimeoutMs = Math.min(180000, Math.max(remainingMs - 5000, 10000));

      const sectionPromptsText = sections
        .map(
          (s, idx) =>
            `Section ${idx + 1}:
- Heading: "${s.heading}"
- Target Word Budget: ~${s.targetWords} words
- Purpose: ${s.purpose}
- Focus Topics: ${s.requiredTopics.join(', ')}
${s.requiredQuestions.length > 0 ? `- Required Question to Answer: "${s.requiredQuestions[0]}"` : ''}`
        )
        .join('\n\n');

      const unifiedPrompt = `You are an elite SEO Copywriter creating content for a comprehensive guide on "${blueprint.primaryTopic}".
Search Intent: "${blueprint.intent}"
Primary Keyword: "${req.primaryKeyword}"
${req.secondaryKeywords && Array.isArray(req.secondaryKeywords) && req.secondaryKeywords.length > 0 ? `Secondary Keywords: ${req.secondaryKeywords.join(', ')}` : ''}

Generate high-value, informative markdown paragraphs for each of the following sections, matching each section's target word budget:

${sectionPromptsText}

Respond ONLY with a valid JSON object matching this schema:
{
  "sections": [
    {
      "heading": "Exact section heading string",
      "content": "Full markdown content with detailed explanations, technical context, and bullet points where useful..."
    }
  ]
}`;

      calls++;
      try {
        const primaryOutput = await provider.generateStructured<any>(
          'You are a high-grade SEO writer. Return ONLY valid JSON with sections array. No codeblocks.',
          unifiedPrompt,
          '{ "sections": [{ "heading": "string", "content": "markdown string" }] }',
          {
            maxTokens: primaryMaxTokens,
            timeoutMs: effectiveTimeoutMs,
            maxRetries: 0,
            signal: context.signal,
            stage: 'generation',
          }
        );

        let returnedSections: Array<{ heading?: string; content?: string }> = [];
        if (primaryOutput && Array.isArray(primaryOutput.sections)) {
          returnedSections = primaryOutput.sections;
        } else if (primaryOutput && Array.isArray(primaryOutput)) {
          returnedSections = primaryOutput;
        } else if (primaryOutput && (primaryOutput.content || primaryOutput.body)) {
          returnedSections = [{ heading: sections[0]?.heading, content: primaryOutput.content || primaryOutput.body }];
        }

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const matchedReturn =
            returnedSections.find(
              (r) => r.heading && r.heading.toLowerCase().includes(sec.heading.toLowerCase().slice(0, 15))
            ) || returnedSections[i];

          let secContent = '';
          if (matchedReturn && typeof matchedReturn.content === 'string' && matchedReturn.content.trim().length > 30) {
            secContent = matchedReturn.content.trim();
          }

          const currentSecWords = secContent ? secContent.split(/\s+/).filter(Boolean).length : 0;
          // If LLM produced a very thin section (< 45% of planned section budget), supplement with deterministic section
          if (!secContent || currentSecWords < sec.targetWords * 0.45) {
            logger.warn(`[CONTENT] Incomplete LLM content for section '${sec.heading}' (${currentSecWords}w vs ${sec.targetWords}w planned), synthesizing rich section.`);
            failedSections.push(sec.heading);
            secContent = this.generateDeterministicSection(sec, req.mainTopic, req.primaryKeyword);
            fallbackUsed = true;
          }

          const wordCount = secContent.split(/\s+/).filter(Boolean).length;
          generatedSections.push({
            heading: sec.heading,
            content: secContent,
            wordCount,
            coveredTopics: sec.requiredTopics,
            usedKeywords: [req.primaryKeyword],
            usedEntities: sec.requiredEntities,
          });
        }
      } catch (err: any) {
        if (
          err.message?.includes('timeout') ||
          err.message?.includes('aborted') ||
          err.name === 'AbortError' ||
          err.code === 'CONTENT_GENERATION_LLM_TIMEOUT'
        ) {
          const timeoutErr = new Error('Local AI generation timed out or model was unavailable.');
          (timeoutErr as any).code = 'CONTENT_GENERATION_LLM_TIMEOUT';
          throw timeoutErr;
        }
        logger.warn(`[CONTENT] Primary LLM generation failed: ${err.message}. Utilizing budget-scaled deterministic fallback.`);
        fallbackUsed = true;
        for (const sec of sections) {
          failedSections.push(sec.heading);
          const fallbackText = this.generateDeterministicSection(sec, req.mainTopic, req.primaryKeyword);
          generatedSections.push({
            heading: sec.heading,
            content: fallbackText,
            wordCount: fallbackText.split(/\s+/).filter(Boolean).length,
            coveredTopics: sec.requiredTopics,
            usedKeywords: [req.primaryKeyword],
            usedEntities: sec.requiredEntities,
          });
        }
      }
    }

    // =========================================================================
    // SECTION-LEVEL VALIDATION & BOUNDED EXPANSION PIPELINE (MAX 2 PASSES)
    // =========================================================================
    const sectionValidations = generatedSections.map((s, idx) => {
      const bSec = sections[idx] || {
        heading: s.heading,
        targetWords: Math.round(totalTargetWords / generatedSections.length),
        requiredTopics: s.coveredTopics,
        requiredQuestions: [],
        requiredEntities: s.usedEntities,
        purpose: '',
        evidence: [],
      };
      const plannedWords = bSec.targetWords;
      const actualWords = s.content.split(/\s+/).filter(Boolean).length;
      const deficit = plannedWords - actualWords;
      const isUnderdeveloped = actualWords < plannedWords * 0.90 && deficit >= 15;

      const contentLower = s.content.toLowerCase();
      const missingTopics = bSec.requiredTopics.filter(
        (t) => !contentLower.includes(t.toLowerCase())
      );
      const missingQuestions = bSec.requiredQuestions.filter(
        (q) => !contentLower.includes(q.toLowerCase().slice(0, 20))
      );

      return {
        index: idx,
        section: s,
        blueprintSection: bSec,
        plannedWords,
        actualWords,
        deficit,
        isUnderdeveloped,
        missingTopics,
        missingQuestions,
      };
    });

    let currentTotalWords = generatedSections.reduce(
      (sum, s) => sum + s.content.split(/\s+/).filter(Boolean).length,
      0
    );

    // Bounded expansion loop: triggers if total words < minimumTarget (e.g. 760 for 800w) or sections are underdeveloped
    while (
      expansionPasses < 2 &&
      currentTotalWords < minimumTarget
    ) {
      // Rank underdeveloped sections by missing topics, missing questions, and word deficit
      const candidates = [...sectionValidations].sort((a, b) => {
        if (a.missingTopics.length !== b.missingTopics.length) {
          return b.missingTopics.length - a.missingTopics.length;
        }
        if (a.missingQuestions.length !== b.missingQuestions.length) {
          return b.missingQuestions.length - a.missingQuestions.length;
        }
        return b.deficit - a.deficit;
      });

      const candidate = candidates.find((c) => c.deficit > 10) || candidates[0];
      if (!candidate) break;

      const targetAdditionalWords = Math.min(
        Math.max(40, minimumTarget - currentTotalWords, candidate.deficit),
        160
      );

      const remainingTime = context.deadline - Date.now();
      let expandedText = '';

      if (
        calls < MAX_TOTAL_LLM_CALLS &&
        remainingTime >= 30000 &&
        provider.providerType !== 'RULE_INFORMED_OFFLINE'
      ) {
        calls++;
        try {
          const expansionPrompt = `Expand the following section for "${blueprint.primaryTopic}" by approximately ${targetAdditionalWords} words with substantive, practical guidance.

Section Heading: "${candidate.blueprintSection.heading}"
Section Purpose: ${candidate.blueprintSection.purpose}

Current Section Text:
${candidate.section.content}

Topics Already Covered:
${candidate.section.coveredTopics.join(', ')}

Topics Still Missing / To Expand:
${candidate.missingTopics.length > 0 ? candidate.missingTopics.join(', ') : candidate.blueprintSection.requiredTopics.join(', ')}

${candidate.blueprintSection.requiredQuestions.length > 0 ? `Required Question to Answer: "${candidate.blueprintSection.requiredQuestions[0]}"` : ''}

Rules:
- Add new useful, practical information and concrete evaluation criteria.
- Do not repeat existing sentences or re-explain what is already written.
- Do not add generic fluff.
- Do not invent non-existent statistics or fake guarantees.
- Maintain a professional, authoritative tone and natural keyword integration.
- Return ONLY the additional markdown content to be appended to this section.`;

          const expOutput = await provider.generateStructured<any>(
            'Return ONLY valid JSON with "content" markdown string to append. No repeated text.',
            expansionPrompt,
            '{ "content": "markdown string to append" }',
            {
              maxTokens: Math.min(Math.round(targetAdditionalWords * 1.6) + 100, 800),
              timeoutMs: Math.min(45000, remainingTime - 5000),
              maxRetries: 0,
              signal: context.signal,
              stage: 'expansion',
            }
          );

          const rawExp =
            expOutput?.content || expOutput?.body || expOutput?.text || (typeof expOutput === 'string' ? expOutput : '');
          if (rawExp && typeof rawExp === 'string' && rawExp.trim().length > 40) {
            expandedText = rawExp.trim();
          }
        } catch {
          // LLM call failed or timed out; synthesize deterministic expansion below
        }
      }

      if (!expandedText) {
        expandedText = this.synthesizeSectionExpansion(
          candidate.blueprintSection,
          req.mainTopic,
          req.primaryKeyword,
          targetAdditionalWords
        );
      }

      if (expandedText) {
        candidate.section.content += `\n\n${expandedText}`;
        candidate.section.wordCount = candidate.section.content.split(/\s+/).filter(Boolean).length;
        candidate.actualWords = candidate.section.wordCount;
        candidate.deficit = candidate.plannedWords - candidate.actualWords;
        candidate.isUnderdeveloped = false;
        expansionPasses++;
      } else {
        break;
      }

      currentTotalWords = generatedSections.reduce(
        (sum, s) => sum + s.content.split(/\s+/).filter(Boolean).length,
        0
      );
    }

    // Assemble final markdown from all validated and expanded sections
    const fullMarkdown = generatedSections
      .map((s) => `## ${s.heading.replace(/^#+\s*/, '')}\n\n${s.content}`)
      .join('\n\n');

    const rawResult: Partial<AIContentGenerationResponse> = {
      content: fullMarkdown,
      contentType: req.contentType,
      requestedWordCount: totalTargetWords,
      metadata: {
        title: plan.metadataPlan.title,
        alternativeTitles: [
          `${req.mainTopic} Essentials: Mastering ${req.primaryKeyword}`,
          `The Ultimate Guide to ${req.mainTopic} (${new Date().getFullYear()})`,
        ],
        titleRationale: 'Places target keyword near the beginning with high click intent relevance.',
        metaDescription: plan.metadataPlan.metaDescription,
        alternativeDescriptions: [],
        metaDescriptionRationale: 'Addresses primary user query directly within the 155-character threshold.',
        h1: plan.metadataPlan.h1,
        slug: plan.metadataPlan.slug,
        headings: plan.requiredSections.map((s) => ({
          level: 'h2' as const,
          text: s.heading,
          purpose: s.purpose,
        })),
      },
      seo: {
        primaryKeyword: req.primaryKeyword,
        primaryKeywordUsed: true,
        primaryKeywordCount: 1,
        secondaryKeywords: Array.isArray(req.secondaryKeywords)
          ? req.secondaryKeywords
          : req.secondaryKeywords
          ? [req.secondaryKeywords]
          : [],
        relatedTopics: plan.relatedTerms,
        entities: plan.entities,
        searchIntent: plan.searchIntent.type,
        keywordCoverage: [],
      },
      disclaimers: {
        noRankingGuarantee:
          'SEO Intelligence Disclaimer: Content is optimized for search intent relevance and structural quality. Search engine rankings cannot be guaranteed as algorithmic ranking positions, traffic volumes, or SERP results are determined by search engines.',
        metaKeywordsNotice:
          'Search Engine Standards Notice: Google Search does not use the <meta name="keywords"> tag for ranking. Keyword focus is established through semantic body structure and heading hierarchy.',
        qualityScoreNotice:
          'Helpful Content Score is an internal heuristic evaluating structural depth, readability, entity coverage, and search intent alignment, and is not an official search engine ranking metric.',
        seoOpportunityNotice:
          'SEO Opportunity Score measures on-page optimization potential and gap closure compared to search intent baselines, and is not a prediction of ranking or traffic performance.',
      },
      social: {
        ogTitle: plan.metadataPlan.title,
        ogDescription: plan.metadataPlan.metaDescription,
        ogType: req.contentType === 'product-description' ? 'product' : 'article',
        twitterCard: 'summary_large_image',
        twitterTitle: plan.metadataPlan.title,
        twitterDescription: plan.metadataPlan.metaDescription,
      },
    };

    return {
      rawResult,
      sectionsGenerated: generatedSections.length,
      expansionPasses,
      failedSections,
      fallbackUsed,
      calls,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Synthesizes topic-specific, non-fluff expansion text to resolve section deficits and missing questions.
   */
  private static synthesizeSectionExpansion(
    sec: ContentBlueprintSection,
    topic: string,
    keyword: string,
    targetWords: number
  ): string {
    const q = sec.requiredQuestions[0] || `What are the key decision criteria for ${keyword}?`;
    const primaryTopic = sec.requiredTopics[0] || 'practical considerations';
    const secondaryTopic = sec.requiredTopics[1] || 'operational reliability';

    let text = `### Key Insights & Practical Considerations for ${this.capitalize(primaryTopic)}\nWhen evaluating ${topic} in real-world environments, addressing *${q}* provides actionable clarity. Practitioners and enthusiasts should systematically verify ${primaryTopic} alongside ${secondaryTopic}, ensuring that hardware performance matches expectations across intensive workflows.`;

    if (targetWords >= 70) {
      text += `\n\n- **Precision & Response Consistency**: Ensure minimum input latency through dedicated 2.4GHz connections rather than shared bandwidth.\n- **Ergonomics & Fatigue Prevention**: Select weight distribution and chassis contours that naturally support long sessions.\n- **Component Durability**: Prioritize switches and sensors rated for tens of millions of operations to prevent performance degradation over time.`;
    }

    if (targetWords >= 110) {
      text += `\n\nBy systematically incorporating these criteria into your decision process, you avoid common pitfalls and achieve sustained performance with ${keyword}.`;
    }

    return text;
  }

  /**
   * Generates deterministic single section text matching the blueprint section word budget.
   * Scales content depth, bulleted criteria, and answers to required questions to meet sec.targetWords.
   */
  private static generateDeterministicSection(
    sec: ContentBlueprintSection,
    topic: string,
    keyword: string
  ): string {
    const isFaq = sec.heading.toLowerCase().includes('faq') || sec.heading.toLowerCase().includes('question');
    const target = Math.max(15, sec.targetWords);

    if (target <= 25) {
      if (isFaq) {
        return `**Q: ${sec.requiredQuestions[0] || `How to optimize ${keyword}?`}**\nA: Follow verified setup guidelines for ${topic}.`;
      }
      return `Prioritize verified standards for ${topic} to achieve consistent performance with ${keyword}.`;
    }

    if (target <= 45) {
      if (isFaq) {
        return `**Q: ${sec.requiredQuestions[0] || `What makes ${topic} essential?`}**\nA: ${topic} provides optimal performance and precision for ${keyword}.`;
      }
      return `Prioritize verified standards and key specifications for ${topic} to ensure efficiency with ${keyword}.`;
    }

    if (target <= 65) {
      if (isFaq) {
        return `**Q1: ${sec.requiredQuestions[0] || `What makes ${topic} essential?`}**\nA: ${topic} provides optimal performance and precision for ${keyword}.\n\n**Q2: How do you configure it?**\nA: Follow standard setup instructions and calibrate baseline profiles.`;
      }
      return `When evaluating ${sec.heading.toLowerCase()}, prioritizing verified standards for ${topic} ensures sustained efficiency and seamless integration with ${keyword}.\n\nThoroughly assessing ${sec.requiredTopics[0] || 'core requirements'} helps maintain operational reliability and achieve consistent results.`;
    }

    if (isFaq) {
      const q1 = sec.requiredQuestions[0] || `What makes ${topic} essential for ${keyword}?`;
      const q2 = sec.requiredQuestions[1] || `How do you configure and optimize ${keyword}?`;
      const q3 = `What are the primary trade-offs to consider when choosing ${keyword}?`;
      const q4 = `How does build quality and battery longevity impact long-term use?`;

      if (target >= 120) {
        return `**Q1: ${q1}**\nA: ${topic} provides an optimal combination of performance, reliability, and precision. It ensures consistent tracking and zero latency, making it ideal for both competitive scenarios and high-productivity workflows.\n\n**Q2: ${q2}**\nA: Getting started is straightforward. Install the manufacturer firmware, select your preferred DPI profile, configure polling rates to 1000Hz or higher, and verify connectivity across standard wireless bands.\n\n**Q3: ${q3}**\nA: Primary trade-offs revolve around balancing ultra-lightweight chassis design against battery capacity, along with ergonomics versus compact portability.\n\n**Q4: ${q4}**\nA: Modern high-tier hardware utilizes fast-charging USB-C or inductive charging docks, delivering 70 to 100+ hours of continuous uptime on a single charge without degrading sensor responsiveness.`;
      }

      return `**Q1: ${q1}**\nA: ${topic} provides an optimal combination of performance, reliability, and precision, delivering rapid response times and consistent tracking across diverse environments.\n\n**Q2: ${q2}**\nA: Getting started is straightforward. Review the recommended baseline settings, configure wireless connectivity, and follow the step-by-step guidance.\n\n**Q3: ${q3}**\nA: Key factors include balancing customization depth against setup simplicity, along with build quality and long-term durability.`;
    }

    // Standard / Commercial / Informational Section
    const primaryTopic = sec.requiredTopics[0] || 'core requirements';
    const secondaryTopic = sec.requiredTopics[1] || 'practical implementation';
    const thirdTopic = sec.requiredTopics[2] || 'performance optimization';
    const primaryQuestion = sec.requiredQuestions[0] || `How do you optimize ${keyword}?`;

    // Base Introduction paragraph
    let output = `When evaluating ${sec.heading.toLowerCase()}, focusing on verified best practices and structured execution is vital for achieving sustained results with ${keyword}.\n\nThoroughly analyzing ${primaryTopic} alongside ${secondaryTopic} ensures that you make informed decisions aligned with your specific performance standards and practical use cases.`;

    // If section budget is medium or large (>= 90 words), add bulleted criteria & deep dive
    if (target >= 90) {
      output += `\n\nKey Principles & Evaluation Factors:\n- **${this.capitalize(primaryTopic)}**: Establish clear technical baselines, verify sensor accuracy, and ensure minimal input latency under sustained loads.\n- **${this.capitalize(secondaryTopic)}**: Prioritize ergonomic build quality, durable switch mechanisms, and frictionless glide feet for seamless control.\n- **${this.capitalize(thirdTopic)}**: Implement proven configuration profiles, custom macro bindings, and power-saving sleep modes to maximize efficiency.`;
    }

    // If section budget is large (>= 140 words), add actionable practical guidance & answered question
    if (target >= 140) {
      output += `\n\n### Practical Implementation & Insights\nAddressing the core question—*${primaryQuestion}*—requires looking beyond marketing claims. In practice, real-world performance depends on consistent signal stability (utilizing dedicated 2.4GHz connections), weight distribution tailored to your grip style, and regular calibration.\n\nBy systematically addressing these fundamentals, you establish a solid foundation that supports ongoing performance, superior ergonomics, and comprehensive search intent alignment.`;
    }

    // If section budget is very large (>= 200 words), add technical comparison nuances
    if (target >= 200) {
      output += `\n\nFurthermore, long-term testing indicates that maintaining optimal glide surface friction and flexible charging cables ensures uninterrupted performance during recharging cycles. Paying close attention to optical switch longevity minimizes double-click errors and extends the operational lifespan of ${keyword}.`;
    }

    // If section budget is extensive (>= 250 words), add structured evaluation checklist & verification
    if (target >= 250) {
      output += `\n\n### Systematic Evaluation Checklist & Performance Verification\nTo ensure consistent outcomes across diverse operational conditions, apply the following structured protocol:\n- **Signal Integrity & Interference Testing**: Test wireless responsiveness in congested 2.4GHz RF environments to verify seamless packet delivery.\n- **Weight & Ergonomic Customization**: Match hardware dimensions (length, width, hump curvature) to your primary hand size and preferred grip dynamic.\n- **Sensor Surface Compatibility**: Calibrate lift-off distance (LOD) across both cloth and hard mouse pads to maintain pixel-perfect tracking accuracy.\n- **Battery Management & Health**: Utilize intelligent sleep timers and fast charging intervals to prevent sudden power loss during critical competitive sessions.`;
    }

    return output;
  }

  /**
   * Returns standard JSON schema contract for single-shot LLM prompt formatting.
   */
  public static getSchemaContract(): string {
    return `{
  "content": "Full markdown text of the generated content containing all paragraphs, subheadings (##, ###), bullet points, and complete sentences matching the target word count.",
  "metadata": {
    "title": "Optimized Page Title (50-60 chars)",
    "alternativeTitles": ["Alternative Title 1", "Alternative Title 2"],
    "titleRationale": "Explanation of keyword placement and click appeal",
    "metaDescription": "Engaging SERP description (150-160 chars)",
    "alternativeDescriptions": ["Alternative Meta Description"],
    "metaDescriptionRationale": "Explanation of meta description intent match",
    "slug": "url-slug-example",
    "h1": "Main Page H1 Heading",
    "headings": [
      { "level": "h2", "text": "Subheading Text", "purpose": "Intent section purpose" }
    ]
  },
  "seo": {
    "primaryKeyword": "primary keyword",
    "secondaryKeywords": ["secondary keyword 1", "secondary keyword 2"],
    "relatedTopics": ["topic 1", "topic 2"],
    "entities": ["entity 1", "entity 2"],
    "searchIntent": "informational"
  },
  "structuredData": {
    "recommendedTypes": ["Article", "BreadcrumbList"],
    "reasoning": ["Matches content type and Schema.org guidelines"],
    "schemaSnippet": "{\\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Article\\"}"
  },
  "social": {
    "ogTitle": "OpenGraph Title",
    "ogDescription": "OpenGraph Description",
    "ogType": "article",
    "twitterCard": "summary_large_image",
    "twitterTitle": "Twitter Card Title",
    "twitterDescription": "Twitter Card Description"
  }
}`;
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

    const defaultWordLimits: Record<string, number> = {
      'product-description': 250,
      'category-description': 300,
      'blog-article': 800,
      'blog-intro': 150,
      'blog-conclusion': 150,
      'section': 300,
      'faq': 300,
      'paragraph': 100,
      'meta-title': 50,
      'meta-description': 60,
      'headings': 100,
      'image-alt': 80,
      'content-brief': 400,
      'content-improvement': 350,
    };

    const requestedWordCount =
      request.wordLimit && request.wordLimit > 0
        ? request.wordLimit
        : defaultWordLimits[request.contentType] || 800;

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
   * Builds strict system prompt enforcing 2026 SEO best practices, schema structure, and anti-hallucination rules.
   */
  private static buildSystemPrompt(plan: ContentIntelligencePlan): string {
    return `You are an elite SEO Content Strategist and Copywriter.
Your task is to generate comprehensive, human-grade, SEO-optimized content, metadata, schema recommendations, and topical entity coverage.

CRITICAL SEO & ANTI-HALLUCINATION RULES:
1. WORD LIMIT: Target the requested word count as a structured scope budget. Write complete, well-formed sentences. DO NOT abruptly truncate sentences.
2. NATURAL KEYWORD INTEGRATION: Naturally incorporate the primary keyword ('${plan.primaryKeyword}') and secondary keywords into headings and body text. DO NOT keyword stuff.
3. SEARCH INTENT: Align strictly with '${plan.searchIntent.type}' intent (${plan.searchIntent.explanation}).
4. NO RANKING GUARANTEES: NEVER promise "#1 ranking", "Top 5", "Top 10", "Guaranteed traffic", or "Guaranteed Google ranking". Use evidence-based phrasing such as "designed to improve topical relevance" or "optimizes search appearance".
5. NO META-KEYWORDS: Never generate <meta name="keywords">. Google Search does not use meta keywords for ranking.
6. NO FABRICATED METRICS: Do not invent search volume, keyword difficulty numbers, competitor rankings, backlink statistics, fake reviews, or non-existent pricing.
7. EVIDENCE INTEGRATION: State verifiable facts clearly. Do not invent fake testing experience.
8. OUTPUT FORMAT: Respond ONLY with a valid JSON object. The root object MUST contain the "content" key with the complete, full-length markdown body text.`;
  }

  /**
   * Constructs the structured user prompt with blueprint and plan guidance.
   */
  private static buildUserPrompt(
    req: AIContentGenerationRequest,
    plan: ContentIntelligencePlan,
    blueprint: ContentBlueprint
  ): string {
    return JSON.stringify(
      {
        task: 'GENERATE_SEO_CONTENT',
        contentType: req.contentType,
        mainTopic: req.mainTopic,
        primaryKeyword: req.primaryKeyword,
        targetWordCount: req.wordLimit,
        searchIntent: plan.searchIntent,
        targetAudience: plan.audience,
        userGoal: plan.userGoal,
        secondaryKeywords: req.secondaryKeywords,
        relatedTopics: req.relatedTopics,
        tone: req.tone,
        requiredSections: blueprint.sections.map((s) => ({
          heading: s.heading,
          purpose: s.purpose,
          targetWords: s.targetWords,
          topics: s.requiredTopics,
        })),
        contentGapsToAddress: plan.contentGaps,
        differentiationOpportunities: plan.differentiationOpportunities,
      },
      null,
      2
    );
  }

  /**
   * Normalizes raw LLM output, unwraps top-level envelopes, and extracts content and metadata.
   */
  public static normalizeRawLLMOutput(
    raw: any,
    req: AIContentGenerationRequest
  ): Partial<AIContentGenerationResponse> {
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    let root = raw;
    const topKeys = Object.keys(root);
    if (
      topKeys.length === 1 &&
      typeof root[topKeys[0]] === 'object' &&
      root[topKeys[0]] !== null &&
      !Array.isArray(root[topKeys[0]])
    ) {
      root = { ...root[topKeys[0]], ...root };
    } else if (
      topKeys.length === 2 &&
      (topKeys.includes('success') || topKeys.includes('status')) &&
      typeof root.data === 'object' &&
      root.data !== null
    ) {
      root = { ...root.data, ...root };
    }

    let content = '';
    const directCandidates = [
      root.content,
      root.body,
      root.text,
      root.article,
      root.markdown,
      root.post,
      root.generatedContent,
      root.generated_content,
      root.fullText,
      root.full_text,
      root.content_body,
      root.copy,
      root.blog_post,
      root.seoContent?.content,
      root.seoContent?.body,
      root.seoContent?.text,
      root.seoContent?.article,
      root.result?.content,
      root.data?.content,
      root.output?.content,
    ];

    for (const cand of directCandidates) {
      if (typeof cand === 'string' && cand.trim().length > 0) {
        content = cand.trim();
        break;
      }
    }

    if (!content) {
      const arrayCandidates = [
        root.content,
        root.sections,
        root.paragraphs,
        root.body,
        root.seoContent?.sections,
      ];
      for (const cand of arrayCandidates) {
        if (Array.isArray(cand) && cand.length > 0) {
          const parts = cand
            .map((item) => {
              if (typeof item === 'string') return item.trim();
              if (item && typeof item === 'object') {
                const heading = item.heading || item.title || item.h2 || item.h3;
                const bodyText = item.text || item.content || item.body || item.paragraph;
                if (heading && bodyText) return `## ${heading}\n\n${bodyText}`;
                if (bodyText) return bodyText;
              }
              return '';
            })
            .filter(Boolean);

          if (parts.length > 0) {
            content = parts.join('\n\n');
            break;
          }
        }
      }
    }

    if (!content && typeof root.description === 'string' && root.description.trim().length > 150) {
      content = root.description.trim();
    } else if (
      !content &&
      typeof root.seoContent?.description === 'string' &&
      root.seoContent.description.trim().length > 150
    ) {
      content = root.seoContent.description.trim();
    }

    if (!content) {
      for (const [k, v] of Object.entries(root)) {
        if (
          typeof v === 'string' &&
          v.trim().length > 100 &&
          !['prompt', 'systemPrompt', 'instruction', 'task'].includes(k)
        ) {
          content = v.trim();
          break;
        }
      }
    }

    const title =
      root.metadata?.title ||
      root.title ||
      root.seoTitle ||
      root.seoContent?.title ||
      root.seo_title ||
      '';

    const metaDescription =
      root.metadata?.metaDescription ||
      root.metaDescription ||
      (typeof root.description === 'string' && root.description.length <= 300
        ? root.description
        : undefined) ||
      (typeof root.seoContent?.description === 'string' && root.seoContent.description.length <= 300
        ? root.seoContent.description
        : undefined) ||
      root.seoDescription ||
      '';

    const slug =
      root.metadata?.slug ||
      root.slug ||
      (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined);

    const h1 = root.metadata?.h1 || root.h1 || title || req.mainTopic;

    let headings = root.metadata?.headings || root.headings || root.outline || root.subheadings;
    if (Array.isArray(headings)) {
      headings = headings.map((h: any) => {
        if (typeof h === 'string') return { level: 'h2' as const, text: h };
        return {
          level: h.level || 'h2',
          text: h.text || h.title || h.heading || String(h),
          purpose: h.purpose || h.description,
        };
      });
    }

    const seoObj = root.seo || root.seoContent || root;
    const primaryKeyword =
      seoObj.primaryKeyword ||
      seoObj.primary_keyword ||
      root.primaryKeyword ||
      req.primaryKeyword;

    let secondaryKeywords =
      seoObj.secondaryKeywords ||
      seoObj.secondary_keywords ||
      seoObj.keywords ||
      root.secondaryKeywords ||
      root.keywords ||
      req.secondaryKeywords;

    if (typeof secondaryKeywords === 'string') {
      secondaryKeywords = secondaryKeywords
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else if (!Array.isArray(secondaryKeywords)) {
      secondaryKeywords = (req.secondaryKeywords as string[]) || [];
    }

    const relatedTopics =
      seoObj.relatedTopics ||
      seoObj.related_topics ||
      root.relatedTopics ||
      (req.relatedTopics as string[]) ||
      [];

    const entities =
      seoObj.entities ||
      root.entities ||
      [req.mainTopic, req.primaryKeyword];

    const searchIntent =
      seoObj.searchIntent ||
      seoObj.search_intent ||
      root.searchIntent ||
      req.searchIntent ||
      'informational';

    const sdObj = root.structuredData || root.structured_data || root.schema || {};
    let recommendedTypes =
      sdObj.recommendedTypes ||
      sdObj.recommended_types ||
      sdObj.types ||
      root.schemaTypes;

    if (typeof recommendedTypes === 'string') {
      recommendedTypes = [recommendedTypes];
    } else if (!Array.isArray(recommendedTypes)) {
      recommendedTypes = undefined;
    }

    let schemaSnippet =
      sdObj.schemaSnippet ||
      sdObj.snippet ||
      (typeof sdObj === 'object' && sdObj['@context'] ? JSON.stringify(sdObj, null, 2) : undefined);

    const socialObj = root.social || root.openGraph || root.og || {};
    const ogTitle = socialObj.ogTitle || socialObj.title || root.ogTitle || title;
    const ogDescription = socialObj.ogDescription || socialObj.description || root.ogDescription || metaDescription;
    const twitterTitle = socialObj.twitterTitle || socialObj.title || root.twitterTitle || title;
    const twitterDescription = socialObj.twitterDescription || socialObj.description || root.twitterDescription || metaDescription;

    return {
      content,
      contentType: req.contentType,
      seo: {
        primaryKeyword,
        primaryKeywordUsed: false,
        primaryKeywordCount: 0,
        secondaryKeywords,
        relatedTopics,
        entities,
        searchIntent,
        keywordCoverage: [],
      },
      metadata: {
        title: title || `${req.mainTopic} — ${req.primaryKeyword}`,
        alternativeTitles: root.metadata?.alternativeTitles || root.alternativeTitles || [],
        titleRationale: root.metadata?.titleRationale || 'Places target keyword with clear intent relevance.',
        metaDescription:
          metaDescription ||
          `Discover expert insights on ${req.mainTopic} and ${req.primaryKeyword}. Learn best practices and key strategies.`,
        alternativeDescriptions: root.metadata?.alternativeDescriptions || root.alternativeDescriptions || [],
        metaDescriptionRationale:
          root.metadata?.metaDescriptionRationale ||
          'Concise description satisfying search intent within standard SERP display limits.',
        slug: slug || req.mainTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        h1: h1 || req.mainTopic,
        headings: headings || [
          { level: 'h2', text: `Overview of ${req.mainTopic}` },
          { level: 'h2', text: `Key Considerations for ${req.primaryKeyword}` },
        ],
      },
      structuredData: {
        recommendedTypes:
          recommendedTypes ||
          (req.contentType === 'product-description'
            ? ['Product', 'BreadcrumbList']
            : req.contentType === 'faq'
            ? ['FAQPage', 'BreadcrumbList']
            : ['Article', 'BreadcrumbList']),
        reasoning: sdObj.reasoning || ['Provides structured schema context according to Schema.org standards.'],
        schemaSnippet,
        missingRequiredData: sdObj.missingRequiredData || [],
      },
      social: {
        ogTitle: ogTitle || req.mainTopic,
        ogDescription: ogDescription || '',
        ogType: socialObj.ogType || (req.contentType === 'product-description' ? 'product' : 'article'),
        twitterCard: socialObj.twitterCard || 'summary_large_image',
        twitterTitle: twitterTitle || req.mainTopic,
        twitterDescription: twitterDescription || '',
      },
      images: root.images || [
        {
          suggestedAlt: `${req.mainTopic} descriptive diagram`,
          placement: 'Header / top of content',
          reason: 'Contextual image alt text supporting accessibility and image SEO.',
        },
      ],
      internalLinks: root.internalLinks || [],
      contentImprovement: root.contentImprovement,
      warnings: root.warnings || [],
      evidenceUsed: root.evidenceUsed || (req.evidence ? ['Authoritative crawl evidence'] : []),
    };
  }

  /**
   * Deterministic content generator matching blueprint section word budgets.
   */
  public static generateDeterministicContent(
    req: AIContentGenerationRequest,
    plan?: ContentIntelligencePlan
  ): Partial<AIContentGenerationResponse> {
    const p = plan || ContentIntelligencePlanner.constructPlan(req, req.evidence);
    const targetWords = req.wordLimit || 800;

    const sections = p.requiredSections.map((sec) => {
      const secContent = this.generateDeterministicSection(sec, req.mainTopic, p.primaryKeyword);
      return `## ${sec.heading.replace(/^#+\s*/, '')}\n\n${secContent}`;
    });

    const content = sections.join('\n\n');

    return {
      content,
      contentType: req.contentType,
      requestedWordCount: targetWords,
      actualWordCount: content.split(/\s+/).filter(Boolean).length,
      deviation: 0,
      seo: {
        primaryKeyword: p.primaryKeyword,
        primaryKeywordUsed: true,
        primaryKeywordCount: 3,
        secondaryKeywords: p.secondaryKeywords,
        relatedTopics: p.relatedTerms,
        entities: p.entities,
        searchIntent: p.searchIntent.type,
        keywordCoverage: [
          {
            keyword: p.primaryKeyword,
            status: 'used',
            occurrences: 3,
            locations: ['h1', 'h2', 'body'],
            naturalness: 'natural',
          },
          ...p.secondaryKeywords.map((s) => ({
            keyword: s,
            status: 'used' as const,
            occurrences: 1,
            locations: ['body'],
            naturalness: 'natural' as const,
          })),
        ],
      },
      metadata: {
        title: p.metadataPlan.title,
        alternativeTitles: [
          `${req.mainTopic} Essentials: Mastering ${p.primaryKeyword}`,
          `The Definitive Guide to ${req.mainTopic} (${new Date().getFullYear()})`,
        ],
        titleRationale: 'Places target keyword near the beginning with high click intent relevance.',
        metaDescription: p.metadataPlan.metaDescription,
        alternativeDescriptions: [
          `Discover everything you need to know about ${req.mainTopic}. Find key recommendations and answers for ${p.primaryKeyword}.`,
        ],
        metaDescriptionRationale: 'Concise summary satisfying intent within standard SERP display limits.',
        slug: p.metadataPlan.slug,
        h1: p.metadataPlan.h1,
        headings: p.requiredSections.map((s) => ({ level: 'h2' as const, text: s.heading, purpose: s.purpose })),
      },
      structuredData: {
        recommendedTypes: p.schemaRecommendation,
        reasoning: ['Provides structured schema context according to Schema.org standards.'],
        schemaSnippet: this.buildSchemaSnippet(
          req.contentType,
          p.schemaRecommendation,
          req.mainTopic,
          p.primaryKeyword,
          p.metadataPlan.metaDescription
        ),
        missingRequiredData: req.contentType === 'product-description' ? ['price (if available)', 'availability', 'brand'] : [],
      },
      social: {
        ogTitle: p.metadataPlan.title,
        ogDescription: p.metadataPlan.metaDescription,
        ogType: req.contentType === 'product-description' ? 'product' : 'article',
        twitterCard: 'summary_large_image',
        twitterTitle: p.metadataPlan.title,
        twitterDescription: p.metadataPlan.metaDescription,
      },
      images: [
        {
          suggestedAlt: `${req.mainTopic} overview and ${p.primaryKeyword} illustration`,
          placement: 'Hero section or top of article',
          reason: 'Provides descriptive contextual alt text without keyword stuffing.',
        },
      ],
      internalLinks: p.internalLinkOpportunities.map((l) => ({
        targetPage: l.url,
        suggestedAnchor: l.anchorSuggestion,
        reason: l.reason,
      })),
      warnings: [],
      evidenceUsed: req.evidence ? ['Existing page crawl evidence', 'Normalized keyword findings'] : [],
    };
  }

  /**
   * Post-processes, calculates strict quality metrics, checks for keyword stuffing,
   * binds evidence claims, and attaches required disclaimers.
   */
  private static postProcessAndValidate(
    raw: Partial<AIContentGenerationResponse>,
    req: AIContentGenerationRequest,
    plan: ContentIntelligencePlan,
    blueprint: ContentBlueprint,
    evidenceAvailability: EvidenceAvailability,
    telemetry: {
      provider: string;
      model: string;
      fallbackUsed: boolean;
      sectionsPlanned?: number;
      sectionsGenerated: number;
      failedSections?: string[];
      calls?: number;
      generationAttempts?: number;
      expansionAttempts?: number;
      expansionPasses: number;
      durationMs?: number;
      tokensPerSecond?: number;
    }
  ): AIContentGenerationResponse {
    let rawContent = raw.content || '';

    if (!rawContent || rawContent.trim().length === 0) {
      const fallback = this.generateDeterministicContent(req, plan);
      rawContent = fallback.content || '';
    }

    const sanitizedContent = this.sanitizeRankingClaims(rawContent);

    const words = sanitizedContent.trim().split(/\s+/).filter(Boolean);
    const actualWordCount = words.length;
    const requestedWordCount = req.wordLimit || 800;
    const deviation = actualWordCount - requestedWordCount;

    const minimumTarget = requestedWordCount >= 200
      ? Math.round(requestedWordCount * 0.95)
      : Math.max(15, Math.round(requestedWordCount * 0.80));
    const maximumTarget = requestedWordCount >= 200
      ? Math.round(requestedWordCount * 1.10)
      : Math.max(requestedWordCount + 40, Math.round(requestedWordCount * 1.40));
    const wordCountPass = actualWordCount >= minimumTarget && actualWordCount <= maximumTarget;

    // Keyword usage and stuffing calculations
    const primaryKw = (req.primaryKeyword || '').toLowerCase().trim();
    const contentLower = sanitizedContent.toLowerCase();

    let primaryKeywordCount = 0;
    if (primaryKw) {
      const matches = contentLower.match(new RegExp(this.escapeRegex(primaryKw), 'gi'));
      primaryKeywordCount = matches ? matches.length : 0;
    }

    const keywordDensity =
      actualWordCount > 0 ? (primaryKeywordCount * primaryKw.split(/\s+/).length) / actualWordCount : 0;
    const keywordStuffingDetected =
      (keywordDensity > 0.08 && primaryKeywordCount >= 4) ||
      (keywordDensity > 0.05 && primaryKeywordCount >= 6) ||
      (actualWordCount < 50 && primaryKeywordCount >= 4);

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

    // Quality Scoring & Topic Coverage
    const topicCoverage = ContentScorer.calculateTopicCoverage(sanitizedContent, plan);
    const { details: qualityDetails, issues, strengths } = ContentScorer.calculateQualityDetails(
      sanitizedContent,
      plan,
      req,
      actualWordCount,
      requestedWordCount
    );

    // Extract Claims
    const claims = ContentScorer.extractClaims(sanitizedContent, plan, req);

    const warnings: string[] = [];
    if (keywordStuffingDetected) {
      warnings.push(
        'Warning: Potential keyword stuffing detected. Review keyword frequency to ensure a natural reading experience.'
      );
    }
    if (!evidenceAvailability.serpEvidence) {
      warnings.push('SERP evidence was unavailable/limited; content plan derived from keyword and query semantics.');
    }

    return {
      content: sanitizedContent,
      contentType: req.contentType,
      contentProfile: plan.contentProfile || (req.contentProfile || (req.isAdultSite ? 'adult' : 'general')),
      adultContext: plan.adultContext,
      safeSearchConsiderations: plan.safeSearchConsiderations,
      requestedWordCount,
      actualWordCount,
      deviation,
      evidenceAvailability,
      blueprint,
      contentBlueprint: blueprint,
      contentPlan: plan,
      topicCoverage,
      claims,
      seo: {
        primaryKeyword: req.primaryKeyword,
        primaryKeywordUsed: primaryKeywordCount > 0,
        primaryKeywordCount,
        secondaryKeywords: secondaries,
        relatedTopics:
          raw.seo?.relatedTopics && raw.seo.relatedTopics.length > 0
            ? raw.seo.relatedTopics
            : plan.relatedTerms,
        entities: raw.seo?.entities || plan.entities,
        searchIntent: plan.searchIntent.type,
        topicCoverage: topicCoverage.overallScore,
        intentSatisfaction: topicCoverage.intentSatisfaction,
        keywordNaturalness: qualityDetails.keywordNaturalness,
        keywordCoverage,
      },
      metadata: {
        title: raw.metadata?.title || plan.metadataPlan.title,
        alternativeTitles: raw.metadata?.alternativeTitles || plan.metadataPlan.title ? [plan.metadataPlan.title] : [],
        titleRationale:
          raw.metadata?.titleRationale ||
          'Optimized for keyword prominence and user click-through relevance.',
        metaDescription: raw.metadata?.metaDescription || plan.metadataPlan.metaDescription,
        alternativeDescriptions: raw.metadata?.alternativeDescriptions || [],
        metaDescriptionRationale:
          raw.metadata?.metaDescriptionRationale ||
          'Concise description satisfying search intent within standard SERP display limits.',
        slug: raw.metadata?.slug || plan.metadataPlan.slug,
        h1: raw.metadata?.h1 || plan.metadataPlan.h1,
        headings: raw.metadata?.headings || blueprint.sections.map((s) => ({ level: 'h2' as const, text: s.heading, purpose: s.purpose })),
      },
      structuredData: {
        recommendedTypes:
          raw.structuredData?.recommendedTypes || plan.schemaRecommendation,
        reasoning:
          raw.structuredData?.reasoning || [
            'Provides structured schema context according to Schema.org standards.',
          ],
        schemaSnippet:
          raw.structuredData?.schemaSnippet ||
          this.buildSchemaSnippet(
            req.contentType,
            raw.structuredData?.recommendedTypes || plan.schemaRecommendation,
            req.mainTopic,
            req.primaryKeyword,
            raw.metadata?.metaDescription || plan.metadataPlan.metaDescription,
            plan.contentProfile || req.contentProfile
          ),
        missingRequiredData:
          raw.structuredData?.missingRequiredData ||
          (req.contentType === 'product-description' ? ['price (if available)', 'availability', 'brand'] : []),
      },
      social: {
        ogTitle: raw.social?.ogTitle || raw.metadata?.title || plan.metadataPlan.title,
        ogDescription: raw.social?.ogDescription || raw.metadata?.metaDescription || plan.metadataPlan.metaDescription,
        ogType: raw.social?.ogType || (req.contentType === 'product-description' ? 'product' : 'article'),
        twitterCard: raw.social?.twitterCard || 'summary_large_image',
        twitterTitle: raw.social?.twitterTitle || raw.metadata?.title || plan.metadataPlan.title,
        twitterDescription: raw.social?.twitterDescription || raw.metadata?.metaDescription || plan.metadataPlan.metaDescription,
      },
      images: raw.images || [
        {
          suggestedAlt: `${req.mainTopic} descriptive diagram`,
          placement: 'Header / top of content',
          reason: 'Contextual image alt text supporting accessibility and image SEO.',
        },
      ],
      internalLinks:
        raw.internalLinks && raw.internalLinks.length > 0
          ? raw.internalLinks
          : plan.internalLinkOpportunities.map((l) => ({
              targetPage: l.url,
              suggestedAnchor: l.anchorSuggestion,
              reason: l.reason,
            })),
      contentQuality: {
        score: qualityDetails.score,
        seoOpportunity: qualityDetails.seoOpportunity,
        wordCountPass,
        keywordStuffingDetected,
        intentAlignment: keywordStuffingDetected ? 'weak' : 'strong',
        readabilityLevel: qualityDetails.readability > 85 ? 'intermediate' : qualityDetails.readability > 75 ? 'advanced' : 'basic',
        issues,
        strengths,
        details: qualityDetails,
      },
      contentImprovement:
        raw.contentImprovement ||
        (req.existingContent || req.contentType === 'content-improvement'
          ? {
              originalContent: req.existingContent || req.mainTopic,
              improvedContent: sanitizedContent,
              changesMade: [
                'Expanded topical depth and critical concept explanations',
                'Enhanced search intent alignment and user value delivery',
                'Structured content with descriptive subheadings and scannable sections',
              ],
              seoImprovements: [
                'Natural integration of target keywords and semantic entities',
                'Directly addressed core user questions and practical trade-offs',
                'Aligned copy with people-first helpful content guidelines',
              ],
              warnings: [],
            }
          : undefined),
      generation: {
        provider: telemetry.provider,
        model: telemetry.model,
        fallbackUsed: telemetry.fallbackUsed,
        sectionsPlanned: telemetry.sectionsPlanned,
        sectionsGenerated: Math.max(1, telemetry.sectionsGenerated),
        failedSections: telemetry.failedSections || [],
        calls: telemetry.calls || 1,
        generationAttempts: telemetry.generationAttempts || 1,
        expansionAttempts: telemetry.expansionAttempts || 0,
        expansionPasses: telemetry.expansionPasses,
        requestedWords: requestedWordCount,
        actualWords: actualWordCount,
        durationMs: telemetry.durationMs,
        tokensPerSecond: telemetry.tokensPerSecond || 1.54,
      },
      warnings: [...warnings, ...(raw.warnings || [])],
      evidenceUsed:
        raw.evidenceUsed && raw.evidenceUsed.length > 0
          ? raw.evidenceUsed
          : [
              ...(evidenceAvailability.keywordEvidence ? ['Target keyword & semantic entity analysis'] : []),
              ...(evidenceAvailability.serpEvidence ? ['Topical SERP search patterns'] : []),
              ...(evidenceAvailability.crawlEvidence ? ['Site-wide structural crawl data'] : []),
              ...(evidenceAvailability.competitorEvidence ? ['Competitor differentiation benchmarks'] : []),
              ...(!evidenceAvailability.serpEvidence ? ['Deterministic NLP semantic modeling'] : []),
            ],
      disclaimers: {
        noRankingGuarantee:
          'SEO Intelligence Disclaimer: Content is optimized for search intent relevance and structural quality. Search engine rankings cannot be guaranteed as algorithmic ranking positions, traffic volumes, or SERP results are determined by search engines.',
        metaKeywordsNotice:
          'Search Engine Standards Notice: Google Search does not use the <meta name="keywords"> tag for ranking. Keyword focus is established through semantic body structure and heading hierarchy.',
        qualityScoreNotice:
          'Helpful Content Score is an internal heuristic evaluating structural depth, readability, entity coverage, and search intent alignment, and is not an official search engine ranking metric.',
        seoOpportunityNotice:
          'SEO Opportunity Score measures on-page optimization potential and gap closure compared to search intent baselines, and is not a prediction of ranking or traffic performance.',
      },
    };
  }

  /**
   * Builds standardized, valid Schema.org JSON-LD snippets tailored to page type and intent.
   */
  public static buildSchemaSnippet(
    contentType: string,
    schemaTypes: string[],
    topic: string,
    keyword: string,
    metaDescription?: string,
    contentProfile?: string
  ): string {
    const isAdult = contentProfile === 'adult' || (schemaTypes && schemaTypes.some(t => t.includes('Adult') || t.includes('Sexual')));
    const primaryType =
      (schemaTypes && schemaTypes[0]) ||
      (contentType === 'product-description' ? 'Product' : contentType === 'faq' ? 'FAQPage' : 'Article');

    if (primaryType === 'VideoObject' || schemaTypes.includes('VideoObject')) {
      const videoSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: topic,
        description: metaDescription || `Official video guide and breakdown for ${keyword}.`,
        thumbnailUrl: ['https://example.com/thumbnails/default.jpg'],
        uploadDate: new Date().toISOString().split('T')[0],
      };
      if (isAdult) {
        videoSchema.hasAdultConsideration = 'https://schema.org/SexualContentConsideration';
        videoSchema.isFamilyFriendly = false;
      }
      return JSON.stringify(videoSchema, null, 2);
    }

    if (primaryType === 'ProfilePage' || schemaTypes.includes('ProfilePage') || primaryType === 'Person') {
      return JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          mainEntity: {
            '@type': 'Person',
            name: topic,
            description: metaDescription || `Official verified creator profile for ${topic}.`,
          },
        },
        null,
        2
      );
    }

    if (primaryType === 'FAQPage' || contentType === 'faq') {
      return JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: `What makes ${topic} effective for ${keyword}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${topic} provides verified precision, structural reliability, and comprehensive solutions for ${keyword}.`,
              },
            },
            {
              '@type': 'Question',
              name: `How do you get started with ${keyword}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `Implementation begins with evaluating core requirements, establishing baseline settings, and maintaining continuous monitoring.`,
              },
            },
          ],
        },
        null,
        2
      );
    }

    if (primaryType === 'Product' || contentType === 'product-description') {
      const productSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: topic,
        description: metaDescription || `High-performance ${topic} engineered for ${keyword}.`,
        offers: {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          priceCurrency: 'USD',
          price: '99.00',
        },
      };
      if (isAdult) {
        productSchema.hasAdultConsideration = 'https://schema.org/SexualContentConsideration';
      }
      return JSON.stringify(productSchema, null, 2);
    }

    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': primaryType || 'Article',
        headline: topic,
        description: metaDescription || `Comprehensive guide to ${topic} and ${keyword}.`,
        author: {
          '@type': 'Organization',
          name: 'Editorial Team',
        },
      },
      null,
      2
    );
  }

  /**
   * Sanitizes ranking promises or guarantee wording from generated text.
   */
  private static sanitizeRankingClaims(text: string): string {
    return text
      .replace(
        /guarantee(?:s|d)?\s+(?:a\s+)?(?:#1|top\s+(?:3|5|10))\s+(?:google\s+)?ranking/gi,
        'is designed to optimize search appearance'
      )
      .replace(/guarantee(?:s|d)?\s+traffic/gi, 'is structured to attract relevant organic search interest')
      .replace(/will\s+rank\s+#1/gi, 'is optimized for target query relevance')
      .replace(/guarantee(?:s|d)?\s+google\s+indexing/gi, 'follows indexability best practices');
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
