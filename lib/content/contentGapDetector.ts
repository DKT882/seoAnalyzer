import {
  ContentGapItem,
  PageType,
  HeadingContentRelationship,
  TopicCoverageItem,
  ContentBlock,
} from '@/types';

interface GapDetectorInput {
  pageType: PageType;
  headingRelationships: HeadingContentRelationship;
  primaryTopics: TopicCoverageItem[];
  blocks: ContentBlock[];
  mainContentText: string;
  targetKeywords?: string[];
}

/**
 * Detects observable content gaps based on explicit page signals, heading promises, and structural completeness.
 * Strictly avoids hallucinating arbitrary topic requirements.
 */
export function detectContentGaps(input: GapDetectorInput): ContentGapItem[] {
  const { pageType, headingRelationships, blocks, mainContentText, targetKeywords } = input;
  const gaps: ContentGapItem[] = [];

  // 1. Heading Promise Gaps: Headings that declare a topic but have no supporting content
  headingRelationships.headings.forEach((h) => {
    if (!h.isSupported && h.supportingWordCount < 10) {
      gaps.push({
        topic: h.headingText,
        missingAspect: 'Potential gap: Heading promised a topic section but contains no supporting explanation or content.',
        reason: 'Empty headings create structural dead ends and harm content utility.',
        priority: 'HIGH',
        confidence: 'HIGH',
        suggestedSection: h.headingText,
        evidence: `Heading "<H${h.level}>${h.headingText}</H${h.level}>" has ${h.supportingWordCount} words in its section.`,
      });
    }
  });

  // 2. Introduction Structural Gap (For articles and documentation)
  if (pageType === 'ARTICLE' || pageType === 'DOCUMENTATION') {
    const firstNonHeadingBlock = blocks.find((b) => b.isMainContent && b.type === 'paragraph');
    if (!firstNonHeadingBlock || firstNonHeadingBlock.wordCount < 20) {
      gaps.push({
        topic: 'Introductory Context',
        missingAspect: 'Potential gap: Article/guide lacks a substantive opening introduction defining the page topic.',
        reason: 'A clear introduction contextualizes the topic for searchers before delving into sub-headings.',
        priority: 'MEDIUM',
        confidence: 'MEDIUM',
        suggestedSection: 'Introduction',
        evidence: firstNonHeadingBlock
          ? `Opening paragraph contains only ${firstNonHeadingBlock.wordCount} words.`
          : 'No introductory paragraph found before sub-sections.',
      });
    }
  }

  // 3. Explicit Target Keyword Gaps (when provided by user)
  if (targetKeywords && targetKeywords.length > 0) {
    const lowerBody = (mainContentText || '').toLowerCase();
    targetKeywords.forEach((tk) => {
      const clean = tk.trim().toLowerCase();
      if (!clean) return;
      if (!lowerBody.includes(clean)) {
        gaps.push({
          topic: tk,
          missingAspect: `Potential gap: Target keyword "${tk}" is not present in main body content.`,
          reason: 'User designated this as a primary target keyword, but it was not detected in visible content text.',
          priority: 'HIGH',
          confidence: 'HIGH',
          suggestedSection: 'Main Content Body',
          evidence: `Keyword "${tk}" found 0 times in extracted main content.`,
        });
      }
    });
  }

  // 4. Contact Coordinate Gap (Only if page is classified as CONTACT)
  if (pageType === 'CONTACT') {
    const lower = mainContentText.toLowerCase();
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(lower);
    const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(lower);
    const hasForm = lower.includes('message') || lower.includes('submit') || lower.includes('contact');

    if (!hasEmail && !hasPhone && !hasForm) {
      gaps.push({
        topic: 'Direct Contact Method',
        missingAspect: 'Potential gap: No visible email address, phone number, or interactive contact form found.',
        reason: 'Contact pages require functional communication channels to satisfy user intent.',
        priority: 'HIGH',
        confidence: 'HIGH',
        suggestedSection: 'Contact Information',
        evidence: 'No contact coordinates (email, phone, form) identified in page content.',
      });
    }
  }

  return gaps;
}
