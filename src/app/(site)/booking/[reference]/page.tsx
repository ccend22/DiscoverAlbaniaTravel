import { notFound } from "next/navigation";
import { getBookingByReference } from "@/db/queries/bookings";
import { formatDuration, formatPrice, formatWeekdays, formatDateLong } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon, MapPinIcon } from "@/components/icons";
import { PrintButton } from "@/components/print-button";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";

interface BookingDetailPageProps {
  params: Promise<{ reference: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference.toUpperCase());
  if (!booking) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const bc = dict.bookingConfirmation;

  const isConfirmed = booking.status === "confirmed";

  return (
    <div className="public-page mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex animate-fade-up items-center justify-between">
        <Badge tone={isConfirmed ? "success" : "danger"} className="px-3 py-1 text-sm">
          {isConfirmed ? (
            <CheckCircleIcon width={14} height={14} />
          ) : (
            <XCircleIcon width={14} height={14} />
          )}
          {isConfirmed ? bc.confirmed : bc.cancelled}
        </Badge>
        <PrintButton />
      </div>

      <div className="public-card animate-fade-up overflow-hidden [animation-delay:60ms]">
        <div className="border-t-4 border-brand p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase text-muted">
            {bc.bookingReference}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tabular-nums text-foreground">
            {booking.bookingReference}
          </h1>

          <div className="mt-5 flex items-start gap-2">
            <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{booking.trip.fromStationName}</p>
              <p className="tabular-nums text-muted">{booking.trip.departureTime}</p>
            </div>
          </div>
          <div className="ml-2 my-1 h-4 border-l border-dashed border-border" />
          <div className="flex items-start gap-2">
            <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-brand" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{booking.trip.toStationName}</p>
              <p className="tabular-nums text-muted">{booking.trip.arrivalTime}</p>
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
      </div>

      <p className="mt-6 text-xs text-muted">
        {bc.keepReference}
      </p>
    </div>
  );
}
