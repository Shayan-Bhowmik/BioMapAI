"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-3xl font-bold mb-4">📊 Dashboard</h1>
        <p className="text-gray-400">Your observation stats and activity overview.</p>
      </div>
    </ProtectedRoute>
  );
}