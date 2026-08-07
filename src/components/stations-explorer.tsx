"use client";

import { useMemo, useRef, useState } from "react";
import { StationsMap, type StationSelection } from "./stations-map";
import type { StationLocation } from "@/db/queries/stations";
import { formatMessage, type Dictionary } from "@/lib/dictionary";

interface StationsExplorerProps {
  stations: StationLocation[];
  dict: Dictionary;
}

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
    <div className="flex flex-col gap-10">
      <div id="stations-map">
        <StationsMap stations={filteredStations} selection={selection} />
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">{se.allStations}</h2>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <span className="text-sm text-muted">
              {filteredStations.length} of {stations.length}
            </span>
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={se.filterPlaceholder}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-8 text-sm outline-none focus:border-teal sm:w-72"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  aria-label={se.clearFilterAria}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-teal"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="px-4 py-3 font-medium">{se.columnStation}</th>
                <th className="px-4 py-3 font-medium">{se.columnCity}</th>
                <th className="px-4 py-3 font-medium">{se.columnAddress}</th>
                <th className="px-4 py-3 font-medium">{se.columnCode}</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">{se.columnActions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => (
                <tr key={station.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{station.name}</td>
                  <td className="px-4 py-3 text-muted">{station.city}</td>
                  <td className="px-4 py-3 text-muted">{station.address ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{station.code}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleViewOnMap(station.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-lime-strong hover:bg-lime-soft hover:text-lime-strong hover:shadow-[var(--shadow-xs)]"
                    >
                      {se.viewOnMap}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    {formatMessage(se.noStationsMatch, { filter })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
