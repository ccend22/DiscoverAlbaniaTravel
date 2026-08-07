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
      <div
        className="mx-auto mb-3 inline-flex w-full rounded-full border border-white/40 bg-surface/85 p-1 shadow-[var(--shadow-md)] backdrop-blur-xl sm:w-fit"
        role="group"
        aria-label="Booking type"
      >
        <button
          type="button"
          onClick={() => setMode("bus")}
          aria-pressed={mode === "bus"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-[var(--dur-base)] sm:flex-none ${
            mode === "bus" ? "bg-brand text-brand-foreground shadow-[var(--shadow-xs)]" : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <BusIcon width={16} height={16} />
          {dict.nav.busTickets}
        </button>
        <button
          type="button"
          onClick={() => setMode("taxi")}
          aria-pressed={mode === "taxi"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-[var(--dur-base)] sm:flex-none ${
            mode === "taxi" ? "bg-brand text-brand-foreground shadow-[var(--shadow-xs)]" : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <MapPinIcon width={16} height={16} />
          {dict.nav.taxi}
        </button>
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
