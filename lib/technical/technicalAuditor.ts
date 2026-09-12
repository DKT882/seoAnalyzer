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
  targetKeywords?: string[];
  primaryTopics?: string[];
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
    affectedElement?: string,
    extra?: {
      issue?: string;
      evidence?: Record<string, any> | string;
      action?: string;
      whatToChange?: string;
      before?: string;
      after?: string;
      expectedBenefit?: string;
      caution?: string;
      isMeasuredProblem?: boolean;
    }
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
      issue: extra?.issue || title,
      evidence: extra?.evidence || description,
      action: extra?.action || recommendation,
      whatToChange: extra?.whatToChange,
      before: extra?.before,
      after: extra?.after,
      expectedBenefit: extra?.expectedBenefit,
      caution: extra?.caution,
      isMeasuredProblem: extra?.isMeasuredProblem ?? (severity !== 'GOOD'),
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
      'Investigate web server logs and routing configuration to ensure this URL returns a clean 200 OK status.',
      undefined,
      {
        issue: `HTTP Error Status (${input.statusCode})`,
        evidence: `Server returned HTTP response status ${input.statusCode}`,
        action: 'Fix server error or broken routing to serve a valid 200 OK response.',
        whatToChange: 'Web server route handler or page resource existence.',
        before: `HTTP/1.1 ${input.statusCode}`,
        after: 'HTTP/1.1 200 OK',
        expectedBenefit: 'Ensures page is accessible to search engines and visitors.',
        caution: 'If the page was permanently moved, return a 301 redirect instead of an error.',
      }
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
      'Install an SSL/TLS certificate and configure 301 permanent redirects from HTTP to HTTPS.',
      undefined,
      {
        issue: 'Insecure HTTP Protocol',
        evidence: `URL protocol is ${input.finalUrl.split(':')[0]}`,
        action: 'Install SSL/TLS certificate and configure 301 redirects to HTTPS.',
        whatToChange: 'Web server SSL certificate and HTTP redirect rules.',
        before: 'http://example.com',
        after: 'https://example.com',
        expectedBenefit: 'Ensures data encryption, browser trust indicators, and conforms to search ranking baselines.',
        caution: 'Update all internal links and asset references to HTTPS to prevent mixed content warnings.',
      }
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
      '<meta name="robots" content="noindex">',
      {
        issue: 'Robots "noindex" Directive Active',
        evidence: 'Detected <meta name="robots" content="noindex"> in document head.',
        action: 'Remove noindex directive if page should receive organic search traffic.',
        whatToChange: '<meta name="robots"> tag in HTML <head>',
        before: '<meta name="robots" content="noindex, follow">',
        after: '<meta name="robots" content="index, follow">',
        expectedBenefit: 'Allows search engine bots to index this URL in search results.',
        caution: 'Only remove noindex if the page is ready for public indexation.',
      }
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
      '<link rel="canonical">',
      {
        issue: 'Missing Canonical URL Tag',
        evidence: 'No rel="canonical" tag detected in HTML head.',
        action: 'Add a self-referencing canonical tag pointing to the authoritative URL.',
        whatToChange: 'Add <link rel="canonical"> in <head>',
        before: '<head>\n  <title>Page Title</title>\n</head>',
        after: `<head>\n  <title>Page Title</title>\n  <link rel="canonical" href="${input.finalUrl}" />\n</head>`,
        expectedBenefit: 'Consolidates ranking signals and prevents duplicate content splitting.',
        caution: 'Ensure the canonical URL uses the authoritative domain, protocol, and trailing slash structure.',
      }
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
      input.onPage.canonicalUrl,
      {
        issue: 'Canonical URL Target Mismatch',
        evidence: `Analyzed URL: "${input.finalUrl}" vs Canonical URL: "${input.onPage.canonicalUrl}"`,
        action: 'Verify whether this page should self-canonicalize or point to another master URL.',
        whatToChange: 'Canonical tag href attribute.',
        before: `<link rel="canonical" href="${input.onPage.canonicalUrl}" />`,
        after: `<link rel="canonical" href="${input.finalUrl}" />`,
        expectedBenefit: 'Ensures search engines index the intended version of the content.',
        caution: 'If this page is an intentional variant or parameter URL, pointing to another canonical may be desired.',
      }
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
      '<title>',
      {
        issue: 'Missing Page Title Tag',
        evidence: 'HTML head contains no <title> tag.',
        action: 'Add a descriptive <title> tag between 30 and 60 characters.',
        whatToChange: 'Add <title> tag inside <head>.',
        before: '<head></head>',
        after: '<head><title>Primary Topic & Value Proposition | Brand</title></head>',
        expectedBenefit: 'Establishes primary on-page relevance and creates the clickable SERP headline.',
        caution: 'Keep title length between 40-60 characters for optimal display.',
      }
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
      input.onPage.title,
      {
        issue: `Page Title Too Short (${input.onPage.titleLength} characters)`,
        evidence: `Current title is "${input.onPage.title}" (${input.onPage.titleLength} chars).`,
        action: 'Expand title with descriptive context and branding.',
        whatToChange: 'Expand the <title> tag text.',
        before: `<title>${input.onPage.title}</title>`,
        after: `<title>${input.onPage.title} - Comprehensive Guide & Best Practices | Brand</title>`,
        expectedBenefit: 'Captures additional search intent and improves CTR.',
        caution: 'Avoid stuffing keywords or using meaningless repetitive boilerplate.',
      }
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
      input.onPage.title,
      {
        issue: `Page Title May Truncate (${input.onPage.titleLength} characters)`,
        evidence: `Current title is "${input.onPage.title}" (${input.onPage.titleLength} chars).`,
        action: 'Shorten title to under 60-65 characters, placing core terms at the beginning.',
        whatToChange: 'Condense the <title> text.',
        before: `<title>${input.onPage.title}</title>`,
        after: `<title>${input.onPage.title.slice(0, 55).trim()} | Brand</title>`,
        expectedBenefit: 'Ensures full title visibility on desktop and mobile search snippets.',
        caution: 'Preserve the primary topic keyword and brand identifier.',
      }
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
      '<meta name="description">',
      {
        issue: 'Missing Meta Description',
        evidence: 'No <meta name="description"> tag found in document head.',
        action: 'Add a concise 120-160 character meta description summarizing page value.',
        whatToChange: 'Add meta description tag in <head>.',
        before: '<head></head>',
        after: '<meta name="description" content="Explore actionable insights and step-by-step guidance on [Topic]. Learn proven best practices to optimize performance.">',
        expectedBenefit: 'Provides compelling SERP snippet text and boosts organic CTR.',
        caution: 'Write for human searchers with a clear value proposition and call-to-action.',
      }
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
      input.onPage.metaDescription,
      {
        issue: `Short Meta Description (${input.onPage.metaDescriptionLength} characters)`,
        evidence: `Current description is "${input.onPage.metaDescription}" (${input.onPage.metaDescriptionLength} chars).`,
        action: 'Expand meta description with additional benefit details and a call-to-action.',
        whatToChange: 'Expand content attribute in meta description.',
        before: `<meta name="description" content="${input.onPage.metaDescription}">`,
        after: `<meta name="description" content="${input.onPage.metaDescription} Discover actionable strategies, comprehensive tools, and key insights today.">`,
        expectedBenefit: 'Improves snippet clickability in search engine results.',
        caution: 'Do not repeat the exact title wording verbatim.',
      }
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
      input.onPage.metaDescription,
      {
        issue: `Meta Description May Truncate (${input.onPage.metaDescriptionLength} characters)`,
        evidence: `Current description length: ${input.onPage.metaDescriptionLength} characters.`,
        action: 'Shorten meta description to 120-160 characters.',
        whatToChange: 'Condense content attribute of meta description tag.',
        before: `<meta name="description" content="${input.onPage.metaDescription}">`,
        after: `<meta name="description" content="${input.onPage.metaDescription.slice(0, 150).trim()}...">`,
        expectedBenefit: 'Ensures complete snippet visibility in search result cards.',
        caution: 'Keep key selling points and call-to-action before the 150-character mark.',
      }
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

  // 7. H1 Headings & Topic Alignment
  const h1Elements = input.onPage.headings.items.filter((h) => h.level === 1);
  const h1Count = input.onPage.headings.h1Count || h1Elements.length;
  const targetKws = (input.targetKeywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  const primaryTps = (
    input.primaryTopics && input.primaryTopics.length > 0
      ? input.primaryTopics
      : input.keywords.filter((k) => k.source === 'EXTRACTED' || !k.source).slice(0, 3).map((k) => k.keyword)
  ).map((t) => t.trim().toLowerCase()).filter(Boolean);

  if (h1Count === 0 || input.onPage.headings.hasMissingH1) {
    addIssue(
      ISSUE_CODES.H1_MISSING,
      'onpage',
      'CRITICAL',
      'Missing <h1> Heading',
      'The page does not contain an <h1> heading tag.',
      'The H1 tag communicates the central topic of the page to both search engines and assistive technologies.',
      'Add exactly one prominent <h1> tag representing the primary subject of the document.',
      undefined,
      {
        issue: 'Missing <h1> Heading',
        evidence: 'Detected 0 <h1> elements in HTML structure.',
        action: 'Add exactly one prominent <h1> tag representing the main topic.',
        whatToChange: 'Insert a semantic <h1> element at top of main content.',
        before: '<div class="hero-title">Welcome to Our Service</div>',
        after: '<h1>Welcome to Our Service</h1>',
        expectedBenefit: 'Provides unambiguous semantic hierarchy for search engines and assistive technology.',
        caution: 'Ensure the H1 accurately summarizes the primary content that follows.',
      }
    );
  } else if (h1Count > 1) {
    const beforeExample = h1Elements.length > 0
      ? h1Elements.map((h) => `<h1>${h.text}</h1>`).join('\n')
      : '<h1>Primary Topic</h1>\n<h1>Secondary Section</h1>\n<h1>Third Section</h1>';
    const afterExample = h1Elements.length > 0
      ? `<h1>${h1Elements[0].text}</h1>\n` + h1Elements.slice(1).map((h) => `<h2>${h.text}</h2>`).join('\n')
      : '<h1>Primary Topic</h1>\n<h2>Secondary Section</h2>\n<h2>Third Section</h2>';

    addIssue(
      ISSUE_CODES.H1_MULTIPLE,
      'onpage',
      'WARNING',
      `Multiple <h1> Headings Detected (${h1Count} found)`,
      `Found ${h1Count} separate <h1> tags on the page.`,
      'While HTML5 technically allows multiple H1s, best SEO practice recommends a single main H1 to establish clear topic primacy and document structure.',
      'Keep one clear primary H1 for the page and restructure the other headings as H2/H3 where they represent subsections.',
      undefined,
      {
        issue: 'Multiple H1 headings detected.',
        evidence: `Detected ${h1Count} <h1> elements on the page: ${h1Elements.map((h) => `"${h.text}"`).join(', ')}.`,
        action: 'Keep one primary H1 and use H2/H3 for subsections where appropriate.',
        whatToChange: 'Change secondary <h1> tags to <h2> or <h3> heading levels.',
        before: beforeExample,
        after: afterExample,
        expectedBenefit: 'Creates a clear, unambiguous document outline for search crawlers and screen readers.',
        caution: 'Do not change heading levels purely to manipulate rankings. Use heading levels to represent the actual content hierarchy.',
      }
    );
  } else {
    // Exactly 1 H1 exists! Layered semantic alignment classification
    const h1Text = h1Elements[0]?.text || '';
    const h1TextLower = h1Text.toLowerCase();
    const h1Tokens = h1TextLower.split(/\s+/).filter((t) => t.length > 2);

    const classifyAlignment = (
      text: string,
      candidates: string[]
    ): {
      strength: 'EXACT' | 'STRONG' | 'PARTIAL' | 'WEAK' | 'UNRELATED';
      matchedCandidate?: string;
      matchedTokens: string[];
    } => {
      const lower = text.toLowerCase().trim();
      if (candidates.length === 0) {
        return { strength: 'STRONG', matchedTokens: [] };
      }

      // 1. Exact match
      for (const cand of candidates) {
        const cLower = cand.toLowerCase().trim();
        if (lower === cLower) {
          return { strength: 'EXACT', matchedCandidate: cand, matchedTokens: h1Tokens };
        }
      }

      // 2. Strong substring / phrase match
      for (const cand of candidates) {
        const cLower = cand.toLowerCase().trim();
        if (lower.includes(cLower) || cLower.includes(lower)) {
          return { strength: 'STRONG', matchedCandidate: cand, matchedTokens: cLower.split(/\s+/) };
        }
      }

      // 3. Partial / token overlap
      for (const cand of candidates) {
        const cLower = cand.toLowerCase().trim();
        const candTokens = cLower.split(/\s+/).filter((t) => t.length > 3);
        const overlapping = candTokens.filter((t) => h1Tokens.includes(t));
        if (overlapping.length >= 2 || (candTokens.length === 1 && overlapping.length === 1)) {
          return { strength: 'PARTIAL', matchedCandidate: cand, matchedTokens: overlapping };
        } else if (overlapping.length === 1) {
          return { strength: 'WEAK', matchedCandidate: cand, matchedTokens: overlapping };
        }
      }

      return { strength: 'UNRELATED', matchedTokens: [] };
    };

    if (targetKws.length > 0) {
      // CASE A: User supplied target keywords
      const targetAlignment = classifyAlignment(h1Text, targetKws);

      if (targetAlignment.strength === 'EXACT' || targetAlignment.strength === 'STRONG') {
        addIssue(
          'H1_OPTIMAL',
          'onpage',
          'GOOD',
          'Single <h1> Heading with Target Alignment',
          `Found single H1 ("${h1Text}") with ${targetAlignment.strength.toLowerCase()} alignment to supplied target keywords.`,
          'Strong target keyword placement in H1 confirms subject relevance to search engines and users.',
          'No action needed.'
        );
      } else if (targetAlignment.strength === 'PARTIAL') {
        addIssue(
          'H1_OPTIMAL',
          'onpage',
          'GOOD',
          'Single <h1> Heading with Partial Target Alignment',
          `Found single H1 ("${h1Text}") with partial keyword overlap (${targetAlignment.matchedTokens.join(', ')}) with supplied target keywords.`,
          'Partial target alignment establishes relevant context while maintaining editorial naturalness.',
          'No action needed.'
        );
      } else {
        addIssue(
          ISSUE_CODES.H1_KEYWORD_MISMATCH,
          'onpage',
          'RECOMMENDATION',
          'H1 Lacks Target Keyword Alignment',
          `The H1 heading "${h1Text}" has ${targetAlignment.strength.toLowerCase()} alignment with supplied target keywords (${targetKws.join(', ')}).`,
          'Target keywords in the primary H1 provide an immediate relevance signal to search algorithms and readers.',
          'Consider naturally incorporating the primary target topic into the H1 while keeping it readable and user-friendly.',
          h1Text,
          {
            issue: 'Supplied target keyword is not clearly represented in the H1.',
            evidence: `H1: "${h1Text}" | Target Keywords: ${targetKws.join(', ')} | Alignment: ${targetAlignment.strength}`,
            action: 'Consider naturally incorporating the primary target topic into the H1.',
            whatToChange: 'Revise the H1 text to naturally incorporate the target keyword.',
            before: `<h1>${h1Text}</h1>`,
            after: `<h1>${targetKws[0].charAt(0).toUpperCase() + targetKws[0].slice(1)} - ${h1Text}</h1>`,
            expectedBenefit: 'Directly aligns document headline semantics with user search intent.',
            caution: 'Do NOT blindly stuff keywords. Keep the H1 engaging and natural for human readers.',
          }
        );
      }
    } else {
      // CASE B: No target keywords provided (Automatic Topic Analysis)
      const topicAlignment = classifyAlignment(h1Text, primaryTps);

      if (topicAlignment.strength === 'EXACT' || topicAlignment.strength === 'STRONG' || topicAlignment.strength === 'PARTIAL') {
        addIssue(
          'H1_OPTIMAL',
          'onpage',
          'GOOD',
          'Single <h1> Heading Present',
          `Found exactly one H1 tag: "${h1Text}". Establishes clean structural hierarchy and strong primary topical focus.`,
          'Establishes clean structural hierarchy and strong primary topical focus.',
          'No action needed.'
        );
      } else {
        addIssue(
          ISSUE_CODES.H1_TOPIC_MISMATCH,
          'onpage',
          'RECOMMENDATION',
          'H1 Has Weak Topical Alignment',
          `The H1 heading "${h1Text}" does not clearly reflect the primary topics detected from the content (${primaryTps.slice(0, 3).join(', ')}).`,
          'A descriptive H1 immediately orients visitors and search engines to the central topic of the page.',
          'Rewrite the H1 so it clearly communicates the primary topic identified from the page content.',
          h1Text,
          {
            issue: 'H1 has weak alignment with the primary topic identified from the page content.',
            evidence: `H1: "${h1Text}" | Extracted Primary Topics: ${primaryTps.slice(0, 3).join(', ')} | Alignment: ${topicAlignment.strength}`,
            action: "Rewrite the H1 so it clearly communicates the page's primary topic.",
            whatToChange: 'Update the H1 headline to reflect the core subject of the webpage.',
            before: `<h1>${h1Text}</h1>`,
            after: `<h1>${primaryTps[0] ? primaryTps[0].charAt(0).toUpperCase() + primaryTps[0].slice(1) : 'Main Topic'} Overview</h1>`,
            expectedBenefit: 'Improves semantic clarity for crawlers and reader comprehension.',
            caution: 'Ensure the H1 accurately describes the content that follows.',
          }
        );
      }
    }
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
      'Ensure headings descend sequentially without skipping levels (H1 → H2 → H3).',
      undefined,
      {
        issue: 'Heading Levels Skipped',
        evidence: 'Detected non-sequential heading hierarchy (e.g. H1 followed directly by H3).',
        action: 'Nest headings sequentially (H1 -> H2 -> H3) without skipping levels.',
        whatToChange: 'Heading level tags across content sections.',
        before: '<h1>Title</h1>\n<h3>Skipped Subtopic</h3>',
        after: '<h1>Title</h1>\n<h2>Subtopic</h2>\n<h3>Subsection</h3>',
        expectedBenefit: 'Provides compliant accessibility navigation and clear document outline.',
        caution: 'Choose heading levels to represent semantic hierarchy, not visual CSS styling.',
      }
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
      'Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to the `<head>`.',
      undefined,
      {
        issue: 'Missing Mobile Viewport Meta Tag',
        evidence: 'No viewport meta tag found in HTML head.',
        action: 'Add responsive viewport meta tag to <head>.',
        whatToChange: 'Add viewport meta tag in <head>.',
        before: '<head></head>',
        after: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        expectedBenefit: 'Ensures correct mobile device scaling and passes mobile friendliness checks.',
        caution: 'Ensure CSS uses responsive fluid layouts alongside the viewport tag.',
      }
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
      'Add concise, descriptive alt attributes to all content-bearing images, or mark purely decorative images with alt="" or role="presentation".',
      undefined,
      {
        issue: `${input.images.missingAlt} Image(s) Missing ALT Text`,
        evidence: `${input.images.missingAlt} of ${input.images.totalImages} images lack alt attributes.`,
        action: 'Add concise, descriptive alt attributes to content images.',
        whatToChange: 'Add alt="..." attributes to <img> tags.',
        before: '<img src="feature-chart.png">',
        after: '<img src="feature-chart.png" alt="Feature comparison chart showing SEO metrics">',
        expectedBenefit: 'Enhances web accessibility (WCAG) and indexes images in Google Image Search.',
        caution: 'For purely decorative images, use empty alt="" rather than omitting the attribute.',
      }
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

  // 10b. Broken Links Audit
  if (input.links.brokenLinks && input.links.brokenLinks.length > 0) {
    const brokenInternal = input.links.brokenLinks.filter((l) => l.isInternal);
    const brokenExternal = input.links.brokenLinks.filter((l) => l.isExternal);
    addIssue(
      ISSUE_CODES.BROKEN_LINKS_DETECTED,
      'links',
      'WARNING',
      `Broken Link(s) Detected (${input.links.brokenLinks.length} total)`,
      `Detected ${input.links.brokenLinks.length} broken hyperlink(s) (${brokenInternal.length} internal, ${brokenExternal.length} external) returning error status codes.`,
      'Broken links create dead ends for search engine crawlers and degrade user experience.',
      'Repair or remove the broken hyperlinks to restore crawler navigation and page equity flow.',
      input.links.brokenLinks[0]?.url,
      {
        issue: 'Broken links detected on webpage.',
        evidence: `Broken links: ${input.links.brokenLinks.map((l) => `${l.url} (${l.statusCode || 404})`).join(', ')}`,
        action: 'Update or remove broken link references.',
        whatToChange: 'href attribute of broken anchor tags.',
        before: `<a href="${input.links.brokenLinks[0]?.url}">Broken Link</a>`,
        after: '<a href="/valid-destination">Working Link</a>',
        expectedBenefit: 'Restores uninterrupted crawl paths and avoids 404 user frustration.',
        caution: 'If the target resource moved, update the link to the new destination URL.',
      }
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
      'Expand the page content with detailed, high-value explanations, FAQs, and structured information.',
      undefined,
      {
        issue: `Low Content Volume (${input.onPage.wordCount} words)`,
        evidence: `Analyzed document contains ${input.onPage.wordCount} words of visible body text.`,
        action: 'Expand page content with comprehensive explanations and answers to user questions.',
        whatToChange: 'Add explanatory sections, detailed guides, and FAQs.',
        before: '<p>Welcome. Contact us for services.</p>',
        after: '<p>Comprehensive overview detailing services, key benefits, case studies, and FAQs.</p>',
        expectedBenefit: 'Provides sufficient semantic depth to rank for broad topic intent.',
        caution: 'Do not add generic filler copy. Focus on substantive value and clear answers.',
      }
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
      'Implement relevant JSON-LD schemas (such as WebPage, Article, Organization, or FAQPage).',
      undefined,
      {
        issue: 'No Structured Data (JSON-LD) Detected',
        evidence: '0 Schema.org JSON-LD or Microdata blocks detected.',
        action: 'Add structured JSON-LD schema markup appropriate for page content.',
        whatToChange: 'Add <script type="application/ld+json"> block in <head> or body.',
        before: '<!-- No schema markup -->',
        after: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Page Name"}</script>',
        expectedBenefit: 'Enables rich snippets and helps search engines understand entities.',
        caution: 'Only mark up content that is actually visible to users on the page.',
      }
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
      'Check robots.txt directives if this page should be publicly crawled.',
      undefined,
      {
        issue: 'URL Disallowed in robots.txt',
        evidence: 'Robots.txt contains matching Disallow directive.',
        action: 'Update robots.txt directives to allow search engine crawler access.',
        whatToChange: 'robots.txt file at domain root.',
        before: 'Disallow: /path-to-page',
        after: 'Allow: /path-to-page',
        expectedBenefit: 'Restores search bot crawler access to this URL.',
        caution: 'Ensure sensitive private areas remain protected.',
      }
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
      'Generate an XML sitemap and add a `Sitemap: https://domain.com/sitemap.xml` directive to robots.txt.',
      undefined,
      {
        issue: 'XML Sitemap Not Discovered',
        evidence: 'Sitemap not found at /sitemap.xml or referenced in robots.txt.',
        action: 'Generate an XML sitemap and declare its URL in robots.txt.',
        whatToChange: 'Create /sitemap.xml and add Sitemap directive to robots.txt.',
        before: '<!-- No sitemap declaration -->',
        after: 'Sitemap: https://example.com/sitemap.xml',
        expectedBenefit: 'Accelerates crawling and indexing of new and updated pages.',
        caution: 'Only include canonical, indexable 200 OK URLs in the XML sitemap.',
      }
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
      'Review content naturally and replace repetitive phrases with synonyms and varied phrasing.',
      undefined,
      {
        issue: 'High Keyword Density Detected',
        evidence: `Phrases exceeding 5% density: ${stuffingKws.map((k) => `"${k.keyword}" (${k.density}%)`).join(', ')}`,
        action: 'Replace repetitive phrases with synonyms, pronouns, and varied phrasing.',
        whatToChange: 'Body text containing repetitive keyword mentions.',
        before: 'Our SEO tool is the best SEO tool for SEO tool users seeking SEO tool results.',
        after: 'Our software provides comprehensive audit capabilities for digital marketers.',
        expectedBenefit: 'Improves content naturalness and avoids search spam filters.',
        caution: 'Maintain clear topic context while varying vocabulary.',
      }
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
      'Optimize backend database queries, implement server-side caching (Redis, Varnish), or use a CDN edge cache.',
      undefined,
      {
        issue: `Slow Server Response Time (${input.responseTimeMs}ms)`,
        evidence: `Initial TTFB measured at ${input.responseTimeMs}ms (> 2500ms threshold).`,
        action: 'Implement server caching, CDN edge distribution, and query optimization.',
        whatToChange: 'Web server caching configuration and database queries.',
        before: 'TTFB: 2500ms+ (Uncached direct origin response)',
        after: 'TTFB: < 300ms (Edge CDN cached response)',
        expectedBenefit: 'Improves user experience, reduces bounce rates, and conserves crawl budget.',
        caution: 'Ensure dynamic user data is not improperly cached at the CDN layer.',
      }
    );
  }

  // 17. Redirect Chains & Redirect Loops
  if (input.technical.redirectAssessment?.isRedirectLoop) {
    addIssue(
      ISSUE_CODES.REDIRECT_LOOP,
      'technical',
      'CRITICAL',
      'Redirect Loop Detected',
      `The requested URL entered an infinite redirect loop (${input.technical.redirectAssessment.redirectChain.join(' -> ')}).`,
      'Search engine crawlers and users are blocked from reaching the page content when a redirect cycle occurs.',
      'Fix the web server redirect rules to terminate at a single canonical destination.',
      undefined,
      {
        issue: 'Redirect loop detected.',
        evidence: `Redirect cycle: ${input.technical.redirectAssessment.redirectChain.join(' -> ')}`,
        action: 'Correct web server rewrite rules or route redirects to point directly to the destination.',
        whatToChange: 'Server redirect configuration or .htaccess/middleware rules.',
        before: input.technical.redirectAssessment.redirectChain.join(' -> '),
        after: `${input.targetUrl} -> 200 OK`,
        expectedBenefit: 'Allows search crawlers and visitors to access the destination without infinite loops.',
        caution: 'Check for competing HTTPS or trailing-slash rewrite rules.',
      }
    );
  } else if (input.technical.redirectAssessment && input.technical.redirectAssessment.redirectCount > 1) {
    addIssue(
      ISSUE_CODES.REDIRECT_CHAIN,
      'technical',
      'WARNING',
      `Redirect Chain Detected (${input.technical.redirectAssessment.redirectCount} hops)`,
      `The page navigates through multiple redirect hops before reaching the final destination: ${input.technical.redirectAssessment.redirectChain.join(' -> ')}.`,
      'Redirect chains increase latency, consume crawl budget, and can dilute link equity transmission.',
      'Update links and redirect rules to point directly from the original URL to the final destination in a single hop.',
      undefined,
      {
        issue: 'Redirect chain detected.',
        evidence: `Chain: ${input.technical.redirectAssessment.redirectChain.join(' -> ')} (${input.technical.redirectAssessment.redirectCount} hops)`,
        action: 'Consolidate multiple redirect hops into a single direct 301 redirect.',
        whatToChange: 'Update initial redirect destination to the final destination URL.',
        before: input.technical.redirectAssessment.redirectChain.join(' -> '),
        after: `${input.targetUrl} -> 301 -> ${input.finalUrl}`,
        expectedBenefit: 'Reduces page latency and conserves crawl budget.',
        caution: 'Ensure no intermediate tracking parameters or legacy query values are lost.',
      }
    );
  }

  // 18. Canonical Redirect & Cross-Domain Conflicts
  if (input.technical.canonicalAssessment?.status === 'CANONICAL_REDIRECT_CONFLICT') {
    addIssue(
      ISSUE_CODES.CANONICAL_REDIRECT_CONFLICT,
      'onpage',
      'WARNING',
      'Canonical URL Points to a Redirect',
      `The canonical URL ("${input.technical.canonicalAssessment.canonicalUrl}") redirects to another destination ("${input.technical.canonicalAssessment.redirectTarget || 'final URL'}").`,
      'Search engines require canonical tags to point directly to the final authoritative URL. Pointing to a redirect creates ambiguous indexing signals.',
      'Update the canonical tag to point directly to the resolved final destination URL.',
      input.technical.canonicalAssessment.canonicalUrl,
      {
        issue: 'Canonical URL points to a redirecting destination.',
        evidence: `Canonical: ${input.technical.canonicalAssessment.canonicalUrl} -> Destination: ${input.technical.canonicalAssessment.redirectTarget || input.finalUrl}`,
        action: 'Point the canonical tag directly to the preferred final URL.',
        whatToChange: '<link rel="canonical"> href attribute.',
        before: `<link rel="canonical" href="${input.technical.canonicalAssessment.canonicalUrl}" />`,
        after: `<link rel="canonical" href="${input.technical.canonicalAssessment.redirectTarget || input.finalUrl}" />`,
        expectedBenefit: 'Eliminates canonical ambiguity and consolidates indexing signals immediately.',
        caution: 'Confirm the final URL is the intended master version before updating.',
      }
    );
  }

  if (input.technical.canonicalAssessment?.status === 'NOINDEX_CANONICAL_CONFLICT') {
    addIssue(
      ISSUE_CODES.NOINDEX_CANONICAL_CONFLICT,
      'indexability',
      'WARNING',
      'Conflicting "noindex" and Canonical Target Signals',
      'This page contains a "noindex" directive while specifying a canonical URL pointing to a different location.',
      'Combining "noindex" with a separate canonical URL sends contradictory technical signals regarding whether the page should be de-indexed or consolidated.',
      'Review whether this page should be removed from search results (keep noindex) or consolidated into another master page (remove noindex and maintain canonical).',
      undefined,
      {
        issue: 'Page combines noindex directive with an alternate canonical URL.',
        evidence: `Robots: noindex | Canonical: ${input.technical.canonicalAssessment.canonicalUrl}`,
        action: 'Align indexation signals: use noindex for exclusion, or canonical for signal consolidation.',
        whatToChange: 'Decide whether to retain the noindex directive or the canonical link.',
        before: '<meta name="robots" content="noindex">\n<link rel="canonical" href="...">',
        after: '<link rel="canonical" href="..."> <!-- (If consolidating signals) -->',
        expectedBenefit: 'Provides unambiguous indexing instructions to search crawlers.',
        caution: 'Do not remove noindex if the page contains sensitive or staging content.',
      }
    );
  }

  if (input.technical.canonicalAssessment?.status === 'CANONICAL_CROSS_DOMAIN') {
    addIssue(
      ISSUE_CODES.CANONICAL_CROSS_DOMAIN,
      'onpage',
      'WARNING',
      'Cross-Domain Canonical Tag Detected',
      `The canonical tag points to an external domain: "${input.technical.canonicalAssessment.canonicalUrl}".`,
      'Cross-domain canonicals instruct search engines that another website is the primary author of this content.',
      'Verify whether this cross-domain canonical is intentional for content syndication, or update it to self-canonicalize if this site owns the original content.',
      input.technical.canonicalAssessment.canonicalUrl,
      {
        issue: 'Canonical tag points to an external domain.',
        evidence: `Canonical URL domain differs from current page domain: "${input.technical.canonicalAssessment.canonicalUrl}"`,
        action: 'Confirm whether content syndication is intended or update to self-canonical.',
        whatToChange: 'Canonical tag href attribute.',
        before: `<link rel="canonical" href="${input.technical.canonicalAssessment.canonicalUrl}" />`,
        after: `<link rel="canonical" href="${input.finalUrl}" />`,
        expectedBenefit: 'Retains indexation credit and ranking authority on your own domain.',
        caution: 'If this is syndicated partner content, cross-domain canonical is legitimate.',
      }
    );
  }

  // 19. Robots Contradictions & Signal Conflicts
  if (input.technical.robotsAssessment?.hasSignalConflict) {
    addIssue(
      ISSUE_CODES.INDEXABILITY_SIGNAL_CONFLICT,
      'indexability',
      'CRITICAL',
      'Contradictory Indexability Signals Between HTTP Header and HTML',
      input.technical.robotsAssessment.summary,
      'Contradictory robots directives across X-Robots-Tag HTTP headers and HTML <meta name="robots"> confuse search crawlers and can cause accidental de-indexing.',
      'Synchronize your web server headers and HTML templates so they provide identical robots directives.',
      undefined,
      {
        issue: 'X-Robots-Tag HTTP header contradicts HTML <meta name="robots">.',
        evidence: input.technical.robotsAssessment.summary,
        action: 'Align HTTP response headers and HTML meta directives to agree.',
        whatToChange: 'Web server X-Robots-Tag header or HTML meta tag.',
        before: 'X-Robots-Tag: noindex | <meta name="robots" content="index">',
        after: '<meta name="robots" content="index, follow"> (Headers synchronized)',
        expectedBenefit: 'Guarantees consistent crawler behavior across all search engines.',
        caution: 'Search engines typically honor the most restrictive directive (noindex).',
      }
    );
  }

  if (input.technical.robotsAssessment?.hasContradiction) {
    addIssue(
      ISSUE_CODES.INDEXABILITY_CONTRADICTION,
      'indexability',
      'CRITICAL',
      'Contradictory Directives Within Robots Meta Tag',
      'A robots tag contains mutually exclusive directives (such as "index" and "noindex", or "follow" and "nofollow").',
      'When contradictory directives are supplied, search bots default to the most restrictive instruction ("noindex" / "nofollow").',
      'Remove the conflicting directive and specify clear, consistent indexing instructions.',
      undefined,
      {
        issue: 'Mutually exclusive directives in robots configuration.',
        evidence: input.technical.robotsAssessment.summary,
        action: 'Remove the conflicting directive and keep only the intended instruction.',
        whatToChange: 'content attribute of <meta name="robots">.',
        before: '<meta name="robots" content="index, noindex">',
        after: '<meta name="robots" content="index, follow">',
        expectedBenefit: 'Prevents unintended page de-indexing caused by fallback rules.',
        caution: 'Double-check template variables that may be concatenating conflicting tags.',
      }
    );
  }

  // 20. Sitemap Canonical Inconsistency
  if (input.technical.sitemapAssessment?.sitemapCanonicalMismatch) {
    const mismatch = input.technical.sitemapAssessment.sitemapCanonicalMismatch;
    addIssue(
      ISSUE_CODES.SITEMAP_CANONICAL_MISMATCH,
      'technical',
      'WARNING',
      'Sitemap URL Differs from Page Canonical Tag',
      `The XML sitemap lists "${mismatch.sitemapEntry}" but the page canonical points to "${mismatch.pageCanonical}".`,
      'XML sitemaps should contain only canonical URLs. Submitting non-canonical URLs in sitemaps wastes crawl budget and sends conflicting signals.',
      'Update the XML sitemap to include only the canonical version of each URL.',
      undefined,
      {
        issue: 'Sitemap entry conflicts with page canonical URL.',
        evidence: `Sitemap: "${mismatch.sitemapEntry}" vs Canonical: "${mismatch.pageCanonical}"`,
        action: 'Ensure XML sitemap lists only authoritative canonical URLs.',
        whatToChange: 'XML sitemap URL generation script or feed.',
        before: `<url><loc>${mismatch.sitemapEntry}</loc></url>`,
        after: `<url><loc>${mismatch.pageCanonical}</loc></url>`,
        expectedBenefit: 'Aligns sitemap discovery with canonical indexing signals.',
        caution: 'Do not include redirecting or non-canonical URLs in sitemaps.',
      }
    );
  }

  // 21. Hreflang Internationalization Checks
  if (input.technical.hreflangAssessment?.hasHreflang) {
    if (input.technical.hreflangAssessment.hasInvalidLanguageCodes) {
      addIssue(
        ISSUE_CODES.HREFLANG_INVALID,
        'onpage',
        'WARNING',
        `Invalid Hreflang Language/Region Code(s): ${input.technical.hreflangAssessment.invalidCodes.join(', ')}`,
        'Hreflang attributes must follow standard ISO 639-1 language and optional ISO 3166-1 region formats (e.g. "en", "en-US", "es-ES", "x-default").',
        'Search engines ignore invalid hreflang codes, preventing correct localized ranking and search snippet serving.',
        'Correct the invalid hreflang codes to valid ISO language-region combinations.',
        undefined,
        {
          issue: 'Invalid language or region format in hreflang alternate tag.',
          evidence: `Invalid codes detected: ${input.technical.hreflangAssessment.invalidCodes.join(', ')}`,
          action: 'Update hreflang attributes to standard ISO 639-1 / ISO 3166-1 format.',
          whatToChange: 'hreflang attribute on <link rel="alternate"> tags.',
          before: `<link rel="alternate" hreflang="${input.technical.hreflangAssessment.invalidCodes[0]}" href="..." />`,
          after: '<link rel="alternate" hreflang="en-US" href="..." />',
          expectedBenefit: 'Ensures search engines accurately serve localized pages to targeted regional searchers.',
          caution: 'Format is language first (lower-case), followed by optional region (e.g. "en-GB", "pt-BR").',
        }
      );
    }

    if (!input.technical.hreflangAssessment.hasSelfReference) {
      addIssue(
        ISSUE_CODES.HREFLANG_MISSING_SELF,
        'onpage',
        'WARNING',
        'Missing Self-Referencing Hreflang Alternate',
        'The hreflang cluster does not include a self-referencing alternate link pointing back to this page URL.',
        'Google recommends that each localized page includes a self-referencing hreflang tag within the alternate group.',
        'Add a `<link rel="alternate" hreflang="..." href="...">` tag corresponding to this page URL.',
        undefined,
        {
          issue: 'Hreflang alternate cluster lacks self-reference.',
          evidence: `Analyzed URL "${input.finalUrl}" is not listed among alternate links.`,
          action: 'Add a self-referencing hreflang tag to the alternate cluster.',
          whatToChange: 'Add self-referencing <link rel="alternate" hreflang="..."> tag in <head>.',
          before: '<!-- Hreflang alternates for other regions only -->',
          after: `<link rel="alternate" hreflang="${input.technical.hreflangAssessment.htmlLang || 'en'}" href="${input.finalUrl}" />`,
          expectedBenefit: 'Completes the alternate cluster for unambiguous international search indexing.',
          caution: 'Ensure the self-referencing URL exactly matches the page canonical.',
        }
      );
    }

    if (!input.technical.hreflangAssessment.isHtmlLangMatched) {
      addIssue(
        ISSUE_CODES.LANGUAGE_MISMATCH,
        'onpage',
        'WARNING',
        'HTML lang Attribute Conflicts with Hreflang Configuration',
        `The document declares '<html lang="${input.technical.hreflangAssessment.htmlLang}">', which is not represented in the page's hreflang alternate tags.`,
        'Mismatched language indicators can send confusing localization signals to search engines and browser translation tools.',
        'Align the <html lang="..."> attribute with the corresponding hreflang tag for this page.',
        undefined,
        {
          issue: 'Document lang attribute conflicts with hreflang alternate configuration.',
          evidence: `HTML lang: "${input.technical.hreflangAssessment.htmlLang}" vs Hreflang entries: ${input.technical.hreflangAssessment.entries.map((e) => e.lang).join(', ')}`,
          action: 'Synchronize document lang attribute with the self-referencing hreflang code.',
          whatToChange: '<html lang="..."> attribute.',
          before: `<html lang="${input.technical.hreflangAssessment.htmlLang}">`,
          after: `<html lang="${input.technical.hreflangAssessment.entries[0]?.lang || 'en'}">`,
          expectedBenefit: 'Ensures clear language classification across search and browser tools.',
          caution: 'Use valid ISO language tags.',
        }
      );
    }
  }

  // 22. URL Structural Complexity
  if (input.technical.urlStructureAssessment?.hasSessionId) {
    addIssue(
      ISSUE_CODES.URL_STRUCTURE_COMPLEX,
      'technical',
      'RECOMMENDATION',
      `Session Identifier Detected in URL (${input.technical.urlStructureAssessment.sessionParamNames.join(', ')})`,
      'The URL contains session identifier parameters which can create duplicate content copies and fragment crawl budget.',
      'Session identifiers in URLs can create duplicate content indexing and fragment crawl budget.',
      'Use HTTP cookies or local storage for session state rather than appending session parameters to indexable URLs.',
      input.targetUrl,
      {
        issue: 'Session parameter in indexable URL.',
        evidence: `Session parameter(s): ${input.technical.urlStructureAssessment.sessionParamNames.join(', ')}`,
        action: 'Remove session parameters from public indexable URLs.',
        whatToChange: 'Application routing and session management configuration.',
        before: `${input.targetUrl}?phpsessid=abc123xyz`,
        after: input.targetUrl.split('?')[0],
        expectedBenefit: 'Prevents infinite duplicate page versions from accumulating in search indexes.',
        caution: 'Ensure cookie-based session tracking is active for user logins.',
      }
    );
  }

  // 23. Mixed Content on HTTPS Pages
  if (input.technical.infrastructureAssessment?.hasMixedContent) {
    addIssue(
      ISSUE_CODES.MIXED_CONTENT_RESOURCE,
      'technical',
      'WARNING',
      `Mixed Content: Insecure HTTP Resources on HTTPS Page (${input.technical.infrastructureAssessment.insecureResourceUrls.length} found)`,
      `This secure HTTPS webpage attempts to load insecure HTTP subresources: ${input.technical.infrastructureAssessment.insecureResourceUrls.slice(0, 3).join(', ')}.`,
      'Modern web browsers block mixed active content (scripts, iframes) and flag pages with mixed passive content (images) as insecure.',
      'Update all subresource URLs (images, stylesheets, scripts) to use encrypted HTTPS protocols.',
      undefined,
      {
        issue: 'Insecure HTTP subresources loaded on HTTPS page.',
        evidence: `Insecure resources: ${input.technical.infrastructureAssessment.insecureResourceUrls.join(', ')}`,
        action: 'Upgrade all subresource URLs from http:// to https://.',
        whatToChange: 'src and href attributes for embedded images, scripts, and stylesheets.',
        before: '<img src="http://example.com/logo.png">',
        after: '<img src="https://example.com/logo.png">',
        expectedBenefit: 'Restores browser green lock security and prevents asset blocking.',
        caution: 'Ensure external asset hosts support HTTPS before updating.',
      }
    );
  }

  // 24. Unsupported Content Type
  if (input.technical.infrastructureAssessment && !input.technical.infrastructureAssessment.isHtmlContentType) {
    addIssue(
      ISSUE_CODES.UNSUPPORTED_CONTENT_TYPE,
      'technical',
      'CRITICAL',
      `Non-HTML Content-Type Detected ("${input.technical.infrastructureAssessment.contentType}")`,
      `The server returned a content-type of "${input.technical.infrastructureAssessment.contentType}" instead of standard text/html.`,
      'Web page SEO analysis requires valid HTML/XHTML content. Non-HTML files (PDFs, images, raw JSON) cannot be evaluated with on-page DOM rules.',
      'Ensure standard webpage routes return Content-Type: text/html; charset=utf-8.',
      undefined,
      {
        issue: 'Unexpected Content-Type header on analyzed webpage.',
        evidence: `Content-Type: ${input.technical.infrastructureAssessment.contentType}`,
        action: 'Configure server to return Content-Type: text/html for web pages.',
        whatToChange: 'Web server Content-Type header configuration.',
        before: `Content-Type: ${input.technical.infrastructureAssessment.contentType}`,
        after: 'Content-Type: text/html; charset=utf-8',
        expectedBenefit: 'Ensures correct browser and search engine document parsing.',
        caution: 'If this URL is intentionally a binary download (e.g. PDF), on-page HTML checks do not apply.',
      }
    );
  }

  // 25. Structured Data Syntax Integrity
  if (input.schemas.some((s) => !s.isValid)) {
    addIssue(
      ISSUE_CODES.SCHEMA_INVALID,
      'structured_data',
      'WARNING',
      'Invalid JSON-LD Structured Data Syntax Detected',
      'One or more JSON-LD script blocks contain malformed JSON syntax or missing core schema properties.',
      'Search engines cannot parse invalid JSON-LD blocks, disabling rich search result eligibility.',
      'Validate JSON-LD syntax using schema testing tools and ensure valid JSON formatting.',
      undefined,
      {
        issue: 'Malformed JSON-LD structured data block.',
        evidence: 'JSON parse error in <script type="application/ld+json"> tag.',
        action: 'Fix JSON syntax errors in schema markup.',
        whatToChange: 'JSON-LD script block contents.',
        before: '<script type="application/ld+json">{ "name": "Test", }</script> <!-- Trailing comma -->',
        after: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Test"}</script>',
        expectedBenefit: 'Restores schema readability for rich snippet qualification in Google SERPs.',
        caution: 'Ensure special characters and quotes within JSON strings are properly escaped.',
      }
    );
  }

  // 26. Social Card Metadata (Open Graph & Twitter)
  if (!input.onPage.ogTags || Object.keys(input.onPage.ogTags).length === 0) {
    addIssue(
      ISSUE_CODES.OPENGRAPH_MISSING,
      'social',
      'RECOMMENDATION',
      'Missing Open Graph Social Metadata',
      'No Open Graph tags (og:title, og:description, og:image) were detected.',
      'Open Graph metadata controls how content appears when shared across social platforms (Facebook, LinkedIn, Slack, WhatsApp).',
      'Add og:title, og:description, og:image, and og:url tags in the <head>.',
      undefined,
      {
        issue: 'No Open Graph tags detected.',
        evidence: 'Document head contains 0 og:* metadata tags.',
        action: 'Add Open Graph metadata tags for enhanced social sharing cards.',
        whatToChange: 'Add <meta property="og:..."> tags in <head>.',
        before: '<head></head>',
        after: '<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Page summary...">\n<meta property="og:image" content="https://example.com/share.jpg">',
        expectedBenefit: 'Displays branded preview cards with images when shared across social channels.',
        caution: 'Open Graph is not a direct search ranking factor, but improves social referral traffic.',
      }
    );
  }

  if (!input.onPage.twitterTags || Object.keys(input.onPage.twitterTags).length === 0) {
    addIssue(
      ISSUE_CODES.TWITTER_CARD_MISSING,
      'social',
      'RECOMMENDATION',
      'Missing Twitter Card Metadata',
      'No Twitter card metadata tags (twitter:card, twitter:title) were detected.',
      'Twitter cards ensure links shared on X/Twitter display visual previews with titles and images.',
      'Add `<meta name="twitter:card" content="summary_large_image">` and accompanying tags.',
      undefined,
      {
        issue: 'No Twitter Card metadata detected.',
        evidence: 'Document head contains 0 twitter:* tags.',
        action: 'Add Twitter Card metadata tags in <head>.',
        whatToChange: 'Add <meta name="twitter:..."> tags in <head>.',
        before: '<head></head>',
        after: '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="Page Title">',
        expectedBenefit: 'Renders rich preview cards when shared on X/Twitter.',
        caution: 'Social cards do not directly influence search ranking algorithms.',
      }
    );
  }

  return issues;
}


