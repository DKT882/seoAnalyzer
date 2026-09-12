import {
  CanonicalStatus,
  CanonicalizationAssessment,
} from '@/types';
import { resolveAbsoluteUrl } from '../utils/urlUtils';

export interface CanonicalAuditInput {
  rawCanonical?: string;
  finalUrl: string;
  hasNoindex?: boolean;
  redirectTargets?: Record<string, string>; // Known redirect map if available
}

/**
 * Deeply audits canonical link tags, self-referencing legitimacy, cross-domain syndication,
 * fragment issues, and canonical + noindex conflicts.
 */
export function auditCanonicalization(input: CanonicalAuditInput): CanonicalizationAssessment {
  const { rawCanonical, finalUrl, hasNoindex = false, redirectTargets = {} } = input;

  if (!rawCanonical || rawCanonical.trim().length === 0) {
    return {
      canonicalUrl: '',
      isSpecified: false,
      isAbsolute: false,
      isMatch: false,
      status: 'CANONICAL_MISSING',
      pointsToRedirect: false,
      isCrossDomain: false,
      hasNoindexConflict: false,
      summary: 'No rel="canonical" link element specified on the page.',
    };
  }

  const trimmed = rawCanonical.trim();
  const resolved = resolveAbsoluteUrl(trimmed, finalUrl) || trimmed;
  const isAbsolute = /^https?:\/\//i.test(trimmed);

  let isMatch = false;
  let isCrossDomain = false;
  let status: CanonicalStatus = 'CANONICALIZED_TO_OTHER';
  let pointsToRedirect = false;
  let redirectTarget: string | undefined;

  try {
    const parsedCanonical = new URL(resolved);
    const parsedFinal = new URL(finalUrl);

    // Normalize paths for comparison (ignoring trailing slash differences)
    const normCanonical = `${parsedCanonical.origin}${parsedCanonical.pathname.replace(/\/$/, '')}${parsedCanonical.search}`.toLowerCase();
    const normFinal = `${parsedFinal.origin}${parsedFinal.pathname.replace(/\/$/, '')}${parsedFinal.search}`.toLowerCase();

    isMatch = normCanonical === normFinal;
    isCrossDomain = parsedCanonical.hostname.toLowerCase() !== parsedFinal.hostname.toLowerCase();

    if (redirectTargets[resolved]) {
      pointsToRedirect = true;
      redirectTarget = redirectTargets[resolved];
    }

    if (isMatch) {
      status = 'SELF_CANONICAL';
    } else if (pointsToRedirect) {
      status = 'CANONICAL_REDIRECT_CONFLICT';
    } else if (isCrossDomain) {
      status = 'CANONICAL_CROSS_DOMAIN';
    } else if (hasNoindex) {
      status = 'NOINDEX_CANONICAL_CONFLICT';
    } else {
      status = 'CANONICALIZED_TO_OTHER';
    }
  } catch {
    status = 'CANONICAL_INVALID';
  }

  const hasNoindexConflict = hasNoindex && !isMatch;

  let summary = 'Valid self-referencing canonical tag configured.';
  if (status === 'CANONICAL_REDIRECT_CONFLICT') {
    summary = `Canonical points to a redirecting destination ("${resolved}" -> "${redirectTarget || 'redirect'}").`;
  } else if (status === 'NOINDEX_CANONICAL_CONFLICT') {
    summary = 'Page specifies both a "noindex" directive and a non-matching canonical URL, presenting conflicting indexation signals.';
  } else if (status === 'CANONICAL_CROSS_DOMAIN') {
    summary = `Cross-domain canonical points to external domain "${resolved}".`;
  } else if (status === 'CANONICALIZED_TO_OTHER') {
    summary = `Canonical points to alternate version ("${resolved}").`;
  }

  return {
    canonicalUrl: resolved,
    isSpecified: true,
    isAbsolute,
    isMatch,
    status,
    pointsToRedirect,
    redirectTarget,
    isCrossDomain,
    hasNoindexConflict,
    summary,
  };
}
