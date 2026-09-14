import { AIContentGenerationRequest } from './content-types';

export const ADULT_PROHIBITED_CODE = 'ADULT_PROHIBITED_CONTENT';

export interface ContentSafetyEvaluation {
  isSafe: boolean;
  violationCategory?: 'MINORS' | 'NON_CONSENSUAL' | 'EXPLOITATION' | 'TRAFFICKING' | 'INCEST' | 'COERCION' | 'UNCONSENTED_IMAGERY';
  reason?: string;
}

/**
 * Deterministic Safety Guardrail for the Adult / 18+ SEO Profile.
 * Strictly blocks generation for requests involving minors, non-consensual sexual content,
 * exploitation, trafficking, incest, coercion, or intimate imagery shared without consent.
 */
export class AdultContentSafetyGuard {
  // Prohibited safety patterns
  private static readonly PROHIBITED_RULES: Array<{
    category: ContentSafetyEvaluation['violationCategory'];
    pattern: RegExp;
    reason: string;
  }> = [
    {
      category: 'MINORS',
      pattern: /\b(underage|minor|minors|child|children|pedophil|paedophil|infant|toddler|pre-teen|preteen|kindergarten|middle school|high schooler|barely legal|school[ -]?girl|school[ -]?boy|lolita|shota|youth)\b/i,
      reason: 'Content involving minors or perceived minors is strictly prohibited.',
    },
    {
      category: 'NON_CONSENSUAL',
      pattern: /\b(non[- ]?consensual|without consent|against (her|his|their) will|forced sex|sexual assault|rape|rapist|drugged|intoxicated sex|blackmail)\b/i,
      reason: 'Non-consensual sexual content or sexual violence is strictly prohibited.',
    },
    {
      category: 'UNCONSENTED_IMAGERY',
      pattern: /\b(revenge porn|non[- ]?consensual intimate|leaked nudes|hidden cam|hidden camera|spy cam|spycam|upskirt|voyeur|creeper cam)\b/i,
      reason: 'Non-consensual intimate imagery, hidden camera, and voyeurism content are strictly prohibited.',
    },
    {
      category: 'EXPLOITATION',
      pattern: /\b(exploitation|exploitative|snuff|necrophil|beastiality|zoophil|animal sex)\b/i,
      reason: 'Severe sexual exploitation, violence, or illegal depictions are strictly prohibited.',
    },
    {
      category: 'TRAFFICKING',
      pattern: /\b(human trafficking|sex trafficking|forced prostitution|debt bondage)\b/i,
      reason: 'Human trafficking or coerced sexual labor is strictly prohibited.',
    },
    {
      category: 'INCEST',
      pattern: /\b(incest|father[- ]daughter|mother[- ]son|brother[- ]sister|sibling sex)\b/i,
      reason: 'Incestuous content is strictly prohibited.',
    },
    {
      category: 'COERCION',
      pattern: /\b(coercive|coerced|coercion|sexual extortion|sextortion)\b/i,
      reason: 'Coercive sexual content and extortion are strictly prohibited.',
    },
  ];

  /**
   * Evaluates if a content generation request is safe.
   */
  public static evaluate(request: Partial<AIContentGenerationRequest>): ContentSafetyEvaluation {
    const textCorpus = [
      request.mainTopic || '',
      request.primaryKeyword || '',
      Array.isArray(request.secondaryKeywords)
        ? request.secondaryKeywords.join(' ')
        : (request.secondaryKeywords || ''),
      Array.isArray(request.relatedTopics)
        ? request.relatedTopics.join(' ')
        : (request.relatedTopics || ''),
      request.existingContent || '',
      request.brandDescription || '',
      request.targetAudience || '',
    ].join(' ');

    for (const rule of this.PROHIBITED_RULES) {
      if (rule.pattern.test(textCorpus)) {
        return {
          isSafe: false,
          violationCategory: rule.category,
          reason: rule.reason,
        };
      }
    }

    return { isSafe: true };
  }

  /**
   * Throws a structured safety error if the request violates safety policies.
   */
  public static validateOrThrow(request: Partial<AIContentGenerationRequest>): void {
    const evaluation = this.evaluate(request);
    if (!evaluation.isSafe) {
      const err = new Error(
        `Safety policy violation [${evaluation.violationCategory}]: ${evaluation.reason} Content generation is blocked.`
      );
      (err as any).code = 'ADULT_PROHIBITED_CONTENT';
      (err as any).violationCategory = evaluation.violationCategory;
      throw err;
    }
  }
}
