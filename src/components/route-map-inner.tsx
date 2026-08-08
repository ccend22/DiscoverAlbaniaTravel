"use client";

import { useEffect, useMemo, useRef } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";

const BUS_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="14" fill="#2563eb" stroke="white" stroke-width="2"/>
    <rect x="8.5" y="10" width="13" height="9" rx="1.8" fill="white"/>
    <rect x="10.3" y="12" width="2.2" height="3" rx="0.4" fill="#2563eb"/>
    <rect x="13.3" y="12" width="2.2" height="3" rx="0.4" fill="#2563eb"/>
    <rect x="16.3" y="12" width="2.2" height="3" rx="0.4" fill="#2563eb"/>
    <circle cx="11.5" cy="20.5" r="1.4" fill="#1e293b"/>
    <circle cx="18.5" cy="20.5" r="1.4" fill="#1e293b"/>
  </svg>
`;
const BUS_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(BUS_ICON_SVG)}`;

const ROUTE_LINE_COLOR = "#2563eb";

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

export interface RouteMapProps {
  segments: RouteSegment[];
}

export function RouteMap({ segments }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { markers, lines } = useMemo(() => {
    const markerMap = new Map<string, { name: string; lat: number; lng: number }>();
    const lineList: { key: string; positions: google.maps.LatLngLiteral[] }[] = [];

    for (const segment of segments) {
      const fromKey = `${segment.fromLat.toFixed(5)},${segment.fromLng.toFixed(5)}`;
      const toKey = `${segment.toLat.toFixed(5)},${segment.toLng.toFixed(5)}`;
      markerMap.set(fromKey, { name: segment.fromName, lat: segment.fromLat, lng: segment.fromLng });
      markerMap.set(toKey, { name: segment.toName, lat: segment.toLat, lng: segment.toLng });
      const rawPositions =
        segment.path && segment.path.length > 0
          ? segment.path
          : ([
              [segment.fromLat, segment.fromLng],
              [segment.toLat, segment.toLng],
            ] as [number, number][]);
      lineList.push({
        key: `${fromKey}-${toKey}`,
        positions: rawPositions.map(([lat, lng]) => ({ lat, lng })),
      });
    }

    const uniqueMarkers = Array.from(markerMap.entries()).map(([key, value]) => ({ key, ...value }));
    const uniqueLines = Array.from(new Map(lineList.map((l) => [l.key, l])).values());

    return { markers: uniqueMarkers, lines: uniqueLines };
  }, [segments]);

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !containerRef.current) return;
    let cancelled = false;
    const overlays: (google.maps.Polyline | google.maps.Marker)[] = [];
    let infoWindow: google.maps.InfoWindow | null = null;

    async function render() {
      ensureGoogleMapsOptions();
      const { Map: GoogleMap } = await importLibrary("maps");
      await importLibrary("marker");
      if (cancelled || !containerRef.current) return;

      const map =
        mapRef.current ??
        new GoogleMap(containerRef.current, {
          center: { lat: 41.15, lng: 20.0 },
          zoom: 8,
          gestureHandling: "cooperative",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
      mapRef.current = map;
      infoWindow = new google.maps.InfoWindow();

      const bounds = new google.maps.LatLngBounds();

      for (const line of lines) {
        const polyline = new google.maps.Polyline({
          path: line.positions,
          strokeColor: ROUTE_LINE_COLOR,
          strokeWeight: 4,
          strokeOpacity: 0.85,
          map,
        });
        overlays.push(polyline);
        line.positions.forEach((point) => bounds.extend(point));
      }

      for (const marker of markers) {
        const position = { lat: marker.lat, lng: marker.lng };
        const mapMarker = new google.maps.Marker({
          position,
          map,
          title: marker.name,
          icon: {
            url: BUS_ICON_URL,
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15),
          },
        });
        mapMarker.addListener("click", () => {
          infoWindow?.setContent(`<p style="margin:0;font-size:13px;font-weight:500;">${marker.name}</p>`);
          infoWindow?.open({ map, anchor: mapMarker });
        });
        overlays.push(mapMarker);
        bounds.extend(position);
      }

      if (!bounds.isEmpty()) {
        if (markers.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(12);
        } else {
          map.fitBounds(bounds, 40);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => overlay.setMap(null));
      infoWindow?.close();
    };
  }, [markers, lines]);

  if (!hasGoogleMapsApiKey) {
    return (
      <div className="flex h-[50vh] min-h-[320px] w-full items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Map unavailable
      </div>
    );
  }

  return <div ref={containerRef} className="h-[50vh] min-h-[320px] w-full overflow-hidden rounded-lg border border-border" />;
}
