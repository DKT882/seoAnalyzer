import * as cheerio from 'cheerio';
import {
  IndexabilityStatus,
  RobotsAssessment,
  RobotsAnalysis,
  HttpStatusClassification,
} from '@/types';

export interface IndexabilityAuditInput {
  $: cheerio.CheerioAPI;
  headers: Record<string, string>;
  httpStatus: HttpStatusClassification;
  robotsTxt: RobotsAnalysis;
  canonicalUrl?: string;
  pageUrl: string;
}

/**
 * Normalizes a raw robots directive string into a clean list of individual tokens.
 */
export function parseDirectiveTokens(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Audits robots meta tags, bot-specific directives, X-Robots-Tag headers, and cross-layer signal conflicts.
 */
export function auditIndexabilityAndRobots(input: IndexabilityAuditInput): {
  robotsAssessment: RobotsAssessment;
  indexabilityStatus: IndexabilityStatus;
  signalConflicts: string[];
} {
  const { $, headers, httpStatus, robotsTxt, canonicalUrl, pageUrl } = input;

  // 1. Extract HTML meta tags
  const metaRobotsRaw = $('meta[name="robots" i]').attr('content') || '';
  const googlebotRaw = $('meta[name="googlebot" i]').attr('content') || '';
  const bingbotRaw = $('meta[name="bingbot" i]').attr('content') || '';

  // 2. Extract X-Robots-Tag HTTP header
  const xRobotsTagRaw = headers['x-robots-tag'] || '';

  // 3. Tokenize directives
  const metaRobotsDirectives = parseDirectiveTokens(metaRobotsRaw);
  const googlebotDirectives = parseDirectiveTokens(googlebotRaw);
  const bingbotDirectives = parseDirectiveTokens(bingbotRaw);
  const xRobotsTagDirectives = parseDirectiveTokens(xRobotsTagRaw);

  const allDirectives = [
    ...metaRobotsDirectives,
    ...googlebotDirectives,
    ...bingbotDirectives,
    ...xRobotsTagDirectives,
  ];

  // 4. Detect noindex and nofollow presence
  const hasNoindex =
    metaRobotsDirectives.includes('noindex') ||
    metaRobotsDirectives.includes('none') ||
    googlebotDirectives.includes('noindex') ||
    googlebotDirectives.includes('none') ||
    xRobotsTagDirectives.includes('noindex') ||
    xRobotsTagDirectives.includes('none');

  const hasNofollow =
    metaRobotsDirectives.includes('nofollow') ||
    metaRobotsDirectives.includes('none') ||
    googlebotDirectives.includes('nofollow') ||
    googlebotDirectives.includes('none') ||
    xRobotsTagDirectives.includes('nofollow') ||
    xRobotsTagDirectives.includes('none');

  // 5. Detect Intra-Tag Contradictions (e.g. index + noindex in same tag)
  const signalConflicts: string[] = [];
  let hasContradiction = false;

  const checkTagContradiction = (directives: string[], sourceName: string) => {
    const hasIdx = directives.includes('index');
    const hasNoIdx = directives.includes('noindex');
    const hasFlw = directives.includes('follow');
    const hasNoFlw = directives.includes('nofollow');

    if (hasIdx && hasNoIdx) {
      hasContradiction = true;
      signalConflicts.push(`${sourceName} specifies both "index" and "noindex" simultaneously.`);
    }
    if (hasFlw && hasNoFlw) {
      hasContradiction = true;
      signalConflicts.push(`${sourceName} specifies both "follow" and "nofollow" simultaneously.`);
    }
  };

  checkTagContradiction(metaRobotsDirectives, '<meta name="robots">');
  checkTagContradiction(googlebotDirectives, '<meta name="googlebot">');
  checkTagContradiction(xRobotsTagDirectives, 'X-Robots-Tag header');

  // 6. Detect Cross-Layer Signal Conflicts (X-Robots-Tag vs HTML Meta)
  let hasSignalConflict = false;
  const xRobotsHasNoindex = xRobotsTagDirectives.includes('noindex') || xRobotsTagDirectives.includes('none');
  const metaRobotsHasIndex = metaRobotsDirectives.includes('index') && !metaRobotsDirectives.includes('noindex');

  if (xRobotsHasNoindex && metaRobotsHasIndex) {
    hasSignalConflict = true;
    signalConflicts.push(
      'HTTP response header specifies "X-Robots-Tag: noindex" while HTML specifies "<meta name="robots" content="index">".'
    );
  }

  const xRobotsHasIndex = xRobotsTagDirectives.includes('index') && !xRobotsTagDirectives.includes('noindex');
  const metaRobotsHasNoindex = metaRobotsDirectives.includes('noindex') || metaRobotsDirectives.includes('none');

  if (xRobotsHasIndex && metaRobotsHasNoindex) {
    hasSignalConflict = true;
    signalConflicts.push(
      'HTML specifies "<meta name="robots" content="noindex">" while HTTP header specifies "X-Robots-Tag: index".'
    );
  }

  // 7. Detect Bot-Specific Directive Overrides
  let botSpecificOverride = false;
  if (googlebotDirectives.length > 0 && metaRobotsDirectives.length > 0) {
    const googleNoindex = googlebotDirectives.includes('noindex');
    const generalNoindex = metaRobotsDirectives.includes('noindex');
    if (googleNoindex !== generalNoindex) {
      botSpecificOverride = true;
      signalConflicts.push(
        googleNoindex
          ? 'Googlebot directive explicitly disallows indexing ("noindex") while general robots directive allows it.'
          : 'Googlebot allows indexing while general robots directive specifies "noindex".'
      );
    }
  }

  // 8. Build Robots Assessment Summary
  let summary = 'Standard indexable page with no blocking directives.';
  if (hasSignalConflict || hasContradiction) {
    summary = `Conflicting indexability directives detected across headers and HTML meta tags (${signalConflicts.join(' ')}).`;
  } else if (hasNoindex) {
    summary = 'Page explicitly forbids indexing via "noindex" directive.';
  } else if (!robotsTxt.isBotAllowed) {
    summary = 'Page URL is blocked from crawling by robots.txt disallow rules.';
  }

  const robotsAssessment: RobotsAssessment = {
    metaRobotsDirectives,
    googlebotDirectives,
    bingbotDirectives,
    xRobotsTagDirectives,
    hasNoindex,
    hasNofollow,
    hasContradiction,
    hasSignalConflict,
    botSpecificOverride,
    isBotAllowedInRobotsTxt: robotsTxt.isBotAllowed,
    summary,
  };

  // 9. Compute Unified Indexability Status Decision
  let indexabilityStatus: IndexabilityStatus = 'INDEXABLE';

  if (httpStatus.isClientError || httpStatus.isServerError) {
    indexabilityStatus = 'NOT_INDEXABLE';
  } else if (hasSignalConflict || hasContradiction) {
    indexabilityStatus = 'CONFLICTING_SIGNALS';
  } else if (hasNoindex) {
    indexabilityStatus = 'NOT_INDEXABLE';
  } else if (!robotsTxt.isBotAllowed) {
    // Note: Disallowed in robots.txt means crawlers cannot fetch, though URLs can occasionally appear without snippet
    indexabilityStatus = 'CONDITIONAL';
  } else if (canonicalUrl && pageUrl && canonicalUrl.toLowerCase().replace(/\/$/, '') !== pageUrl.toLowerCase().replace(/\/$/, '')) {
    indexabilityStatus = 'CONDITIONAL';
  }

  return {
    robotsAssessment,
    indexabilityStatus,
    signalConflicts,
  };
}
