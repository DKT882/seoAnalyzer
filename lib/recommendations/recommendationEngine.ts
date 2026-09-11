import 'server-only';
import {
  SEOReport,
  SeoRecommendationItem,
  RecommendationPriority,
  RecommendationCategory,
  RecommendationEffort,
} from '@/types';
import crypto from 'node:crypto';

/**
 * Generates prioritized, explainable SEO recommendations for a single page or whole website.
 */
export function generateSeoRecommendations(pages: SEOReport[]): {
  all: SeoRecommendationItem[];
  quickWins: SeoRecommendationItem[];
  byPage: Record<string, SeoRecommendationItem[]>;
  byCategory: Record<string, SeoRecommendationItem[]>;
} {
  const all: SeoRecommendationItem[] = [];
  const byPage: Record<string, SeoRecommendationItem[]> = {};
  const byCategory: Record<string, SeoRecommendationItem[]> = {
    TECHNICAL: [],
    ON_PAGE: [],
    CONTENT: [],
    INTERNAL_LINKING: [],
    SCHEMA: [],
    IMAGES: [],
  };

  for (const page of pages) {
    const pageRecs: SeoRecommendationItem[] = [];
    const url = page.url;
    const pageTitle = page.onPage.title || 'Untitled Page';
    const topKeyword = page.keywords.primary[0]?.keyword || page.keywords.all[0]?.keyword || '';

    // -------------------------------------------------------------
    // 1. TECHNICAL SEO AUDIT CHECKS
    // -------------------------------------------------------------
    if (!page.technical.isIndexable) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'CRITICAL',
        category: 'TECHNICAL',
        title: 'Page is blocked from indexing',
        affectedUrl: url,
        pageTitle,
        impact: 'Search engines are prevented from indexing and ranking this page.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: page.technical.robotsAnalysis.isBotAllowed
          ? 'Meta robots tag or X-Robots-Tag contains "noindex".'
          : 'Robots.txt disallow rule blocks crawler access.',
        recommendedAction: 'Remove the "noindex" directive or update robots.txt if this page is intended for public search traffic.',
        quickWin: true,
        scoreImpactEstimate: 25,
      });
    }

    if (!page.technical.isHttps) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'CRITICAL',
        category: 'TECHNICAL',
        title: 'Enforce HTTPS and SSL encryption',
        affectedUrl: url,
        pageTitle,
        impact: 'Essential security standard and browser trust signal.',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        reason: 'Page is served over unencrypted HTTP.',
        recommendedAction: 'Install a valid SSL/TLS certificate and configure permanent 301 redirects from HTTP to HTTPS.',
        quickWin: false,
        scoreImpactEstimate: 15,
      });
    }

    if (!page.onPage.canonicalUrl) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'TECHNICAL',
        title: 'Add self-referencing canonical URL tag',
        affectedUrl: url,
        pageTitle,
        impact: 'Prevents duplicate content issues from URL parameters and trailing slash variations.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'No <link rel="canonical"> tag was detected in the <head>.',
        recommendedAction: `Add <link rel="canonical" href="${url}" /> in the page HTML head.`,
        quickWin: true,
        scoreImpactEstimate: 8,
      });
    }

    if (page.links.brokenLinks.length > 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'HIGH',
        category: 'TECHNICAL',
        title: `Fix ${page.links.brokenLinks.length} broken or dead links`,
        affectedUrl: url,
        pageTitle,
        impact: 'Improves crawler crawl efficiency and user browsing experience.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: `Detected broken or invalid internal destination links.`,
        recommendedAction: 'Update or remove broken hyperlink destinations from the page content.',
        quickWin: true,
        scoreImpactEstimate: 10,
      });
    }

    // -------------------------------------------------------------
    // 2. ON-PAGE SEO AUDIT CHECKS
    // -------------------------------------------------------------
    if (!page.onPage.title || page.onPage.title.trim().length === 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'CRITICAL',
        category: 'ON_PAGE',
        title: 'Add descriptive title tag',
        affectedUrl: url,
        pageTitle,
        impact: 'Primary ranking and SERP snippet display signal.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'The HTML <title> tag is missing or empty.',
        recommendedAction: topKeyword
          ? `Create a compelling 50–60 character title including "${topKeyword}" and your brand name.`
          : 'Add a descriptive 50–60 character title tag accurately summarizing page content.',
        quickWin: true,
        scoreImpactEstimate: 20,
      });
    } else {
      if (topKeyword && !page.onPage.title.toLowerCase().includes(topKeyword.toLowerCase())) {
        pageRecs.push({
          id: crypto.randomUUID(),
          priority: 'HIGH',
          category: 'ON_PAGE',
          title: `Include primary keyword "${topKeyword}" in title tag`,
          affectedUrl: url,
          pageTitle,
          impact: 'Core on-page relevance signal for search query matching.',
          effort: 'LOW',
          confidence: 'HIGH',
          reason: `Current title "${page.onPage.title}" does not contain the primary keyword "${topKeyword}".`,
          recommendedAction: `Rewrite the title to naturally incorporate "${topKeyword}" near the beginning.`,
          quickWin: true,
          scoreImpactEstimate: 12,
        });
      }

      if (page.onPage.titleLength < 30 || page.onPage.titleLength > 65) {
        pageRecs.push({
          id: crypto.randomUUID(),
          priority: 'MEDIUM',
          category: 'ON_PAGE',
          title: `Optimize title length (${page.onPage.titleLength} characters)`,
          affectedUrl: url,
          pageTitle,
          impact: 'Prevents title truncation in Google search results snippets.',
          effort: 'LOW',
          confidence: 'HIGH',
          reason: page.onPage.titleLength < 30 ? 'Title is too short to provide sufficient context.' : 'Title exceeds 60 characters and may be truncated in SERPs.',
          recommendedAction: 'Adjust title tag length to between 50 and 60 characters (approx. 580 pixels).',
          quickWin: true,
          scoreImpactEstimate: 5,
        });
      }
    }

    if (!page.onPage.metaDescription || page.onPage.metaDescription.trim().length === 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'HIGH',
        category: 'ON_PAGE',
        title: 'Add compelling meta description',
        affectedUrl: url,
        pageTitle,
        impact: 'Boosts organic search snippet Click-Through Rate (CTR).',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'Missing meta description tag in page <head>.',
        recommendedAction: topKeyword
          ? `Write a 140–160 character meta description containing "${topKeyword}" and a clear call-to-action.`
          : 'Write a persuasive 140–160 character meta description summarizing the unique value of the page.',
        quickWin: true,
        scoreImpactEstimate: 10,
      });
    }

    if (page.onPage.headings.h1Count === 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'HIGH',
        category: 'ON_PAGE',
        title: 'Add a single main <h1> heading',
        affectedUrl: url,
        pageTitle,
        impact: 'Clarifies main page topic hierarchy for search engines and screen readers.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'No <h1> heading was found in the HTML document.',
        recommendedAction: topKeyword
          ? `Add an <h1> heading at the top of the main content containing "${topKeyword}".`
          : 'Add a concise <h1> heading defining the primary subject of the page.',
        quickWin: true,
        scoreImpactEstimate: 12,
      });
    } else if (page.onPage.headings.h1Count > 1) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'ON_PAGE',
        title: `Consolidate multiple <h1> headings (${page.onPage.headings.h1Count} found)`,
        affectedUrl: url,
        pageTitle,
        impact: 'Maintains clean document outline and singular topical focus.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'Multiple <h1> tags were detected in the markup.',
        recommendedAction: 'Retain a single primary <h1> heading and convert secondary headings to <h2> or <h3> tags.',
        quickWin: true,
        scoreImpactEstimate: 5,
      });
    }

    if (page.onPage.headings.hasSkippedLevels) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'LOW',
        category: 'ON_PAGE',
        title: 'Fix skipped heading hierarchy levels',
        affectedUrl: url,
        pageTitle,
        impact: 'Improves semantic accessibility and content structure readability.',
        effort: 'LOW',
        confidence: 'MEDIUM',
        reason: 'Heading levels skip hierarchy order (e.g. H1 directly to H3 or H2 to H4).',
        recommendedAction: 'Nest headings sequentially (H1 -> H2 -> H3) without skipping intermediate levels.',
        quickWin: true,
        scoreImpactEstimate: 3,
      });
    }

    // -------------------------------------------------------------
    // 3. CONTENT DEPTH & QUALITY CHECKS
    // -------------------------------------------------------------
    if (page.onPage.wordCount < 300) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'HIGH',
        category: 'CONTENT',
        title: `Expand thin content (${page.onPage.wordCount} words)`,
        affectedUrl: url,
        pageTitle,
        impact: 'Comprehensive content satisfies user search intent and improves ranking depth.',
        effort: 'HIGH',
        confidence: 'HIGH',
        reason: 'Total visible word count is below the recommended 300-word minimum for informational pages.',
        recommendedAction: 'Add relevant explanatory paragraphs, detailed examples, answering common user questions and subtopics.',
        quickWin: false,
        scoreImpactEstimate: 18,
      });
    }

    if (page.keywords.questions.length === 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'CONTENT',
        title: 'Add a structured FAQ section to answer user questions',
        affectedUrl: url,
        pageTitle,
        impact: 'Increases opportunity to capture "People Also Ask" and featured snippet SERP positions.',
        effort: 'MEDIUM',
        confidence: 'MEDIUM',
        reason: 'No question-and-answer format content or FAQ items were detected on the page.',
        recommendedAction: topKeyword
          ? `Add 3–5 frequently asked questions addressing common queries about "${topKeyword}".`
          : 'Add an FAQ section addressing user intent and common inquiries.',
        quickWin: false,
        scoreImpactEstimate: 8,
      });
    }

    // -------------------------------------------------------------
    // 4. INTERNAL LINKING CHECKS
    // -------------------------------------------------------------
    if (page.links.internalLinksCount < 3) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'INTERNAL_LINKING',
        title: `Strengthen internal links (${page.links.internalLinksCount} internal links found)`,
        affectedUrl: url,
        pageTitle,
        impact: 'Distributes PageRank authority and guides visitors to related website content.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: 'Page has very few contextual internal links pointing to other sections or related articles.',
        recommendedAction: 'Add 3–5 contextual hyperlinks with descriptive anchor text linking to relevant site pages.',
        quickWin: true,
        scoreImpactEstimate: 7,
      });
    }

    // -------------------------------------------------------------
    // 5. STRUCTURED DATA & SCHEMA CHECKS
    // -------------------------------------------------------------
    if (page.schemas.length === 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'SCHEMA',
        title: 'Add JSON-LD structured data schema',
        affectedUrl: url,
        pageTitle,
        impact: 'Enables rich search result badges, organization graph, and enhanced SERP snippets.',
        effort: 'MEDIUM',
        confidence: 'HIGH',
        reason: 'No JSON-LD or Microdata structured data was detected.',
        recommendedAction: 'Implement appropriate schema markup (e.g. WebPage, Article, Organization, or FAQPage) via JSON-LD.',
        quickWin: false,
        scoreImpactEstimate: 8,
      });
    }

    // -------------------------------------------------------------
    // 6. IMAGE OPTIMIZATION CHECKS
    // -------------------------------------------------------------
    if (page.images.missingAlt > 0) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'IMAGES',
        title: `Add descriptive ALT attributes to ${page.images.missingAlt} images`,
        affectedUrl: url,
        pageTitle,
        impact: 'Improves image accessibility, screen reader compliance, and Google Image search discovery.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: `${page.images.missingAlt} of ${page.images.totalImages} images are missing the 'alt' attribute.`,
        recommendedAction: 'Add concise, descriptive alt text to all meaningful informational images.',
        quickWin: true,
        scoreImpactEstimate: 6,
      });
    }

    // Group recommendations
    byPage[url] = pageRecs;
    for (const rec of pageRecs) {
      all.push(rec);
      byCategory[rec.category].push(rec);
    }
  }

  // Sort overall recommendations: CRITICAL -> HIGH -> MEDIUM -> LOW
  const priorityOrder: Record<RecommendationPriority, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  all.sort((a, b) => {
    return (
      priorityOrder[b.priority] - priorityOrder[a.priority] ||
      (b.scoreImpactEstimate || 0) - (a.scoreImpactEstimate || 0)
    );
  });

  // Extract Quick Wins (High or Critical priority + Low effort)
  const quickWins = all.filter((r) => r.quickWin);

  return {
    all,
    quickWins,
    byPage,
    byCategory,
  };
}

export const generateSiteRecommendations = generateSeoRecommendations;
