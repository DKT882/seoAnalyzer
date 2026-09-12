import {
  HttpStatusClassification,
  HttpStatusType,
  RedirectAssessment,
  CrawlabilityStatus,
  RobotsAnalysis,
} from '@/types';

/**
 * Classifies an HTTP status code into semantic search-engine and crawler categories.
 */
export function classifyHttpStatus(statusCode: number): HttpStatusClassification {
  let type: HttpStatusType = 'UNKNOWN';
  let isSuccess = false;
  let isRedirect = false;
  let isClientError = false;
  let isServerError = false;
  let statusText = 'Unknown Status';
  let description = `HTTP response status ${statusCode}`;

  if (statusCode >= 200 && statusCode < 300) {
    type = 'OK';
    isSuccess = true;
    statusText = statusCode === 201 ? 'Created' : 'OK';
    description = 'The server responded with a successful HTTP 200/2xx status code. Resource is available for crawling.';
  } else if (statusCode === 301 || statusCode === 308) {
    type = 'PERMANENT_REDIRECT';
    isRedirect = true;
    statusText = statusCode === 301 ? 'Moved Permanently' : 'Permanent Redirect';
    description = 'The requested URL has been permanently moved to a new destination.';
  } else if (statusCode === 302 || statusCode === 303 || statusCode === 307) {
    type = 'TEMPORARY_REDIRECT';
    isRedirect = true;
    statusText = statusCode === 302 ? 'Found (Temporary Redirect)' : statusCode === 303 ? 'See Other' : 'Temporary Redirect';
    description = 'The requested URL resides temporarily under a different URI.';
  } else if (statusCode === 404) {
    type = 'NOT_FOUND';
    isClientError = true;
    statusText = 'Not Found';
    description = 'The server cannot find the requested resource. Crawlers will drop 404 URLs from search indexes.';
  } else if (statusCode === 410) {
    type = 'GONE';
    isClientError = true;
    statusText = 'Gone';
    description = 'The resource is permanently deleted with no forwarding address. Search engines de-index 410s rapidly.';
  } else if (statusCode === 429) {
    type = 'RATE_LIMITED';
    isClientError = true;
    statusText = 'Too Many Requests';
    description = 'The server is rate-limiting incoming requests. Search crawlers will back off and throttle crawl rates.';
  } else if (statusCode >= 400 && statusCode < 500) {
    type = 'CLIENT_ERROR';
    isClientError = true;
    statusText = statusCode === 401 ? 'Unauthorized' : statusCode === 403 ? 'Forbidden' : statusCode === 400 ? 'Bad Request' : 'Client Error';
    description = `The server returned client error HTTP ${statusCode}.`;
  } else if (statusCode >= 500 && statusCode < 600) {
    type = 'SERVER_ERROR';
    isServerError = true;
    statusText = statusCode === 500 ? 'Internal Server Error' : statusCode === 502 ? 'Bad Gateway' : statusCode === 503 ? 'Service Unavailable' : 'Gateway Timeout';
    description = `The server failed to fulfill an apparently valid request (${statusCode}). Crawlers will retry with backoff.`;
  }

  return {
    statusCode,
    statusText,
    type,
    isSuccess,
    isRedirect,
    isClientError,
    isServerError,
    description,
  };
}

export interface RedirectAuditInput {
  targetUrl: string;
  finalUrl: string;
  redirectCount: number;
  redirectChain: string[];
}

/**
 * Audits redirect behavior, chains, loops, and canonical migration patterns.
 */
export function auditRedirects(input: RedirectAuditInput): RedirectAssessment {
  const { targetUrl, finalUrl, redirectCount, redirectChain } = input;
  const hasRedirect = redirectCount > 0 || targetUrl !== finalUrl;

  // Check for redirect loop
  let isRedirectLoop = false;
  let loopUrls: string[] | undefined;
  const visited = new Set<string>();

  for (const url of redirectChain) {
    const normalized = url.toLowerCase().trim();
    if (visited.has(normalized)) {
      isRedirectLoop = true;
      loopUrls = redirectChain;
      break;
    }
    visited.add(normalized);
  }

  // Detect redirect pattern characteristics
  let isHttpToHttps = false;
  let isWwwNormalization = false;
  let isTrailingSlashNormalization = false;
  let destinationMismatch = false;

  try {
    const parsedTarget = new URL(targetUrl);
    const parsedFinal = new URL(finalUrl);

    if (parsedTarget.protocol === 'http:' && parsedFinal.protocol === 'https:') {
      isHttpToHttps = true;
    }

    const hostTarget = parsedTarget.hostname.toLowerCase();
    const hostFinal = parsedFinal.hostname.toLowerCase();
    if (
      (hostTarget === `www.${hostFinal}`) ||
      (hostFinal === `www.${hostTarget}`)
    ) {
      isWwwNormalization = true;
    }

    if (
      parsedTarget.pathname.replace(/\/$/, '') === parsedFinal.pathname.replace(/\/$/, '') &&
      parsedTarget.pathname !== parsedFinal.pathname
    ) {
      isTrailingSlashNormalization = true;
    }

    if (
      parsedTarget.hostname !== parsedFinal.hostname &&
      !isWwwNormalization
    ) {
      destinationMismatch = true;
    }
  } catch {
    // URL parsing fallback
  }

  // Determine overall redirect type
  let redirectType: 'NONE' | 'PERMANENT' | 'TEMPORARY' | 'CHAIN' | 'LOOP' = 'NONE';
  let summary = 'Direct 200 OK response with 0 redirects.';

  if (isRedirectLoop) {
    redirectType = 'LOOP';
    summary = `Redirect loop detected across ${redirectChain.length} hops.`;
  } else if (redirectCount > 1) {
    redirectType = 'CHAIN';
    summary = `Redirect chain detected: ${redirectCount} hops (${redirectChain.join(' -> ')}).`;
  } else if (redirectCount === 1) {
    redirectType = 'PERMANENT';
    summary = `Single-hop redirect from "${targetUrl}" to "${finalUrl}".`;
  }

  return {
    hasRedirect,
    redirectCount,
    redirectChain,
    isRedirectLoop,
    loopUrls,
    redirectType,
    isHttpToHttps,
    isWwwNormalization,
    isTrailingSlashNormalization,
    destinationMismatch,
    summary,
  };
}

/**
 * Computes a unified crawlability decision state.
 */
export function determineCrawlabilityStatus(
  httpStatus: HttpStatusClassification,
  redirects: RedirectAssessment,
  robots: RobotsAnalysis
): CrawlabilityStatus {
  if (httpStatus.isServerError || httpStatus.isClientError) {
    return 'HTTP_ERROR';
  }

  if (!robots.isBotAllowed) {
    return 'BLOCKED_BY_ROBOTS';
  }

  if (redirects.isRedirectLoop) {
    return 'HTTP_ERROR';
  }

  if (redirects.hasRedirect && redirects.redirectCount > 0) {
    return 'REDIRECTED';
  }

  if (httpStatus.isSuccess && robots.isBotAllowed) {
    return 'CRAWLABLE';
  }

  return 'PARTIALLY_MEASURED';
}
