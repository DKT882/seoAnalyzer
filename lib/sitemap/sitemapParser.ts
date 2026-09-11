import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from '../crawler/safeFetcher';
import { SitemapAnalysis } from '@/types';

export async function parseSitemapXml(
  targetUrl: string,
  discoveredSitemaps: string[] = []
): Promise<SitemapAnalysis> {
  const candidateUrls: string[] = [...discoveredSitemaps];

  try {
    const parsed = new URL(targetUrl);
    const defaultSitemap = `${parsed.protocol}//${parsed.host}/sitemap.xml`;
    const indexSitemap = `${parsed.protocol}//${parsed.host}/sitemap_index.xml`;

    if (!candidateUrls.includes(defaultSitemap)) candidateUrls.push(defaultSitemap);
    if (!candidateUrls.includes(indexSitemap)) candidateUrls.push(indexSitemap);
  } catch {
    // If target URL invalid, continue with whatever is in candidateUrls
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    trimValues: true,
  });

  for (const sitemapUrl of candidateUrls) {
    try {
      const res = await safeFetch(sitemapUrl, {
        timeoutMs: 6000,
        maxSizeBytes: 5242880, // 5MB max for sitemap
      });

      if (res.statusCode === 200 && res.body.includes('<')) {
        const parsedXml = parser.parse(res.body);

        // Case 1: Sitemap Index (<sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>)
        if (parsedXml.sitemapindex) {
          const sitemaps = Array.isArray(parsedXml.sitemapindex.sitemap)
            ? parsedXml.sitemapindex.sitemap
            : [parsedXml.sitemapindex.sitemap];

          const sampleLocs = sitemaps
            .map((s: any) => s?.loc)
            .filter((loc: any) => typeof loc === 'string')
            .slice(0, 30);

          return {
            exists: true,
            url: sitemapUrl,
            status: 200,
            totalUrls: sitemaps.length,
            urlsSample: sampleLocs,
            isIndex: true,
          };
        }

        // Case 2: Standard URL Set (<urlset><url><loc>...</loc></url></urlset>)
        if (parsedXml.urlset) {
          const urls = Array.isArray(parsedXml.urlset.url)
            ? parsedXml.urlset.url
            : parsedXml.urlset.url ? [parsedXml.urlset.url] : [];

          const sampleLocs = urls
            .map((u: any) => u?.loc)
            .filter((loc: any) => typeof loc === 'string')
            .slice(0, 50);

          return {
            exists: true,
            url: sitemapUrl,
            status: 200,
            totalUrls: urls.length,
            urlsSample: sampleLocs,
            isIndex: false,
          };
        }
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    exists: false,
    url: candidateUrls[0] || '',
    status: 0,
    totalUrls: 0,
    urlsSample: [],
    isIndex: false,
  };
}
