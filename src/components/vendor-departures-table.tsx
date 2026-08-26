"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatWeekdays } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "@/components/icons";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export interface VendorDeparture {
  id: number;
  routeCode: string;
  routeLongName: string;
  fromStationName: string;
  departureTime: string;
  arrivalTime: string;
  weekdays: number[];
  basePrice: string | null;
  plannedSeats: number;
  freeSeats: number;
  canBoard: boolean;
}

interface VendorDeparturesTableProps {
  departures: VendorDeparture[];
  updateAction: (formData: FormData) => void;
  deleteAction?: (formData: FormData) => void;
  operatorId?: number;
}

export function VendorDeparturesTable({ departures, updateAction, deleteAction, operatorId }: VendorDeparturesTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departures;
    return departures.filter(
      (d) =>
        d.routeCode.toLowerCase().includes(q) ||
        d.routeLongName.toLowerCase().includes(q) ||
        d.fromStationName.toLowerCase().includes(q)
    );
  }, [departures, query]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Showing {filtered.length} of {departures.length} departures
        </p>
        <label className="relative w-full sm:w-72">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search route or station"
            aria-label="Search departures"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Times</th>
              <th className="px-4 py-3 font-medium">Days</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Boarding</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Save</span>
              </th>
              {deleteAction && (
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((departure) => (
              <tr key={departure.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-foreground">{departure.routeCode}</p>
                  <p className="mt-1 max-w-56 truncate text-xs text-muted">
                    {departure.routeLongName}
                  </p>
                  <Link href={`/vendor/manifest/${departure.id}`} className="mt-1 inline-block text-xs font-medium text-teal hover:underline">
                    Boarding list
                  </Link>
                </td>
                <td className="px-4 py-3 align-top text-foreground">
                  {departure.fromStationName}
                </td>
                <td className="px-4 py-3 align-top">
                  <form id={`departure-${departure.id}`} action={updateAction}>
                    <input type="hidden" name="tripDepartureId" value={departure.id} />
                    <div className="flex gap-2">
                      <input
                        name="departureTime"
                        type="time"
                        required
                        defaultValue={departure.departureTime}
                        className="w-28 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                      />
                      <input
                        name="arrivalTime"
                        type="time"
                        required
                        defaultValue={departure.arrivalTime}
                        className="w-28 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                      />
                    </div>
                  </form>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="mb-2 text-xs text-muted">{formatWeekdays(departure.weekdays)}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {WEEKDAYS.map((day) => (
                      <label key={day.value} className="flex items-center gap-1 text-xs">
                        <input
                          form={`departure-${departure.id}`}
                          name="weekdays"
                          type="checkbox"
                          value={day.value}
                          defaultChecked={departure.weekdays.includes(day.value)}
                          className="accent-teal"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <input
                    form={`departure-${departure.id}`}
                    name="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="No price on file"
                    defaultValue={departure.basePrice ?? ""}
                    className="w-24 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex gap-2">
                    <input
                      form={`departure-${departure.id}`}
                      name="plannedSeats"
                      type="number"
                      min="0"
                      max="500"
                      required
                      defaultValue={departure.plannedSeats}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                      aria-label="Planned seats"
                    />
                    <input
                      form={`departure-${departure.id}`}
                      name="freeSeats"
                      type="number"
                      min="0"
                      max="500"
                      required
                      defaultValue={departure.freeSeats}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                      aria-label="Free seats"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <label className="flex items-center gap-2">
                    <input
                      form={`departure-${departure.id}`}
                      name="canBoard"
                      type="checkbox"
                      defaultChecked={departure.canBoard}
                      className="accent-teal"
                    />
                    <Badge tone={departure.canBoard ? "success" : "neutral"}>
                      {departure.canBoard ? "Open" : "Closed"}
                    </Badge>
                  </label>
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    form={`departure-${departure.id}`}
                    className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-sm)] active:translate-y-0"
                  >
                    Save
                  </button>
                </td>
                {deleteAction && (
                  <td className="px-4 py-3 align-top">
                    <form
                      action={deleteAction}
                      onSubmit={(e) => {
                        if (!window.confirm(`Delete this departure (${departure.routeCode})? This can't be undone.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="tripDepartureId" value={departure.id} />
                      {operatorId != null && <input type="hidden" name="operatorId" value={operatorId} />}
                      <button className="rounded-md border border-red/30 px-3 py-1.5 text-sm font-medium text-red transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-red-soft hover:shadow-[var(--shadow-xs)]">
                        Delete
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={deleteAction ? 9 : 8} className="px-4 py-8 text-center text-muted">
                  No departures match &quot;{query}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
