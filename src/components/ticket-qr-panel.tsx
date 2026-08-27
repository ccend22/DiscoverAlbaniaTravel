"use client";

import { useEffect, useState } from "react";
import { formatAlbaniaDateTime } from "@/lib/timezone";

export interface TicketQrData {
  bookingReference: string;
  isPaid: boolean;
  checkedInAt: string | null;
  qrSvg: string | null;
}

export function TicketQrPanel({
  bookingId,
  loadTicket,
}: {
  bookingId: number;
  loadTicket: (bookingId: number) => Promise<TicketQrData | null>;
}) {
  const [state, setState] = useState<"loading" | "error" | TicketQrData>("loading");

  useEffect(() => {
    let cancelled = false;
    loadTicket(bookingId)
      .then((data) => { if (!cancelled) setState(data ?? "error"); })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => {
      cancelled = true;
    };
  }, [bookingId, loadTicket]);

  if (state === "loading") {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface-sunken">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/25 border-t-teal" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="rounded-xl border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
        Couldn&apos;t load the ticket.
      </p>
    );
  }

  if (!state.isPaid || !state.qrSvg) {
    return (
      <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
        No ticket QR yet -- this booking isn&apos;t marked paid.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface-sunken px-4 py-5 text-center">
      <div
        role="img"
        aria-label={`Ticket QR code ${state.bookingReference}`}
        className="w-36 overflow-hidden rounded-xl bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        // Generated server-side from an opaque, already-issued ticket token.
        dangerouslySetInnerHTML={{ __html: state.qrSvg }}
      />
      {state.checkedInAt && (
        <p className="mt-3 rounded-md bg-success-soft px-3 py-1 text-xs font-semibold text-success">
          Validated · {formatAlbaniaDateTime(new Date(state.checkedInAt))}
        </p>
      )}
    </div>
  );
}
