import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  databasePath: z.string().default('./data/seo_analyzer.db'),
  crawlerUserAgent: z.string().default('SEOAnalyzerBot/1.0 (+https://example.com/bot)'),
  crawlerTimeoutMs: z.coerce.number().default(15000),
  crawlerMaxRedirects: z.coerce.number().default(5),
  crawlerMaxSizeBytes: z.coerce.number().default(10485760), // 10MB
  maxCrawlPages: z.coerce.number().default(500),
  crawlConcurrency: z.coerce.number().default(4),
});

export const config = configSchema.parse({
  port: process.env.PORT,
  host: process.env.HOST,
  nodeEnv: process.env.NODE_ENV,
  databasePath: process.env.DATABASE_PATH,
  crawlerUserAgent: process.env.CRAWLER_USER_AGENT,
  crawlerTimeoutMs: process.env.CRAWLER_TIMEOUT_MS,
  crawlerMaxRedirects: process.env.CRAWLER_MAX_REDIRECTS,
  crawlerMaxSizeBytes: process.env.CRAWLER_MAX_SIZE_BYTES,
  maxCrawlPages: process.env.MAX_CRAWL_PAGES,
  crawlConcurrency: process.env.CRAWL_CONCURRENCY,
});

export type Config = z.infer<typeof configSchema>;
