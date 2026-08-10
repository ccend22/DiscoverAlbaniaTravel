"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { importLibrary } from "@googlemaps/js-api-loader";
import { requestTaxiAction } from "@/app/(site)/taxi/actions";
import { Alert } from "@/components/ui/alert";
import { AlertCircleIcon, ArrowRightIcon, CheckCircleIcon, CloseIcon, LocateIcon, MapPinIcon } from "./icons";
import { LocationPickerModal, type PickedLocation } from "./location-picker-modal";
import { PlacesAutocompleteInput } from "./places-autocomplete-input";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM, type Coordinates } from "@/lib/taxi-service";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";

interface TaxiDefaults {
  pickup?: string;
  destination?: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

interface TaxiQuickFormProps {
  dict: Dictionary;
  user: { name: string; phone: string | null; email: string } | null;
  error?: string;
  variant?: "solid" | "glass";
  defaults?: TaxiDefaults;
}

const CONTAINER_STYLES: Record<"solid" | "glass", string> = {
  solid: "border-[#dce8e6] bg-white shadow-[var(--page-shadow)]",
  glass: "border-white/80 bg-white/95 shadow-[0_26px_64px_rgba(0,24,32,0.2)] backdrop-blur-xl",
};

type ActivePicker = "pickup" | "destination" | null;

function validCoordinates(lat?: number, lng?: number): Coordinates | null {
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat!, lng: lng! } : null;
}

interface EligibilityModalProps {
  kind: "too-short" | "unverified";
  distanceKm: number | null;
  pickupLocation: string;
  destination: string;
  dict: Dictionary["taxiQuickForm"];
  onClose: () => void;
  onAdjust: () => void;
}

function EligibilityModal({ kind, distanceKm, pickupLocation, destination, dict, onClose, onAdjust }: EligibilityModalProps) {
  useBodyScrollLock(true);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const isTooShort = kind === "too-short";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div
        className="animate-sheet-fade fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]"
        aria-hidden="true"
        {...tapToDismiss(onClose)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="taxi-eligibility-title"
        className="overlay-scroll animate-sheet-up relative max-h-[100dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[1.5rem] border border-white/70 bg-white shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:animate-fade-up sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[2rem]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative overflow-hidden bg-[linear-gradient(145deg,#eef8f6_0%,#ffffff_72%)] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[24px] border-teal/5" aria-hidden="true" />
          <button
            type="button"
            {...tapToDismiss(onClose)}
            aria-label={dict.closeDialog}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8e7] bg-white/90 text-muted shadow-sm transition-colors hover:text-brand-navy"
          >
            <CloseIcon width={16} height={16} />
          </button>

          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${isTooShort ? "bg-coral-soft text-coral" : "bg-teal-soft text-teal"}`}>
            {isTooShort ? <AlertCircleIcon width={21} height={21} /> : <MapPinIcon width={21} height={21} />}
          </span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-teal">{dict.eligibilityModalKicker}</p>
          <h2 id="taxi-eligibility-title" className="mt-2 max-w-md pr-5 font-display text-2xl font-black leading-[1.04] tracking-[-0.035em] text-brand-navy sm:pr-0 sm:text-3xl">
            {isTooShort ? dict.tooShortModalTitle : dict.unverifiedModalTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {isTooShort
              ? formatMessage(dict.tooShortModalBody, { min: MIN_INTERCITY_TAXI_DISTANCE_KM })
              : dict.unverifiedModalBody}
          </p>
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          {(pickupLocation || destination) && (
            <div className="rounded-2xl border border-[#e1e9e8] bg-[#f8fbfa] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{dict.selectedJourney}</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-brand-navy">
                <span className="min-w-0 flex-1 truncate">{pickupLocation || "—"}</span>
                <ArrowRightIcon width={14} height={14} className="shrink-0 text-teal" />
                <span className="min-w-0 flex-1 truncate text-right">{destination || "—"}</span>
              </div>
              {isTooShort && distanceKm !== null && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e1e9e8] pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{dict.measuredDistance}</p>
                    <p className="mt-1 font-display text-2xl font-black text-coral">{Math.round(distanceKm)} km</p>
                  </div>
                  <div className="border-l border-[#e1e9e8] pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{dict.requiredDistance}</p>
                    <p className="mt-1 font-display text-2xl font-black text-brand-navy">{MIN_INTERCITY_TAXI_DISTANCE_KM} km</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
            <button type="button" onClick={onAdjust} className="public-primary-action min-h-12 flex-1 px-5 text-sm">
              {dict.adjustRoute}
            </button>
            <Link href="/routes" className="public-secondary-action min-h-12 flex-1 px-5 text-sm" onClick={onClose}>
              {dict.browseBusRoutes}
            </Link>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function TaxiQuickForm({ dict, user, error, variant = "solid", defaults }: TaxiQuickFormProps) {
  const tq = dict.taxiQuickForm;
  const tf = dict.taxiForm;
  const lp = dict.locationPicker;
  const [pickupLocation, setPickupLocation] = useState(defaults?.pickup ?? "");
  const [destination, setDestination] = useState(defaults?.destination ?? "");
  const [pickupCoordinates, setPickupCoordinates] = useState<Coordinates | null>(() =>
    validCoordinates(defaults?.pickupLat, defaults?.pickupLng)
  );
  const [destinationCoordinates, setDestinationCoordinates] = useState<Coordinates | null>(() =>
    validCoordinates(defaults?.destinationLat, defaults?.destinationLng)
  );
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [locating, setLocating] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [eligibilityModal, setEligibilityModal] = useState<"too-short" | "unverified" | null>(null);

  const distanceKm = useMemo(
    () =>
      pickupCoordinates && destinationCoordinates
        ? calculateDistanceKm(pickupCoordinates, destinationCoordinates)
        : null,
    [pickupCoordinates, destinationCoordinates]
  );
  const routeIsEligible = distanceKm !== null && distanceKm >= MIN_INTERCITY_TAXI_DISTANCE_KM;

  function handlePicked(location: PickedLocation) {
    if (activePicker === "pickup") {
      setPickupLocation(location.address);
      setPickupCoordinates({ lat: location.lat, lng: location.lng });
      setLocationEnabled(false);
    } else if (activePicker === "destination") {
      setDestination(location.address);
      setDestinationCoordinates({ lat: location.lat, lng: location.lng });
    }
    setActivePicker(null);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPickupCoordinates({ lat: latitude, lng: longitude });
        if (!hasGoogleMapsApiKey) {
          setPickupLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLocating(false);
          setLocationEnabled(true);
          return;
        }
        ensureGoogleMapsOptions();
        await importLibrary("geocoding");
        new google.maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          setLocating(false);
          const address = status === "OK" && results?.[0] ? results[0].formatted_address : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setPickupLocation(address);
          setLocationEnabled(true);
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!pickupCoordinates || !destinationCoordinates) {
      event.preventDefault();
      setEligibilityModal("unverified");
      return;
    }
    if (!routeIsEligible) {
      event.preventDefault();
      setEligibilityModal("too-short");
    }
  }

  const routeStatus = (() => {
    if (distanceKm === null) {
      return { tone: "neutral", Icon: MapPinIcon, title: tq.selectLocationsHint };
    }
    if (routeIsEligible) {
      return {
        tone: "success",
        Icon: CheckCircleIcon,
        title: tq.routeReadyTitle,
      };
    }
    return {
      tone: "danger",
      Icon: AlertCircleIcon,
      title: tq.routeTooShortTitle,
    };
  })();

  return (
    <>
      <form
        action={requestTaxiAction}
        onSubmit={handleSubmit}
        className={`relative isolate mx-auto w-full max-w-5xl overflow-hidden rounded-[1.5rem] border p-4 sm:rounded-[2rem] sm:p-7 ${CONTAINER_STYLES[variant]}`}
      >
        <input type="hidden" name="pickupLatitude" value={pickupCoordinates?.lat ?? ""} />
        <input type="hidden" name="pickupLongitude" value={pickupCoordinates?.lng ?? ""} />
        <input type="hidden" name="destinationLatitude" value={destinationCoordinates?.lat ?? ""} />
        <input type="hidden" name="destinationLongitude" value={destinationCoordinates?.lng ?? ""} />

        <div className="flex items-start justify-between gap-3 border-b border-[#e5edec] pb-4 sm:items-center sm:pb-5">
          <div className="flex min-w-0 gap-3.5">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal text-white shadow-[0_10px_24px_rgba(0,128,128,0.2)] sm:flex">
              <MapPinIcon width={19} height={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-black tracking-[-0.03em] text-brand-navy sm:text-2xl">{tq.title}</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">{tq.subtitle}</p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-teal/15 bg-teal-soft px-2.5 py-1.5 text-[10px] font-bold text-teal sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-teal" />
            {formatMessage(tq.minimumBadge, { min: MIN_INTERCITY_TAXI_DISTANCE_KM })}
          </span>
        </div>

        {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

        <div className="mt-4 grid items-end gap-3 sm:mt-5 lg:grid-cols-[1fr_auto_1fr]">
          <label className="block min-w-0">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.fromLabel}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-teal-soft text-teal">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-teal bg-white" />
              </span>
              <PlacesAutocompleteInput
                name="pickupLocation"
                required
                value={pickupLocation}
                onChange={(next) => {
                  setPickupLocation(next);
                  setPickupCoordinates(null);
                  setLocationEnabled(false);
                }}
                onPlaceSelect={(place) => {
                  setPickupCoordinates({ lat: place.lat, lng: place.lng });
                }}
                placeholder={tf.pickupLocationPlaceholder}
                className="public-input min-h-14 w-full rounded-2xl py-3 pl-14 pr-24 text-base font-semibold sm:text-sm"
              />
              <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 gap-1">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  aria-label={tq.useCurrentLocationAria}
                  aria-pressed={locationEnabled}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${locationEnabled ? "bg-lime text-lime-foreground" : "text-teal hover:bg-teal-soft"}`}
                >
                  <LocateIcon width={16} height={16} className={locating ? "animate-pulse" : undefined} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pickupLocation) {
                      setPickupLocation("");
                      setPickupCoordinates(null);
                      setLocationEnabled(false);
                    } else setActivePicker("pickup");
                  }}
                  aria-label={pickupLocation ? tq.clearAria : tq.mapPickerAria}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-teal transition-colors hover:bg-teal-soft"
                >
                  {pickupLocation ? <CloseIcon width={15} height={15} /> : <MapPinIcon width={16} height={16} />}
                </button>
              </div>
            </div>
          </label>

          <span className="mb-2 hidden h-10 w-10 items-center justify-center rounded-full border border-[#dce8e6] bg-white text-teal shadow-sm lg:flex" aria-hidden="true">
            <ArrowRightIcon width={16} height={16} />
          </span>

          <label className="block min-w-0">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.toLabel}</span>
            <div className="relative">
              <MapPinIcon width={17} height={17} className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-coral" />
              <PlacesAutocompleteInput
                name="destination"
                required
                value={destination}
                onChange={(next) => {
                  setDestination(next);
                  setDestinationCoordinates(null);
                }}
                onPlaceSelect={(place) => {
                  setDestinationCoordinates({ lat: place.lat, lng: place.lng });
                }}
                placeholder={tf.destinationPlaceholder}
                className="public-input min-h-14 w-full rounded-2xl py-3 pl-12 pr-14 text-base font-semibold sm:text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (destination) {
                    setDestination("");
                    setDestinationCoordinates(null);
                  } else setActivePicker("destination");
                }}
                aria-label={destination ? tq.clearAria : tq.mapPickerAria}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-teal transition-colors hover:bg-teal-soft"
              >
                {destination ? <CloseIcon width={15} height={15} /> : <MapPinIcon width={16} height={16} />}
              </button>
            </div>
          </label>
        </div>

        <div
          aria-live="polite"
          className={`mt-3 rounded-2xl border px-4 py-3 ${
            routeStatus.tone === "success"
              ? "border-success/20 bg-success-soft/70"
              : routeStatus.tone === "danger"
                ? "border-coral/20 bg-[#fff7f4]"
                : "border-[#dfe8e7] bg-[#f7faf9]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              routeStatus.tone === "success" ? "bg-white text-success" : routeStatus.tone === "danger" ? "bg-white text-coral" : "bg-white text-teal"
            }`}>
              <routeStatus.Icon width={16} height={16} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-brand-navy">{routeStatus.title}</p>
              {distanceKm !== null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black tabular-nums text-brand-navy shadow-sm">{Math.round(distanceKm)} km</span>}
            </div>
          </div>
          {distanceKm !== null && (
            <div className="mt-2.5 pl-11">
              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-expo)] ${routeIsEligible ? "bg-success" : "bg-coral"}`}
                  style={{ width: `${Math.min(100, (distanceKm / MIN_INTERCITY_TAXI_DISTANCE_KM) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 border-t border-[#e5edec] pt-5 md:grid-cols-[minmax(14rem,1fr)_auto] md:items-end">
          <label className="block max-w-md">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tf.phoneNumber}</span>
            <input
              name="passengerPhone"
              type="tel"
              required
              minLength={6}
              autoComplete="tel"
              defaultValue={user?.phone ?? ""}
              placeholder={tf.phoneNumberPlaceholder}
              className="public-input min-h-14 w-full rounded-2xl px-4 py-3 text-base font-semibold sm:text-sm"
            />
          </label>

          <button
            type="submit"
            className="public-primary-action min-h-14 w-full px-7 text-sm md:w-auto"
          >
            <span>{tf.sendRequest}</span>
            <ArrowRightIcon width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      </form>

      {activePicker && (
        <LocationPickerModal
          title={activePicker === "pickup" ? lp.pickupTitle : lp.destinationTitle}
          searchPlaceholder={lp.searchPlaceholder}
          hintLabel={lp.hint}
          coordinatesLabel={lp.coordinatesLabel}
          confirmLabel={lp.confirm}
          closeLabel={lp.close}
          resolvingLabel={lp.resolving}
          unavailableLabel={lp.unavailable}
          onClose={() => setActivePicker(null)}
          onConfirm={handlePicked}
        />
      )}

      {eligibilityModal && (
        <EligibilityModal
          kind={eligibilityModal}
          distanceKm={distanceKm}
          pickupLocation={pickupLocation}
          destination={destination}
          dict={tq}
          onClose={() => setEligibilityModal(null)}
          onAdjust={() => {
            setEligibilityModal(null);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="destination"]')?.focus());
          }}
        />
      )}
    </>
  );
}
