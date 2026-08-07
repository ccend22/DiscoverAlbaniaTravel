"use client";

import { useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { requestTaxiAction } from "@/app/(site)/taxi/actions";
import { Alert } from "@/components/ui/alert";
import { CloseIcon, LocateIcon, MapPinIcon } from "./icons";
import { LocationPickerModal, type PickedLocation } from "./location-picker-modal";
import { PlacesAutocompleteInput } from "./places-autocomplete-input";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey } from "@/lib/google-maps-loader";
import type { Dictionary } from "@/lib/dictionary";

interface TaxiQuickFormProps {
  dict: Dictionary;
  user: { name: string; phone: string | null; email: string } | null;
  error?: string;
  variant?: "solid" | "glass";
}

const CONTAINER_STYLES: Record<"solid" | "glass", string> = {
  solid:
    "rounded-[2rem] border border-[#dce7ec] bg-white shadow-[0_24px_70px_rgba(5,43,52,0.14),0_2px_10px_rgba(5,43,52,0.06)]",
  glass:
    "rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] shadow-[0_30px_90px_rgba(0,24,32,0.24),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.35)] backdrop-blur-[28px] backdrop-saturate-150",
};

type ActivePicker = "pickup" | "destination" | null;

/**
 * Minimal taxi request: From, To, and a phone number — nothing else.
 * Pickup time is treated as "as soon as possible" and passenger name/email
 * are attached automatically from the signed-in account, if any.
 */
export function TaxiQuickForm({ dict, user, error, variant = "solid" }: TaxiQuickFormProps) {
  const tq = dict.taxiQuickForm;
  const tf = dict.taxiForm;
  const lp = dict.locationPicker;
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [locating, setLocating] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  function handlePicked(location: PickedLocation) {
    if (activePicker === "pickup") {
      setPickupLocation(location.address);
      setLocationEnabled(false);
    } else if (activePicker === "destination") setDestination(location.address);
    setActivePicker(null);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
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

  return (
    <>
      <form
        action={requestTaxiAction}
        className={`relative isolate flex flex-col gap-5 p-4 sm:p-6 lg:p-7 ${CONTAINER_STYLES[variant]}`}
      >
        <span
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
          aria-hidden="true"
        />
        {variant === "glass" && (
          <span
            className="pointer-events-none absolute left-8 right-16 top-1 h-16 rounded-full bg-gradient-to-b from-white/35 to-transparent blur-xl"
            aria-hidden="true"
          />
        )}

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-coral to-gold text-white shadow-[0_8px_20px_rgba(226,84,60,0.24)]">
            <MapPinIcon width={17} height={17} aria-hidden="true" />
          </span>
          <h2 className="font-display text-lg font-bold tracking-tight text-brand-navy">{tq.title}</h2>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="relative flex gap-3">
          <div className="flex w-6 flex-col items-center pb-5 pt-[39px]" aria-hidden="true">
            <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-sky bg-white shadow-sm" />
            <span className="flex flex-1 flex-col items-center justify-evenly py-1">
              <span className="h-1 w-1 rounded-full bg-teal/35" />
              <span className="h-1 w-1 rounded-full bg-teal/35" />
              <span className="h-1 w-1 rounded-full bg-teal/35" />
            </span>
            <MapPinIcon width={16} height={16} className="shrink-0 text-coral" />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky">{tq.fromLabel}</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    aria-label={tq.useCurrentLocationAria}
                    aria-pressed={locationEnabled}
                    className={`absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm transition-[background-color,color,box-shadow,transform] disabled:opacity-40 ${
                      locationEnabled ? "text-lime-strong ring-2 ring-lime/60" : "text-sky hover:text-teal hover:shadow-md"
                    }`}
                  >
                    <LocateIcon width={17} height={17} className={locating ? "animate-pulse" : undefined} />
                  </button>
                  <PlacesAutocompleteInput
                    name="pickupLocation"
                    required
                    value={pickupLocation}
                    onChange={(next) => {
                      setPickupLocation(next);
                      setLocationEnabled(false);
                    }}
                    placeholder={tf.pickupLocationPlaceholder}
                    className="min-h-14 w-full rounded-2xl border border-[#cfe5ef] bg-[#eaf5fa] py-2 pl-14 pr-4 text-base font-semibold text-brand-navy outline-none transition-colors hover:border-sky/50 focus:border-sky focus:bg-white focus:shadow-[0_0_0_4px_rgba(43,127,168,0.12)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (pickupLocation) {
                      setPickupLocation("");
                      setLocationEnabled(false);
                    } else {
                      setActivePicker("pickup");
                    }
                  }}
                  aria-label={pickupLocation ? tq.clearAria : tq.mapPickerAria}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#cfe5ef] bg-[#eaf5fa] text-sky shadow-sm transition-[background-color,color,border-color,box-shadow] hover:border-sky/50 hover:bg-white hover:shadow-md"
                >
                  {pickupLocation ? <CloseIcon width={16} height={16} /> : <MapPinIcon width={18} height={18} />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-coral">{tq.toLabel}</span>
              <div className="flex items-center gap-2">
                <PlacesAutocompleteInput
                  name="destination"
                  required
                  value={destination}
                  onChange={setDestination}
                  placeholder={tf.destinationPlaceholder}
                  className="min-h-14 w-full rounded-2xl border border-[#f2d4cc] bg-[#fdf0ec] px-4 py-2 text-base font-semibold text-brand-navy outline-none transition-colors hover:border-coral/50 focus:border-coral focus:bg-white focus:shadow-[0_0_0_4px_rgba(226,84,60,0.11)]"
                />
                <button
                  type="button"
                  onClick={() => (destination ? setDestination("") : setActivePicker("destination"))}
                  aria-label={destination ? tq.clearAria : tq.mapPickerAria}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#f2d4cc] bg-[#fdf0ec] text-coral shadow-sm transition-[background-color,color,border-color,box-shadow] hover:border-coral/50 hover:bg-white hover:shadow-md"
                >
                  {destination ? <CloseIcon width={16} height={16} /> : <MapPinIcon width={18} height={18} />}
                </button>
              </div>
            </label>
          </div>
        </div>

        <label className="mx-auto flex w-full max-w-sm flex-col gap-2 text-sm">
          <span className="px-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-black">{tf.phoneNumber}</span>
          <input
            name="passengerPhone"
            type="tel"
            required
            minLength={6}
            autoComplete="tel"
            defaultValue={user?.phone ?? ""}
            placeholder={tf.phoneNumberPlaceholder}
            className="min-h-14 w-full rounded-2xl border border-[#dce7ec] bg-white px-4 py-2 text-center text-base font-semibold text-brand-navy outline-none hover:border-teal/40 focus:border-teal focus:shadow-[0_0_0_4px_rgba(0,128,128,0.1)]"
          />
        </label>

        <button
          type="submit"
          className="group relative inline-flex min-h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-sky via-teal to-brand-strong px-8 py-3 font-bold text-white shadow-[0_16px_35px_rgba(0,128,128,0.3)] transition-[box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(0,128,128,0.38)] active:translate-y-0 active:scale-[0.98] sm:self-end sm:min-w-56"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" aria-hidden="true" />
          <MapPinIcon width={18} height={18} className="relative" aria-hidden="true" />
          <span className="relative">{tf.sendRequest}</span>
        </button>
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
    </>
  );
}
