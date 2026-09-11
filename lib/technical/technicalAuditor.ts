import {
  SEOIssue,
  OnPageData,
  TechnicalSEO,
  LinksAnalysis,
  ImagesAnalysis,
  SchemaItem,
  KeywordItem,
} from '@/types';
import { ISSUE_CODES } from '@/lib/constants';

export interface AuditInput {
  targetUrl: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  onPage: OnPageData;
  technical: TechnicalSEO;
  links: LinksAnalysis;
  images: ImagesAnalysis;
  schemas: SchemaItem[];
  keywords: KeywordItem[];
}

export function performTechnicalSeoAudit(input: AuditInput): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // Helper to push issue
  const addIssue = (
    code: string,
    category: any,
    severity: 'CRITICAL' | 'WARNING' | 'RECOMMENDATION' | 'GOOD',
    title: string,
    description: string,
    whyItMatters: string,
    recommendation: string,
    affectedElement?: string
  ) => {
    issues.push({
      id: `iss-${Math.random().toString(36).slice(2, 9)}`,
      code,
      category,
      severity,
      title,
      description,
      whyItMatters,
      recommendation,
      affectedElement,
    });
  };

  // 1. HTTP Status & Protocol
  if (input.statusCode >= 400) {
    addIssue(
      ISSUE_CODES.HTTP_ERROR,
      'technical',
      'CRITICAL',
      `HTTP Error Status (${input.statusCode})`,
      `The server returned a non-successful HTTP status code: ${input.statusCode}.`,
      'Search engine crawlers and users cannot access the page properly when an error status code is returned.',
      'Investigate web server logs and routing configuration to ensure this URL returns a clean 200 OK status.'
    );
  } else {
    addIssue(
      'HTTP_STATUS_OK',
      'technical',
      'GOOD',
      'HTTP 200 OK Status',
      'The webpage responds with a successful 200 OK status code.',
      'A valid HTTP response ensures search bots and users can retrieve page contents without errors.',
      'No action needed.'
    );
  }

  // 2. HTTPS Security
  if (!input.finalUrl.startsWith('https://')) {
    addIssue(
      ISSUE_CODES.INSECURE_HTTP,
      'technical',
      'CRITICAL',
      'Insecure HTTP Protocol',
      'The page is delivered over unencrypted HTTP rather than HTTPS.',
      'HTTPS is a confirmed Google ranking signal and is essential for user trust, security, and data integrity.',
      'Install an SSL/TLS certificate and configure 301 permanent redirects from HTTP to HTTPS.'
    );
  } else {
    addIssue(
      'HTTPS_SECURE',
      'technical',
      'GOOD',
      'HTTPS Encryption Active',
      'The webpage is securely served over encrypted HTTPS protocol.',
      'Ensures encrypted communication and complies with modern search security guidelines.',
      'No action needed.'
    );
  }

  // 3. Robots Meta Indexability
  if (input.onPage.robotsMeta.includes('noindex')) {
    addIssue(
      ISSUE_CODES.NOINDEX_TAG_FOUND,
      'indexability',
      'CRITICAL',
      'Robots "noindex" Directive Active',
      'A <meta name="robots" content="noindex"> tag is present on this page.',
      'The "noindex" directive explicitly forbids search engines from indexing this page in search results.',
      'If this page is intended to be indexed and ranked in organic search, remove the "noindex" meta directive immediately.',
      '<meta name="robots" content="noindex">'
    );
  }

  // 4. Canonical URL
  if (!input.onPage.canonicalUrl) {
    addIssue(
      ISSUE_CODES.CANONICAL_MISSING,
      'onpage',
      'WARNING',
      'Missing Canonical URL Tag',
      'The page does not specify a rel="canonical" link element.',
      'Canonical tags prevent duplicate content issues when a page can be accessed via multiple URL variations (e.g. query strings, trailing slashes).',
      'Add a `<link rel="canonical" href="...">` tag pointing to the authoritative URL in the `<head>`.',
      '<link rel="canonical">'
    );
  } else if (!input.onPage.isCanonicalMatch) {
    addIssue(
      ISSUE_CODES.CANONICAL_MISMATCH,
      'onpage',
      'WARNING',
      'Canonical URL Target Mismatch',
      `The canonical URL points to "${input.onPage.canonicalUrl}" which differs from the analyzed URL.`,
      'This tells search engines that another URL should be indexed instead of this specific page.',
      'Verify if this URL is deliberately canonicalized to another version, or update it to match if this is the primary version.',
      input.onPage.canonicalUrl
    );
  } else {
    addIssue(
      'CANONICAL_VALID',
      'onpage',
      'GOOD',
      'Self-Referencing Canonical Tag Present',
      'A valid rel="canonical" tag is configured matching the page URL.',
      'Helps search engines unambiguously recognize this URL as the authoritative source.',
      'No action needed.'
    );
  }

  // 5. Page Title
  if (!input.onPage.title) {
    addIssue(
      ISSUE_CODES.TITLE_MISSING,
      'onpage',
      'CRITICAL',
      'Missing Page Title Tag',
      'The document has no <title> element in the <head>.',
      'The title tag is one of the most critical on-page ranking factors and serves as the clickable headline in SERPs.',
      'Add a descriptive <title> tag between 30 and 60 characters containing primary keywords.',
      '<title>'
    );
  } else if (input.onPage.titleLength < 25) {
    addIssue(
      ISSUE_CODES.TITLE_TOO_SHORT,
      'onpage',
      'WARNING',
      `Page Title Too Short (${input.onPage.titleLength} characters)`,
      `The title tag is only ${input.onPage.titleLength} characters long: "${input.onPage.title}".`,
      'Short titles often miss opportunities to target primary and secondary keyword intent.',
      'Expand the title to between 40 and 60 characters with relevant descriptive keywords.',
      input.onPage.title
    );
  } else if (input.onPage.titleLength > 65) {
    addIssue(
      ISSUE_CODES.TITLE_TOO_LONG,
      'onpage',
      'WARNING',
      `Page Title May Truncate (${input.onPage.titleLength} characters)`,
      `The title tag is ${input.onPage.titleLength} characters long and may be truncated on search result pages.`,
      'Google typically truncates titles longer than ~600px (~60-65 characters) with an ellipsis in SERP listings.',
      'Shorten the title to under 60-65 characters while keeping important keywords at the beginning.',
      input.onPage.title
    );
  } else {
    addIssue(
      'TITLE_OPTIMAL',
      'onpage',
      'GOOD',
      `Optimal Title Length (${input.onPage.titleLength} characters)`,
      `Title is well-calibrated: "${input.onPage.title}".`,
      'Fits within typical SERP pixel boundaries without truncation.',
      'No action needed.'
    );
  }

  // 6. Meta Description
  if (!input.onPage.metaDescription) {
    addIssue(
      ISSUE_CODES.META_DESC_MISSING,
      'onpage',
      'WARNING',
      'Missing Meta Description',
      'No meta description tag was found on the page.',
      'While not a direct ranking factor, meta descriptions heavily influence organic click-through rates (CTR).',
      'Add a `<meta name="description" content="...">` tag summarizing page value in 120-160 characters.',
      '<meta name="description">'
    );
  } else if (input.onPage.metaDescriptionLength < 70) {
    addIssue(
      ISSUE_CODES.META_DESC_TOO_SHORT,
      'onpage',
      'RECOMMENDATION',
      `Short Meta Description (${input.onPage.metaDescriptionLength} characters)`,
      `The meta description is only ${input.onPage.metaDescriptionLength} characters long.`,
      'A longer, compelling description provides more incentive for searchers to click your snippet.',
      'Expand the description to between 120 and 160 characters.',
      input.onPage.metaDescription
    );
  } else if (input.onPage.metaDescriptionLength > 165) {
    addIssue(
      ISSUE_CODES.META_DESC_TOO_LONG,
      'onpage',
      'RECOMMENDATION',
      `Meta Description May Truncate (${input.onPage.metaDescriptionLength} characters)`,
      `The meta description is ${input.onPage.metaDescriptionLength} characters long and may be clipped in search snippets.`,
      'Snippets beyond ~960px (desktop) or ~680px (mobile) are cut off by search engines.',
      'Refine the meta description to under 160 characters.',
      input.onPage.metaDescription
    );
  } else {
    addIssue(
      'META_DESC_OPTIMAL',
      'onpage',
      'GOOD',
      `Optimal Meta Description (${input.onPage.metaDescriptionLength} characters)`,
      'Meta description length is well-positioned for snippet display.',
      'Provides a clear summary for searchers and social snippets.',
      'No action needed.'
    );
  }

  // 7. H1 Headings
  if (input.onPage.headings.hasMissingH1) {
    addIssue(
      ISSUE_CODES.H1_MISSING,
      'onpage',
      'CRITICAL',
      'Missing <h1> Heading',
      'The page does not contain an <h1> heading tag.',
      'The H1 tag communicates the central topic of the page to both search engines and assistive technologies.',
      'Add exactly one prominent <h1> tag representing the primary subject of the document.'
    );
  } else if (input.onPage.headings.hasMultipleH1) {
    addIssue(
      ISSUE_CODES.H1_MULTIPLE,
      'onpage',
      'WARNING',
      `Multiple <h1> Headings Found (${input.onPage.headings.h1Count})`,
      `Found ${input.onPage.headings.h1Count} separate <h1> tags on the page.`,
      'While HTML5 allows multiple H1s, best SEO practice recommends a single main H1 to establish clear topic primacy.',
      'Consider reserving H1 for the page title and using <h2> for secondary section titles.'
    );
  } else {
    addIssue(
      'H1_OPTIMAL',
      'onpage',
      'GOOD',
      'Single <h1> Heading Present',
      `Found exactly one H1 tag: "${input.onPage.headings.items.find((h) => h.level === 1)?.text || ''}".`,
      'Establishes clean structural hierarchy and strong primary topical focus.',
      'No action needed.'
    );
  }

  // 8. Heading Hierarchy Gaps
  if (input.onPage.headings.hasSkippedLevels) {
    addIssue(
      ISSUE_CODES.HEADING_LEVEL_SKIPPED,
      'onpage',
      'WARNING',
      'Heading Levels Skipped',
      'The document skips intermediate heading levels (e.g. <h1> directly to <h3> or <h2> to <h4>).',
      'Skipped heading levels degrade semantic structure, readability for screen readers, and content outline clarity.',
      'Ensure headings descend sequentially without skipping levels (H1 → H2 → H3).'
    );
  }

  // 9. Mobile Viewport
  if (!input.onPage.viewport) {
    addIssue(
      ISSUE_CODES.VIEWPORT_MISSING,
      'mobile',
      'CRITICAL',
      'Missing Mobile Viewport Meta Tag',
      'No `<meta name="viewport">` tag was detected.',
      'Without a viewport meta tag, mobile browsers render the page at desktop width, failing mobile-friendliness audits.',
      'Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to the `<head>`.'
    );
  } else {
    addIssue(
      'VIEWPORT_CONFIGURED',
      'mobile',
      'GOOD',
      'Mobile Viewport Configured',
      'Viewport meta tag is properly configured for responsive displays.',
      'Ensures fluid rendering across mobile and desktop viewports.',
      'No action needed.'
    );
  }

  // 10. Image ALT Coverage
  if (input.images.missingAlt > 0) {
    addIssue(
      ISSUE_CODES.IMAGES_MISSING_ALT,
      'images',
      'WARNING',
      `${input.images.missingAlt} Image(s) Missing ALT Text`,
      `Out of ${input.images.totalImages} images, ${input.images.missingAlt} have no descriptive alt attribute.`,
      'ALT text is vital for accessibility (screen readers) and helps search engines understand image context for Image Search.',
      'Add concise, descriptive alt attributes to all content-bearing images, or mark purely decorative images with alt="" or role="presentation".'
    );
  } else if (input.images.totalImages > 0) {
    addIssue(
      'IMAGE_ALT_OPTIMAL',
      'images',
      'GOOD',
      '100% Image ALT Coverage',
      'All detected images provide valid alt text attributes or decorative indicators.',
      'Ensures strong accessibility compliance and visual search relevance.',
      'No action needed.'
    );
  }

  // 11. Content Depth & Word Count
  if (input.onPage.wordCount < 250) {
    addIssue(
      ISSUE_CODES.LOW_WORD_COUNT,
      'content',
      'WARNING',
      `Low Content Volume (${input.onPage.wordCount} words)`,
      `The page has only ${input.onPage.wordCount} words of visible body text.`,
      'Thin content pages often struggle to provide comprehensive coverage of user search intent.',
      'Expand the page content with detailed, high-value explanations, FAQs, and structured information.'
    );
  } else {
    addIssue(
      'CONTENT_VOLUME_SUFFICIENT',
      'content',
      'GOOD',
      `Substantial Content Volume (${input.onPage.wordCount} words)`,
      `The page contains ${input.onPage.wordCount} words with an estimated reading time of ~${input.onPage.readingTimeMinutes} min.`,
      'Provides sufficient topical depth for search engine crawling and semantic analysis.',
      'No action needed.'
    );
  }

  // 12. Structured Data / Schema
  if (input.schemas.length === 0) {
    addIssue(
      ISSUE_CODES.SCHEMA_MISSING,
      'structured_data',
      'RECOMMENDATION',
      'No Structured Data (JSON-LD) Detected',
      'No Schema.org JSON-LD or Microdata structured markup was found.',
      'Structured data unlocks rich snippet features in Google search results (e.g. Star ratings, FAQs, breadcrumbs, event details).',
      'Implement relevant JSON-LD schemas (such as WebPage, Article, Organization, or FAQPage).'
    );
  } else {
    addIssue(
      'SCHEMA_DETECTED',
      'structured_data',
      'GOOD',
      `${input.schemas.length} Structured Data Schema(s) Detected`,
      `Detected schema types: ${input.schemas.map((s) => s.type).join(', ')}.`,
      'Helps search engines understand explicit entities and relationships.',
      'No action needed.'
    );
  }

  // 13. Robots.txt Compliance
  if (!input.technical.robotsAnalysis.isBotAllowed) {
    addIssue(
      ISSUE_CODES.ROBOTS_DISALLOWED,
      'technical',
      'CRITICAL',
      'URL Disallowed in robots.txt',
      'The robots.txt file contains a Disallow rule blocking our declared user-agent on this URL.',
      'Search engine bots matching this rule will refrain from crawling this webpage.',
      'Check robots.txt directives if this page should be publicly crawled.'
    );
  }

  // 14. Sitemap Presence
  if (!input.technical.sitemapAnalysis.exists) {
    addIssue(
      ISSUE_CODES.SITEMAP_MISSING,
      'technical',
      'RECOMMENDATION',
      'XML Sitemap Not Discovered',
      'No XML sitemap was found at standard locations (/sitemap.xml) or referenced in robots.txt.',
      'Sitemaps facilitate rapid discovery of all canonical URLs on a domain by search engine crawlers.',
      'Generate an XML sitemap and add a `Sitemap: https://domain.com/sitemap.xml` directive to robots.txt.'
    );
  }

  // 15. Keyword Stuffing Risk
  const stuffingKws = input.keywords.filter((k) => k.density > 5.0);
  if (stuffingKws.length > 0) {
    addIssue(
      ISSUE_CODES.KEYWORD_STUFFING_RISK,
      'keywords',
      'WARNING',
      `High Keyword Density Detected (${stuffingKws.map((k) => `"${k.keyword}" (${k.density}%)`).join(', ')})`,
      'Certain phrases exceed 5.0% density in the document.',
      'Excessive repetition may indicate unnatural keyword stuffing, which search algorithms actively de-emphasize.',
      'Review content naturally and replace repetitive phrases with synonyms and varied phrasing.'
    );
  }

  // 16. Server Response Time
  if (input.responseTimeMs > 2500) {
    addIssue(
      ISSUE_CODES.SLOW_RESPONSE_TIME,
      'technical',
      'RECOMMENDATION',
      `Slow Server Response Time (${input.responseTimeMs}ms)`,
      `Initial server response time took ${(input.responseTimeMs / 1000).toFixed(2)}s.`,
      'Fast Time-to-First-Byte (TTFB) under 800ms is recommended for optimal user experience and crawler crawl-budget efficiency.',
      'Optimize backend database queries, implement server-side caching (Redis, Varnish), or use a CDN edge cache.'
    );
  }

  return issues;
}
