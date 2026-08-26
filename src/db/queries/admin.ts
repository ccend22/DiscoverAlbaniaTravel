import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import {
  adminUsers,
  bookings,
  operators,
  payments,
  routes,
  stations,
  taxiProviderUsers,
  taxiProviders,
  taxiRideRequests,
  taxiVehicles,
  tripDepartures,
  tripInventories,
  users,
  vendorUsers,
} from "../schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getTripDepartureById, type TripDepartureDetail } from "./trips";
import { cancelBookingForAdmin, getLatestPaymentStatus } from "./bookings";
import { isForeignKeyViolation, isUniqueViolation } from "./db-errors";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ id: number } | null> {
  const [admin] = await db
    .select({ id: adminUsers.id, passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()))
    .limit(1);

  if (!admin || !verifyPassword(password, admin.passwordHash)) return null;
  return { id: admin.id };
}

export interface AdminOverviewStats {
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  activeOperators: number;
  upcomingDepartures: number;
  pendingVendorApplications: number;
  taxiRequests: number;
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const today = getAlbaniaDateInputValue();

  // A booking is "confirmed" the instant it's reserved, before its payment
  // resolves (see src/db/queries/payments.ts) -- so these headline numbers
  // are scoped to bookings with an actually-paid payment row, not just the
  // reservation flag, to avoid inflating revenue/counts with unpaid holds.
  const paidBookingExists = sql`exists (
    select 1 from ${payments}
    where ${payments.bookingId} = ${bookings.id} and ${payments.status} = 'paid'
  )`;

  const [row] = await db
    .select({
      totalBookings: sql<number>`(select count(*) from ${bookings})`,
      confirmedBookings: sql<number>`(select count(*) from ${bookings} where ${bookings.status} = 'confirmed' and ${paidBookingExists})`,
      totalRevenue: sql<number>`(select coalesce(sum(${bookings.priceAtBooking} * ${bookings.seats}), 0) from ${bookings} where ${bookings.status} = 'confirmed' and ${paidBookingExists})`,
      activeOperators: sql<number>`(select count(*) from ${operators})`,
      upcomingDepartures: sql<number>`(select count(*) from ${bookings} where ${bookings.status} = 'confirmed' and ${bookings.travelDate} >= ${today} and ${paidBookingExists})`,
      pendingVendorApplications: sql<number>`(select count(*) from ${vendorUsers} where ${vendorUsers.status} = 'pending')`,
      taxiRequests: sql<number>`(select count(*) from ${taxiRideRequests})`,
    })
    .from(sql`(select 1) as singleton`)
    .limit(1);

  return {
    totalBookings: Number(row?.totalBookings ?? 0),
    confirmedBookings: Number(row?.confirmedBookings ?? 0),
    totalRevenue: Number(row?.totalRevenue ?? 0),
    activeOperators: Number(row?.activeOperators ?? 0),
    upcomingDepartures: Number(row?.upcomingDepartures ?? 0),
    pendingVendorApplications: Number(row?.pendingVendorApplications ?? 0),
    taxiRequests: Number(row?.taxiRequests ?? 0),
  };
}

export async function listTaxiProvidersForAdmin() {
  return db
    .select({
      id: taxiProviders.id,
      name: taxiProviders.name,
      phone: taxiProviders.phone,
      email: taxiProviders.email,
      city: taxiProviders.city,
      status: taxiProviders.status,
      createdAt: taxiProviders.createdAt,
      contactName: taxiProviderUsers.name,
      loginEmail: taxiProviderUsers.email,
      vehicleCount: sql<number>`(select count(*) from ${taxiVehicles} where ${taxiVehicles.taxiProviderId} = ${taxiProviders.id})`,
    })
    .from(taxiProviders)
    .leftJoin(taxiProviderUsers, eq(taxiProviderUsers.taxiProviderId, taxiProviders.id))
    .orderBy(desc(taxiProviders.createdAt));
}

export async function setTaxiProviderStatus(
  taxiProviderId: number,
  status: "approved" | "rejected"
) {
  await db
    .update(taxiProviders)
    .set({ status, updatedAt: new Date() })
    .where(eq(taxiProviders.id, taxiProviderId));
}

export async function getTaxiProviderForAdmin(taxiProviderId: number) {
  const [provider] = await db
    .select()
    .from(taxiProviders)
    .where(eq(taxiProviders.id, taxiProviderId))
    .limit(1);
  return provider ?? null;
}

export async function updateTaxiProviderForAdmin(
  taxiProviderId: number,
  input: { name: string; phone: string; email: string | null; city: string }
) {
  await db
    .update(taxiProviders)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(taxiProviders.id, taxiProviderId));
}

export async function deleteTaxiProviderForAdmin(taxiProviderId: number): Promise<AdminMutationResult> {
  await db.delete(taxiProviders).where(eq(taxiProviders.id, taxiProviderId));
  return { ok: true };
}

export async function listTaxiVehiclesForAdmin(taxiProviderId: number) {
  return db
    .select()
    .from(taxiVehicles)
    .where(eq(taxiVehicles.taxiProviderId, taxiProviderId))
    .orderBy(desc(taxiVehicles.id));
}

export async function createTaxiVehicleForAdmin(
  taxiProviderId: number,
  input: { make: string; model: string; plateNumber: string; passengerCapacity: number }
): Promise<AdminMutationResult> {
  try {
    await db.insert(taxiVehicles).values({ taxiProviderId, ...input });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That plate number is already registered." };
    throw error;
  }
}

export async function deleteTaxiVehicleForAdmin(vehicleId: number): Promise<AdminMutationResult> {
  try {
    await db.delete(taxiVehicles).where(eq(taxiVehicles.id, vehicleId));
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "This vehicle has ride history and can't be deleted." };
    }
    throw error;
  }
}

export async function listTaxiRequestsForAdmin(limit = 100) {
  return db
    .select({
      id: taxiRideRequests.id,
      requestReference: taxiRideRequests.requestReference,
      pickupLocation: taxiRideRequests.pickupLocation,
      destination: taxiRideRequests.destination,
      pickupAt: taxiRideRequests.pickupAt,
      passengers: taxiRideRequests.passengers,
      passengerName: taxiRideRequests.passengerName,
      passengerPhone: taxiRideRequests.passengerPhone,
      passengerEmail: taxiRideRequests.passengerEmail,
      quotedPrice: taxiRideRequests.quotedPrice,
      status: taxiRideRequests.status,
      providerName: taxiProviders.name,
      createdAt: taxiRideRequests.createdAt,
    })
    .from(taxiRideRequests)
    .leftJoin(taxiProviders, eq(taxiRideRequests.taxiProviderId, taxiProviders.id))
    .orderBy(desc(taxiRideRequests.createdAt))
    .limit(limit);
}

export async function updateTaxiRequestStatusForAdmin(
  requestId: number,
  status: "requested" | "accepted" | "declined" | "cancelled" | "completed"
) {
  await db
    .update(taxiRideRequests)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "requested"
        ? {
            taxiProviderId: null,
            taxiVehicleId: null,
            acceptedByTaxiProviderUserId: null,
            quotedPrice: null,
          }
        : {}),
    })
    .where(eq(taxiRideRequests.id, requestId));
}

export async function listUsersForAdmin() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      status: users.status,
      createdAt: users.createdAt,
      bookingCount: sql<number>`(select count(*) from ${bookings} where ${bookings.userId} = ${users.id})`,
      taxiRequestCount: sql<number>`(select count(*) from ${taxiRideRequests} where ${taxiRideRequests.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function setUserStatus(userId: number, status: "active" | "suspended") {
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserForAdmin(
  userId: number,
  input: { name: string; email: string; phone: string | null }
): Promise<AdminMutationResult> {
  try {
    await db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, userId));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already in use." };
    throw error;
  }
}

export async function deleteUserForAdmin(userId: number): Promise<AdminMutationResult> {
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}

export async function listPaymentsForAdmin(limit = 100) {
  const rows = await db
    .select({
      id: payments.id,
      provider: payments.provider,
      providerPaymentId: payments.providerPaymentId,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      bookingReference: bookings.bookingReference,
      taxiRequestReference: taxiRideRequests.requestReference,
      bookingPassengerName: bookings.passengerName,
      bookingPassengerPhone: bookings.passengerPhone,
      bookingPassengerEmail: bookings.passengerEmail,
      taxiPassengerName: taxiRideRequests.passengerName,
      taxiPassengerPhone: taxiRideRequests.passengerPhone,
      taxiPassengerEmail: taxiRideRequests.passengerEmail,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .leftJoin(taxiRideRequests, eq(payments.taxiRideRequestId, taxiRideRequests.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit);

  return rows.map(({ bookingPassengerName, bookingPassengerPhone, bookingPassengerEmail, taxiPassengerName, taxiPassengerPhone, taxiPassengerEmail, ...row }) => ({
    ...row,
    passengerName: bookingPassengerName ?? taxiPassengerName,
    passengerPhone: bookingPassengerPhone ?? taxiPassengerPhone,
    passengerEmail: bookingPassengerEmail ?? taxiPassengerEmail,
  }));
}

export async function getOperatorForAdmin(operatorId: number) {
  const [operator] = await db.select().from(operators).where(eq(operators.id, operatorId)).limit(1);
  return operator ?? null;
}

export async function listRoutesForAdminOperator(operatorId: number) {
  return db
    .select({ id: routes.id, code: routes.code, longName: routes.longName })
    .from(routes)
    .where(eq(routes.operatorId, operatorId))
    .orderBy(asc(routes.code));
}

export async function listDeparturesForAdminOperator(operatorId: number) {
  return db
    .select({
      id: tripDepartures.id,
      routeCode: routes.code,
      routeLongName: routes.longName,
      fromStationName: stations.name,
      departureTime: tripDepartures.departureTime,
      arrivalTime: tripDepartures.arrivalTime,
      weekdays: tripDepartures.weekdays,
      basePrice: tripDepartures.basePrice,
      plannedSeats: tripDepartures.plannedSeats,
      freeSeats: tripDepartures.freeSeats,
      canBoard: tripDepartures.canBoard,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(stations, eq(tripDepartures.fromStationId, stations.id))
    .where(eq(routes.operatorId, operatorId))
    .orderBy(asc(routes.code), asc(tripDepartures.departureTime));
}

export async function updateOperatorForAdmin(
  operatorId: number,
  input: { name: string; phone: string | null; email: string | null; street: string | null; city: string | null }
) {
  await db.update(operators).set(input).where(eq(operators.id, operatorId));
}

export async function updateRouteForAdmin(
  operatorId: number,
  routeId: number,
  input: { code: string; longName: string }
): Promise<AdminMutationResult> {
  try {
    const [updated] = await db
      .update(routes)
      .set({ code: input.code.toUpperCase(), longName: input.longName })
      .where(and(eq(routes.id, routeId), eq(routes.operatorId, operatorId)))
      .returning({ id: routes.id });
    if (!updated) return { ok: false, error: "Route not found." };
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That route code is already in use." };
    throw error;
  }
}

export async function updateDepartureForAdmin(input: {
  tripDepartureId: number;
  departureTime: string;
  arrivalTime: string;
  basePrice: string;
  plannedSeats: number;
  freeSeats: number;
  canBoard: boolean;
  weekdays: number[];
}) {
  const [owned] = await db
    .select({ operatorId: routes.operatorId })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(eq(tripDepartures.id, input.tripDepartureId))
    .limit(1);
  if (!owned) return null;
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
  return owned.operatorId;
}

export async function createOperatorForAdmin(input: {
  name: string;
  vat: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
}): Promise<{ ok: true; operatorId: number } | { ok: false; error: string }> {
  try {
    const lockedPasswordHash = hashPassword(randomBytes(32).toString("base64url"));
    const result = await db.execute<{ id: number }>(sql`
      with created_operator as (
        insert into ${operators} (
          ${sql.identifier(operators.name.name)},
          ${sql.identifier(operators.vat.name)},
          ${sql.identifier(operators.phone.name)},
          ${sql.identifier(operators.email.name)},
          ${sql.identifier(operators.street.name)},
          ${sql.identifier(operators.city.name)}
        )
        values (${input.name}, ${input.vat}, ${input.phone}, ${input.email}, ${input.street}, ${input.city})
        returning ${operators.id}
      ),
      created_vendor as (
        insert into ${vendorUsers} (
          ${sql.identifier(vendorUsers.operatorId.name)},
          ${sql.identifier(vendorUsers.email.name)},
          ${sql.identifier(vendorUsers.passwordHash.name)},
          ${sql.identifier(vendorUsers.name.name)},
          ${sql.identifier(vendorUsers.status.name)}
        )
        select
          created_operator.id,
          'vendor+operator-db-' || created_operator.id::text || '@discover-albania.local',
          ${lockedPasswordHash},
          ${`${input.name} vendor`},
          'approved'
        from created_operator
      )
      select id from created_operator
    `);
    return { ok: true, operatorId: result.rows[0].id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That VAT number is already registered." };
    throw error;
  }
}

export async function deleteOperatorForAdmin(operatorId: number): Promise<AdminMutationResult> {
  try {
    await db.delete(operators).where(eq(operators.id, operatorId));
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Remove this operator's routes before deleting it." };
    }
    throw error;
  }
}

export async function createRouteForAdmin(
  operatorId: number,
  input: { code: string; longName: string }
): Promise<AdminMutationResult> {
  try {
    await db.insert(routes).values({ operatorId, code: input.code.toUpperCase(), longName: input.longName });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That route code is already in use." };
    throw error;
  }
}

export async function deleteRouteForAdmin(operatorId: number, routeId: number): Promise<AdminMutationResult> {
  try {
    const [deleted] = await db
      .delete(routes)
      .where(and(eq(routes.id, routeId), eq(routes.operatorId, operatorId)))
      .returning({ id: routes.id });
    if (!deleted) return { ok: false, error: "Route not found." };
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Remove this route's departures before deleting it." };
    }
    throw error;
  }
}

export async function createDepartureForAdmin(input: {
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
}): Promise<AdminMutationResult> {
  try {
    await db.insert(tripDepartures).values({
      ...input,
      freeSeats: input.plannedSeats,
      canBoard: true,
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "A departure with this route, stations, and time already exists." };
    }
    throw error;
  }
}

export async function deleteDepartureForAdmin(tripDepartureId: number): Promise<AdminMutationResult> {
  try {
    const [deleted] = await db
      .delete(tripDepartures)
      .where(eq(tripDepartures.id, tripDepartureId))
      .returning({ id: tripDepartures.id });
    if (!deleted) return { ok: false, error: "Departure not found." };
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "This departure has existing bookings and can't be deleted." };
    }
    throw error;
  }
}

export async function deleteBookingForAdmin(bookingReference: string): Promise<AdminMutationResult> {
  try {
    const result = await db.execute<{ id: number }>(sql`
      with deleted as (
        delete from ${bookings}
        where ${bookings.bookingReference} = ${bookingReference}
        returning ${bookings.id}, ${bookings.tripDepartureId}, ${bookings.travelDate},
          ${bookings.seats}, ${bookings.status}
      ),
      inventory_restored as (
        update ${tripInventories}
        set ${sql.identifier(tripInventories.availableSeats.name)} = least(
              ${tripInventories.totalSeats},
              ${tripInventories.availableSeats} + deleted.seats
            ),
            ${sql.identifier(tripInventories.updatedAt.name)} = now()
        from deleted
        where deleted.status = 'confirmed'
          and ${tripInventories.tripDepartureId} = deleted.trip_departure_id
          and ${tripInventories.travelDate} = deleted.travel_date
      )
      select id from deleted
    `);
    if (!result.rows[0]) return { ok: false, error: "Booking not found." };
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Remove this booking's payment record before deleting it." };
    }
    throw error;
  }
}

export async function deletePaymentForAdmin(paymentId: number): Promise<AdminMutationResult> {
  await db.delete(payments).where(eq(payments.id, paymentId));
  return { ok: true };
}

export async function deleteTaxiRequestForAdmin(requestId: number): Promise<AdminMutationResult> {
  try {
    const [deleted] = await db
      .delete(taxiRideRequests)
      .where(eq(taxiRideRequests.id, requestId))
      .returning({ id: taxiRideRequests.id });
    if (!deleted) return { ok: false, error: "Request not found." };
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Remove this request's payment record before deleting it." };
    }
    throw error;
  }
}

export interface AdminBookingRow {
  bookingId: number;
  bookingReference: string;
  status: "confirmed" | "cancelled";
  /** From the linked payments row -- a "confirmed" booking whose payment isn't "paid" yet is still mid-checkout, not a completed sale. */
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled" | null;
  channel: "online" | "walk_in" | "phone" | "touch_screen";
  travelDate: string;
  seats: number;
  priceAtBooking: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  createdAt: Date;
  trip: TripDepartureDetail;
}

export async function listBookingsForAdmin(limit = 50): Promise<AdminBookingRow[]> {
  const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limit);

  const results: AdminBookingRow[] = [];
  for (const row of rows) {
    const [trip, paymentStatus] = await Promise.all([
      getTripDepartureById(row.tripDepartureId),
      getLatestPaymentStatus(row.id),
    ]);
    if (!trip) continue;
    results.push({
      bookingId: row.id,
      bookingReference: row.bookingReference,
      status: row.status,
      paymentStatus,
      channel: row.channel,
      travelDate: row.travelDate,
      seats: row.seats,
      priceAtBooking: row.priceAtBooking,
      passengerName: row.passengerName,
      passengerPhone: row.passengerPhone,
      passengerEmail: row.passengerEmail,
      createdAt: row.createdAt,
      trip,
    });
  }
  return results;
}

export async function updateBookingDetailsForAdmin(
  bookingId: number,
  input: { passengerName: string; passengerPhone: string; passengerEmail: string | null; channel: "online" | "walk_in" | "phone" | "touch_screen" }
): Promise<AdminMutationResult> {
  const [updated] = await db
    .update(bookings)
    .set({
      passengerName: input.passengerName,
      passengerPhone: input.passengerPhone,
      passengerEmail: input.passengerEmail,
      channel: input.channel,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning({ id: bookings.id });
  return updated ? { ok: true } : { ok: false, error: "Booking not found." };
}

export async function cancelBookingForAdminPanel(bookingId: number): Promise<AdminMutationResult> {
  const cancelled = await cancelBookingForAdmin(bookingId);
  return cancelled ? { ok: true } : { ok: false, error: "This booking is already cancelled." };
}

export async function markBookingPaidForAdmin(bookingId: number): Promise<AdminMutationResult> {
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
