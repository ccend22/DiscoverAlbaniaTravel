"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, BusIcon, SearchIcon } from "./icons";
import { slugify } from "@/lib/slug";
import { formatMessage } from "@/lib/dictionary";
import type { RoutePairSummary } from "@/db/queries/trips";

interface RoutesGridProps {
  pairs: RoutePairSummary[];
  dict: {
    searchLabel: string;
    filterPlaceholder: string;
    clearFilterAria: string;
    tripsPerWeek: string;
    priceFrom: string;
    priceUnavailable: string;
    viewRoute: string;
    loadMore: string;
    noRoutesMatch: string;
  };
}

const ROUTES_PAGE_SIZE = 12;

export function RoutesGrid({ pairs, dict }: RoutesGridProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return pairs;
    return pairs.filter((pair) => `${pair.fromCity} ${pair.toCity}`.toLowerCase().includes(query));
  }, [pairs, filter]);

  const [visibleCount, setVisibleCount] = useState(ROUTES_PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(ROUTES_PAGE_SIZE);
  }, [filtered]);
  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted">
        <span>{dict.searchLabel}</span>
        <span className="tabular-nums">{filtered.length} / {pairs.length}</span>
      </div>
      <div className="relative">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-teal" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={dict.filterPlaceholder}
          className="min-h-14 w-full rounded-full border border-[#dbe7ea] bg-white py-3 pl-12 pr-12 text-sm font-medium text-brand-navy shadow-[0_10px_30px_rgba(7,52,60,0.08)] outline-none transition-all hover:border-teal/35 focus:border-teal focus:shadow-[0_0_0_4px_rgba(0,128,128,0.1),0_14px_35px_rgba(7,52,60,0.1)] sm:w-96"
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter("")}
            aria-label={dict.clearFilterAria}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f1f5f7] text-lg text-muted transition-colors hover:bg-teal-soft hover:text-teal"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((pair) => (
          <Link
            key={`${pair.fromCity}-${pair.toCity}`}
            href={`/routes/${slugify(pair.fromCity)}/${slugify(pair.toCity)}`}
            className="public-card group relative flex flex-col gap-3 overflow-hidden p-5 transition-transform duration-300 ease-[var(--ease-out-expo)] will-change-transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110">
                <BusIcon width={17} height={17} />
              </span>
              <ArrowRightIcon width={17} height={17} className="text-teal transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
            </div>
            <p className="font-display text-lg font-black tracking-[-0.01em] text-brand-navy">
              {pair.fromCity} <span className="text-muted">→</span> {pair.toCity}
            </p>
            <p className="text-xs text-muted">{formatMessage(dict.tripsPerWeek, { count: pair.tripCount })}</p>
            <p className="mt-auto text-sm font-semibold text-teal">
              {pair.minPrice === null
                ? dict.priceUnavailable
                : formatMessage(dict.priceFrom, { price: `${Math.round(pair.minPrice).toLocaleString("en-US")} ALL` })}
            </p>
          </Link>
        ))}
      </div>

      {visibleCount < filtered.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + ROUTES_PAGE_SIZE)}
          className="public-card mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-teal transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-teal hover:shadow-md"
        >
          {dict.loadMore}
        </button>
      )}

      {filtered.length === 0 && (
        <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#cfdde1] bg-white px-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft text-teal">
            <BusIcon width={23} height={23} />
          </span>
          <p className="mt-4 max-w-md font-semibold text-brand-navy">{formatMessage(dict.noRoutesMatch, { filter })}</p>
        </div>
      )}
    </div>
  );
}
