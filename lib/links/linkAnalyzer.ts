import * as cheerio from 'cheerio';
import { resolveAbsoluteUrl, isSameOrigin } from '../utils/urlUtils';
import { LinkItem, LinksAnalysis } from '@/types';

export function analyzeLinks($: cheerio.CheerioAPI, baseUrl: string): LinksAnalysis {
  const internalLinks: LinkItem[] = [];
  const externalLinks: LinkItem[] = [];
  const brokenLinks: LinkItem[] = [];

  let totalLinks = 0;
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let nofollowCount = 0;

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
    const rel = ($(el).attr('rel') || '').toLowerCase();
    const isNofollow = rel.includes('nofollow');

    const absUrl = resolveAbsoluteUrl(rawHref, baseUrl);
    if (!absUrl) {
      return; // Skip invalid or non-HTTP anchors like javascript: or mailto:
    }

    totalLinks++;
    if (isNofollow) nofollowCount++;

    const internal = isSameOrigin(absUrl, baseUrl);
    const linkItem: LinkItem = {
      url: absUrl,
      text: anchorText,
      isInternal: internal,
      isExternal: !internal,
      isNofollow,
    };

    if (internal) {
      internalLinksCount++;
      internalLinks.push(linkItem);
    } else {
      externalLinksCount++;
      externalLinks.push(linkItem);
    }
  });

  const internalExternalRatio = externalLinksCount > 0
    ? parseFloat((internalLinksCount / externalLinksCount).toFixed(2))
    : internalLinksCount;

  return {
    totalLinks,
    internalLinksCount,
    externalLinksCount,
    nofollowCount,
    internalLinks,
    externalLinks,
    brokenLinks,
    internalExternalRatio,
  };
}
