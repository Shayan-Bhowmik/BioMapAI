"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import FlagPrediction from "@/components/FlagPrediction";
import { useAuth } from "@/context/AuthContext";

// Dynamic import for Leaflet LocationPicker component to prevent SSR window errors
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Step = "select" | "identifying" | "review" | "saving" | "done";

interface Prediction {
  common_name: string;
  scientific_name: string;
  confidence: number;
  raw?: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_FILE_SIZE_MB = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function UploadPage() {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>("select");

  // Selection state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Uploaded image state
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // AI Identification & Editable Species state
  const [aiProvider, setAiProvider] = useState<string>("MOCK");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [speciesCommon, setSpeciesCommon] = useState<string>("");
  const [speciesScientific, setSpeciesScientific] = useState<string>("");

  // Metadata & Location state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [observedAt, setObservedAt] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Post-submit result
  const [savedObservation, setSavedObservation] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !token) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/observations/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errData.detail || "Failed to upload image.");
      }

      const data = await res.json();
      setUploadedFilename(data.filename);
      setUploadedImageUrl(data.image_url);

      setStep("identifying");
      await runIdentification(data.filename);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
      setUploading(false);
    }
  };

  const runIdentification = async (filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/observations/identify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Identification failed" }));
        throw new Error(errData.detail || "Species identification failed.");
      }

      const data = await res.json();
      setAiProvider(data.provider);
      setPredictions(data.predictions);
      if (data.predictions && data.predictions.length > 0) {
        const top = data.predictions[0];
        setSelectedPrediction(top);
        setSpeciesCommon(top.common_name);
        setSpeciesScientific(top.scientific_name);
      }
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Failed to identify species.");
      setStep("review");
    } finally {
      setUploading(false);
    }
  };

  const selectPredictionCard = (pred: Prediction) => {
    setSelectedPrediction(pred);
    setSpeciesCommon(pred.common_name);
    setSpeciesScientific(pred.scientific_name);
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFilename || !token) return;

    if (!coords) {
      setError("Please select a location on the map.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        filename: uploadedFilename,
        species_common: speciesCommon.trim() || null,
        species_scientific: speciesScientific.trim() || null,
        lat: coords.lat,
        lng: coords.lng,
        observed_at: new Date(observedAt).toISOString(),
        confidence_score: selectedPrediction ? selectedPrediction.confidence : null,
        notes: notes.trim() || null,
      };

      const res = await fetch(`${API_BASE}/observations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Save failed" }));
        throw new Error(errData.detail || "Failed to save observation record.");
      }

      const savedData = await res.json();
      setSavedObservation(savedData);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to save observation record.");
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (confidence >= 0.8) {
      return (
        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded">
          {pct}% Match
        </span>
      );
    } else if (confidence >= 0.5) {
      return (
        <span className="bg-amber-950 text-amber-400 border border-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded">
          {pct}% Match
        </span>
      );
    } else {
      return (
        <span className="bg-rose-950 text-rose-400 border border-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded">
          {pct}% Low Match
        </span>
      );
    }
  };

  const resetFlow = () => {
    setStep("select");
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadedFilename(null);
    setUploadedImageUrl(null);
    setPredictions([]);
    setSelectedPrediction(null);
    setSpeciesCommon("");
    setSpeciesScientific("");
    setCoords(null);
    setNotes("");
    setSavedObservation(null);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto py-6 px-4">
        {/* Step Indicator Header */}
        <div className="mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <span>📸</span> BioMap AI Observation Flow
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Upload biodiversity observations for AI species identification and map recording.
          </p>

          <div className="flex items-center gap-4 mt-6 text-sm flex-wrap">
            <span className={`font-semibold ${step === "select" ? "text-emerald-400" : "text-gray-500"}`}>
              1. Select Photo
            </span>
            <span className="text-gray-700">➔</span>
            <span className={`font-semibold ${step === "identifying" ? "text-emerald-400 animate-pulse" : step === "review" ? "text-gray-400" : "text-gray-600"}`}>
              2. AI Identification
            </span>
            <span className="text-gray-700">➔</span>
            <span className={`font-semibold ${step === "review" ? "text-emerald-400" : "text-gray-600"}`}>
              3. Location & Metadata
            </span>
            <span className="text-gray-700">➔</span>
            <span className={`font-semibold ${step === "done" ? "text-emerald-400" : "text-gray-600"}`}>
              4. Complete
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: SELECT PHOTO */}
        {step === "select" && (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />

              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative inline-block max-w-md max-h-80 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Upload preview"
                      className="object-contain max-h-80 w-full"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-gray-400 hover:text-emerald-400 underline"
                    >
                      Change selected photo
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-lg transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl mb-3">
                    📷
                  </div>
                  <span className="text-gray-200 font-medium text-base">
                    Click to select or capture a photo
                  </span>
                  <span className="text-gray-500 text-xs mt-1">
                    Supports JPEG, PNG, or WebP (max {MAX_FILE_SIZE_MB}MB)
                  </span>
                </label>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!file || uploading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg shadow flex items-center gap-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Uploading...
                  </>
                ) : (
                  <>Identify Species ➔</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: IDENTIFYING SKELETON */}
        {step === "identifying" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <span className="absolute text-2xl">🌱</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Identifying species…</h2>
              <p className="text-sm text-gray-400 mt-1">
                Analyzing photo features with AI species identification algorithms.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW, MAP LOCATION & METADATA */}
        {step === "review" && (
          <form onSubmit={handleSaveObservation} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Display & Predictions */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center">
                  <h3 className="text-xs font-semibold text-gray-400 mb-2 self-start">
                    Uploaded Photo
                  </h3>
                  {uploadedImageUrl || previewUrl ? (
                    <div className="rounded-lg overflow-hidden border border-gray-800 max-h-56 w-full flex justify-center bg-gray-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadedImageUrl || previewUrl || ""}
                        alt="Uploaded observation"
                        className="object-contain max-h-56 w-full"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Predictions Selection */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
                      <span>🤖</span> AI Predictions
                    </h3>
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">
                      Provider: {aiProvider}
                    </span>
                  </div>

                  {predictions.length > 0 ? (
                    <div className="space-y-2">
                      {predictions.map((pred, idx) => {
                        const isSelected =
                          selectedPrediction?.scientific_name === pred.scientific_name;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectPredictionCard(pred)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-950/40 border-emerald-600 shadow-md"
                                : "bg-gray-950 border-gray-800 hover:border-gray-700"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-gray-100 text-sm">
                                  {pred.common_name}
                                </div>
                                <div className="text-xs text-gray-400 italic">
                                  {pred.scientific_name}
                                </div>
                              </div>
                              {getConfidenceBadge(pred.confidence)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-2 text-center">
                      No automated predictions. You can enter species details manually below.
                    </div>
                  )}

                  {selectedPrediction && selectedPrediction.confidence < 0.5 && (
                    <div className="text-xs text-amber-300 bg-amber-950/50 p-2.5 rounded border border-amber-800/60">
                      ⚠️ Low AI confidence match ({Math.round(selectedPrediction.confidence * 100)}%). Please double-check or override the species names below.
                    </div>
                  )}
                </div>
              </div>

              {/* Form Controls: Species Override, LocationPicker & Details */}
              <div className="space-y-4">
                {/* Species Name Override Fields */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5 border-b border-gray-800 pb-2">
                    <span>✏️</span> Species Details (Editable Override)
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Common Name</label>
                      <input
                        type="text"
                        value={speciesCommon}
                        onChange={(e) => setSpeciesCommon(e.target.value)}
                        placeholder="e.g. Neem Tree"
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Scientific Name</label>
                      <input
                        type="text"
                        value={speciesScientific}
                        onChange={(e) => setSpeciesScientific(e.target.value)}
                        placeholder="e.g. Azadirachta indica"
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 italic focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* LocationPicker Map */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <LocationPicker value={coords} onChange={setCoords} />
                </div>

                {/* Date & Notes */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">Observed Date & Time</label>
                    <input
                      type="datetime-local"
                      value={observedAt}
                      onChange={(e) => setObservedAt(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add habitat, behavior, or surrounding environment details..."
                      rows={2}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={resetFlow}
                className="text-sm text-gray-400 hover:text-gray-200 font-medium py-2.5 px-4 rounded border border-gray-800 hover:border-gray-700"
              >
                ← Start Over
              </button>

              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg shadow flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving Record...
                  </>
                ) : (
                  <>Save Observation 💾</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: DONE CONFIRMATION */}
        {step === "done" && savedObservation && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center text-xl">
                ✓
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">Observation Saved!</h2>
                <p className="text-xs text-gray-400">
                  Record #{savedObservation.id} has been added to BioMap AI.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Thumbnail */}
              <div className="rounded-lg overflow-hidden border border-gray-800 max-h-60 bg-gray-950 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={savedObservation.image_url}
                  alt={savedObservation.species_common || "Saved observation"}
                  className="object-contain max-h-60 w-full"
                />
              </div>

              {/* Details Summary */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block">Species:</span>
                  <span className="text-sm font-semibold text-gray-100">
                    {savedObservation.species_common || "Unidentified"}
                  </span>
                  {savedObservation.species_scientific && (
                    <span className="text-xs text-gray-400 italic block">
                      {savedObservation.species_scientific}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block">Location Coordinates:</span>
                  <span className="font-mono text-emerald-400">
                    {savedObservation.lat.toFixed(6)}, {savedObservation.lng.toFixed(6)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block">Observed At:</span>
                  <span className="text-gray-200">
                    {new Date(savedObservation.observed_at).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block">Verification Status:</span>
                  <span className="uppercase text-[10px] font-bold bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800 inline-block mt-0.5">
                    {savedObservation.verification_status}
                  </span>
                </div>

                {savedObservation.notes && (
                  <div>
                    <span className="text-gray-400 block">Notes:</span>
                    <span className="text-gray-300 italic">{savedObservation.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Embedded Ticket 11 Flag/Correction Component */}
            <div className="pt-2 border-t border-gray-800">
              <FlagPrediction
                observationId={savedObservation.id}
                onSuccess={(updated) => setSavedObservation(updated)}
              />
            </div>

            {/* Links */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <Link
                href="/map"
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded font-medium transition-colors"
              >
                🗺️ View on Map (Phase 3)
              </Link>
              <button
                type="button"
                onClick={resetFlow}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                📸 Upload Another Observation
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
