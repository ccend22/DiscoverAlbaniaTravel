"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";
import type { StationLocation } from "@/db/queries/stations";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

const ALBANIA_CENTER: google.maps.LatLngLiteral = { lat: 41.15, lng: 20.0 };
const MAP_SIZE = "h-[58dvh] min-h-[360px] max-h-[620px] sm:h-[70vh] sm:min-h-[480px] sm:max-h-none";

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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !containerRef.current) return;
    let cancelled = false;
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (!cancelled) setError(true);
    };
    ensureGoogleMapsOptions();
    importLibrary("maps")
      .then(({ Map }) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new Map(containerRef.current, {
          center: ALBANIA_CENTER,
          zoom: 8,
          styles: LIGHT_STYLE,
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
      window.gm_authFailure = previousAuthFailure;
    };
  }, []);

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

  if (error || !hasGoogleMapsApiKey) {
    return (
      <div className={`flex ${MAP_SIZE} w-full items-center justify-center overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#eef5f6] px-6 text-center text-sm font-medium text-muted`}>
        The map could not load. Search above to find a station.
      </div>
    );
  }

  return (
    <div className={`${MAP_SIZE} w-full overflow-hidden rounded-[1.9rem] border border-white/10`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
