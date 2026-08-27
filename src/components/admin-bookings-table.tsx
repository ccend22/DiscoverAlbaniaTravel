"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/icons";
import { formatPrice, formatDateLong } from "@/lib/format";
import { BOOKING_CHANNEL_OPTIONS } from "@/lib/manual-booking";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { TicketQrPanel, type TicketQrData } from "@/components/ticket-qr-panel";
import type { AdminBookingRow } from "@/db/queries/admin";

type StatusFilter = "all" | "confirmed" | "cancelled";

interface AdminBookingsTableProps {
  bookings: AdminBookingRow[];
  updateAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
  markPaidAction: (formData: FormData) => void;
  deleteAction?: (formData: FormData) => void;
  loadTicket: (bookingId: number) => Promise<TicketQrData | null>;
}

const CHANNEL_LABELS: Record<AdminBookingRow["channel"], string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  touch_screen: "Touch screen",
};

/** A "confirmed" booking whose payment hasn't actually cleared yet is still mid-checkout, not a completed sale -- don't show it as Confirmed. */
function displayStatus(booking: AdminBookingRow): { label: string; tone: "success" | "danger" | "warning" } {
  if (booking.status === "cancelled") return { label: "Cancelled", tone: "danger" };
  if (booking.paymentStatus === "paid") return { label: "Confirmed", tone: "success" };
  return { label: "Awaiting payment", tone: "warning" };
}

function EditBookingModal({
  booking,
  onClose,
  updateAction,
  cancelAction,
  loadTicket,
}: {
  booking: AdminBookingRow;
  onClose: () => void;
  updateAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
  loadTicket: (bookingId: number) => Promise<TicketQrData | null>;
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
          {booking.trip.operatorName} · {booking.trip.routeCode} · {booking.trip.fromStationName} → {booking.trip.toStationName} · {formatDateLong(booking.travelDate)}
        </p>

        <div className="mt-4">
          <TicketQrPanel bookingId={booking.bookingId} loadTicket={loadTicket} />
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

export function AdminBookingsTable({ bookings, updateAction, cancelAction, markPaidAction, deleteAction, loadTicket }: AdminBookingsTableProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editingBooking, setEditingBooking] = useState<AdminBookingRow | null>(null);

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

      <p className="mb-2 text-xs text-muted sm:hidden">Tap a row to edit or cancel it.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Operator</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Payment</th>
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
              <tr
                key={booking.bookingReference}
                onDoubleClick={() => setEditingBooking(booking)}
                onClick={() => {
                  if (window.matchMedia("(pointer: coarse)").matches) setEditingBooking(booking);
                }}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/ticket/${booking.bookingReference}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-xs text-teal hover:underline"
                    title="Open and print QR ticket"
                  >
                    {booking.bookingReference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {booking.trip.fromStationName} → {booking.trip.toStationName}
                </td>
                <td className="px-4 py-3 text-foreground">{booking.trip.operatorName}</td>
                <td className="px-4 py-3 text-foreground">
                  <p>{booking.passengerName}</p>
                  <p className="text-xs text-muted">{booking.passengerPhone}</p>
                  {booking.passengerEmail && <p className="text-xs text-muted">{booking.passengerEmail}</p>}
                </td>
                <td className="px-4 py-3 text-muted">{formatDateLong(booking.travelDate)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatPrice(booking.priceAtBooking, booking.seats)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={booking.channel === "online" ? "info" : "neutral"}>{CHANNEL_LABELS[booking.channel]}</Badge>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
                  <Badge tone={displayStatus(booking).tone}>{displayStatus(booking).label}</Badge>
                </td>
                {deleteAction && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                <td colSpan={deleteAction ? 10 : 9} className="px-4 py-8 text-center text-muted">
                  No bookings match this filter.
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
          loadTicket={loadTicket}
        />
      )}
    </div>
  );
}
