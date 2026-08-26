"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/icons";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { deleteAdminPaymentAction } from "@/app/admin/actions";
import type { listPaymentsForAdmin } from "@/db/queries/admin";

type PaymentRow = Awaited<ReturnType<typeof listPaymentsForAdmin>>[number];
type PaymentStatus = PaymentRow["status"];

const STATUS_LABELS: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  paid: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  authorized: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  refunded: { label: "Refunded", tone: "info" },
};

const CHANNEL_LABELS: Record<string, string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  touch_screen: "Touch screen",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function PaymentDetailModal({ payment, kind, onClose }: { payment: PaymentRow; kind: "bus" | "taxi"; onClose: () => void }) {
  useBodyScrollLock(true);
  const status = STATUS_LABELS[payment.status];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div className="fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]" aria-hidden="true" {...tapToDismiss(onClose)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[1.5rem] border border-white/70 bg-surface p-6 shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:rounded-[1.5rem]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {payment.bookingReference ?? payment.taxiRequestReference}
          </h2>
          <button type="button" {...tapToDismiss(onClose)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <div className="mt-2"><Badge tone={status.tone}>{status.label}</Badge></div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Passenger</p>
          <DetailRow label="Name" value={payment.passengerName || "Not provided"} />
          <DetailRow label="Phone" value={payment.passengerPhone} />
          <DetailRow label="Email" value={payment.passengerEmail || "Not provided"} />
        </div>

        {kind === "bus" ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Booking</p>
            {payment.bookingTravelDate && <DetailRow label="Travel date" value={formatDateLong(payment.bookingTravelDate)} />}
            {payment.bookingSeats != null && <DetailRow label="Seats" value={payment.bookingSeats} />}
            {payment.bookingPriceAtBooking != null && <DetailRow label="Price" value={formatCurrency(payment.bookingPriceAtBooking)} />}
            {payment.bookingChannel && <DetailRow label="Channel" value={CHANNEL_LABELS[payment.bookingChannel] ?? payment.bookingChannel} />}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Journey</p>
            {payment.taxiPickupLocation && <DetailRow label="Pickup" value={payment.taxiPickupLocation} />}
            {payment.taxiDestination && <DetailRow label="Destination" value={payment.taxiDestination} />}
            {payment.taxiPickupAt && <DetailRow label="Pickup time" value={formatAlbaniaDateTime(payment.taxiPickupAt)} />}
            {payment.taxiPassengers != null && <DetailRow label="Passengers" value={payment.taxiPassengers} />}
            {payment.taxiQuotedPrice != null && <DetailRow label="Quoted price" value={formatCurrency(payment.taxiQuotedPrice)} />}
            {payment.taxiNotes && <DetailRow label="Notes" value={payment.taxiNotes} />}
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
          <DetailRow label="Amount" value={formatCurrency(payment.amount, payment.currency === "ALL" ? "ALL" : "EUR")} />
          <DetailRow label="Gateway" value={payment.provider} />
          <DetailRow label="Gateway ref" value={payment.providerPaymentId ?? "Pending"} />
          <DetailRow label="Created" value={formatAlbaniaDateTime(payment.createdAt)} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AdminPaymentsTable({ payments, kind }: { payments: PaymentRow[]; kind: "bus" | "taxi" }) {
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  return (
    <div className="mt-6">
      <p className="mb-2 text-xs text-muted sm:hidden">Tap a row to see full payment details.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Gateway</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const status = STATUS_LABELS[payment.status];
              return (
                <tr
                  key={payment.id}
                  onDoubleClick={() => setSelected(payment)}
                  onClick={() => {
                    if (window.matchMedia("(pointer: coarse)").matches) setSelected(payment);
                  }}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-sunken"
                >
                  <td className="px-4 py-3 align-top font-mono text-xs">{payment.bookingReference ?? payment.taxiRequestReference}</td>
                  <td className="px-4 py-3 align-top text-foreground">
                    <p className="font-medium">{payment.passengerName || "Not provided"}</p>
                    <p className="text-xs text-muted">{payment.passengerPhone}</p>
                    {payment.passengerEmail && <p className="text-xs text-muted">{payment.passengerEmail}</p>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p>{payment.provider}</p>
                    <p className="font-mono text-xs text-muted">{payment.providerPaymentId ?? "Pending"}</p>
                  </td>
                  <td className="px-4 py-3 align-top font-medium">{formatCurrency(payment.amount, payment.currency === "ALL" ? "ALL" : "EUR")}</td>
                  <td className="px-4 py-3 align-top"><Badge tone={status.tone}>{status.label}</Badge></td>
                  <td className="px-4 py-3 align-top text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(payment.createdAt)}</td>
                  <td className="px-4 py-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                    <form action={deleteAdminPaymentAction}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input type="hidden" name="redirectTo" value={kind} />
                      <Button variant="danger" size="sm">Delete</Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">
            No {kind === "bus" ? "bus" : "taxi"} payment records yet. They will appear here after a payment gateway is connected.
          </p>
        )}
      </div>

      {selected && <PaymentDetailModal payment={selected} kind={kind} onClose={() => setSelected(null)} />}
    </div>
  );
}
