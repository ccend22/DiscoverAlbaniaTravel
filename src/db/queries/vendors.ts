import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../index";
import { bookings, operators, payments, routeStops, routes, stations, tripDepartures, tripInventories, vendorUsers } from "../schema";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isUniqueViolation, violatedConstraint } from "./db-errors";
import { cancelBookingForVendor, createBooking } from "./bookings";
import { nextSyntheticSourceId } from "./admin-stations";
import { MANUAL_BOOKING_SERVICE_FEE_EUR } from "@/lib/manual-booking";

/**
 * Operators created by the original data import (and by admin's "new
 * operator" form) get an auto-generated vendor_users row with this email
 * pattern and a locked, unguessable password — a placeholder, not a real
 * claimed login. Signup treats operators as still "claimable" as long as
 * their only vendor_users row (if any) matches this pattern or was rejected.
 */
const PLACEHOLDER_VENDOR_EMAIL_PREFIX = "vendor+operator-";

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export type AuthenticateVendorResult =
  | { ok: true; id: number }
  | { ok: false; error: "invalid_credentials" | "pending_approval" | "rejected" };

export async function authenticateVendor(
  email: string,
  password: string
): Promise<AuthenticateVendorResult> {
  const [vendor] = await db
    .select({
      id: vendorUsers.id,
      passwordHash: vendorUsers.passwordHash,
      status: vendorUsers.status,
    })
    .from(vendorUsers)
    .where(eq(vendorUsers.email, email.toLowerCase()))
    .limit(1);

  if (!vendor || !verifyPassword(password, vendor.passwordHash)) {
    return { ok: false, error: "invalid_credentials" };
  }
  if (vendor.status === "pending") return { ok: false, error: "pending_approval" };
  if (vendor.status === "rejected") return { ok: false, error: "rejected" };
  return { ok: true, id: vendor.id };
}

export async function isApprovedVendorUser(vendorUserId: number): Promise<boolean> {
  const [vendor] = await db
    .select({ id: vendorUsers.id })
    .from(vendorUsers)
    .where(and(eq(vendorUsers.id, vendorUserId), eq(vendorUsers.status, "approved")))
    .limit(1);
  return Boolean(vendor);
}

export async function getVendorContext(vendorUserId: number) {
  const [row] = await db
    .select({
      vendorUserId: vendorUsers.id,
      vendorName: vendorUsers.name,
      vendorEmail: vendorUsers.email,
      vendorStatus: vendorUsers.status,
      operatorId: operators.id,
      operatorName: operators.name,
      operatorPhone: operators.phone,
      operatorEmail: operators.email,
      operatorStreet: operators.street,
      operatorCity: operators.city,
      operatorRating: operators.rating,
      operatorRatingCount: operators.ratingCount,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .where(eq(vendorUsers.id, vendorUserId))
    .limit(1);

  return row ?? null;
}

export async function updateVendorOperator(
  vendorUserId: number,
  input: { name: string; phone: string | null; email: string | null; street: string | null; city: string | null }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;

  await db
    .update(operators)
    .set(input)
    .where(eq(operators.id, context.operatorId));
  return true;
}

export async function listVendorDepartures(vendorUserId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  return db
    .select({
      id: tripDepartures.id,
      routeId: tripDepartures.routeId,
      routeCode: routes.code,
      routeLongName: routes.longName,
      fromStationName: stations.name,
      departureTime: tripDepartures.departureTime,
      arrivalTime: tripDepartures.arrivalTime,
      durationMin: tripDepartures.durationMin,
      distanceKm: tripDepartures.distanceKm,
      weekdays: tripDepartures.weekdays,
      basePrice: tripDepartures.basePrice,
      plannedSeats: tripDepartures.plannedSeats,
      freeSeats: tripDepartures.freeSeats,
      canBoard: tripDepartures.canBoard,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(stations, eq(tripDepartures.fromStationId, stations.id))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code), asc(tripDepartures.departureTime));
}

export interface VendorCalendarDay {
  date: string;
  running: boolean;
  plannedSeats: number;
  availableSeats: number;
  bookedSeats: number;
}

export interface VendorCalendarRow {
  id: number;
  routeCode: string;
  fromStationName: string;
  toStationName: string;
  departureTime: string;
  basePrice: string | null;
  days: VendorCalendarDay[];
}

/**
 * A rolling per-departure, per-date view of seat availability -- trip_inventories
 * only ever gets a row once a booking actually happens for that specific date
 * (see createBooking's atomic CTE), so a date with no row yet is full
 * availability, not "unknown".
 */
export async function getVendorDepartureCalendar(vendorUserId: number, days = 14): Promise<VendorCalendarRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  const departures = await db
    .select({
      id: tripDepartures.id,
      routeCode: routes.code,
      fromStationName: stations.name,
      departureTime: tripDepartures.departureTime,
      basePrice: tripDepartures.basePrice,
      plannedSeats: tripDepartures.plannedSeats,
      weekdays: tripDepartures.weekdays,
      toStationId: tripDepartures.toStationId,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(stations, eq(tripDepartures.fromStationId, stations.id))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code), asc(tripDepartures.departureTime));

  if (departures.length === 0) return [];

  const toStationIds = [...new Set(departures.map((d) => d.toStationId))];
  const toStations = await db.select({ id: stations.id, name: stations.name }).from(stations).where(inArray(stations.id, toStationIds));
  const toStationNameById = new Map(toStations.map((s) => [s.id, s.name]));

  const startDate = new Date(`${getAlbaniaDateInputValue()}T00:00:00Z`);
  const dateList = Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const departureIds = departures.map((d) => d.id);
  const inventoryRows = await db
    .select({ tripDepartureId: tripInventories.tripDepartureId, travelDate: tripInventories.travelDate, availableSeats: tripInventories.availableSeats })
    .from(tripInventories)
    .where(and(inArray(tripInventories.tripDepartureId, departureIds), inArray(tripInventories.travelDate, dateList)));

  const inventoryByKey = new Map(inventoryRows.map((row) => [`${row.tripDepartureId}:${row.travelDate}`, row.availableSeats]));

  return departures.map((departure) => ({
    id: departure.id,
    routeCode: departure.routeCode,
    fromStationName: departure.fromStationName,
    toStationName: toStationNameById.get(departure.toStationId) ?? "",
    departureTime: departure.departureTime,
    basePrice: departure.basePrice,
    days: dateList.map((date) => {
      const isoDow = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
      const running = departure.weekdays.includes(isoDow);
      const availableSeats = inventoryByKey.get(`${departure.id}:${date}`) ?? departure.plannedSeats;
      return {
        date,
        running,
        plannedSeats: departure.plannedSeats,
        availableSeats,
        bookedSeats: departure.plannedSeats - availableSeats,
      };
    }),
  }));
}

export interface VendorManifestPassenger {
  bookingReference: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seats: number;
  channel: "online" | "walk_in" | "phone" | "touch_screen";
}

export interface VendorManifest {
  tripDepartureId: number;
  date: string;
  routeCode: string;
  routeLongName: string;
  operatorName: string;
  fromStationName: string;
  toStationName: string;
  departureTime: string;
  arrivalTime: string;
  totalSeatsBooked: number;
  passengers: VendorManifestPassenger[];
}

/** Boarding list for one departure on one specific date -- confirmed bookings only, ordered by name so a driver can find someone quickly. */
export async function getVendorManifest(vendorUserId: number, tripDepartureId: number, date: string): Promise<VendorManifest | null> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return null;

  const fromStation = alias(stations, "manifest_from_station");
  const toStation = alias(stations, "manifest_to_station");

  const [departure] = await db
    .select({
      id: tripDepartures.id,
      routeCode: routes.code,
      routeLongName: routes.longName,
      departureTime: tripDepartures.departureTime,
      arrivalTime: tripDepartures.arrivalTime,
      fromStationName: fromStation.name,
      toStationName: toStation.name,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .where(and(eq(tripDepartures.id, tripDepartureId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  if (!departure) return null;

  const passengers = await db
    .select({
      bookingReference: bookings.bookingReference,
      passengerName: bookings.passengerName,
      passengerPhone: bookings.passengerPhone,
      passengerEmail: bookings.passengerEmail,
      seats: bookings.seats,
      channel: bookings.channel,
    })
    .from(bookings)
    .where(and(eq(bookings.tripDepartureId, tripDepartureId), eq(bookings.travelDate, date), eq(bookings.status, "confirmed")))
    .orderBy(asc(bookings.passengerName));

  return {
    tripDepartureId: departure.id,
    date,
    routeCode: departure.routeCode,
    routeLongName: departure.routeLongName,
    operatorName: context.operatorName,
    fromStationName: departure.fromStationName,
    toStationName: departure.toStationName,
    departureTime: departure.departureTime,
    arrivalTime: departure.arrivalTime,
    totalSeatsBooked: passengers.reduce((sum, p) => sum + p.seats, 0),
    passengers,
  };
}

export interface VendorBookingRow {
  bookingId: number;
  bookingReference: string;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seats: number;
  priceAtBooking: string;
  status: "confirmed" | "cancelled";
  channel: "online" | "walk_in" | "phone" | "touch_screen";
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled" | null;
  createdAt: Date;
  routeCode: string;
  fromStationName: string;
  toStationName: string;
  departureTime: string;
}

export async function listVendorBookings(vendorUserId: number): Promise<VendorBookingRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  const fromStation = alias(stations, "vendor_booking_from_station");
  const toStation = alias(stations, "vendor_booking_to_station");

  return db
    .select({
      bookingId: bookings.id,
      bookingReference: bookings.bookingReference,
      travelDate: bookings.travelDate,
      passengerName: bookings.passengerName,
      passengerPhone: bookings.passengerPhone,
      passengerEmail: bookings.passengerEmail,
      seats: bookings.seats,
      priceAtBooking: bookings.priceAtBooking,
      status: bookings.status,
      channel: bookings.channel,
      paymentStatus: sql<VendorBookingRow["paymentStatus"]>`(
        select ${payments.status} from ${payments}
        where ${payments.bookingId} = ${bookings.id}
        order by ${payments.createdAt} desc
        limit 1
      )`,
      createdAt: bookings.createdAt,
      routeCode: routes.code,
      fromStationName: fromStation.name,
      toStationName: toStation.name,
      departureTime: tripDepartures.departureTime,
    })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(desc(bookings.travelDate), asc(tripDepartures.departureTime));
}

export async function listVendorRoutes(vendorUserId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];
  return db
    .select({ id: routes.id, code: routes.code, longName: routes.longName })
    .from(routes)
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code));
}

export interface VendorRouteWithStopCount {
  id: number;
  code: string;
  longName: string;
  stopCount: number;
}

export async function listVendorRoutesWithStopCounts(vendorUserId: number): Promise<VendorRouteWithStopCount[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];
  const rows = await db
    .select({
      id: routes.id,
      code: routes.code,
      longName: routes.longName,
      stopCount: sql<number>`count(${routeStops.id})`,
    })
    .from(routes)
    .leftJoin(routeStops, eq(routeStops.routeId, routes.id))
    .where(eq(routes.operatorId, context.operatorId))
    .groupBy(routes.id)
    .orderBy(asc(routes.code));
  return rows.map((row) => ({ ...row, stopCount: Number(row.stopCount) }));
}

export async function getVendorRoute(vendorUserId: number, routeId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return null;
  const [route] = await db
    .select({ id: routes.id, code: routes.code, longName: routes.longName })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  return route ?? null;
}

export async function listStationOptions() {
  return db
    .select({ id: stations.id, name: stations.name, city: stations.city })
    .from(stations)
    .orderBy(asc(stations.city), asc(stations.name));
}

export async function createVendorRoute(
  vendorUserId: number,
  input: { code: string; longName: string }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;
  await db.insert(routes).values({
    operatorId: context.operatorId,
    code: input.code.toUpperCase(),
    longName: input.longName,
  });
  return true;
}

export async function createVendorDeparture(
  vendorUserId: number,
  input: {
    routeId: number;
    fromStationId: number;
    toStationId: number;
    departureTime: string;
    arrivalTime: string;
    durationMin: string;
    distanceKm: string;
    basePrice: string;
    plannedSeats: number;
    weekdays: number[];
  }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;
  const [ownedRoute] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, input.routeId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  if (!ownedRoute) return false;
  await db.insert(tripDepartures).values({
    ...input,
    freeSeats: input.plannedSeats,
    canBoard: true,
  });
  return true;
}

export async function updateVendorDeparture(
  vendorUserId: number,
  input: {
    tripDepartureId: number;
    departureTime: string;
    arrivalTime: string;
    basePrice: string;
    plannedSeats: number;
    freeSeats: number;
    canBoard: boolean;
    weekdays: number[];
  }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;

  const [ownedDeparture] = await db
    .select({ id: tripDepartures.id })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(and(eq(tripDepartures.id, input.tripDepartureId), eq(routes.operatorId, context.operatorId)))
    .limit(1);

  if (!ownedDeparture) return false;

  await db
    .update(tripDepartures)
    .set({
      departureTime: input.departureTime,
      arrivalTime: input.arrivalTime,
      basePrice: input.basePrice,
      plannedSeats: input.plannedSeats,
      freeSeats: input.freeSeats,
      canBoard: input.canBoard,
      weekdays: input.weekdays,
    })
    .where(eq(tripDepartures.id, input.tripDepartureId));

  return true;
}

// ---------------------------------------------------------------------------
// Route stops -- intermediate boarding points along a vendor's own route,
// each with a conservative ETA (minutesFromDeparture) and an optional fare
// from that stop to the route's final destination. Scoped to routes the
// vendor's operator owns; stations themselves stay admin-managed.
// ---------------------------------------------------------------------------

export interface VendorRouteStopRow {
  id: number;
  routeId: number;
  stationId: number;
  stationName: string;
  sequenceOrder: number;
  minutesFromDeparture: number;
  priceToDestination: string | null;
}

async function assertVendorOwnsRoute(vendorUserId: number, routeId: number): Promise<number | null> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return null;
  const [ownedRoute] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  return ownedRoute ? context.operatorId : null;
}

export async function listVendorRouteStops(vendorUserId: number, routeId: number): Promise<VendorRouteStopRow[]> {
  const owned = await assertVendorOwnsRoute(vendorUserId, routeId);
  if (!owned) return [];

  return db
    .select({
      id: routeStops.id,
      routeId: routeStops.routeId,
      stationId: routeStops.stationId,
      stationName: stations.name,
      sequenceOrder: routeStops.sequenceOrder,
      minutesFromDeparture: routeStops.minutesFromDeparture,
      priceToDestination: routeStops.priceToDestination,
    })
    .from(routeStops)
    .innerJoin(stations, eq(routeStops.stationId, stations.id))
    .where(eq(routeStops.routeId, routeId))
    .orderBy(asc(routeStops.sequenceOrder));
}

export interface VendorRouteStopOption {
  id: number;
  routeId: number;
  routeCode: string;
  stationName: string;
  priceToDestination: string | null;
}

/** Every stop across all of the vendor's own routes, for the manual-booking boarding-stop picker. */
export async function listVendorRouteStopOptions(vendorUserId: number): Promise<VendorRouteStopOption[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  return db
    .select({
      id: routeStops.id,
      routeId: routeStops.routeId,
      routeCode: routes.code,
      stationName: stations.name,
      priceToDestination: routeStops.priceToDestination,
    })
    .from(routeStops)
    .innerJoin(routes, eq(routeStops.routeId, routes.id))
    .innerJoin(stations, eq(routeStops.stationId, stations.id))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code), asc(routeStops.sequenceOrder));
}

export async function createVendorRouteStop(
  vendorUserId: number,
  input: {
    routeId: number;
    stationId: number;
    sequenceOrder: number;
    minutesFromDeparture: number;
    priceToDestination?: string;
  }
): Promise<AdminMutationResult> {
  const owned = await assertVendorOwnsRoute(vendorUserId, input.routeId);
  if (!owned) return { ok: false, error: "That route doesn't belong to your fleet." };

  try {
    await db.insert(routeStops).values({
      routeId: input.routeId,
      stationId: input.stationId,
      sequenceOrder: input.sequenceOrder,
      minutesFromDeparture: input.minutesFromDeparture,
      priceToDestination: input.priceToDestination ?? null,
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This station is already a stop on this route, or that stop order is taken." };
    }
    throw error;
  }
}

/**
 * Lets a vendor add a stop at a location picked from the map/Places search
 * rather than one of the admin-curated stations -- creates a new `stations`
 * row (category "intermediate") on the fly, then a route_stops row pointing
 * to it. The new station is a first-class row like any admin-created one
 * (same synthetic sourceId scheme), so it shows up in admin's station list
 * for cleanup/dedup if needed.
 */
export async function createVendorRouteStopAtNewLocation(
  vendorUserId: number,
  input: {
    routeId: number;
    stationName: string;
    city: string;
    latitude: string;
    longitude: string;
    sequenceOrder: number;
    minutesFromDeparture: number;
    priceToDestination?: string;
  }
): Promise<AdminMutationResult> {
  const owned = await assertVendorOwnsRoute(vendorUserId, input.routeId);
  if (!owned) return { ok: false, error: "That route doesn't belong to your fleet." };

  const sourceId = await nextSyntheticSourceId();
  let stationId: number;
  try {
    const [station] = await db
      .insert(stations)
      .values({
        sourceId,
        name: input.stationName,
        code: `V${Math.abs(sourceId)}`,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        category: "intermediate",
      })
      .returning({ id: stations.id });
    stationId = station.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "A station with that name already exists -- pick it from the existing-station list instead." };
    }
    throw error;
  }

  return createVendorRouteStop(vendorUserId, {
    routeId: input.routeId,
    stationId,
    sequenceOrder: input.sequenceOrder,
    minutesFromDeparture: input.minutesFromDeparture,
    priceToDestination: input.priceToDestination,
  });
}

export async function updateVendorRouteStop(
  vendorUserId: number,
  routeStopId: number,
  input: { sequenceOrder: number; minutesFromDeparture: number; priceToDestination?: string }
): Promise<AdminMutationResult> {
  const [stop] = await db
    .select({ routeId: routeStops.routeId })
    .from(routeStops)
    .where(eq(routeStops.id, routeStopId))
    .limit(1);
  if (!stop) return { ok: false, error: "Stop not found." };

  const owned = await assertVendorOwnsRoute(vendorUserId, stop.routeId);
  if (!owned) return { ok: false, error: "That route doesn't belong to your fleet." };

  try {
    await db
      .update(routeStops)
      .set({
        sequenceOrder: input.sequenceOrder,
        minutesFromDeparture: input.minutesFromDeparture,
        priceToDestination: input.priceToDestination ?? null,
      })
      .where(eq(routeStops.id, routeStopId));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That stop order is already taken on this route." };
    throw error;
  }
}

export async function deleteVendorRouteStop(vendorUserId: number, routeStopId: number): Promise<AdminMutationResult> {
  const [stop] = await db
    .select({ routeId: routeStops.routeId })
    .from(routeStops)
    .where(eq(routeStops.id, routeStopId))
    .limit(1);
  if (!stop) return { ok: false, error: "Stop not found." };

  const owned = await assertVendorOwnsRoute(vendorUserId, stop.routeId);
  if (!owned) return { ok: false, error: "That route doesn't belong to your fleet." };

  await db.delete(routeStops).where(eq(routeStops.id, routeStopId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Manual bookings -- lets a vendor record a phone-in/walk-in reservation on a
// customer's behalf. Reuses the same atomic seat-reservation path as online
// bookings (createBooking), tagging the row with createdByVendorUserId, then
// records an immediately-"paid" payments row (provider "manual") since no
// online payment ever happens for these.
// ---------------------------------------------------------------------------

export type CreateManualBookingResult = { ok: true; reference: string } | { ok: false; error: string };

const MANUAL_BOOKING_ERROR_MESSAGES: Record<string, string> = {
  invalid_date: "This departure doesn't run on that date.",
  trip_not_found: "That departure no longer exists.",
  sold_out: "Not enough free seats left on that departure.",
  price_unavailable: "This route doesn't have a price set yet.",
};

export async function createManualBookingForVendor(
  vendorUserId: number,
  input: {
    tripDepartureId: number;
    travelDate: string;
    passengerName: string;
    passengerPhone: string;
    passengerEmail: string | null;
    seats: number;
    routeStopId?: number;
    channel: "walk_in" | "phone" | "touch_screen";
    paid: boolean;
    /** Overrides the computed fare+fee total -- lets a vendor adjust for a discount, etc. */
    amountOverride?: string;
  }
): Promise<CreateManualBookingResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return { ok: false, error: "Not authorized." };

  const [ownedDeparture] = await db
    .select({ id: tripDepartures.id, routeId: tripDepartures.routeId })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(and(eq(tripDepartures.id, input.tripDepartureId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  if (!ownedDeparture) return { ok: false, error: "That departure doesn't belong to your fleet." };

  let priceOverride: string | undefined;
  if (input.routeStopId) {
    const [stop] = await db
      .select({ priceToDestination: routeStops.priceToDestination })
      .from(routeStops)
      .where(and(eq(routeStops.id, input.routeStopId), eq(routeStops.routeId, ownedDeparture.routeId)))
      .limit(1);
    if (!stop) return { ok: false, error: "That boarding stop isn't on this route." };
    if (stop.priceToDestination) priceOverride = stop.priceToDestination;
  }

  const result = await createBooking({
    tripDepartureId: input.tripDepartureId,
    travelDate: input.travelDate,
    passengerName: input.passengerName,
    passengerPhone: input.passengerPhone,
    passengerEmail: input.passengerEmail,
    seats: input.seats,
    createdByVendorUserId: vendorUserId,
    priceOverride,
    channel: input.channel,
  });

  if (!result.ok) {
    return { ok: false, error: MANUAL_BOOKING_ERROR_MESSAGES[result.error] ?? "Couldn't create that booking." };
  }

  const fareTotal = Number(result.priceAtBooking) * input.seats;
  const defaultAmount = (fareTotal + Number(MANUAL_BOOKING_SERVICE_FEE_EUR)).toFixed(2);

  await db.insert(payments).values({
    bookingId: result.bookingId,
    provider: "manual",
    amount: input.amountOverride ?? defaultAmount,
    currency: "EUR",
    status: input.paid ? "paid" : "pending",
  });

  return { ok: true, reference: result.reference };
}

async function verifyVendorOwnsBooking(vendorUserId: number, bookingId: number): Promise<boolean> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;
  const [owned] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(and(eq(bookings.id, bookingId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  return Boolean(owned);
}

export async function cancelVendorBooking(vendorUserId: number, bookingId: number): Promise<AdminMutationResult> {
  if (!(await verifyVendorOwnsBooking(vendorUserId, bookingId))) {
    return { ok: false, error: "That booking doesn't belong to your fleet." };
  }
  const cancelled = await cancelBookingForVendor(bookingId);
  return cancelled ? { ok: true } : { ok: false, error: "This booking is already cancelled." };
}

export async function updateVendorBookingDetails(
  vendorUserId: number,
  bookingId: number,
  input: { passengerName: string; passengerPhone: string; passengerEmail: string | null; channel: "walk_in" | "phone" | "touch_screen" }
): Promise<AdminMutationResult> {
  if (!(await verifyVendorOwnsBooking(vendorUserId, bookingId))) {
    return { ok: false, error: "That booking doesn't belong to your fleet." };
  }
  await db
    .update(bookings)
    .set({
      passengerName: input.passengerName,
      passengerPhone: input.passengerPhone,
      passengerEmail: input.passengerEmail,
      channel: input.channel,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
  return { ok: true };
}

export async function markVendorBookingPaid(vendorUserId: number, bookingId: number): Promise<AdminMutationResult> {
  if (!(await verifyVendorOwnsBooking(vendorUserId, bookingId))) {
    return { ok: false, error: "That booking doesn't belong to your fleet." };
  }
  const [booking] = await db.select({ channel: bookings.channel }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  // An online booking's payment status must only ever come from the real POK
  // confirmation (webhook/return/sweep) -- never a manual override, or anyone
  // could hand out a "paid" seat that was never actually charged.
  if (booking?.channel === "online") {
    return { ok: false, error: "Online bookings are paid automatically -- this can't be marked paid manually." };
  }
  const [latestPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!latestPayment) return { ok: false, error: "This booking has no payment record to update." };
  await db.update(payments).set({ status: "paid", updatedAt: new Date() }).where(eq(payments.id, latestPayment.id));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Team users -- an approved vendor can invite co-workers to log in under the
// same operator (vendor_users.operatorId already allows more than one row
// per operator). New teammates go straight to "approved": the admin queue
// exists to vet a new company, not each person on an already-vetted one.
// ---------------------------------------------------------------------------

export interface VendorTeamUserRow {
  id: number;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export async function listVendorTeamUsers(vendorUserId: number): Promise<VendorTeamUserRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      status: vendorUsers.status,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .where(eq(vendorUsers.operatorId, context.operatorId))
    .orderBy(asc(vendorUsers.createdAt));
}

export async function createVendorTeamUser(
  vendorUserId: number,
  input: { name: string; email: string; password: string }
): Promise<AdminMutationResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return { ok: false, error: "Not authorized." };

  try {
    await db.insert(vendorUsers).values({
      operatorId: context.operatorId,
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      status: "approved",
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already in use." };
    throw error;
  }
}

export async function deleteVendorTeamUser(vendorUserId: number, targetUserId: number): Promise<AdminMutationResult> {
  if (vendorUserId === targetUserId) return { ok: false, error: "You can't remove your own account." };
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return { ok: false, error: "Not authorized." };

  const [deleted] = await db
    .delete(vendorUsers)
    .where(and(eq(vendorUsers.id, targetUserId), eq(vendorUsers.operatorId, context.operatorId)))
    .returning({ id: vendorUsers.id });
  return deleted ? { ok: true } : { ok: false, error: "That teammate doesn't belong to your company." };
}

export interface PendingVendor {
  id: number;
  name: string;
  email: string;
  operatorName: string;
  createdAt: Date;
}

export async function listPendingVendors(): Promise<PendingVendor[]> {
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      operatorName: operators.name,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .where(eq(vendorUsers.status, "pending"))
    .orderBy(asc(vendorUsers.createdAt));
}

export async function setVendorStatus(
  vendorUserId: number,
  status: "approved" | "rejected"
): Promise<void> {
  await db
    .update(vendorUsers)
    .set({ status, updatedAt: new Date() })
    .where(eq(vendorUsers.id, vendorUserId));
}

export interface AdminVendorUserRow {
  id: number;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  operatorName: string;
  createdAt: Date;
}

export async function listAllVendorUsersForAdmin(): Promise<AdminVendorUserRow[]> {
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      status: vendorUsers.status,
      operatorName: operators.name,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .orderBy(desc(vendorUsers.createdAt));
}

export async function updateVendorUserForAdmin(
  vendorUserId: number,
  input: { name: string; email: string; password?: string }
): Promise<AdminMutationResult> {
  try {
    await db
      .update(vendorUsers)
      .set({
        name: input.name,
        email: input.email,
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(vendorUsers.id, vendorUserId));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already in use." };
    throw error;
  }
}

export async function deleteVendorUserForAdmin(vendorUserId: number): Promise<AdminMutationResult> {
  await db.delete(vendorUsers).where(eq(vendorUsers.id, vendorUserId));
  return { ok: true };
}

export interface AdminOperatorRow {
  id: number;
  name: string;
  vat: string;
  city: string | null;
  phone: string | null;
  routeCount: number;
}

export async function listAllOperators(): Promise<AdminOperatorRow[]> {
  const rows = await db
    .select({
      id: operators.id,
      name: operators.name,
      vat: operators.vat,
      city: operators.city,
      phone: operators.phone,
      routeCount: sql<number>`count(${routes.id})`,
    })
    .from(operators)
    .leftJoin(routes, eq(routes.operatorId, operators.id))
    .groupBy(operators.id)
    .orderBy(asc(operators.name));

  return rows.map((row) => ({ ...row, routeCount: Number(row.routeCount) }));
}

// ---------------------------------------------------------------------------
// Vendor self-signup: an operator either claims their existing (imported)
// company or registers a new one. Both land as a "pending" vendor_users row
// for an admin to approve at /admin/vendors — the same queue already used
// for approvals, nothing new on that side.
// ---------------------------------------------------------------------------

export interface ClaimableOperator {
  id: number;
  name: string;
  city: string | null;
}

export async function listClaimableOperators(): Promise<ClaimableOperator[]> {
  const rows = await db
    .select({
      id: operators.id,
      name: operators.name,
      city: operators.city,
      vendorEmail: vendorUsers.email,
      vendorStatus: vendorUsers.status,
    })
    .from(operators)
    .leftJoin(vendorUsers, eq(vendorUsers.operatorId, operators.id))
    .orderBy(asc(operators.name));

  const byOperator = new Map<number, ClaimableOperator & { claimed: boolean }>();
  for (const row of rows) {
    const isPlaceholder = !row.vendorEmail || row.vendorEmail.startsWith(PLACEHOLDER_VENDOR_EMAIL_PREFIX);
    const isActiveClaim = !isPlaceholder && (row.vendorStatus === "approved" || row.vendorStatus === "pending");
    const existing = byOperator.get(row.id);
    if (!existing) {
      byOperator.set(row.id, { id: row.id, name: row.name, city: row.city, claimed: isActiveClaim });
    } else if (isActiveClaim) {
      existing.claimed = true;
    }
  }

  return Array.from(byOperator.values())
    .filter((o) => !o.claimed)
    .map(({ id, name, city }) => ({ id, name, city }));
}

export type VendorSignupResult = { ok: true } | { ok: false; error: string };

export async function applyForExistingOperator(
  operatorId: number,
  input: { name: string; email: string; password: string }
): Promise<VendorSignupResult> {
  const [existingRow] = await db
    .select({ id: vendorUsers.id, email: vendorUsers.email, status: vendorUsers.status })
    .from(vendorUsers)
    .where(eq(vendorUsers.operatorId, operatorId))
    .limit(1);

  const isPlaceholder = !existingRow || existingRow.email.startsWith(PLACEHOLDER_VENDOR_EMAIL_PREFIX);
  const isActiveClaim = existingRow && !isPlaceholder && existingRow.status !== "rejected";
  if (isActiveClaim) {
    return { ok: false, error: "This company already has an active account. Contact support if that's a mistake." };
  }

  const passwordHash = hashPassword(input.password);
  try {
    if (existingRow) {
      await db
        .update(vendorUsers)
        .set({ email: input.email, passwordHash, name: input.name, status: "pending", updatedAt: new Date() })
        .where(eq(vendorUsers.id, existingRow.id));
    } else {
      await db.insert(vendorUsers).values({
        operatorId,
        email: input.email,
        passwordHash,
        name: input.name,
        status: "pending",
      });
    }
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "That email is already used by another vendor account." };
    }
    throw error;
  }
}

export async function applyAsNewOperator(input: {
  operatorName: string;
  vat: string;
  phone: string | null;
  street: string | null;
  city: string | null;
  contactName: string;
  email: string;
  password: string;
}): Promise<VendorSignupResult> {
  const passwordHash = hashPassword(input.password);
  try {
    await db.execute(sql`
      with created_operator as (
        insert into ${operators} (
          ${sql.identifier(operators.name.name)},
          ${sql.identifier(operators.vat.name)},
          ${sql.identifier(operators.phone.name)},
          ${sql.identifier(operators.street.name)},
          ${sql.identifier(operators.city.name)}
        )
        values (${input.operatorName}, ${input.vat}, ${input.phone}, ${input.street}, ${input.city})
        returning ${operators.id}
      )
      insert into ${vendorUsers} (
        ${sql.identifier(vendorUsers.operatorId.name)},
        ${sql.identifier(vendorUsers.email.name)},
        ${sql.identifier(vendorUsers.passwordHash.name)},
        ${sql.identifier(vendorUsers.name.name)},
        ${sql.identifier(vendorUsers.status.name)}
      )
      select created_operator.id, ${input.email}, ${passwordHash}, ${input.contactName}, 'pending'
      from created_operator
    `);
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const constraint = violatedConstraint(error);
      if (constraint === "vendor_users_email_unique") {
        return { ok: false, error: "That email is already used by another vendor account." };
      }
      return { ok: false, error: "That VAT/tax number is already registered." };
    }
    throw error;
  }
}
