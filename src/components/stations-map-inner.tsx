"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { StationLocation } from "@/db/queries/stations";

const ALBANIA_CENTER: google.maps.LatLngLiteral = { lat: 41.15, lng: 20.0 };

export interface StationSelection {
  stationId: number;
  token: number;
}

export interface StationsMapProps {
  stations: StationLocation[];
  selection?: StationSelection | null;
}

const BUS_MARKER_ICON_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="14.25" fill="#ffffff" stroke="#00575c" stroke-width="1.5"/>
      <g transform="translate(3,2)">
        <rect x="2.5" y="5" width="19" height="12.5" rx="2.5" fill="#00575c"/>
        <rect x="5" y="7.5" width="3.2" height="4" rx="0.6" fill="#ffffff"/>
        <rect x="9.6" y="7.5" width="3.2" height="4" rx="0.6" fill="#ffffff"/>
        <rect x="14.2" y="7.5" width="3.2" height="4" rx="0.6" fill="#ffffff"/>
        <rect x="18.8" y="7.5" width="1.7" height="4" rx="0.6" fill="#ffffff"/>
        <rect x="2.5" y="14.5" width="19" height="1.6" fill="#ffffff" fill-opacity="0.35"/>
        <circle cx="7" cy="19" r="2" fill="#20242b" stroke="#ffffff" stroke-width="0.8"/>
        <circle cx="17" cy="19" r="2" fill="#20242b" stroke="#ffffff" stroke-width="0.8"/>
      </g>
    </svg>
  `);

// Hides POI/transit clutter so station markers stay readable; place and road
// labels stay on since riders use them to orient themselves.
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2226" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2226" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a9198" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d4d8db" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b3136" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4147" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1417" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5a63" }] },
];

let optionsSet = false;
function ensureOptionsSet() {
  if (optionsSet) return;
  setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });
  optionsSet = true;
}

const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

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

function buildInfoWindowContent(station: StationLocation): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-1 text-sm";

  const name = document.createElement("p");
  name.className = "font-medium";
  name.textContent = station.name;
  wrap.appendChild(name);

  const city = document.createElement("p");
  city.className = "text-muted";
  city.textContent = station.city;
  wrap.appendChild(city);

  if (station.address) {
    const address = document.createElement("p");
    address.className = "text-xs text-muted";
    address.textContent = station.address;
    wrap.appendChild(address);
  }

  const code = document.createElement("p");
  code.className = "text-xs text-muted";
  code.textContent = `Station code: ${station.code}`;
  wrap.appendChild(code);

  const link = document.createElement("a");
  link.className = "mt-1 text-teal underline";
  link.href = `/search?origin=${encodeURIComponent(station.name)}`;
  link.textContent = "Search buses from here";
  wrap.appendChild(link);

  return wrap;
}

export function StationsMap({ stations, selection = null }: StationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const isDark = useIsDarkMode();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasApiKey || !containerRef.current) return;
    let cancelled = false;
    ensureOptionsSet();
    importLibrary("maps")
      .then(({ Map }) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new Map(containerRef.current, {
          center: ALBANIA_CENTER,
          zoom: 8,
          styles: isDark ? DARK_STYLE : LIGHT_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          // "greedy" lets a single-finger swipe pan the map — on a phone this
          // map fills nearly the whole viewport, so that turns every attempt
          // to scroll past it into an accidental pan instead. "cooperative"
          // passes a one-finger swipe through to the page and shows Google's
          // own "use two fingers" hint only when the user actually tries to
          // pan; desktop scroll-to-zoom gets the equivalent Ctrl/Cmd hint.
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setOptions({ styles: isDark ? DARK_STYLE : LIGHT_STYLE });
  }, [isDark]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const currentIds = new Set(stations.map((s) => s.id));

    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const station of stations) {
      if (markersRef.current.has(station.id)) continue;
      const marker = new google.maps.Marker({
        map,
        position: { lat: Number(station.latitude), lng: Number(station.longitude) },
        title: station.name,
        icon: {
          url: BUS_MARKER_ICON_URL,
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
        },
      });
      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(buildInfoWindowContent(station));
        infoWindowRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.set(station.id, marker);
    }
  }, [ready, stations]);

  useEffect(() => {
    if (!ready || !selection || !mapRef.current) return;
    const station = stations.find((s) => s.id === selection.stationId);
    const marker = markersRef.current.get(selection.stationId);
    if (!station || !marker) return;
    mapRef.current.panTo({ lat: Number(station.latitude), lng: Number(station.longitude) });
    mapRef.current.setZoom(14);
    google.maps.event.trigger(marker, "click");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  if (error || !hasApiKey) {
    return (
      <div className="flex h-[70vh] min-h-[420px] w-full items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-border">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
