import Link from "next/link";
import { searchParamsSchema } from "@/lib/validation";
import {
  searchTripDepartures,
  getStationNames,
  getOriginDestinationMap,
  type TripSearchOutcome,
} from "@/db/queries/trips";
import { formatDateLong } from "@/lib/format";
import { SearchWidget } from "@/components/search-widget";
import { ResultsFilterPanel } from "@/components/results-filter-panel";
import { RouteMap, type RouteSegment } from "@/components/route-map";
import type { TaxiRecommendation } from "@/components/taxi-recommendation-card";
import type { TripDepartureDetail } from "@/db/queries/trips";
import { getRoadRoute } from "@/lib/routing";
import { AlertCircleIcon } from "@/components/icons";
import { getLocaleAndDictionary, type Locale } from "@/lib/i18n";
import { formatMessage, type Dictionary } from "@/lib/dictionary";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM } from "@/lib/taxi-service";
import { estimateTaxiPriceEur } from "@/lib/taxi-pricing";
import { buildCityOptions, POPULAR_CITY_NAMES } from "@/lib/city-options";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bus Search Results",
  robots: { index: false, follow: true },
};

async function buildRouteSegments(results: TripDepartureDetail[]): Promise<RouteSegment[]> {
  const bareSegments: RouteSegment[] = results.map((trip) => ({
    fromName: trip.fromStationName,
    fromLat: Number(trip.fromStationLatitude),
    fromLng: Number(trip.fromStationLongitude),
    toName: trip.toStationName,
    toLat: Number(trip.toStationLatitude),
    toLng: Number(trip.toStationLongitude),
  }));

  const segmentKey = (s: RouteSegment) =>
    `${s.fromLat.toFixed(5)},${s.fromLng.toFixed(5)}-${s.toLat.toFixed(5)},${s.toLng.toFixed(5)}`;

  const uniqueByKey = new Map<string, RouteSegment>();
  for (const segment of bareSegments) {
    uniqueByKey.set(segmentKey(segment), segment);
  }

  const pathsByKey = new Map<string, [number, number][] | null>();
  await Promise.all(
    Array.from(uniqueByKey.entries()).map(async ([key, segment]) => {
      const path = await getRoadRoute(
        [segment.fromLat, segment.fromLng],
        [segment.toLat, segment.toLng]
      );
      pathsByKey.set(key, path);
    })
  );

  return bareSegments.map((segment) => ({
    ...segment,
    path: pathsByKey.get(segmentKey(segment)) ?? undefined,
  }));
}

interface LegResultsProps {
  legLabel: string;
  origin: string;
  destination: string;
  date: string;
  outcome: TripSearchOutcome;
  segments: RouteSegment[];
  passengers: number;
  dict: Dictionary;
  locale: Locale;
  taxiRecommendation: TaxiRecommendation | null;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-card flex animate-fade-up items-start gap-3 p-5 text-sm">
      <AlertCircleIcon width={18} height={18} className="mt-0.5 shrink-0 text-warning" />
      <p>{children}</p>
    </div>
  );
}

function buildTaxiRecommendation(
  origin: string,
  destination: string,
  segment?: RouteSegment
): TaxiRecommendation | null {
  if (!segment) return null;
  const distanceKm = calculateDistanceKm(
    { lat: segment.fromLat, lng: segment.fromLng },
    { lat: segment.toLat, lng: segment.toLng }
  );
  if (distanceKm < MIN_INTERCITY_TAXI_DISTANCE_KM) return null;
  const estimate = estimateTaxiPriceEur(distanceKm);
  if (!estimate) return null;

  const params = new URLSearchParams({
    tab: "taxi",
    taxiFrom: origin,
    taxiTo: destination,
    pickupLat: String(segment.fromLat),
    pickupLng: String(segment.fromLng),
    destinationLat: String(segment.toLat),
    destinationLng: String(segment.toLng),
  });

  return {
    origin,
    destination,
    priceEur: estimate.priceEur,
    km: Math.round(estimate.km),
    requestHref: `/?${params.toString()}#search`,
  };
}

function LegResults({
  legLabel,
  origin,
  destination,
  date,
  outcome,
  segments,
  passengers,
  dict,
  locale,
  taxiRecommendation,
}: LegResultsProps) {
  const sp = dict.searchPage;
  return (
    <div>
      <h2 className="mb-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-2xl font-black tracking-[-0.025em] text-brand-navy">
        <span className="text-xs font-bold uppercase text-teal">
          {legLabel}
        </span>
        {origin} → {destination}
        <span className="font-sans text-sm font-normal text-muted">{formatDateLong(date, locale)}</span>
      </h2>

      {!outcome.originResolved && (
        <EmptyState>{formatMessage(sp.notFoundOrigin, { value: origin })}</EmptyState>
      )}
      {outcome.originResolved && !outcome.destinationResolved && (
        <EmptyState>{formatMessage(sp.notFoundDestination, { value: destination })}</EmptyState>
      )}
      {outcome.originResolved &&
        outcome.destinationResolved &&
        outcome.results.length === 0 &&
        (outcome.existsOnOtherDays ? (
          <EmptyState>
            {formatMessage(sp.existsOtherDays, { origin, destination, date: formatDateLong(date, locale) })}{" "}
            <Link href="/" className="text-teal underline">
              {sp.tryAnotherSearch}
            </Link>
            .{" "}
            <Link href={`/?tab=taxi&taxiFrom=${encodeURIComponent(origin)}&taxiTo=${encodeURIComponent(destination)}#search`} className="text-teal underline">
              {sp.taxiFallbackCta}
            </Link>
            .
          </EmptyState>
        ) : (
          <EmptyState>
            {formatMessage(sp.noDirectBuses, { origin, destination })}{" "}
            <Link href="/" className="text-teal underline">
              {sp.tryAnotherSearch}
            </Link>
            .{" "}
            <Link href={`/?tab=taxi&taxiFrom=${encodeURIComponent(origin)}&taxiTo=${encodeURIComponent(destination)}#search`} className="text-teal underline">
              {sp.taxiFallbackCta}
            </Link>
            .
          </EmptyState>
        ))}

      {outcome.results.length > 0 && (
        <>
          <ResultsFilterPanel
            results={outcome.results}
            travelDate={date}
            passengers={passengers}
            dict={dict}
            locale={locale}
            taxiRecommendation={taxiRecommendation}
          />
          <div className="mt-6">
            <RouteMap segments={segments} />
          </div>
        </>
      )}
    </div>
  );
}

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const { locale, dict } = await getLocaleAndDictionary();
  const parsed = searchParamsSchema.safeParse({
    origin: raw.origin,
    destination: raw.destination,
    date: raw.date,
    tripType: raw.tripType,
    returnDate: raw.returnDate,
    time: raw.time || undefined,
    passengers: raw.passengers,
  });

  const [stations, originToDestinations] = await Promise.all([
    getStationNames(),
    getOriginDestinationMap(),
  ]);
  const cityOptions = buildCityOptions(stations);

  if (!parsed.success) {
    const message = parsed.error.issues.some((issue) => issue.path.includes("returnDate"))
      ? dict.searchPage.invalidReturnDate
      : dict.searchPage.missingFields;

    return (
      <div className="public-page mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="mb-6 text-sm text-muted">{message}</p>
        <SearchWidget
          cityOptions={cityOptions}
          popularCities={POPULAR_CITY_NAMES}
          originToDestinations={originToDestinations}
          dict={dict}
          locale={locale}
          defaultOrigin={typeof raw.origin === "string" ? raw.origin : undefined}
          defaultDestination={typeof raw.destination === "string" ? raw.destination : undefined}
          defaultDate={typeof raw.date === "string" ? raw.date : undefined}
          defaultTripType={raw.tripType === "roundtrip" ? "roundtrip" : undefined}
          defaultReturnDate={typeof raw.returnDate === "string" ? raw.returnDate : undefined}
          defaultPassengers={typeof raw.passengers === "string" ? Number(raw.passengers) : undefined}
        />
      </div>
    );
  }

  const { origin, destination, date, tripType, returnDate, time, passengers } = parsed.data;
  const isRoundTrip = tripType === "roundtrip" && !!returnDate;

  const [outboundOutcome, returnOutcome] = await Promise.all([
    searchTripDepartures(origin, destination, date, time),
    isRoundTrip ? searchTripDepartures(destination, origin, returnDate) : Promise.resolve(null),
  ]);

  const [outboundSegments, returnSegments] = await Promise.all([
    buildRouteSegments(outboundOutcome.results),
    returnOutcome ? buildRouteSegments(returnOutcome.results) : Promise.resolve([]),
  ]);

  const outboundTaxiRecommendation = buildTaxiRecommendation(origin, destination, outboundSegments[0]);
  const returnTaxiRecommendation = returnOutcome
    ? buildTaxiRecommendation(destination, origin, returnSegments[0])
    : null;

  return (
    <div className="public-page mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="sr-only">{`Bus tickets: ${origin} to ${destination}`}</h1>
      <div className="mb-8">
        <SearchWidget
          cityOptions={cityOptions}
          popularCities={POPULAR_CITY_NAMES}
          originToDestinations={originToDestinations}
          dict={dict}
          locale={locale}
          defaultOrigin={origin}
          defaultDestination={destination}
          defaultDate={date}
          defaultTripType={isRoundTrip ? "roundtrip" : "oneway"}
          defaultReturnDate={returnDate}
          defaultPassengers={passengers}
        />
      </div>

      <div className="public-card-muted flex flex-col gap-12 p-5 sm:p-8">
        <LegResults
          legLabel={isRoundTrip ? dict.searchPage.outbound : dict.searchPage.depart}
          origin={origin}
          destination={destination}
          date={date}
          outcome={outboundOutcome}
          segments={outboundSegments}
          passengers={passengers}
          dict={dict}
          locale={locale}
          taxiRecommendation={outboundTaxiRecommendation}
        />

        {isRoundTrip && returnOutcome && (
          <LegResults
            legLabel={dict.searchPage.returnLeg}
            origin={destination}
            destination={origin}
            date={returnDate}
            outcome={returnOutcome}
            segments={returnSegments}
            passengers={passengers}
            dict={dict}
            locale={locale}
            taxiRecommendation={returnTaxiRecommendation}
          />
        )}
      </div>
    </div>
  );
}
