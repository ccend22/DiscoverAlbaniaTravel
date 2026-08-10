"use client";

import { useMemo, useRef, useState } from "react";
import { StationsMap, type StationSelection } from "./stations-map";
import { CityCombobox } from "./city-combobox";
import { LocateIcon, SearchIcon } from "./icons";
import type { StationLocation } from "@/db/queries/stations";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import { normalizeSearchText } from "@/lib/search-normalize";

interface StationsExplorerProps {
  stations: StationLocation[];
  dict: Dictionary;
}

/** Great-circle distance in km — good enough to rank "nearest station" without a geocoding round trip. */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function StationsExplorer({ stations, dict }: StationsExplorerProps) {
  const se = dict.stationsExplorer;
  const [selection, setSelection] = useState<StationSelection | null>(null);
  const [query, setQuery] = useState("");
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const [nearestName, setNearestName] = useState<string | null>(null);
  const selectionToken = useRef(0);

  const cities = useMemo(() => Array.from(new Set(stations.map((s) => s.city))).sort(), [stations]);

  const searchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          stations.flatMap((s) => [s.name, s.city, s.address, s.code].filter((value): value is string => Boolean(value)))
        )
      ).sort(),
    [stations]
  );

  const filteredStations = useMemo(
    () => (activeCity ? stations.filter((s) => s.city === activeCity) : stations),
    [stations, activeCity]
  );

  function focusStation(station: StationLocation) {
    selectionToken.current += 1;
    setSelection({ stationId: station.id, token: selectionToken.current });
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setNearestName(null);
    const normalizedValue = normalizeSearchText(value);
    const exactStation = stations.find((s) =>
      [s.name, s.address, s.code].some((field) => field && normalizeSearchText(field) === normalizedValue)
    );
    if (exactStation) {
      setActiveCity(null);
      focusStation(exactStation);
      return;
    }
    const cityMatch = cities.find((c) => normalizeSearchText(c) === normalizedValue);
    if (cityMatch) {
      setActiveCity(cityMatch);
      const firstStation = stations.find((station) => station.city === cityMatch);
      if (firstStation) focusStation(firstStation);
      return;
    }
    setActiveCity(null);
  }

  function handleLocate() {
    setLocateFailed(false);
    if (!navigator.geolocation) {
      setLocateFailed(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        let nearest: StationLocation | null = null;
        let nearestDistance = Infinity;
        for (const station of stations) {
          const d = distanceKm(latitude, longitude, Number(station.latitude), Number(station.longitude));
          if (d < nearestDistance) {
            nearestDistance = d;
            nearest = station;
          }
        }
        if (nearest) {
          setQuery("");
          setActiveCity(null);
          setNearestName(nearest.name);
          focusStation(nearest);
        }
      },
      () => {
        setLocating(false);
        setLocateFailed(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#dce8e7] bg-[linear-gradient(135deg,#ffffff_0%,#f5faf9_100%)] px-5 py-6 shadow-[0_18px_50px_rgba(7,52,60,0.07)] sm:px-7 sm:py-7 lg:flex lg:items-end lg:justify-between lg:gap-12">
        <div className="relative max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">{se.planKicker}</p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.035em] text-brand-navy sm:text-4xl">
            {se.planTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{se.planDescription}</p>
        </div>
        <div className="mt-5 flex shrink-0 items-center gap-3 lg:mt-0">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white shadow-[0_8px_20px_rgba(0,128,128,0.22)]">
            <SearchIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-lg font-black tracking-[-0.02em] text-brand-navy">{stations.length}</p>
            <p className="text-xs font-semibold text-muted">{se.stationCountLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <CityCombobox
          name="station-search"
          value={query}
          onChange={handleSearchChange}
          options={searchOptions}
          placeholder={se.searchPlaceholder}
          noMatchesLabel={se.noMatchesLabel}
          leadingIcon={<SearchIcon width={16} height={16} />}
          leadingIconClassName="text-teal"
          className="flex-1"
          inputClassName="min-h-14 rounded-full border-[#dbe7ea] bg-white pl-12 pr-4 text-sm font-medium text-brand-navy shadow-[0_10px_30px_rgba(7,52,60,0.08)] hover:border-teal/35 focus:border-teal"
        />
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="public-secondary-action min-h-14 shrink-0 px-6 text-sm disabled:opacity-60"
        >
          <LocateIcon width={16} height={16} className={locating ? "animate-pulse" : ""} />
          {locating ? se.locating : se.locateMe}
        </button>
      </div>

      {(locateFailed || nearestName) && (
        <p className={`-mt-1 text-sm ${locateFailed ? "text-red" : "text-muted"}`}>
          {locateFailed ? se.locateError : formatMessage(se.nearestStation, { name: nearestName ?? "" })}
        </p>
      )}

      <section
        id="stations-map"
        className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-[#e1e9ec] bg-white p-2 shadow-[0_18px_50px_rgba(7,52,60,0.09)] sm:p-3"
      >
        <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">{se.mapKicker}</p>
            <h2 className="mt-1 font-display text-2xl font-black tracking-[-0.025em] text-brand-navy sm:text-3xl">{se.mapTitle}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-full border border-border bg-[#f7fafb] px-4 py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-navy/75">
              {filteredStations.length} {se.visibleStations}
            </span>
          </div>
        </div>
        <StationsMap stations={filteredStations} selection={selection} />
      </section>
    </div>
  );
}
