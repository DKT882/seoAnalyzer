import { CompetitorComparisonReport } from '@/types';

// In-memory cache for recent competitor comparisons across API routes
const globalCache = global as unknown as {
  competitorReportsCache?: Map<string, CompetitorComparisonReport>;
};

if (!globalCache.competitorReportsCache) {
  globalCache.competitorReportsCache = new Map<string, CompetitorComparisonReport>();
}

export const competitorReportsCache = globalCache.competitorReportsCache;
