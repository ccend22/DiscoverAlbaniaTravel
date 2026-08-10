"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { importLibrary } from "@googlemaps/js-api-loader";
import { CloseIcon, MapPinIcon, SearchIcon } from "./icons";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey, pinAutocompleteDropdownBelow } from "@/lib/google-maps-loader";

const ALBANIA_CENTER: google.maps.LatLngLiteral = { lat: 41.15, lng: 20.0 };
const PICKED_ZOOM = 15;

// Same declutter treatment as the stations map. No dark variant — this
// picker must never render a black/dark basemap, light only, always.
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

// The Discover Albania pin: coral teardrop, white core — used both as the
// hover cursor (so the map previews exactly where a click will land) and as
// the dropped marker, instead of Google's default red icon/grab-hand cursor.
function pinSvg(scale: number) {
  const size = Math.round(24 * scale);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#e2543c" stroke="#ffffff" stroke-width="1"/>
      <circle cx="12" cy="10" r="3.2" fill="#ffffff"/>
    </svg>
  `;
}

function pinDataUrl(scale: number) {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(scale));
}

// Hotspot near the pin's bottom tip, scaled with the icon, so the cursor and
// marker both "touch down" exactly where the point renders, not centered.
function pinCursor(scale: number) {
  const tipX = Math.round(12 * scale);
  const tipY = Math.round(22 * scale);
  return `url("${pinDataUrl(scale)}") ${tipX} ${tipY}, pointer`;
}

/** Steps the zoom level in instead of snapping, so a search result's pan+zoom reads as one smooth motion. */
function smoothZoomTo(map: google.maps.Map, targetZoom: number) {
  const current = Math.round(map.getZoom() ?? targetZoom);
  if (current === targetZoom) return;
  const step = current < targetZoom ? 1 : -1;
  let zoom = current;
  const timer = setInterval(() => {
    zoom += step;
    map.setZoom(zoom);
    if (zoom === targetZoom) clearInterval(timer);
  }, 110);
}

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerModalProps {
  title: string;
  searchPlaceholder: string;
  hintLabel: string;
  coordinatesLabel: string;
  confirmLabel: string;
  closeLabel: string;
  resolvingLabel: string;
  unavailableLabel: string;
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

export function LocationPickerModal({
  title,
  searchPlaceholder,
  hintLabel,
  coordinatesLabel,
  confirmLabel,
  closeLabel,
  resolvingLabel,
  unavailableLabel,
  onConfirm,
  onClose,
}: LocationPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [picked, setPicked] = useState<google.maps.LatLngLiteral | null>(null);
  const [resolving, setResolving] = useState(false);
  const [mapError, setMapError] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !containerRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let unpinSearch: (() => void) | undefined;
    ensureGoogleMapsOptions();

    function placePin(map: google.maps.Map, position: google.maps.LatLngLiteral, animateDrop: boolean) {
      setPicked(position);
      if (markerRef.current) {
        markerRef.current.setPosition(position);
      } else {
        markerRef.current = new google.maps.Marker({
          map,
          position,
          icon: { url: pinDataUrl(1.4), scaledSize: new google.maps.Size(34, 34), anchor: new google.maps.Point(17, 32) },
          animation: animateDrop ? google.maps.Animation.DROP : undefined,
        });
      }
    }

    Promise.all([importLibrary("maps"), importLibrary("geocoding"), importLibrary("places")])
      .then(([{ Map }]) => {
        if (cancelled || !containerRef.current) return;
        const map = new Map(containerRef.current, {
          center: ALBANIA_CENTER,
          zoom: 8,
          styles: LIGHT_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          draggableCursor: pinCursor(1.4),
        });
        mapRef.current = map;
        geocoderRef.current = new google.maps.Geocoder();

        // This dialog sizes its map area with flexbox (so the whole modal
        // fits any viewport height — see the fit fix below), which means
        // the container's true pixel size isn't known at construction time.
        // Google Maps only tiles correctly for the size it saw when built,
        // and never watches for later resizes on its own, so without this
        // it silently renders blank. Re-measuring on every observed resize
        // (dialog open, window resize, etc.) keeps it painted correctly.
        const center = map.getCenter();
        resizeObserver = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize");
          if (center) map.setCenter(center);
        });
        resizeObserver.observe(containerRef.current);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          placePin(map, { lat: e.latLng.lat(), lng: e.latLng.lng() }, true);
        });

        if (searchInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: "al" },
            fields: ["geometry", "formatted_address"],
          });
          unpinSearch = pinAutocompleteDropdownBelow(searchInputRef.current);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location;
            if (!location) return;
            map.panTo(location);
            smoothZoomTo(map, PICKED_ZOOM);
            placePin(map, { lat: location.lat(), lng: location.lng() }, true);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      unpinSearch?.();
    };
  }, []);

  function handleConfirm() {
    if (!picked || !geocoderRef.current) return;
    setResolving(true);
    geocoderRef.current.geocode({ location: picked }, (results, status) => {
      setResolving(false);
      const address = status === "OK" && results?.[0] ? results[0].formatted_address : `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`;
      onConfirm({ address, lat: picked.lat, lng: picked.lng });
    });
  }

  // Portalled to <body>: this opens from inside the hero's ScrollReveal
  // wrapper, which leaves a lingering `transform` on itself after its
  // entrance animation (fill-mode "both"). Any transform on an ancestor
  // turns it into the containing block for `position: fixed` descendants,
  // so without the portal this dialog would center against that ancestor's
  // box instead of the real viewport.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div className="animate-sheet-fade fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]" aria-hidden="true" {...tapToDismiss(onClose)} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up relative flex h-[min(680px,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] border border-white/70 bg-surface shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:animate-fade-up sm:h-[min(680px,92dvh)] sm:rounded-[2rem]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-[linear-gradient(135deg,#f1f9f7_0%,#ffffff_80%)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal text-white shadow-[0_8px_18px_rgba(0,128,128,0.18)]">
              <MapPinIcon width={17} height={17} />
            </span>
            <h2 className="font-display text-lg font-black tracking-[-0.02em] text-brand-navy">{title}</h2>
          </div>
          <button
            type="button"
            {...tapToDismiss(onClose)}
            aria-label={closeLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8e7] bg-white text-muted shadow-sm transition-colors hover:text-brand-navy"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="relative min-h-[240px] w-full flex-1">
          {!hasGoogleMapsApiKey || mapError ? (
            <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-sm text-muted">{unavailableLabel}</div>
          ) : (
            <>
              <div ref={containerRef} className="h-full w-full" />

              <div className="absolute inset-x-3 top-3 z-10 sm:inset-x-4 sm:top-4">
                <div className="relative">
                  <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    className="min-h-12 w-full rounded-2xl border border-white/70 bg-surface/95 py-2.5 pl-10 pr-4 text-sm font-medium shadow-[0_12px_32px_rgba(7,52,60,0.16)] outline-none backdrop-blur-md transition-all focus:border-teal focus:shadow-[var(--shadow-glow-teal)]"
                  />
                </div>
              </div>

              {!picked && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-center text-xs font-medium text-foreground shadow-[var(--shadow-sm)]">
                    <MapPinIcon width={13} height={13} className="text-coral" />
                    {hintLabel}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white p-4 sm:px-6 sm:py-5">
          <p className="min-w-0 truncate text-xs text-muted">
            {picked && (
              <>
                <span className="font-medium text-foreground">{coordinatesLabel}:</span> {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!picked || resolving}
            className="relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-teal px-6 font-semibold text-white shadow-[0_10px_24px_rgba(0,128,128,0.2)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-teal-hover hover:shadow-[0_14px_30px_rgba(0,128,128,0.26)] active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {resolving ? resolvingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
