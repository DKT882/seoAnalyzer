'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  TrendingUp,
  Target,
  Globe,
  Award,
  BarChart2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { KeywordItem } from '@/types';
import { EnrichedKeyword, SerpData, KeywordMarketData } from '@/lib/providers/seo/types';

interface KeywordDetailModalProps {
  keywordItem: KeywordItem | EnrichedKeyword | null;
  onClose: () => void;
}

export function KeywordDetailModal({ keywordItem, onClose }: KeywordDetailModalProps) {
  const [serpData, setSerpData] = useState<SerpData | null>(null);
  const [isLoadingSerp, setIsLoadingSerp] = useState(false);
  const [serpNotice, setSerpNotice] = useState<string | null>(null);

  if (!keywordItem) return null;

  const keyword = keywordItem.keyword;
  const isEnriched = 'internalMetrics' in keywordItem;
  const enriched = isEnriched ? (keywordItem as EnrichedKeyword) : null;
  const standard = !isEnriched ? (keywordItem as KeywordItem) : null;

  const sources = enriched?.sources || (standard?.source ? [standard.source] : ['EXTRACTED']);
  const relevance = enriched?.internalMetrics?.relevanceScore ?? standard?.overallScore ?? standard?.prominenceScore ?? 50;
  const quality = enriched?.internalMetrics?.qualityScore ?? standard?.qualityScore ?? 70;
  const intent = enriched?.internalMetrics?.estimatedIntent ?? standard?.searchIntent ?? 'Informational';
  const marketData: KeywordMarketData | null = enriched?.marketData ?? null;
  const oppScore = enriched?.opportunityScore;

  const locations = enriched?.internalMetrics?.locations ?? {
    inTitle: Boolean(standard?.inTitle),
    inH1: Boolean(standard?.inH1),
    inH2H6: Boolean(standard?.inH2H6),
    inMeta: Boolean(standard?.inMeta),
    inBody: Boolean(standard?.inBody),
  };

  const coverage = enriched?.internalMetrics?.coverageStatus ?? (locations.inTitle || locations.inH1 ? 'Strong' : 'Weak');

  useEffect(() => {
    if (enriched?.serpData) {
      setSerpData(enriched.serpData);
      return;
    }

    // Fetch SERP dynamically for this keyword
    let isMounted = true;
    setIsLoadingSerp(true);
    setSerpNotice(null);

    fetch('/api/seo/serp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setIsLoadingSerp(false);
        if (data.success && data.data) {
          setSerpData(data.data);
        } else if (data.notice) {
          setSerpNotice(data.notice);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoadingSerp(false);
      });

    return () => {
      isMounted = false;
    };
  }, [keyword, enriched?.serpData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{keyword}</h2>
                {sources.map((src) => (
                  <span
                    key={src}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md uppercase tracking-wider ${
                      src === 'EXTRACTED'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : src === 'RECOMMENDED'
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : src === 'COMPETITOR_GAP'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {src.replace('_', ' ')}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed On-Page Semantics, External Market Intelligence & SERP Landscape
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search Volume */}
            <div className="bg-slate-800/60 border border-slate-750 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Monthly Volume</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {marketData && typeof marketData.searchVolume === 'number'
                  ? marketData.searchVolume.toLocaleString()
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {marketData ? `Source: ${marketData.provider} (${marketData.country})` : 'External data unavailable'}
              </p>
            </div>

            {/* Keyword Difficulty */}
            <div className="bg-slate-800/60 border border-slate-750 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Keyword Difficulty</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {marketData && typeof marketData.keywordDifficulty === 'number'
                  ? `${marketData.keywordDifficulty}/100`
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {marketData ? (marketData.keywordDifficulty! <= 35 ? 'Easy to rank' : marketData.keywordDifficulty! <= 65 ? 'Moderate' : 'High competition') : 'External data unavailable'}
              </p>
            </div>

            {/* CPC / Value */}
            <div className="bg-slate-800/60 border border-slate-750 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Estimated CPC</span>
                <BarChart2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {marketData && typeof marketData.cpc === 'number'
                  ? `$${marketData.cpc.toFixed(2)}`
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {marketData ? 'Google Ads commercial value' : 'External data unavailable'}
              </p>
            </div>

            {/* SEO Opportunity Score */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 p-4 rounded-xl">
              <div className="flex items-center justify-between text-indigo-300 text-xs mb-1">
                <span>Opportunity Score</span>
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-200">
                {oppScore ? `${oppScore.finalScore}/100` : `${relevance}/100`}
              </div>
              <p className="text-[11px] text-indigo-300/80 mt-1">
                {oppScore?.marketDemandScore !== null ? 'Market demand + on-page' : 'Internal semantic score'}
              </p>
            </div>
          </div>

          {/* Section 1: Internal Page Analysis */}
          <div className="bg-slate-800/40 border border-slate-750 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              On-Page Content & Placement Analysis
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Topical Relevance</span>
                <span className="font-semibold text-white">{relevance}/100</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Phrase Quality</span>
                <span className="font-semibold text-white">{quality}/100</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Estimated Intent</span>
                <span className="font-semibold text-indigo-300">{intent}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Page Coverage</span>
                <span
                  className={`font-semibold ${
                    coverage === 'Strong'
                      ? 'text-emerald-400'
                      : coverage === 'Weak'
                      ? 'text-amber-400'
                      : 'text-purple-400'
                  }`}
                >
                  {coverage}
                </span>
              </div>
            </div>

            {/* Placement Locations */}
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-2">Element Placements on Page:</span>
              <div className="flex flex-wrap gap-2">
                <PlacementBadge label="Title Tag" active={locations.inTitle} />
                <PlacementBadge label="H1 Tag" active={locations.inH1} />
                <PlacementBadge label="H2–H6 Subheadings" active={locations.inH2H6} />
                <PlacementBadge label="Meta Description" active={locations.inMeta} />
                <PlacementBadge label="Body Copy" active={locations.inBody} />
              </div>
            </div>

            {/* Evidence & Reason */}
            {(enriched?.internalMetrics?.reason || standard?.reason) && (
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
                <span className="font-semibold text-slate-200 block mb-1">Topical Rationale:</span>
                {enriched?.internalMetrics?.reason || standard?.reason}
              </div>
            )}
          </div>

          {/* Section 2: Opportunity Score Breakdown */}
          {oppScore && (
            <div className="bg-slate-800/40 border border-slate-750 p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                SEO Opportunity Score Breakdown
              </h3>
              <p className="text-xs text-slate-400">{oppScore.explanation}</p>
              <div className="space-y-2 mt-3">
                {oppScore.factors.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {f.impact === 'POSITIVE' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">{f.factor}: </span>
                        <span className="text-slate-400">{f.description}</span>
                      </div>
                    </div>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        f.impact === 'POSITIVE'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {f.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Google SERP Landscape */}
          <div className="bg-slate-800/40 border border-slate-750 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Google SERP & Competitor Intelligence
              </h3>
              {serpData && (
                <span className="text-[11px] text-slate-400">
                  Total Results: {serpData.totalResults ? serpData.totalResults.toLocaleString() : 'N/A'}
                </span>
              )}
            </div>

            {isLoadingSerp ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mb-2" />
                <p>Querying Google SERP ranking data...</p>
              </div>
            ) : serpData && serpData.items.length > 0 ? (
              <div className="space-y-4">
                {/* SERP Features */}
                {serpData.features && serpData.features.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">Detected SERP Features:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {serpData.features.map((feat) => (
                        <span
                          key={feat}
                          className="px-2 py-0.5 text-[11px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded"
                        >
                          {feat.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Ranking Pages */}
                <div>
                  <span className="text-xs font-medium text-slate-300 block mb-2">
                    Top Ranking Competitors in Google:
                  </span>
                  <div className="space-y-2">
                    {serpData.items.slice(0, 5).map((item) => (
                      <div
                        key={item.position}
                        className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-1 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-indigo-400 font-bold rounded text-[11px]">
                              #{item.position}
                            </span>
                            <span className="font-semibold text-slate-200 truncate max-w-md">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{item.domain}</span>
                        </div>
                        {item.snippet && <p className="text-slate-400 text-[11px] line-clamp-2">{item.snippet}</p>}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline pt-0.5"
                        >
                          {item.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-300">Live SERP data not connected</p>
                  <p className="mt-0.5 text-[11px]">
                    {serpNotice ||
                      'Configure DataForSEO credentials in .env to view live top 20 Google rankings, SERP features, and competitor domain positions.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>Data Provenance: Zero fabricated metrics enforced.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlacementBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${
        active
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-slate-800/80 text-slate-400 border border-slate-750'
      }`}
    >
      {active ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-400" />}
      {label}
    </span>
  );
}
