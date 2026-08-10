"use client";

import { useMemo, useState } from "react";
import { DatePicker } from "./date-picker";
import { CityCombobox } from "./city-combobox";
import { ArrowRightIcon, DestinationIcon, RoundTripIcon, SearchIcon, StartPointIcon, SwapIcon } from "./icons";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

type TripType = "oneway" | "roundtrip";
type ActiveDateField = "depart" | "return" | null;

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
   * "glass" sits on the homepage photo hero: a translucent, blurred white
   * so the photo reads through at the edges. "solid" is a fully opaque
   * white card for plain page backgrounds (search results toolbar, etc.).
   * Both use the same quiet, single-accent styling underneath.
   */
  variant?: "solid" | "glass";
}

const CONTAINER_STYLES: Record<"solid" | "glass", string> = {
  solid: "border border-[#dce8e6] bg-white shadow-[var(--page-shadow)]",
  glass: "border border-white/80 bg-white/95 shadow-[0_26px_64px_rgba(0,24,32,0.2)] backdrop-blur-xl",
};

function getDestinationsForOrigin(
  originToDestinations: Record<string, string[]>,
  origin: string
): string[] | null {
  const key = origin.trim().toLowerCase();
  if (!key) return null;
  const matchedKey = Object.keys(originToDestinations).find(
    (candidate) => candidate.toLowerCase() === key
  );
  return matchedKey ? originToDestinations[matchedKey] : null;
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
  const [destinationInput, setDestinationInput] = useState(() => {
    if (!defaultOrigin || !defaultDestination) return defaultDestination ?? "";
    const availableDestinations = getDestinationsForOrigin(originToDestinations, defaultOrigin);
    return availableDestinations?.some(
      (destination) => destination.toLowerCase() === defaultDestination.trim().toLowerCase()
    )
      ? defaultDestination
      : "";
  });
  const [dateValue, setDateValue] = useState(defaultDate || today);
  const [tripType, setTripType] = useState<TripType>(defaultTripType ?? "oneway");
  const [returnDateValue, setReturnDateValue] = useState(
    defaultReturnDate || defaultDate || today
  );
  const [passengers, setPassengers] = useState(defaultPassengers ?? 1);
  const [swapRotation, setSwapRotation] = useState(0);
  const [swapPulse, setSwapPulse] = useState(false);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);

  const destinationOptions = useMemo(() => {
    if (!originInput.trim()) return cityOptions;
    return getDestinationsForOrigin(originToDestinations, originInput) ?? [];
  }, [originInput, originToDestinations, cityOptions]);

  function handleOriginChange(nextOrigin: string) {
    setOriginInput(nextOrigin);
    const availableDestinations = getDestinationsForOrigin(originToDestinations, nextOrigin);
    if (
      availableDestinations &&
      destinationInput &&
      !availableDestinations.some(
        (destination) => destination.toLowerCase() === destinationInput.trim().toLowerCase()
      )
    ) {
      setDestinationInput("");
    }
  }

  function handleSwap() {
    const nextOrigin = destinationInput;
    const reverseDestinations = getDestinationsForOrigin(originToDestinations, nextOrigin);
    const reverseRouteExists = reverseDestinations?.some(
      (destination) => destination.toLowerCase() === originInput.trim().toLowerCase()
    );
    setOriginInput(nextOrigin);
    setDestinationInput(reverseRouteExists ? originInput : "");
    setSwapRotation((r) => r + 180);
    setSwapPulse(true);
    window.setTimeout(() => setSwapPulse(false), 320);
  }

  function handleDateChange(next: string) {
    setDateValue(next);
    setReturnDateValue((prev) => (prev < next ? next : prev));
    if (tripType === "roundtrip") setActiveDateField("return");
  }

  function handleTripTypeChange(next: TripType) {
    setTripType(next);
    if (next === "oneway" && activeDateField === "return") {
      setActiveDateField(null);
    }
  }

  return (
    <form
      action="/search"
      method="get"
      className={`relative z-20 isolate overflow-visible rounded-[2rem] p-3 sm:p-4 ${CONTAINER_STYLES[variant]}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label={sw.tripTypeAria}
          className="relative inline-flex w-full rounded-full bg-[#edf4f3] p-1 text-sm sm:w-fit"
        >
          <span
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-teal shadow-sm transition-transform duration-500 ease-[var(--ease-spring)] ${tripType === "roundtrip" ? "translate-x-full" : "translate-x-0"}`}
            aria-hidden="true"
          />
          <button type="button" onClick={() => handleTripTypeChange("oneway")} aria-pressed={tripType === "oneway"} className={`relative z-10 flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 font-semibold transition-colors ${tripType === "oneway" ? "text-white" : "text-muted hover:text-brand-navy"}`}>
            <ArrowRightIcon width={15} height={15} />
            {sw.oneWay}
          </button>
          <button type="button" onClick={() => handleTripTypeChange("roundtrip")} aria-pressed={tripType === "roundtrip"} className={`relative z-10 flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 font-semibold transition-colors ${tripType === "roundtrip" ? "text-white" : "text-muted hover:text-brand-navy"}`}>
            <RoundTripIcon width={15} height={15} />
            {sw.roundTrip}
          </button>
          <input type="hidden" name="tripType" value={tripType} suppressHydrationWarning />
        </div>
        <span className="hidden items-center gap-2 pr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted lg:flex">
          <span className="h-2 w-2 rounded-full bg-lime-strong" />
          Discover Albania Transport
        </span>
      </div>

      <div className={`relative grid gap-2 rounded-[1.5rem] bg-[#edf4f3] p-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${tripType === "roundtrip" ? "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(190px,0.72fr)_minmax(190px,0.72fr)_150px_auto]" : "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(210px,0.8fr)_150px_auto]"} lg:items-stretch`}>
        <label className={`relative min-w-0 rounded-[1.1rem] bg-white px-3 py-2 transition-[box-shadow,transform] focus-within:z-[70] focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)] ${swapPulse ? "scale-[1.01]" : ""}`}>
          <span className="mb-0.5 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{sw.from}</span>
          <CityCombobox
            name="origin"
            required
            requireOption
            value={originInput}
            onChange={handleOriginChange}
            options={cityOptions}
            placeholder={sw.fromPlaceholder}
            noMatchesLabel={dict.cityCombobox.noMatches}
            leadingIcon={<StartPointIcon width={15} height={15} />}
            leadingIconClassName="flex h-8 w-8 items-center justify-center rounded-full bg-teal-soft text-teal"
            inputClassName="min-h-11 rounded-lg border-0 bg-transparent pl-14 font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent focus:shadow-none"
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={sw.swapAria}
          style={{ transform: `rotate(${swapRotation}deg)` }}
          className="relative z-50 mx-auto flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border-4 border-[#edf4f3] bg-white text-teal shadow-sm transition-[transform,background-color,color] duration-500 ease-[var(--ease-spring)] hover:bg-teal hover:text-white xl:-mx-5 [&_svg]:rotate-90"
        >
          <SwapIcon width={16} height={16} />
        </button>

        <label className={`relative min-w-0 rounded-[1.1rem] bg-white px-3 py-2 transition-[box-shadow,transform] focus-within:z-[70] focus-within:shadow-[0_0_0_3px_rgba(0,128,128,0.12)] ${swapPulse ? "scale-[1.01]" : ""}`}>
          <span className="mb-0.5 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{sw.to}</span>
          <CityCombobox
            name="destination"
            required
            requireOption
            value={destinationInput}
            onChange={setDestinationInput}
            options={destinationOptions}
            placeholder={sw.toPlaceholder}
            noMatchesLabel={dict.cityCombobox.noDestinations}
            leadingIcon={<DestinationIcon width={15} height={15} />}
            leadingIconClassName="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft text-coral"
            inputClassName="min-h-11 rounded-lg border-0 bg-transparent pl-14 font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent focus:shadow-none"
          />
        </label>

        <div className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2 text-sm">
          <span className="mb-0.5 pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{sw.depart}</span>
          <DatePicker
            name="date"
            value={dateValue}
            min={today}
            onChange={handleDateChange}
            dict={dict.datePicker}
            locale={locale}
            iconClassName="text-gold"
            buttonClassName="min-h-11 flex-1 rounded-lg border-0 bg-transparent font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent"
            open={activeDateField === "depart"}
            onOpenChange={(open) => setActiveDateField(open ? "depart" : null)}
            closeOnSelect={tripType !== "roundtrip"}
            rangeStart={tripType === "roundtrip" ? dateValue : undefined}
            rangeEnd={tripType === "roundtrip" ? returnDateValue : undefined}
            rangeStartLabel={sw.depart}
            rangeEndLabel={sw.returnLabel}
            activeRangeBoundary={tripType === "roundtrip" ? "start" : undefined}
            dialogLabel={sw.depart}
          />
        </div>
        {tripType === "roundtrip" && (
          <div className="flex min-w-0 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2 text-sm">
            <span className="mb-0.5 pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{sw.returnLabel}</span>
            <DatePicker
              name="returnDate"
              value={returnDateValue}
              min={dateValue}
              onChange={setReturnDateValue}
              dict={dict.datePicker}
              locale={locale}
              iconClassName="text-lime-strong"
              buttonClassName="min-h-11 flex-1 rounded-lg border-0 bg-transparent font-semibold text-brand-navy shadow-none hover:bg-transparent focus:bg-transparent"
              open={activeDateField === "return"}
              onOpenChange={(open) => setActiveDateField(open ? "return" : null)}
              rangeStart={dateValue}
              rangeEnd={returnDateValue}
              rangeStartLabel={sw.depart}
              rangeEndLabel={sw.returnLabel}
              activeRangeBoundary="end"
              dialogLabel={sw.returnLabel}
            />
          </div>
        )}
        <div className="flex min-h-16 flex-col justify-center rounded-[1.1rem] bg-white px-3 py-2 text-sm">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{sw.passengers}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPassengers((p) => Math.max(1, p - 1))} disabled={passengers <= 1} aria-label={sw.decreasePassengers} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f5f5] text-base text-teal transition hover:bg-teal-soft active:scale-90 disabled:opacity-30">−</button>
            <span className="w-7 text-center text-base font-bold tabular-nums text-brand-navy">{passengers}</span>
            <button type="button" onClick={() => setPassengers((p) => Math.min(9, p + 1))} disabled={passengers >= 9} aria-label={sw.increasePassengers} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f5f5] text-base text-teal transition hover:bg-teal-soft active:scale-90 disabled:opacity-30">+</button>
          </div>
          <input type="hidden" name="passengers" value={passengers} suppressHydrationWarning />
        </div>
        <button type="submit" aria-label={sw.searchButton} className={`flex min-h-16 items-center justify-center gap-2.5 self-stretch rounded-[1.1rem] bg-teal px-6 font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.2)] transition-[transform,box-shadow,background-color] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:bg-teal-hover hover:shadow-[0_14px_30px_rgba(0,128,128,0.26)] active:translate-y-0 active:scale-[0.98] ${tripType === "roundtrip" ? "lg:col-span-3 xl:col-span-1" : ""}`}>
          <SearchIcon width={18} height={18} />
          <span className="whitespace-nowrap">{sw.searchButton}</span>
        </button>
      </div>
    </form>
  );
}
