"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface FlagPredictionProps {
  observationId: number;
  onSuccess?: (updatedObservation: any) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FlagPrediction({ observationId, onSuccess }: FlagPredictionProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [suggestedCommon, setSuggestedCommon] = useState("");
  const [suggestedScientific, setSuggestedScientific] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/observations/${observationId}/flag`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason.trim() || null,
          suggested_species_common: suggestedCommon.trim() || null,
          suggested_species_scientific: suggestedScientific.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to submit flag" }));
        throw new Error(errData.detail || "Failed to submit flag or correction.");
      }

      const updatedObs = await res.json();
      setSuccessMsg("Observation flag/correction recorded successfully.");
      if (onSuccess) {
        onSuccess(updatedObs);
      }
      setTimeout(() => {
        setOpen(false);
        setReason("");
        setSuggestedCommon("");
        setSuggestedScientific("");
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
      >
        <span>⚠️</span> This looks wrong / Suggest Correction
      </button>
    );
  }

  return (
    <div className="bg-gray-950 border border-amber-900/60 rounded-lg p-4 space-y-3 my-3 text-left">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <span>🚩</span> Flag Observation / Suggest Correction
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="text-xs p-2 bg-rose-950 border border-rose-800 text-rose-300 rounded">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="text-xs p-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Reason for flagging
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this prediction or record looks incorrect..."
            rows={2}
            className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Suggested Common Name
            </label>
            <input
              type="text"
              value={suggestedCommon}
              onChange={(e) => setSuggestedCommon(e.target.value)}
              placeholder="e.g. Neem Tree"
              className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Suggested Scientific Name
            </label>
            <input
              type="text"
              value={suggestedScientific}
              onChange={(e) => setSuggestedScientific(e.target.value)}
              placeholder="e.g. Azadirachta indica"
              className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-1 bg-gray-900 text-gray-400 hover:text-gray-200 rounded text-xs border border-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (!reason.trim() && !suggestedCommon.trim() && !suggestedScientific.trim())}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-medium"
          >
            {submitting ? "Submitting..." : "Submit Flag"}
          </button>
        </div>
      </form>
    </div>
  );
}
