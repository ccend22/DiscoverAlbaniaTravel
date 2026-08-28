import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../index";
import { bookings, operators, payments, routeStops, routes, stations, ticketScans, tripDepartures, tripInventories, vendorUsers } from "../schema";
import { albaniaLocalDateTimeToDate, getAlbaniaDateInputValue } from "@/lib/timezone";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isUniqueViolation, violatedConstraint } from "./db-errors";
import { cancelBookingForVendor, createBooking } from "./bookings";
import { nextSyntheticSourceId } from "./admin-stations";
import { recordAdminDelete } from "./audit-log";
import { MANUAL_BOOKING_SERVICE_FEE_EUR } from "@/lib/manual-booking";
import { parseTicketQrPayload } from "@/lib/ticket-code";

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
      isOwner: vendorUsers.isOwner,
      permissions: vendorUsers.permissions,
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

  const fromStation = alias(stations, "vendor_departure_from_station");
  const toStation = alias(stations, "vendor_departure_to_station");

  return db
    .select({
      id: tripDepartures.id,
      routeId: tripDepartures.routeId,
      routeCode: routes.code,
      routeLongName: routes.longName,
      fromStationName: fromStation.name,
      toStationName: toStation.name,
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
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
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

export interface VendorDailyOverview {
  date: string;
  departuresRunning: number;
  bookingsCount: number;
  seatsBooked: number;
  checkedIn: number;
  totalCapacity: number;
  occupancyPercent: number;
}

/** Single-day snapshot for the overview page's date picker -- what's scheduled, booked, and boarded on that one date. */
export async function getVendorDailyOverview(vendorUserId: number, date: string): Promise<VendorDailyOverview | null> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return null;

  const departures = await db
    .select({ plannedSeats: tripDepartures.plannedSeats, weekdays: tripDepartures.weekdays })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(eq(routes.operatorId, context.operatorId));

  const isoDow = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const runningToday = departures.filter((d) => d.weekdays.includes(isoDow));
  const totalCapacity = runningToday.reduce((sum, d) => sum + d.plannedSeats, 0);

  const [bookingStats] = await db
    .select({
      bookingsCount: sql<number>`count(*)`,
      seatsBooked: sql<number>`coalesce(sum(${bookings.seats}), 0)`,
      checkedIn: sql<number>`count(*) filter (where ${bookings.ticketCheckedInAt} is not null)`,
    })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(and(eq(routes.operatorId, context.operatorId), eq(bookings.travelDate, date), eq(bookings.status, "confirmed")));

  const seatsBooked = Number(bookingStats?.seatsBooked ?? 0);

  return {
    date,
    departuresRunning: runningToday.length,
    bookingsCount: Number(bookingStats?.bookingsCount ?? 0),
    seatsBooked,
    checkedIn: Number(bookingStats?.checkedIn ?? 0),
    totalCapacity,
    occupancyPercent: totalCapacity > 0 ? Math.round((seatsBooked / totalCapacity) * 100) : 0,
  };
}

export interface VendorMonthDaySummary {
  date: string;
  departuresRunning: number;
  bookingsCount: number;
  seatsBooked: number;
}

/** One row per calendar day in the given month -- powers the Overview page's month-grid picker, so each cell can show a quick per-day badge without a round trip per click. */
export async function getVendorMonthOverview(vendorUserId: number, year: number, month: number): Promise<VendorMonthDaySummary[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  const departures = await db
    .select({ plannedSeats: tripDepartures.plannedSeats, weekdays: tripDepartures.weekdays })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(eq(routes.operatorId, context.operatorId));

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateList = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const bookingRows = await db
    .select({
      travelDate: bookings.travelDate,
      bookingsCount: sql<number>`count(*)`,
      seatsBooked: sql<number>`coalesce(sum(${bookings.seats}), 0)`,
    })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(
      and(
        eq(routes.operatorId, context.operatorId),
        eq(bookings.status, "confirmed"),
        gte(bookings.travelDate, dateList[0]),
        lte(bookings.travelDate, dateList[dateList.length - 1])
      )
    )
    .groupBy(bookings.travelDate);

  const bookingsByDate = new Map(bookingRows.map((row) => [row.travelDate, row]));

  return dateList.map((date) => {
    const isoDow = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const departuresRunning = departures.filter((d) => d.weekdays.includes(isoDow)).length;
    const row = bookingsByDate.get(date);
    return {
      date,
      departuresRunning,
      bookingsCount: Number(row?.bookingsCount ?? 0),
      seatsBooked: Number(row?.seatsBooked ?? 0),
    };
  });
}

export interface VendorManifestPassenger {
  bookingReference: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seats: number;
  channel: "online" | "walk_in" | "phone" | "touch_screen";
  checkedInAt: Date | null;
}

export interface VendorManifest {
  tripDepartureId: number;
  routeId: number;
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
      routeId: routes.id,
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
      checkedInAt: bookings.ticketCheckedInAt,
    })
    .from(bookings)
    .where(and(eq(bookings.tripDepartureId, tripDepartureId), eq(bookings.travelDate, date), eq(bookings.status, "confirmed")))
    .orderBy(asc(bookings.passengerName));

  return {
    tripDepartureId: departure.id,
    routeId: departure.routeId,
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
  checkedInAt: Date | null;
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
        where ${payments.bookingId} = bookings.id
        order by ${payments.createdAt} desc
        limit 1
      )`,
      checkedInAt: bookings.ticketCheckedInAt,
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

export interface VendorFinanceTransactionRow {
  bookingId: number;
  bookingReference: string;
  bookingStatus: "confirmed" | "cancelled";
  channel: "online" | "walk_in" | "phone" | "touch_screen";
  seats: number;
  travelDate: string;
  createdAt: Date;
  routeCode: string;
  fromStationName: string;
  toStationName: string;
  paymentAmount: string | null;
  paymentCurrency: string | null;
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled" | null;
  paymentProvider: string | null;
  paymentEffectiveAt: Date | null;
}

/**
 * Minimal finance ledger for one operator. Each booking is paired with only
 * its latest payment attempt; older attempts must not inflate the operator's
 * totals. Authorization is repeated here so this DTO can never expose another
 * operator's money when called from a future surface.
 */
export async function listVendorFinanceTransactions(vendorUserId: number): Promise<VendorFinanceTransactionRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  const fromStation = alias(stations, "vendor_finance_from_station");
  const toStation = alias(stations, "vendor_finance_to_station");
  const latestPayments = db
    .select({
      bookingId: payments.bookingId,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      provider: payments.provider,
      effectiveAt: sql<Date>`coalesce(${payments.updatedAt}, ${payments.createdAt})`.as("effective_at"),
      rowNumber: sql<number>`row_number() over (partition by ${payments.bookingId} order by ${payments.createdAt} desc)`.as("row_number"),
    })
    .from(payments)
    .where(isNotNull(payments.bookingId))
    .as("vendor_finance_latest_payments");

  const rows = await db
    .select({
      bookingId: bookings.id,
      bookingReference: bookings.bookingReference,
      bookingStatus: bookings.status,
      channel: bookings.channel,
      seats: bookings.seats,
      travelDate: bookings.travelDate,
      createdAt: bookings.createdAt,
      routeCode: routes.code,
      fromStationName: fromStation.name,
      toStationName: toStation.name,
      paymentAmount: latestPayments.amount,
      paymentCurrency: latestPayments.currency,
      paymentStatus: latestPayments.status,
      paymentProvider: latestPayments.provider,
      paymentEffectiveAt: latestPayments.effectiveAt,
    })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .leftJoin(latestPayments, and(eq(latestPayments.bookingId, bookings.id), eq(latestPayments.rowNumber, 1)))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(desc(bookings.createdAt));

  // The raw `sql<Date>` coalesce above only asserts a TS type -- the neon-http
  // driver actually hands back a plain timestamp string for it (unlike a
  // plain typed column select, which drizzle converts for us), so it needs
  // an explicit Date conversion here or every consumer would crash trying to
  // format it as one.
  return rows.map((row) => ({
    ...row,
    paymentEffectiveAt: row.paymentEffectiveAt ? new Date(row.paymentEffectiveAt) : null,
  }));
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
    routeStopId: input.routeStopId,
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

export interface TicketValidationDetails {
  bookingReference: string;
  passengerName: string;
  seats: number;
  travelDate: string;
  routeCode: string;
  fromStationName: string;
  toStationName: string;
  boardingStationName: string;
  scheduledBoardingAt: string;
  checkedInAt: string | null;
}

export type TicketValidationResult =
  | ({ status: "valid" | "valid_off_hours" | "already_used" | "too_early" | "expired" | "cancelled" | "unpaid" | "wrong_route" } & TicketValidationDetails)
  // A ticket that belongs to a different operator entirely -- deliberately a
  // minimal shape (no passenger name/phone/etc) since the scanning
  // operator's staff has no business seeing another company's customer.
  | { status: "wrong_operator"; routeCode: string; operatorName: string }
  | { status: "invalid_code" | "not_found" };

async function recordTicketScan(input: {
  vendorUserId: number;
  operatorId: number;
  bookingId: number | null;
  expectedRouteId: number | null;
  scannedValue: string;
  result: TicketValidationResult["status"];
}): Promise<void> {
  await db.insert(ticketScans).values({
    vendorUserId: input.vendorUserId,
    operatorId: input.operatorId,
    bookingId: input.bookingId,
    expectedRouteId: input.expectedRouteId,
    scannedValue: input.scannedValue,
    result: input.result,
  });
}

/**
 * Validates and consumes one ticket for the signed-in vendor. Expiry is
 * governed purely by the travel date (Albania calendar day) -- a scan
 * outside the scheduled boarding/arrival hour but still on the right date
 * still checks the passenger in ("valid_off_hours"), it's just flagged so
 * staff can double check, since real departures routinely run early or
 * late. When `expectedRouteId` is set (the scanner was opened from a
 * specific route's manifest), a ticket for a different route on the SAME
 * operator is flagged "wrong_route" before any other check. A ticket that
 * doesn't belong to this operator at all is flagged "wrong_operator"
 * instead of a plain "not found", so staff know it's a different company's
 * line rather than a bad/garbage code. Every attempt (including invalid
 * codes and mismatches) is logged to ticket_scans for the audit trail.
 */
export async function validateTicketForVendor(
  vendorUserId: number,
  scannedValue: string,
  expectedRouteId?: number,
  now = new Date()
): Promise<TicketValidationResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return { status: "not_found" };

  const log = (result: TicketValidationResult, bookingId: number | null = null) =>
    recordTicketScan({
      vendorUserId,
      operatorId: context.operatorId,
      bookingId,
      expectedRouteId: expectedRouteId ?? null,
      scannedValue,
      result: result.status,
    }).then(() => result);

  const ticketToken = parseTicketQrPayload(scannedValue);
  const bookingReference = scannedValue.trim().toUpperCase();
  const referenceIsValid = /^DA-[A-Z0-9]{4,32}$/.test(bookingReference);
  if (!ticketToken && !referenceIsValid) return log({ status: "invalid_code" });

  const fromStation = alias(stations, "ticket_validation_from_station");
  const toStation = alias(stations, "ticket_validation_to_station");
  const boardingStation = alias(stations, "ticket_validation_boarding_station");
  const matchesScannedTicket = ticketToken
    ? eq(bookings.ticketToken, ticketToken)
    : eq(bookings.bookingReference, bookingReference);

  const [ticket] = await db
    .select({
      bookingId: bookings.id,
      bookingReference: bookings.bookingReference,
      passengerName: bookings.passengerName,
      seats: bookings.seats,
      travelDate: bookings.travelDate,
      bookingStatus: bookings.status,
      checkedInAt: bookings.ticketCheckedInAt,
      routeId: routes.id,
      routeCode: routes.code,
      fromStationName: fromStation.name,
      toStationName: toStation.name,
      boardingStationName: sql<string>`coalesce(${boardingStation.name}, ${fromStation.name})`,
      minutesFromDeparture: sql<number>`coalesce(${routeStops.minutesFromDeparture}, 0)`,
      departureTime: tripDepartures.departureTime,
      arrivalTime: tripDepartures.arrivalTime,
      paymentStatus: sql<VendorBookingRow["paymentStatus"]>`(
        select ${payments.status} from ${payments}
        where ${payments.bookingId} = bookings.id
        order by ${payments.createdAt} desc
        limit 1
      )`,
    })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(fromStation, eq(tripDepartures.fromStationId, fromStation.id))
    .innerJoin(toStation, eq(tripDepartures.toStationId, toStation.id))
    .leftJoin(routeStops, eq(bookings.routeStopId, routeStops.id))
    .leftJoin(boardingStation, eq(routeStops.stationId, boardingStation.id))
    .where(and(eq(routes.operatorId, context.operatorId), matchesScannedTicket))
    .limit(1);

  if (!ticket) {
    const [otherOperatorTicket] = await db
      .select({ routeCode: routes.code, operatorName: operators.name })
      .from(bookings)
      .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
      .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
      .innerJoin(operators, eq(routes.operatorId, operators.id))
      .where(matchesScannedTicket)
      .limit(1);
    return log(
      otherOperatorTicket
        ? { status: "wrong_operator", routeCode: otherOperatorTicket.routeCode, operatorName: otherOperatorTicket.operatorName }
        : { status: "not_found" }
    );
  }

  const departureAt = albaniaLocalDateTimeToDate(ticket.travelDate, ticket.departureTime);
  const boardingAt = new Date(departureAt.getTime() + Number(ticket.minutesFromDeparture) * 60_000);
  let arrivalAt = albaniaLocalDateTimeToDate(ticket.travelDate, ticket.arrivalTime);
  if (arrivalAt <= departureAt) arrivalAt = new Date(arrivalAt.getTime() + 24 * 60 * 60_000);

  const details: TicketValidationDetails = {
    bookingReference: ticket.bookingReference,
    passengerName: ticket.passengerName,
    seats: ticket.seats,
    travelDate: ticket.travelDate,
    routeCode: ticket.routeCode,
    fromStationName: ticket.fromStationName,
    toStationName: ticket.toStationName,
    boardingStationName: ticket.boardingStationName,
    scheduledBoardingAt: boardingAt.toISOString(),
    checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
  };

  if (expectedRouteId !== undefined && ticket.routeId !== expectedRouteId) {
    return log({ status: "wrong_route", ...details }, ticket.bookingId);
  }
  if (ticket.bookingStatus !== "confirmed") return log({ status: "cancelled", ...details }, ticket.bookingId);
  if (ticket.paymentStatus !== "paid") return log({ status: "unpaid", ...details }, ticket.bookingId);
  if (ticket.checkedInAt) return log({ status: "already_used", ...details }, ticket.bookingId);

  const validFrom = albaniaLocalDateTimeToDate(ticket.travelDate, "00:00").getTime();
  const validUntil = albaniaLocalDateTimeToDate(ticket.travelDate, "23:59").getTime() + 60_000;
  if (now.getTime() < validFrom) return log({ status: "too_early", ...details }, ticket.bookingId);
  if (now.getTime() > validUntil) return log({ status: "expired", ...details }, ticket.bookingId);

  const onScheduleFrom = boardingAt.getTime() - 2 * 60 * 60_000;
  const onScheduleUntil = arrivalAt.getTime() + 2 * 60 * 60_000;
  const offHours = now.getTime() < onScheduleFrom || now.getTime() > onScheduleUntil;

  const [checkedIn] = await db
    .update(bookings)
    .set({ ticketCheckedInAt: now, ticketCheckedInByVendorUserId: vendorUserId, updatedAt: now })
    .where(and(eq(bookings.id, ticket.bookingId), isNull(bookings.ticketCheckedInAt)))
    .returning({ checkedInAt: bookings.ticketCheckedInAt });

  if (!checkedIn?.checkedInAt) {
    const [alreadyUsed] = await db
      .select({ checkedInAt: bookings.ticketCheckedInAt })
      .from(bookings)
      .where(eq(bookings.id, ticket.bookingId))
      .limit(1);
    return log(
      {
        status: "already_used",
        ...details,
        checkedInAt: alreadyUsed?.checkedInAt?.toISOString() ?? details.checkedInAt,
      },
      ticket.bookingId
    );
  }

  return log(
    { status: offHours ? "valid_off_hours" : "valid", ...details, checkedInAt: checkedIn.checkedInAt.toISOString() },
    ticket.bookingId
  );
}

export interface VendorScanLogRow {
  id: number;
  scannedAt: Date;
  vendorUserName: string;
  result: string;
  bookingReference: string | null;
  routeCode: string | null;
}

/** Recent ticket-scan activity for this operator, newest first -- who scanned what, when, and with what outcome. */
export async function listVendorScanLog(vendorUserId: number, limit = 100): Promise<VendorScanLogRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  const scannerUser = alias(vendorUsers, "scan_log_vendor_user");
  return db
    .select({
      id: ticketScans.id,
      scannedAt: ticketScans.scannedAt,
      vendorUserName: scannerUser.name,
      result: ticketScans.result,
      bookingReference: bookings.bookingReference,
      routeCode: routes.code,
    })
    .from(ticketScans)
    .innerJoin(scannerUser, eq(ticketScans.vendorUserId, scannerUser.id))
    .leftJoin(bookings, eq(ticketScans.bookingId, bookings.id))
    .leftJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .leftJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(eq(ticketScans.operatorId, context.operatorId))
    .orderBy(desc(ticketScans.scannedAt))
    .limit(limit);
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

export interface VendorBookingTicket {
  bookingReference: string;
  ticketToken: string;
  isPaid: boolean;
  checkedInAt: string | null;
}

/** Ticket data for the QR panel shown inline in the booking edit modal -- scoped the same way every other vendor booking mutation is, so one operator's staff can never pull up another operator's ticket by guessing a booking id. */
export async function getVendorBookingTicket(vendorUserId: number, bookingId: number): Promise<VendorBookingTicket | null> {
  if (!(await verifyVendorOwnsBooking(vendorUserId, bookingId))) return null;

  const [booking] = await db
    .select({
      bookingReference: bookings.bookingReference,
      ticketToken: bookings.ticketToken,
      bookingStatus: bookings.status,
      checkedInAt: bookings.ticketCheckedInAt,
      paymentStatus: sql<VendorBookingRow["paymentStatus"]>`(
        select ${payments.status} from ${payments}
        where ${payments.bookingId} = bookings.id
        order by ${payments.createdAt} desc
        limit 1
      )`,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return null;

  return {
    bookingReference: booking.bookingReference,
    ticketToken: booking.ticketToken,
    isPaid: booking.bookingStatus === "confirmed" && booking.paymentStatus === "paid",
    checkedInAt: booking.checkedInAt?.toISOString() ?? null,
  };
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
  isOwner: boolean;
  permissions: string[];
  createdAt: Date;
}

/** Only the owner manages the team -- a non-owner (or unapproved vendor) sees an empty list, mirroring the page-level redirect. */
export async function listVendorTeamUsers(vendorUserId: number): Promise<VendorTeamUserRow[]> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return [];
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      status: vendorUsers.status,
      isOwner: vendorUsers.isOwner,
      permissions: vendorUsers.permissions,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .where(eq(vendorUsers.operatorId, context.operatorId))
    .orderBy(asc(vendorUsers.createdAt));
}

export async function createVendorTeamUser(
  vendorUserId: number,
  input: { name: string; email: string; password: string; permissions: string[] }
): Promise<AdminMutationResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return { ok: false, error: "Not authorized." };

  try {
    await db.insert(vendorUsers).values({
      operatorId: context.operatorId,
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      status: "approved",
      isOwner: false,
      permissions: input.permissions,
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already in use." };
    throw error;
  }
}

export async function updateVendorTeamUserPermissions(
  vendorUserId: number,
  targetUserId: number,
  permissions: string[]
): Promise<AdminMutationResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return { ok: false, error: "Not authorized." };

  const [updated] = await db
    .update(vendorUsers)
    .set({ permissions, updatedAt: new Date() })
    // isOwner excluded on purpose -- permissions are only ever meaningful for
    // a non-owner teammate, so this can't be used to demote/promote ownership.
    .where(and(eq(vendorUsers.id, targetUserId), eq(vendorUsers.operatorId, context.operatorId), eq(vendorUsers.isOwner, false)))
    .returning({ id: vendorUsers.id });
  return updated ? { ok: true } : { ok: false, error: "That teammate doesn't belong to your company." };
}

export async function deleteVendorTeamUser(vendorUserId: number, targetUserId: number): Promise<AdminMutationResult> {
  if (vendorUserId === targetUserId) return { ok: false, error: "You can't remove your own account." };
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return { ok: false, error: "Not authorized." };

  const [deleted] = await db
    .delete(vendorUsers)
    .where(and(eq(vendorUsers.id, targetUserId), eq(vendorUsers.operatorId, context.operatorId), eq(vendorUsers.isOwner, false)))
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

export async function deleteVendorUserForAdmin(adminUserId: number, vendorUserId: number): Promise<AdminMutationResult> {
  const [deleted] = await db.delete(vendorUsers).where(eq(vendorUsers.id, vendorUserId)).returning();
  if (!deleted) return { ok: false, error: "Vendor user not found." };
  await recordAdminDelete(adminUserId, "vendor_user", vendorUserId, deleted);
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
        .set({ email: input.email, passwordHash, name: input.name, status: "pending", isOwner: true, updatedAt: new Date() })
        .where(eq(vendorUsers.id, existingRow.id));
    } else {
      await db.insert(vendorUsers).values({
        operatorId,
        email: input.email,
        passwordHash,
        name: input.name,
        status: "pending",
        isOwner: true,
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
        ${sql.identifier(vendorUsers.status.name)},
        ${sql.identifier(vendorUsers.isOwner.name)}
      )
      select created_operator.id, ${input.email}, ${passwordHash}, ${input.contactName}, 'pending', true
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
