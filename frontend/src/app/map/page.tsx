"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch(`${API_BASE}/observations`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch observations");
        return res.json();
      })
      .then((data) => setObservations(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400">
        Loading observations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-rose-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🗺️ Biodiversity Map</h1>
        <span className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-800">
          {observations.length} observation{observations.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ObservationMap observations={observations} />
    </div>
  );
}
