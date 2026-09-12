export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  parsedUrl?: URL;
  error?: string;
}

/**
 * Validates and normalizes target URLs.
 * Strictly accepts http: and https: protocols only.
 */
export function validateAndNormalizeUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string.' };
  }

  let trimmed = rawUrl.trim();

  // Auto-prefix protocol if missing (default to https://)
  if (!/^https?:\/\//i.test(trimmed)) {
    // Check if it's attempting other forbidden protocols like file:, javascript:, ftp:
    if (/^[a-zA-Z0-9+-.]+:/i.test(trimmed)) {
      return { isValid: false, error: 'Unsupported protocol. Only HTTP and HTTPS are permitted.' };
    }
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: `Disallowed protocol: "${parsed.protocol}". Only http: and https: are allowed.` };
    }

    const isNumericIp = /^\d+$/.test(parsed.hostname) || /^0x[0-9a-f]+$/i.test(parsed.hostname);
    const isIp =
      /^(?:::ffff:)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
      parsed.hostname.includes(':') ||
      parsed.hostname.startsWith('[') ||
      isNumericIp;
    const hasDot = parsed.hostname.includes('.');
    const isLocalhost =
      parsed.hostname.toLowerCase() === 'localhost' ||
      parsed.hostname.toLowerCase().startsWith('localhost.');

    if (!parsed.hostname || parsed.hostname.length < 3 || (!hasDot && !isIp && !isLocalhost)) {
      return { isValid: false, error: 'Invalid hostname in URL. A valid domain (e.g. domain.com) or IP address is required.' };
    }

    // Normalized standard URL
    return {
      isValid: true,
      normalizedUrl: parsed.href,
      parsedUrl: parsed,
    };
  } catch (err: any) {
    return { isValid: false, error: `Malformed URL: ${err.message || err}` };
  }
}

/**
 * Safely resolves relative URLs to absolute URLs against a base URL.
 */
export function resolveAbsoluteUrl(relativeOrAbsolute: string, baseUrl: string): string | null {
  if (!relativeOrAbsolute || typeof relativeOrAbsolute !== 'string') {
    return null;
  }

  const trimmed = relativeOrAbsolute.trim();
  // Filter out javascript:, mailto:, tel:, data:, # fragments
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('#')
  ) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if two URLs belong to the same origin / domain.
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const p1 = new URL(url1);
    const p2 = new URL(url2);
    return p1.hostname.toLowerCase() === p2.hostname.toLowerCase();
  } catch {
    return false;
  }
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
  '_ga',
  'mc_eid',
  'yclid',
  'igshid',
]);

/**
 * Normalizes a URL for crawling by stripping fragments and tracking query params.
 */
export function cleanAndNormalizeCrawlUrl(rawUrl: string, baseHostname: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Domain boundary check (handling www vs non-www)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const base = baseHostname.toLowerCase().replace(/^www\./, '');
    if (host !== base && !host.endsWith(`.${base}`)) {
      return null;
    }

    // Remove hash fragment
    parsed.hash = '';

    // Remove tracking query parameters
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        searchParams.delete(key);
      }
    }
    parsed.search = searchParams.toString();

    // Normalize trailing slash (remove trailing slash except for root path '/')
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.href;
  } catch {
    return null;
  }
}

