import {
  SEOReport,
  CanonicalConsistencyIssue,
  IndexabilityConsistencyIssue,
  SitemapConsistencyItem,
  RedirectGraphNode,
  HreflangCrossPageIssue,
  StructuredDataCrossPagePattern,
  PageType,
} from '@/types';
import { buildCrossPageRecommendation } from './recommendationBuilder';

/**
 * Audits cross-page canonical configuration consistency.
 */
export function auditCanonicalConsistency(
  pages: SEOReport[],
  crawledUrlMap: Map<string, SEOReport>
): CanonicalConsistencyIssue[] {
  const issues: CanonicalConsistencyIssue[] = [];
  const targetToSourcesMap = new Map<string, string[]>();

  for (const page of pages) {
    const canonical = page.onPage.canonicalUrl;
    if (!canonical) continue;

    const sourceNorm = page.normalizedUrl || page.url;
    const targetNorm = canonical;

    // Track targets
    let sources = targetToSourcesMap.get(targetNorm);
    if (!sources) {
      sources = [];
      targetToSourcesMap.set(targetNorm, sources);
    }
    sources.push(sourceNorm);

    // If points to different page
    if (sourceNorm !== targetNorm) {
      const targetReport = crawledUrlMap.get(targetNorm);

      if (targetReport) {
        // 1. Canonical points to 4xx
        if (targetReport.technical.httpStatus >= 400 && targetReport.technical.httpStatus < 500) {
          issues.push({
            id: `canon-4xx-${page.id}`,
            url: page.url,
            canonicalUrl: canonical,
            issueType: 'CANONICAL_POINTS_TO_4XX',
            severity: 'HIGH',
            evidence: `Page points canonical to "${canonical}" which returns HTTP ${targetReport.technical.httpStatus}.`,
            affectedUrls: [page.url, canonical],
            recommendation: buildCrossPageRecommendation({
              observation: `Page canonicalizes to a 4xx error URL: "${canonical}".`,
              evidence: `Source "${page.url}" -> Canonical target returns HTTP ${targetReport.technical.httpStatus}.`,
              interpretation: 'Search engines encountering a 4xx canonical destination cannot consolidate indexing signals properly.',
              action: 'Update the canonical tag to point to a valid, live 200 OK master page, or remove the canonical tag.',
              expectedBenefit: 'Restores clear indexation signals and prevents indexing dropouts.',
              caution: 'Ensure the destination URL is permanently live before updating.',
            }),
          });
        }

        // 2. Canonical points to redirect
        if (targetReport.technical.redirectCount > 0) {
          issues.push({
            id: `canon-redir-${page.id}`,
            url: page.url,
            canonicalUrl: canonical,
            issueType: 'CANONICAL_POINTS_TO_REDIRECT',
            severity: 'MEDIUM',
            evidence: `Canonical target "${canonical}" redirects to "${targetReport.technical.redirectChain[targetReport.technical.redirectChain.length - 1]}".`,
            affectedUrls: [page.url, canonical],
            recommendation: buildCrossPageRecommendation({
              observation: `Canonical target "${canonical}" performs a redirect.`,
              evidence: `Redirect chain: ${targetReport.technical.redirectChain.join(' -> ')}`,
              interpretation: 'Canonicalizing to a redirecting URL introduces latency and ambiguity in signal consolidation.',
              action: 'Update the canonical tag to point directly to the final 200 OK destination.',
              expectedBenefit: 'Faster crawler processing and unambiguous canonical target identification.',
              caution: 'Confirm the final destination is the intended master URL.',
            }),
          });
        }

        // 3. Canonical points to noindex
        if (!targetReport.technical.isIndexable) {
          issues.push({
            id: `canon-noindex-${page.id}`,
            url: page.url,
            canonicalUrl: canonical,
            issueType: 'CANONICAL_POINTS_TO_NOINDEX',
            severity: 'HIGH',
            evidence: `Canonical target "${canonical}" has noindex directive in robots meta or header.`,
            affectedUrls: [page.url, canonical],
            recommendation: buildCrossPageRecommendation({
              observation: `Canonical target "${canonical}" is marked noindex.`,
              evidence: `Target robotsMeta: "${targetReport.onPage.robotsMeta || 'noindex'}"`,
              interpretation: 'A canonical target that is noindexed creates a contradictory indexation signal.',
              action: 'Either remove noindex from the target master page or update the canonical tag to point to an indexable master URL.',
              expectedBenefit: 'Consistent and reliable search indexing.',
              caution: 'Verify whether the target page was intentionally meant to be hidden from search.',
            }),
          });
        }

        // 4. Canonical loop
        const targetTarget = targetReport.onPage.canonicalUrl;
        if (targetTarget === sourceNorm) {
          issues.push({
            id: `canon-loop-${page.id}`,
            url: page.url,
            canonicalUrl: canonical,
            issueType: 'CANONICAL_LOOP',
            severity: 'HIGH',
            evidence: `Mutual canonical loop: "${sourceNorm}" <-> "${targetNorm}".`,
            affectedUrls: [sourceNorm, targetNorm],
            recommendation: buildCrossPageRecommendation({
              observation: `Two pages point their canonical tags to each other in a loop.`,
              evidence: `"${sourceNorm}" points to "${targetNorm}", and "${targetNorm}" points to "${sourceNorm}".`,
              interpretation: 'Search engines ignore circular canonical loops and fall back to heuristic URL selection.',
              action: 'Designate one single master URL and make both pages reference that single master URL.',
              expectedBenefit: 'Resolves canonical ambiguity and ensures the intended page is selected.',
              caution: 'Ensure the chosen master URL contains the most authoritative content.',
            }),
          });
        }
      }
    }
  }

  // 5. Multiple pages pointing to same canonical (information / signal)
  for (const [target, sources] of targetToSourcesMap.entries()) {
    if (sources.length >= 3 && !sources.includes(target)) {
      issues.push({
        id: `canon-multi-${target.replace(/[^a-z0-9]/gi, '-')}`,
        url: target,
        canonicalUrl: target,
        issueType: 'MULTIPLE_PAGES_SAME_CANONICAL',
        severity: 'LOW',
        evidence: `${sources.length} distinct URLs canonicalize to "${target}".`,
        affectedUrls: sources.slice(0, 5),
        recommendation: buildCrossPageRecommendation({
          observation: `${sources.length} pages consolidate to single canonical target: "${target}".`,
          evidence: `Sources include: ${sources.slice(0, 4).join(', ')}`,
          interpretation: 'This is expected for parameterized or faceted variants, but verify that primary content pages are not unintentionally consolidated.',
          action: 'Verify that all source pages are genuine duplicate/filtered variants of the target page.',
          expectedBenefit: 'Confirms proper signal consolidation.',
          caution: 'If source pages target distinct keywords, each should have a self-referential canonical tag.',
        }),
      });
    }
  }

  return issues;
}

/**
 * Audits indexability consistency across robots.txt, robots meta, and sitemaps.
 */
export function auditIndexabilityConsistency(
  pages: SEOReport[],
  sitemapUrls: Set<string>
): IndexabilityConsistencyIssue[] {
  const issues: IndexabilityConsistencyIssue[] = [];

  for (const page of pages) {
    const url = page.normalizedUrl || page.url;

    // 1. Sitemap URL + Noindex
    if (sitemapUrls.has(url) && !page.technical.isIndexable) {
      issues.push({
        id: `idx-sm-noindex-${page.id}`,
        url: page.url,
        issueType: 'SITEMAP_URL_NOINDEX',
        severity: 'HIGH',
        evidence: `Page is present in XML sitemap but returns noindex directive ("${page.onPage.robotsMeta || 'noindex'}").`,
        recommendation: buildCrossPageRecommendation({
          observation: 'Sitemap contains a URL with a noindex directive.',
          evidence: `URL: ${page.url} in sitemap with robotsMeta: "${page.onPage.robotsMeta}"`,
          interpretation: 'Sitemaps tell search engines which pages should be indexed. Listing a noindex URL sends conflicting signals.',
          action: 'Either remove the page from the XML sitemap or remove the noindex directive if the page should be indexed.',
          expectedBenefit: 'Eliminates contradictory indexing cues.',
          caution: 'Verify whether the noindex directive was placed intentionally for private or utility pages.',
        }),
      });
    }

    // 2. Indexable page with blocked robots path
    if (page.technical.isIndexable && page.technical.robotsAnalysis?.isBotAllowed === false) {
      issues.push({
        id: `idx-blocked-${page.id}`,
        url: page.url,
        issueType: 'INDEXABLE_BLOCKED_BY_ROBOTS',
        severity: 'HIGH',
        evidence: `Page is marked indexable but blocked by robots.txt Disallow rule.`,
        recommendation: buildCrossPageRecommendation({
          observation: 'Page is intended to be indexable but is blocked by robots.txt.',
          evidence: `Robots status: Disallowed for User-agent`,
          interpretation: 'Search engines blocked by robots.txt cannot crawl the page to evaluate content or read on-page directives.',
          action: 'Update robots.txt rules to Allow crawling for this URL path if it is intended for search indexing.',
          expectedBenefit: 'Allows search engine crawlers to access and evaluate the page content.',
          caution: 'Check if this path contains sensitive backend endpoints before allowing.',
        }),
      });
    }
  }

  return issues;
}

/**
 * Compiles site-wide sitemap consistency statuses.
 */
export function compileSitemapConsistency(
  sitemapUrls: string[],
  crawledUrlMap: Map<string, SEOReport>
): SitemapConsistencyItem[] {
  const result: SitemapConsistencyItem[] = [];

  for (const rawUrl of sitemapUrls) {
    const report = crawledUrlMap.get(rawUrl);

    if (!report) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_NOT_CRAWLED',
        notes: 'Declared in XML sitemap but not reached during crawl.',
      });
      continue;
    }

    const status = report.technical.httpStatus;
    const isIndexable = report.technical.isIndexable;
    const canonicalMatch = report.onPage.isCanonicalMatch;

    if (status >= 500) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_5XX',
        httpStatus: status,
        isIndexable: false,
        notes: `Returns server error HTTP ${status}.`,
      });
    } else if (status >= 400) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_4XX',
        httpStatus: status,
        isIndexable: false,
        notes: `Returns client error HTTP ${status}.`,
      });
    } else if (report.technical.redirectCount > 0) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_REDIRECT',
        httpStatus: status,
        isIndexable,
        notes: `Redirects to ${report.technical.redirectChain[report.technical.redirectChain.length - 1]}.`,
      });
    } else if (!isIndexable) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_NOINDEX',
        httpStatus: status,
        isIndexable: false,
        notes: `Contains noindex directive: "${report.onPage.robotsMeta || 'noindex'}".`,
      });
    } else if (!canonicalMatch && report.onPage.canonicalUrl) {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_CANONICALIZED',
        httpStatus: status,
        isIndexable,
        canonicalUrl: report.onPage.canonicalUrl,
        notes: `Points canonical to ${report.onPage.canonicalUrl}.`,
      });
    } else {
      result.push({
        url: rawUrl,
        status: 'SITEMAP_URL_HEALTHY',
        httpStatus: status,
        isIndexable: true,
        canonicalUrl: report.onPage.canonicalUrl,
        notes: 'Clean 200 OK indexable page matching canonical URL.',
      });
    }
  }

  return result;
}

/**
 * Builds site-wide redirect graph and detects chains/loops.
 */
export function buildRedirectGraph(pages: SEOReport[]): RedirectGraphNode[] {
  const nodes: RedirectGraphNode[] = [];

  for (const page of pages) {
    if (page.technical.redirectCount > 0) {
      const chain = page.technical.redirectChain;
      const startUrl = chain[0] || page.url;
      const finalUrl = chain[chain.length - 1] || page.url;
      const isLoop = chain.length > 2 && chain[0] === chain[chain.length - 1];

      nodes.push({
        startUrl,
        finalUrl,
        hopCount: page.technical.redirectCount,
        chain,
        isLoop,
        destinationStatus: page.technical.httpStatus,
        isInternalLinkTarget: false,
        incomingLinkCount: 0,
      });
    }
  }

  return nodes.sort((a, b) => b.hopCount - a.hopCount);
}

/**
 * Audits hreflang reciprocal links across crawled pages.
 */
export function auditHreflangCrossPage(
  pages: SEOReport[],
  crawledUrlMap: Map<string, SEOReport>
): HreflangCrossPageIssue[] {
  const issues: HreflangCrossPageIssue[] = [];

  for (const page of pages) {
    const hreflangItems = page.onPage.hreflang || [];
    const sourceUrl = page.normalizedUrl || page.url;

    for (const item of hreflangItems) {
      const targetUrl = item.href;
      if (!targetUrl || targetUrl === sourceUrl) continue;

      const targetReport = crawledUrlMap.get(targetUrl);
      if (targetReport) {
        // Check if target points back to source
        const targetHreflang = targetReport.onPage.hreflang || [];
        const hasReciprocal = targetHreflang.some(
          (th) => (th.href === sourceUrl || th.href === page.url)
        );

        if (!hasReciprocal) {
          issues.push({
            id: `href-recip-${page.id}-${item.lang}`,
            sourceUrl: page.url,
            alternateUrl: targetUrl,
            langCode: item.lang,
            issueType: 'MISSING_RECIPROCAL',
            evidence: `"${sourceUrl}" specifies alternate "${targetUrl}" (${item.lang}), but target page does not link back with hreflang.`,
            recommendation: buildCrossPageRecommendation({
              observation: `Missing reciprocal hreflang alternate link on "${targetUrl}".`,
              evidence: `Source: ${sourceUrl} (${item.lang}) -> Target: ${targetUrl} lacks return link.`,
              interpretation: 'Search engines ignore hreflang annotations unless both pages reciprocally reference each other.',
              action: `Add a matching <link rel="alternate" hreflang="${item.lang}" href="${sourceUrl}" /> tag on "${targetUrl}".`,
              expectedBenefit: 'Ensures correct international and regional version targeting in search results.',
              caution: 'Confirm language and country ISO codes match standard BCP 47 formats.',
            }),
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Evaluates site-wide Schema.org structured data patterns.
 * Rule 3: Missing schema is not automatically treated as an SEO failure; requires contextual evidence.
 */
export function analyzeStructuredDataCrossPage(
  pages: SEOReport[]
): StructuredDataCrossPagePattern[] {
  const patternMap = new Map<string, { count: number; urls: string[]; pageTypes: Set<PageType> }>();

  for (const page of pages) {
    const pageType = page.contentIntelligence?.pageType.detectedType || 'ARTICLE';
    const schemas = page.schemas || [];

    for (const s of schemas) {
      const typeName = s.type || 'Thing';
      let entry = patternMap.get(typeName);
      if (!entry) {
        entry = { count: 0, urls: [], pageTypes: new Set() };
        patternMap.set(typeName, entry);
      }
      entry.count++;
      if (entry.urls.length < 5) entry.urls.push(page.url);
      entry.pageTypes.add(pageType);
    }
  }

  const result: StructuredDataCrossPagePattern[] = [];

  for (const [type, data] of patternMap.entries()) {
    result.push({
      schemaType: type,
      pagesCount: data.count,
      sampleUrls: data.urls,
      contextuallyExpectedOn: Array.from(data.pageTypes),
    });
  }

  return result.sort((a, b) => b.pagesCount - a.pagesCount);
}
