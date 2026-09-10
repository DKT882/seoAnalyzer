import * as cheerio from 'cheerio';
import { extractSocialMetadata } from './socialMeta.js';
import { resolveAbsoluteUrl } from '../utils/urlUtils.js';

export interface ExtractedMetadata {
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonicalUrl: string;
  isCanonicalMatch: boolean;
  robotsMeta: string;
  viewport: string;
  language: string;
  charset: string;
  hreflang: Array<{ lang: string; href: string }>;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
}

export function extractPageMetadata($: cheerio.CheerioAPI, currentUrl: string): ExtractedMetadata {
  // Title extraction
  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const titleLength = title.length;

  // Meta Description
  const metaDescription = (
    $('meta[name="description" i]').attr('content') ||
    $('meta[property="og:description" i]').attr('content') ||
    ''
  ).replace(/\s+/g, ' ').trim();
  const metaDescriptionLength = metaDescription.length;

  // Canonical URL
  const rawCanonical = $('link[rel="canonical" i]').attr('href') || '';
  const canonicalUrl = rawCanonical ? resolveAbsoluteUrl(rawCanonical, currentUrl) || rawCanonical : '';
  const isCanonicalMatch = canonicalUrl.length > 0 && (
    canonicalUrl.replace(/\/$/, '').toLowerCase() === currentUrl.replace(/\/$/, '').toLowerCase()
  );

  // Robots meta
  const robotsMeta = (
    $('meta[name="robots" i]').attr('content') ||
    $('meta[name="googlebot" i]').attr('content') ||
    ''
  ).toLowerCase().trim();

  // Viewport
  const viewport = $('meta[name="viewport" i]').attr('content') || '';

  // Language & Charset
  const language = $('html').attr('lang') || $('meta[http-equiv="content-language" i]').attr('content') || '';
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type" i]').attr('content') || 'utf-8';

  // Hreflang alternates
  const hreflang: Array<{ lang: string; href: string }> = [];
  $('link[rel="alternate" i][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang') || '';
    const href = $(el).attr('href') || '';
    if (lang && href) {
      const absHref = resolveAbsoluteUrl(href, currentUrl) || href;
      hreflang.push({ lang, href: absHref });
    }
  });

  // Social tags
  const { ogTags, twitterTags } = extractSocialMetadata($);

  return {
    title,
    titleLength,
    metaDescription,
    metaDescriptionLength,
    canonicalUrl,
    isCanonicalMatch,
    robotsMeta,
    viewport,
    language,
    charset,
    hreflang,
    ogTags,
    twitterTags,
  };
}
