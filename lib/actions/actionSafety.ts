import { ActionCategory, ActionSeverity } from './actionTypes';

export interface SafetyCheckResult {
  isDestructive: boolean;
  riskLevel: 'HIGH' | 'MODERATE' | 'LOW';
  caution: string;
  verificationSteps: string[];
  nonDestructiveAlternative?: string;
}

export interface ActionSafetyParams {
  category: ActionCategory;
  severity: ActionSeverity;
  title: string;
  actionText: string;
  affectedUrlsCount: number;
  issueCode?: string;
}

/**
 * Evaluates an SEO action for destructive potential and attaches risk safeguards.
 * 
 * High-risk categories include canonical changes, noindex tags, robots disallows,
 * redirect graphs, page pruning, and massive content modifications.
 */
export function evaluateActionSafety(params: ActionSafetyParams): SafetyCheckResult {
  const textToScan = `${params.category} ${params.title} ${params.actionText} ${params.issueCode || ''}`.toLowerCase();

  // 1. NOINDEX / ROBOTS DISALLOW - High risk of de-indexing live URLs
  if (
    textToScan.includes('noindex') ||
    textToScan.includes('x-robots-tag') ||
    (textToScan.includes('robots.txt') && (textToScan.includes('disallow') || textToScan.includes('block')))
  ) {
    return {
      isDestructive: true,
      riskLevel: 'HIGH',
      caution: 'Adding noindex directives or robots.txt disallow rules will instruct search engines to drop these URLs from the search index (de-indexing). Ensure none of the affected pages are intended to rank or receive organic search traffic.',
      verificationSteps: [
        'Confirm affected URLs receive zero intentional organic search impressions in Google Search Console.',
        'Verify in a staging environment that robots meta tag returns <meta name="robots" content="noindex, follow">.',
        'Test affected URLs using the URL Inspection Tool before and after deployment.',
        'Ensure internal links to these pages are updated or audited so link equity is not dead-ended.'
      ],
      nonDestructiveAlternative: 'If pages have slight indexable value, consider consolidating content via 301 redirect or canonicalization instead of total de-indexing.'
    };
  }

  // 2. CANONICAL TAG CHANGES - High risk of shifting indexation equity
  if (
    params.category === 'TECHNICAL_CANONICAL' ||
    textToScan.includes('canonical') ||
    textToScan.includes('rel=canonical')
  ) {
    return {
      isDestructive: true,
      riskLevel: 'HIGH',
      caution: 'Modifying canonical URLs directs search engines to treat another URL as the authoritative version, transferring indexing signals. An incorrect canonical can cause the primary page to be de-indexed.',
      verificationSteps: [
        'Inspect both source and target canonical URLs to ensure target returns HTTP 200 OK and is indexable.',
        'Verify target canonical contains equivalent or superior content.',
        'Ensure canonical target does not point to a 3xx redirect or 4xx error page.',
        'Verify self-referential canonicals are absolute HTTPS URLs matching the final resolved address.'
      ],
      nonDestructiveAlternative: 'If unsure whether pages are true duplicates, keep self-referential canonicals and differentiate the page content and H1 headers instead.'
    };
  }

  // 3. 301 REDIRECTS / URL MODIFICATIONS / PAGE DELETIONS
  if (
    textToScan.includes('301 redirect') ||
    textToScan.includes('redirect loop') ||
    textToScan.includes('redirect chain') ||
    textToScan.includes('change url') ||
    textToScan.includes('delete page') ||
    textToScan.includes('remove page') ||
    textToScan.includes('prune page')
  ) {
    return {
      isDestructive: true,
      riskLevel: 'HIGH',
      caution: 'URL modifications and redirects permanently alter routing. Breaking existing URLs without 1:1 destination mapping risks 404 errors, loss of existing backlinks, and temporary indexing disruption.',
      verificationSteps: [
        'Map every source URL directly to its most relevant, live 200 OK destination URL.',
        'Verify server returns HTTP 301 Moved Permanently (not 302, 307, or JS client redirects).',
        'Update all internal links pointing to the old URL to prevent unnecessary redirect hops.',
        'Update XML sitemaps to reference only the new destination URL.'
      ],
      nonDestructiveAlternative: 'Retain the existing URL structure and update only on-page content, titles, and headings in place.'
    };
  }

  // 4. STRUCTURED DATA REMOVAL
  if (textToScan.includes('remove schema') || textToScan.includes('delete structured data')) {
    return {
      isDestructive: true,
      riskLevel: 'MODERATE',
      caution: 'Removing structured data may disqualify the page from existing SERP rich snippets (review stars, FAQ dropdowns, breadcrumbs).',
      verificationSteps: [
        'Validate schema changes in Google Rich Results Test tool before deploying.',
        'Ensure required schema properties are repaired rather than stripped entirely if rich snippet eligibility is desired.'
      ],
      nonDestructiveAlternative: 'Fix invalid schema fields rather than removing the entire JSON-LD script block.'
    };
  }

  // 5. LARGE SCALE CONTENT OVERHAUL / BULK MULTI-PAGE CHANGES
  if (params.affectedUrlsCount >= 10 && (params.category === 'CONTENT_DEPTH' || textToScan.includes('rewrite') || textToScan.includes('bulk'))) {
    return {
      isDestructive: false,
      riskLevel: 'MODERATE',
      caution: 'Applying bulk automated changes across many pages simultaneously can introduce unintended formatting or semantic regressions. Implement in batches.',
      verificationSteps: [
        'Test changes on a sample of 2-3 representative pages first.',
        'Verify rendering, typography, and mobile viewport responsiveness.',
        'Monitor crawl status and search console metrics for the test batch before rolling out site-wide.'
      ]
    };
  }

  // DEFAULT SAFE ACTION
  return {
    isDestructive: false,
    riskLevel: 'LOW',
    caution: 'Safe optimization. Modifying content or meta tags in-place carries minimal technical risk to site routing or indexation.',
    verificationSteps: [
      'Inspect rendered page source to confirm tags or content updated accurately.',
      'Check browser rendering and mobile layout to ensure visual integrity.'
    ]
  };
}
