"use client";

import { useEffect, useRef } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey, pinAutocompleteDropdownBelow } from "@/lib/google-maps-loader";

interface PlacesAutocompleteInputProps {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onPlaceSelect?: (place: { address: string; lat: number; lng: number }) => void;
  /** ISO 3166-1 alpha-2 country code (e.g. "al") to restrict autocomplete suggestions to. */
  countryRestriction?: string;
}

/**
 * A plain text field that also offers a live dropdown of matching places as
 * the rider types (Google Places Autocomplete), so most trips never need
 * the full map picker at all — the map stays there as the fallback for
 * addresses that don't resolve to a named place.
 */
export function PlacesAutocompleteInput({ id, name, value, onChange, placeholder, required, className, onPlaceSelect, countryRestriction }: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const countryRestrictionRef = useRef(countryRestriction);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    countryRestrictionRef.current = countryRestriction;
  }, [countryRestriction]);

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !inputRef.current) return;
    const input = inputRef.current;
    let cancelled = false;
    let started = false;
    let unpin: (() => void) | undefined;

    // Deferred to the field's first focus/tap rather than firing on mount --
    // Places is a sizeable third-party script, and eagerly loading it for
    // every field on the page (this component appears twice in the taxi
    // form alone) competes with the initial page load for bandwidth and
    // main-thread time before anyone has necessarily touched the field.
    function start() {
      if (started) return;
      started = true;
      ensureGoogleMapsOptions();
      importLibrary("places")
        .then(() => {
          if (cancelled || !inputRef.current) return;
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ["formatted_address", "geometry"],
            ...(countryRestrictionRef.current
              ? { componentRestrictions: { country: countryRestrictionRef.current } }
              : {}),
          });
          unpin = pinAutocompleteDropdownBelow(inputRef.current);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const address = place.formatted_address;
            const location = place.geometry?.location;
            if (address) onChangeRef.current(address);
            if (address && location) {
              onPlaceSelectRef.current?.({ address, lat: location.lat(), lng: location.lng() });
            }
          });
        })
        .catch(() => {
          // No dropdown if Places fails to load — the field still works as a plain input.
        });
    }

    input.addEventListener("focus", start, { once: true });
    input.addEventListener("pointerdown", start, { once: true });

    return () => {
      cancelled = true;
      input.removeEventListener("focus", start);
      input.removeEventListener("pointerdown", start);
      unpin?.();
    };
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      name={name}
      required={required}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
