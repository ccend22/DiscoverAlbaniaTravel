"use client";

import { useMemo, useRef, useState } from "react";
import { StationsMap, type StationSelection } from "./stations-map";
import { ArrowRightIcon, BusIcon, MapPinIcon, SearchIcon } from "./icons";
import type { StationLocation } from "@/db/queries/stations";
import { formatMessage, type Dictionary } from "@/lib/dictionary";

interface StationsExplorerProps {
  stations: StationLocation[];
  dict: Dictionary;
}

const STATION_TONE = {
  badge: "bg-teal text-white",
  surface: "bg-[#e8f6f7]",
  accent: "text-teal",
} as const;

export function StationsExplorer({ stations, dict }: StationsExplorerProps) {
  const se = dict.stationsExplorer;
  const [selection, setSelection] = useState<StationSelection | null>(null);
  const [filter, setFilter] = useState("");
  const selectionToken = useRef(0);

  const filteredStations = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return stations;
    return stations.filter((station) =>
      [station.name, station.city, station.address ?? "", station.code]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [stations, filter]);

  function handleViewOnMap(stationId: number) {
    selectionToken.current += 1;
    setSelection({ stationId, token: selectionToken.current });
    document.getElementById("stations-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-20">
      <section
        id="stations-map"
        className="scroll-mt-28 overflow-hidden rounded-[2.5rem] bg-brand-deep p-2 shadow-[0_32px_80px_rgba(3,28,33,0.24)] sm:p-3"
      >
        <div className="flex flex-col gap-4 px-4 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">{se.mapKicker}</p>
            <h2 className="mt-1 font-display text-2xl font-black tracking-[-0.025em] sm:text-3xl">{se.mapTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{se.mapSubtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-full border border-white/10 bg-white/8 px-4 py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">
              {filteredStations.length} {se.visibleStations}
            </span>
          </div>
        </div>
        <StationsMap stations={filteredStations} selection={selection} />
      </section>

      <section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">{se.directoryKicker}</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.03em] text-brand-navy sm:text-5xl">{se.allStations}</h2>
            <p className="mt-3 leading-7 text-muted">{se.directorySubtitle}</p>
          </div>

          <div className="w-full lg:w-auto">
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted">
              <span>{se.searchLabel}</span>
              <span className="tabular-nums">{filteredStations.length} / {stations.length}</span>
            </div>
            <div className="relative">
              <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-teal" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={se.filterPlaceholder}
                className="min-h-14 w-full rounded-full border border-[#dbe7ea] bg-white py-3 pl-12 pr-12 text-sm font-medium text-brand-navy shadow-[0_10px_30px_rgba(7,52,60,0.08)] outline-none transition-all hover:border-teal/35 focus:border-teal focus:shadow-[0_0_0_4px_rgba(0,128,128,0.1),0_14px_35px_rgba(7,52,60,0.1)] lg:w-96"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  aria-label={se.clearFilterAria}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f1f5f7] text-lg text-muted transition-colors hover:bg-teal-soft hover:text-teal"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:hidden">
          {filteredStations.map((station) => {
            const tone = STATION_TONE;
            return (
              <article key={station.id} className={`rounded-[1.75rem] border border-white p-5 shadow-[0_10px_30px_rgba(7,52,60,0.08)] ${tone.surface}`}>
                <div className="flex items-start gap-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ${tone.badge}`}>
                    <MapPinIcon width={18} height={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-black tracking-[-0.02em] text-brand-navy">{station.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-foreground/70">{station.city}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{station.address ?? "—"}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-muted shadow-sm">{station.code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewOnMap(station.id)}
                  className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-bold uppercase tracking-[0.08em] shadow-sm transition-all active:scale-[0.98] ${tone.accent}`}
                >
                  {se.viewOnMap}
                  <ArrowRightIcon width={14} height={14} />
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-10 hidden overflow-hidden rounded-[2rem] border border-[#e1e9ec] bg-white shadow-[0_18px_50px_rgba(7,52,60,0.09)] md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e6edef] bg-[#f7fafb] text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  <th className="px-6 py-4">{se.columnStation}</th>
                  <th className="px-5 py-4">{se.columnCity}</th>
                  <th className="px-5 py-4">{se.columnAddress}</th>
                  <th className="px-5 py-4">{se.columnCode}</th>
                  <th className="px-6 py-4"><span className="sr-only">{se.columnActions}</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredStations.map((station) => {
                  const tone = STATION_TONE;
                  return (
                    <tr key={station.id} className="group border-b border-[#edf1f3] transition-colors last:border-0 hover:bg-[#f8fbfc]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-300 group-hover:scale-110 ${tone.badge}`}>
                            <MapPinIcon width={15} height={15} />
                          </span>
                          <span className="font-semibold text-brand-navy">{station.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.surface} ${tone.accent}`}>{station.city}</span>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-muted">{station.address ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#f1f5f7] px-2.5 py-1 font-mono text-[11px] font-bold text-muted">{station.code}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewOnMap(station.id)}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e2eaed] bg-white px-4 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-md ${tone.accent}`}
                        >
                          {se.viewOnMap}
                          <ArrowRightIcon width={13} height={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStations.length === 0 && (
          <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#cfdde1] bg-white px-6 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft text-teal">
              <BusIcon width={23} height={23} />
            </span>
            <p className="mt-4 max-w-md font-semibold text-brand-navy">{formatMessage(se.noStationsMatch, { filter })}</p>
          </div>
        )}
      </section>
    </div>
  );
}
