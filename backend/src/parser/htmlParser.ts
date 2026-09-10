import * as cheerio from 'cheerio';
import { extractHeadingsHierarchy } from './headingTree.js';
import { HeadingHierarchy } from '@seo-analyzer/shared';

export interface ParsedHtmlContent {
  $: cheerio.CheerioAPI;
  visibleText: string;
  wordCount: number;
  uniqueWordCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;
  textToHtmlRatio: number;
  first100Words: string;
  first200Words: string;
  headings: HeadingHierarchy;
  paragraphsCount: number;
  listsCount: number;
  tablesCount: number;
}

export function parseHtmlContent(rawHtml: string): ParsedHtmlContent {
  const $ = cheerio.load(rawHtml);

  // Extract structural heading hierarchy before mutating DOM
  const headings = extractHeadingsHierarchy($);

  // Count structural blocks
  const paragraphsCount = $('p').length;
  const listsCount = $('ul, ol').length;
  const tablesCount = $('table').length;

  // Create clean clone for text analysis
  const $clean = cheerio.load(rawHtml);

  // Strip non-content and noisy elements
  $clean(
    'script, style, noscript, svg, canvas, audio, video, template, iframe, ' +
    'header nav, footer, [aria-hidden="true"], [hidden], .hidden, style, link'
  ).remove();

  // Extract clean visible text
  const bodyText = $clean('body').text() || $clean.root().text();
  const visibleText = bodyText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Tokenize words for counting
  const words = visibleText
    .toLowerCase()
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/gi) || [];

  const wordCount = words.length;
  const uniqueWordCount = new Set(words).size;

  // Approximate sentence count (splitting on . ! ?)
  const sentences = visibleText.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // Average reading speed: ~200-220 words per minute
  const readingTimeMinutes = wordCount > 0 ? parseFloat((wordCount / 200).toFixed(1)) : 0;

  // Text-to-HTML ratio calculation
  const totalHtmlLength = rawHtml.length;
  const visibleTextLength = visibleText.length;
  const textToHtmlRatio = totalHtmlLength > 0 ? parseFloat(((visibleTextLength / totalHtmlLength) * 100).toFixed(2)) : 0;

  const first100Words = words.slice(0, 100).join(' ');
  const first200Words = words.slice(0, 200).join(' ');

  return {
    $,
    visibleText,
    wordCount,
    uniqueWordCount,
    sentenceCount,
    readingTimeMinutes,
    textToHtmlRatio,
    first100Words,
    first200Words,
    headings,
    paragraphsCount,
    listsCount,
    tablesCount,
  };
}
