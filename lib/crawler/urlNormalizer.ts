import crypto from 'node:crypto';
import { QueryParamClassification } from '@/types';

export interface NormalizedUrlIdentity {
  requestedUrl: string;
  normalizedUrl: string;
  finalUrl?: string;
  canonicalUrl?: string;
  urlHash: string;
  hostname: string;
  pathname: string;
  searchParams: Record<string, string>;
  isTrapSuspected: boolean;
  trapReason?: string;
}

export interface UrlNormalizationOptions {
  stripTrackingParams?: boolean;
  stripTrailingSlash?: boolean;
  allowedHostname?: string;
}

const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^dclid$/i,
  /^gclsrc$/i,
  /^ref$/i,
  /^source$/i,
  /^_ga/i,
  /^mc_eid$/i,
  /^yclid$/i,
  /^igshid$/i,
  /^msclkid$/i,
  /^twclid$/i,
];

const PAGINATION_PARAM_NAMES = new Set([
  'p',
  'page',
  'pg',
  'page_num',
  'pagenum',
  'offset',
  'start',
  'paged',
  'index',
]);

const FACET_PARAM_NAMES = new Set([
  'color',
  'size',
  'filter',
  'brand',
  'category_id',
  'cat',
  'tag',
  'price_min',
  'price_max',
  'min_price',
  'max_price',
  'in_stock',
  'order',
  'sort',
  'dir',
  'orderby',
]);

const DUPLICATE_PARAM_NAMES = new Set([
  'session',
  'sessionid',
  'phpsessid',
  'jsessionid',
  'sid',
  'view',
  'format',
  'print',
  'output',
  'affiliate_id',
  'partner',
]);

const CANONICAL_PARAM_NAMES = new Set([
  'id',
  'article_id',
  'post_id',
  'p',
  'item',
  'v',
  'slug',
  'doc',
]);

/**
 * Classifies an individual query parameter.
 */
export function classifyQueryParameter(key: string, value: string): QueryParamClassification {
  const lowerKey = key.toLowerCase().trim();

  for (const pattern of TRACKING_PARAM_PATTERNS) {
    if (pattern.test(lowerKey)) {
      return 'TRACKING_VARIANT';
    }
  }

  if (PAGINATION_PARAM_NAMES.has(lowerKey)) {
    return 'PAGINATION';
  }

  if (FACET_PARAM_NAMES.has(lowerKey)) {
    return 'FACET_VARIANT';
  }

  if (DUPLICATE_PARAM_NAMES.has(lowerKey)) {
    return 'DUPLICATE_LIKELY';
  }

  if (CANONICAL_PARAM_NAMES.has(lowerKey)) {
    return 'CANONICAL_VARIANT';
  }

  return 'UNKNOWN_PARAMETER';
}

/**
 * Detects whether a URL path shows signs of recursive directory / crawl trap patterns.
 */
export function detectCrawlTrap(urlObj: URL): { isTrap: boolean; reason?: string } {
  const segments = urlObj.pathname.split('/').filter(Boolean);

  // 1. Check path depth
  if (segments.length > 12) {
    return { isTrap: true, reason: `Excessive directory nesting (${segments.length} levels)` };
  }

  // 2. Check repeating path segments (e.g. /category/electronics/category/electronics)
  const segmentCounts = new Map<string, number>();
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    const count = (segmentCounts.get(lower) || 0) + 1;
    segmentCounts.set(lower, count);
    if (count >= 3) {
      return { isTrap: true, reason: `Repeating path segment "${seg}" detected ${count} times` };
    }
  }

  // 3. Check cyclic 2-segment pattern (e.g., /a/b/a/b/a/b)
  for (let i = 0; i < segments.length - 3; i++) {
    if (
      segments[i].toLowerCase() === segments[i + 2].toLowerCase() &&
      segments[i + 1].toLowerCase() === segments[i + 3].toLowerCase()
    ) {
      return { isTrap: true, reason: `Cyclic 2-segment pattern detected: /${segments[i]}/${segments[i + 1]}` };
    }
  }

  // 4. Excessive query parameter length or count
  const paramKeys = Array.from(urlObj.searchParams.keys());
  if (paramKeys.length > 15) {
    return { isTrap: true, reason: `Excessive query parameters (${paramKeys.length} parameters)` };
  }

  // 5. Calendar / Date recurrence traps (e.g. ?year=2026&month=13 or deep year loops)
  for (const [k, v] of Array.from(urlObj.searchParams.entries())) {
    const lk = k.toLowerCase();
    if (lk === 'page' || lk === 'p' || lk === 'offset') {
      const num = parseInt(v, 10);
      if (!isNaN(num) && num > 500) {
        return { isTrap: true, reason: `Extreme pagination parameter value: ${k}=${v}` };
      }
    }
  }

  return { isTrap: false };
}

/**
 * Deterministically normalizes a URL and generates a stable identity.
 */
export function normalizeUrlDeterministically(
  rawUrl: string,
  options: UrlNormalizationOptions = {}
): NormalizedUrlIdentity | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Hostname lowercase & www normalization if domain scope given
    parsed.hostname = parsed.hostname.toLowerCase();
    if (options.allowedHostname) {
      const allowedBase = options.allowedHostname.toLowerCase().replace(/^www\./, '');
      const hostBase = parsed.hostname.replace(/^www\./, '');
      if (hostBase !== allowedBase && !hostBase.endsWith(`.${allowedBase}`)) {
        return null; // Out of domain scope
      }
    }

    // Strip default ports
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }

    // Strip fragment
    parsed.hash = '';

    // Path normalization: normalize consecutive slashes and trailing slashes
    let cleanPath = parsed.pathname.replace(/\/+/g, '/');
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    parsed.pathname = cleanPath || '/';

    // Query parameters sorting and tracking param handling
    const stripTracking = options.stripTrackingParams ?? true;
    const finalParams = new URLSearchParams();
    const recordedParams: Record<string, string> = {};

    // Sort query keys alphabetically
    const keys = Array.from(parsed.searchParams.keys()).sort();
    for (const key of keys) {
      const classification = classifyQueryParameter(key, parsed.searchParams.get(key) || '');
      if (stripTracking && classification === 'TRACKING_VARIANT') {
        continue; // Skip tracking parameters
      }
      const values = parsed.searchParams.getAll(key);
      for (const val of values) {
        finalParams.append(key, val);
        recordedParams[key] = val;
      }
    }

    parsed.search = finalParams.toString();

    // Check crawl traps
    const trapCheck = detectCrawlTrap(parsed);

    const normalizedUrl = parsed.href;
    const urlHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex').substring(0, 16);

    return {
      requestedUrl: rawUrl,
      normalizedUrl,
      urlHash,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      searchParams: recordedParams,
      isTrapSuspected: trapCheck.isTrap,
      trapReason: trapCheck.reason,
    };
  } catch {
    return null;
  }
}
