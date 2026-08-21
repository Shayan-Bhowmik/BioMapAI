"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";

// Fix standard Leaflet marker icons under Next.js bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090]; // Delhi

function MapEventsHandler({ onChange }: { onChange: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [geoStatus, setGeoStatus] = useState<string>("Detecting location...");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  const currentCoords: [number, number] = value
    ? [value.lat, value.lng]
    : DEFAULT_CENTER;

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setGeoStatus("Geolocation unavailable");
      if (!value) onChange({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
      return;
    }

    setLocating(true);
    setGeoError(null);
    setGeoStatus("Requesting GPS location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        onChange({ lat, lng });
        setGeoStatus("GPS Location detected");
        setGeoError(null);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission denied. Click on map to set position.");
            setGeoStatus("Permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information unavailable. Fallback location set.");
            setGeoStatus("Position unavailable");
            break;
          case error.TIMEOUT:
            setGeoError("Geolocation request timed out. Fallback location set.");
            setGeoStatus("Location timeout");
            break;
          default:
            setGeoError("Failed to detect location.");
            setGeoStatus("Detection failed");
            break;
        }
        if (!value) {
          onChange({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!value) {
      requestGeolocation();
    }
  }, []);

  const markerHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange({ lat: Number(latLng.lat.toFixed(6)), lng: Number(latLng.lng.toFixed(6)) });
        }
      },
    }),
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
        <span className="font-semibold text-gray-200">📍 Observation Location</span>
        <button
          type="button"
          onClick={requestGeolocation}
          disabled={locating}
          className="text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1 disabled:opacity-50"
        >
          {locating ? "Locating..." : "🎯 Use My Location"}
        </button>
      </div>

      {geoError && (
        <div className="text-xs p-2 bg-amber-950/60 border border-amber-800 text-amber-300 rounded mb-2">
          ⚠️ {geoError}
        </div>
      )}

      {/* Map Container with EXPLICIT HEIGHT */}
      <div className="h-[300px] w-full rounded-lg overflow-hidden relative border border-gray-800 shadow-inner">
        <MapContainer
          center={currentCoords}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={currentCoords} />
          <MapEventsHandler onChange={onChange} />
          <Marker
            position={currentCoords}
            draggable={true}
            eventHandlers={markerHandlers}
          />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 px-1 pt-1">
        <span>Click map or drag pin to adjust position</span>
        <span className="font-mono text-emerald-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
          Lat: {value?.lat ?? DEFAULT_CENTER[0]}, Lng: {value?.lng ?? DEFAULT_CENTER[1]}
        </span>
      </div>
    </div>
  );
}
