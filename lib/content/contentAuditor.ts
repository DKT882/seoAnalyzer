import {
  ContentIntelligence,
  SEOIssue,
  HeadingItem,
  SchemaItem,
} from '@/types';
import { extractContentBlocks } from './contentExtractor';
import { classifyPageType } from './pageTypeClassifier';
import { classifySearchIntent } from './intentClassifier';
import { extractTopicIntelligence } from './topicIntelligence';
import { evaluateContentDepth } from './topicalCoverage';
import { auditHeadingRelationships } from './headingRelationship';
import { detectContentGaps } from './contentGapDetector';
import { analyzeContentRepetition } from './repetitionAnalyzer';
import { evaluatePageTypeRules } from './pageTypeRules';
import { calculateSemanticContentScore } from './semanticScorer';
import { ISSUE_CODES } from '@/lib/constants';

export interface ContentAuditOptions {
  url: string;
  html: string;
  title: string;
  metaDescription: string;
  h1Text?: string;
  headings: HeadingItem[];
  schemas: SchemaItem[];
  targetKeywords?: string[];
}

/**
 * Main Content & Semantic SEO Intelligence Orchestrator.
 * Computes deep content extraction, page type classification, search intent alignment,
 * topical coverage depth, heading support, content gaps, repetition, and semantic scoring.
 */
export function auditContentAndSemantics(options: ContentAuditOptions): ContentIntelligence {
  const { url, html, title, metaDescription, h1Text, headings, schemas, targetKeywords } = options;

  // 1. Block-level content extraction & boilerplate isolation
  const extraction = extractContentBlocks(html);

  // 2. Conservative page type classification
  const pageType = classifyPageType({
    url,
    title,
    metaDescription,
    headings,
    schemas,
    mainContentText: extraction.mainContentText,
    html,
  });

  // 3. Search intent classification
  const searchIntent = classifySearchIntent({
    pageType: pageType.detectedType,
    title,
    metaDescription,
    h1Text,
    mainContentText: extraction.mainContentText,
  });

  // 4. Topic intelligence & entity extraction
  const topicIntel = extractTopicIntelligence({
    title,
    metaDescription,
    h1Text,
    headings,
    blocks: extraction.mainContentBlocks,
    mainContentText: extraction.mainContentText,
    targetKeywords,
  });

  // 5. Contextual content depth evaluation
  const contentDepth = evaluateContentDepth(
    pageType.detectedType,
    extraction.mainContentWordCount,
    extraction.mainContentBlocks
  );

  // 6. Heading-to-content relationship audit
  const headingRelationships = auditHeadingRelationships(
    headings,
    extraction.mainContentBlocks
  );

  // 7. Observable content gaps detection
  const contentGaps = detectContentGaps({
    pageType: pageType.detectedType,
    headingRelationships,
    primaryTopics: topicIntel.primaryTopics,
    blocks: extraction.mainContentBlocks,
    mainContentText: extraction.mainContentText,
    targetKeywords,
  });

  // 8. Repetition & vocabulary diversity analyzer
  const repetition = analyzeContentRepetition(
    extraction.mainContentBlocks,
    extraction.mainContentText
  );

  // 9. Page type quality rules
  const pageTypeRules = evaluatePageTypeRules({
    pageType: pageType.detectedType,
    mainContentText: extraction.mainContentText,
    blocks: extraction.mainContentBlocks,
    headingRelationships,
    contentDepth,
  });

  // 10. Semantic content score calculation with root-cause deduplication
  const score = calculateSemanticContentScore({
    pageType: pageType.detectedType,
    contentDepth,
    headingRelationships,
    repetition,
    pageTypeRules,
    primaryTopics: topicIntel.primaryTopics,
    searchIntent,
  });

  // 11. Target keyword alignment if target keywords supplied
  const isTargetMode = Boolean(targetKeywords && targetKeywords.length > 0);
  let targetKeywordAlignment: ContentIntelligence['targetKeywordAlignment'];

  if (isTargetMode && targetKeywords) {
    const matchedLocations: Record<string, string[]> = {};
    const gaps: string[] = [];
    let matchedCount = 0;

    targetKeywords.forEach((tk) => {
      const topicItem = topicIntel.primaryTopics.find(
        (t) => t.topic.toLowerCase() === tk.toLowerCase()
      ) || topicIntel.secondaryTopics.find(
        (t) => t.topic.toLowerCase() === tk.toLowerCase()
      );

      if (topicItem && topicItem.occurrences > 0) {
        matchedLocations[tk] = topicItem.locationsFound;
        matchedCount++;
      } else {
        matchedLocations[tk] = [];
        gaps.push(tk);
      }
    });

    targetKeywordAlignment = {
      targetKeywords,
      coverageRatio: Math.round((matchedCount / Math.max(1, targetKeywords.length)) * 100),
      matchedLocations,
      gaps,
    };
  }

  // 12. Generate structured recommendations
  const recommendations: SEOIssue[] = [];

  // Rec 1: Thin content
  if (!contentDepth.isAdequateForPageType) {
    recommendations.push({
      id: 'issue_content_thin',
      code: ISSUE_CODES.CONTENT_INSUFFICIENT_DEPTH,
      category: 'content',
      severity: contentDepth.status === 'VERY_THIN' ? 'CRITICAL' : 'WARNING',
      title: `Substantive Content Depth Needed for ${pageType.detectedType}`,
      description: contentDepth.explanation,
      whyItMatters:
        'Search engines prioritize comprehensive, informative pages that directly fulfill search intent. Thin content provides insufficient context and low utility.',
      recommendation: `Expand the main body content to thoroughly cover core topics relevant to a ${pageType.detectedType.toLowerCase().replace('_', ' ')}.`,
      evidence: `Extracted main content contains ${extraction.mainContentWordCount} words across ${contentDepth.sectionCount} sections.`,
      action: 'Add substantive explanatory paragraphs, relevant sub-sections, or structured details.',
      whatToChange: 'Expand thin sections with clear explanations, practical steps, or structured attributes.',
      before: `[Thin section: ~${extraction.mainContentWordCount} words with minimal explanation]`,
      after: `[Expanded section: Comprehensive details, key concepts, and structured guidance]`,
      expectedBenefit: 'Provides complete answers for search queries and strengthens topical authority.',
      caution: 'Do not pad with generic fluff or keyword-stuffed sentences. Focus on real informational value.',
      isMeasuredProblem: true,
    });
  }

  // Rec 2: Empty / unsupported headings
  if (headingRelationships.unsupportedHeadingsCount > 0) {
    const sampleEmpty = headingRelationships.headingsWithoutContent.slice(0, 2).join('", "');
    recommendations.push({
      id: 'issue_content_empty_headings',
      code: ISSUE_CODES.CONTENT_HEADING_WITHOUT_SUPPORT,
      category: 'content',
      severity: 'WARNING',
      title: 'Empty or Unsupported Headings Detected',
      description: `${headingRelationships.unsupportedHeadingsCount} heading(s) have no supporting content underneath them.`,
      whyItMatters:
        'Headings act as an outline and signpost for readers. Empty headings create dead ends in navigation and degrade content structure.',
      recommendation:
        'Add explanatory content underneath each heading or consolidate redundant headings.',
      evidence: `Empty/unsupported headings include: "${sampleEmpty}"`,
      action: 'Provide 2-3 informative paragraphs or structured lists under each heading section.',
      whatToChange: 'Populate empty heading sections with relevant details or remove unnecessary headings.',
      before: `<h3>${headingRelationships.headingsWithoutContent[0] || 'Section'}</h3>\n<h3>Next Section</h3>`,
      after: `<h3>${headingRelationships.headingsWithoutContent[0] || 'Section'}</h3>\n<p>Clear, detailed supporting information explaining this topic...</p>`,
      expectedBenefit: 'Improves reader retention and gives search crawlers explicit contextual text.',
      caution: 'Ensure the supporting content directly addresses the topic introduced in the heading.',
      isMeasuredProblem: true,
    });
  }

  // Rec 3: Repetitive phrasing / keyword overuse
  if (repetition.isRepetitive) {
    const samplePhrase = repetition.repetitivePhrases[0]?.phrase || 'repetitive text';
    recommendations.push({
      id: 'issue_content_repetition',
      code: ISSUE_CODES.CONTENT_REPETITION,
      category: 'content',
      severity: 'WARNING',
      title: 'High Content Repetition / Phrasing Redundancy',
      description: repetition.summary,
      whyItMatters:
        'Repeated sentences and phrase overuse create an unnatural reading experience and can trigger search engine spam heuristics.',
      recommendation: 'Use varied, natural vocabulary and avoid duplicate copy across sections.',
      evidence: `Repetitive instances detected: "${samplePhrase}"`,
      action: 'Rewrite duplicate sentences using natural synonyms and distinct contextual angles.',
      whatToChange: 'Replace repeated boilerplate sentences with unique explanations.',
      before: `"${samplePhrase}" repeated across multiple blocks.`,
      after: 'Distinct descriptions tailored to each specific section context.',
      expectedBenefit: 'Higher vocabulary diversity score and better reader engagement.',
      caution: 'Legitimate model numbers and brand names are expected to repeat naturally; focus on sentence-level redundancy.',
      isMeasuredProblem: true,
    });
  }

  // Rec 4: Content Gaps
  if (contentGaps.length > 0) {
    const topGap = contentGaps[0];
    recommendations.push({
      id: 'issue_content_gap',
      code: ISSUE_CODES.CONTENT_TOPIC_GAP,
      category: 'content',
      severity: topGap.priority === 'HIGH' ? 'WARNING' : 'RECOMMENDATION',
      title: `Content Gap: ${topGap.topic}`,
      description: topGap.missingAspect,
      whyItMatters: topGap.reason,
      recommendation: `Add a dedicated "${topGap.suggestedSection}" section addressing this topic.`,
      evidence: topGap.evidence,
      action: `Incorporate a new section covering "${topGap.topic}".`,
      whatToChange: `Add a section for "${topGap.suggestedSection}" with concrete details.`,
      before: `[Missing coverage for ${topGap.topic}]`,
      after: `<h3>${topGap.suggestedSection}</h3>\n<p>Substantive explanation answering user questions about ${topGap.topic}...</p>`,
      expectedBenefit: 'Closes informational gaps and satisfies search intent more completely.',
      caution: 'Ensure the new section is genuinely relevant to the page topic.',
      isMeasuredProblem: true,
    });
  }

  return {
    extraction,
    pageType,
    searchIntent,
    primaryTopics: topicIntel.primaryTopics,
    secondaryTopics: topicIntel.secondaryTopics,
    entities: topicIntel.entities,
    topicalCoverageScore: topicIntel.overallTopicScore,
    contentDepth,
    headingRelationships,
    contentGaps,
    repetition,
    pageTypeRules,
    score,
    recommendations,
    isTargetMode,
    targetKeywordAlignment,
  };
}
