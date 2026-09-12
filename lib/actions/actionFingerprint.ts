import crypto from 'node:crypto';
import { ActionCategory } from './actionTypes';

/**
 * Parameters used to compute a deterministic action fingerprint.
 */
export interface FingerprintParams {
  category: ActionCategory | string;
  issueCode?: string;
  title: string;
  affectedUrls?: string[];
  domain?: string;
  primaryEvidenceKey?: string;
}

/**
 * Clean and normalize a string for deterministic hashing:
 * - NFKC unicode normalization
 * - lowercased
 * - trimmed
 * - collapsed whitespace
 */
function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Clean and normalize a URL string for deterministic hashing:
 * - lowercase scheme and host
 * - strip trailing slashes (except root)
 * - strip tracking query parameters (utm_*, etc.)
 */
function normalizeUrlForFingerprint(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr.trim());
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${host}${pathname}`;
  } catch {
    return normalizeString(urlStr);
  }
}

/**
 * Generates a deterministic SHA-256 fingerprint for an SEO Action.
 * 
 * Ensures identical issues across separate audits produce the exact same
 * fingerprint for deduplication, status tracking, and regression detection.
 */
export function generateActionFingerprint(params: FingerprintParams): string {
  const normCategory = normalizeString(params.category);
  
  // Use issueCode if present, otherwise fallback to normalized title
  const issueIdentity = params.issueCode
    ? normalizeString(params.issueCode)
    : normalizeString(params.title);

  // Normalize and sort affected URLs so array order does not mutate the fingerprint
  const sortedUrls = (params.affectedUrls || [])
    .map(normalizeUrlForFingerprint)
    .filter(Boolean)
    .sort();

  // If no URLs, use domain or 'global'
  const scopeKey = sortedUrls.length > 0
    ? sortedUrls.join('|')
    : normalizeString(params.domain || 'site-wide');

  const evidenceKey = normalizeString(params.primaryEvidenceKey || '');

  const payload = [
    `cat:${normCategory}`,
    `issue:${issueIdentity}`,
    `scope:${scopeKey}`,
    `ev:${evidenceKey}`,
  ].join('::');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
