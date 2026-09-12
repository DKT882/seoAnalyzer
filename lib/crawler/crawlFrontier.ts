import {
  CrawlState,
  DiscoveryMethod,
  CrawlFailureReason,
  CrawlResourceBudget,
} from '@/types';
import { normalizeUrlDeterministically, NormalizedUrlIdentity } from './urlNormalizer';

export interface FrontierItem {
  id: string;
  url: string;
  normalizedUrl: string;
  urlHash: string;
  depth: number;
  discoveryMethod: DiscoveryMethod;
  discoveredFrom?: string;
  state: CrawlState;
  failureReason?: CrawlFailureReason;
  errorMessage?: string;
  retryCount: number;
  addedAt: number;
  completedAt?: number;
}

export interface CrawlFrontierOptions {
  maxPages: number;
  maxDepth: number;
  maxRequests?: number;
  maxResponseBytes?: number;
  maxBrowserRenders?: number;
  maxRetries?: number;
  totalCrawlTimeoutMs?: number;
  baseHostname: string;
}

export class CrawlFrontier {
  private queue: string[] = [];
  private items = new Map<string, FrontierItem>(); // key = normalizedUrl
  private discoveredHashes = new Set<string>();
  private options: CrawlFrontierOptions;
  private startTime: number;

  public budget: CrawlResourceBudget;

  constructor(options: CrawlFrontierOptions) {
    this.options = options;
    this.startTime = Date.now();

    this.budget = {
      maxRequests: options.maxRequests ?? Math.min(options.maxPages * 2, 500),
      maxResponseBytes: options.maxResponseBytes ?? 50 * 1024 * 1024, // 50MB
      maxBrowserRenders: options.maxBrowserRenders ?? 15,
      maxRetries: options.maxRetries ?? 2,
      totalCrawlTimeoutMs: options.totalCrawlTimeoutMs ?? 180000, // 3 mins
      usedRequests: 0,
      usedResponseBytes: 0,
      usedBrowserRenders: 0,
      usedRetries: 0,
    };
  }

  /**
   * Adds a candidate URL to the crawl frontier.
   */
  public addCandidate(
    rawUrl: string,
    depth: number,
    discoveryMethod: DiscoveryMethod,
    discoveredFrom?: string
  ): { added: boolean; reason?: string; normalized?: NormalizedUrlIdentity } {
    if (this.isBudgetExceeded()) {
      return { added: false, reason: 'Crawl resource budget exceeded' };
    }

    if (depth > this.options.maxDepth) {
      return { added: false, reason: `Exceeds max depth (${this.options.maxDepth})` };
    }

    const norm = normalizeUrlDeterministically(rawUrl, {
      allowedHostname: this.options.baseHostname,
      stripTrackingParams: true,
    });

    if (!norm) {
      return { added: false, reason: 'Invalid or out-of-scope URL' };
    }

    if (norm.isTrapSuspected) {
      this.items.set(norm.normalizedUrl, {
        id: norm.urlHash,
        url: rawUrl,
        normalizedUrl: norm.normalizedUrl,
        urlHash: norm.urlHash,
        depth,
        discoveryMethod,
        discoveredFrom,
        state: 'SKIPPED',
        errorMessage: norm.trapReason || 'Crawl trap pattern suspected',
        retryCount: 0,
        addedAt: Date.now(),
      });
      return { added: false, reason: norm.trapReason, normalized: norm };
    }

    if (this.discoveredHashes.has(norm.urlHash) || this.items.has(norm.normalizedUrl)) {
      return { added: false, reason: 'Duplicate URL already in frontier', normalized: norm };
    }

    // Limit maximum discovered URLs to prevent unbounded memory growth
    if (this.items.size >= this.options.maxPages * 5) {
      return { added: false, reason: 'Frontier discovery capacity reached', normalized: norm };
    }

    const item: FrontierItem = {
      id: norm.urlHash,
      url: rawUrl,
      normalizedUrl: norm.normalizedUrl,
      urlHash: norm.urlHash,
      depth,
      discoveryMethod,
      discoveredFrom,
      state: 'QUEUED',
      retryCount: 0,
      addedAt: Date.now(),
    };

    this.items.set(norm.normalizedUrl, item);
    this.discoveredHashes.add(norm.urlHash);
    this.queue.push(norm.normalizedUrl);

    return { added: true, normalized: norm };
  }

  /**
   * Retrieves the next eligible URL from the queue.
   */
  public getNext(): FrontierItem | null {
    if (this.isBudgetExceeded()) return null;

    while (this.queue.length > 0) {
      const nextUrl = this.queue.shift();
      if (!nextUrl) continue;

      const item = this.items.get(nextUrl);
      if (item && item.state === 'QUEUED') {
        item.state = 'FETCHING';
        this.budget.usedRequests++;
        return item;
      }
    }

    return null;
  }

  public markAnalyzing(normalizedUrl: string): void {
    const item = this.items.get(normalizedUrl);
    if (item) item.state = 'ANALYZING';
  }

  public markCompleted(normalizedUrl: string, responseBytes: number = 0, renderedInBrowser: boolean = false): void {
    const item = this.items.get(normalizedUrl);
    if (item) {
      item.state = 'COMPLETED';
      item.completedAt = Date.now();
      this.budget.usedResponseBytes += responseBytes;
      if (renderedInBrowser) {
        this.budget.usedBrowserRenders++;
      }
    }
  }

  public markSkipped(normalizedUrl: string, reason: string): void {
    const item = this.items.get(normalizedUrl);
    if (item) {
      item.state = 'SKIPPED';
      item.errorMessage = reason;
      item.completedAt = Date.now();
    }
  }

  public markBlocked(normalizedUrl: string, reason: string): void {
    const item = this.items.get(normalizedUrl);
    if (item) {
      item.state = 'BLOCKED';
      item.failureReason = 'ROBOTS_BLOCKED';
      item.errorMessage = reason;
      item.completedAt = Date.now();
    }
  }

  public markFailed(
    normalizedUrl: string,
    failureReason: CrawlFailureReason,
    errorMessage: string,
    isTransient: boolean = false
  ): boolean {
    const item = this.items.get(normalizedUrl);
    if (!item) return false;

    // Retry transient errors if within retry limits
    if (isTransient && item.retryCount < this.budget.maxRetries && this.budget.usedRetries < this.budget.maxRetries * 3) {
      item.retryCount++;
      this.budget.usedRetries++;
      item.state = 'QUEUED';
      this.queue.push(normalizedUrl);
      return true; // Scheduled for retry
    }

    item.state = 'FAILED';
    item.failureReason = failureReason;
    item.errorMessage = errorMessage;
    item.completedAt = Date.now();
    return false;
  }

  /**
   * Evaluates if any crawl resource budget ceiling is exceeded.
   */
  public isBudgetExceeded(): boolean {
    if (Date.now() - this.startTime > this.budget.totalCrawlTimeoutMs) return true;
    if (this.budget.usedRequests >= this.budget.maxRequests) return true;
    if (this.budget.usedResponseBytes >= this.budget.maxResponseBytes) return true;
    return false;
  }

  public canRenderBrowser(): boolean {
    return this.budget.usedBrowserRenders < this.budget.maxBrowserRenders;
  }

  public getCompletedCount(): number {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.state === 'COMPLETED') count++;
    }
    return count;
  }

  public getStats() {
    let discovered = this.items.size;
    let queued = 0;
    let fetching = 0;
    let analyzing = 0;
    let completed = 0;
    let skipped = 0;
    let failed = 0;
    let blocked = 0;

    for (const item of this.items.values()) {
      switch (item.state) {
        case 'QUEUED': queued++; break;
        case 'FETCHING': fetching++; break;
        case 'ANALYZING': analyzing++; break;
        case 'COMPLETED': completed++; break;
        case 'SKIPPED': skipped++; break;
        case 'FAILED': failed++; break;
        case 'BLOCKED': blocked++; break;
      }
    }

    return {
      discovered,
      queued,
      fetching,
      analyzing,
      completed,
      skipped,
      failed,
      blocked,
      budget: { ...this.budget },
      elapsedMs: Date.now() - this.startTime,
    };
  }

  public getAllItems(): FrontierItem[] {
    return Array.from(this.items.values());
  }

  public getItem(normalizedUrl: string): FrontierItem | undefined {
    return this.items.get(normalizedUrl);
  }
}
