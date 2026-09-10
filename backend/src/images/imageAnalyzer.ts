import * as cheerio from 'cheerio';
import { resolveAbsoluteUrl } from '../utils/urlUtils.js';
import { ImageItem, ImagesAnalysis } from '@seo-analyzer/shared';

export function analyzeImages($: cheerio.CheerioAPI, baseUrl: string): ImagesAnalysis {
  const images: ImageItem[] = [];
  let totalImages = 0;
  let withAlt = 0;
  let missingAlt = 0;

  $('img').each((_, el) => {
    const rawSrc = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!rawSrc) return;

    const absSrc = resolveAbsoluteUrl(rawSrc, baseUrl) || rawSrc;
    const rawAlt = $(el).attr('alt');
    const role = ($(el).attr('role') || '').toLowerCase();
    const ariaHidden = $(el).attr('aria-hidden') === 'true';

    // A decorative image is explicitly marked with role="presentation", role="none", or aria-hidden="true"
    const isDecorative = role === 'presentation' || role === 'none' || ariaHidden || rawAlt === '';
    const hasAlt = typeof rawAlt === 'string' && rawAlt.trim().length > 0;

    // Extract filename from URL
    let filename = '';
    try {
      const parsed = new URL(absSrc);
      const parts = parsed.pathname.split('/');
      filename = parts[parts.length - 1] || '';
    } catch {
      filename = rawSrc;
    }

    const widthAttr = $(el).attr('width');
    const heightAttr = $(el).attr('height');
    const width = widthAttr ? parseInt(widthAttr, 10) : undefined;
    const height = heightAttr ? parseInt(heightAttr, 10) : undefined;

    totalImages++;
    if (hasAlt) {
      withAlt++;
    } else if (!isDecorative) {
      missingAlt++;
    }

    images.push({
      src: absSrc,
      alt: typeof rawAlt === 'string' ? rawAlt.trim() : '',
      hasAlt,
      isDecorative,
      filename,
      width: isNaN(width as any) ? undefined : width,
      height: isNaN(height as any) ? undefined : height,
    });
  });

  const altCoverageRatio = totalImages > 0
    ? parseFloat(((withAlt / totalImages) * 100).toFixed(1))
    : 100;

  return {
    totalImages,
    withAlt,
    missingAlt,
    altCoverageRatio,
    images,
  };
}
