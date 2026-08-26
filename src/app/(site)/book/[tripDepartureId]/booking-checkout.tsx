"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { InfoTooltip } from "@/components/info-tooltip";
import { ClockIcon, MapPinIcon } from "@/components/icons";
import { formatDuration, formatWeekdays, formatTime } from "@/lib/format";
import { formatMessage } from "@/lib/dictionary";
import { BUS_BOOKING_SERVICE_FEE_EUR } from "@/lib/service-fees";
import { BookingForm } from "./booking-form";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";

interface BookingCheckoutProps {
  tripDepartureId: number;
  date: string;
  defaultSeats: number;
  error?: string;
  profile: { name: string; email: string; phone: string | null } | null;
  bp: Dictionary["bookPage"];
  common: Dictionary["common"];
  locale: Locale;
  trip: {
    basePrice: string;
    fromStationName: string;
    toStationName: string;
    departureTime: string;
    arrivalTime: string;
    durationMin: string | number;
    weekdays: number[];
    operatorName: string;
    routeCode: string;
  };
}

export function BookingCheckout({ tripDepartureId, date, defaultSeats, error, profile, bp, common, locale, trip }: BookingCheckoutProps) {
  const [seats, setSeats] = useState(defaultSeats);
  const fareTotal = Number(trip.basePrice) * seats;
  const grandTotal = fareTotal + BUS_BOOKING_SERVICE_FEE_EUR;

  return (
    <>
      <div>
        {error && (
          <Alert tone="error" className="mb-4">{error}</Alert>
        )}

        {profile && (
          <Alert tone="success" className="mb-4">
            {formatMessage(bp.bookingAs, { name: profile.name, email: profile.email })}
          </Alert>
        )}

        <BookingForm
          tripDepartureId={tripDepartureId}
          date={date}
          seats={seats}
          onSeatsChange={setSeats}
          profile={profile}
          bp={bp}
        />

        <section className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">{bp.goodToKnow}</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm text-muted">
            <div>
              <dt className="font-medium text-foreground">{bp.luggage}</dt>
              <dd>
                {formatMessage(bp.luggageBody, { operator: trip.operatorName })}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">{bp.changesCancellations}</dt>
              <dd>
                {bp.changesCancellationsPrefix}{" "}
                <Link href="/account" className="text-teal underline">
                  {bp.myAccountLink}
                </Link>
                {bp.changesCancellationsMiddle}{" "}
                <Link href="/booking" className="text-teal underline">
                  {bp.myBookingLink}
                </Link>
                .
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="public-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase text-muted">
          {bp.tripSummary}
        </p>
        <div className="mt-3 flex items-start gap-2">
          <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-teal" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{trip.fromStationName}</p>
            <p className="tabular-nums text-muted">{formatTime(trip.departureTime)}</p>
          </div>
        </div>
        <div className="ml-2 my-1 h-4 border-l border-dashed border-border" />
        <div className="flex items-start gap-2">
          <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{trip.toStationName}</p>
            <p className="tabular-nums text-muted">{formatTime(trip.arrivalTime)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <ClockIcon width={14} height={14} />
          {formatDuration(trip.durationMin, locale)} · {formatMessage(bp.runsWeekdays, { weekdays: formatWeekdays(trip.weekdays, locale) })}
        </div>

        <div className="mt-4 border-t border-border pt-4 text-sm">
          <p className="text-foreground">{trip.operatorName}</p>
          <p className="text-muted">{formatMessage(bp.routeLabel, { code: trip.routeCode })}</p>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{bp.pricePerSeat} × {seats}</span>
            <span className="font-medium text-foreground">€{fareTotal.toFixed(2)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted">
              {common.serviceFee}
              <InfoTooltip label={common.serviceFee}>{common.busServiceFeeInfo}</InfoTooltip>
            </span>
            <span className="font-medium text-foreground">+€{BUS_BOOKING_SERVICE_FEE_EUR.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold text-foreground">{bp.total}</span>
            <span className="text-lg font-semibold text-foreground">€{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
