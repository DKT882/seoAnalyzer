import {
  PageType,
  ContentDepthStatus,
  ContentDepthAssessment,
  ContentBlock,
} from '@/types';
import { PAGE_TYPE_DEPTH_BENCHMARKS } from '@/lib/constants';

/**
 * Contextually evaluates content depth and structure against page-type tailored benchmarks.
 * Word count is NEVER used as a standalone universal measure.
 */
export function evaluateContentDepth(
  pageType: PageType,
  mainWordCount: number,
  blocks: ContentBlock[]
): ContentDepthAssessment {
  const benchmarks = PAGE_TYPE_DEPTH_BENCHMARKS[pageType] || PAGE_TYPE_DEPTH_BENCHMARKS.UNKNOWN;

  const paragraphBlocks = blocks.filter((b) => b.isMainContent && b.type === 'paragraph');
  const sectionBlocks = blocks.filter((b) => b.isMainContent && b.type === 'heading');

  const paragraphCount = paragraphBlocks.length;
  const sectionCount = Math.max(1, sectionBlocks.length);
  const averageWordsPerSection = Math.round(mainWordCount / sectionCount);

  let status: ContentDepthStatus = 'ADEQUATE';
  let isAdequateForPageType = true;

  if (mainWordCount >= benchmarks.deepWords) {
    status = 'DEEP';
    isAdequateForPageType = true;
  } else if (mainWordCount >= benchmarks.substantialWords) {
    status = 'SUBSTANTIAL';
    isAdequateForPageType = true;
  } else if (mainWordCount >= benchmarks.minWords) {
    status = 'ADEQUATE';
    isAdequateForPageType = true;
  } else if (mainWordCount >= Math.floor(benchmarks.minWords * 0.5)) {
    status = 'THIN';
    isAdequateForPageType = false;
  } else {
    status = 'VERY_THIN';
    isAdequateForPageType = false;
  }

  // Generate clear contextual explanation
  let explanation = '';
  if (status === 'DEEP' || status === 'SUBSTANTIAL') {
    explanation = `Content provides comprehensive topical coverage (${mainWordCount} words across ${sectionCount} sections), well above expected depth for a ${pageType.toLowerCase().replace('_', ' ')}.`;
  } else if (status === 'ADEQUATE') {
    explanation = `Content depth (${mainWordCount} words) is appropriate and adequate for a ${pageType.toLowerCase().replace('_', ' ')}.`;
  } else {
    explanation = `Content depth (${mainWordCount} words) is thin for a ${pageType.toLowerCase().replace('_', ' ')} (benchmark: ~${benchmarks.minWords}+ words with substantive explanation).`;
  }

  return {
    status,
    mainWordCount,
    paragraphCount,
    sectionCount,
    averageWordsPerSection,
    isAdequateForPageType,
    explanation,
  };
}
