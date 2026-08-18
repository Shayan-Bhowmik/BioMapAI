"use client";

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">👤 Observer Profile</h1>
          <p className="text-gray-400">
            View your observer account details and observation history.
          </p>
        </div>

        {/* User Information Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">
                Username
              </span>
              <span className="text-gray-100 font-medium">
                {user?.username || "—"}
              </span>
            </div>
            <div>
              <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">
                Email
              </span>
              <span className="text-gray-100 font-medium">
                {user?.email || "—"}
              </span>
            </div>
            <div>
              <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">
                Full Name
              </span>
              <span className="text-gray-100 font-medium">
                {user?.full_name || "Not provided"}
              </span>
            </div>
            <div>
              <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">
                Member Since
              </span>
              <span className="text-gray-100 font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* My Observations Placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-white">
            My Observations
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Observations you record in the field will appear here.
          </p>
          <div className="border border-dashed border-gray-800 rounded-md p-8 text-center text-gray-500 text-sm">
            No observations recorded yet. Observation tracking will be available in an upcoming release.
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}