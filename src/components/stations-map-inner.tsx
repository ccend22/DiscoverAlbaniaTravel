"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { StationLocation } from "@/db/queries/stations";

const ALBANIA_CENTER: [number, number] = [41.15, 20.0];

export interface StationSelection {
  stationId: number;
  token: number;
}

const BUS_ICON_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="5" width="19" height="12.5" rx="2.5" fill="currentColor"/>
    <rect x="5" y="7.5" width="3.2" height="4" rx="0.6" fill="white"/>
    <rect x="9.6" y="7.5" width="3.2" height="4" rx="0.6" fill="white"/>
    <rect x="14.2" y="7.5" width="3.2" height="4" rx="0.6" fill="white"/>
    <rect x="18.8" y="7.5" width="1.7" height="4" rx="0.6" fill="white"/>
    <rect x="2.5" y="14.5" width="19" height="1.6" fill="white" fill-opacity="0.35"/>
    <circle cx="7" cy="19" r="2" fill="#20242b" stroke="white" stroke-width="0.8"/>
    <circle cx="17" cy="19" r="2" fill="#20242b" stroke="white" stroke-width="0.8"/>
  </svg>
`;

const markerIcon = L.divIcon({
  className: "",
  html: `<span class="station-marker">${BUS_ICON_SVG}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const TILE_LAYERS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function subscribeToColorScheme(callback: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getIsDarkSnapshot(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribeToColorScheme, getIsDarkSnapshot, () => false);
}

interface FlyToSelectionProps {
  stations: StationLocation[];
  selection: StationSelection | null;
  markerRefs: React.RefObject<Map<number, L.Marker>>;
}

function FlyToSelection({ stations, selection, markerRefs }: FlyToSelectionProps) {
  const map = useMap();

  useEffect(() => {
    if (!selection) return;
    const station = stations.find((s) => s.id === selection.stationId);
    if (!station) return;

    const position: [number, number] = [Number(station.latitude), Number(station.longitude)];
    map.flyTo(position, 14, { duration: 0.75 });
    markerRefs.current.get(selection.stationId)?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  return null;
}

export interface StationsMapProps {
  stations: StationLocation[];
  selection?: StationSelection | null;
}

export function StationsMap({ stations, selection = null }: StationsMapProps) {
  const isDark = useIsDarkMode();
  const markerRefs = useRef<Map<number, L.Marker>>(new Map());

  return (
    <div className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-border">
      <MapContainer center={ALBANIA_CENTER} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer
          key={isDark ? "dark" : "light"}
          url={isDark ? TILE_LAYERS.dark : TILE_LAYERS.light}
          attribution={TILE_ATTRIBUTION}
        />
        {stations.map((station) => (
          <Marker
            key={station.id}
            ref={(instance) => {
              if (instance) markerRefs.current.set(station.id, instance);
              else markerRefs.current.delete(station.id);
            }}
            position={[Number(station.latitude), Number(station.longitude)]}
            icon={markerIcon}
          >
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium">{station.name}</p>
                <p className="text-muted">{station.city}</p>
                {station.address && <p className="text-xs text-muted">{station.address}</p>}
                <p className="text-xs text-muted">Station code: {station.code}</p>
                <Link
                  href={`/search?origin=${encodeURIComponent(station.name)}`}
                  className="mt-1 text-teal underline"
                >
                  Search buses from here
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyToSelection stations={stations} selection={selection} markerRefs={markerRefs} />
      </MapContainer>
    </div>
  );
}
