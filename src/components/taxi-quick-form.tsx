"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { importLibrary } from "@googlemaps/js-api-loader";
import { requestTaxiAction } from "@/app/(site)/taxi/actions";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  LocateIcon,
  MapPinIcon,
  PlusIcon,
  SwapIcon,
  UsersIcon,
} from "./icons";
import { LocationPickerModal, type PickedLocation } from "./location-picker-modal";
import { PlacesAutocompleteInput } from "./places-autocomplete-input";
import { DatePicker } from "./date-picker";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM, MIN_TAXI_LEAD_TIME_HOURS, type Coordinates } from "@/lib/taxi-service";
import { estimateTaxiPriceEur, TAXI_PRICE_PER_KM_EUR } from "@/lib/taxi-pricing";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { GeolocationFailure, getReliableCurrentPosition, type GeolocationFailureReason } from "@/lib/mobile-geolocation";
import { albaniaLocalDateTimeToDate, getAlbaniaDateInputValue } from "@/lib/timezone";
import { findDirectTaxiRoute } from "@/lib/taxi-fares";
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

interface TaxiQuickFormProps {
  dict: Dictionary;
  locale: Locale;
  user: { name: string; phone: string | null; email: string } | null;
  error?: string;
  variant?: "solid" | "glass";
  /**
   * Skips the standalone outer shell so HeroBookingWidget can supply the
   * same white card used by the bus form.
   */
  bare?: boolean;
}

type ActivePicker = "pickup" | "destination" | null;
type LocationSource = "search" | "map" | "current" | "typed" | null;

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
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    requestAnimationFrame(() => dialog?.focus());

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus();
    };
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="taxi-eligibility-title"
        className="overlay-scroll animate-sheet-up relative max-h-[100dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white text-brand-navy shadow-[0_32px_90px_rgba(0,24,32,0.34)] outline-none sm:animate-fade-up sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
          <button
            type="button"
            {...tapToDismiss(onClose)}
            aria-label={dict.closeDialog}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#dce8e6] bg-white text-muted transition-colors hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            <CloseIcon width={16} height={16} />
          </button>

          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${isTooShort ? "bg-gold-soft text-gold" : "bg-teal-soft text-teal"}`}>
            {isTooShort ? <AlertCircleIcon width={21} height={21} /> : <MapPinIcon width={21} height={21} />}
          </span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-teal">{dict.eligibilityModalKicker}</p>
          <h2 id="taxi-eligibility-title" className="mt-2 max-w-md pr-5 font-display text-2xl font-black leading-[1.08] tracking-[-0.03em] text-brand-navy sm:pr-0 sm:text-3xl">
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
            <div className="rounded-xl bg-[#edf4f3] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{dict.selectedJourney}</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-brand-navy">
                <span className="min-w-0 flex-1 truncate">{pickupLocation || "—"}</span>
                <ArrowRightIcon width={14} height={14} className="shrink-0 text-teal" />
                <span className="min-w-0 flex-1 truncate text-right">{destination || "—"}</span>
              </div>
              {isTooShort && distanceKm !== null && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#dce8e6] pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{dict.measuredDistance}</p>
                    <p className="mt-1 text-2xl font-extrabold text-gold">{Math.round(distanceKm)} km</p>
                  </div>
                  <div className="border-l border-[#dce8e6] pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{dict.requiredDistance}</p>
                    <p className="mt-1 text-2xl font-extrabold text-brand-navy">{MIN_INTERCITY_TAXI_DISTANCE_KM} km</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
            <button type="button" onClick={onAdjust} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal px-5 text-sm font-bold text-white transition-[background-color,transform] hover:bg-teal-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
              {dict.adjustRoute}
            </button>
            <Link href="/routes" className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#dce8e6] bg-white px-5 text-sm font-bold text-brand-navy transition-colors hover:border-teal/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal" onClick={onClose}>
              {dict.browseBusRoutes}
            </Link>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function TaxiSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-teal px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.2)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-teal-hover hover:shadow-[0_14px_30px_rgba(0,128,128,0.26)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
    >
      <span>{pending ? pendingLabel : label}</span>
      {pending ? null : <ArrowRightIcon width={15} height={15} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </button>
  );
}

function LocationFieldTools({
  label,
  canClear,
  currentLocationLabel,
  mapLabel,
  clearLabel,
  locating,
  allowCurrentLocation,
  onCurrentLocation,
  onMap,
  onClear,
}: {
  label: string;
  canClear: boolean;
  currentLocationLabel: string;
  mapLabel: string;
  clearLabel: string;
  locating?: boolean;
  allowCurrentLocation?: boolean;
  onCurrentLocation?: () => void;
  onMap: () => void;
  onClear: () => void;
}) {
  function closeMenu(target: HTMLElement) {
    target.closest("details")?.removeAttribute("open");
  }

  return (
    <details className="group relative shrink-0">
      <summary
        aria-label={label}
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-teal-soft hover:text-teal focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden"
      >
        <ChevronDownIcon width={13} height={13} className="transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-52 overflow-hidden rounded-xl border border-[#dce8e6] bg-white p-1.5 shadow-[0_18px_44px_rgba(0,47,50,0.16)]">
        {allowCurrentLocation && onCurrentLocation && (
          <button
            type="button"
            disabled={locating}
            onClick={(event) => {
              closeMenu(event.currentTarget);
              onCurrentLocation();
            }}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-brand-navy transition-colors hover:bg-[#edf4f3] disabled:opacity-45"
          >
            <LocateIcon width={14} height={14} className={locating ? "animate-pulse text-teal" : "text-teal"} />
            {currentLocationLabel}
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event.currentTarget);
            onMap();
          }}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-brand-navy transition-colors hover:bg-[#edf4f3]"
        >
          <MapPinIcon width={14} height={14} className="text-teal" />
          {mapLabel}
        </button>
        {canClear && (
          <button
            type="button"
            onClick={(event) => {
              closeMenu(event.currentTarget);
              onClear();
            }}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-brand-navy transition-colors hover:bg-[#edf4f3]"
          >
            <CloseIcon width={14} height={14} className="text-muted" />
            {clearLabel}
          </button>
        )}
      </div>
    </details>
  );
}

export function TaxiQuickForm({ dict, locale, user, error, variant = "solid", bare = false }: TaxiQuickFormProps) {
  const tq = dict.taxiQuickForm;
  const tf = dict.taxiForm;
  const lp = dict.locationPicker;
  const sw = dict.searchWidget;
  const bp = dict.bookPage;
  const [actionState, formAction] = useActionState(requestTaxiAction, { status: "idle" });
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [devOverrideSrc, setDevOverrideSrc] = useState<string | null>(null);
  const router = useRouter();
  const actionError = actionState.status === "error" ? actionState.message : null;
  const showCheckout = actionState.status === "checkout";
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<Coordinates | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<Coordinates | null>(null);
  const [pickupSource, setPickupSource] = useState<LocationSource>(null);
  const [destinationSource, setDestinationSource] = useState<LocationSource>(null);
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
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);
  const todayAlbania = useMemo(() => getAlbaniaDateInputValue(), []);

  const distanceKm = useMemo(
    () =>
      pickupCoordinates && destinationCoordinates
        ? calculateDistanceKm(pickupCoordinates, destinationCoordinates)
        : null,
    [pickupCoordinates, destinationCoordinates]
  );
  const directRoute = useMemo(() => {
    const usesCustomPin = [pickupSource, destinationSource].some((source) => source === "map" || source === "current");
    return usesCustomPin ? null : findDirectTaxiRoute(pickupLocation, destination);
  }, [pickupLocation, destination, pickupSource, destinationSource]);
  const routeIsEligible = directRoute !== null || (distanceKm !== null && distanceKm >= MIN_INTERCITY_TAXI_DISTANCE_KM);
  const taxiPriceEstimate = useMemo(
    () => (routeIsEligible ? estimateTaxiPriceEur(distanceKm) : null),
    [routeIsEligible, distanceKm]
  );

  useEffect(() => {
    if (actionState.status !== "checkout") return;
    const requestReference = actionState.requestReference;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "pok-payment-return") return;
      if (event.data.reference === requestReference) {
        router.push(`/taxi/request/${requestReference}`);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [actionState, router]);

  function handlePicked(location: PickedLocation) {
    if (activePicker === "pickup") {
      setPickupLocation(location.address);
      setPickupCoordinates({ lat: location.lat, lng: location.lng });
      setPickupSource("map");
      setLocationEnabled(false);
    } else if (activePicker === "destination") {
      setDestination(location.address);
      setDestinationCoordinates({ lat: location.lat, lng: location.lng });
      setDestinationSource("map");
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
    const prevPickupSource = pickupSource;
    setPickupLocation(destination);
    setPickupCoordinates(destinationCoordinates);
    setPickupSource(destinationSource);
    setDestination(prevPickupLocation);
    setDestinationCoordinates(prevPickupCoordinates);
    setDestinationSource(prevPickupSource);
    setLocationEnabled(false);
    setSwapRotation((rotation) => rotation + 180);
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
      setPickupSource("current");
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
      event.currentTarget.querySelector<HTMLInputElement>('input[name="pickupTime"]')?.focus();
      return;
    }
    setPickupTimeError(null);
    if (!showContact) {
      event.preventDefault();
      setShowContact(true);
      requestAnimationFrame(() => document.getElementById("taxi-passenger-phone")?.focus());
    }
  }

  const hasVerifiedRoute = directRoute !== null || distanceKm !== null;
  const priceHeadline = taxiPriceEstimate
    ? `~€${taxiPriceEstimate.priceEur}`
    : hasVerifiedRoute
      ? tq.routeTooShortTitle
      : tq.priceWaitingTitle;
  const priceDetail = taxiPriceEstimate
    ? `${directRoute ? `${directRoute.routeName} · ` : ""}${Math.round(taxiPriceEstimate.km)} km · ${formatMessage(tq.mapPriceHint, { rate: TAXI_PRICE_PER_KM_EUR })}`
      : hasVerifiedRoute
        ? `${Math.round(distanceKm ?? 0)} km · ${formatMessage(tq.minimumBadge, { min: MIN_INTERCITY_TAXI_DISTANCE_KM })}`
        : tq.priceWaitingHint;
  const fareAmount = taxiPriceEstimate?.priceEur ?? null;
  const ui = locale === "al"
    ? {
        from: "Nga ku",
        to: "Për ku",
        distance: "Distancë",
        estimate: "Vlerësim",
        phone: "Telefoni",
        email: "Email-i",
        book: "Rezervo taksinë",
        complete: "Konfirmo rezervimin",
        detailsReady: "Plotëso detajet më poshtë",
        pickupOptions: "Opsionet e pikës së nisjes",
        destinationOptions: "Opsionet e destinacionit",
        pickupPlaceholder: "p.sh. Aeroporti i Tiranës",
        destinationPlaceholder: "p.sh. Durrës, Berat ose Ksamil",
      }
    : {
        from: "From",
        to: "To",
        distance: "Distance",
        estimate: "Estimate",
        phone: "Phone",
        email: "Email",
        book: "Book taxi",
        complete: "Confirm booking",
        detailsReady: "Complete the details below",
        pickupOptions: "Pickup options",
        destinationOptions: "Destination options",
        pickupPlaceholder: "e.g. Tirana Airport",
        destinationPlaceholder: "e.g. Durrës, Berat or Ksamil",
      };

  if (showCheckout && actionState.status === "checkout") {
    return (
      <div className="public-card flex animate-fade-up flex-col gap-2 p-3 sm:gap-3 sm:p-8">
        <p className="px-1 text-sm font-semibold text-brand-navy">{bp.completePaymentHeading}</p>
        <div className="relative h-[1010px] overflow-hidden rounded-[1.25rem] border border-[var(--page-line)] sm:h-[840px]">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col gap-3 bg-surface p-4" aria-busy="true" aria-live="polite">
              <span className="sr-only">{bp.loadingPayment}</span>
              <div className="h-16 w-full animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-12 w-full animate-pulse rounded-full bg-surface-sunken" />
              <div className="mt-1 flex flex-col gap-3">
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
                <div className="flex gap-3">
                  <div className="h-14 w-1/2 animate-pulse rounded-xl bg-surface-sunken" />
                  <div className="h-14 w-1/2 animate-pulse rounded-xl bg-surface-sunken" />
                </div>
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
              </div>
              <div className="mt-auto h-12 w-full animate-pulse rounded-full bg-surface-sunken" />
            </div>
          )}
          <iframe
            src={devOverrideSrc ?? actionState.confirmUrl}
            title={bp.completePaymentHeading}
            allow="payment"
            onLoad={() => setIframeLoaded(true)}
            className={`h-full w-full transition-opacity duration-[var(--dur-base)] ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={() =>
              setDevOverrideSrc(`/pay/return?ref=${encodeURIComponent(actionState.requestReference)}&embedded=1&dev=1`)
            }
            className="mt-1 rounded-xl border border-dashed border-warning/50 bg-warning-soft px-3 py-2 text-xs font-medium text-warning"
          >
            Dev only: simulate payment success (no real charge)
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <form
        action={formAction}
        onSubmit={handleSubmit}
        data-variant={variant}
        className={`taxi-console relative isolate mx-auto w-full text-brand-navy ${
          bare
            ? ""
            : "max-w-7xl rounded-[2rem] border border-[#dce8e6] bg-white p-3 shadow-[var(--page-shadow)] sm:p-4"
        }`}
      >
        <input type="hidden" name="pickupLatitude" value={pickupCoordinates?.lat ?? ""} />
        <input type="hidden" name="pickupLongitude" value={pickupCoordinates?.lng ?? ""} />
        <input type="hidden" name="destinationLatitude" value={destinationCoordinates?.lat ?? ""} />
        <input type="hidden" name="destinationLongitude" value={destinationCoordinates?.lng ?? ""} />
        <input type="hidden" name="pricingSource" value={directRoute ? "direct" : "map"} />

        {(actionError || error) && (
          <div role="alert" className="mb-3 rounded-[1.1rem] border border-coral/20 bg-coral-soft px-4 py-3 text-sm font-semibold text-coral">
            {actionError || error}
          </div>
        )}

        <div className="overflow-visible rounded-[1.5rem] bg-[#edf4f3] p-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(11rem,1fr)_auto_minmax(11rem,1fr)_minmax(9.5rem,.72fr)_minmax(7.5rem,.56fr)_minmax(12rem,.76fr)_auto] xl:items-stretch">
          <div className="relative flex flex-col rounded-[1.1rem] bg-white md:col-span-2 xl:contents">
            <label className="relative flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2 transition-shadow xl:col-span-1 xl:rounded-[1.1rem] xl:bg-white xl:focus-within:z-30 xl:focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{ui.from}</span>
              <div className="relative flex min-h-11 min-w-0 items-center pr-12 xl:pr-0">
                <span className={`absolute left-1 h-2.5 w-2.5 rounded-full bg-teal ${locationEnabled ? "shadow-[0_0_0_4px_rgba(0,128,128,0.12)]" : ""}`} aria-hidden="true" />
                <PlacesAutocompleteInput
                  id="taxi-pickup-location"
                  name="pickupLocation"
                  required
                  value={pickupLocation}
                  onChange={(next) => {
                    setPickupLocation(next);
                    setPickupCoordinates(null);
                    setPickupSource("typed");
                    setLocationEnabled(false);
                  }}
                  onPlaceSelect={(place) => {
                    setPickupCoordinates({ lat: place.lat, lng: place.lng });
                    setPickupSource("search");
                  }}
                  placeholder={ui.pickupPlaceholder}
                  countryRestriction="al"
                  className="taxi-location-input min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-6 pr-1 text-sm font-semibold text-brand-navy outline-none placeholder:text-muted"
                />
                <LocationFieldTools
                  label={ui.pickupOptions}
                  canClear={!!pickupLocation}
                  currentLocationLabel={tq.useCurrentLocationAria}
                  mapLabel={tq.mapPickerAria}
                  clearLabel={tq.clearAria}
                  locating={locating}
                  allowCurrentLocation
                  onCurrentLocation={handleUseCurrentLocation}
                  onMap={() => setActivePicker("pickup")}
                  onClear={() => {
                    setPickupLocation("");
                    setPickupCoordinates(null);
                    setPickupSource(null);
                    setLocationEnabled(false);
                  }}
                />
              </div>
            </label>

            <div className="mx-3 border-t border-[#e4edec] xl:hidden" aria-hidden="true" />

            <button
              type="button"
              onClick={handleSwapLocations}
              aria-label={tq.swapAria}
              title={tq.swapAria}
              style={{ transform: `rotate(${swapRotation}deg)` }}
              disabled={!pickupLocation && !destination}
              className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#edf4f3] bg-white text-teal shadow-sm transition-[background-color,color,transform] duration-200 hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:rotate-90 xl:static xl:mx-auto xl:h-11 xl:w-11 xl:translate-y-0 xl:self-center xl:[&_svg]:rotate-0"
            >
              <SwapIcon width={14} height={14} />
            </button>

            <label className="relative flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2 transition-shadow xl:col-span-1 xl:rounded-[1.1rem] xl:bg-white xl:focus-within:z-30 xl:focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{ui.to}</span>
              <div className="relative flex min-h-11 min-w-0 items-center pr-12 xl:pr-0">
                <span className="absolute left-1 h-2.5 w-2.5 rounded-full bg-coral" aria-hidden="true" />
                <PlacesAutocompleteInput
                  id="taxi-destination"
                  name="destination"
                  required
                  value={destination}
                  onChange={(next) => {
                    setDestination(next);
                    setDestinationCoordinates(null);
                    setDestinationSource("typed");
                  }}
                  onPlaceSelect={(place) => {
                    setDestinationCoordinates({ lat: place.lat, lng: place.lng });
                    setDestinationSource("search");
                  }}
                  placeholder={ui.destinationPlaceholder}
                  countryRestriction="al"
                  className="taxi-location-input min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-6 pr-1 text-sm font-semibold text-brand-navy outline-none placeholder:text-muted"
                />
                <LocationFieldTools
                  label={ui.destinationOptions}
                  canClear={!!destination}
                  currentLocationLabel={tq.useCurrentLocationAria}
                  mapLabel={tq.mapPickerAria}
                  clearLabel={tq.clearAria}
                  onMap={() => setActivePicker("destination")}
                  onClear={() => {
                    setDestination("");
                    setDestinationCoordinates(null);
                    setDestinationSource(null);
                  }}
                />
              </div>
            </label>
          </div>

            <div className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white text-sm">
              <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.dateLabel}</p>
              <div>
                <DatePicker
                  name="pickupDate"
                  value={pickupDate}
                  min={todayAlbania}
                  onChange={handlePickupDateChange}
                  dict={dict.datePicker}
                  locale={locale}
                  dialogLabel={tq.pickupDateAria}
                  hasSelection={pickupDateSelected}
                  labelFormat="short"
                  iconClassName="text-gold"
                  buttonClassName="[min-height:44px] w-full min-w-0 justify-start gap-2 rounded-lg border-0 bg-transparent px-3 text-sm font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent"
                />
              </div>
            </div>

            <label className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2 focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{tq.timeLabel}</span>
              <div className="flex min-h-11 items-center gap-2">
                <ClockIcon width={14} height={14} className="shrink-0 text-gold" aria-hidden="true" />
                <input
                  id="taxi-pickup-time"
                  type="time"
                  name="pickupTime"
                  required
                  aria-label={tq.pickupTimeAria}
                  aria-invalid={!!pickupTimeError}
                  value={pickupTime}
                  suppressHydrationWarning
                  onChange={(event) => {
                    setPickupTime(event.target.value);
                    setPickupTimeError(null);
                  }}
                  className="taxi-schedule-input min-h-[40px] min-w-0 w-full border-0 bg-transparent p-0 text-sm font-semibold text-brand-navy outline-none"
                />
              </div>
            </label>

            <div className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{sw.passengers}</p>
              <div className="flex h-11 items-center gap-1">
                <UsersIcon width={14} height={14} className="mr-1 shrink-0 text-teal" aria-hidden="true" />
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPassengers(count)}
                    aria-label={`${sw.passengers}: ${count}`}
                    aria-pressed={passengers === count}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-90 ${
                      passengers === count
                        ? "bg-teal text-white"
                        : "text-muted hover:bg-teal-soft hover:text-teal"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <input type="hidden" name="passengers" value={passengers} suppressHydrationWarning />
            </div>

            <div className="flex min-w-0 self-stretch items-center">
              {showContact ? (
                <div className="flex h-11 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-teal-soft px-4 text-center text-xs font-semibold text-teal">
                  <CheckCircleIcon width={14} height={14} />
                  {ui.detailsReady}
                </div>
              ) : (
                <TaxiSubmitButton label={ui.book} pendingLabel={tq.sendingRequest} />
              )}
            </div>
          </div>

          {locationFailure && <p role="alert" className="px-4 pb-2 pt-3 text-xs font-semibold text-coral">{currentLocationError}</p>}

          <div className="mt-2 flex min-h-[64px] flex-col gap-3 rounded-[1.1rem] bg-white px-4 py-3 sm:flex-row sm:items-center" aria-live="polite">
            {fareAmount !== null && routeIsEligible ? (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs text-muted">{ui.distance}</span>
                  <span className="truncate text-sm font-bold text-brand-navy">{distanceKm !== null ? `${Math.round(distanceKm)} km` : directRoute?.routeName}</span>
                </div>
                <div className="hidden h-4 w-px bg-[#dce8e6] sm:block" aria-hidden="true" />
                <span className="inline-flex w-fit items-center rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal">
                  €{TAXI_PRICE_PER_KM_EUR}/km
                </span>
                <div className="min-w-0 flex-1 text-xs text-muted sm:truncate">{priceDetail}</div>
                <div className="flex shrink-0 items-baseline gap-1 sm:ml-auto">
                  <span className="text-xs text-muted">{ui.estimate}</span>
                  <span className="font-display text-2xl font-black tabular-nums text-brand-navy">
                    €{new Intl.NumberFormat(locale === "al" ? "sq-AL" : "en-US", { maximumFractionDigits: 0 }).format(fareAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <p className={`text-sm font-bold ${hasVerifiedRoute && !routeIsEligible ? "text-gold" : "text-brand-navy"}`}>{priceHeadline}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted">{priceDetail}</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-1.5 px-4 pb-2 pt-3 text-[11px] leading-4 text-muted">
            <ClockIcon width={12} height={12} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            {formatMessage(tq.leadTimeCaption, { hours: MIN_TAXI_LEAD_TIME_HOURS })}
          </div>
          {pickupTimeError && <p role="alert" className="px-4 pb-2 text-xs font-semibold text-coral">{pickupTimeError}</p>}

          {showContact && (
            <div className="animate-fade-up mt-2 rounded-[1.1rem] bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="min-w-0">
                    <label htmlFor="taxi-passenger-phone" className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{ui.phone}</label>
                    <input
                      id="taxi-passenger-phone"
                      name="passengerPhone"
                      type="tel"
                      required={showContact}
                      minLength={6}
                      maxLength={24}
                      pattern="[0-9+ \(\)\.\-]{6,24}"
                      autoComplete="tel"
                      aria-describedby="taxi-phone-helper"
                      defaultValue={user?.phone ?? ""}
                      placeholder={tf.phoneNumberPlaceholder}
                      onInvalid={(event) => event.currentTarget.setCustomValidity(tq.invalidPhone)}
                      onInput={(event) => event.currentTarget.setCustomValidity("")}
                      className="mt-1.5 min-h-11 w-full rounded-[1.1rem] border border-[#dce8e6] bg-white px-3.5 text-sm font-semibold text-brand-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-teal/40 focus:border-teal focus:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]"
                    />
                    <p id="taxi-phone-helper" className="mt-1.5 text-[11px] leading-4 text-muted">{tq.phoneHelper}</p>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="taxi-passenger-email" className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{ui.email}</label>
                    <input
                      id="taxi-passenger-email"
                      name="passengerEmail"
                      type="email"
                      required={showContact}
                      autoComplete="email"
                      defaultValue={user?.email ?? ""}
                      placeholder="name@example.com"
                      className="mt-1.5 min-h-11 w-full rounded-[1.1rem] border border-[#dce8e6] bg-white px-3.5 text-sm font-semibold text-brand-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-teal/40 focus:border-teal focus:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]"
                    />
                    <p className="mt-1.5 text-[11px] leading-4 text-muted">{locale === "al" ? "Konfirmimi dërgohet në këtë email." : "Your confirmation is sent to this email."}</p>
                  </div>
                  <div className="w-full lg:w-52">
                    <TaxiSubmitButton label={ui.complete} pendingLabel={tq.sendingRequest} />
                    <p className="mt-1.5 text-center text-[11px] leading-4 text-muted">{tq.submitReassurance}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNote((visible) => !visible)}
                  aria-expanded={showNote}
                  aria-controls="taxi-trip-note"
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-muted transition-colors hover:text-teal"
                >
                  {showNote ? tf.removeNote : tf.addNote}
                  <PlusIcon width={14} height={14} className={`transition-transform duration-200 ${showNote ? "rotate-45" : ""}`} aria-hidden="true" />
                </button>

                {showNote && (
                  <div id="taxi-trip-note" className="animate-fade-up">
                    <label className="block pt-1">
                      <span className="sr-only">{tf.note}</span>
                      <textarea
                        name="notes"
                        rows={2}
                        maxLength={500}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder={tf.notePlaceholder}
                        className="block min-h-20 w-full resize-none rounded-[1.1rem] border border-[#dce8e6] bg-white px-3.5 py-3 text-sm leading-5 text-brand-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-teal/40 focus:border-teal focus:shadow-[0_0_0_3px_rgba(0,128,128,0.12)]"
                      />
                    </label>
                  </div>
                )}
            </div>
          )}
        </div>

      </form>

      {activePicker && (
        <LocationPickerModal
          title={activePicker === "pickup" ? lp.pickupTitle : lp.destinationTitle}
          closeLabel={lp.close}
          searchPlaceholder={lp.searchPlaceholder}
          hintLabel={lp.hint}
          coordinatesLabel={lp.coordinatesLabel}
          confirmLabel={lp.confirm}
          resolvingLabel={lp.resolving}
          unavailableLabel={lp.unavailable}
          onConfirm={handlePicked}
          onClose={() => setActivePicker(null)}
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
