import {
  SEOScores,
  OnPageData,
  TechnicalSEO,
  LinksAnalysis,
  ImagesAnalysis,
  SEOIssue,
} from '@/types';
import { SCORING_WEIGHTS } from '@/lib/constants';

export interface ScoreCalculationInput {
  onPage: OnPageData;
  technical: TechnicalSEO;
  links: LinksAnalysis;
  images: ImagesAnalysis;
  issues: SEOIssue[];
}

/**
 * Computes transparent, explainable 0-100 scores across 5 categories + overall weighted score.
 */
export function calculateSeoScores(input: ScoreCalculationInput): SEOScores {
  // 1. On-Page Score (max 100)
  let onPageScore = 100;
  if (!input.onPage.title) onPageScore -= 35;
  else if (input.onPage.titleLength < 25 || input.onPage.titleLength > 65) onPageScore -= 10;

  if (!input.onPage.metaDescription) onPageScore -= 20;
  else if (input.onPage.metaDescriptionLength < 70 || input.onPage.metaDescriptionLength > 165) onPageScore -= 5;

  if (input.onPage.headings.hasMissingH1) onPageScore -= 25;
  else if (input.onPage.headings.hasMultipleH1) onPageScore -= 10;
  if (input.onPage.headings.hasSkippedLevels) onPageScore -= 10;

  if (!input.onPage.canonicalUrl) onPageScore -= 10;
  else if (!input.onPage.isCanonicalMatch) onPageScore -= 5;

  if (Object.keys(input.onPage.ogTags).length === 0) onPageScore -= 5;

  onPageScore = Math.max(0, Math.min(100, onPageScore));

  // 2. Technical Score (max 100)
  let technicalScore = 100;
  if (input.technical.httpStatus >= 400) technicalScore -= 60;
  if (!input.technical.isHttps) technicalScore -= 30;
  if (!input.technical.isIndexable) technicalScore -= 40;
  if (!input.technical.robotsAnalysis.isBotAllowed) technicalScore -= 30;
  if (!input.technical.sitemapAnalysis.exists) technicalScore -= 10;
  if (input.technical.responseTimeMs > 2500) technicalScore -= 15;
  else if (input.technical.responseTimeMs > 1500) technicalScore -= 5;

  technicalScore = Math.max(0, Math.min(100, technicalScore));

  // 3. Content & Keywords Score (max 100)
  let contentScore = 100;
  if (input.onPage.wordCount < 100) contentScore -= 50;
  else if (input.onPage.wordCount < 300) contentScore -= 25;
  else if (input.onPage.wordCount < 600) contentScore -= 10;

  if (input.onPage.textToHtmlRatio < 8) contentScore -= 20;
  else if (input.onPage.textToHtmlRatio < 15) contentScore -= 10;

  // Penalize for keyword stuffing if detected
  const hasStuffing = input.issues.some((i) => i.code === 'KEYWORD_STUFFING_RISK');
  if (hasStuffing) contentScore -= 15;

  contentScore = Math.max(0, Math.min(100, contentScore));

  // 4. Links & Images Score (max 100)
  let linksImagesScore = 100;
  if (input.images.totalImages > 0 && input.images.altCoverageRatio < 80) {
    const missingRatio = (100 - input.images.altCoverageRatio) / 100;
    linksImagesScore -= Math.round(missingRatio * 40);
  }
  if (input.links.totalLinks === 0) {
    linksImagesScore -= 20;
  }

  linksImagesScore = Math.max(0, Math.min(100, linksImagesScore));

  // 5. Mobile & UX Score (max 100)
  let mobileScore = 100;
  if (!input.onPage.viewport) mobileScore -= 60;
  if (!input.onPage.language) mobileScore -= 15;

  mobileScore = Math.max(0, Math.min(100, mobileScore));

  // 6. Overall Weighted Score
  const rawOverall =
    onPageScore * SCORING_WEIGHTS.ON_PAGE +
    technicalScore * SCORING_WEIGHTS.TECHNICAL +
    contentScore * SCORING_WEIGHTS.CONTENT_KEYWORDS +
    linksImagesScore * SCORING_WEIGHTS.LINKS_IMAGES +
    mobileScore * SCORING_WEIGHTS.MOBILE_UX;

  const overall = Math.max(0, Math.min(100, Math.round(rawOverall)));

  return {
    overall,
    onPage: onPageScore,
    technical: technicalScore,
    content: contentScore,
    links: linksImagesScore,
    mobile: mobileScore,
  };
}
