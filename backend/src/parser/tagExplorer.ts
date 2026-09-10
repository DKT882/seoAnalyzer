import * as cheerio from 'cheerio';
import { TagExplorerData, PageElementItem, ElementIssueStatus } from '@seo-analyzer/shared';
import crypto from 'node:crypto';

export function extractTagExplorerData(
  $: cheerio.CheerioAPI,
  pageUrl: string
): TagExplorerData {
  const metadata: PageElementItem[] = [];
  const headings: PageElementItem[] = [];
  const social: PageElementItem[] = [];
  const content: PageElementItem[] = [];
  const links: PageElementItem[] = [];
  const images: PageElementItem[] = [];
  const structuredData: PageElementItem[] = [];

  const createItem = (
    category: PageElementItem['category'],
    tag: string,
    name: string,
    value: string,
    location: string,
    count: number,
    seoRelevance: 'HIGH' | 'MEDIUM' | 'LOW',
    status: ElementIssueStatus,
    recommendation: string,
    attributes?: Record<string, string>
  ): PageElementItem => ({
    id: `tag-${crypto.randomUUID().slice(0, 8)}`,
    category,
    tag,
    name,
    value: value.slice(0, 300), // Trim preview
    location,
    count,
    seoRelevance,
    status,
    recommendation,
    attributes,
  });

  // 1. METADATA
  // Title
  const title = $('title').first().text().trim();
  const titleCount = $('title').length;
  if (titleCount === 0) {
    metadata.push(
      createItem(
        'metadata',
        '<title>',
        'Page Title',
        'Missing',
        '<head>',
        0,
        'HIGH',
        'CRITICAL',
        'Add a unique, descriptive <title> tag between 50-60 characters.'
      )
    );
  } else {
    const titleLen = title.length;
    let titleStatus: ElementIssueStatus = 'OPTIMAL';
    let titleRec = 'Title length and format is within standard 50-60 character best practices.';
    if (titleLen < 30) {
      titleStatus = 'WARNING';
      titleRec = 'Title is relatively short (<30 chars). Consider adding core target keywords.';
    } else if (titleLen > 65) {
      titleStatus = 'WARNING';
      titleRec = 'Title exceeds 65 characters and may be truncated in search results snippets.';
    }
    metadata.push(
      createItem(
        'metadata',
        '<title>',
        'Page Title',
        title,
        '<head>',
        titleCount,
        'HIGH',
        titleStatus,
        titleRec,
        { length: String(titleLen) }
      )
    );
  }

  // Meta Description
  const metaDesc = $('meta[name="description" i], meta[property="description" i]').attr('content')?.trim() || '';
  const metaDescCount = $('meta[name="description" i]').length;
  if (!metaDesc) {
    metadata.push(
      createItem(
        'metadata',
        '<meta name="description">',
        'Meta Description',
        'Missing',
        '<head>',
        0,
        'HIGH',
        'WARNING',
        'Add a compelling meta description between 120-160 characters to boost CTR in search results.'
      )
    );
  } else {
    const descLen = metaDesc.length;
    let descStatus: ElementIssueStatus = 'OPTIMAL';
    let descRec = 'Meta description length is in the optimal 120-160 character range.';
    if (descLen < 70) {
      descStatus = 'WARNING';
      descRec = 'Meta description is brief (<70 chars). Expand to highlight page value proposition.';
    } else if (descLen > 165) {
      descStatus = 'WARNING';
      descRec = 'Meta description exceeds 165 characters and will likely be truncated on SERPs.';
    }
    metadata.push(
      createItem(
        'metadata',
        '<meta name="description">',
        'Meta Description',
        metaDesc,
        '<head>',
        metaDescCount,
        'HIGH',
        descStatus,
        descRec,
        { length: String(descLen) }
      )
    );
  }

  // Canonical
  const canonical = $('link[rel="canonical" i]').attr('href')?.trim() || '';
  if (!canonical) {
    metadata.push(
      createItem(
        'metadata',
        '<link rel="canonical">',
        'Canonical Link',
        'Missing',
        '<head>',
        0,
        'HIGH',
        'WARNING',
        'Specify a canonical tag pointing to the authoritative URL to prevent duplicate content consolidation issues.'
      )
    );
  } else {
    metadata.push(
      createItem(
        'metadata',
        '<link rel="canonical">',
        'Canonical Link',
        canonical,
        '<head>',
        1,
        'HIGH',
        'OPTIMAL',
        'Canonical link is declared.'
      )
    );
  }

  // Robots Meta
  const robotsMeta = $('meta[name="robots" i]').attr('content')?.trim() || 'index, follow (default)';
  const isNoIndex = robotsMeta.toLowerCase().includes('noindex');
  metadata.push(
    createItem(
      'metadata',
      '<meta name="robots">',
      'Robots Directives',
      robotsMeta,
      '<head>',
      $('meta[name="robots" i]').length || 1,
      'HIGH',
      isNoIndex ? 'CRITICAL' : 'OPTIMAL',
      isNoIndex
        ? 'Page contains noindex directive, preventing search engines from indexing this page.'
        : 'Robots meta permits search engine indexing and link following.'
    )
  );

  // Viewport
  const viewport = $('meta[name="viewport" i]').attr('content')?.trim() || '';
  metadata.push(
    createItem(
      'metadata',
      '<meta name="viewport">',
      'Mobile Viewport',
      viewport || 'Missing',
      '<head>',
      $('meta[name="viewport" i]').length,
      'HIGH',
      viewport ? 'OPTIMAL' : 'CRITICAL',
      viewport
        ? 'Mobile viewport is properly defined for responsive rendering.'
        : 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile responsiveness.'
    )
  );

  // Charset
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type" i]').attr('content') || 'UTF-8';
  metadata.push(
    createItem(
      'metadata',
      '<meta charset>',
      'Character Encoding',
      charset,
      '<head>',
      1,
      'MEDIUM',
      'OPTIMAL',
      'Character set declaration ensures correct cross-browser text rendering.'
    )
  );

  // Language & Hreflang
  const htmlLang = $('html').attr('lang') || 'Unspecified';
  metadata.push(
    createItem(
      'metadata',
      '<html lang>',
      'HTML Language',
      htmlLang,
      '<html>',
      1,
      'MEDIUM',
      htmlLang !== 'Unspecified' ? 'OPTIMAL' : 'WARNING',
      htmlLang !== 'Unspecified'
        ? 'HTML lang attribute accurately declared.'
        : 'Specify lang attribute on <html> element (e.g. lang="en") for internationalization and accessibility.'
    )
  );

  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang') || '';
    const href = $(el).attr('href') || '';
    metadata.push(
      createItem(
        'metadata',
        '<link hreflang>',
        `Hreflang (${lang})`,
        href,
        '<head>',
        1,
        'MEDIUM',
        'OPTIMAL',
        'Hreflang alternative declared for localized content targeting.'
      )
    );
  });

  // 2. HEADINGS (H1-H6)
  const h1Elements = $('h1');
  if (h1Elements.length === 0) {
    headings.push(
      createItem(
        'headings',
        '<h1>',
        'Primary Heading (H1)',
        'Missing',
        '<body>',
        0,
        'HIGH',
        'CRITICAL',
        'Add exactly one distinct <h1> heading incorporating your target primary keyword.'
      )
    );
  } else if (h1Elements.length > 1) {
    headings.push(
      createItem(
        'headings',
        '<h1>',
        'Multiple Primary Headings',
        `${h1Elements.length} H1 tags detected: "${h1Elements.first().text().trim()}"...`,
        '<body>',
        h1Elements.length,
        'HIGH',
        'WARNING',
        'Multiple H1 headings detected. Best practice is to use a single primary H1 followed by structured H2/H3 subsections.'
      )
    );
  } else {
    headings.push(
      createItem(
        'headings',
        '<h1>',
        'Primary Heading (H1)',
        h1Elements.first().text().trim(),
        '<body>',
        1,
        'HIGH',
        'OPTIMAL',
        'Single H1 heading is in place.'
      )
    );
  }

  for (let level = 2; level <= 6; level++) {
    const elements = $(`h${level}`);
    if (elements.length > 0) {
      const sampleTexts = elements
        .slice(0, 3)
        .map((_, el) => $(el).text().trim())
        .get()
        .join(' | ');
      headings.push(
        createItem(
          'headings',
          `<h${level}>`,
          `Subheadings (H${level})`,
          `${elements.length} found: ${sampleTexts}`,
          '<body>',
          elements.length,
          level <= 3 ? 'HIGH' : 'MEDIUM',
          'OPTIMAL',
          `H${level} subheadings structure the document into digestible topical sections.`
        )
      );
    }
  }

  // 3. SOCIAL (OpenGraph & Twitter Cards)
  const ogProps = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];
  ogProps.forEach((prop) => {
    const val = $(`meta[property="${prop}" i]`).attr('content')?.trim();
    if (val) {
      social.push(
        createItem(
          'social',
          `<meta property="${prop}">`,
          `OpenGraph (${prop})`,
          val,
          '<head>',
          1,
          'MEDIUM',
          'OPTIMAL',
          'Provides rich preview rendering when shared on social networks and messaging apps.'
        )
      );
    }
  });

  const twitterProps = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site'];
  twitterProps.forEach((prop) => {
    const val = $(`meta[name="${prop}" i], meta[property="${prop}" i]`).attr('content')?.trim();
    if (val) {
      social.push(
        createItem(
          'social',
          `<meta name="${prop}">`,
          `Twitter Card (${prop})`,
          val,
          '<head>',
          1,
          'MEDIUM',
          'OPTIMAL',
          'Configures Twitter/X card preview appearance.'
        )
      );
    }
  });

  if (social.length === 0) {
    social.push(
      createItem(
        'social',
        '<meta property="og:*">',
        'Social Graph Metadata',
        'None detected',
        '<head>',
        0,
        'MEDIUM',
        'WARNING',
        'Add OpenGraph (og:title, og:image, og:description) and Twitter Card tags for enhanced social engagement.'
      )
    );
  }

  // 4. CONTENT & SEMANTIC ELEMENTS
  const paragraphs = $('p');
  content.push(
    createItem(
      'content',
      '<p>',
      'Body Paragraphs',
      `${paragraphs.length} paragraphs detected`,
      '<body>',
      paragraphs.length,
      'HIGH',
      paragraphs.length >= 3 ? 'OPTIMAL' : 'WARNING',
      paragraphs.length >= 3
        ? 'Sufficient body paragraph density for topical depth.'
        : 'Low paragraph count. Expand body text to address comprehensive search intent.'
    )
  );

  const lists = $('ul, ol');
  content.push(
    createItem(
      'content',
      '<ul> / <ol>',
      'Lists (Unordered & Ordered)',
      `${lists.length} lists detected`,
      '<body>',
      lists.length,
      'MEDIUM',
      lists.length > 0 ? 'OPTIMAL' : 'INFO',
      lists.length > 0
        ? 'Lists enhance readability, scannability, and featured snippet eligibility.'
        : 'Consider adding bulleted or numbered lists for key concepts to improve scannability.'
    )
  );

  const tables = $('table');
  content.push(
    createItem(
      'content',
      '<table>',
      'Data Tables',
      `${tables.length} tables detected`,
      '<body>',
      tables.length,
      'LOW',
      tables.length > 0 ? 'OPTIMAL' : 'INFO',
      tables.length > 0
        ? 'Data tables provide structured tabular data often favored for Google table snippets.'
        : 'Include comparison or pricing tables where relevant.'
    )
  );

  const blockquotes = $('blockquote');
  if (blockquotes.length > 0) {
    content.push(
      createItem(
        'content',
        '<blockquote>',
        'Quotes & Citations',
        `${blockquotes.length} blockquotes detected`,
        '<body>',
        blockquotes.length,
        'LOW',
        'OPTIMAL',
        'Blockquotes highlight authoritative quotes, testimonials, and expert citations.'
      )
    );
  }

  const semanticTags = ['main', 'article', 'section', 'nav', 'aside', 'header', 'footer'];
  semanticTags.forEach((tag) => {
    const count = $(tag).length;
    if (count > 0) {
      content.push(
        createItem(
          'content',
          `<${tag}>`,
          `Semantic Landmark <${tag}>`,
          `${count} element(s) present`,
          '<body>',
          count,
          'MEDIUM',
          'OPTIMAL',
          `Semantic <${tag}> tag improves accessibility and DOM hierarchy comprehension for crawlers.`
        )
      );
    }
  });

  // 5. LINKS
  let intCount = 0;
  let extCount = 0;
  let nofollowCount = 0;
  let ugcCount = 0;
  let sponsoredCount = 0;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    const rel = $(el).attr('rel')?.toLowerCase() || '';
    if (href.startsWith('#') || href.startsWith('javascript:')) return;

    if (rel.includes('nofollow')) nofollowCount++;
    if (rel.includes('ugc')) ugcCount++;
    if (rel.includes('sponsored')) sponsoredCount++;

    try {
      const linkUrl = new URL(href, pageUrl);
      const pageHost = new URL(pageUrl).hostname;
      if (linkUrl.hostname === pageHost) {
        intCount++;
      } else {
        extCount++;
      }
    } catch {
      intCount++;
    }
  });

  links.push(
    createItem(
      'links',
      '<a href="internal">',
      'Internal Links',
      `${intCount} internal links discovered`,
      '<body>',
      intCount,
      'HIGH',
      intCount > 0 ? 'OPTIMAL' : 'WARNING',
      intCount > 0
        ? 'Internal links distribute PageRank equity and assist user navigation.'
        : 'Add contextual internal links to other relevant content on your website.'
    )
  );

  links.push(
    createItem(
      'links',
      '<a href="external">',
      'External Links',
      `${extCount} external outbound links discovered`,
      '<body>',
      extCount,
      'MEDIUM',
      'OPTIMAL',
      'Outbound links to reputable external resources build topical trust and citation value.'
    )
  );

  if (nofollowCount > 0) {
    links.push(
      createItem(
        'links',
        '<a rel="nofollow">',
        'Nofollow Links',
        `${nofollowCount} nofollow links detected`,
        '<body>',
        nofollowCount,
        'MEDIUM',
        'INFO',
        'Nofollow attributes signal search engines not to pass PageRank equity to target URLs.'
      )
    );
  }

  if (sponsoredCount > 0 || ugcCount > 0) {
    links.push(
      createItem(
        'links',
        '<a rel="sponsored|ugc">',
        'Sponsored / UGC Links',
        `${sponsoredCount} sponsored, ${ugcCount} UGC links detected`,
        '<body>',
        sponsoredCount + ugcCount,
        'MEDIUM',
        'OPTIMAL',
        'Compliant usage of Google recommended rel attributes for paid and user-generated links.'
      )
    );
  }

  // 6. IMAGES
  const imgTags = $('img');
  let withAlt = 0;
  let missingAlt = 0;
  let lazyLoading = 0;

  imgTags.each((_, el) => {
    const alt = $(el).attr('alt');
    const loading = $(el).attr('loading');
    if (alt !== undefined && alt.trim() !== '') {
      withAlt++;
    } else {
      missingAlt++;
    }
    if (loading === 'lazy') lazyLoading++;
  });

  images.push(
    createItem(
      'images',
      '<img alt="...">',
      'Image ALT Text Coverage',
      `${withAlt} of ${imgTags.length} images have ALT attributes`,
      '<body>',
      imgTags.length,
      'HIGH',
      missingAlt === 0 ? 'OPTIMAL' : missingAlt > 5 ? 'CRITICAL' : 'WARNING',
      missingAlt === 0
        ? '100% of images have descriptive ALT text.'
        : `${missingAlt} image(s) lack ALT text. Add descriptive ALT text for accessibility and Google Image ranking.`,
      { altCoverage: `${imgTags.length > 0 ? Math.round((withAlt / imgTags.length) * 100) : 100}%` }
    )
  );

  if (lazyLoading > 0) {
    images.push(
      createItem(
        'images',
        '<img loading="lazy">',
        'Native Lazy Loading',
        `${lazyLoading} images configured with loading="lazy"`,
        '<body>',
        lazyLoading,
        'MEDIUM',
        'OPTIMAL',
        'Native lazy loading defers off-screen image loading to improve Core Web Vitals LCP and bandwidth.'
      )
    );
  }

  // 7. STRUCTURED DATA / SCHEMA
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const detectedTypes: string[] = [];

  jsonLdScripts.each((_, el) => {
    try {
      const raw = $(el).html();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed['@type']) {
          const types = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']];
          detectedTypes.push(...types);
        }
      }
    } catch {
      // ignore
    }
  });

  if (detectedTypes.length > 0) {
    structuredData.push(
      createItem(
        'structuredData',
        '<script type="application/ld+json">',
        'JSON-LD Schemas',
        `Schemas detected: ${detectedTypes.join(', ')}`,
        '<head> / <body>',
        detectedTypes.length,
        'HIGH',
        'OPTIMAL',
        'Valid JSON-LD schemas assist search engines with entity recognition and rich snippet eligibility.'
      )
    );
  } else {
    structuredData.push(
      createItem(
        'structuredData',
        '<script type="application/ld+json">',
        'JSON-LD Schema Missing',
        'No structured data detected',
        '<head>',
        0,
        'HIGH',
        'RECOMMENDATION' as ElementIssueStatus,
        'Add Schema.org JSON-LD structured data (e.g. WebPage, Article, Organization, BreadcrumbList, FAQPage) for rich snippet eligibility.'
      )
    );
  }

  const totalElementsCount =
    metadata.length +
    headings.length +
    social.length +
    content.length +
    links.length +
    images.length +
    structuredData.length;

  return {
    totalElementsCount,
    metadata,
    headings,
    social,
    content,
    links,
    images,
    structuredData,
  };
}
