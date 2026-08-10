import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../index";
import { tripDepartures, tripInventories, routes, operators, stations } from "../schema";

const fromStation = alias(stations, "from_station");
const toStation = alias(stations, "to_station");

const tripSelectShape = {
  tripDepartureId: tripDepartures.id,
  routeCode: routes.code,
  routeLongName: routes.longName,
  operatorName: operators.name,
  fromStationName: fromStation.name,
  fromStationAddress: fromStation.address,
  fromStationLatitude: fromStation.latitude,
  fromStationLongitude: fromStation.longitude,
  toStationName: toStation.name,
  toStationAddress: toStation.address,
  toStationLatitude: toStation.latitude,
  toStationLongitude: toStation.longitude,
  departureTime: tripDepartures.departureTime,
  arrivalTime: tripDepartures.arrivalTime,
  durationMin: tripDepartures.durationMin,
  distanceKm: tripDepartures.distanceKm,
  basePrice: tripDepartures.basePrice,
  plannedSeats: tripDepartures.plannedSeats,
  freeSeats: tripDepartures.freeSeats,
  weekdays: tripDepartures.weekdays,
};

export interface TripDepartureDetail {
  tripDepartureId: number;
  routeCode: string;
  routeLongName: string;
  operatorName: string;
  fromStationName: string;
  fromStationAddress: string | null;
  fromStationLatitude: string;
  fromStationLongitude: string;
  toStationName: string;
  toStationAddress: string | null;
  toStationLatitude: string;
  toStationLongitude: string;
  departureTime: string;
  arrivalTime: string;
  durationMin: string;
  distanceKm: string;
  basePrice: string | null;
  plannedSeats: number;
  freeSeats: number;
  weekdays: number[];
}

function tripDeparturesQuery() {
  return db
    .select(tripSelectShape)
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(operators, eq(routes.operatorId, operators.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id));
}

async function resolveStationIds(query: string): Promise<number[]> {
  const rows = await db
    .select({ id: stations.id })
    .from(stations)
    .where(
      sql`unaccent(lower(trim(${stations.name}))) = unaccent(lower(trim(${query})))
        or unaccent(lower(trim(${stations.city}))) = unaccent(lower(trim(${query})))`
    );
  return rows.map((r) => r.id);
}

export interface TripSearchOutcome {
  originResolved: boolean;
  destinationResolved: boolean;
  results: TripDepartureDetail[];
  /** True when this origin/destination pair has departures on other weekdays, just not the requested date. */
  existsOnOtherDays: boolean;
}

export async function searchTripDepartures(
  origin: string,
  destination: string,
  travelDate: string,
  minDepartureTime?: string
): Promise<TripSearchOutcome> {
  const [originIds, destinationIds] = await Promise.all([
    resolveStationIds(origin),
    resolveStationIds(destination),
  ]);

  if (originIds.length === 0 || destinationIds.length === 0) {
    return {
      originResolved: originIds.length > 0,
      destinationResolved: destinationIds.length > 0,
      results: [],
      existsOnOtherDays: false,
    };
  }

  const pairFilter = and(
    inArray(tripDepartures.fromStationId, originIds),
    inArray(tripDepartures.toStationId, destinationIds),
    eq(tripDepartures.canBoard, true)
  );

  const matchingDepartures = await tripDeparturesQuery()
    .where(
      and(
        pairFilter,
        sql`extract(isodow from ${travelDate}::date)::smallint = ANY(${tripDepartures.weekdays})`,
        minDepartureTime ? gte(tripDepartures.departureTime, minDepartureTime) : undefined
      )
    )
    .orderBy(asc(tripDepartures.departureTime));

  let results = matchingDepartures;
  if (matchingDepartures.length > 0) {
    const inventoryRows = await db
      .select({
        tripDepartureId: tripInventories.tripDepartureId,
        availableSeats: tripInventories.availableSeats,
      })
      .from(tripInventories)
      .where(
        and(
          inArray(
            tripInventories.tripDepartureId,
            matchingDepartures.map((trip) => trip.tripDepartureId)
          ),
          eq(tripInventories.travelDate, travelDate)
        )
      );
    const availabilityByDeparture = new Map(
      inventoryRows.map((row) => [row.tripDepartureId, row.availableSeats])
    );
    results = matchingDepartures.map((trip) => ({
      ...trip,
      freeSeats:
        availabilityByDeparture.get(trip.tripDepartureId) ??
        Math.min(trip.freeSeats, trip.plannedSeats),
    }));
  }

  let existsOnOtherDays = false;
  if (results.length === 0) {
    const [anyRow] = await db
      .select({ id: tripDepartures.id })
      .from(tripDepartures)
      .where(pairFilter)
      .limit(1);
    existsOnOtherDays = Boolean(anyRow);
  }

  return { originResolved: true, destinationResolved: true, results, existsOnOtherDays };
}

export async function getTripDepartureById(id: number): Promise<TripDepartureDetail | null> {
  const [row] = await tripDeparturesQuery().where(eq(tripDepartures.id, id)).limit(1);
  return row ?? null;
}

export async function isDepartureValidOnDate(
  tripDepartureId: number,
  travelDate: string
): Promise<boolean> {
  const [row] = await db
    .select({
      valid: sql<boolean>`extract(isodow from ${travelDate}::date)::smallint = ANY(${tripDepartures.weekdays})`,
    })
    .from(tripDepartures)
    .where(and(eq(tripDepartures.id, tripDepartureId), eq(tripDepartures.canBoard, true)))
    .limit(1);
  return row?.valid ?? false;
}

export async function getStationNames(): Promise<{ name: string; city: string }[]> {
  return db.select({ name: stations.name, city: stations.city }).from(stations);
}

/**
 * For every searchable origin string (a station name or city), the set of destination
 * strings (station names and cities) reachable via at least one existing trip_departure.
 * Used to narrow the "To" field's options once a "From" value is chosen.
 */
export async function getOriginDestinationMap(): Promise<Record<string, string[]>> {
  const rows = await db
    .selectDistinct({
      fromName: fromStation.name,
      fromCity: fromStation.city,
      toName: toStation.name,
      toCity: toStation.city,
    })
    .from(tripDepartures)
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .where(eq(tripDepartures.canBoard, true));

  const map: Record<string, Set<string>> = {};
  const addEdge = (fromKey: string, toValue: string) => {
    (map[fromKey] ??= new Set()).add(toValue);
  };

  for (const row of rows) {
    for (const fromKey of [row.fromName, row.fromCity]) {
      addEdge(fromKey, row.toName);
      addEdge(fromKey, row.toCity);
    }
  }

  return Object.fromEntries(
    Object.entries(map).map(([key, values]) => [key, Array.from(values).sort()])
  );
}

export interface PopularRoute {
  fromCity: string;
  toCity: string;
  tripCount: number;
}

export async function getPopularRoutes(limit = 6): Promise<PopularRoute[]> {
  const rows = await db
    .select({
      fromCity: fromStation.city,
      toCity: toStation.city,
      tripCount: sql<number>`count(*)`,
    })
    .from(tripDepartures)
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .where(sql`${fromStation.city} <> ${toStation.city}`)
    .groupBy(fromStation.city, toStation.city)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((row) => ({ ...row, tripCount: Number(row.tripCount) }));
}

export interface RoutePairSummary {
  fromCity: string;
  toCity: string;
  tripCount: number;
  operatorCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  minDurationMin: number;
  maxDurationMin: number;
  maxDistanceKm: number;
}

/**
 * Every distinct city-to-city itinerary served by at least one scheduled
 * departure, with aggregated price/duration/frequency stats — the data set
 * behind the `/routes` SEO landing pages (one per city pair, both directions
 * kept separate since "Tiranë to Durrës" and "Durrës to Tiranë" are distinct
 * search intents).
 */
export async function getAllRoutePairs(): Promise<RoutePairSummary[]> {
  const rows = await db
    .select({
      fromCity: fromStation.city,
      toCity: toStation.city,
      tripCount: sql<number>`count(*)`,
      operatorCount: sql<number>`count(distinct ${operators.id})`,
      minPrice: sql<number | null>`min(${tripDepartures.basePrice})`,
      maxPrice: sql<number | null>`max(${tripDepartures.basePrice})`,
      minDurationMin: sql<number>`min(${tripDepartures.durationMin})`,
      maxDurationMin: sql<number>`max(${tripDepartures.durationMin})`,
      maxDistanceKm: sql<number>`max(${tripDepartures.distanceKm})`,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(operators, eq(routes.operatorId, operators.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .where(and(eq(tripDepartures.canBoard, true), sql`${fromStation.city} <> ${toStation.city}`))
    .groupBy(fromStation.city, toStation.city)
    .orderBy(fromStation.city, toStation.city);

  return rows.map((row) => ({
    fromCity: row.fromCity,
    toCity: row.toCity,
    tripCount: Number(row.tripCount),
    operatorCount: Number(row.operatorCount),
    minPrice: row.minPrice === null ? null : Number(row.minPrice),
    maxPrice: row.maxPrice === null ? null : Number(row.maxPrice),
    minDurationMin: Number(row.minDurationMin),
    maxDurationMin: Number(row.maxDurationMin),
    maxDistanceKm: Number(row.maxDistanceKm),
  }));
}

export interface PlatformStats {
  operatorCount: number;
  stationCount: number;
  routeCount: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [row] = await db
    .select({
      operatorCount: sql<number>`(select count(*) from ${operators})`,
      stationCount: sql<number>`(select count(*) from ${stations})`,
      routeCount: sql<number>`(select count(*) from ${routes})`,
    })
    .from(operators)
    .limit(1);

  return {
    operatorCount: Number(row?.operatorCount ?? 0),
    stationCount: Number(row?.stationCount ?? 0),
    routeCount: Number(row?.routeCount ?? 0),
  };
}
