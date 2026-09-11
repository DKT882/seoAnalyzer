import robotsParser from 'robots-parser';
import { safeFetch } from '../crawler/safeFetcher';
import { RobotsAnalysis } from '@/types';
import { config } from '../config';

export async function parseRobotsTxt(targetUrl: string): Promise<RobotsAnalysis> {
  let robotsUrl = '';
  try {
    const parsed = new URL(targetUrl);
    robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
  } catch {
    return {
      exists: false,
      url: '',
      status: 0,
      sitemaps: [],
      isBotAllowed: true,
      directivesCount: 0,
    };
  }

  try {
    const res = await safeFetch(robotsUrl, {
      timeoutMs: 5000,
      maxSizeBytes: 1048576, // 1MB limit for robots.txt
    });

    if (res.statusCode === 200 && res.body.trim().length > 0) {
      const createRobotsParser = (robotsParser as any).default || robotsParser;
      const robots = createRobotsParser(robotsUrl, res.body);
      const userAgent = config.crawlerUserAgent;

      const isBotAllowed = robots.isAllowed(targetUrl, userAgent) ?? true;
      const sitemaps = robots.getSitemaps();
      const crawlDelay = robots.getCrawlDelay(userAgent);

      // Count lines of directives
      const directivesCount = res.body
        .split('\n')
        .filter((l) => /^(User-agent|Allow|Disallow|Sitemap|Crawl-delay):/i.test(l.trim())).length;

      return {
        exists: true,
        url: robotsUrl,
        status: res.statusCode,
        content: res.body.slice(0, 3000), // First 3000 chars for preview
        sitemaps,
        isBotAllowed,
        crawlDelay: typeof crawlDelay === 'number' ? crawlDelay : undefined,
        directivesCount,
      };
    }

    return {
      exists: false,
      url: robotsUrl,
      status: res.statusCode,
      sitemaps: [],
      isBotAllowed: true,
      directivesCount: 0,
    };
  } catch {
    return {
      exists: false,
      url: robotsUrl,
      status: 0,
      sitemaps: [],
      isBotAllowed: true,
      directivesCount: 0,
    };
  }
}
