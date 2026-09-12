import {
  InternalLinkGraph,
  OrphanCandidate,
  PageType,
} from '@/types';

const UTILITY_PAGE_TYPES = new Set<PageType>([
  'CONTACT',
  'HOMEPAGE',
  'UNKNOWN',
]);

/**
 * Detects orphan candidates across crawled and sitemap URLs.
 * Strictly adheres to cautious SEO phrasing: labels pages as "Orphan Candidate".
 */
export function detectOrphanCandidates(
  linkGraph: InternalLinkGraph,
  sitemapUrls: Set<string>,
  canonicalTargets: Set<string>
): OrphanCandidate[] {
  const candidates: OrphanCandidate[] = [];

  for (const node of linkGraph.nodes) {
    const isRootUrl = node.depth === 0 && node.discoveryMethod === 'START_URL';
    if (node.internalInlinkCount === 0 && !isRootUrl) {
      let category: OrphanCandidate['category'] = 'potential_crawl_orphan';
      let evidence = `Page has 0 observed incoming internal links from crawled pages at depth ${node.depth}.`;
      let caution = 'Verify if this page is newly published, intentionally isolated, or linked via un-crawled navigation paths.';

      if (UTILITY_PAGE_TYPES.has(node.pageType)) {
        category = 'utility_isolated';
        evidence = `Page is classified as "${node.pageType}" and has 0 incoming internal links. Utility pages often have minimal internal inlinks by design.`;
        caution = 'No immediate action required unless this page is intended to receive direct organic search traffic.';
      } else if (canonicalTargets.has(node.normalizedUrl)) {
        category = 'canonical_target';
        evidence = `Page is referenced as a master canonical target by other pages but has 0 incoming internal anchor links.`;
        caution = 'Ensure the canonical master page is linked from relevant category or hub sections.';
      } else if (sitemapUrls.has(node.normalizedUrl) || node.discoveryMethod === 'SITEMAP' || node.discoveryMethod === 'ROBOTS_SITEMAP') {
        category = 'sitemap_only';
        evidence = `Page is declared in XML sitemap but has 0 internal incoming links discovered during site crawl.`;
        caution = 'Adding contextual inlinks from related category or parent pages helps users and crawlers discover this content naturally.';
      }

      candidates.push({
        url: node.url,
        normalizedUrl: node.normalizedUrl,
        title: node.primaryTopic ? `Page regarding ${node.primaryTopic}` : node.url,
        inlinkCount: 0,
        discoveryMethod: node.discoveryMethod,
        pageType: node.pageType,
        category,
        evidence,
        caution,
      });
    }
  }

  return candidates.sort((a, b) => {
    // Priority: potential_crawl_orphan first, then canonical_target, then sitemap_only, then utility
    const order: Record<OrphanCandidate['category'], number> = {
      potential_crawl_orphan: 4,
      canonical_target: 3,
      sitemap_only: 2,
      utility_isolated: 1,
    };
    return order[b.category] - order[a.category];
  });
}
