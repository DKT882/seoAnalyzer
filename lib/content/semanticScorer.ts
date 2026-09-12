import {
  SemanticContentScore,
  ScoreDeduction,
  ContentDepthAssessment,
  HeadingContentRelationship,
  ContentRepetitionResult,
  PageTypeContentRuleAssessment,
  TopicCoverageItem,
  SearchIntentAssessment,
  PageType,
} from '@/types';

interface ScorerInput {
  pageType: PageType;
  contentDepth: ContentDepthAssessment;
  headingRelationships: HeadingContentRelationship;
  repetition: ContentRepetitionResult;
  pageTypeRules: PageTypeContentRuleAssessment;
  primaryTopics: TopicCoverageItem[];
  searchIntent: SearchIntentAssessment;
}

/**
 * Calculates a transparent 0-100 Semantic Content Score with strict root-cause deduction deduplication.
 * Prevents compounding duplicate penalties for single underlying deficiencies (e.g. thin content).
 */
export function calculateSemanticContentScore(input: ScorerInput): SemanticContentScore {
  const {
    pageType,
    contentDepth,
    headingRelationships,
    repetition,
    pageTypeRules,
    primaryTopics,
    searchIntent,
  } = input;

  const deductions: ScoreDeduction[] = [];
  const deductedRuleCodes = new Set<string>();

  // 1. Root Cause Analysis: Thin / Minimal Content
  const isContentThin = !contentDepth.isAdequateForPageType;
  if (isContentThin) {
    const deductionPoints = contentDepth.status === 'VERY_THIN' ? 20 : 12;
    deductions.push({
      category: 'content',
      ruleCode: 'CONTENT_INSUFFICIENT_DEPTH',
      label: 'Insufficient Content Depth',
      pointsDeducted: deductionPoints,
      reason: `${contentDepth.explanation} Provides minimal substantive material for searchers.`,
    });
    deductedRuleCodes.add('CONTENT_INSUFFICIENT_DEPTH');
  }

  // 2. Heading Support & Structural Integrity (Only if not already captured by VERY_THIN root cause)
  if (headingRelationships.unsupportedHeadingsCount > 0 && contentDepth.status !== 'VERY_THIN') {
    const points = Math.min(15, headingRelationships.unsupportedHeadingsCount * 4);
    deductions.push({
      category: 'content',
      ruleCode: 'CONTENT_HEADING_WITHOUT_SUPPORT',
      label: 'Empty / Unsupported Headings',
      pointsDeducted: points,
      reason: `${headingRelationships.unsupportedHeadingsCount} heading section(s) lack supporting explanatory text.`,
    });
    deductedRuleCodes.add('CONTENT_HEADING_WITHOUT_SUPPORT');
  }

  // 3. Repetition and Spam Symptoms (Independent quality issue)
  if (repetition.isRepetitive) {
    const points = repetition.repetitiveSentencesCount >= 3 ? 15 : 8;
    deductions.push({
      category: 'content',
      ruleCode: 'CONTENT_REPETITION',
      label: 'Repetitive Content / Keyword Overuse Risk',
      pointsDeducted: points,
      reason: repetition.summary,
    });
    deductedRuleCodes.add('CONTENT_REPETITION');
  }

  // 4. Page Type Quality Rules (Deduplicate if already captured by thin content)
  if (pageTypeRules.failedCount > 0 && !deductedRuleCodes.has('CONTENT_INSUFFICIENT_DEPTH')) {
    const points = Math.min(12, pageTypeRules.failedCount * 5);
    deductions.push({
      category: 'content',
      ruleCode: 'CONTENT_STRUCTURE_WEAK',
      label: `Page Type Requirements Unmet (${pageType})`,
      pointsDeducted: points,
      reason: pageTypeRules.summary,
    });
    deductedRuleCodes.add('CONTENT_STRUCTURE_WEAK');
  }

  // Calculate Dimension Sub-Scores
  // Topical Depth (0-100)
  let topicalDepth = 85;
  if (contentDepth.status === 'DEEP') topicalDepth = 98;
  else if (contentDepth.status === 'SUBSTANTIAL') topicalDepth = 90;
  else if (contentDepth.status === 'ADEQUATE') topicalDepth = 82;
  else if (contentDepth.status === 'THIN') topicalDepth = 60;
  else if (contentDepth.status === 'VERY_THIN') topicalDepth = 35;

  // Structural Clarity (0-100)
  let structuralClarity = 90;
  if (headingRelationships.totalHeadings === 0 && pageType === 'ARTICLE') structuralClarity -= 25;
  structuralClarity -= headingRelationships.unsupportedHeadingsCount * 6;
  structuralClarity = Math.max(20, Math.min(100, structuralClarity));

  // Intent Satisfaction (0-100)
  let intentSatisfaction = 85;
  if (searchIntent.confidence === 'HIGH') intentSatisfaction += 10;
  else if (searchIntent.primaryIntent === 'UNKNOWN') intentSatisfaction -= 15;
  if (isContentThin) intentSatisfaction -= 20;
  intentSatisfaction = Math.max(20, Math.min(100, intentSatisfaction));

  // Originality & Substance (0-100)
  let originalityAndSubstance = Math.min(100, repetition.vocabularyDiversityScore);
  if (repetition.isRepetitive) originalityAndSubstance -= 25;
  originalityAndSubstance = Math.max(20, Math.min(100, originalityAndSubstance));

  // Overall Score (100 minus deduplicated deductions)
  const totalDeductions = deductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
  const overall = Math.max(10, Math.min(100, 100 - totalDeductions));

  return {
    overall,
    topicalDepth,
    structuralClarity,
    intentSatisfaction,
    originalityAndSubstance,
    deductions,
  };
}
