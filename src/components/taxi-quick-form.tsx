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
  solid: "rounded-[2rem] border border-[#dce8e6] bg-white shadow-[var(--page-shadow)]",
  glass: "rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_26px_64px_rgba(0,24,32,0.2)] backdrop-blur-xl",
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
        className={`relative isolate mx-auto flex w-full max-w-md flex-col gap-2 p-2.5 sm:p-3 ${CONTAINER_STYLES[variant]}`}
      >
        <div className="relative flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-soft text-teal">
            <MapPinIcon width={12} height={12} aria-hidden="true" />
          </span>
          <h2 className="font-display text-sm font-bold tracking-tight text-brand-navy">{tq.title}</h2>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="relative flex gap-2">
          <div className="flex w-4 flex-col items-center pb-3 pt-[27px]" aria-hidden="true">
            <span className="h-2 w-2 shrink-0 rounded-full border-2 border-teal bg-white shadow-sm" />
            <span className="flex flex-1 flex-col items-center justify-evenly py-0.5">
              <span className="h-[3px] w-[3px] rounded-full bg-black/10" />
              <span className="h-[3px] w-[3px] rounded-full bg-black/10" />
              <span className="h-[3px] w-[3px] rounded-full bg-black/10" />
            </span>
            <MapPinIcon width={11} height={11} className="shrink-0 text-teal" />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label className="flex flex-col gap-0.5 text-sm">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{tq.fromLabel}</span>
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    aria-label={tq.useCurrentLocationAria}
                    aria-pressed={locationEnabled}
                    className={`absolute left-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm transition-[background-color,color,box-shadow,transform] disabled:opacity-40 ${
                      locationEnabled ? "text-lime-strong ring-2 ring-lime/60" : "text-teal hover:shadow-md"
                    }`}
                  >
                    <LocateIcon width={12} height={12} className={locating ? "animate-pulse" : undefined} />
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
                    className="public-input min-h-8 w-full rounded-lg py-1 pl-8 pr-2 text-xs font-semibold"
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dce8e6] bg-[#edf4f3] text-teal transition-[background-color,color,border-color,box-shadow] hover:bg-white hover:shadow-md"
                >
                  {pickupLocation ? <CloseIcon width={12} height={12} /> : <MapPinIcon width={13} height={13} />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-0.5 text-sm">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{tq.toLabel}</span>
              <div className="flex items-center gap-1">
                <PlacesAutocompleteInput
                  name="destination"
                  required
                  value={destination}
                  onChange={setDestination}
                  placeholder={tf.destinationPlaceholder}
                  className="public-input min-h-8 w-full rounded-lg px-2 py-1 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => (destination ? setDestination("") : setActivePicker("destination"))}
                  aria-label={destination ? tq.clearAria : tq.mapPickerAria}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dce8e6] bg-[#edf4f3] text-teal transition-[background-color,color,border-color,box-shadow] hover:bg-white hover:shadow-md"
                >
                  {destination ? <CloseIcon width={12} height={12} /> : <MapPinIcon width={13} height={13} />}
                </button>
              </div>
            </label>
          </div>
        </div>

        <label className="mx-auto flex w-full max-w-[13rem] flex-col gap-0.5 text-sm">
          <span className="px-1 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{tf.phoneNumber}</span>
          <input
            name="passengerPhone"
            type="tel"
            required
            minLength={6}
            autoComplete="tel"
            defaultValue={user?.phone ?? ""}
            placeholder={tf.phoneNumberPlaceholder}
            className="public-input min-h-8 w-full rounded-lg px-2 py-1 text-center text-xs font-semibold"
          />
        </label>

        <button
          type="submit"
          className="group relative inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-teal px-4 py-1.5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(0,128,128,0.22)] transition-[transform,box-shadow,background-color] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:bg-teal-hover hover:shadow-[0_14px_30px_rgba(0,128,128,0.28)] active:translate-y-0 active:scale-[0.98] sm:self-end sm:min-w-36"
        >
          <MapPinIcon width={13} height={13} aria-hidden="true" />
          <span>{tf.sendRequest}</span>
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
