"use client";

import { useState } from "react";
import { SearchWidget } from "./search-widget";
import { TaxiQuickForm } from "./taxi-quick-form";
import { BusIcon, MapPinIcon } from "./icons";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";

type Mode = "bus" | "taxi";

interface HeroBookingWidgetProps {
  cityOptions: string[];
  originToDestinations: Record<string, string[]>;
  dict: Dictionary;
  locale: Locale;
  user: { name: string; phone: string | null; email: string } | null;
  initialMode?: Mode;
  taxiError?: string;
}

export function HeroBookingWidget({
  cityOptions,
  originToDestinations,
  dict,
  locale,
  user,
  initialMode = "bus",
  taxiError,
}: HeroBookingWidgetProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-4 px-1 text-left sm:flex-row sm:items-end sm:justify-between sm:px-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime">{dict.home.searchKicker}</p>
          <h2 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">{dict.home.searchHeading}</h2>
        </div>
        <div
          className="inline-flex w-full rounded-full border border-white/70 bg-white p-1 shadow-[0_12px_30px_rgba(0,24,32,0.2)] sm:w-fit"
          role="group"
          aria-label="Booking type"
        >
          <button
            type="button"
            onClick={() => setMode("bus")}
            aria-pressed={mode === "bus"}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-[var(--dur-base)] sm:flex-none ${
              mode === "bus"
                ? "bg-teal text-white shadow-[0_8px_20px_rgba(0,128,128,0.22)]"
                : "text-muted hover:bg-surface-sunken hover:text-foreground"
            }`}
          >
            <BusIcon width={17} height={17} />
            {dict.nav.busTickets}
          </button>
          <button
            type="button"
            onClick={() => setMode("taxi")}
            aria-pressed={mode === "taxi"}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-[var(--dur-base)] sm:flex-none ${
              mode === "taxi"
                ? "bg-teal text-white shadow-[0_8px_20px_rgba(0,128,128,0.22)]"
                : "text-muted hover:bg-surface-sunken hover:text-foreground"
            }`}
          >
            <MapPinIcon width={17} height={17} />
            {dict.nav.taxi}
          </button>
        </div>
      </div>

      {mode === "bus" ? (
        <SearchWidget
          cityOptions={cityOptions}
          originToDestinations={originToDestinations}
          dict={dict}
          locale={locale}
          variant="glass"
        />
      ) : (
        <TaxiQuickForm dict={dict} user={user} error={taxiError} variant="glass" />
      )}
    </div>
  );
}
