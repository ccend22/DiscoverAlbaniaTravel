"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "@/components/icons";
import { formatDateLong, formatPrice } from "@/lib/format";
import type { VendorBookingRow } from "@/db/queries/vendors";

type StatusFilter = "all" | "confirmed" | "cancelled";

interface VendorBookingsTableProps {
  bookings: VendorBookingRow[];
}

export function VendorBookingsTable({ bookings }: VendorBookingsTableProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      return (
        b.passengerName.toLowerCase().includes(q) ||
        b.routeCode.toLowerCase().includes(q) ||
        b.fromStationName.toLowerCase().includes(q) ||
        b.toStationName.toLowerCase().includes(q) ||
        b.bookingReference.toLowerCase().includes(q)
      );
    });
  }, [bookings, status, query]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit gap-1 rounded-md bg-surface-sunken p-1 text-sm">
          {(["all", "confirmed", "cancelled"] as StatusFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={`min-h-9 rounded px-3 py-1.5 font-medium capitalize transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] ${
                status === option
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
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
            placeholder="Search passenger, route, or reference"
            aria-label="Search bookings"
            className="min-h-11 w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Travel date</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking) => (
              <tr key={booking.bookingReference} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted">{booking.bookingReference}</td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-foreground">{booking.routeCode}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {booking.fromStationName} → {booking.toStationName} · {booking.departureTime}
                  </p>
                </td>
                <td className="px-4 py-3 align-top text-foreground">
                  <p>{booking.passengerName}</p>
                  <p className="text-xs text-muted">{booking.passengerPhone}</p>
                </td>
                <td className="px-4 py-3 align-top text-muted">{formatDateLong(booking.travelDate)}</td>
                <td className="px-4 py-3 align-top tabular-nums text-foreground">{booking.seats}</td>
                <td className="px-4 py-3 align-top tabular-nums text-foreground">
                  {formatPrice(booking.priceAtBooking, booking.seats)}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge tone={booking.status === "confirmed" ? "success" : "danger"}>
                    {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {bookings.length === 0 ? "No bookings yet." : "No bookings match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
