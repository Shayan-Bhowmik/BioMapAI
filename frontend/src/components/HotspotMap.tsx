"use client";

import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";

// Fix Leaflet's default icon paths in Next.js client-side execution
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface HotspotDensity {
  lat: number;
  lng: number;
  count: number;
}

interface HotspotMapProps {
  hotspots: HotspotDensity[];
}

export default function HotspotMap({ hotspots }: HotspotMapProps) {
  // Default coordinates (India / Global center fallback)
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const center: [number, number] =
    hotspots.length > 0 ? [hotspots[0].lat, hotspots[0].lng] : defaultCenter;

  const maxCount = hotspots.length > 0 ? Math.max(...hotspots.map((h) => h.count)) : 1;

  const getMarkerStyle = (count: number) => {
    // Dynamic radius scaled by observation count
    const radius = Math.min(32, Math.max(14, 12 + (count / maxCount) * 16));

    if (count >= 5) {
      return {
        radius,
        color: "#ef4444",
        fillColor: "#f87171",
        fillOpacity: 0.65,
        weight: 2,
        level: "High",
        badgeBg: "#fef2f2",
        badgeText: "#991b1b",
      };
    } else if (count >= 3) {
      return {
        radius,
        color: "#f59e0b",
        fillColor: "#fbbf24",
        fillOpacity: 0.65,
        weight: 2,
        level: "Moderate",
        badgeBg: "#fffbeb",
        badgeText: "#92400e",
      };
    } else {
      return {
        radius,
        color: "#10b981",
        fillColor: "#34d399",
        fillOpacity: 0.65,
        weight: 2,
        level: "Low",
        badgeBg: "#ecfdf5",
        badgeText: "#065f46",
      };
    }
  };

  return (
    <div className="relative w-full h-[400px] md:h-[480px] rounded-xl overflow-hidden border border-gray-800 shadow-lg">
      <MapContainer
        center={center}
        zoom={hotspots.length > 0 ? 7 : 4}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hotspots.map((spot, idx) => {
          const style = getMarkerStyle(spot.count);
          return (
            <CircleMarker
              key={`hotspot-${spot.lat}-${spot.lng}-${idx}`}
              center={[spot.lat, spot.lng]}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                weight: style.weight,
              }}
            >
              <Tooltip direction="top" offset={[0, -style.radius]} opacity={0.95}>
                <span className="font-semibold text-xs">
                  {spot.count} observation{spot.count !== 1 ? "s" : ""}
                </span>
              </Tooltip>

              <Popup minWidth={200}>
                <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "#1f2937", padding: "4px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                    📍 Hotspot Zone
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span
                      style={{
                        background: style.badgeBg,
                        color: style.badgeText,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {style.level} Density
                    </span>
                    <span style={{ fontSize: "12px", color: "#4b5563" }}>
                      {spot.count} record{spot.count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div style={{ fontSize: "11px", color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: "6px" }}>
                    <div>Lat: {spot.lat.toFixed(2)}°</div>
                    <div>Lng: {spot.lng.toFixed(2)}°</div>
                    <div style={{ marginTop: "4px", fontStyle: "italic", fontSize: "10px" }}>
                      ~11km Grid Cell
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-950/90 backdrop-blur-sm border border-gray-800 rounded-lg p-3 z-10 shadow-lg text-xs">
        <div className="font-semibold text-gray-200 mb-2">Density Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400"></span>
            <span className="text-gray-300">1 - 2 records</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400"></span>
            <span className="text-gray-300">3 - 4 records</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400"></span>
            <span className="text-gray-300">5+ records</span>
          </div>
        </div>
      </div>
    </div>
  );
}
