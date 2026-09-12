import {
  InternalLinkGraph,
  InternalLinkNode,
  InternalLinkEdge,
  SEOReport,
  CrawlPageRecord,
} from '@/types';

export function buildInternalLinkGraph(
  pages: SEOReport[],
  pageRecordsMap: Map<string, CrawlPageRecord> = new Map()
): InternalLinkGraph {
  const nodeMap = new Map<string, InternalLinkNode>();
  const edges: InternalLinkEdge[] = [];
  const inlinkCounts = new Map<string, number>();
  const outlinkCounts = new Map<string, number>();
  const inlinkAnchors = new Map<string, Set<string>>();

  const reportMap = new Map<string, SEOReport>();
  for (const page of pages) {
    reportMap.set(page.normalizedUrl || page.url, page);
  }

  // 1. Initialize Nodes
  for (const page of pages) {
    const normUrl = page.normalizedUrl || page.url;
    const record = pageRecordsMap.get(normUrl);

    inlinkCounts.set(normUrl, 0);
    outlinkCounts.set(normUrl, 0);
    inlinkAnchors.set(normUrl, new Set());

    const node: InternalLinkNode = {
      url: page.url,
      normalizedUrl: normUrl,
      pageType: page.contentIntelligence?.pageType.detectedType || 'ARTICLE',
      isIndexable: page.technical.isIndexable,
      primaryTopic: page.contentIntelligence?.primaryTopics[0]?.topic,
      internalInlinkCount: 0,
      internalOutlinkCount: 0,
      internalLinkCentrality: 0,
      structuralImportanceScore: 0,
      depth: record?.depth ?? 0,
      discoveryMethod: record?.discoveryMethod ?? 'START_URL',
    };

    nodeMap.set(normUrl, node);
  }

  // 2. Build Edges & Calculate Raw Degrees
  let brokenInternalLinksCount = 0;
  let redirectingInternalLinksCount = 0;
  let noindexInternalLinksCount = 0;

  for (const page of pages) {
    const sourceNorm = page.normalizedUrl || page.url;
    const internalLinks = page.links.internalLinks || [];

    let uniqueOutlinksForPage = 0;
    const seenTargetsFromThisPage = new Set<string>();

    for (const link of internalLinks) {
      const targetNorm = link.url;
      if (!targetNorm) continue;

      const targetReport = reportMap.get(targetNorm);
      let targetStatus: InternalLinkEdge['targetStatus'] = 'HEALTHY';
      let statusCode = 200;

      if (targetReport) {
        statusCode = targetReport.technical.httpStatus;
        if (statusCode >= 400 && statusCode < 500) {
          targetStatus = 'BROKEN_4XX';
          brokenInternalLinksCount++;
        } else if (statusCode >= 500) {
          targetStatus = 'BROKEN_5XX';
          brokenInternalLinksCount++;
        } else if (targetReport.technical.redirectCount > 0) {
          targetStatus = 'REDIRECT';
          redirectingInternalLinksCount++;
        } else if (!targetReport.technical.isIndexable) {
          targetStatus = 'NOINDEX';
          noindexInternalLinksCount++;
        } else if (
          targetReport.onPage.canonicalUrl &&
          !targetReport.onPage.isCanonicalMatch
        ) {
          targetStatus = 'CANONICALIZED';
        }
      }

      edges.push({
        sourceUrl: page.url,
        targetUrl: link.url,
        anchorText: link.text || '',
        isNofollow: link.isNofollow,
        isInternal: true,
        statusCode,
        targetStatus,
      });

      if (!seenTargetsFromThisPage.has(targetNorm)) {
        seenTargetsFromThisPage.add(targetNorm);
        uniqueOutlinksForPage++;

        if (inlinkCounts.has(targetNorm)) {
          inlinkCounts.set(targetNorm, (inlinkCounts.get(targetNorm) || 0) + 1);
          if (link.text) {
            inlinkAnchors.get(targetNorm)?.add(link.text.trim());
          }
        }
      }
    }

    outlinkCounts.set(sourceNorm, uniqueOutlinksForPage);
  }

  // 3. Compute Internal Link Centrality (Iterative Power Iteration)
  const N = Math.max(1, pages.length);
  const initialScore = 1.0 / N;
  let centrality = new Map<string, number>();

  for (const page of pages) {
    centrality.set(page.normalizedUrl || page.url, initialScore);
  }

  const damping = 0.85;
  const iterations = 15;

  for (let it = 0; it < iterations; it++) {
    const nextCentrality = new Map<string, number>();
    let sinkSum = 0;

    for (const page of pages) {
      const u = page.normalizedUrl || page.url;
      const outDeg = outlinkCounts.get(u) || 0;
      if (outDeg === 0) {
        sinkSum += centrality.get(u) || 0;
      }
    }

    for (const page of pages) {
      const target = page.normalizedUrl || page.url;
      let incomingSum = 0;

      // Find all sources pointing to target
      for (const edge of edges) {
        const srcNorm = reportMap.get(edge.sourceUrl)?.normalizedUrl || edge.sourceUrl;
        const tgtNorm = edge.targetUrl;
        if (tgtNorm === target && srcNorm !== target) {
          const srcOut = outlinkCounts.get(srcNorm) || 1;
          incomingSum += (centrality.get(srcNorm) || 0) / srcOut;
        }
      }

      const score = (1 - damping) / N + damping * (incomingSum + sinkSum / N);
      nextCentrality.set(target, score);
    }

    centrality = nextCentrality;
  }

  // Normalize Centrality & Structural Importance to 0-100 scale
  let maxCent = 0;
  for (const v of centrality.values()) {
    if (v > maxCent) maxCent = v;
  }
  if (maxCent === 0) maxCent = 1;

  for (const page of pages) {
    const norm = page.normalizedUrl || page.url;
    const node = nodeMap.get(norm);
    if (node) {
      const inCount = inlinkCounts.get(norm) || 0;
      const outCount = outlinkCounts.get(norm) || 0;
      const rawCent = centrality.get(norm) || 0;
      const normalizedCentrality = Math.min(100, Math.round((rawCent / maxCent) * 100));

      // Structural Importance: combination of centrality, depth, and inlinks
      const depthPenalty = Math.max(0, node.depth * 8);
      const structuralScore = Math.max(
        5,
        Math.min(100, Math.round(normalizedCentrality * 0.7 + Math.min(inCount * 10, 30) - depthPenalty))
      );

      node.internalInlinkCount = inCount;
      node.internalOutlinkCount = outCount;
      node.internalLinkCentrality = normalizedCentrality;
      node.structuralImportanceScore = structuralScore;

      // Update CrawlPageRecord if present
      const rec = pageRecordsMap.get(norm);
      if (rec) {
        rec.internalInlinksCount = inCount;
        rec.internalOutlinksCount = outCount;
        rec.inlinkAnchors = Array.from(inlinkAnchors.get(norm) || []);
      }
    }
  }

  const totalInlinks = Array.from(inlinkCounts.values()).reduce((a, b) => a + b, 0);
  const avgInlinks = pages.length > 0 ? Number((totalInlinks / pages.length).toFixed(1)) : 0;

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    totalEdges: edges.length,
    averageInlinksPerPage: avgInlinks,
    brokenInternalLinksCount,
    redirectingInternalLinksCount,
    noindexInternalLinksCount,
  };
}
