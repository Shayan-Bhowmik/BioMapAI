"use client";

import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

interface ObservationMapProps {
  observations: Observation[];
}

export default function ObservationMap({ observations }: ObservationMapProps) {
  const defaultCenter: [number, number] = [28.6139, 77.209];
  const center: [number, number] =
    observations.length > 0
      ? [observations[0].lat, observations[0].lng]
      : defaultCenter;

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-xl overflow-hidden border border-gray-800 shadow-lg">
      <MapContainer
        center={center}
        zoom={observations.length > 0 ? 10 : 5}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {observations.map((obs) => (
          <Marker key={obs.id} position={[obs.lat, obs.lng]}>
            <Popup maxWidth={280} minWidth={240}>
              <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "#1f2937" }}>
                {/* Image */}
                <div
                  style={{
                    borderRadius: "6px",
                    overflow: "hidden",
                    marginBottom: "8px",
                    maxHeight: "140px",
                    background: "#f3f4f6",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={obs.image_url}
                    alt={obs.species_common || "Observation"}
                    style={{ width: "100%", maxHeight: "140px", objectFit: "cover" }}
                  />
                </div>

                {/* Species */}
                <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>
                  {obs.species_common || "Unidentified"}
                </div>
                {obs.species_scientific && (
                  <div style={{ fontStyle: "italic", color: "#6b7280", fontSize: "12px", marginBottom: "6px" }}>
                    {obs.species_scientific}
                  </div>
                )}

                {/* Confidence */}
                {obs.confidence_score !== null && (
                  <div style={{ marginBottom: "6px" }}>
                    <span
                      style={{
                        background: obs.confidence_score >= 0.8 ? "#d1fae5" : obs.confidence_score >= 0.5 ? "#fef3c7" : "#fecaca",
                        color: obs.confidence_score >= 0.8 ? "#065f46" : obs.confidence_score >= 0.5 ? "#92400e" : "#991b1b",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {Math.round(obs.confidence_score * 100)}% confidence
                    </span>
                  </div>
                )}

                {/* Date & Observer */}
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  📅 {new Date(obs.observed_at).toLocaleDateString()}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  👤 {obs.observer.username}
                </div>

                {/* Status */}
                <div style={{ marginTop: "6px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "#f3f4f6",
                      color: "#6b7280",
                    }}
                  >
                    {obs.verification_status}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
