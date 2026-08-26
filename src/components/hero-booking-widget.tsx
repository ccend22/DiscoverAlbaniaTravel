"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SearchWidget } from "./search-widget";
import { TaxiQuickForm } from "./taxi-quick-form";
import { BusIcon, MapPinIcon } from "./icons";
import { useSlidingIndicator } from "@/lib/use-sliding-indicator";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";

type Mode = "bus" | "taxi";

interface HeroBookingWidgetProps {
  cityOptions: string[];
  popularCities?: string[];
  originToDestinations: Record<string, string[]>;
  dict: Dictionary;
  locale: Locale;
  user: { name: string; phone: string | null; email: string } | null;
  initialMode?: Mode;
  taxiError?: string;
  initialTaxiJourney?: {
    pickupLocation: string;
    pickupLat?: number;
    pickupLng?: number;
    destination: string;
    destinationLat?: number;
    destinationLng?: number;
  } | null;
}

export function HeroBookingWidget({
  cityOptions,
  popularCities,
  originToDestinations,
  dict,
  locale,
  user,
  initialMode = "bus",
  taxiError,
  initialTaxiJourney,
}: HeroBookingWidgetProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | "auto">("auto");
  const { registerRef, style: indicatorStyle } = useSlidingIndicator(mode);

  function handleModeChange(next: Mode) {
    if (next === mode) return;
    const el = panelRef.current;
    if (el) setPanelHeight(el.offsetHeight);
    setMode(next);
  }

  function handleModeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next: Mode = event.key === "ArrowLeft" || event.key === "Home" ? "bus" : "taxi";
    const tabList = event.currentTarget;
    handleModeChange(next);
    requestAnimationFrame(() => {
      tabList.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus();
    });
  }

  useLayoutEffect(() => {
    const nextHeight = panelRef.current?.firstElementChild?.scrollHeight;
    if (!nextHeight) return;
    const frame = requestAnimationFrame(() => setPanelHeight(nextHeight));
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  return (
    // text-left resets the centered text-align inherited from the homepage
    // hero's own wrapper (which centers its H1/subtitle) -- without it, any
    // text anywhere in either form below silently inherits center alignment
    // unless it happens to have its own override.
    <div className="w-full text-left">
      <div className="mb-4 flex flex-col gap-4 px-1 lg:flex-row lg:items-end lg:justify-between sm:px-3">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-black leading-tight tracking-[-0.025em] text-white sm:text-3xl">
            {mode === "bus" ? dict.home.searchHeading : dict.taxiQuickForm.title}
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-5 text-white/75 sm:text-base sm:leading-6">
            {mode === "bus" ? dict.home.searchSubtitle : dict.taxiQuickForm.subtitle}
          </p>
        </div>
        <div
          className="relative inline-flex w-full rounded-xl border border-white/75 bg-white p-1 shadow-[0_12px_30px_rgba(0,24,32,0.2)] sm:w-fit"
          role="tablist"
          aria-label="Booking type"
          onKeyDown={handleModeKeyDown}
        >
          <span
            className="absolute inset-y-1 rounded-lg bg-teal shadow-[0_7px_16px_rgba(0,128,128,0.2)] transition-[left,width] duration-200 ease-[var(--ease-out-expo)]"
            style={indicatorStyle ? { left: indicatorStyle.left, width: indicatorStyle.width } : { left: 4, width: 0 }}
            aria-hidden="true"
          />
          <button
            ref={registerRef("bus")}
            data-mode="bus"
            type="button"
            role="tab"
            aria-selected={mode === "bus"}
            aria-controls="booking-mode-panel"
            tabIndex={mode === "bus" ? 0 : -1}
            onClick={() => handleModeChange("bus")}
            className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200 sm:flex-none sm:px-5 ${
              mode === "bus" ? "text-white" : "text-muted hover:text-brand-navy"
            }`}
          >
            <BusIcon width={16} height={16} />
            {dict.nav.busTickets}
          </button>
          <button
            ref={registerRef("taxi")}
            data-mode="taxi"
            type="button"
            role="tab"
            aria-selected={mode === "taxi"}
            aria-controls="booking-mode-panel"
            tabIndex={mode === "taxi" ? 0 : -1}
            onClick={() => handleModeChange("taxi")}
            className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200 sm:flex-none sm:px-5 ${
              mode === "taxi" ? "text-white" : "text-muted hover:text-brand-navy"
            }`}
          >
            <MapPinIcon width={16} height={16} />
            {dict.taxiQuickForm.privateTaxiTab}
          </button>
        </div>
      </div>

      <div
        className="relative z-20 isolate overflow-visible rounded-[2rem] border border-white/80 bg-white/95 p-3 shadow-[0_26px_64px_rgba(0,24,32,0.2)] backdrop-blur-xl sm:p-4"
      >
        <div
          id="booking-mode-panel"
          role="tabpanel"
          ref={panelRef}
          style={{ height: panelHeight }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "height") setPanelHeight("auto");
          }}
          className={`transition-[height] duration-500 ease-[var(--ease-out-expo)] ${panelHeight === "auto" ? "overflow-visible" : "overflow-hidden"}`}
        >
          <div key={mode} className="animate-fade-up">
            {mode === "bus" ? (
              <SearchWidget
                bare
                cityOptions={cityOptions}
                popularCities={popularCities}
                originToDestinations={originToDestinations}
                dict={dict}
                locale={locale}
              />
            ) : (
              <TaxiQuickForm bare dict={dict} locale={locale} user={user} error={taxiError} initialJourney={initialTaxiJourney} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
