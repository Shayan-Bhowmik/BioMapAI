"use client";

import { useState } from "react";

export default function HomePage() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/health`
      );
      const data = await res.json();
      setHealthStatus(`✅ API: ${data.status} | Database: ${data.database}`);
    } catch {
      setHealthStatus("❌ Backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">🌿 Welcome to BioMap AI</h1>
      <p className="text-gray-400 mb-8">
        AI-powered biodiversity mapping. Upload a photo, identify species, and
        contribute to the global biodiversity map.
      </p>

      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">System Status</h2>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors"
        >
          {loading ? "Checking..." : "Check Backend Connection"}
        </button>
        {healthStatus && (
          <p className="mt-4 text-sm font-mono">{healthStatus}</p>
        )}
      </div>
    </div>
  );
}
