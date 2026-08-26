import { notFound } from "next/navigation";
import { getBookingByReference } from "@/db/queries/bookings";
import { getBookingReviewRating } from "@/db/queries/reviews";
import { formatDuration, formatPrice, formatWeekdays, formatDateLong, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import { PrintButton } from "@/components/print-button";
import { TripReviewSection } from "@/components/trip-review-section";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import { TicketQr } from "@/components/ticket-qr";
import { formatAlbaniaDateTime } from "@/lib/timezone";

interface BookingDetailPageProps {
  params: Promise<{ reference: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { reference } = await params;
  const [booking, reviewRating] = await Promise.all([
    getBookingByReference(reference.toUpperCase()),
    getBookingReviewRating(reference.toUpperCase()),
  ]);
  if (!booking) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const bc = dict.bookingConfirmation;

  // A booking is "confirmed" the instant it's reserved, before its payment
  // resolves -- so the badge shown here needs both booking status and
  // payment status to actually reflect reality (see src/db/queries/payments.ts).
  const isPaid = booking.status === "confirmed" && booking.paymentStatus === "paid";
  const isPending = booking.status === "confirmed" && !isPaid;
  const boardingTime = booking.boardingStop
    ? new Date(`1970-01-01T${booking.trip.departureTime}Z`).getTime() + booking.boardingStop.minutesFromDeparture * 60_000
    : null;
  const boardingTimeLabel = boardingTime === null
    ? formatTime(booking.trip.departureTime)
    : new Date(boardingTime).toISOString().slice(11, 16);

  return (
    <div className="public-page mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex animate-fade-up items-center justify-between">
        <Badge tone={isPaid ? "success" : isPending ? "warning" : "danger"} className="px-3 py-1 text-sm">
          {isPaid ? (
            <CheckCircleIcon width={14} height={14} />
          ) : isPending ? (
            <ClockIcon width={14} height={14} />
          ) : (
            <XCircleIcon width={14} height={14} />
          )}
          {isPaid ? bc.confirmed : isPending ? bc.paymentPending : bc.cancelled}
        </Badge>
        <PrintButton />
      </div>

      {isPending && <p className="mb-4 animate-fade-up text-sm text-muted">{bc.paymentPendingNote}</p>}
      {!isPaid && !isPending && booking.paymentStatus === "failed" && (
        <p className="mb-4 animate-fade-up text-sm text-muted">{bc.paymentFailedNote}</p>
      )}

      <div className="public-card animate-fade-up overflow-hidden [animation-delay:60ms]">
        <div className="border-t-4 border-brand p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase text-muted">
            {bc.bookingReference}
          </p>
          <h1 className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-foreground">
            {booking.bookingReference}
          </h1>

          <div className="mt-5 flex items-start gap-2">
            <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{booking.boardingStop?.stationName ?? booking.trip.fromStationName}</p>
              <p className="tabular-nums text-muted">{boardingTimeLabel}</p>
              {booking.boardingStop && (
                <p className="mt-0.5 text-xs text-muted">
                  {locale === "al" ? "Stacioni i hipjes" : "Boarding station"}
                </p>
              )}
            </div>
          </div>
          <div className="ml-2 my-1 h-4 border-l border-dashed border-border" />
          <div className="flex items-start gap-2">
            <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-brand" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{booking.trip.toStationName}</p>
              <p className="tabular-nums text-muted">{formatTime(booking.trip.arrivalTime)}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            {formatMessage(bc.operatorLine, { operator: booking.trip.operatorName, code: booking.trip.routeCode, duration: formatDuration(booking.trip.durationMin, locale) })}
          </p>
          <p className="text-sm text-muted">
            {formatMessage(bc.dateLine, { date: formatDateLong(booking.travelDate, locale), weekdays: formatWeekdays(booking.trip.weekdays, locale) })}
          </p>
        </div>

        <div className="border-t border-dashed border-border" />

        <div className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-muted">{bc.passenger}</p>
            <p className="font-medium text-foreground">{booking.passengerName}</p>
          </div>
          <div>
            <p className="text-muted">{bc.seats}</p>
            <p className="font-medium text-foreground">{booking.seats}</p>
          </div>
          <div>
            <p className="text-muted">{bc.contact}</p>
            <p className="font-medium text-foreground">{booking.passengerPhone}</p>
            <p className="font-medium text-foreground">{booking.passengerEmail}</p>
          </div>
          <div>
            <p className="text-muted">{bc.totalPrice}</p>
            <p className="font-medium text-foreground">
              {formatPrice(booking.priceAtBooking, booking.seats)}
            </p>
          </div>
        </div>

        {isPaid && (
          <div className="border-t border-dashed border-border bg-surface-sunken p-5 sm:p-6 print:bg-white">
            <TicketQr
              ticketToken={booking.ticketToken}
              bookingReference={booking.bookingReference}
              locale={locale}
            />
            {booking.checkedInAt && (
              <p className="mx-auto mt-3 w-fit rounded-md bg-success-soft px-3 py-1 text-xs font-semibold text-success print:border print:border-black print:bg-white print:text-black">
                {locale === "al" ? "Validuar" : "Validated"} · {formatAlbaniaDateTime(booking.checkedInAt, locale)}
              </p>
            )}
          </div>
        )}
      </div>

      {isPaid && <TripReviewSection reference={booking.bookingReference} initialRating={reviewRating} />}

      <p className="mt-6 text-xs text-muted">
        {bc.keepReference}
      </p>
    </div>
  );
}
