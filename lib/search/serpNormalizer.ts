import crypto from 'node:crypto';
import {
  NormalizedSerpSnapshot,
  SerpResultItem,
  SerpFeatureItem,
  SearchResultType,
  SearchDevice,
  ObservationProvenance,
  PageTypeProvenance,
  QuerySource,
} from './searchTypes';
import { RawSerpResponse, RawSerpItem } from './searchProvider';
import { PageType, ContentSearchIntent } from '@/types';
import { validateAndNormalizeUrl } from '../utils/urlUtils';
import { tryNormalizeIpFormat } from '../utils/ssrfGuard';

/**
 * Normalizes query string: strips extra whitespace, normalizes Unicode, trims.
 */
export function normalizeQueryString(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Strip zero-width chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes deterministic SHA-256 fingerprint for snapshot deduplication and cache indexing.
 */
export function computeSerpSnapshotFingerprint(params: {
  query: string;
  provider: string;
  location?: string;
  language?: string;
  device?: SearchDevice;
}): string {
  const normQuery = normalizeQueryString(params.query).toLowerCase();
  const provider = (params.provider || 'default').toLowerCase().trim();
  const loc = (params.location || 'us').toLowerCase().trim();
  const lang = (params.language || 'en').toLowerCase().trim();
  const dev = (params.device || 'DESKTOP').toUpperCase().trim();

  const seed = `${normQuery}|${provider}|${loc}|${lang}|${dev}`;
  return crypto.createHash('sha256').update(seed).digest('hex');
}

/**
 * Classifies raw SERP item type into standard SearchResultType enum.
 */
export function mapRawResultType(rawType: string, item: RawSerpItem): SearchResultType {
  const t = (rawType || '').toLowerCase().trim();

  if (item.is_featured_snippet || t === 'featured_snippet') return 'FEATURED_SNIPPET';
  if (t === 'organic' || t === 'regular') return 'ORGANIC';
  if (t.includes('local') || t === 'maps' || t === 'places') return 'LOCAL_PACK';
  if (t.includes('video') || t === 'youtube') return 'VIDEO';
  if (t.includes('image') || t === 'images') return 'IMAGE';
  if (t.includes('news') || t === 'top_stories') return 'NEWS';
  if (t.includes('shopping') || t.includes('product')) return 'SHOPPING';
  if (t.includes('people_also_ask') || t === 'questions') return 'PEOPLE_ALSO_ASK';
  if (t.includes('related_searches') || t === 'related') return 'RELATED_SEARCHES';
  if (t.includes('knowledge') || t === 'knowledge_graph') return 'KNOWLEDGE_PANEL';

  return 'OTHER';
}

/**
 * Rapid heuristic classification of page type inferred from SERP URL and snippet.
 * Explicitly carries PageTypeProvenance: 'INFERRED_FROM_SERP_SNIPPET'
 */
export function inferPageTypeFromSerpItem(url: string, title: string, snippet: string): PageType {
  const text = `${url} ${title} ${snippet}`.toLowerCase();

  if (
    text.includes('/product/') ||
    text.includes('/item/') ||
    text.includes('/dp/') ||
    text.includes('/p/') ||
    text.includes('buy online') ||
    text.includes('add to cart') ||
    text.includes('in stock') ||
    text.includes('price: $') ||
    text.includes('free shipping on')
  ) {
    return 'PRODUCT';
  }

  if (
    text.includes('/category/') ||
    text.includes('/collection/') ||
    text.includes('/collections/') ||
    text.includes('/shop/') ||
    text.includes('/store/') ||
    text.includes('shop all') ||
    text.includes('browse our selection')
  ) {
    return 'CATEGORY_PAGE';
  }

  if (
    text.includes('/docs/') ||
    text.includes('/documentation/') ||
    text.includes('/api/') ||
    text.includes('/reference/') ||
    text.includes('documentation for')
  ) {
    return 'DOCUMENTATION';
  }

  if (
    text.includes('/faq') ||
    text.includes('frequently asked questions') ||
    text.includes('q&a')
  ) {
    return 'FAQ';
  }

  if (
    text.includes('/contact') ||
    text.includes('contact us') ||
    text.includes('phone number') ||
    text.includes('office address')
  ) {
    return 'CONTACT';
  }

  if (
    text.includes('/services/') ||
    text.includes('/service/') ||
    text.includes('our services') ||
    text.includes('consulting services')
  ) {
    return 'SERVICE';
  }

  if (
    text.includes('near me') ||
    text.includes('directions') ||
    text.includes('hours') ||
    text.includes('serving area')
  ) {
    return 'LOCAL_BUSINESS';
  }

  if (
    text.includes('/blog/') ||
    text.includes('/article/') ||
    text.includes('/guide/') ||
    text.includes('/post/') ||
    text.includes('/news/') ||
    text.includes('how to ') ||
    text.includes('guide to ') ||
    text.includes('tutorial')
  ) {
    return 'ARTICLE';
  }

  return 'ARTICLE'; // Standard informational fallback
}

/**
 * Inferred search intent from SERP result metadata.
 */
export function inferIntentFromSerpItem(title: string, snippet: string, url: string): ContentSearchIntent {
  const text = `${title} ${snippet} ${url}`.toLowerCase();

  const isTrans =
    text.includes('buy') ||
    text.includes('order') ||
    text.includes('pricing') ||
    text.includes('discount') ||
    text.includes('sale') ||
    text.includes('shop') ||
    text.includes('store') ||
    text.includes('add to cart') ||
    text.includes('coupon');

  const isCommercial =
    text.includes('best') ||
    text.includes('vs') ||
    text.includes('review') ||
    text.includes('reviews') ||
    text.includes('comparison') ||
    text.includes('top 10') ||
    text.includes('alternatives');

  const isLocal =
    text.includes('near me') ||
    text.includes('locations') ||
    text.includes('find local') ||
    text.includes('directions');

  if (isLocal) return 'LOCAL';
  if (isTrans && isCommercial) return 'COMMERCIAL_INVESTIGATION';
  if (isTrans) return 'TRANSACTIONAL';
  if (isCommercial) return 'COMMERCIAL_INVESTIGATION';

  return 'INFORMATIONAL';
}

/**
 * Normalizes a raw provider SERP response into a standardized, validated NormalizedSerpSnapshot.
 * SSRF Safety: Validates every result URL against protocol and private IP blocks.
 */
export function normalizeSerpResponse(
  raw: RawSerpResponse,
  options: {
    source?: QuerySource;
    collectedAt?: string;
  } = {}
): NormalizedSerpSnapshot {
  const normalizedQuery = normalizeQueryString(raw.query);
  const collectedAt = options.collectedAt || new Date().toISOString();
  const source = options.source || 'USER_TARGET';
  const fingerprint = computeSerpSnapshotFingerprint({
    query: normalizedQuery,
    provider: raw.provider,
    location: raw.location,
    language: raw.language,
    device: raw.device,
  });

  const baseProvenance: ObservationProvenance = {
    source: 'EXTERNAL_SERP',
    provider: raw.provider,
    collectedAt,
    location: raw.location,
    language: raw.language,
    device: raw.device,
    extractionMethod: 'SERP_SNIPPET',
    isSyntheticTest: raw.isSyntheticTest,
    fingerprint,
  };

  const results: SerpResultItem[] = [];
  const serpFeatures: SerpFeatureItem[] = [];
  const seenUrls = new Set<string>();

  let serpSlot = 1;
  let organicRank = 1;

  for (const item of raw.items) {
    const resultType = mapRawResultType(item.type, item);

    // Feature processing (PAA, Local Pack, Video, etc.)
    if (resultType !== 'ORGANIC') {
      serpFeatures.push({
        type: resultType,
        title: item.title,
        items: item.items,
        snippet: item.snippet || item.description,
        position: item.rank_absolute || serpSlot++,
      });
    }

    // Process URL results (Organic, Featured Snippets, News, Shopping)
    if (item.url && typeof item.url === 'string') {
      const trimmedUrl = item.url.trim();

      // SSRF & Protocol Safety Validation
      const urlValidation = validateAndNormalizeUrl(trimmedUrl);
      if (!urlValidation.isValid || !urlValidation.parsedUrl) {
        continue; // Exclude invalid, non-http, or unsafe protocol URLs
      }

      // Private / loopback / link-local / localhost check on hostname
      const host = urlValidation.parsedUrl.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '[::1]' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        continue;
      }

      const ipNormalized = tryNormalizeIpFormat(host);
      if (
        ipNormalized.startsWith('127.') ||
        ipNormalized.startsWith('10.') ||
        ipNormalized.startsWith('192.168.') ||
        ipNormalized.startsWith('169.254.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipNormalized)
      ) {
        continue; // Block private IP URLs from external SERPs
      }

      // Strip tracking parameters from SERP URLs
      const cleanUrlObj = new URL(urlValidation.parsedUrl.href);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid', 'mc_eid'];
      let modified = false;
      for (const p of trackingParams) {
        if (cleanUrlObj.searchParams.has(p)) {
          cleanUrlObj.searchParams.delete(p);
          modified = true;
        }
      }
      const normUrl = modified ? cleanUrlObj.href : (urlValidation.normalizedUrl || trimmedUrl);

      if (seenUrls.has(normUrl)) {
        continue; // Deduplicate identical URLs in result listings
      }
      seenUrls.add(normUrl);

      const title = (item.title || 'Untitled Search Result').trim();
      const snippet = (item.snippet || item.description || '').trim();
      const domain = item.domain || urlValidation.parsedUrl.hostname;

      const detectedPageType = inferPageTypeFromSerpItem(normUrl, title, snippet);
      const detectedIntent = inferIntentFromSerpItem(title, snippet, normUrl);

      const currentSerpPos = item.rank_absolute || serpSlot++;
      const currentOrganicPos = resultType === 'ORGANIC' ? (item.rank_group || organicRank++) : undefined;

      results.push({
        id: `serp-item-${fingerprint.substring(0, 8)}-${results.length + 1}`,
        serpPosition: currentSerpPos,
        organicPosition: currentOrganicPos,
        url: normUrl,
        domain,
        title,
        snippet,
        displayedUrl: item.breadcrumb || normUrl,
        resultType,
        detectedPageType,
        pageTypeProvenance: 'INFERRED_FROM_SERP_SNIPPET',
        detectedIntent,
        sitelinks: Array.isArray(item.links) ? item.links.map((l: any) => l.title || l.url).filter(Boolean) : undefined,
        provenance: {
          ...baseProvenance,
          fingerprint,
        },
      });
    }
  }

  const organicCount = results.filter((r) => r.resultType === 'ORGANIC').length;
  const featureTypes = Array.from(new Set(serpFeatures.map((f) => f.type)));

  return {
    id: `snap-${fingerprint.substring(0, 16)}`,
    fingerprint,
    query: raw.query,
    normalizedQuery,
    source,
    collectedAt,
    provider: raw.provider,
    location: raw.location,
    language: raw.language,
    device: raw.device,
    results,
    serpFeatures,
    organicCount,
    featureTypes,
    freshnessAgeMinutes: 0,
    sourceMetadata: {
      rawResultCount: raw.itemCount,
      responseTimeMs: raw.responseTimeMs,
      isSyntheticTest: raw.isSyntheticTest,
      providerLabel: raw.isSyntheticTest ? 'DEMO/TEST DATA (Mock SERP)' : `Live External Provider (${raw.provider})`,
      disclaimer: 'Observed in sampled SERP snapshot. SERP rankings, layouts, and features vary by geography, device, and temporal factors. This observation is not a Google ranking factor or ranking guarantee.',
    },
    provenance: baseProvenance,
  };
}
