"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { importLibrary } from "@googlemaps/js-api-loader";
import { requestTaxiAction } from "@/app/(site)/taxi/actions";
import { Alert } from "@/components/ui/alert";
import { AlertCircleIcon, ArrowRightIcon, CheckCircleIcon, CloseIcon, LocateIcon, MapPinIcon, SwapIcon } from "./icons";
import { LocationPickerPanel, type PickedLocation } from "./location-picker-modal";
import { PlacesAutocompleteInput } from "./places-autocomplete-input";
import { DatePicker } from "./date-picker";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM, MIN_TAXI_LEAD_TIME_HOURS, type Coordinates } from "@/lib/taxi-service";
import { estimateTaxiPriceEur } from "@/lib/taxi-pricing";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { GeolocationFailure, getReliableCurrentPosition, type GeolocationFailureReason } from "@/lib/mobile-geolocation";
import { albaniaLocalDateTimeToDate, getAlbaniaDateInputValue } from "@/lib/timezone";
import type { Locale } from "@/lib/locale";

const ALBANIA_TIME_ZONE = "Europe/Tirane";

/** A comfortably-valid starting point (an hour past the minimum) so the form doesn't load with an invalid or empty pickup time. */
function getDefaultPickup(): { date: string; time: string } {
  const target = new Date(Date.now() + (MIN_TAXI_LEAD_TIME_HOURS + 1) * 60 * 60 * 1000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ALBANIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(target)
      .map((part) => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

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
  locale: Locale;
  user: { name: string; phone: string | null; email: string } | null;
  error?: string;
  variant?: "solid" | "glass";
  defaults?: TaxiDefaults;
  /**
   * Skips this form's own border/background/shadow/padding so a parent can
   * own one persistent card shell around it — used by HeroBookingWidget so
   * switching bus/taxi swaps only the fields, not the whole card.
   */
  bare?: boolean;
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

export function TaxiQuickForm({ dict, locale, user, error, variant = "solid", defaults, bare = false }: TaxiQuickFormProps) {
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
  const [locationFailure, setLocationFailure] = useState<GeolocationFailureReason | null>(null);
  const [eligibilityModal, setEligibilityModal] = useState<"too-short" | "unverified" | null>(null);
  const [defaultPickupDateTime] = useState(getDefaultPickup);
  const [pickupDate, setPickupDate] = useState(defaultPickupDateTime.date);
  const [pickupDateSelected, setPickupDateSelected] = useState(false);
  const [pickupTime, setPickupTime] = useState(defaultPickupDateTime.time);
  const [pickupTimeError, setPickupTimeError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);
  const [swapPulse, setSwapPulse] = useState(false);
  const todayAlbania = useMemo(() => getAlbaniaDateInputValue(), []);

  const distanceKm = useMemo(
    () =>
      pickupCoordinates && destinationCoordinates
        ? calculateDistanceKm(pickupCoordinates, destinationCoordinates)
        : null,
    [pickupCoordinates, destinationCoordinates]
  );
  const routeIsEligible = distanceKm !== null && distanceKm >= MIN_INTERCITY_TAXI_DISTANCE_KM;
  const priceEstimate = useMemo(
    () => (routeIsEligible ? estimateTaxiPriceEur(pickupLocation, destination, distanceKm) : null),
    [routeIsEligible, pickupLocation, destination, distanceKm]
  );

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

  function handlePickupDateChange(next: string) {
    setPickupDate(next);
    setPickupDateSelected(true);
  }

  function handleSwapLocations() {
    const prevPickupLocation = pickupLocation;
    const prevPickupCoordinates = pickupCoordinates;
    setPickupLocation(destination);
    setPickupCoordinates(destinationCoordinates);
    setDestination(prevPickupLocation);
    setDestinationCoordinates(prevPickupCoordinates);
    setLocationEnabled(false);
    setSwapRotation((rotation) => rotation + 180);
    setSwapPulse(true);
    window.setTimeout(() => setSwapPulse(false), 320);
  }

  async function handleUseCurrentLocation() {
    setLocationFailure(null);
    setLocating(true);
    try {
      const position = await getReliableCurrentPosition();
      const { latitude, longitude } = position.coords;
      const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setPickupCoordinates({ lat: latitude, lng: longitude });
      setPickupLocation(coordinateLabel);
      setLocationEnabled(true);

      if (hasGoogleMapsApiKey) {
        try {
          ensureGoogleMapsOptions();
          await importLibrary("geocoding");
          const address = await new Promise<string>((resolve) => {
            new google.maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              resolve(status === "OK" && results?.[0] ? results[0].formatted_address : coordinateLabel);
            });
          });
          setPickupLocation(address);
        } catch {
          // Coordinates are already a valid, usable fallback.
        }
      }
    } catch (error) {
      setLocationEnabled(false);
      setLocationFailure(error instanceof GeolocationFailure ? error.reason : "unavailable");
    } finally {
      setLocating(false);
    }
  }

  const currentLocationError =
    locationFailure === "denied"
      ? tq.currentLocationDenied
      : locationFailure === "insecure"
        ? tq.currentLocationInsecure
        : tq.currentLocationError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!pickupCoordinates || !destinationCoordinates) {
      event.preventDefault();
      setEligibilityModal("unverified");
      return;
    }
    if (!routeIsEligible) {
      event.preventDefault();
      setEligibilityModal("too-short");
      return;
    }
    const earliestAllowed = Date.now() + MIN_TAXI_LEAD_TIME_HOURS * 60 * 60 * 1000;
    if (albaniaLocalDateTimeToDate(pickupDate, pickupTime).getTime() < earliestAllowed) {
      event.preventDefault();
      setPickupTimeError(formatMessage(tq.minLeadTimeError, { hours: MIN_TAXI_LEAD_TIME_HOURS }));
      return;
    }
    setPickupTimeError(null);
  }

  const routeStatus = routeIsEligible
    ? { tone: "success" as const, Icon: CheckCircleIcon, title: tq.routeReadyTitle }
    : { tone: "danger" as const, Icon: AlertCircleIcon, title: tq.routeTooShortTitle };

  return (
    <>
      <form
        action={requestTaxiAction}
        onSubmit={handleSubmit}
        className={
          bare
            ? "relative isolate mx-auto w-full max-w-5xl"
            : `relative isolate mx-auto w-full max-w-5xl overflow-hidden rounded-[1.5rem] border p-4 sm:rounded-[2rem] sm:p-7 ${CONTAINER_STYLES[variant]}`
        }
      >
        <input type="hidden" name="pickupLatitude" value={pickupCoordinates?.lat ?? ""} />
        <input type="hidden" name="pickupLongitude" value={pickupCoordinates?.lng ?? ""} />
        <input type="hidden" name="destinationLatitude" value={destinationCoordinates?.lat ?? ""} />
        <input type="hidden" name="destinationLongitude" value={destinationCoordinates?.lng ?? ""} />

        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

        <div className="relative grid gap-1.5 rounded-[1.5rem] bg-[#edf4f3] p-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(340px,1.05fr)] lg:items-stretch lg:gap-2">
          <div className={`relative flex flex-col rounded-[1.1rem] bg-white transition-transform duration-300 ease-[var(--ease-out-expo)] lg:contents ${swapPulse ? "scale-[1.008]" : ""}`}>
            <label className="relative block min-w-0 px-3 py-2 transition-shadow duration-200 lg:rounded-[1.1rem] lg:bg-white lg:px-3.5 lg:py-2.5 lg:focus-within:z-[70] lg:focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.fromLabel}</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-teal-soft text-teal">
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
                  className="min-h-11 w-full truncate rounded-lg border-0 bg-transparent py-1 pl-11 pr-20 text-base font-semibold text-brand-navy shadow-none outline-none sm:text-sm"
                />
                <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 gap-0.5">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    aria-label={tq.useCurrentLocationAria}
                    aria-pressed={locationEnabled}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${locationEnabled ? "bg-lime text-lime-foreground" : "text-teal hover:bg-teal-soft"}`}
                  >
                    <LocateIcon width={16} height={16} className={locating ? "animate-pulse" : undefined} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pickupLocation && hasGoogleMapsApiKey) {
                        setPickupLocation("");
                        setPickupCoordinates(null);
                        setLocationEnabled(false);
                      } else setActivePicker("pickup");
                    }}
                    aria-label={pickupLocation && hasGoogleMapsApiKey ? tq.clearAria : tq.mapPickerAria}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-teal transition-colors hover:bg-teal-soft"
                  >
                    {pickupLocation && hasGoogleMapsApiKey ? <CloseIcon width={15} height={15} /> : <MapPinIcon width={16} height={16} />}
                  </button>
                </div>
              </div>
            </label>

            <div className="mx-3 border-t border-[#dfe9e7] lg:hidden" />

            <button
              type="button"
              onClick={handleSwapLocations}
              aria-label={tq.swapAria}
              style={{ transform: `rotate(${swapRotation}deg)` }}
              className="absolute right-3 top-1/2 z-50 flex h-10 w-10 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#edf4f3] bg-white text-teal shadow-sm transition-[transform,background-color,color] duration-500 ease-[var(--ease-spring)] hover:bg-teal hover:text-white lg:static lg:mx-auto lg:translate-y-0 lg:self-center xl:-mx-4"
            >
              <SwapIcon width={16} height={16} />
            </button>

            <label className="relative block min-w-0 px-3 py-2 transition-shadow duration-200 lg:rounded-[1.1rem] lg:bg-white lg:px-3.5 lg:py-2.5 lg:focus-within:z-[70] lg:focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.toLabel}</span>
              <div className="relative">
                <MapPinIcon width={17} height={17} className="pointer-events-none absolute left-1 top-1/2 z-10 -translate-y-1/2 text-coral" />
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
                  className="min-h-11 w-full truncate rounded-lg border-0 bg-transparent py-1 pl-8 pr-12 text-base font-semibold text-brand-navy shadow-none outline-none sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (destination && hasGoogleMapsApiKey) {
                      setDestination("");
                      setDestinationCoordinates(null);
                    } else setActivePicker("destination");
                  }}
                  aria-label={destination && hasGoogleMapsApiKey ? tq.clearAria : tq.mapPickerAria}
                  className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-teal transition-colors hover:bg-teal-soft"
                >
                  {destination && hasGoogleMapsApiKey ? <CloseIcon width={15} height={15} /> : <MapPinIcon width={16} height={16} />}
                </button>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-[1.7fr_1fr] gap-1.5 lg:gap-2">
            <div className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white text-sm transition-shadow duration-200 has-[button:focus-visible]:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="px-3 pt-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.dateLabel}</span>
              <DatePicker
                name="pickupDate"
                value={pickupDate}
                min={todayAlbania}
                onChange={handlePickupDateChange}
                dict={dict.datePicker}
                locale={locale}
                dialogLabel={tq.pickupDateAria}
                inlineLabel={tq.dateLabel}
                hasSelection={pickupDateSelected}
                iconWrapperClassName="ml-3.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"
                buttonClassName="min-h-11 flex-1 truncate rounded-lg border-0 bg-transparent px-3 text-base font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent sm:text-sm"
              />
            </div>
            <label className="relative flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2 transition-shadow duration-200 focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.timeLabel}</span>
              <input
                type="time"
                name="pickupTime"
                required
                aria-label={tq.pickupTimeAria}
                value={pickupTime}
                suppressHydrationWarning
                onChange={(event) => {
                  setPickupTime(event.target.value);
                  setPickupTimeError(null);
                }}
                className="min-h-7 w-full border-0 bg-transparent p-0 text-base font-semibold text-brand-navy shadow-none outline-none sm:text-sm"
              />
            </label>
          </div>
        </div>

        <p className="mt-2 pl-1 text-xs text-muted">
          {formatMessage(tq.leadTimeCaption, { hours: MIN_TAXI_LEAD_TIME_HOURS })}
        </p>
        {pickupTimeError && (
          <p role="alert" className="mt-1 pl-1 text-xs font-medium text-red">
            {pickupTimeError}
          </p>
        )}

        {activePicker && (
          <div className="mt-4 animate-fade-up overflow-hidden rounded-2xl border border-[#dce8e6] bg-white shadow-[var(--page-shadow)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[linear-gradient(135deg,#f1f9f7_0%,#ffffff_80%)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal text-white shadow-[0_8px_18px_rgba(0,128,128,0.18)]">
                  <MapPinIcon width={15} height={15} />
                </span>
                <p className="text-sm font-bold text-brand-navy">{activePicker === "pickup" ? lp.pickupTitle : lp.destinationTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                aria-label={lp.close}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe8e7] bg-white text-muted shadow-sm transition-colors hover:text-brand-navy"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </div>
            <LocationPickerPanel
              searchPlaceholder={lp.searchPlaceholder}
              hintLabel={lp.hint}
              coordinatesLabel={lp.coordinatesLabel}
              confirmLabel={lp.confirm}
              resolvingLabel={lp.resolving}
              unavailableLabel={lp.unavailable}
              onConfirm={handlePicked}
              mapHeightClassName="h-[320px] sm:h-[380px]"
            />
          </div>
        )}

        {locationFailure && (
          <p role="alert" className="mt-2 text-xs font-medium text-red">
            {currentLocationError}
          </p>
        )}

        {distanceKm !== null && (
          <div
            aria-live="polite"
            className={`mt-3 rounded-2xl border px-4 py-3 ${
              routeStatus.tone === "success" ? "border-success/20 bg-success-soft/70" : "border-coral/20 bg-[#fff7f4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                routeStatus.tone === "success" ? "bg-white text-success" : "bg-white text-coral"
              }`}>
                <routeStatus.Icon width={16} height={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-brand-navy">{routeStatus.title}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black tabular-nums text-brand-navy shadow-sm">{Math.round(distanceKm)} km</span>
              </div>
            </div>
            <div className="mt-2.5 pl-11">
              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-expo)] ${routeIsEligible ? "bg-success" : "bg-coral"}`}
                  style={{ width: `${Math.min(100, (distanceKm / MIN_INTERCITY_TAXI_DISTANCE_KM) * 100)}%` }}
                />
              </div>
            </div>
            {priceEstimate && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-success/15 pl-11 pt-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{tq.estimatedFare}</p>
                <p className="font-display text-lg font-black text-brand-navy">~€{priceEstimate.priceEur}</p>
              </div>
            )}
          </div>
        )}
        {priceEstimate && <p className="mt-2 pl-1 text-xs text-muted">{tq.quoteNote}</p>}

        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          <label className="flex min-w-0 flex-1 flex-col justify-center rounded-[1.1rem] border border-[#dce8e6] bg-white px-3.5 py-2 transition-[box-shadow,border-color] duration-150 focus-within:border-teal focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tf.phoneNumber}</span>
            <input
              name="passengerPhone"
              type="tel"
              required
              minLength={6}
              autoComplete="tel"
              defaultValue={user?.phone ?? ""}
              placeholder={tf.phoneNumberPlaceholder}
              className="min-h-7 w-full border-0 bg-transparent p-0 text-base font-semibold text-brand-navy shadow-none outline-none sm:text-sm"
            />
          </label>

          {!showNote && (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="flex shrink-0 items-center rounded-[1.1rem] border border-dashed border-[#c9d9d7] px-4 text-sm font-semibold text-teal transition-colors hover:border-teal hover:bg-teal-soft"
            >
              {tf.addNote}
            </button>
          )}

          <button type="submit" className="public-primary-action min-h-14 shrink-0 flex-1 px-7 text-sm sm:min-w-[11rem] sm:flex-none">
            <span>{tf.sendRequest}</span>
            <ArrowRightIcon width={16} height={16} aria-hidden="true" />
          </button>
        </div>

        {showNote && (
          <label className="mt-2 block animate-fade-up rounded-[1.1rem] border border-[#dce8e6] bg-white px-3.5 py-2 transition-[box-shadow,border-color] duration-150 focus-within:border-teal focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
            <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <span>{tf.note}</span>
              <span className="flex items-center gap-2">
                <span className="normal-case tracking-normal text-muted/70">{notes.length}/500</span>
                <button
                  type="button"
                  onClick={() => {
                    setNotes("");
                    setShowNote(false);
                  }}
                  aria-label={tf.removeNote}
                  className="normal-case tracking-normal text-muted transition-colors hover:text-red"
                >
                  <CloseIcon width={12} height={12} />
                </button>
              </span>
            </span>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              autoFocus
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={tf.notePlaceholder}
              className="min-h-[2.5rem] w-full resize-none border-0 bg-transparent p-0 text-base font-medium leading-relaxed text-brand-navy shadow-none outline-none sm:text-sm"
            />
          </label>
        )}
      </form>

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
