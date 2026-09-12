import {
  HeadingItem,
  ContentBlock,
  HeadingSupportItem,
  HeadingContentRelationship,
} from '@/types';

/**
 * Audits the relationship between headings and their underlying supporting content.
 * Flags headings without supporting text, empty sections, and topical disconnection.
 */
export function auditHeadingRelationships(
  headings: HeadingItem[],
  blocks: ContentBlock[]
): HeadingContentRelationship {
  if (!headings || headings.length === 0) {
    return {
      totalHeadings: 0,
      supportedHeadingsCount: 0,
      unsupportedHeadingsCount: 0,
      headingsWithoutContent: [],
      headingTopicDriftCount: 0,
      headings: [],
      summary: 'No headings found on page.',
    };
  }

  const headingSupportItems: HeadingSupportItem[] = [];
  const headingsWithoutContent: string[] = [];
  let supportedCount = 0;
  let unsupportedCount = 0;
  let driftCount = 0;

  // Group blocks by headings
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== 'heading' || !block.isMainContent) continue;

    const headingText = block.text.trim();
    const headingLevel = block.headingLevel || 2;

    // Collect all supporting blocks until next heading of same or higher level (<= headingLevel)
    let supportingWords = 0;
    let subHeadings = 0;
    const contentTextParts: string[] = [];

    for (let j = i + 1; j < blocks.length; j++) {
      const nextBlock = blocks[j];
      if (nextBlock.type === 'heading') {
        const nextLevel = nextBlock.headingLevel || 2;
        if (nextLevel <= headingLevel) {
          break; // reached end of this section
        } else {
          subHeadings++;
        }
      } else if (nextBlock.isMainContent) {
        supportingWords += nextBlock.wordCount;
        contentTextParts.push(nextBlock.text.toLowerCase());
      }
    }

    const combinedSectionText = contentTextParts.join(' ');
    const hasDirectContent = supportingWords >= 10 || (subHeadings > 0 && supportingWords >= 6);
    const wordsInHeading = headingText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Check if heading keywords appear in the section text
    let matchesHeadingTopic = true;
    if (supportingWords >= 15 && wordsInHeading.length > 0) {
      const matched = wordsInHeading.some((w) => combinedSectionText.includes(w));
      if (!matched) {
        matchesHeadingTopic = false;
        driftCount++;
      }
    }

    let isSupported = true;
    let issue: string | undefined;

    if (supportingWords === 0) {
      isSupported = false;
      issue = 'Heading has no supporting content (empty heading/section).';
      headingsWithoutContent.push(headingText);
      unsupportedCount++;
    } else if (supportingWords < 10 && subHeadings === 0) {
      isSupported = false;
      issue = `Heading has minimal supporting content (${supportingWords} words).`;
      headingsWithoutContent.push(headingText);
      unsupportedCount++;
    } else if (!matchesHeadingTopic) {
      issue = 'Heading topic appears disconnected from the underlying section text.';
      supportedCount++;
    } else {
      supportedCount++;
    }

    headingSupportItems.push({
      headingText,
      level: headingLevel,
      supportingWordCount: supportingWords,
      hasDirectContent,
      subHeadingCount: subHeadings,
      keyConceptsCovered: wordsInHeading.slice(0, 4),
      isSupported,
      issue,
    });
  }

  let summary = '';
  if (unsupportedCount === 0) {
    summary = `All ${headingSupportItems.length} headings are supported by substantive content sections.`;
  } else {
    summary = `${unsupportedCount} of ${headingSupportItems.length} headings lack sufficient supporting content or are empty.`;
  }

  return {
    totalHeadings: headingSupportItems.length,
    supportedHeadingsCount: supportedCount,
    unsupportedHeadingsCount: unsupportedCount,
    headingsWithoutContent,
    headingTopicDriftCount: driftCount,
    headings: headingSupportItems,
    summary,
  };
}
