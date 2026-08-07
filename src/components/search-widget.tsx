"use client";

import { useMemo, useState } from "react";
import { DatePicker } from "./date-picker";
import { CityCombobox } from "./city-combobox";
import { ArrowRightIcon, DestinationIcon, SearchIcon, StartPointIcon } from "./icons";
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
  defaultPassengers?: number;
  /**
   * "glass" uses a single liquid-glass shell over the homepage hero.
   * "solid" keeps the same layout on plain page backgrounds.
   */
  variant?: "solid" | "glass";
}

const CONTAINER_STYLES: Record<"solid" | "glass", string> = {
  solid:
    "rounded-[2rem] border border-[#dce7ec] bg-white shadow-[0_24px_70px_rgba(5,43,52,0.14),0_2px_10px_rgba(5,43,52,0.06)]",
  glass:
    "rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] shadow-[0_30px_90px_rgba(0,24,32,0.24),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.35)] backdrop-blur-[28px] backdrop-saturate-150",
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
  const [passengers, setPassengers] = useState(defaultPassengers ?? 1);
  const [swapRotation, setSwapRotation] = useState(0);
  const [swapPulse, setSwapPulse] = useState(false);

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
    setSwapRotation((r) => r + 180);
    setSwapPulse(true);
    window.setTimeout(() => setSwapPulse(false), 320);
  }

  function handleDateChange(next: string) {
    setDateValue(next);
    setReturnDateValue((prev) => (prev < next ? next : prev));
  }

  return (
    <form
      action="/search"
      method="get"
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
      <div
        className="relative inline-flex w-full rounded-full border border-[#dce7ec] bg-[#f1f5f7] p-1 text-sm shadow-inner sm:w-fit"
        role="group"
        aria-label={sw.tripTypeAria}
      >
        <span
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-sky via-teal to-brand-strong shadow-[0_8px_22px_rgba(0,128,128,0.28)] transition-transform duration-500 ease-[var(--ease-spring)] ${
            tripType === "roundtrip" ? "translate-x-full" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => setTripType("oneway")}
          aria-pressed={tripType === "oneway"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-semibold transition-colors duration-[var(--dur-base)] active:bg-foreground/5 ${
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
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-semibold transition-colors duration-[var(--dur-base)] active:bg-foreground/5 ${
            tripType === "roundtrip" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          <RoundTripIcon className={tripType === "roundtrip" ? "opacity-90" : "opacity-60"} />
          {sw.roundTrip}
        </button>
        <input type="hidden" name="tripType" value={tripType} suppressHydrationWarning />
      </div>

      <div
        className={`grid items-end gap-3 sm:grid-cols-2 ${
          tripType === "roundtrip"
            ? "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(175px,0.9fr)_minmax(175px,0.9fr)_minmax(140px,0.62fr)]"
            : "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(190px,0.88fr)_minmax(140px,0.62fr)]"
        }`}
      >
        <label
          className={`flex min-w-[160px] flex-1 flex-col gap-2 text-sm transition-transform duration-500 ease-[var(--ease-spring)] ${swapPulse ? "scale-[1.025]" : "scale-100"}`}
        >
          <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky">{sw.from}</span>
          <CityCombobox
            name="origin"
            required
            value={originInput}
            onChange={setOriginInput}
            options={cityOptions}
            placeholder={sw.fromPlaceholder}
            noMatchesLabel={dict.cityCombobox.noMatches}
            leadingIcon={<StartPointIcon width={18} height={18} />}
            leadingIconClassName="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sky shadow-sm"
            inputClassName="min-h-14 rounded-2xl border-[#cfe5ef] bg-[#eaf5fa] pl-16 font-semibold text-brand-navy hover:border-sky/50 focus:border-sky focus:bg-white focus:shadow-[0_0_0_4px_rgba(43,127,168,0.12)]"
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={sw.swapAria}
          style={{ transform: `rotate(${swapRotation}deg)` }}
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#cce5e5] bg-teal-soft text-teal shadow-[0_8px_22px_rgba(0,128,128,0.16)] transition-[transform,background-color,color,border-color,box-shadow] duration-500 ease-[var(--ease-spring)] hover:border-teal/40 hover:bg-white hover:shadow-[0_12px_28px_rgba(0,128,128,0.24)] xl:flex"
        >
          <SwapIcon />
        </button>

        <label
          className={`flex min-w-[160px] flex-1 flex-col gap-2 text-sm transition-transform duration-500 ease-[var(--ease-spring)] ${swapPulse ? "scale-[1.025]" : "scale-100"}`}
        >
          <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-coral">{sw.to}</span>
          <CityCombobox
            name="destination"
            required
            value={destinationInput}
            onChange={setDestinationInput}
            options={destinationOptions}
            placeholder={sw.toPlaceholder}
            noMatchesLabel={dict.cityCombobox.noMatches}
            leadingIcon={<DestinationIcon width={18} height={18} />}
            leadingIconClassName="flex h-10 w-10 items-center justify-center rounded-full bg-white text-coral shadow-sm"
            inputClassName="min-h-14 rounded-2xl border-[#f2d4cc] bg-[#fdf0ec] pl-16 font-semibold text-brand-navy hover:border-coral/50 focus:border-coral focus:bg-white focus:shadow-[0_0_0_4px_rgba(226,84,60,0.11)]"
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={sw.swapAria}
          style={{ transform: `rotate(${swapRotation}deg)` }}
          className="flex h-12 w-12 items-center justify-center justify-self-center rounded-full border border-[#cce5e5] bg-teal-soft text-teal shadow-[0_8px_22px_rgba(0,128,128,0.16)] transition-[transform,background-color,color,border-color,box-shadow] duration-500 ease-[var(--ease-spring)] hover:border-teal/40 hover:bg-white active:bg-brand-soft sm:col-span-2 xl:hidden [&_svg]:rotate-90 sm:[&_svg]:rotate-0"
        >
          <SwapIcon />
        </button>

        <label className="flex min-w-[160px] flex-1 flex-col gap-2 text-sm">
          <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{sw.depart}</span>
          <DatePicker
            name="date"
            value={dateValue}
            min={today}
            onChange={handleDateChange}
            dict={dict.datePicker}
            locale={locale}
            iconClassName="text-gold"
            buttonClassName="min-h-14 rounded-2xl border-[#f0dfb7] bg-[#fff7df] font-semibold text-brand-navy hover:border-gold/50 focus:border-gold focus:bg-white"
          />
        </label>

        {tripType === "roundtrip" && (
          <label className="flex min-w-[160px] flex-1 flex-col gap-2 text-sm">
            <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-lime-strong">{sw.returnLabel}</span>
            <DatePicker
              name="returnDate"
              value={returnDateValue}
              min={dateValue}
              onChange={setReturnDateValue}
              dict={dict.datePicker}
              locale={locale}
              iconClassName="text-lime-strong"
              buttonClassName="min-h-14 rounded-2xl border-[#d9e9ae] bg-[#f0f9db] font-semibold text-brand-navy hover:border-lime-strong/50 focus:border-lime-strong focus:bg-white"
            />
          </label>
        )}

        <div className="flex min-w-[140px] flex-1 flex-col gap-2 text-sm">
          <span className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7656b5]">{sw.passengers}</span>
          <div className="flex min-h-14 items-center justify-between rounded-2xl border border-[#ddd2f3] bg-[#f2edff] px-2 py-1.5">
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              disabled={passengers <= 1}
              aria-label={sw.decreasePassengers}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-[#7656b5] shadow-sm transition hover:shadow-md active:scale-90 disabled:opacity-30"
            >
              −
            </button>
            <span className="tabular-nums text-lg font-bold text-brand-navy">{passengers}</span>
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.min(9, p + 1))}
              disabled={passengers >= 9}
              aria-label={sw.increasePassengers}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-[#7656b5] shadow-sm transition hover:shadow-md active:scale-90 disabled:opacity-30"
            >
              +
            </button>
          </div>
          <input type="hidden" name="passengers" value={passengers} suppressHydrationWarning />
        </div>
      </div>

      <button
        type="submit"
        className="group relative inline-flex min-h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-sky via-teal to-brand-strong px-8 py-3 font-bold text-white shadow-[0_16px_35px_rgba(0,128,128,0.3)] transition-[box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(0,128,128,0.38)] active:translate-y-0 active:scale-[0.98] sm:self-end xl:ml-auto xl:min-w-56"
      >
        <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" aria-hidden="true" />
        <SearchIcon width={19} height={19} className="relative" />
        <span className="relative">{sw.searchButton}</span>
      </button>
    </form>
  );
}
