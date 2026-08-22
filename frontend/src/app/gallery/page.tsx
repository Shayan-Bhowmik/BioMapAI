"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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

export default function GalleryPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date_desc");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/observations?sort_by=${sortBy}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch observations");
        return res.json();
      })
      .then((data) => setObservations(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sortBy]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🖼️</span> Observation Gallery
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse all submitted biodiversity records.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 p-2 rounded-lg shadow-sm">
          <label htmlFor="sort" className="text-xs font-medium text-gray-400 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-950 border border-gray-700 text-gray-200 text-sm rounded focus:ring-emerald-500 focus:border-emerald-500 block w-full py-1.5 px-2"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="species_asc">Species (A-Z)</option>
            <option value="species_desc">Species (Z-A)</option>
          </select>
        </div>
      </div>

      {/* States */}
      {error && (
        <div className="p-4 bg-rose-950 border border-rose-800 text-rose-300 rounded-lg text-center">
          Failed to load gallery: {error}
        </div>
      )}

      {loading && observations.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && observations.length === 0 && !error && (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
          <span className="text-4xl mb-3 block">🌿</span>
          <h3 className="text-lg font-medium text-gray-200">No observations yet</h3>
          <p className="text-gray-400 mt-1 mb-4">Be the first to record a species!</p>
          <Link
            href="/upload"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Upload Observation
          </Link>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative">
        {loading && observations.length > 0 && (
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[1px] z-10 flex justify-center items-start pt-20 rounded-xl">
            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        )}

        {observations.map((obs) => (
          <div
            key={obs.id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-colors shadow-md flex flex-col h-full"
          >
            {/* Image */}
            <div className="h-48 w-full bg-gray-950 border-b border-gray-800 flex items-center justify-center relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={obs.image_url}
                alt={obs.species_common || "Observation"}
                className="object-cover w-full h-full"
              />
              
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-gray-900/90 text-[10px] uppercase font-bold px-2 py-1 rounded border border-gray-700 text-gray-300 backdrop-blur-sm shadow-sm">
                  {obs.verification_status}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <h3 className="font-bold text-gray-100 line-clamp-1">
                    {obs.species_common || "Unidentified"}
                  </h3>
                  {obs.species_scientific && (
                    <p className="text-xs text-gray-400 italic line-clamp-1">
                      {obs.species_scientific}
                    </p>
                  )}
                </div>
                {obs.confidence_score !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap border ${
                    obs.confidence_score >= 0.8 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                      : obs.confidence_score >= 0.5 
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}>
                    {Math.round(obs.confidence_score * 100)}% Match
                  </span>
                )}
              </div>

              <div className="mt-auto pt-3 border-t border-gray-800 space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">👤 {obs.observer.username}</span>
                  <span className="flex items-center gap-1">📅 {new Date(obs.observed_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
