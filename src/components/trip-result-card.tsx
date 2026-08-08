import type { TripDepartureDetail } from "@/db/queries/trips";
import { formatDuration, formatPrice, formatTime, formatWeekdays } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ClockIcon, MapPinIcon, BusIcon } from "@/components/icons";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

interface TripResultCardProps {
  trip: TripDepartureDetail;
  travelDate: string;
  passengers?: number;
  dict: Dictionary;
  locale: Locale;
  isCheapest?: boolean;
  isFastest?: boolean;
}

export function TripResultCard({ trip, travelDate, passengers = 1, dict, locale, isCheapest, isFastest }: TripResultCardProps) {
  const tc = dict.tripCard;
  const hasEnoughSeats = trip.freeSeats >= passengers;
  return (
    <article className="public-card card-lift flex flex-col gap-5 p-5 hover:border-teal/30 sm:flex-row sm:items-stretch sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {formatTime(trip.departureTime)}
          </span>
          <span className="text-muted" aria-hidden="true">
            →
          </span>
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {formatTime(trip.arrivalTime)}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted">
            <ClockIcon width={14} height={14} />
            {formatDuration(trip.durationMin, locale)}
          </span>
          <Badge tone="info">{tc.direct}</Badge>
          <Badge tone={hasEnoughSeats ? "success" : "danger"}>
            {hasEnoughSeats
              ? formatMessage(tc.seatsAvailableCount, { count: trip.freeSeats })
              : tc.soldOut}
          </Badge>
          {isCheapest && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold ring-1 ring-inset ring-gold/15">
              {tc.cheapest}
            </span>
          )}
          {isFastest && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-soft px-2 py-0.5 text-xs font-medium text-sky ring-1 ring-inset ring-sky/15">
              {tc.fastest}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1.5 truncate text-sm text-foreground/90">
          <MapPinIcon width={14} height={14} className="shrink-0 text-coral" />
          <span className="truncate">
            {trip.fromStationName} → {trip.toStationName}
          </span>
        </p>

        {(trip.fromStationAddress || trip.toStationAddress) && (
          <p className="truncate text-xs text-muted">
            {trip.fromStationAddress && <>{tc.departs}{trip.fromStationAddress}</>}
            {trip.fromStationAddress && trip.toStationAddress && " · "}
            {trip.toStationAddress && <>{tc.arrives}{trip.toStationAddress}</>}
          </p>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <BusIcon width={14} height={14} />
          {formatMessage(tc.operatorLine, { operator: trip.operatorName, code: trip.routeCode, weekdays: formatWeekdays(trip.weekdays, locale) })}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border pt-4 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0.5">
        <div className="text-right">
          <span className="text-lg font-semibold text-foreground">
            {formatPrice(trip.basePrice, passengers)}
          </span>
          {passengers > 1 && <p className="text-xs text-muted">{formatMessage(tc.forPassengers, { count: passengers })}</p>}
        </div>
        {hasEnoughSeats ? (
          <LinkButton href={`/book/${trip.tripDepartureId}?date=${travelDate}&seats=${passengers}`}>
            {tc.book}
          </LinkButton>
        ) : (
          <Button disabled>{tc.soldOut}</Button>
        )}
      </div>
    </article>
  );
}
