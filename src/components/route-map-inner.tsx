"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const ROUTE_LINE_COLOR = "#2563eb";

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

export interface RouteSegment {
  fromName: string;
  fromLat: number;
  fromLng: number;
  toName: string;
  toLat: number;
  toLng: number;
  /** Road-following path from a routing service; falls back to a straight line when absent. */
  path?: [number, number][];
}

interface FitToSegmentsProps {
  points: [number, number][];
}

function FitToSegments({ points }: FitToSegmentsProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return null;
}

export interface RouteMapProps {
  segments: RouteSegment[];
}

export function RouteMap({ segments }: RouteMapProps) {
  const isDark = useIsDarkMode();

  const { markers, lines, points } = useMemo(() => {
    const markerMap = new Map<string, { name: string; lat: number; lng: number }>();
    const lineList: { key: string; positions: [number, number][] }[] = [];

    for (const segment of segments) {
      const fromKey = `${segment.fromLat.toFixed(5)},${segment.fromLng.toFixed(5)}`;
      const toKey = `${segment.toLat.toFixed(5)},${segment.toLng.toFixed(5)}`;
      markerMap.set(fromKey, { name: segment.fromName, lat: segment.fromLat, lng: segment.fromLng });
      markerMap.set(toKey, { name: segment.toName, lat: segment.toLat, lng: segment.toLng });
      lineList.push({
        key: `${fromKey}-${toKey}`,
        positions:
          segment.path && segment.path.length > 0
            ? segment.path
            : [
                [segment.fromLat, segment.fromLng],
                [segment.toLat, segment.toLng],
              ],
      });
    }

    const uniqueMarkers = Array.from(markerMap.entries()).map(([key, value]) => ({ key, ...value }));
    const uniqueLines = Array.from(new Map(lineList.map((l) => [l.key, l])).values());
    const allPoints: [number, number][] = uniqueLines.flatMap((l) => l.positions);

    return { markers: uniqueMarkers, lines: uniqueLines, points: allPoints };
  }, [segments]);

  return (
    <div className="h-[50vh] min-h-[320px] w-full overflow-hidden rounded-lg border border-border">
      <MapContainer center={[41.15, 20.0]} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer
          key={isDark ? "dark" : "light"}
          url={isDark ? TILE_LAYERS.dark : TILE_LAYERS.light}
          attribution={TILE_ATTRIBUTION}
        />
        {lines.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{ color: ROUTE_LINE_COLOR, weight: 4, opacity: 0.85 }}
          />
        ))}
        {markers.map((marker) => (
          <Marker key={marker.key} position={[marker.lat, marker.lng]} icon={markerIcon}>
            <Popup>
              <p className="text-sm font-medium">{marker.name}</p>
            </Popup>
          </Marker>
        ))}
        <FitToSegments points={points} />
      </MapContainer>
    </div>
  );
}
