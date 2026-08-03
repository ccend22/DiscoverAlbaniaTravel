"use client";

import { useMemo, useState } from "react";
import type { TripDepartureDetail } from "@/db/queries/trips";
import { TripResultCard } from "./trip-result-card";
import { FilterIcon } from "./icons";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

interface ResultsFilterPanelProps {
  results: TripDepartureDetail[];
  travelDate: string;
  passengers: number;
  dict: Dictionary;
  locale: Locale;
}

type TimeBucket = "morning" | "afternoon" | "evening";

function bucketOf(time: string): TimeBucket {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function ResultsFilterPanel({ results, travelDate, passengers, dict, locale }: ResultsFilterPanelProps) {
  const rf = dict.resultsFilterPanel;
  const BUCKET_LABELS: Record<TimeBucket, string> = {
    morning: rf.morning,
    afternoon: rf.afternoon,
    evening: rf.evening,
  };
  const operators = useMemo(
    () => Array.from(new Set(results.map((r) => r.operatorName))).sort(),
    [results]
  );

  const [selectedBuckets, setSelectedBuckets] = useState<Set<TimeBucket>>(new Set());
  const [selectedOperators, setSelectedOperators] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return results.filter((row) => {
      if (selectedBuckets.size > 0 && !selectedBuckets.has(bucketOf(row.departureTime))) {
        return false;
      }
      if (selectedOperators.size > 0 && !selectedOperators.has(row.operatorName)) return false;
      if (maxPrice !== "" && Number(row.basePrice) > maxPrice) return false;
      return true;
    });
  }, [results, selectedBuckets, selectedOperators, maxPrice]);

  function toggleBucket(bucket: TimeBucket) {
    setSelectedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  }

  function toggleOperator(name: string) {
    setSelectedOperators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearFilters() {
    setSelectedBuckets(new Set());
    setSelectedOperators(new Set());
    setMaxPrice("");
  }

  const activeFilterCount =
    selectedBuckets.size + selectedOperators.size + (maxPrice !== "" ? 1 : 0);

  const filterContent = (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">{rf.departureTime}</p>
        <div className="flex flex-col gap-2 text-sm">
          {(Object.keys(BUCKET_LABELS) as TimeBucket[]).map((bucket) => (
            <label key={bucket} className="flex items-center gap-2 text-foreground/90">
              <input
                type="checkbox"
                checked={selectedBuckets.has(bucket)}
                onChange={() => toggleBucket(bucket)}
                className="h-4 w-4 rounded border-border accent-teal"
              />
              {BUCKET_LABELS[bucket]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">{rf.operator}</p>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
          {operators.map((name) => (
            <label key={name} className="flex items-center gap-2 text-foreground/90">
              <input
                type="checkbox"
                checked={selectedOperators.has(name)}
                onChange={() => toggleOperator(name)}
                className="h-4 w-4 shrink-0 rounded border-border accent-teal"
              />
              <span className="truncate">{name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground" htmlFor="max-price">
          {rf.maxPrice}
        </label>
        <input
          id="max-price"
          type="number"
          min={0}
          placeholder={rf.noLimit}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-teal"
        />
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-left text-sm font-medium text-teal hover:underline"
        >
          {rf.clearAllFilters}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsFiltersOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:border-teal hover:text-teal"
          aria-expanded={isFiltersOpen}
          aria-controls="mobile-filters"
        >
          <span className="flex items-center gap-2">
            <FilterIcon
              width={16}
              height={16}
              className={`transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] ${isFiltersOpen ? "rotate-90" : ""}`}
            />
            {rf.filters} {activeFilterCount > 0 && `(${activeFilterCount})`}
          </span>
        </button>
        {isFiltersOpen && (
          <div id="mobile-filters" className="mt-3 animate-fade-up rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            {filterContent}
          </div>
        )}
      </div>

      <aside className="hidden w-64 shrink-0 rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)] lg:block">
        {filterContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-sm text-muted">
          {formatMessage(rf.showingResults, { shown: filtered.length, total: results.length, plural: results.length === 1 ? "" : "s" })}
        </p>
        {filtered.length === 0 ? (
          <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-xs)]">
            {rf.noResultsMatchFilters}{" "}
            <button type="button" onClick={clearFilters} className="text-teal hover:underline">
              {rf.clearFilters}
            </button>
          </p>
        ) : (
          filtered.map((trip) => (
            <TripResultCard
              key={trip.tripDepartureId}
              trip={trip}
              travelDate={travelDate}
              passengers={passengers}
              dict={dict}
              locale={locale}
            />
          ))
        )}
      </div>
    </div>
  );
}
