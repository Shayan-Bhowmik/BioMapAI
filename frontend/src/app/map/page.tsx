"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const ObservationMap = dynamic(() => import("@/components/ObservationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-10rem)] flex items-center justify-center text-gray-400">
      Loading map…
    </div>
  ),
});

interface Observer {
  id: number;
  username: string;
}

interface Observation {
  id: number;
  image_url: string;
  species_common: string | null;
  species_scientific: string | null;
  lat: number;
  lng: number;
  observed_at: string;
  confidence_score: number | null;
  verification_status: string;
  observer: Observer;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MapPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [species, setSpecies] = useState("");
  const [observer, setObserver] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchObservations = useCallback(() => {
    setLoading(true);
    
    const params = new URLSearchParams();
    if (species.trim()) params.append("species", species.trim());
    if (observer.trim()) params.append("observer", observer.trim());
    if (startDate) params.append("start_date", new Date(startDate).toISOString());
    // For end date, we push to the end of the selected day
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.append("end_date", end.toISOString());
    }

    fetch(`${API_BASE}/observations?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch observations");
        return res.json();
      })
      .then((data) => setObservations(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [species, observer, startDate, endDate]);

  // Fetch on mount and when filters change (via the form submit)
  useEffect(() => {
    fetchObservations();
  }, []); // Only on mount, we use a manual apply button for filters

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchObservations();
  };

  const handleClearFilters = () => {
    setSpecies("");
    setObserver("");
    setStartDate("");
    setEndDate("");
    // The state updates are async, so we can't just call fetchObservations() immediately.
    // Easiest is to manually clear the URL and fetch.
    setLoading(true);
    fetch(`${API_BASE}/observations`)
      .then((res) => res.json())
      .then(setObservations)
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🗺️</span> Biodiversity Map
        </h1>
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-900 shadow-inner">
          {observations.length} Record{observations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 shadow-md">
        <form onSubmit={handleApplyFilters} className="flex flex-wrap items-end gap-4 text-sm">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-400 mb-1">Species Name</label>
            <input
              type="text"
              placeholder="e.g. Neem"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-gray-400 mb-1">Observer</label>
            <input
              type="text"
              placeholder="Username"
              value={observer}
              onChange={(e) => setObserver(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded font-medium transition-colors border border-emerald-500"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded transition-colors border border-gray-700"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <div className="py-12 text-center text-rose-400 bg-gray-900 rounded-xl border border-rose-900">
          Error loading map data: {error}
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
              <span className="bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 shadow-lg text-emerald-400 font-medium flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                Updating map...
              </span>
            </div>
          )}
          <ObservationMap observations={observations} />
        </div>
      )}
    </div>
  );
}
