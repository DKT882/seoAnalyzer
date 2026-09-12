import { UrlStructureAssessment } from '@/types';

const SESSION_PARAMS = new Set([
  'phpsessid',
  'jsessionid',
  'sid',
  'aspsessionid',
  'sessionid',
  'zenid',
  'cfid',
  'cftoken',
]);

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_eid',
  'yclid',
  'igshid',
  'msclkid',
]);

/**
 * Audits URL structural quality, length, session identifier leaks, tracking parameters,
 * repeated directory paths, and query string complexity.
 */
export function auditUrlStructure(rawUrl: string): UrlStructureAssessment {
  const length = rawUrl.length;
  const isExcessivelyLong = length > 120;
  const hasSpacesOrUnsafeChars = /[\s<>"\^`{|}\\]/.test(rawUrl);

  let queryParamCount = 0;
  let hasDuplicateQueryParams = false;
  let hasSessionId = false;
  const sessionParamNames: string[] = [];
  let hasTrackingParams = false;
  const trackingParamNames: string[] = [];
  let hasFragment = false;
  let hasRepeatedPathSegments = false;
  let hasUppercaseLetters = false;

  try {
    const parsed = new URL(rawUrl);

    // Hash fragment
    hasFragment = Boolean(parsed.hash && parsed.hash.length > 0);

    // Uppercase letters in pathname
    hasUppercaseLetters = /[A-Z]/.test(parsed.pathname);

    // Query parameters
    const paramKeys: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      queryParamCount++;
      if (paramKeys.includes(lowerKey)) {
        hasDuplicateQueryParams = true;
      }
      paramKeys.push(lowerKey);

      if (SESSION_PARAMS.has(lowerKey)) {
        hasSessionId = true;
        sessionParamNames.push(key);
      }

      if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
        hasTrackingParams = true;
        trackingParamNames.push(key);
      }
    });

    // Repeated path segments
    const segments = parsed.pathname.split('/').filter(Boolean);
    const seenSegments = new Set<string>();
    for (const seg of segments) {
      const segLower = seg.toLowerCase();
      if (seenSegments.has(segLower)) {
        hasRepeatedPathSegments = true;
        break;
      }
      seenSegments.add(segLower);
    }
  } catch {
    // URL parsing fallback
  }

  let summary = 'Clean, standard URL structure.';
  const issues: string[] = [];
  if (isExcessivelyLong) issues.push(`Excessive length (${length} chars)`);
  if (hasSessionId) issues.push(`Session parameter detected (${sessionParamNames.join(', ')})`);
  if (hasDuplicateQueryParams) issues.push('Duplicate query parameters present');
  if (hasRepeatedPathSegments) issues.push('Repeated path segments detected');
  if (hasUppercaseLetters) issues.push('Mixed uppercase path characters');

  if (issues.length > 0) {
    summary = `URL structural observations: ${issues.join(', ')}.`;
  }

  return {
    url: rawUrl,
    length,
    isExcessivelyLong,
    queryParamCount,
    hasDuplicateQueryParams,
    hasSessionId,
    sessionParamNames,
    hasTrackingParams,
    trackingParamNames,
    hasFragment,
    hasRepeatedPathSegments,
    hasSpacesOrUnsafeChars,
    hasUppercaseLetters,
    summary,
  };
}
