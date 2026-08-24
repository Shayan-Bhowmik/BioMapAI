"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import TrendChart, { SeasonalTrend } from "@/components/TrendChart";
import { HotspotDensity } from "@/components/HotspotMap";

// Dynamically import HotspotMap to prevent SSR issues with Leaflet
const HotspotMap = dynamic(() => import("@/components/HotspotMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] md:h-[480px] w-full bg-gray-950/60 rounded-xl border border-gray-800 flex flex-col items-center justify-center text-gray-400 gap-3">
      <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-sm">Loading geographic hotspot map…</p>
    </div>
  ),
});

interface AnalyticsSummary {
  total_observations: number;
  species_richness: number;
}

interface SpeciesCount {
  species_common: string | null;
  species_scientific: string;
  count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<SeasonalTrend[]>([]);
  const [hotspots, setHotspots] = useState<HotspotDensity[]>([]);
  const [topSpecies, setTopSpecies] = useState<SpeciesCount[]>([]);
  const [rareSpecies, setRareSpecies] = useState<SpeciesCount[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, trendsRes, densityRes, topSpeciesRes, rareSpeciesRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/summary`),
        fetch(`${API_BASE}/analytics/seasonal-trends`),
        fetch(`${API_BASE}/analytics/density`),
        fetch(`${API_BASE}/analytics/top-species?limit=5`),
        fetch(`${API_BASE}/analytics/rare-species?threshold=3&limit=10`),
      ]);

      if (!summaryRes.ok) throw new Error("Failed to fetch analytics summary");
      if (!trendsRes.ok) throw new Error("Failed to fetch seasonal trends");
      if (!densityRes.ok) throw new Error("Failed to fetch density hotspots");
      if (!topSpeciesRes.ok) throw new Error("Failed to fetch top species");
      if (!rareSpeciesRes.ok) throw new Error("Failed to fetch rare species");

      const [summaryData, trendsData, densityData, topSpeciesData, rareSpeciesData] =
        await Promise.all([
          summaryRes.json(),
          trendsRes.json(),
          densityRes.json(),
          topSpeciesRes.json(),
          rareSpeciesRes.json(),
        ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setHotspots(densityData);
      setTopSpecies(topSpeciesData);
      setRareSpecies(rareSpeciesData);
    } catch (err: unknown) {
      console.error("Error loading analytics data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function loadInitialData() {
      try {
        const [summaryRes, trendsRes, densityRes, topSpeciesRes, rareSpeciesRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/summary`),
          fetch(`${API_BASE}/analytics/seasonal-trends`),
          fetch(`${API_BASE}/analytics/density`),
          fetch(`${API_BASE}/analytics/top-species?limit=5`),
          fetch(`${API_BASE}/analytics/rare-species?threshold=3&limit=10`),
        ]);

        if (!summaryRes.ok) throw new Error("Failed to fetch analytics summary");
        if (!trendsRes.ok) throw new Error("Failed to fetch seasonal trends");
        if (!densityRes.ok) throw new Error("Failed to fetch density hotspots");
        if (!topSpeciesRes.ok) throw new Error("Failed to fetch top species");
        if (!rareSpeciesRes.ok) throw new Error("Failed to fetch rare species");

        const [summaryData, trendsData, densityData, topSpeciesData, rareSpeciesData] =
          await Promise.all([
            summaryRes.json(),
            trendsRes.json(),
            densityRes.json(),
            topSpeciesRes.json(),
            rareSpeciesRes.json(),
          ]);

        if (isSubscribed) {
          setSummary(summaryData);
          setTrends(trendsData);
          setHotspots(densityData);
          setTopSpecies(topSpeciesData);
          setRareSpecies(rareSpeciesData);
          setError(null);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading analytics."
          );
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Derive peak observation month
  const peakMonth =
    trends.length > 0
      ? [...trends].sort((a, b) => b.count - a.count)[0]
      : null;

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5 text-gray-100">
              <span>📊</span> Biodiversity Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time ecological intelligence, species richness metrics, and spatial hotspots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <span>➕</span> Add Observation
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">Unable to load analytics data</p>
                <p className="text-xs text-rose-300 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="bg-rose-900 hover:bg-rose-800 text-rose-100 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Species Richness Card */}
          <div className="bg-gray-900/90 border border-emerald-900/60 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Species Richness
              </span>
              <span className="text-lg">🌿</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? (
                <div className="w-16 h-8 bg-gray-800 rounded animate-pulse"></div>
              ) : (
                summary?.species_richness ?? 0
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Distinct identified species catalogued
            </p>
          </div>

          {/* Total Observations Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Total Observations
              </span>
              <span className="text-lg">📸</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? (
                <div className="w-16 h-8 bg-gray-800 rounded animate-pulse"></div>
              ) : (
                summary?.total_observations ?? 0
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Verified & pending field records
            </p>
          </div>

          {/* Active Hotspot Zones */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Hotspot Clusters
              </span>
              <span className="text-lg">📍</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? (
                <div className="w-16 h-8 bg-gray-800 rounded animate-pulse"></div>
              ) : (
                hotspots.length
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Spatial density grids (~11km)
            </p>
          </div>

          {/* Seasonal Peak Period */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Peak Activity
              </span>
              <span className="text-lg">📅</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight truncate">
              {loading ? (
                <div className="w-20 h-8 bg-gray-800 rounded animate-pulse"></div>
              ) : peakMonth ? (
                `${peakMonth.month} (${peakMonth.count})`
              ) : (
                "N/A"
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Month with highest observations
            </p>
          </div>
        </div>

        {/* Biodiversity Trends Over Time Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <span>📈</span> Biodiversity Trends Over Time
            </h2>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-900 px-2.5 py-0.5 rounded-full font-medium">
              Seasonal Distribution
            </span>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="h-64 bg-gray-950/60 rounded-xl border border-gray-800 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <TrendChart trends={trends} />
            )}
          </div>
        </div>

        {/* Species Distribution: Top Observed Species & Rare / Uncommon Species */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Observed Species */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>🏆</span> Top Observed Species
              </h2>
              <span className="text-xs text-gray-400">Most frequent</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-950/60 border border-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : topSpecies.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="text-3xl block mb-2">🌱</span>
                  <p className="text-sm font-medium text-gray-300">No species data recorded yet</p>
                  <p className="text-xs text-gray-500 mt-1">Upload records to populate the ranking.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topSpecies.map((sp, idx) => {
                    const totalObs = summary?.total_observations || 1;
                    const percent = Math.round((sp.count / totalObs) * 100);

                    return (
                      <div
                        key={`top-species-${sp.species_scientific}-${idx}`}
                        className="p-3 bg-gray-950/60 border border-gray-800/80 rounded-lg hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-500 font-mono w-4">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <p className="text-sm font-semibold text-gray-200 truncate">
                                {sp.species_common || "Unidentified Common Name"}
                              </p>
                              <p className="text-xs text-gray-400 italic truncate">
                                {sp.species_scientific}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded whitespace-nowrap">
                            {sp.count} observation{sp.count !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.max(8, percent)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Rare / Uncommon Species Widget (Ticket 17) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>✨</span> Rare & Uncommon Species
              </h2>
              <span className="text-xs bg-amber-950 text-amber-400 border border-amber-900 px-2.5 py-0.5 rounded-full font-medium">
                Threshold: ≤ 3 sightings
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-950/60 border border-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : rareSpecies.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="text-3xl block mb-2">🔍</span>
                  <p className="text-sm font-medium text-gray-300">
                    No rare or uncommon species detected yet.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Species with 3 or fewer total records will appear here as biodiversity data is gathered.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rareSpecies.map((sp, idx) => (
                    <div
                      key={`rare-species-${sp.species_scientific}-${idx}`}
                      className="p-3 bg-gray-950/60 border border-amber-900/40 rounded-lg hover:border-amber-700/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm">🌿</span>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-gray-200 truncate">
                              {sp.species_common || "Unidentified Common Name"}
                            </p>
                            <p className="text-xs text-amber-200/70 italic truncate">
                              {sp.species_scientific}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded whitespace-nowrap">
                            {sp.count} sighting{sp.count !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                            Rare occurrence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hotspots & Density Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>📍</span> Hotspot Analysis & Spatial Density
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Geographic clustering of observation records mapped across ~11km grid sectors.
              </p>
            </div>
            <div className="text-xs text-gray-400">
              <span className="text-emerald-400 font-semibold">{hotspots.length}</span> Active Zone{hotspots.length !== 1 ? "s" : ""}
            </div>
          </div>

          <HotspotMap hotspots={hotspots} />
        </div>
      </div>
    </ProtectedRoute>
  );
}