"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-8 text-gray-400">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-gray-900 border border-gray-800 rounded">
        <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
        <p className="text-gray-400 text-sm mb-4">
          You must be logged in to view this page.
        </p>
        <Link
          href="/login"
          className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}