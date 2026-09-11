import * as cheerio from 'cheerio';

export interface ExtractedPageContent {
  cleanVisibleText: string;
  cleanFullText: string;
  mainContentText: string;
  title: string;
  metaDescription: string;
  h1List: string[];
  h2H6List: string[];
  navText: string;
  footerText: string;
  altTexts: string[];
  anchorTexts: string[];
  sentences: string[];
}

/**
 * Extracts and cleans visible text from HTML DOM, stripping non-content tags,
 * eliminating tag-joining concatenation corruptions, and classifying sections.
 */
export function extractCleanContent(rawHtml: string): ExtractedPageContent {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      cleanVisibleText: '',
      cleanFullText: '',
      mainContentText: '',
      title: '',
      metaDescription: '',
      h1List: [],
      h2H6List: [],
      navText: '',
      footerText: '',
      altTexts: [],
      anchorTexts: [],
      sentences: [],
    };
  }

  const $ = cheerio.load(rawHtml);

  // 1. Extract raw Title & Meta Description before DOM stripping
  const rawTitle = $('title').first().text() || $('meta[property="og:title"]').attr('content') || '';
  const rawMetaDesc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // 2. Extract meaningful Image ALT texts
  const altTexts: string[] = [];
  $('img[alt]').each((_, el) => {
    const alt = $(el).attr('alt')?.trim();
    if (alt && alt.length >= 2 && !alt.startsWith('data:') && !alt.startsWith('http')) {
      altTexts.push(alt);
    }
  });

  // 3. Extract meaningful Anchor texts
  const anchorTexts: string[] = [];
  $('a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length >= 2 && !text.startsWith('http')) {
      anchorTexts.push(text);
    }
  });

  // 4. Create separate clones for Navigation & Footer before stripping
  let navText = '';
  $('nav, header nav, .nav, .menu, .navbar, #nav, #navigation').each((_, el) => {
    navText += ' ' + $(el).text();
  });

  let footerText = '';
  $('footer, .footer, #footer, .site-footer, [role="contentinfo"]').each((_, el) => {
    footerText += ' ' + $(el).text();
  });

  // 5. Extract Headings hierarchy before stripping
  const h1List: string[] = [];
  $('h1').each((_, el) => {
    const t = $(el).text().trim();
    if (t) h1List.push(t);
  });

  const h2H6List: string[] = [];
  $('h2, h3, h4, h5, h6').each((_, el) => {
    const t = $(el).text().trim();
    if (t) h2H6List.push(t);
  });

  // 6. Deep cleaning of the main DOM tree
  // Remove scripts, styles, forms, noscripts, iframes, templates, svg, canvas, hidden elements, etc.
  $(
    'script, style, noscript, template, svg, canvas, iframe, object, embed, ' +
    'applet, audio, video, map, dialog, form, input, textarea, select, button, ' +
    'option, fieldset, code, pre, kbd, samp, var, link, meta, ' +
    '[hidden], [aria-hidden="true"], .hidden, [style*="display:none"], [style*="display: none"], ' +
    '[style*="visibility:hidden"], [style*="visibility: hidden"]'
  ).remove();

  // 7. CRITICAL FIX: Insert boundary spaces around all DOM elements (both block and inline)
  // This prevents adjacent tags from concatenating into garbage words like "2026-09-11daily1" or "0https"
  $('*').each((_, el) => {
    $(el).prepend(' ').append(' ');
  });

  // 8. Extract Main Content area
  let mainContentText = '';
  const $mainArea = $('main, article, [role="main"], #content, .main-content, .post-content, .article-body, .entry-content');
  if ($mainArea.length > 0) {
    mainContentText = $mainArea.text();
  } else {
    // Fallback: collect paragraphs and headings
    mainContentText = $('h1, h2, h3, h4, p, li, blockquote').text();
  }

  // 9. Extract Full Body text (without nav/footer for clean visible text)
  const cleanClone = cheerio.load($.html());
  cleanClone('nav, header nav, .nav, .menu, .navbar, #nav, footer, .footer, #footer, .site-footer, [role="contentinfo"]').remove();
  const cleanVisibleText = cleanClone('body').text() || cleanClone.root().text();

  const cleanFullText = $('body').text() || $.root().text();

  // 10. Normalize whitespace
  const normalize = (txt: string) =>
    txt
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const normVisible = normalize(cleanVisibleText);
  const normFull = normalize(cleanFullText);
  const normMain = normalize(mainContentText);
  const normNav = normalize(navText);
  const normFooter = normalize(footerText);

  // 11. Sentence segmentation from main content and visible text
  const sentenceDelimiters = /(?<=[.!?])\s+|\n\n+|(?<=[|•—–])\s+/;
  const rawSentences = normVisible.split(sentenceDelimiters);
  const sentences = rawSentences
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.includes(' '));

  return {
    cleanVisibleText: normVisible,
    cleanFullText: normFull,
    mainContentText: normMain,
    title: normalize(rawTitle),
    metaDescription: normalize(rawMetaDesc),
    h1List: h1List.map(normalize),
    h2H6List: h2H6List.map(normalize),
    navText: normNav,
    footerText: normFooter,
    altTexts: altTexts.map(normalize),
    anchorTexts: anchorTexts.map(normalize),
    sentences,
  };
}
