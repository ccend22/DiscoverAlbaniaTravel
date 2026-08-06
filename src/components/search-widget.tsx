"use client";

import { useMemo, useRef, useState } from "react";
import { DatePicker } from "./date-picker";
import { CityCombobox } from "./city-combobox";
import { ArrowRightIcon, SearchIcon } from "./icons";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

type TripType = "oneway" | "roundtrip";

interface SearchWidgetProps {
  cityOptions: string[];
  originToDestinations: Record<string, string[]>;
  dict: Pick<Dictionary, "searchWidget" | "cityCombobox" | "datePicker">;
  locale?: Locale;
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultDate?: string;
  defaultTripType?: TripType;
  defaultReturnDate?: string;
  defaultTime?: string;
  defaultPassengers?: number;
  /**
   * "glass" floats the card over a photo (the homepage hero): translucent
   * + blurred, but still opaque enough that the existing dark label/input
   * styling stays legible unchanged. "solid" (default) is the plain surface
   * used everywhere else, including the search-results page, where there's
   * no rich background behind it for a blur to read against.
   */
  variant?: "solid" | "glass";
}

const CONTAINER_STYLES: Record<"solid" | "glass", string> = {
  solid: "rounded-md border border-border bg-surface shadow-[var(--shadow-lg)]",
  glass: "rounded-xl border border-white/40 bg-surface/85 shadow-[var(--shadow-lg)] backdrop-blur-xl",
};

function RoundTripIcon(props: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17 2.5 21 6.5 17 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13v-1.5a5 5 0 0 1 5-5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21.5 3 17.5 7 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 11v1.5a5 5 0 0 1-5 5H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 7h11m0 0-3.5-3.5M18 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 17H6m0 0 3.5 3.5M6 17l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchWidget({
  cityOptions,
  originToDestinations,
  dict,
  locale = "en",
  defaultOrigin,
  defaultDestination,
  defaultDate,
  defaultTripType,
  defaultReturnDate,
  defaultTime,
  defaultPassengers,
  variant = "solid",
}: SearchWidgetProps) {
  const sw = dict.searchWidget;
  const today = getAlbaniaDateInputValue();
  const [originInput, setOriginInput] = useState(defaultOrigin ?? "");
  const [destinationInput, setDestinationInput] = useState(defaultDestination ?? "");
  const [dateValue, setDateValue] = useState(defaultDate || today);
  const [tripType, setTripType] = useState<TripType>(defaultTripType ?? "oneway");
  const [returnDateValue, setReturnDateValue] = useState(
    defaultReturnDate || defaultDate || today
  );
  const [timeValue, setTimeValue] = useState(defaultTime ?? "");
  const [passengers, setPassengers] = useState(defaultPassengers ?? 1);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const destinationOptions = useMemo(() => {
    const key = originInput.trim().toLowerCase();
    if (!key) return cityOptions;
    const matchedKey = Object.keys(originToDestinations).find(
      (candidate) => candidate.toLowerCase() === key
    );
    return matchedKey ? originToDestinations[matchedKey] : cityOptions;
  }, [originInput, originToDestinations, cityOptions]);

  function handleSwap() {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
  }

  function handleDateChange(next: string) {
    setDateValue(next);
    setReturnDateValue((prev) => (prev < next ? next : prev));
  }

  function openTimePicker() {
    const input = timeInputRef.current;
    if (input && "showPicker" in input) {
      (input as HTMLInputElement & { showPicker: () => void }).showPicker();
    }
  }

  return (
    <form
      action="/search"
      method="get"
      className={`flex flex-col gap-5 p-4 sm:p-6 ${CONTAINER_STYLES[variant]}`}
    >
      <div
        className="relative inline-flex w-full rounded-lg bg-surface-sunken p-1 text-sm shadow-inner sm:w-fit"
        role="group"
        aria-label={sw.tripTypeAria}
      >
        <span
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-brand shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] ${
            tripType === "roundtrip" ? "translate-x-full" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => setTripType("oneway")}
          aria-pressed={tripType === "oneway"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2.5 font-medium transition-colors duration-[var(--dur-base)] active:bg-black/5 ${
            tripType === "oneway" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          <ArrowRightIcon width={14} height={14} className={tripType === "oneway" ? "opacity-90" : "opacity-60"} />
          {sw.oneWay}
        </button>
        <button
          type="button"
          onClick={() => setTripType("roundtrip")}
          aria-pressed={tripType === "roundtrip"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2.5 font-medium transition-colors duration-[var(--dur-base)] active:bg-black/5 ${
            tripType === "roundtrip" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          <RoundTripIcon className={tripType === "roundtrip" ? "opacity-90" : "opacity-60"} />
          {sw.roundTrip}
        </button>
        <input type="hidden" name="tripType" value={tripType} suppressHydrationWarning />
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(130px,0.55fr)]">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{sw.from}</span>
          <CityCombobox
            name="origin"
            required
            value={originInput}
            onChange={setOriginInput}
            options={cityOptions}
            placeholder={sw.fromPlaceholder}
            noMatchesLabel={dict.cityCombobox.noMatches}
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={sw.swapAria}
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-teal hover:bg-brand-soft hover:text-teal xl:flex"
        >
          <SwapIcon />
        </button>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{sw.to}</span>
          <CityCombobox
            name="destination"
            required
            value={destinationInput}
            onChange={setDestinationInput}
            options={destinationOptions}
            placeholder={sw.toPlaceholder}
            noMatchesLabel={dict.cityCombobox.noMatches}
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={sw.swapAria}
          className="flex h-11 w-11 items-center justify-center justify-self-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-teal hover:bg-brand-soft hover:text-teal active:bg-brand-soft sm:col-span-2 xl:hidden [&_svg]:rotate-90 sm:[&_svg]:rotate-0"
        >
          <SwapIcon />
        </button>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{sw.depart}</span>
          <DatePicker name="date" value={dateValue} min={today} onChange={handleDateChange} dict={dict.datePicker} locale={locale} />
        </label>

        {tripType === "roundtrip" && (
          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium">{sw.returnLabel}</span>
            <DatePicker
              name="returnDate"
              value={returnDateValue}
              min={dateValue}
              onChange={setReturnDateValue}
              dict={dict.datePicker}
              locale={locale}
            />
          </label>
        )}

        <label className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-sm sm:col-span-1">
          <span className="font-medium">
            {sw.earliestTime} <span className="font-normal text-muted">{sw.optional}</span>
          </span>
          <input
            ref={timeInputRef}
            type="time"
            name="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            onClick={openTimePicker}
            className="min-h-11 cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-base outline-none transition-colors hover:border-muted/60 focus:border-teal"
            suppressHydrationWarning
          />
        </label>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{sw.passengers}</span>
          <div className="flex min-h-11 items-center justify-between rounded-md border border-border bg-surface px-1.5 py-1.5">
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              disabled={passengers <= 1}
              aria-label={sw.decreasePassengers}
              className="flex h-9 w-9 items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft disabled:opacity-30"
            >
              −
            </button>
            <span className="tabular-nums font-medium">{passengers}</span>
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.min(9, p + 1))}
              disabled={passengers >= 9}
              aria-label={sw.increasePassengers}
              className="flex h-9 w-9 items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft disabled:opacity-30"
            >
              +
            </button>
          </div>
          <input type="hidden" name="passengers" value={passengers} suppressHydrationWarning />
        </div>
      </div>

      <button
        type="submit"
        className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 py-2.5 font-semibold text-brand-foreground shadow-[var(--shadow-xs)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.97] sm:self-end xl:col-span-2 xl:ml-auto xl:min-w-48"
      >
        <SearchIcon width={18} height={18} />
        {sw.searchButton}
      </button>
    </form>
  );
}
