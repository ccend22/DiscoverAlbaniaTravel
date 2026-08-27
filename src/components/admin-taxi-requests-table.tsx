"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { CloseIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { formatAlbaniaDateTime } from "@/lib/timezone";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import type { deleteTaxiRequestAction } from "@/app/admin/actions";
import type { listTaxiRequestsForAdmin } from "@/db/queries/admin";

type TaxiRequestRow = Awaited<ReturnType<typeof listTaxiRequestsForAdmin>>[number];

const STATUS_LABELS: Record<string, string> = {
  requested: "Booked",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

function paymentBadge(request: TaxiRequestRow) {
  if (request.paymentStatus === "paid") return <Badge tone="success">Paid</Badge>;
  if (request.paymentStatus === "refunded") return <Badge tone="info">Refunded</Badge>;
  if (request.paymentStatus === "failed" || request.paymentStatus === "cancelled") return <Badge tone="danger">Not paid</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function TaxiRequestDetailModal({ request, onClose }: { request: TaxiRequestRow; onClose: () => void }) {
  useBodyScrollLock(true);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div className="fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]" aria-hidden="true" {...tapToDismiss(onClose)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Taxi booking details"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[1.5rem] border border-white/70 bg-surface p-6 shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:rounded-[1.5rem]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{request.requestReference}</h2>
          <button type="button" {...tapToDismiss(onClose)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {paymentBadge(request)}
          <Badge tone="neutral">{STATUS_LABELS[request.status] ?? request.status}</Badge>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Journey</p>
          <DetailRow label="Pickup" value={request.pickupLocation} />
          {request.exactPickupPoint && <DetailRow label="Exact pickup point" value={request.exactPickupPoint} />}
          <DetailRow label="Destination" value={request.destination} />
          <DetailRow label="Pickup time" value={formatAlbaniaDateTime(request.pickupAt)} />
          <DetailRow label="Passengers" value={request.passengers} />
          {request.providerName && <DetailRow label="Provider" value={request.providerName} />}
          {request.preferredTaxiCompany && <DetailRow label="Preferred company" value={request.preferredTaxiCompany} />}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Passenger</p>
          <DetailRow label="Name" value={request.passengerName || "Not provided"} />
          <DetailRow label="Phone" value={request.passengerPhone} />
          <DetailRow label="Email" value={request.passengerEmail || "Not provided"} />
          {request.notes && <DetailRow label="Notes" value={request.notes} />}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
          <DetailRow label="Quoted price" value={request.quotedPrice ? formatCurrency(request.quotedPrice) : "Not quoted"} />
          <DetailRow
            label="Amount paid"
            value={request.paymentAmount ? formatCurrency(request.paymentAmount, request.paymentCurrency === "ALL" ? "ALL" : "EUR") : "—"}
          />
          <DetailRow label="Booked on" value={formatAlbaniaDateTime(request.createdAt)} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AdminTaxiRequestsTable({
  requests,
  deleteAction,
}: {
  requests: TaxiRequestRow[];
  deleteAction: typeof deleteTaxiRequestAction;
}) {
  const [selected, setSelected] = useState<TaxiRequestRow | null>(null);

  return (
    <div>
      <p className="mb-2 text-xs text-muted sm:hidden">Tap a row to see full booking details.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Journey</th>
              <th className="px-4 py-3 font-medium">Pickup</th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Quote</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request.id}
                onDoubleClick={() => setSelected(request)}
                onClick={() => {
                  if (window.matchMedia("(pointer: coarse)").matches) setSelected(request);
                }}
                className="cursor-pointer border-b border-border align-top last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-4 py-3 font-mono text-xs">{request.requestReference}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{request.pickupLocation}</p>
                  <p className="text-muted">to {request.destination}</p>
                </td>
                <td className="px-4 py-3">{formatAlbaniaDateTime(request.pickupAt)}</td>
                <td className="px-4 py-3">
                  <p>{[request.passengerName, request.passengers].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted">{request.passengerPhone}</p>
                  {request.passengerEmail && <p className="text-xs text-muted">{request.passengerEmail}</p>}
                </td>
                <td className="px-4 py-3">
                  {request.quotedPrice ? <p className="font-medium">{formatCurrency(request.quotedPrice)}</p> : <p className="text-muted">Not quoted</p>}
                </td>
                <td className="px-4 py-3">{paymentBadge(request)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <form
                    action={deleteAction}
                    onSubmit={(e) => {
                      if (!window.confirm(`Delete taxi booking ${request.requestReference}? This can't be undone.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    <button className="rounded-md border border-red/30 px-3 py-1.5 text-xs font-medium text-red transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-red-soft hover:shadow-[var(--shadow-xs)]">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No taxi bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <TaxiRequestDetailModal request={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
