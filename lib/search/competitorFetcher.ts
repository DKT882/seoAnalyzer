import { safeFetch } from '../crawler/safeFetcher';
import { parseHtmlContent } from '../parser/htmlParser';
import { classifyPageType } from '../content/pageTypeClassifier';
import { extractTopicIntelligence } from '../content/topicIntelligence';
import { PageType, ContentBlock } from '@/types';
import { SearchResourceLimits, PageTypeProvenance, TopicProvenance } from './searchTypes';
import { logger } from '../utils/logger';

export interface CompetitorPageAnalysis {
  url: string;
  domain: string;
  title: string;
  headings: string[];
  analyzedPageType: PageType;
  extractedTopics: string[];
  wordCount: number;
  statusCode: number;
  pageTypeProvenance: PageTypeProvenance;
  topicProvenance: TopicProvenance;
}

/**
 * Optional Competitor Page Deep Fetcher with strict SSRF protection and bounded resource controls.
 * Calibration Rule 3 & 13: Storing/displaying SERP URLs does NOT fetch them; this fetcher is ONLY
 * invoked when deep competitor enrichment is explicitly requested, with hard request/byte limits.
 */
export async function fetchAndAnalyzeCompetitorPages(
  urls: string[],
  limits: Partial<SearchResourceLimits> = {}
): Promise<CompetitorPageAnalysis[]> {
  const maxPages = limits.maxCompetitorPages ?? 5;
  const maxBytes = limits.maxCompetitorResponseBytes ?? 10 * 1024 * 1024; // 10MB
  const targetUrls = urls.slice(0, maxPages);

  const results: CompetitorPageAnalysis[] = [];
  let totalBytesConsumed = 0;

  for (const targetUrl of targetUrls) {
    if (totalBytesConsumed >= maxBytes) {
      logger.warn(`Competitor fetcher reached response byte ceiling (${maxBytes} bytes). Halting further fetches.`);
      break;
    }

    try {
      // 1. SSRF-Safe HTTP Fetch
      const fetchResult = await safeFetch(targetUrl, {
        timeoutMs: 10000,
        maxSizeBytes: 2 * 1024 * 1024, // 2MB max per single competitor page
      });

      totalBytesConsumed += fetchResult.pageSizeBytes;

      if (fetchResult.statusCode !== 200 || !fetchResult.body) {
        continue;
      }

      // 2. Parse HTML and extract clean text
      const parsed = parseHtmlContent(fetchResult.body);
      const urlObj = new URL(fetchResult.finalUrl);
      const headingsList = parsed.headings?.items || [];
      const title = parsed.$('title').first().text().trim() || 'Untitled';
      const metaDescription = parsed.$('meta[name="description"]').attr('content')?.trim() || '';

      // 3. Classify Page Type from actual fetched HTML
      const contentBlocks: ContentBlock[] = headingsList.map((h, i) => ({
        id: `blk-h-${i}`,
        type: 'heading',
        tag: `h${h.level}`,
        text: h.text,
        wordCount: h.text.split(/\s+/).length,
        headingLevel: h.level,
        isMainContent: true,
        locationIndex: i,
      }));

      const pageTypeAssessment = classifyPageType({
        url: fetchResult.finalUrl,
        title,
        metaDescription,
        headings: headingsList,
        schemas: [],
        mainContentText: parsed.visibleText,
        html: fetchResult.body,
      });

      // 4. Extract Topics from fetched content
      const topicAssessment = extractTopicIntelligence({
        title,
        metaDescription,
        h1Text: headingsList.find((h) => h.level === 1)?.text,
        headings: headingsList,
        blocks: contentBlocks,
        mainContentText: parsed.visibleText,
      });

      results.push({
        url: fetchResult.finalUrl,
        domain: urlObj.hostname,
        title,
        headings: headingsList.map((h) => h.text).slice(0, 15),
        analyzedPageType: pageTypeAssessment.detectedType,
        extractedTopics: (topicAssessment.primaryTopics || []).map((t) => t.topic),
        wordCount: parsed.wordCount,
        statusCode: fetchResult.statusCode,
        pageTypeProvenance: 'ANALYZED_FROM_FETCHED_HTML',
        topicProvenance: 'FETCHED_PAGE_ANALYSIS',
      });
    } catch (err) {
      logger.warn(`Failed safe fetch for competitor URL "${targetUrl}":`, err);
    }
  }

  return results;
}
