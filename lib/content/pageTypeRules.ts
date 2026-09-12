import {
  PageType,
  PageTypeContentRuleAssessment,
  ContentBlock,
  HeadingContentRelationship,
  ContentDepthAssessment,
} from '@/types';

interface PageTypeRuleInput {
  pageType: PageType;
  mainContentText: string;
  blocks: ContentBlock[];
  headingRelationships: HeadingContentRelationship;
  contentDepth: ContentDepthAssessment;
}

/**
 * Evaluates contextual, page-type-specific content quality rules.
 * Never imposes article depth requirements on contact or product pages.
 */
export function evaluatePageTypeRules(input: PageTypeRuleInput): PageTypeContentRuleAssessment {
  const { pageType, mainContentText, blocks, headingRelationships, contentDepth } = input;
  const lower = (mainContentText || '').toLowerCase();
  const rulesEvaluated: Array<{ ruleName: string; passed: boolean; observation: string; impact: string }> = [];

  switch (pageType) {
    case 'ARTICLE': {
      // Rule 1: Structured Headings
      const hasHeadings = headingRelationships.totalHeadings >= 2;
      rulesEvaluated.push({
        ruleName: 'Article Subtopic Structure',
        passed: hasHeadings,
        observation: hasHeadings
          ? `Article has ${headingRelationships.totalHeadings} headings structuring the narrative.`
          : 'Article lacks sufficient sub-headings to structure the content.',
        impact: hasHeadings ? 'Positive readability and crawlability.' : 'Monolithic walls of text reduce reader engagement.',
      });

      // Rule 2: Substantive Depth
      const adequateDepth = contentDepth.isAdequateForPageType;
      rulesEvaluated.push({
        ruleName: 'Editorial Depth',
        passed: adequateDepth,
        observation: adequateDepth
          ? `Article contains ${contentDepth.mainWordCount} words with substantial explanatory depth.`
          : `Article is thin (${contentDepth.mainWordCount} words; editorial benchmark is 300+ words).`,
        impact: adequateDepth ? 'Demonstrates topical authority.' : 'May fail to satisfy deep informational queries.',
      });

      // Rule 3: Heading Support
      const supportedRatio =
        headingRelationships.totalHeadings > 0
          ? headingRelationships.supportedHeadingsCount / headingRelationships.totalHeadings
          : 1;
      const headingsSupported = supportedRatio >= 0.75;
      rulesEvaluated.push({
        ruleName: 'Heading Content Support',
        passed: headingsSupported,
        observation: headingsSupported
          ? 'Headings are backed by substantive paragraphs.'
          : `${headingRelationships.unsupportedHeadingsCount} heading(s) lack supporting content.`,
        impact: headingsSupported ? 'High structural integrity.' : 'Empty headings produce low content satisfaction.',
      });
      break;
    }

    case 'PRODUCT': {
      // Rule 1: Product Specifications & Description
      const hasSpecs = blocks.some((b) => b.type === 'product_spec' || b.type === 'table' || b.type === 'list') || lower.includes('spec') || lower.includes('dimension') || lower.includes('feature');
      rulesEvaluated.push({
        ruleName: 'Product Feature & Spec Breakdown',
        passed: hasSpecs,
        observation: hasSpecs
          ? 'Product features, specifications, or details are explicitly outlined.'
          : 'Product lacks structured specification lists or detailed feature descriptions.',
        impact: hasSpecs ? 'Assists buyer evaluation and product schema alignment.' : 'Incomplete product details reduce conversion.',
      });

      // Rule 2: Commercial Clarity (price, buy, stock)
      const hasCommercialMarkers = /(\$|\€|\£|in stock|buy|cart|order|price)/i.test(mainContentText);
      rulesEvaluated.push({
        ruleName: 'Purchase / Transactional Clarity',
        passed: hasCommercialMarkers,
        observation: hasCommercialMarkers
          ? 'Clear purchasing markers (pricing, availability, or cart actions) detected.'
          : 'Page lacks clear transactional/availability indicators.',
        impact: hasCommercialMarkers ? 'Smooth user path to conversion.' : 'User purchasing friction.',
      });
      break;
    }

    case 'CONTACT': {
      // Rule 1: Clear Communication Channels
      const hasChannels = /(@|\bphone\b|\btel\b|\bemail\b|\bcall\b|\bmessage\b|\baddress\b)/i.test(lower);
      rulesEvaluated.push({
        ruleName: 'Visible Contact Coordinates',
        passed: hasChannels,
        observation: hasChannels
          ? 'Direct contact channels (email, phone, address, or form) are clearly displayed.'
          : 'Page does not present clear contact coordinates.',
        impact: hasChannels ? 'Satisfies user contact intent immediately.' : 'Frustrates users seeking support/inquiries.',
      });
      break;
    }

    case 'FAQ': {
      // Rule 1: Q&A Pairs
      const hasQaPairs = blocks.some((b) => b.type === 'faq_qa') || headingRelationships.totalHeadings >= 2 || lower.includes('q:') || lower.includes('question:');
      rulesEvaluated.push({
        ruleName: 'Question & Answer Architecture',
        passed: hasQaPairs,
        observation: hasQaPairs
          ? 'Content is formatted into distinct questions and answers.'
          : 'FAQ page lacks distinct question-and-answer pairs.',
        impact: hasQaPairs ? 'Optimized for FAQ schema and direct answer extraction.' : 'Poor question scannability.',
      });
      break;
    }

    case 'DOCUMENTATION': {
      // Rule 1: Technical Explanations & Examples
      const hasTechStructure = blocks.some((b) => b.type === 'table' || b.type === 'list') || lower.includes('example') || lower.includes('parameter') || lower.includes('return') || lower.includes('step');
      rulesEvaluated.push({
        ruleName: 'Technical Guidance & Structure',
        passed: hasTechStructure,
        observation: hasTechStructure
          ? 'Documentation includes structured lists, tables, or step-by-step technical guidance.'
          : 'Documentation lacks structured technical breakdown or code examples.',
        impact: hasTechStructure ? 'Enables developer implementation.' : 'Ambiguous technical reference.',
      });
      break;
    }

    case 'SERVICE': {
      // Rule 1: Service Value Proposition & Offerings
      const hasOfferings = headingRelationships.totalHeadings >= 1 && (lower.includes('service') || lower.includes('we offer') || lower.includes('pricing') || lower.includes('how it works') || lower.includes('quote'));
      rulesEvaluated.push({
        ruleName: 'Service Offering Clarity',
        passed: hasOfferings,
        observation: hasOfferings
          ? 'Service scope, process, or value proposition is clearly defined.'
          : 'Service page lacks structured explanation of service offerings.',
        impact: hasOfferings ? 'Builds client trust and clarifies scope.' : 'Vague service scope.',
      });
      break;
    }

    case 'LOCAL_BUSINESS': {
      // Rule 1: Location & Hours
      const hasLocationSignals = lower.includes('hours') || lower.includes('address') || lower.includes('location') || lower.includes('street') || lower.includes('city') || lower.includes('mon-') || lower.includes('open');
      rulesEvaluated.push({
        ruleName: 'Local Operating Details',
        passed: hasLocationSignals,
        observation: hasLocationSignals
          ? 'Operating hours, physical address, or local service area clearly stated.'
          : 'Missing physical address or operating schedule indicators.',
        impact: hasLocationSignals ? 'Strengthens local search alignment.' : 'Local users cannot verify store hours/location.',
      });
      break;
    }

    default: {
      // General Quality Rule
      const hasBody = contentDepth.mainWordCount >= 50;
      rulesEvaluated.push({
        ruleName: 'Core Content Substance',
        passed: hasBody,
        observation: hasBody
          ? `Page has ${contentDepth.mainWordCount} words of main content.`
          : 'Page contains minimal visible content text.',
        impact: hasBody ? 'Provides baseline informational value.' : 'Thin content risk.',
      });
      break;
    }
  }

  const passedCount = rulesEvaluated.filter((r) => r.passed).length;
  const failedCount = rulesEvaluated.filter((r) => !r.passed).length;
  const summary = failedCount === 0
    ? `Passed all ${passedCount} page-specific quality rules for ${pageType}.`
    : `Failed ${failedCount} of ${rulesEvaluated.length} quality rules for ${pageType}.`;

  return {
    pageType,
    rulesEvaluated,
    passedCount,
    failedCount,
    summary,
  };
}
