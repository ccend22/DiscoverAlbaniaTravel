import { notFound } from "next/navigation";
import { getBookingByReference } from "@/db/queries/bookings";
import { TicketQr } from "@/components/ticket-qr";
import { PrintButton } from "@/components/print-button";
import { formatDateLong, formatTime } from "@/lib/format";
import { formatAlbaniaDateTime } from "@/lib/timezone";

// Deliberately outside the (site) route group -- no public header, nav, or
// footer. Admin and vendor staff open this from a booking row to view or
// print just the ticket, not the customer-facing marketing site.
export default async function StandaloneTicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference.toUpperCase());
  if (!booking) notFound();

  const isPaid = booking.status === "confirmed" && booking.paymentStatus === "paid";

  return (
    <div className="flex min-h-full flex-col items-center bg-surface-sunken px-4 py-10 print:bg-white print:py-0">
      <div className="mb-4 print:hidden">
        <PrintButton />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 text-center shadow-[var(--shadow-md)] print:border-0 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{booking.trip.routeCode}</p>
        <h1 className="mt-1 text-lg font-bold text-foreground">
          {booking.trip.fromStationName} → {booking.trip.toStationName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatDateLong(booking.travelDate)} · {formatTime(booking.trip.departureTime)}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {booking.passengerName} · {booking.seats} seat{booking.seats === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted">{booking.bookingReference}</p>

        <div className="mt-6 flex justify-center">
          {isPaid ? (
            <TicketQr ticketToken={booking.ticketToken} bookingReference={booking.bookingReference} />
          ) : (
            <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
              No ticket QR yet -- this booking isn&apos;t marked paid.
            </p>
          )}
        </div>

        {booking.checkedInAt && (
          <p className="mx-auto mt-4 w-fit rounded-md bg-success-soft px-3 py-1 text-xs font-semibold text-success print:border print:border-black print:bg-white print:text-black">
            Validated · {formatAlbaniaDateTime(booking.checkedInAt)}
          </p>
        )}
      </div>
    </div>
  );
}
