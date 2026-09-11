import 'server-only';
import nodeDns from 'node:dns';
import { validateHostnameSsrf } from '../utils/ssrfGuard';
import { validateAndNormalizeUrl, resolveAbsoluteUrl } from '../utils/urlUtils';
import { config } from '../config';
import { AnalyzerError, normalizeErrorToAnalyzerError } from '../errors/analyzerErrors';

// Ensure all Node.js native fetch and DNS operations prioritize IPv4
try {
  if (typeof nodeDns.setDefaultResultOrder === 'function') {
    nodeDns.setDefaultResultOrder('ipv4first');
  }
} catch {
  // Ignore in environments without setDefaultResultOrder
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  responseTimeMs: number;
  pageSizeBytes: number;
  redirectCount: number;
  redirectChain: string[];
}

export interface FetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

/**
 * SSRF-Safe HTTP Fetcher with redirect validation, size streaming limits, and timeout protection.
 */
export async function safeFetch(targetUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? config.crawlerTimeoutMs;
  const maxRedirects = options.maxRedirects ?? config.crawlerMaxRedirects;
  const maxSizeBytes = options.maxSizeBytes ?? config.crawlerMaxSizeBytes;
  const userAgent = options.userAgent ?? config.crawlerUserAgent;

  let currentUrl = targetUrl;
  const redirectChain: string[] = [currentUrl];
  let redirectCount = 0;
  const startTime = Date.now();

  while (redirectCount <= maxRedirects) {
    // 1. Validate URL structure
    const urlValidation = validateAndNormalizeUrl(currentUrl);
    if (!urlValidation.isValid || !urlValidation.parsedUrl) {
      throw new AnalyzerError(
        'INVALID_URL',
        'Invalid URL format.',
        urlValidation.error || 'Cannot parse URL',
        400
      );
    }

    const parsedUrl = urlValidation.parsedUrl;

    // 2. Perform Pre-Request DNS Resolution & SSRF check
    const ssrfCheck = await validateHostnameSsrf(parsedUrl.hostname);
    if (!ssrfCheck.isSafe) {
      throw new AnalyzerError(
        'SSRF_BLOCKED',
        'SSRF Protection Blocked: The target address is within a private, loopback, or reserved network range.',
        ssrfCheck.reason,
        422
      );
    }

    // 3. Setup timeout controller
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // We manage redirects manually to validate each target against SSRF
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
      });

      // Handle 3xx Redirects safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        clearTimeout(timer);
        const location = response.headers.get('location');
        if (!location) {
          throw new AnalyzerError(
            'REDIRECT_BLOCKED',
            'Redirect response missing Location header.',
            `HTTP ${response.status} redirect without Location header from ${currentUrl}`,
            422
          );
        }

        const resolvedRedirectUrl = resolveAbsoluteUrl(location, currentUrl);
        if (!resolvedRedirectUrl) {
          throw new AnalyzerError(
            'REDIRECT_BLOCKED',
            'Unsafe or unresolvable redirect destination.',
            `Location: ${location}`,
            422
          );
        }

        if (redirectChain.includes(resolvedRedirectUrl)) {
          throw new AnalyzerError(
            'REDIRECT_BLOCKED',
            'Redirect loop detected.',
            `URL ${resolvedRedirectUrl} was already visited in redirect chain`,
            422
          );
        }

        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new AnalyzerError(
            'REDIRECT_BLOCKED',
            `Exceeded maximum redirect limit of ${maxRedirects}.`,
            undefined,
            422
          );
        }

        currentUrl = resolvedRedirectUrl;
        redirectChain.push(currentUrl);
        continue;
      }

      // Check Content-Length header if available before downloading
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxSizeBytes) {
        clearTimeout(timer);
        throw new AnalyzerError(
          'RESPONSE_TOO_LARGE',
          `Page size exceeds maximum allowable limit of ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`,
          `Content-Length: ${contentLengthHeader} bytes`,
          413
        );
      }

      // Stream body reading with size check
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > maxSizeBytes) {
              controller.abort();
              throw new AnalyzerError(
                'RESPONSE_TOO_LARGE',
                `Response body exceeded ${Math.round(maxSizeBytes / 1024 / 1024)}MB size limit while downloading.`,
                undefined,
                413
              );
            }
            chunks.push(value);
          }
        }
      }

      clearTimeout(timer);

      // Assemble body buffer & text
      const totalBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      const bodyText = new TextDecoder('utf-8', { fatal: false }).decode(totalBuffer);

      // Collect response headers
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      const contentType = headersRecord['content-type'] || 'text/html';
      const durationMs = Date.now() - startTime;

      return {
        url: targetUrl,
        finalUrl: currentUrl,
        statusCode: response.status,
        statusText: response.statusText,
        headers: headersRecord,
        contentType,
        body: bodyText,
        responseTimeMs: durationMs,
        pageSizeBytes: totalBytes,
        redirectCount,
        redirectChain,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof AnalyzerError) {
        throw err;
      }
      throw normalizeErrorToAnalyzerError(err);
    }
  }

  throw new AnalyzerError(
    'REDIRECT_BLOCKED',
    `Exceeded maximum redirect limit of ${maxRedirects}.`,
    undefined,
    422
  );
}
