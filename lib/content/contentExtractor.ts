import * as cheerio from 'cheerio';
import { ContentBlock, ContentExtractionResult } from '@/types';

/**
 * Extracts and partitions page text into clean main content blocks vs excluded boilerplate blocks.
 */
export function extractContentBlocks(html: string): ContentExtractionResult {
  if (!html || typeof html !== 'string') {
    return {
      mainContentBlocks: [],
      excludedBlocks: [],
      mainContentWordCount: 0,
      excludedWordCount: 0,
      mainContentText: '',
      totalRawWordCount: 0,
      contentToHtmlRatio: 0,
      boilerPlateRatio: 0,
    };
  }

  const $ = cheerio.load(html);

  // 1. Remove non-content structural code
  $('script, style, noscript, svg, iframe, canvas, template').remove();

  const excludedBlocks: ContentBlock[] = [];
  const mainContentBlocks: ContentBlock[] = [];
  let blockCounter = 0;

  // 2. Identify boilerplate selector candidates
  const boilerplateSelectors = [
    'header',
    'footer',
    'nav',
    'aside',
    '[role="banner"]',
    '[role="navigation"]',
    '[role="contentinfo"]',
    '.nav',
    '.navbar',
    '.header',
    '.footer',
    '.sidebar',
    '.cookie-banner',
    '.cookie-consent',
    '#cookie-banner',
    '#cookie-notice',
    '.gdpr',
    '.ads',
    '.advertisement',
    '.popup',
    '.modal',
  ];

  // Extract boilerplate blocks
  boilerplateSelectors.forEach((sel) => {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const words = text ? text.split(/\s+/).filter(Boolean) : [];
      if (words.length > 0) {
        excludedBlocks.push({
          id: `excluded_${++blockCounter}`,
          type: 'paragraph',
          tag: $(el).prop('tagName')?.toLowerCase() || 'div',
          text,
          wordCount: words.length,
          isBoilerplate: true,
          isMainContent: false,
          locationIndex: blockCounter,
        });
      }
    });
  });

  // Remove boilerplate from DOM before main content extraction
  boilerplateSelectors.forEach((sel) => {
    $(sel).remove();
  });

  // 3. Determine main container
  let $mainContainer = $('main');
  if ($mainContainer.length === 0) {
    $mainContainer = $('[role="main"]');
  }
  if ($mainContainer.length === 0) {
    $mainContainer = $('article');
  }
  if ($mainContainer.length === 0) {
    $mainContainer = $('#main, #content, .main-content, .post-content, .entry-content');
  }
  if ($mainContainer.length === 0 || $mainContainer.text().trim().length < 50) {
    $mainContainer = $('body');
  }

  // 4. Extract structured blocks from container
  const contentElements = $mainContainer.find(
    'h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, dl, details'
  );

  const processedElements = new Set<any>();

  if (contentElements.length > 0) {
    contentElements.each((_, el) => {
      if (processedElements.has(el)) return;
      processedElements.add(el);

      // Don't double process nested elements if parent was already processed
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();
      const rawText = $el.text().replace(/\s+/g, ' ').trim();
      const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];

      if (words.length === 0) return;

      let type: ContentBlock['type'] = 'paragraph';
      let headingLevel: number | undefined;

      if (tagName.startsWith('h') && tagName.length === 2) {
        type = 'heading';
        headingLevel = parseInt(tagName[1], 10) || 2;
      } else if (tagName === 'ul' || tagName === 'ol') {
        type = 'list';
      } else if (tagName === 'table') {
        type = 'table';
      } else if (tagName === 'blockquote') {
        type = 'quote';
      } else if (tagName === 'details') {
        type = 'faq_qa';
      } else if (tagName === 'dl') {
        type = 'product_spec';
      }

      mainContentBlocks.push({
        id: `block_${++blockCounter}`,
        type,
        tag: tagName,
        text: rawText,
        wordCount: words.length,
        headingLevel,
        isBoilerplate: false,
        isMainContent: true,
        locationIndex: blockCounter,
      });
    });
  } else {
    // Fallback if no block tags found
    const bodyText = $mainContainer.text().replace(/\s+/g, ' ').trim();
    if (bodyText) {
      const words = bodyText.split(/\s+/).filter(Boolean);
      mainContentBlocks.push({
        id: `block_${++blockCounter}`,
        type: 'paragraph',
        tag: 'div',
        text: bodyText,
        wordCount: words.length,
        isBoilerplate: false,
        isMainContent: true,
        locationIndex: blockCounter,
      });
    }
  }

  const mainContentWordCount = mainContentBlocks.reduce((acc, b) => acc + b.wordCount, 0);
  const excludedWordCount = excludedBlocks.reduce((acc, b) => acc + b.wordCount, 0);
  const totalRawWordCount = mainContentWordCount + excludedWordCount;
  const mainContentText = mainContentBlocks.map((b) => b.text).join('\n\n');

  const htmlLength = Math.max(1, html.length);
  const contentToHtmlRatio = Math.round(((mainContentText.length / htmlLength) * 100) * 100) / 100;
  const boilerPlateRatio =
    totalRawWordCount > 0
      ? Math.round((excludedWordCount / totalRawWordCount) * 100) / 100
      : 0;

  return {
    mainContentBlocks,
    excludedBlocks,
    mainContentWordCount,
    excludedWordCount,
    mainContentText,
    totalRawWordCount,
    contentToHtmlRatio,
    boilerPlateRatio,
  };
}
