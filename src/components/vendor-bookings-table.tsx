"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { formatDateLong, formatPrice } from "@/lib/format";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { BOOKING_CHANNEL_OPTIONS } from "@/lib/manual-booking";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import type { VendorBookingRow } from "@/db/queries/vendors";

type StatusFilter = "all" | "confirmed" | "cancelled";

interface VendorBookingsTableProps {
  bookings: VendorBookingRow[];
  updateAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
  markPaidAction: (formData: FormData) => void;
}

const CHANNEL_LABELS: Record<VendorBookingRow["channel"], string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  touch_screen: "Touch screen",
};

function EditBookingModal({
  booking,
  onClose,
  updateAction,
  cancelAction,
}: {
  booking: VendorBookingRow;
  onClose: () => void;
  updateAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
}) {
  useBodyScrollLock(true);
  const isManual = booking.channel !== "online";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div className="fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]" aria-hidden="true" {...tapToDismiss(onClose)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit booking"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[1.5rem] border border-white/70 bg-surface p-6 shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:rounded-[1.5rem]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{booking.bookingReference}</h2>
          <button type="button" {...tapToDismiss(onClose)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          {booking.routeCode} · {booking.fromStationName} → {booking.toStationName} · {formatDateLong(booking.travelDate)}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <iframe
            src={`/ticket/${booking.bookingReference}`}
            title={`Ticket ${booking.bookingReference}`}
            className="h-[420px] w-full"
          />
        </div>

        <form action={updateAction} className="mt-5 grid gap-3">
          <input type="hidden" name="bookingId" value={booking.bookingId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Passenger name</span>
            <input name="passengerName" defaultValue={booking.passengerName} required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Phone</span>
            <input name="passengerPhone" defaultValue={booking.passengerPhone} required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email <span className="font-normal text-muted">(optional)</span></span>
            <input name="passengerEmail" type="email" defaultValue={booking.passengerEmail ?? ""} className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Channel</span>
            {isManual ? (
              <select name="channel" defaultValue={booking.channel} className="min-h-11 rounded-md border border-border bg-background px-3 py-2">
                {BOOKING_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <p className="min-h-11 rounded-md border border-border bg-surface-sunken px-3 py-2 text-muted">Online (customer self-service)</p>
            )}
          </label>
          <Button type="submit" className="mt-1">Save changes</Button>
        </form>

        {booking.status === "confirmed" && (
          <form
            action={cancelAction}
            className="mt-4 border-t border-border pt-4"
            onSubmit={(e) => {
              if (!window.confirm(`Cancel booking ${booking.bookingReference}? This releases the seat back to inventory.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="bookingId" value={booking.bookingId} />
            <Button type="submit" variant="danger" className="w-full">Cancel booking</Button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

export function VendorBookingsTable({ bookings, updateAction, cancelAction, markPaidAction }: VendorBookingsTableProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [editingBooking, setEditingBooking] = useState<VendorBookingRow | null>(null);
  const todayAlbania = getAlbaniaDateInputValue();

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

      <p className="mb-2 text-xs text-muted sm:hidden">Tap a row to edit or cancel it.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Travel date</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking) => {
              const isExpired = booking.status === "confirmed" && !booking.checkedInAt && booking.travelDate < todayAlbania;
              return (
              <tr
                key={booking.bookingReference}
                onDoubleClick={() => setEditingBooking(booking)}
                onClick={() => {
                  if (window.matchMedia("(pointer: coarse)").matches) setEditingBooking(booking);
                }}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/ticket/${booking.bookingReference}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-teal underline decoration-teal/35 underline-offset-4 hover:decoration-teal"
                    title="Open and print QR ticket"
                  >
                    {booking.bookingReference}
                  </Link>
                </td>
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
                  <Badge tone={booking.channel === "online" ? "info" : "neutral"}>{CHANNEL_LABELS[booking.channel]}</Badge>
                </td>
                <td className="px-4 py-3 align-top">
                  {booking.paymentStatus === "paid" ? (
                    <Badge tone="success">Paid</Badge>
                  ) : booking.paymentStatus && booking.channel !== "online" ? (
                    // Only a manually-taken booking can be marked paid here -- an
                    // online booking's payment status must only ever come from the
                    // real POK confirmation (webhook/return/sweep), never a manual override.
                    <form action={markPaidAction} onClick={(e) => e.stopPropagation()}>
                      <input type="hidden" name="bookingId" value={booking.bookingId} />
                      <button className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/20">
                        Mark paid
                      </button>
                    </form>
                  ) : booking.paymentStatus ? (
                    <Badge tone="warning">{booking.paymentStatus}</Badge>
                  ) : (
                    <Badge tone="neutral">—</Badge>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {booking.checkedInAt ? (
                    <Badge tone="success">Boarded</Badge>
                  ) : isExpired ? (
                    <Badge tone="warning">Expired</Badge>
                  ) : (
                    <Badge tone="neutral">Not scanned</Badge>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge tone={isExpired ? "warning" : booking.status === "confirmed" ? "success" : "danger"}>
                    {isExpired ? "Expired" : booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </Badge>
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  {bookings.length === 0 ? "No bookings yet." : "No bookings match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          updateAction={updateAction}
          cancelAction={cancelAction}
        />
      )}
    </div>
  );
}
