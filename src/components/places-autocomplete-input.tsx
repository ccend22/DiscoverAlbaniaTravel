"use client";

import { useEffect, useRef } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { ensureGoogleMapsOptions, hasGoogleMapsApiKey, pinAutocompleteDropdownBelow } from "@/lib/google-maps-loader";

interface PlacesAutocompleteInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * A plain text field that also offers a live dropdown of matching places as
 * the rider types (Google Places Autocomplete), so most trips never need
 * the full map picker at all — the map stays there as the fallback for
 * addresses that don't resolve to a named place.
 */
export function PlacesAutocompleteInput({ name, value, onChange, placeholder, required, className }: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !inputRef.current) return;
    let cancelled = false;
    let unpin: (() => void) | undefined;
    ensureGoogleMapsOptions();
    importLibrary("places")
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "al" },
          fields: ["formatted_address"],
        });
        unpin = pinAutocompleteDropdownBelow(inputRef.current);
        autocomplete.addListener("place_changed", () => {
          const address = autocomplete.getPlace().formatted_address;
          if (address) onChangeRef.current(address);
        });
      })
      .catch(() => {
        // No dropdown if Places fails to load — the field still works as a plain input.
      });
    return () => {
      cancelled = true;
      unpin?.();
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
