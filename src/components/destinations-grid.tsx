"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, MapPinIcon } from "./icons";

interface DestinationRow {
  id: number;
  name: string;
  description: string;
}

interface DestinationsGridProps {
  destinations: DestinationRow[];
  fallbackDescription: string;
  loadMoreLabel: string;
}

const CARD_TONE = {
  surface: "bg-[#e8f6f7]",
  icon: "bg-teal text-white",
  link: "text-teal",
  glow: "bg-teal/20",
} as const;

const DESTINATIONS_PAGE_SIZE = 9;

export function DestinationsGrid({ destinations, fallbackDescription, loadMoreLabel }: DestinationsGridProps) {
  const [visibleCount, setVisibleCount] = useState(DESTINATIONS_PAGE_SIZE);
  const visible = destinations.slice(0, visibleCount);

  return (
    <>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((destination) => (
          <Link
            key={destination.id}
            href={`/destinations/${destination.id}`}
            className="public-card group relative flex min-h-56 overflow-hidden p-5 transition-transform duration-300 ease-[var(--ease-out-expo)] will-change-transform hover:-translate-y-1"
          >
            <div className={`absolute inset-0 ${CARD_TONE.surface} opacity-65`} />
            <div className={`absolute -right-12 -top-16 h-40 w-40 rounded-full ${CARD_TONE.glow} blur-2xl`} />

            <div className="relative flex w-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 ${CARD_TONE.icon}`}>
                  <MapPinIcon width={18} height={18} />
                </span>
                <ArrowRightIcon width={18} height={18} className={`mt-2 shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1 ${CARD_TONE.link}`} />
              </div>
              <div className="mt-auto pt-8">
                <h3 className="font-display text-2xl font-black tracking-[-0.025em] text-brand-navy">
                  {destination.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {destination.description || fallbackDescription}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {visibleCount < destinations.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + DESTINATIONS_PAGE_SIZE)}
          className="public-card mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-teal transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-teal hover:shadow-md"
        >
          {loadMoreLabel}
        </button>
      )}
    </>
  );
}
