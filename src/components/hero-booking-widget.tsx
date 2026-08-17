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
  taxiDefaults?: {
    pickup?: string;
    destination?: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationLat?: number;
    destinationLng?: number;
  };
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
  taxiDefaults,
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
      <div className="mb-4 flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime">{dict.home.searchKicker}</p>
          <h2 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">{dict.home.searchHeading}</h2>
        </div>
        <div
          className="relative inline-flex w-full rounded-full border border-white/70 bg-white p-1 shadow-[0_12px_30px_rgba(0,24,32,0.2)] sm:w-fit"
          role="group"
          aria-label="Booking type"
        >
          <span
            className="absolute inset-y-1 rounded-full bg-teal shadow-[0_8px_20px_rgba(0,128,128,0.22)] transition-[left,width] duration-500 ease-[var(--ease-out-expo)]"
            style={indicatorStyle ? { left: indicatorStyle.left, width: indicatorStyle.width } : { left: 4, width: 0 }}
            aria-hidden="true"
          />
          <button
            ref={registerRef("bus")}
            type="button"
            onClick={() => handleModeChange("bus")}
            aria-pressed={mode === "bus"}
            className={`relative z-10 flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-colors duration-[var(--dur-base)] sm:flex-none sm:px-6 ${
              mode === "bus" ? "text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <BusIcon width={17} height={17} />
            {dict.nav.busTickets}
          </button>
          <button
            ref={registerRef("taxi")}
            type="button"
            onClick={() => handleModeChange("taxi")}
            aria-pressed={mode === "taxi"}
            className={`relative z-10 flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-colors duration-[var(--dur-base)] sm:flex-none sm:px-6 ${
              mode === "taxi" ? "text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <MapPinIcon width={17} height={17} />
            {dict.nav.taxi}
          </button>
        </div>
      </div>

      {/* One persistent card shell for both modes — only the fields inside
          swap, so switching bus/taxi never reads as a new card appearing. */}
      <div className="relative z-20 isolate overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-3 shadow-[0_26px_64px_rgba(0,24,32,0.2)] backdrop-blur-xl sm:p-4">
        <div
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
              <TaxiQuickForm bare dict={dict} locale={locale} user={user} error={taxiError} defaults={taxiDefaults} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
