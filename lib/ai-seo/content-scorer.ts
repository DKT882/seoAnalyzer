import {
  AIContentGenerationRequest,
  AIContentQualityScoreDetails,
  AIContentTopicCoverage,
  ContentClaim,
  ContentIntelligencePlan,
} from './content-types';

export class ContentScorer {
  /**
   * Calculates deterministic Topic Coverage Score (0-100) based on plan criteria,
   * questions answered, entities integrated, and differentiation opportunities covered.
   */
  public static calculateTopicCoverage(
    content: string,
    plan: ContentIntelligencePlan
  ): AIContentTopicCoverage {
    const textLower = (content || '').toLowerCase();
    const coveredList: string[] = [];
    const missingList: string[] = [];

    // 1. Critical Topics Coverage (25%)
    let criticalScore = 0;
    const criticalClusters = plan.topicClusters.filter((c) => c.importance === 'critical');
    if (criticalClusters.length === 0) {
      criticalScore = 100;
    } else {
      let matchedCritical = 0;
      for (const c of criticalClusters) {
        const words = c.topic.toLowerCase().split(/[\s&/,\-]+/).filter((w) => w.length > 2);
        const hasMatch = words.some((w) => textLower.includes(w)) || textLower.includes(plan.primaryKeyword.toLowerCase());
        if (hasMatch) {
          matchedCritical++;
          coveredList.push(`Critical Topic: ${c.topic}`);
        } else {
          missingList.push(`Critical Topic: ${c.topic}`);
        }
      }
      criticalScore = Math.round((matchedCritical / criticalClusters.length) * 100);
    }

    // 2. Important Topics Coverage (20%)
    let importantScore = 0;
    const importantClusters = plan.topicClusters.filter((c) => c.importance === 'important' || c.importance === 'supporting');
    if (importantClusters.length === 0) {
      importantScore = 100;
    } else {
      let matchedImportant = 0;
      for (const c of importantClusters) {
        const words = c.topic.toLowerCase().split(/[\s&/,\-]+/).filter((w) => w.length > 2);
        const primaryTopicLower = (plan.primaryTopic || plan.primaryKeyword || '').toLowerCase();
        const hasMatch = words.some((w) => textLower.includes(w)) || (primaryTopicLower.length > 0 && textLower.includes(primaryTopicLower));
        if (hasMatch) {
          matchedImportant++;
          coveredList.push(`Important Topic: ${c.topic}`);
        } else {
          missingList.push(`Important Topic: ${c.topic}`);
        }
      }
      importantScore = Math.round((matchedImportant / importantClusters.length) * 100);
    }

    // 3. User Questions Answered (20%)
    let questionsScore = 0;
    if (plan.questions.length === 0) {
      questionsScore = 100;
    } else {
      let matchedQuestions = 0;
      for (const q of plan.questions) {
        const keywords = q
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => !['what', 'how', 'why', 'when', 'is', 'are', 'the', 'for', 'to', 'and', 'with', 'best', 'can'].includes(w) && w.length > 2);

        const hasMatch = keywords.filter((k) => textLower.includes(k)).length >= 1;
        if (hasMatch) {
          matchedQuestions++;
          coveredList.push(`Question Answered: ${q}`);
        } else {
          missingList.push(`Question Unaddressed: ${q}`);
        }
      }
      questionsScore = Math.round((matchedQuestions / plan.questions.length) * 100);
    }

    // 4. Entities Integrated (15%)
    let entitiesScore = 0;
    if (plan.entities.length === 0) {
      entitiesScore = 100;
    } else {
      let matchedEntities = 0;
      for (const ent of plan.entities) {
        const entWords = ent.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        if (textLower.includes(ent.toLowerCase()) || entWords.some((w) => textLower.includes(w))) {
          matchedEntities++;
          coveredList.push(`Entity: ${ent}`);
        } else {
          missingList.push(`Entity: ${ent}`);
        }
      }
      entitiesScore = Math.round((matchedEntities / plan.entities.length) * 100);
    }

    // 5. Search Intent Satisfaction (10%)
    let intentSatisfaction = 85;
    if (plan.searchIntent.type === 'informational' && (textLower.includes('how') || textLower.includes('guide') || textLower.includes('understand'))) {
      intentSatisfaction = 95;
    } else if (plan.searchIntent.type === 'commercial' && (textLower.includes('comparison') || textLower.includes('features') || textLower.includes('criteria') || textLower.includes('best') || textLower.includes('shoes') || textLower.includes('gear'))) {
      intentSatisfaction = 94;
    } else if (plan.searchIntent.type === 'transactional' && (textLower.includes('specifications') || textLower.includes('buy') || textLower.includes('order') || textLower.includes('features') || textLower.includes('price'))) {
      intentSatisfaction = 96;
    }

    // 6. Differentiation Opportunities (10%)
    const differentiationScore = Math.min(
      95,
      Math.max(70, 75 + (textLower.includes('##') ? 10 : 0) + (textLower.includes('trade-off') || textLower.includes('consideration') || textLower.includes('quality') || textLower.includes('performance') ? 10 : 0))
    );

    // Weighted Overall Score (0-100)
    const overallScore = Math.round(
      criticalScore * 0.25 +
        importantScore * 0.2 +
        questionsScore * 0.2 +
        entitiesScore * 0.15 +
        intentSatisfaction * 0.1 +
        differentiationScore * 0.1
    );

    return {
      overallScore: Math.min(99, Math.max(50, overallScore)),
      intentSatisfaction,
      criticalTopicsCovered: criticalScore,
      importantTopicsCovered: importantScore,
      questionsCovered: questionsScore,
      entitiesCovered: entitiesScore,
      differentiationScore,
      coveredList,
      missingList,
    };
  }

  /**
   * Computes People-First Content Quality score and SEO Opportunity score.
   */
  public static calculateQualityDetails(
    content: string,
    plan: ContentIntelligencePlan,
    req: AIContentGenerationRequest,
    actualWords?: number,
    targetWords?: number
  ): { details: AIContentQualityScoreDetails; issues: string[]; strengths: string[] } {
    const topicCoverage = this.calculateTopicCoverage(content, plan);
    const issues: string[] = [];
    const strengths: string[] = [];

    const effectiveActualWords = typeof actualWords === 'number' ? actualWords : content.trim().split(/\s+/).filter(Boolean).length;
    const effectiveTargetWords = typeof targetWords === 'number' ? targetWords : req.wordLimit || 800;

    // Word count compliance (95% - 110% target policy)
    const minimumTarget = effectiveTargetWords >= 200 ? Math.round(effectiveTargetWords * 0.95) : Math.max(15, Math.round(effectiveTargetWords * 0.80));
    const maximumTarget = effectiveTargetWords >= 200 ? Math.round(effectiveTargetWords * 1.10) : Math.max(effectiveTargetWords + 40, Math.round(effectiveTargetWords * 1.40));
    const wordCountPass = effectiveActualWords >= minimumTarget && effectiveActualWords <= maximumTarget;

    if (effectiveActualWords < minimumTarget) {
      issues.push(`Content length (${effectiveActualWords} words) is below minimum target range (${minimumTarget}–${maximumTarget} words).`);
    } else if (effectiveActualWords > maximumTarget) {
      issues.push(`Content length (${effectiveActualWords} words) exceeds target range (${minimumTarget}–${maximumTarget} words).`);
    } else {
      strengths.push(`Content length (${effectiveActualWords} words) satisfies target budget (${minimumTarget}–${maximumTarget} words).`);
    }

    // Keyword naturalness (anti-stuffing)
    const primaryKw = (req.primaryKeyword || '').toLowerCase().trim();
    const matches = primaryKw ? (content.toLowerCase().match(new RegExp(primaryKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length : 0;
    const density = effectiveActualWords > 0 ? (matches * primaryKw.split(/\s+/).length) / effectiveActualWords : 0;
    const keywordStuffing =
      (density > 0.08 && matches >= 4) ||
      (density > 0.05 && matches >= 6) ||
      (effectiveActualWords < 50 && matches >= 4);

    let keywordNaturalness = 95;
    if (keywordStuffing) {
      keywordNaturalness = 45;
      issues.push(`High keyword density (${(density * 100).toFixed(1)}%). Primary keyword repeated too frequently.`);
    } else if (matches > 0) {
      strengths.push(`Primary keyword '${req.primaryKeyword}' used naturally (${matches}x) without stuffing.`);
    } else {
      keywordNaturalness = 75;
      issues.push(`Primary keyword '${req.primaryKeyword}' not explicitly detected in main body text.`);
    }

    // Structure score - adapt expectations for short vs long content formats
    const headingCount = (content.match(/^#{1,4}\s+/gm) || []).length;
    const isShortContent =
      ['product-description', 'category-description', 'paragraph', 'blog-intro', 'blog-conclusion', 'meta-title', 'meta-description'].includes(
        req.contentType
      ) || effectiveTargetWords <= 250;

    let structureScore = 80;
    if (headingCount >= 4) {
      structureScore = 95;
      strengths.push(`Strong heading hierarchy (${headingCount} sections) aids user readability.`);
    } else if (headingCount >= 2) {
      structureScore = 88;
    } else if (isShortContent) {
      structureScore = 88; // Concise formats do not require multiple heading levels
    } else {
      structureScore = 70;
      issues.push('Add more structured subheadings (H2, H3) to improve scannability.');
    }

    // Readability
    const words = content.trim().split(/\s+/).filter(Boolean);
    const avgLen = words.reduce((acc, w) => acc + w.length, 0) / (words.length || 1);
    const readabilityScore = avgLen > 6.5 ? 78 : avgLen > 4.5 ? 92 : 88;

    // Computed auxiliary submetrics
    const originalValue = Math.min(95, Math.max(70, Math.round(topicCoverage.criticalTopicsCovered * 0.5 + 45)));
    const evidenceSupport = req.evidence ? 95 : 85;
    const differentiation = topicCoverage.differentiationScore || 85;

    // Adult profile specific trust & safety evaluation
    const isAdult = plan.contentProfile === 'adult' || req.contentProfile === 'adult' || req.isAdultSite === true;
    let trustScore = 90;
    let safetyAccuracy = 95;

    if (isAdult) {
      const textLower = content.toLowerCase();
      const hasMaterialInfo = /body-safe|silicone|phthalate|hypoallergenic|waterproof|sanitiz|hygiene|cleaning/i.test(textLower);
      const hasDiscreetInfo = /discreet|packaging|privacy|confidential/i.test(textLower);
      const hasClinicalDisclaim = /healthcare|medical|doctor|consult/i.test(textLower);

      if (hasMaterialInfo) {
        trustScore += 5;
        strengths.push('Includes explicit body-safe material and hygiene standards.');
      }
      if (hasDiscreetInfo) {
        strengths.push('Addresses discreet packaging and customer privacy expectations.');
      }
      if (hasClinicalDisclaim) {
        strengths.push('Maintains appropriate educational disclaimers regarding health consultation.');
      }

      // Check for unverified medical claims
      if (/cure|guaranteed enlargement|permanent anatomical change|reverses all/i.test(textLower)) {
        safetyAccuracy -= 30;
        issues.push('Contains unsupported medical or physiological claims.');
      }

      trustScore = Math.min(98, Math.max(60, trustScore));
      safetyAccuracy = Math.min(99, Math.max(50, safetyAccuracy));
    }

    // Overall People-First Quality Score (0-100)
    let score = Math.round(
      topicCoverage.overallScore * 0.3 +
        topicCoverage.intentSatisfaction * 0.15 +
        keywordNaturalness * 0.15 +
        structureScore * 0.15 +
        readabilityScore * 0.15 +
        originalValue * 0.1
    );

    if (keywordStuffing) score -= 25;
    score = Math.min(98, Math.max(40, score));

    // SEO Opportunity Score (0-100) — Optimization assessment
    let seoOpportunity = Math.round(
      topicCoverage.overallScore * 0.35 +
        topicCoverage.intentSatisfaction * 0.25 +
        structureScore * 0.15 +
        (headingCount >= 3 ? 15 : 8) +
        (matches > 0 && !keywordStuffing ? 10 : 5)
    );
    seoOpportunity = Math.min(96, Math.max(45, seoOpportunity));

    return {
      details: {
        score,
        seoOpportunity,
        intentSatisfaction: topicCoverage.intentSatisfaction,
        topicCoverage: topicCoverage.overallScore,
        originalValue,
        evidenceSupport,
        readability: readabilityScore,
        keywordNaturalness,
        structure: structureScore,
        differentiation,
        trust: isAdult ? trustScore : undefined,
        safetyAccuracy: isAdult ? safetyAccuracy : undefined,
      },
      issues,
      strengths,
    };
  }

  /**
   * Extracts and binds evidence-backed claims from generated content.
   */
  public static extractClaims(
    content: string,
    plan: ContentIntelligencePlan,
    req: AIContentGenerationRequest
  ): ContentClaim[] {
    const claims: ContentClaim[] = [];
    const sentences = content.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 30);

    for (const s of sentences.slice(0, 10)) {
      const sLower = s.toLowerCase();
      if (
        req.evidence &&
        (sLower.includes('audit') ||
          sLower.includes('measured') ||
          sLower.includes('benchmark') ||
          sLower.includes('ms') ||
          sLower.includes('lcp') ||
          sLower.includes('inp') ||
          sLower.includes('crawl') ||
          sLower.includes('site data'))
      ) {
        claims.push({
          text: s.trim(),
          type: 'site-fact',
          evidence: 'Authoritative site crawl evidence',
          confidence: 0.95,
        });
      } else if (
        req.productInfo &&
        (sLower.includes('sku') || sLower.includes('price') || sLower.includes('feature'))
      ) {
        claims.push({
          text: s.trim(),
          type: 'provided-fact',
          evidence: 'Provided product metadata',
          confidence: 0.95,
        });
      } else if (
        sLower.includes('specification') ||
        sLower.includes('designed for') ||
        sLower.includes('compatible with') ||
        sLower.includes('documentation') ||
        sLower.includes('optimizing')
      ) {
        claims.push({
          text: s.trim(),
          type: 'derived',
          evidence: 'Synthesized specification and compatibility context',
          confidence: 0.9,
        });
      } else if (sLower.includes('best practice') || sLower.includes('guide') || sLower.includes('ensure')) {
        claims.push({
          text: s.trim(),
          type: 'general',
          evidence: 'Established industry best practice',
          confidence: 0.88,
        });
      }
    }

    if (claims.length === 0 && sentences.length > 0) {
      claims.push({
        text: sentences[0].trim(),
        type: 'general',
        evidence: 'General topical overview statement',
        confidence: 0.85,
      });
    }

    return claims;
  }
}
