"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateLong } from "@/lib/format";
import type { AdminBookingRow } from "@/db/queries/admin";

type StatusFilter = "all" | "confirmed" | "cancelled";

interface AdminBookingsTableProps {
  bookings: AdminBookingRow[];
  deleteAction?: (formData: FormData) => void;
}

/** A "confirmed" booking whose payment hasn't actually cleared yet is still mid-checkout, not a completed sale -- don't show it as Confirmed. */
function displayStatus(booking: AdminBookingRow): { label: string; tone: "success" | "danger" | "warning" } {
  if (booking.status === "cancelled") return { label: "Cancelled", tone: "danger" };
  if (booking.paymentStatus === "paid") return { label: "Confirmed", tone: "success" };
  return { label: "Awaiting payment", tone: "warning" };
}

export function AdminBookingsTable({ bookings, deleteAction }: AdminBookingsTableProps) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (status === "all") return bookings;
    return bookings.filter((b) => b.status === status);
  }, [bookings, status]);

  return (
    <div>
      <div className="mb-3 flex w-fit gap-1 rounded-md bg-surface-sunken p-1 text-sm">
        {(["all", "confirmed", "cancelled"] as StatusFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded px-3 py-1.5 font-medium capitalize transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] ${
              status === option
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {deleteAction && (
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking) => (
              <tr key={booking.bookingReference} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/booking/${booking.bookingReference}`}
                    className="font-mono text-xs text-teal hover:underline"
                  >
                    {booking.bookingReference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {booking.trip.fromStationName} → {booking.trip.toStationName}
                </td>
                <td className="px-4 py-3 text-foreground">
                  <p>{booking.passengerName}</p>
                  <p className="text-xs text-muted">{booking.passengerEmail}</p>
                </td>
                <td className="px-4 py-3 text-muted">{formatDateLong(booking.travelDate)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatPrice(booking.priceAtBooking, booking.seats)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={displayStatus(booking).tone}>{displayStatus(booking).label}</Badge>
                </td>
                {deleteAction && (
                  <td className="px-4 py-3 text-right">
                    <form
                      action={deleteAction}
                      onSubmit={(e) => {
                        if (!window.confirm(`Delete booking ${booking.bookingReference}? This can't be undone.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="bookingReference" value={booking.bookingReference} />
                      <button className="rounded-md border border-red/30 px-3 py-1.5 text-xs font-medium text-red transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-red-soft hover:shadow-[var(--shadow-xs)]">
                        Delete
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={deleteAction ? 7 : 6} className="px-4 py-8 text-center text-muted">
                  No bookings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
