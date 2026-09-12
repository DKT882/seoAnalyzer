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
    const isTargetMode = page.topicCoverageData?.mode === 'TARGET_KEYWORD_ANALYSIS';
    const targetKws = page.topicCoverageData?.targetKeywords || [];
    const primaryTopics = (page.topicCoverageData?.primaryTopicsDetected && page.topicCoverageData.primaryTopicsDetected.length > 0)
      ? page.topicCoverageData.primaryTopicsDetected
      : page.keywords.primary.map((k) => k.keyword);
    const topTopic = isTargetMode && targetKws.length > 0
      ? targetKws[0]
      : (primaryTopics[0] || page.keywords.all[0]?.keyword || '');

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
        issue: 'Page is blocked from search engine indexation.',
        whyItMatters: 'Search bots are prohibited from storing and ranking this URL in search results.',
        evidence: page.technical.robotsAnalysis.isBotAllowed ? '<meta name="robots" content="noindex">' : 'robots.txt Disallow rule',
        action: 'Remove noindex directive or modify robots.txt disallow rule.',
        whatToChange: '<meta name="robots"> tag or robots.txt file.',
        before: '<meta name="robots" content="noindex">',
        after: '<meta name="robots" content="index, follow">',
        expectedBenefit: 'Allows search engine crawlers to index and rank the page.',
        caution: 'Only remove noindex if the page is ready for public indexation.',
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
        issue: 'Page is served over unencrypted HTTP protocol.',
        whyItMatters: 'HTTPS encrypts visitor data and is a fundamental search security requirement.',
        evidence: `URL protocol is HTTP (${url})`,
        action: 'Install SSL certificate and enforce 301 HTTPS redirects.',
        whatToChange: 'Web server SSL certificate and HTTP redirect configuration.',
        before: 'http://example.com/page',
        after: 'https://example.com/page',
        expectedBenefit: 'Enhances security, eliminates browser security warnings, and aligns with search standards.',
        caution: 'Ensure internal assets and links use HTTPS to prevent mixed content warnings.',
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
        issue: 'Missing canonical URL link element.',
        whyItMatters: 'Tells search engines which URL is the master version to index.',
        evidence: 'No <link rel="canonical"> tag detected.',
        action: 'Add a self-referencing canonical tag in the <head>.',
        whatToChange: 'Add <link rel="canonical"> tag inside <head>.',
        before: '<head><title>Page</title></head>',
        after: `<head><title>Page</title><link rel="canonical" href="${url}" /></head>`,
        expectedBenefit: 'Consolidates ranking equity to a single authoritative URL.',
        caution: 'Ensure the canonical URL uses HTTPS and exact trailing slash convention.',
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
        issue: 'Broken destination hyperlinks detected.',
        whyItMatters: 'Dead links frustrate visitors and waste search crawler crawl budget.',
        evidence: `${page.links.brokenLinks.length} broken links found.`,
        action: 'Replace broken links with active valid URLs.',
        whatToChange: 'href attributes in anchor <a> tags.',
        before: '<a href="/dead-link">Learn More</a>',
        after: '<a href="/active-resource">Learn More</a>',
        expectedBenefit: 'Smooth navigation flow and efficient crawler traversal.',
        caution: 'Verify updated destination URLs return HTTP 200 OK.',
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
        recommendedAction: topTopic
          ? `Create a compelling 50–60 character title including "${topTopic}" and your brand name.`
          : 'Add a descriptive 50–60 character title tag accurately summarizing page content.',
        quickWin: true,
        scoreImpactEstimate: 20,
        issue: 'Missing or empty <title> tag in document head.',
        whyItMatters: 'The title tag is the clickable headline in search results and a core relevance signal.',
        evidence: 'HTML head contains no title tag.',
        action: 'Add a 40–60 character descriptive title tag.',
        whatToChange: 'Insert <title> tag in <head>.',
        before: '<head></head>',
        after: `<head><title>${topTopic ? `${topTopic.charAt(0).toUpperCase() + topTopic.slice(1)} | Brand` : 'Primary Topic Guide | Brand'}</title></head>`,
        expectedBenefit: 'Clear headline in search results and improved topical matching.',
        caution: 'Keep length between 40-60 characters for optimal display.',
      });
    } else {
      if (isTargetMode && targetKws.length > 0) {
        const matchesTarget = targetKws.some((tk) => page.onPage.title.toLowerCase().includes(tk.toLowerCase()));
        if (!matchesTarget) {
          pageRecs.push({
            id: crypto.randomUUID(),
            priority: 'HIGH',
            category: 'ON_PAGE',
            title: `Include target keyword "${targetKws[0]}" in title tag`,
            affectedUrl: url,
            pageTitle,
            impact: 'Core on-page relevance signal for search query matching.',
            effort: 'LOW',
            confidence: 'HIGH',
            reason: `Current title "${page.onPage.title}" does not contain the supplied target keyword "${targetKws[0]}".`,
            recommendedAction: `Rewrite the title to naturally incorporate target keyword "${targetKws[0]}" near the beginning.`,
            quickWin: true,
            scoreImpactEstimate: 12,
            issue: 'Supplied target keyword missing from <title> tag.',
            whyItMatters: 'Front-loading primary target keywords in the title reinforces relevance for target queries.',
            evidence: `Title: "${page.onPage.title}" | Target Keyword: "${targetKws[0]}"`,
            action: 'Incorporate target keyword near the beginning of the title tag.',
            whatToChange: 'Text inside <title> tag.',
            before: `<title>${page.onPage.title}</title>`,
            after: `<title>${targetKws[0].charAt(0).toUpperCase() + targetKws[0].slice(1)}: ${page.onPage.title} | Brand</title>`,
            expectedBenefit: 'Direct query-to-title matching in search results.',
            caution: 'Ensure the resulting title remains natural and readable.',
          });
        }
      } else if (!isTargetMode && primaryTopics.length > 0) {
        const matchesTopic = primaryTopics.some((tp) => page.onPage.title.toLowerCase().includes(tp.toLowerCase()));
        if (!matchesTopic) {
          pageRecs.push({
            id: crypto.randomUUID(),
            priority: 'HIGH',
            category: 'ON_PAGE',
            title: `Reflect primary topic "${primaryTopics[0]}" in title tag`,
            affectedUrl: url,
            pageTitle,
            impact: 'Core on-page relevance signal for search query matching.',
            effort: 'LOW',
            confidence: 'HIGH',
            reason: `Current title "${page.onPage.title}" does not clearly reflect the primary page topic "${primaryTopics[0]}".`,
            recommendedAction: `Rewrite the title to naturally incorporate the primary topic "${primaryTopics[0]}" near the beginning.`,
            quickWin: true,
            scoreImpactEstimate: 10,
            issue: 'Primary page topic missing from <title> tag.',
            whyItMatters: 'Reflecting primary topics in the title reinforces relevance for search engines and visitors.',
            evidence: `Title: "${page.onPage.title}" | Extracted Primary Topic: "${primaryTopics[0]}"`,
            action: 'Incorporate primary topic near the beginning of the title tag.',
            whatToChange: 'Text inside <title> tag.',
            before: `<title>${page.onPage.title}</title>`,
            after: `<title>${primaryTopics[0].charAt(0).toUpperCase() + primaryTopics[0].slice(1)}: ${page.onPage.title} | Brand</title>`,
            expectedBenefit: 'Clear topical alignment in search results.',
            caution: 'Ensure the resulting title remains natural and readable.',
          });
        }
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
          issue: `Title length is ${page.onPage.titleLength} characters (optimal: 40-60).`,
          whyItMatters: 'Avoids SERP truncation or thin relevance signalling.',
          evidence: `Title length: ${page.onPage.titleLength} characters.`,
          action: 'Adjust title length to 40-60 characters.',
          whatToChange: 'Length of title tag text.',
          before: `<title>${page.onPage.title}</title>`,
          after: `<title>${page.onPage.titleLength > 65 ? page.onPage.title.slice(0, 55).trim() + ' | Brand' : page.onPage.title + ' - Complete Guide | Brand'}</title>`,
          expectedBenefit: 'Clean presentation in search results snippets without truncation.',
          caution: 'Prioritize the main topic keyword near the beginning.',
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
        recommendedAction: topTopic
          ? `Write a 140–160 character meta description containing "${topTopic}" and a clear call-to-action.`
          : 'Write a persuasive 140–160 character meta description summarizing the unique value of the page.',
        quickWin: true,
        scoreImpactEstimate: 10,
        issue: 'Missing meta description tag.',
        whyItMatters: 'Meta descriptions serve as ad copy in organic search listings, driving click-throughs.',
        evidence: 'No meta description found in document head.',
        action: 'Add a 120-160 character meta description with a call to action.',
        whatToChange: 'Add <meta name="description"> tag in <head>.',
        before: '<head></head>',
        after: `<meta name="description" content="Discover actionable insights and comprehensive solutions for ${topTopic || 'your needs'}. Explore our detailed guide today.">`,
        expectedBenefit: 'Higher click-through rate from search result pages.',
        caution: 'Write for human searchers with clear value propositions.',
      });
    }

    // H1 Heading Checks
    const h1Items = page.onPage.headings.items.filter((h) => h.level === 1);
    const h1Count = page.onPage.headings.h1Count || h1Items.length;
    const h1Text = h1Items[0]?.text || '';

    if (h1Count === 0) {
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
        recommendedAction: topTopic
          ? `Add an <h1> heading at the top of the main content containing "${topTopic}".`
          : 'Add a concise <h1> heading defining the primary subject of the page.',
        quickWin: true,
        scoreImpactEstimate: 12,
        issue: 'Missing <h1> heading tag.',
        whyItMatters: 'The H1 tag communicates the central topic of the page to search engines and users.',
        evidence: '0 <h1> tags detected.',
        action: 'Add exactly one prominent <h1> tag.',
        whatToChange: 'Insert <h1> at top of main content.',
        before: '<div class="title">Welcome</div>',
        after: `<h1>${topTopic ? topTopic.charAt(0).toUpperCase() + topTopic.slice(1) : 'Welcome to Our Platform'}</h1>`,
        expectedBenefit: 'Clean semantic structure and clear topic outline.',
        caution: 'Keep only one primary H1 on the page.',
      });
    } else if (h1Count > 1) {
      pageRecs.push({
        id: crypto.randomUUID(),
        priority: 'MEDIUM',
        category: 'ON_PAGE',
        title: `Consolidate multiple <h1> headings (${h1Count} found)`,
        affectedUrl: url,
        pageTitle,
        impact: 'Maintains clean document outline and singular topical focus.',
        effort: 'LOW',
        confidence: 'HIGH',
        reason: `Detected ${h1Count} separate <h1> tags in the markup.`,
        recommendedAction: 'Keep one clear primary <h1> heading for the page and restructure the other headings as <h2> or <h3> where they represent subsections.',
        quickWin: true,
        scoreImpactEstimate: 5,
        issue: 'Multiple H1 headings detected.',
        whyItMatters: 'Multiple primary headings create ambiguity in document outline hierarchy.',
        evidence: `Detected ${h1Count} <h1> elements.`,
        action: 'Retain one primary H1 and convert secondary H1s to H2/H3.',
        whatToChange: 'Secondary <h1> tags in content sections.',
        before: '<h1>Main Topic</h1>\n<h1>Section A</h1>\n<h1>Section B</h1>',
        after: '<h1>Main Topic</h1>\n<h2>Section A</h2>\n<h2>Section B</h2>',
        expectedBenefit: 'Unambiguous document hierarchy for search engines and assistive tools.',
        caution: 'Do not change heading levels purely for ranking. Use heading levels to represent actual content hierarchy.',
      });
    } else if (h1Count === 1) {
      // Check alignment based on mode
      if (isTargetMode && targetKws.length > 0) {
        const matchesTarget = targetKws.some((tk) => h1Text.toLowerCase().includes(tk.toLowerCase()));
        if (!matchesTarget) {
          pageRecs.push({
            id: crypto.randomUUID(),
            priority: 'MEDIUM',
            category: 'ON_PAGE',
            title: `Align H1 heading with target keyword "${targetKws[0]}"`,
            affectedUrl: url,
            pageTitle,
            impact: 'Reinforces primary query intent in the document headline.',
            effort: 'LOW',
            confidence: 'HIGH',
            reason: `The H1 heading "${h1Text}" does not clearly incorporate supplied target keyword "${targetKws[0]}".`,
            recommendedAction: 'Consider naturally incorporating the primary target topic into the H1 while keeping it readable.',
            quickWin: true,
            scoreImpactEstimate: 8,
            issue: 'Supplied target keyword is not clearly represented in the H1.',
            whyItMatters: 'Target keyword presence in H1 confirms subject relevance to search engines and users.',
            evidence: `H1: "${h1Text}" | Target Keyword: "${targetKws[0]}"`,
            action: 'Incorporate target keyword naturally into the H1.',
            whatToChange: 'Text within the <h1> element.',
            before: `<h1>${h1Text}</h1>`,
            after: `<h1>${targetKws[0].charAt(0).toUpperCase() + targetKws[0].slice(1)} - ${h1Text}</h1>`,
            expectedBenefit: 'Immediate relevance confirmation for targeted search queries.',
            caution: 'Do NOT blindly stuff keywords. Keep the H1 engaging and natural for human readers.',
          });
        }
      } else if (!isTargetMode && primaryTopics.length > 0) {
        const matchesTopic = primaryTopics.some(
          (tp) =>
            h1Text.toLowerCase().includes(tp.toLowerCase()) ||
            tp.split(' ').some((word) => word.length > 3 && h1Text.toLowerCase().includes(word.toLowerCase()))
        );
        if (!matchesTopic) {
          pageRecs.push({
            id: crypto.randomUUID(),
            priority: 'LOW',
            category: 'ON_PAGE',
            title: `Align H1 heading with primary topic "${primaryTopics[0]}"`,
            affectedUrl: url,
            pageTitle,
            impact: 'Clarifies main page topic hierarchy for search engines and readers.',
            effort: 'LOW',
            confidence: 'HIGH',
            reason: `The H1 heading "${h1Text}" does not clearly reflect the primary topics detected from the content (${primaryTopics.slice(0, 3).join(', ')}).`,
            recommendedAction: "Rewrite the H1 so it clearly communicates the page's primary topic identified from the page content.",
            quickWin: true,
            scoreImpactEstimate: 5,
            issue: 'H1 has weak alignment with the primary topic identified from the page content.',
            whyItMatters: "The H1 is the primary semantic heading of the document. Aligning it with the page's core subject improves clarity for both search engines and users.",
            evidence: `H1: "${h1Text}" | Extracted Primary Topics: ${primaryTopics.slice(0, 3).join(', ')}`,
            action: "Rewrite the H1 so it clearly communicates the page's primary topic.",
            whatToChange: 'Update the H1 headline to reflect the core subject of the webpage.',
            before: `<h1>${h1Text}</h1>`,
            after: `<h1>${primaryTopics[0].charAt(0).toUpperCase() + primaryTopics[0].slice(1)} Overview</h1>`,
            expectedBenefit: 'Improves semantic clarity for crawlers and reader comprehension.',
            caution: 'Ensure the H1 accurately describes the content that follows. Avoid keyword stuffing.',
          });
        }
      }
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
        issue: 'Heading Levels Skipped.',
        whyItMatters: 'Skipped levels violate accessibility standards and confuse outline parsers.',
        evidence: 'Non-sequential heading hierarchy detected.',
        action: 'Nest headings sequentially.',
        whatToChange: 'Heading level tags across content.',
        before: '<h1>Title</h1>\n<h3>Subtopic</h3>',
        after: '<h1>Title</h1>\n<h2>Subtopic</h2>',
        expectedBenefit: 'Clean outline structure and screen reader navigation.',
        caution: 'Choose heading levels based on semantic outline, not CSS font sizes.',
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
        issue: `Low content volume (${page.onPage.wordCount} words).`,
        whyItMatters: 'Thin pages often struggle to provide sufficient depth to satisfy search intent.',
        evidence: `Visible word count is ${page.onPage.wordCount} words.`,
        action: 'Expand content with detailed explanations, use cases, and supporting subtopics.',
        whatToChange: 'Add body sections with informative copy and structured headings.',
        before: '<p>Brief overview.</p>',
        after: '<p>In-depth guide with structured sections, benefits, and practical advice.</p>',
        expectedBenefit: 'Improves semantic breadth and organic search visibility.',
        caution: 'Ensure added content delivers genuine value rather than filler text.',
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
        recommendedAction: topTopic
          ? `Add 3–5 frequently asked questions addressing common queries about "${topTopic}".`
          : 'Add an FAQ section addressing user intent and common inquiries.',
        quickWin: false,
        scoreImpactEstimate: 8,
        issue: 'No FAQ or Q&A content detected.',
        whyItMatters: 'Answering common queries helps capture featured snippets and People Also Ask results.',
        evidence: '0 question-format headings or FAQ sections found.',
        action: 'Add 3-5 frequently asked questions with direct answers.',
        whatToChange: 'Add an FAQ section with H2/H3 question headings.',
        before: '<!-- No FAQ section -->',
        after: '<h2>Frequently Asked Questions</h2><h3>How does it work?</h3><p>...</p>',
        expectedBenefit: 'Eligible for rich snippets and conversational search visibility.',
        caution: 'Provide concise, direct answers within the first sentence of each answer.',
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
        issue: 'Low contextual internal links.',
        whyItMatters: 'Internal links distribute link equity and guide search bots across site architecture.',
        evidence: `Found only ${page.links.internalLinksCount} internal links.`,
        action: 'Add 3-5 contextual internal links with descriptive anchor text.',
        whatToChange: 'Body text hyperlinks.',
        before: '<p>Read our documentation online.</p>',
        after: '<p>Read our <a href="/docs/guide">complete optimization guide</a> to learn more.</p>',
        expectedBenefit: 'Improved crawl discovery and lower bounce rates.',
        caution: 'Use natural, descriptive anchor text rather than generic "click here" labels.',
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
        issue: 'No JSON-LD schema markup detected.',
        whyItMatters: 'Structured data enables rich snippet enhancements in search results.',
        evidence: '0 Schema.org JSON-LD scripts detected.',
        action: 'Add relevant JSON-LD structured data in <head> or body.',
        whatToChange: 'Add <script type="application/ld+json"> tag.',
        before: '<!-- No schema -->',
        after: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"..."}</script>',
        expectedBenefit: 'Eligible for rich snippet enhancements in Google SERP results.',
        caution: 'Only mark up content that is actually visible to users on the page.',
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
        issue: `${page.images.missingAlt} images missing alt text.`,
        whyItMatters: 'Alt text is critical for accessibility (WCAG) and indexing in Google Images.',
        evidence: `${page.images.missingAlt} / ${page.images.totalImages} images lack alt attributes.`,
        action: 'Add concise alt text describing each image.',
        whatToChange: '<img> tags lacking alt attributes.',
        before: '<img src="screenshot.png">',
        after: '<img src="screenshot.png" alt="Dashboard interface showing SEO performance metrics">',
        expectedBenefit: 'Screen reader accessibility and image search discoverability.',
        caution: 'For purely decorative images, use empty alt="" instead of omitting the attribute.',
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

