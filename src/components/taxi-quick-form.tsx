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
  solid: "rounded-md border border-border bg-surface shadow-[var(--shadow-lg)]",
  glass: "rounded-xl border border-white/40 bg-surface/85 shadow-[var(--shadow-lg)] backdrop-blur-xl",
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
        className={`flex flex-col gap-4 p-4 sm:p-5 ${CONTAINER_STYLES[variant]}`}
      >
        <h2 className="font-display text-base font-bold text-foreground">{tq.title}</h2>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-2.5">
          <div className="flex w-5 flex-col items-center pb-3 pt-[35px]" aria-hidden="true">
            <span className="h-2 w-2 shrink-0 rounded-full border-2 border-teal bg-surface" />
            <span className="flex flex-1 flex-col items-center justify-evenly py-1">
              <span className="h-1 w-1 rounded-full bg-muted/40" />
              <span className="h-1 w-1 rounded-full bg-muted/40" />
              <span className="h-1 w-1 rounded-full bg-muted/40" />
            </span>
            <MapPinIcon width={13} height={13} className="shrink-0 text-coral" />
          </div>

          <div className="flex flex-1 flex-col gap-2.5">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{tq.fromLabel}</span>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    aria-label={tq.useCurrentLocationAria}
                    aria-pressed={locationEnabled}
                    className={`absolute left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                      locationEnabled ? "bg-lime-soft text-lime-strong" : "text-muted hover:bg-brand-soft hover:text-teal"
                    }`}
                  >
                    <LocateIcon width={14} height={14} className={locating ? "animate-pulse" : undefined} />
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
                    className="min-h-10 w-full rounded-md border border-border bg-surface py-1.5 pl-9 pr-3 text-sm outline-none transition-colors hover:border-muted/60 focus:border-teal"
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-teal hover:bg-brand-soft hover:text-teal"
                >
                  {pickupLocation ? <CloseIcon width={14} height={14} /> : <MapPinIcon width={16} height={16} />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{tq.toLabel}</span>
              <div className="flex items-center gap-1.5">
                <PlacesAutocompleteInput
                  name="destination"
                  required
                  value={destination}
                  onChange={setDestination}
                  placeholder={tf.destinationPlaceholder}
                  className="min-h-10 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors hover:border-muted/60 focus:border-teal"
                />
                <button
                  type="button"
                  onClick={() => (destination ? setDestination("") : setActivePicker("destination"))}
                  aria-label={destination ? tq.clearAria : tq.mapPickerAria}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-teal hover:bg-brand-soft hover:text-teal"
                >
                  {destination ? <CloseIcon width={14} height={14} /> : <MapPinIcon width={16} height={16} />}
                </button>
              </div>
            </label>
          </div>
        </div>

        <label className="mx-auto flex w-full max-w-64 flex-col items-center gap-1 text-sm">
          <span className="font-medium">{tf.phoneNumber}</span>
          <input
            name="passengerPhone"
            type="tel"
            required
            minLength={6}
            autoComplete="tel"
            defaultValue={user?.phone ?? ""}
            placeholder={tf.phoneNumberPlaceholder}
            className="min-h-10 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-center text-sm outline-none focus:border-teal"
          />
        </label>

        <button
          type="submit"
          className="relative inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-[var(--shadow-xs)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.97] sm:self-end sm:min-w-40"
        >
          {tf.sendRequest}
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
