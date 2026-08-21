"use client";

import { useState } from "react";
import { PlacesAutocompleteInput } from "./places-autocomplete-input";
import { Button } from "./ui/button";

interface StationOption {
  id: number;
  name: string;
  city: string;
}

interface VendorAddRouteStopFormProps {
  routeId: number;
  nextSequenceOrder: number;
  availableStations: StationOption[];
  existingStationAction: (formData: FormData) => void;
  newLocationAction: (formData: FormData) => void;
}

type Mode = "existing" | "map";

export function VendorAddRouteStopForm({
  routeId,
  nextSequenceOrder,
  availableStations,
  existingStationAction,
  newLocationAction,
}: VendorAddRouteStopFormProps) {
  const [mode, setMode] = useState<Mode>("existing");
  const [search, setSearch] = useState("");
  const [stationName, setStationName] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <div>
      <div className="mb-4 flex w-fit gap-1 rounded-md bg-surface-sunken p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`min-h-9 rounded px-3 py-1.5 font-medium transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] ${
            mode === "existing" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          Existing station
        </button>
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`min-h-9 rounded px-3 py-1.5 font-medium transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] ${
            mode === "map" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          Search on map
        </button>
      </div>

      {mode === "existing" ? (
        <form action={existingStationAction} className="grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="routeId" value={routeId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Station</span>
            <select name="stationId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2">
              <option value="">Choose station</option>
              {availableStations.map((station) => (
                <option key={station.id} value={station.id}>{station.city} · {station.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Order</span>
            <input name="sequenceOrder" type="number" min="1" required defaultValue={nextSequenceOrder} className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Minutes from departure</span>
            <input name="minutesFromDeparture" type="number" min="0" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Price to destination <span className="font-normal text-muted">(optional)</span></span>
            <input name="priceToDestination" type="number" min="0" step="0.01" placeholder="Same as full fare" className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <div className="lg:col-span-4">
            <Button type="submit" size="sm" disabled={availableStations.length === 0}>Add stop</Button>
            {availableStations.length === 0 && (
              <p className="mt-2 text-xs text-muted">Every station is already on this route -- search a new location instead.</p>
            )}
          </div>
        </form>
      ) : (
        <form action={newLocationAction} className="grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="routeId" value={routeId} />
          <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
          <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-2">
            <span className="font-medium">Search a location</span>
            <PlacesAutocompleteInput
              name="search"
              value={search}
              onChange={setSearch}
              placeholder="Search a town, stop, or landmark in Albania"
              required
              countryRestriction="al"
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
              onPlaceSelect={(place) => {
                setSearch(place.address);
                setCoords({ lat: place.lat, lng: place.lng });
                setStationName((current) => current || place.name || place.address);
                setCity((current) => current || place.city || "");
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Stop name</span>
            <input
              name="stationName"
              required
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="e.g. Divjake qender"
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">City</span>
            <input
              name="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Order</span>
            <input name="sequenceOrder" type="number" min="1" required defaultValue={nextSequenceOrder} className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Minutes from departure</span>
            <input name="minutesFromDeparture" type="number" min="0" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Price to destination <span className="font-normal text-muted">(optional)</span></span>
            <input name="priceToDestination" type="number" min="0" step="0.01" placeholder="Same as full fare" className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          {!coords && (
            <p className="text-xs text-muted lg:col-span-4">Pick a suggestion from the search box so the exact map location is saved.</p>
          )}
          <div className="lg:col-span-4">
            <Button type="submit" size="sm" disabled={!coords}>Add stop</Button>
          </div>
        </form>
      )}
    </div>
  );
}
