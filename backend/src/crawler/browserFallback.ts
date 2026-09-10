import { FetchResult } from './safeFetcher.js';

export interface BrowserFallbackOptions {
  timeoutMs?: number;
  waitForSelector?: string;
}

/**
 * Browser Automation Fallback Interface.
 * Used when a webpage relies purely on client-side SPA rendering and static HTTP returns thin/empty content.
 */
export async function dynamicRenderFallback(
  url: string,
  _options: BrowserFallbackOptions = {}
): Promise<FetchResult | null> {
  // In production environments without Playwright binaries pre-installed,
  // we gracefully indicate the requirement rather than crashing the process.
  return null;
}
