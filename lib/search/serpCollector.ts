import {
  SearchQueryTarget,
  NormalizedSerpSnapshot,
  SearchResourceLimits,
  ProviderUsageTelemetry,
  SearchDevice,
} from './searchTypes';
import { SearchProvider, SearchProviderRegistry, ProviderSearchOptions } from './searchProvider';
import { normalizeSerpResponse, computeSerpSnapshotFingerprint } from './serpNormalizer';
import { getSerpStorage, SerpSnapshotStore } from './serpStorage';
import { logger } from '../utils/logger';

export interface SerpCollectorOptions {
  providerId?: string;
  location?: string;
  language?: string;
  device?: SearchDevice;
  limitPerQuery?: number;
  limits?: Partial<SearchResourceLimits>;
  forceRefresh?: boolean;
  store?: SerpSnapshotStore;
  signal?: AbortSignal;
}

export interface SerpCollectorResult {
  snapshots: NormalizedSerpSnapshot[];
  telemetry: ProviderUsageTelemetry;
  errors: Array<{ query: string; error: string }>;
}

export const DEFAULT_SEARCH_RESOURCE_LIMITS: SearchResourceLimits = {
  maxQueries: 20,
  maxResultsPerQuery: 20,
  maxConcurrentSearches: 3,
  maxProviderRequestsPerAudit: 25,
  maxCompetitorPages: 5,
  maxCompetitorRequests: 10,
  maxCompetitorBrowserRenders: 5,
  maxCompetitorResponseBytes: 15 * 1024 * 1024, // 15MB
  totalSearchTimeoutMs: 60000, // 1 minute
};

/**
 * Bounded Concurrency SERP Collector with Cost Safety Pre-checks and Cache Inspection.
 */
export class SerpCollector {
  private limits: SearchResourceLimits;
  private store: SerpSnapshotStore;
  private provider: SearchProvider;

  constructor(options: SerpCollectorOptions = {}) {
    this.limits = {
      ...DEFAULT_SEARCH_RESOURCE_LIMITS,
      ...(options.limits || {}),
    };
    this.store = options.store || getSerpStorage();
    this.provider = SearchProviderRegistry.getProvider(options.providerId);
  }

  /**
   * Collects normalized SERP snapshots for a list of target queries with bounded concurrency.
   */
  public async collectSerpSnapshots(
    queries: SearchQueryTarget[],
    options: SerpCollectorOptions = {}
  ): Promise<SerpCollectorResult> {
    const startTime = Date.now();
    const location = options.location || 'United States';
    const language = options.language || 'en';
    const device = options.device || 'DESKTOP';
    const limit = Math.min(options.limitPerQuery || this.limits.maxResultsPerQuery, 50);
    const forceRefresh = options.forceRefresh ?? false;

    // 1. Bound candidate queries before dispatching requests
    const boundedQueries = queries.slice(0, this.limits.maxQueries);

    const telemetry: ProviderUsageTelemetry = {
      providerId: this.provider.id,
      usedRequests: 0,
      maxRequests: this.limits.maxProviderRequestsPerAudit,
      cachedHits: 0,
      failedRequests: 0,
      estimatedCostCredits: 0,
      executionDurationMs: 0,
    };

    const snapshots: NormalizedSerpSnapshot[] = [];
    const errors: Array<{ query: string; error: string }> = [];

    // Helper to process a single query
    const processQuery = async (target: SearchQueryTarget) => {
      if (options.signal?.aborted) {
        throw new Error('Search collection aborted by client.');
      }

      const fingerprint = computeSerpSnapshotFingerprint({
        query: target.normalizedQuery,
        provider: this.provider.id,
        location,
        language,
        device,
      });

      // Check Cache / Storage unless forceRefresh
      if (!forceRefresh) {
        try {
          const cached = await this.store.getSnapshot(fingerprint);
          if (cached && cached.freshnessAgeMinutes < 1440) { // Valid within 24 hours
            telemetry.cachedHits++;
            snapshots.push({
              ...cached,
              source: target.source,
            });
            return;
          }
        } catch (err) {
          logger.warn(`Failed reading snapshot cache for ${fingerprint}:`, err);
        }
      }

      // Cost Safety: Verify budget before dispatching provider request
      if (telemetry.usedRequests >= this.limits.maxProviderRequestsPerAudit) {
        errors.push({
          query: target.query,
          error: `Provider request budget exhausted (max ${this.limits.maxProviderRequestsPerAudit} requests per audit).`,
        });
        return;
      }

      telemetry.usedRequests++;

      try {
        const rawResponse = await this.provider.search(target.query, {
          location,
          language,
          device,
          limit,
          timeoutMs: Math.min(this.limits.totalSearchTimeoutMs, 15000),
        });

        if (rawResponse.costCredits) {
          telemetry.estimatedCostCredits += rawResponse.costCredits;
        }

        const normalizedSnapshot = normalizeSerpResponse(rawResponse, {
          source: target.source,
          collectedAt: new Date().toISOString(),
        });

        // Persist to store
        await this.store.saveSnapshot(normalizedSnapshot);
        snapshots.push(normalizedSnapshot);
      } catch (err: any) {
        telemetry.failedRequests++;
        logger.error(`Error querying provider for "${target.query}":`, err);
        errors.push({
          query: target.query,
          error: err.message || String(err),
        });
      }
    };

    // 2. Concurrency Pool execution
    const concurrency = Math.min(this.limits.maxConcurrentSearches, 4);
    const queue = [...boundedQueries];

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        await processQuery(item);
      }
    });

    await Promise.all(workers);

    telemetry.executionDurationMs = Date.now() - startTime;

    return {
      snapshots,
      telemetry,
      errors,
    };
  }
}
