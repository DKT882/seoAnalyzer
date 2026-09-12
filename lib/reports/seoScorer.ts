import {
  SEOScores,
  ScoreDeduction,
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
 * Computes transparent, explainable 0-100 scores across 5 categories + overall weighted score,
 * including an itemized deduction ledger explaining every point lost.
 */
export function calculateSeoScores(input: ScoreCalculationInput): SEOScores {
  const deductions: ScoreDeduction[] = [];

  const addDeduction = (
    category: 'onPage' | 'technical' | 'content' | 'links' | 'mobile',
    ruleCode: string,
    label: string,
    pointsDeducted: number,
    reason: string
  ) => {
    if (pointsDeducted > 0) {
      deductions.push({
        category,
        ruleCode,
        label,
        pointsDeducted,
        reason,
      });
    }
  };

  // 1. On-Page Score (max 100)
  let onPageScore = 100;
  if (!input.onPage.title) {
    onPageScore -= 35;
    addDeduction('onPage', 'TITLE_MISSING', 'Missing Page Title', 35, 'Document has no <title> tag in the <head>.');
  } else if (input.onPage.titleLength < 25) {
    onPageScore -= 10;
    addDeduction('onPage', 'TITLE_TOO_SHORT', 'Short Title Tag', 10, `Title length is ${input.onPage.titleLength} chars (< 25 chars).`);
  } else if (input.onPage.titleLength > 65) {
    onPageScore -= 10;
    addDeduction('onPage', 'TITLE_TOO_LONG', 'Long Title Tag', 10, `Title length is ${input.onPage.titleLength} chars (> 65 chars).`);
  }

  if (!input.onPage.metaDescription) {
    onPageScore -= 15;
    addDeduction('onPage', 'META_DESC_MISSING', 'Missing Meta Description', 15, 'No <meta name="description"> tag found in document head.');
  } else if (input.onPage.metaDescriptionLength < 70) {
    onPageScore -= 5;
    addDeduction('onPage', 'META_DESC_TOO_SHORT', 'Short Meta Description', 5, `Meta description length is ${input.onPage.metaDescriptionLength} chars (< 70 chars).`);
  } else if (input.onPage.metaDescriptionLength > 165) {
    onPageScore -= 5;
    addDeduction('onPage', 'META_DESC_TOO_LONG', 'Long Meta Description', 5, `Meta description length is ${input.onPage.metaDescriptionLength} chars (> 165 chars).`);
  }

  if (input.onPage.headings.hasMissingH1) {
    onPageScore -= 25;
    addDeduction('onPage', 'H1_MISSING', 'Missing H1 Heading', 25, 'No <h1> heading found in the document.');
  } else if (input.onPage.headings.hasMultipleH1) {
    onPageScore -= 10;
    addDeduction('onPage', 'H1_MULTIPLE', 'Multiple H1 Headings', 10, `Found ${input.onPage.headings.h1Count} separate <h1> tags on the page.`);
  }

  if (input.onPage.headings.hasSkippedLevels) {
    onPageScore -= 10;
    addDeduction('onPage', 'HEADING_LEVEL_SKIPPED', 'Skipped Heading Levels', 10, 'Document skips intermediate heading levels (e.g. H1 directly to H3).');
  }

  if (!input.onPage.canonicalUrl) {
    onPageScore -= 10;
    addDeduction('onPage', 'CANONICAL_MISSING', 'Missing Canonical Tag', 10, 'No rel="canonical" link element specified.');
  } else if (!input.onPage.isCanonicalMatch) {
    onPageScore -= 5;
    addDeduction('onPage', 'CANONICAL_MISMATCH', 'Canonical Target Mismatch', 5, `Canonical URL points to "${input.onPage.canonicalUrl}".`);
  }

  if (Object.keys(input.onPage.ogTags).length === 0) {
    onPageScore -= 5;
    addDeduction('onPage', 'OPENGRAPH_MISSING', 'Missing OpenGraph Tags', 5, 'No OpenGraph social metadata tags found.');
  }

  onPageScore = Math.max(0, Math.min(100, onPageScore));

  // 2. Technical Score (max 100)
  let technicalScore = 100;
  if (input.technical.httpStatus >= 400) {
    technicalScore -= 60;
    addDeduction('technical', 'HTTP_ERROR', 'HTTP Error Status', 60, `Server responded with status ${input.technical.httpStatus}.`);
  }
  if (!input.technical.isHttps) {
    technicalScore -= 30;
    addDeduction('technical', 'INSECURE_HTTP', 'Insecure HTTP Protocol', 30, 'Page is served over unencrypted HTTP instead of HTTPS.');
  }
  if (!input.technical.isIndexable) {
    technicalScore -= 40;
    addDeduction('technical', 'NOINDEX_TAG_FOUND', 'Noindex Directive Active', 40, 'Robots noindex directive prevents indexing.');
  }
  if (!input.technical.robotsAnalysis.isBotAllowed) {
    technicalScore -= 30;
    addDeduction('technical', 'ROBOTS_DISALLOWED', 'Robots.txt Disallowed', 30, 'Page is blocked by robots.txt disallow rule.');
  }
  if (!input.technical.sitemapAnalysis.exists) {
    technicalScore -= 10;
    addDeduction('technical', 'SITEMAP_MISSING', 'XML Sitemap Missing', 10, 'No XML sitemap discovered at standard location or in robots.txt.');
  }
  if (input.technical.responseTimeMs > 2500) {
    technicalScore -= 15;
    addDeduction('technical', 'SLOW_RESPONSE_TIME', 'Slow Server Response Time', 15, `Response time is ${input.technical.responseTimeMs}ms (> 2500ms).`);
  } else if (input.technical.responseTimeMs > 1500) {
    technicalScore -= 5;
    addDeduction('technical', 'MODERATE_RESPONSE_TIME', 'Moderate Server Latency', 5, `Response time is ${input.technical.responseTimeMs}ms (> 1500ms).`);
  }

  technicalScore = Math.max(0, Math.min(100, technicalScore));

  // 3. Content & Topics Score (max 100)
  let contentScore = 100;
  if (input.onPage.wordCount < 100) {
    contentScore -= 35;
    addDeduction('content', 'LOW_WORD_COUNT', 'Very Low Content Volume', 35, `Page contains only ${input.onPage.wordCount} words of text.`);
  } else if (input.onPage.wordCount < 250) {
    contentScore -= 15;
    addDeduction('content', 'LOW_WORD_COUNT', 'Low Content Volume', 15, `Page contains ${input.onPage.wordCount} words (< 250 word guideline).`);
  }

  if (input.onPage.textToHtmlRatio < 5) {
    contentScore -= 10;
    addDeduction('content', 'LOW_TEXT_HTML_RATIO', 'Low Text-to-HTML Ratio', 10, `Text-to-HTML ratio is ${input.onPage.textToHtmlRatio}% (< 5%).`);
  }

  // Penalize for keyword stuffing if detected
  const hasStuffing = input.issues.some((i) => i.code === 'KEYWORD_STUFFING_RISK');
  if (hasStuffing) {
    contentScore -= 15;
    addDeduction('content', 'KEYWORD_STUFFING_RISK', 'Keyword Stuffing Risk', 15, 'Phrases detected exceeding 5.0% keyword density.');
  }

  contentScore = Math.max(0, Math.min(100, contentScore));

  // 4. Links & Images Score (max 100)
  let linksImagesScore = 100;
  if (input.images.totalImages > 0 && input.images.altCoverageRatio < 100) {
    const missingRatio = (100 - input.images.altCoverageRatio) / 100;
    const deductionPoints = Math.round(missingRatio * 30);
    if (deductionPoints > 0) {
      linksImagesScore -= deductionPoints;
      addDeduction('links', 'IMAGES_MISSING_ALT', 'Missing Image Alt Text', deductionPoints, `${input.images.missingAlt} of ${input.images.totalImages} images lack alt text.`);
    }
  }
  if (input.links.totalLinks === 0) {
    linksImagesScore -= 20;
    addDeduction('links', 'NO_LINKS', 'No Links on Page', 20, 'Document contains 0 hyperlinks.');
  }

  linksImagesScore = Math.max(0, Math.min(100, linksImagesScore));

  // 5. Mobile & UX Score (max 100)
  let mobileScore = 100;
  if (!input.onPage.viewport) {
    mobileScore -= 60;
    addDeduction('mobile', 'VIEWPORT_MISSING', 'Missing Mobile Viewport', 60, 'No <meta name="viewport"> tag detected.');
  }
  if (!input.onPage.language) {
    mobileScore -= 15;
    addDeduction('mobile', 'LANG_MISSING', 'Missing Document Language', 15, '<html> element missing lang attribute.');
  }

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
    deductions,
  };
}
