'use client';

import React, { useState } from 'react';
import {
  SearchIntelligenceAuditReport,
  NormalizedSerpSnapshot,
  SerpResultItem,
  SearchOpportunity,
  ObservedSerpDomain,
  SerpTopicPattern,
  QuerySource,
} from '@/lib/search/searchTypes';

interface SearchIntelligenceDashboardProps {
  report: SearchIntelligenceAuditReport;
  onRefreshQuery?: (query: string) => void;
  onDrilldownUrl?: (url: string) => void;
}

export const SearchIntelligenceDashboard: React.FC<SearchIntelligenceDashboardProps> = ({
  report,
  onRefreshQuery,
  onDrilldownUrl,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'queries'
    | 'serp_explorer'
    | 'domains'
    | 'patterns'
    | 'opportunities'
    | 'gaps'
    | 'history'
  >('overview');

  const [selectedQuery, setSelectedQuery] = useState<string>(
    report.queries[0]?.query || report.snapshots[0]?.query || ''
  );
  const [searchTerm, setSearchTerm] = useState('');

  const currentSnapshot = report.snapshots.find(
    (s) => s.query.toLowerCase() === selectedQuery.toLowerCase()
  ) || report.snapshots[0];

  const currentTopics = report.topicPatterns[selectedQuery] || [];
  const currentIntentAlign = report.intentAlignments[selectedQuery];
  const currentPageTypeAlign = report.pageTypeAlignments[selectedQuery];

  const getSourceBadge = (source: QuerySource) => {
    switch (source) {
      case 'USER_TARGET':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Target Keyword</span>;
      case 'EXTRACTED_PAGE_TOPIC':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Extracted Page Topic</span>;
      case 'SITE_TOPIC_CLUSTER':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Site Topic Cluster</span>;
      case 'RECOMMENDED_QUERY':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Recommended Query</span>;
    }
  };

  const getResultTypeBadge = (type: string) => {
    switch (type) {
      case 'FEATURED_SNIPPET':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-500">Featured Snippet</span>;
      case 'LOCAL_PACK':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-500">Local Pack</span>;
      case 'PEOPLE_ALSO_ASK':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-500/20 text-indigo-400">People Also Ask</span>;
      case 'VIDEO':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-500/20 text-red-400">Video</span>;
      case 'SHOPPING':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400">Shopping</span>;
      case 'ORGANIC':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-500/20 text-slate-300">Organic</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-500/10 text-slate-400">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Provenance Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-tight">
                External Search Intelligence & SERP Analysis
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                Phase 8 Live
              </span>
              {report.telemetry.providerId === 'mock_search' ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                  DEMO/TEST DATA
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                  Live Provider: {report.telemetry.providerId}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Evidence-based SERP observations, intent alignment, competitor domains, and content gaps across {report.queries.length} queries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Provider Telemetry</div>
              <div className="text-sm font-semibold text-slate-200">
                {report.telemetry.usedRequests} requests ({report.telemetry.cachedHits} cached)
              </div>
            </div>
          </div>
        </div>

        {/* Anti-fabrication disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
          <span className="text-cyan-400">ℹ</span>
          <span>{report.disclaimers.rankingDisclaimer}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Search Overview' },
          { id: 'queries', label: `Query Explorer (${report.queries.length})` },
          { id: 'serp_explorer', label: 'SERP Explorer' },
          { id: 'domains', label: `Observed Domains (${report.observedDomains.length})` },
          { id: 'patterns', label: 'SERP Patterns' },
          { id: 'opportunities', label: `Opportunities (${report.opportunities.length})` },
          { id: 'gaps', label: 'Content Gaps' },
          { id: 'history', label: 'Search History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Queries Analyzed</div>
              <div className="text-2xl font-bold text-white mt-1">{report.queries.length}</div>
              <div className="text-xs text-slate-500 mt-1">{report.snapshots.length} SERP snapshots</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observed Domains</div>
              <div className="text-2xl font-bold text-white mt-1">{report.observedDomains.length}</div>
              <div className="text-xs text-slate-500 mt-1">Unique ranking domains</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Content Gaps</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {Object.values(report.topicPatterns).flat().filter((t) => t.category === 'POTENTIAL_CONTENT_GAP').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">SERP topics not on page</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search Opportunities</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{report.opportunities.length}</div>
              <div className="text-xs text-slate-500 mt-1">Evidence-backed suggestions</div>
            </div>
          </div>

          {/* Quick Query Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-200">Active Query Inspection:</div>
            <select
              value={selectedQuery}
              onChange={(e) => setSelectedQuery(e.target.value)}
              className="bg-slate-800 text-slate-100 text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 w-full sm:w-80"
            >
              {report.queries.map((q) => (
                <option key={q.query} value={q.query}>
                  {q.query} ({q.source})
                </option>
              ))}
            </select>
          </div>

          {/* Intent & Page Type Summary Cards */}
          {currentSnapshot && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Intent Alignment */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white">Search Intent Alignment</div>
                  {currentIntentAlign && (
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        currentIntentAlign.level === 'STRONG_ALIGNMENT'
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                          : currentIntentAlign.level === 'MODERATE_ALIGNMENT'
                          ? 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                          : 'bg-amber-900/40 text-amber-300 border border-amber-700/40'
                      }`}
                    >
                      {currentIntentAlign.level.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">{currentIntentAlign?.explanation}</p>

                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Observed Intent Breakdown:</div>
                  {currentIntentAlign &&
                    Object.entries(currentIntentAlign.intentDistribution)
                      .filter(([_, count]) => count > 0)
                      .map(([intent, count]) => (
                        <div key={intent} className="flex items-center justify-between text-xs text-slate-300">
                          <span>{intent}</span>
                          <span className="font-semibold text-slate-100">{count} pages</span>
                        </div>
                      ))}
                </div>
              </div>

              {/* Page Type Alignment */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white">Page-Type Archetype Pattern</div>
                  {currentPageTypeAlign && (
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        currentPageTypeAlign.alignmentStatus === 'ALIGNED'
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                          : 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/40'
                      }`}
                    >
                      {currentPageTypeAlign.alignmentStatus.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">{currentPageTypeAlign?.explanation}</p>

                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Dominant Archetypes in SERP:</div>
                  {currentPageTypeAlign &&
                    Object.entries(currentPageTypeAlign.observedDistribution).map(([pt, count]) => (
                      <div key={pt} className="flex items-center justify-between text-xs text-slate-300">
                        <span>{pt}</span>
                        <span className="font-semibold text-slate-100">{count} results</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Query Explorer */}
      {activeTab === 'queries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Query Taxonomy & Target List</div>
            <input
              type="text"
              placeholder="Filter queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Query</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Intent Pattern</th>
                  <th className="p-3">Page Type Pattern</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.queries
                  .filter((q) => q.query.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((q) => {
                    const snap = report.snapshots.find((s) => s.query.toLowerCase() === q.query.toLowerCase());
                    const intentAlign = report.intentAlignments[q.query];
                    const pageTypeAlign = report.pageTypeAlignments[q.query];

                    return (
                      <tr key={q.query} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">{q.query}</td>
                        <td className="p-3">{getSourceBadge(q.source)}</td>
                        <td className="p-3">
                          <span className="text-xs text-slate-200">
                            {intentAlign?.observedSerpIntentPattern || 'INFORMATIONAL'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs text-slate-200">
                            {pageTypeAlign?.dominantType || 'ARTICLE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedQuery(q.query);
                              setActiveTab('serp_explorer');
                            }}
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
                          >
                            View SERP
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: SERP Explorer */}
      {activeTab === 'serp_explorer' && currentSnapshot && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-white">
                SERP Results for: <span className="text-cyan-400">"{currentSnapshot.query}"</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {currentSnapshot.results.length} total results ({currentSnapshot.organicCount} organic) · Provider:{' '}
                {currentSnapshot.provider} · {currentSnapshot.location} · {currentSnapshot.device}
              </div>
            </div>

            <select
              value={selectedQuery}
              onChange={(e) => setSelectedQuery(e.target.value)}
              className="bg-slate-800 text-slate-100 text-xs rounded px-3 py-1.5 border border-slate-700"
            >
              {report.queries.map((q) => (
                <option key={q.query} value={q.query}>
                  {q.query}
                </option>
              ))}
            </select>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            {currentSnapshot.results.map((res) => (
              <div
                key={res.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                      #{res.serpPosition}
                    </span>
                    {res.organicPosition !== undefined && (
                      <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-cyan-900/30 text-cyan-300">
                        Org #{res.organicPosition}
                      </span>
                    )}
                    {getResultTypeBadge(res.resultType)}
                    <span className="text-xs text-slate-400 truncate max-w-xs">{res.domain}</span>
                  </div>

                  {res.detectedPageType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {res.detectedPageType}
                    </span>
                  )}
                </div>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-cyan-400 hover:underline block mt-2"
                >
                  {res.title}
                </a>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{res.snippet}</p>

                {res.sitelinks && res.sitelinks.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                    {res.sitelinks.map((link, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                        ↳ {link}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Observed Domains */}
      {activeTab === 'domains' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800">
            <div className="text-base font-bold text-white">Observed SERP Domains</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Domains repeatedly appearing across sampled queries without automated business competitor claims.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Domain</th>
                  <th className="p-3">Appearances</th>
                  <th className="p-3">Avg SERP Pos</th>
                  <th className="p-3">Best Pos</th>
                  <th className="p-3">Dominant Archetype</th>
                  <th className="p-3">Queries Observed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.observedDomains.map((dom) => (
                  <tr key={dom.domain} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-cyan-400">{dom.domain}</td>
                    <td className="p-3 font-bold text-white">{dom.frequency}</td>
                    <td className="p-3 text-slate-200">#{dom.averageSerpPosition}</td>
                    <td className="p-3 text-emerald-400 font-semibold">#{dom.bestPosition}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {dom.dominantPageType || 'ARTICLE'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">{dom.observedQueries.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Opportunities (6-Pillar Standard) */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-base font-bold text-white">Search Opportunities & Content Recommendations</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict 6-pillar standard recommendations backed by observable SERP data.
            </p>
          </div>

          <div className="space-y-4">
            {report.opportunities.map((opp) => (
              <div key={opp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-cyan-300">{opp.recommendation.action}</div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      opp.confidence === 'HIGH'
                        ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                        : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                    }`}
                  >
                    Evidence: {opp.confidence}
                  </span>
                </div>

                {/* 6 Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">1. Observation:</span>
                    <p className="text-slate-200">{opp.recommendation.observation}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">2. Evidence:</span>
                    <p className="text-slate-200">{opp.recommendation.evidence}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">3. Interpretation:</span>
                    <p className="text-slate-200">{opp.recommendation.interpretation}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">4. Action:</span>
                    <p className="text-cyan-300 font-semibold">{opp.recommendation.action}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-emerald-400">5. Expected Benefit:</span>
                    <p className="text-emerald-200">{opp.recommendation.expectedBenefit}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-amber-400">6. Caution:</span>
                    <p className="text-amber-200">{opp.recommendation.caution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Content Gaps */}
      {activeTab === 'gaps' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800">
            <div className="text-base font-bold text-white">Topical Content Gaps</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sub-topics frequently covered across sampled SERP pages that were not prominently detected on the target page.
            </p>
          </div>

          <div className="p-4 space-y-3">
            {currentTopics.length === 0 ? (
              <div className="text-sm text-slate-400">No content gaps detected for this query.</div>
            ) : (
              currentTopics.map((topic) => (
                <div key={topic.topic} className="bg-slate-800/40 rounded-lg p-3 border border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{topic.topic}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          topic.category === 'POTENTIAL_CONTENT_GAP'
                            ? 'bg-amber-900/40 text-amber-300'
                            : 'bg-blue-900/40 text-blue-300'
                        }`}
                      >
                        {topic.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {topic.sampleSnippets && topic.sampleSnippets[0] && (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        Snippet: "{topic.sampleSnippets[0]}"
                      </p>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm font-bold text-cyan-400">{topic.percentage}%</div>
                    <div className="text-xs text-slate-500">{topic.frequency} mentions</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 8: Search History */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800">
            <div className="text-base font-bold text-white">Historical SERP Snapshots</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cached search engine snapshots stored in SQLite. No historical data is fabricated.
            </p>
          </div>

          <div className="p-4 space-y-3">
            {report.snapshots.map((snap) => (
              <div key={snap.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{snap.query}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Provider: {snap.provider} · Location: {snap.location} · Device: {snap.device} · Collected:{' '}
                    {new Date(snap.collectedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-semibold">{snap.organicCount} Organic Results</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
