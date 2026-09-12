import * as cheerio from 'cheerio';
import { InfrastructureAssessment } from '@/types';

export interface InfrastructureAuditInput {
  $: cheerio.CheerioAPI;
  finalUrl: string;
  headers: Record<string, string>;
  contentTypeHeader: string;
}

/**
 * Audits mixed content on HTTPS pages, content type validity, security headers,
 * and caching infrastructure headers in an SEO-relevant informational context.
 */
export function auditInfrastructure(input: InfrastructureAuditInput): InfrastructureAssessment {
  const { $, finalUrl, headers, contentTypeHeader } = input;
  const isHttps = finalUrl.startsWith('https://');

  // 1. Mixed Content Scan (only on HTTPS pages)
  const insecureResourceUrls: string[] = [];
  if (isHttps) {
    $('img[src], script[src], link[rel="stylesheet"][href], iframe[src], audio[src], video[src]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href') || '';
      if (src.startsWith('http://')) {
        insecureResourceUrls.push(src);
      }
    });
  }
  const hasMixedContent = insecureResourceUrls.length > 0;

  // 2. Content Type & HTML validation
  const contentType = contentTypeHeader.toLowerCase();
  const isHtmlContentType = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');

  // 3. Security Headers
  const hsts = Boolean(headers['strict-transport-security']);
  const csp = Boolean(headers['content-security-policy']);
  const xContentTypeOptions = Boolean(headers['x-content-type-options']);
  const referrerPolicy = headers['referrer-policy'];

  // 4. Caching & CDN Headers
  const cacheControl = headers['cache-control'];
  const etag = headers['etag'];
  const serverTiming = headers['server-timing'];
  const age = headers['age'];

  // 5. Charset extraction
  const charset =
    $('meta[charset]').attr('charset') ||
    $('meta[http-equiv="Content-Type" i]').attr('content') ||
    'utf-8';

  let summary = 'Standard secure HTTPS infrastructure with valid HTML content-type.';
  if (!isHttps) {
    summary = 'Page is served over unencrypted HTTP protocol.';
  } else if (hasMixedContent) {
    summary = `Mixed content detected: ${insecureResourceUrls.length} insecure HTTP subresources found on this HTTPS page.`;
  } else if (!isHtmlContentType) {
    summary = `Non-standard HTML Content-Type header detected: "${contentTypeHeader}".`;
  }

  return {
    isHttps,
    hasMixedContent,
    insecureResourceUrls,
    contentType: contentTypeHeader,
    isHtmlContentType,
    charset,
    securityHeaders: {
      hsts,
      csp,
      xContentTypeOptions,
      referrerPolicy,
    },
    cachingHeaders: {
      cacheControl,
      etag,
      serverTiming,
      age,
    },
    summary,
  };
}
