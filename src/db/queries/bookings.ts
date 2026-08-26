import { randomBytes, timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { bookings, payments, tripInventories } from "../schema";
import { generateBookingReference } from "@/lib/reference-code";
import { getTripDepartureById, isDepartureValidOnDate, type TripDepartureDetail } from "./trips";
import type { Locale } from "@/lib/locale";

export interface CreateBookingInput {
  tripDepartureId: number;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seats: number;
  userId?: number | null;
  locale?: Locale;
  /** Set for a booking a vendor entered manually on a customer's behalf -- see the `createdByVendorUserId` column comment in schema.ts. */
  createdByVendorUserId?: number | null;
  /** Overrides the route's base price -- used when a manual booking boards from an intermediate stop, priced via that stop's own route_stops.priceToDestination rather than the full-route fare. */
  priceOverride?: string;
  /** Defaults to "online" -- pass a vendor-side channel for manually-entered bookings. */
  channel?: "online" | "walk_in" | "phone" | "touch_screen";
}

/** Bearer secret for the emailed "manage your booking" link -- see the `manageToken` column comment in schema.ts. */
function generateManageToken(): string {
  return randomBytes(24).toString("base64url");
}

export type CreateBookingResult =
  | { ok: true; reference: string; bookingId: number; priceAtBooking: string }
  | { ok: false; error: "invalid_date" | "trip_not_found" | "sold_out" | "price_unavailable" };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const trip = await getTripDepartureById(input.tripDepartureId);
  if (!trip) {
    return { ok: false, error: "trip_not_found" };
  }

  if (trip.basePrice === null) {
    return { ok: false, error: "price_unavailable" };
  }

  const validOnDate = await isDepartureValidOnDate(input.tripDepartureId, input.travelDate);
  if (!validOnDate) {
    return { ok: false, error: "invalid_date" };
  }

  const reference = generateBookingReference();
  const manageToken = generateManageToken();

  const initialSeats = Math.min(trip.freeSeats, trip.plannedSeats);
  if (input.seats > initialSeats) return { ok: false, error: "sold_out" };
  const result = await db.execute<{ id: number; booking_reference: string }>(sql`
    with reserved as (
      insert into ${tripInventories} (
        ${sql.identifier(tripInventories.tripDepartureId.name)},
        ${sql.identifier(tripInventories.travelDate.name)},
        ${sql.identifier(tripInventories.totalSeats.name)},
        ${sql.identifier(tripInventories.availableSeats.name)}
      )
      values (
        ${input.tripDepartureId},
        ${input.travelDate},
        ${trip.plannedSeats},
        ${initialSeats - input.seats}
      )
      on conflict (${sql.identifier(tripInventories.tripDepartureId.name)}, ${sql.identifier(tripInventories.travelDate.name)})
      do update set
        ${sql.identifier(tripInventories.availableSeats.name)} = ${tripInventories.availableSeats} - ${input.seats},
        ${sql.identifier(tripInventories.updatedAt.name)} = now()
      where ${tripInventories.availableSeats} >= ${input.seats}
      returning ${tripInventories.id}
    ),
    created as (
      insert into ${bookings} (
        ${sql.identifier(bookings.bookingReference.name)},
        ${sql.identifier(bookings.tripDepartureId.name)},
        ${sql.identifier(bookings.userId.name)},
        ${sql.identifier(bookings.travelDate.name)},
        ${sql.identifier(bookings.passengerName.name)},
        ${sql.identifier(bookings.passengerPhone.name)},
        ${sql.identifier(bookings.passengerEmail.name)},
        ${sql.identifier(bookings.seats.name)},
        ${sql.identifier(bookings.priceAtBooking.name)},
        ${sql.identifier(bookings.locale.name)},
        ${sql.identifier(bookings.manageToken.name)},
        ${sql.identifier(bookings.createdByVendorUserId.name)},
        ${sql.identifier(bookings.channel.name)}
      )
      select
        ${reference},
        ${input.tripDepartureId},
        ${input.userId ?? null},
        ${input.travelDate},
        ${input.passengerName},
        ${input.passengerPhone},
        ${input.passengerEmail},
        ${input.seats},
        ${input.priceOverride ?? trip.basePrice},
        ${input.locale ?? "en"},
        ${manageToken},
        ${input.createdByVendorUserId ?? null},
        ${input.channel ?? "online"}
      from reserved
      returning ${sql.identifier(bookings.id.name)}, ${sql.identifier(bookings.bookingReference.name)}
    )
    select id, booking_reference from created
  `);

  const row = result.rows[0];
  return row
    ? { ok: true, reference, bookingId: row.id, priceAtBooking: input.priceOverride ?? trip.basePrice }
    : { ok: false, error: "sold_out" };
}

// Shared by the user-facing "Cancel" action and the system-initiated
// payment-failure/expiry path -- both need the exact same atomic
// cancel-and-restore-inventory behavior, just gated differently on *who*
// is allowed to trigger it. The `status = 'confirmed'` guard in the WHERE
// clause is what makes this safe to call more than once for the same
// booking (webhook + return-redirect + sweep can all race on it).
async function restoreInventoryAndCancelBooking(
  bookingId: number,
  options: { requireUserId?: number } = {}
): Promise<boolean> {
  const userGuard = options.requireUserId !== undefined ? sql`and ${bookings.userId} = ${options.requireUserId}` : sql``;

  const result = await db.execute<{ id: number }>(sql`
    with cancelled as (
      update ${bookings}
      set ${sql.identifier(bookings.status.name)} = 'cancelled', ${sql.identifier(bookings.updatedAt.name)} = now()
      where ${bookings.id} = ${bookingId}
        and ${bookings.status} = 'confirmed'
        ${userGuard}
      returning ${bookings.id}, ${bookings.tripDepartureId}, ${bookings.travelDate}, ${bookings.seats}
    ),
    inventory_restored as (
      update ${tripInventories}
      set ${sql.identifier(tripInventories.availableSeats.name)} = least(
            ${tripInventories.totalSeats},
            ${tripInventories.availableSeats} + cancelled.seats
          ),
          ${sql.identifier(tripInventories.updatedAt.name)} = now()
      from cancelled
      where ${tripInventories.tripDepartureId} = cancelled.trip_departure_id
        and ${tripInventories.travelDate} = cancelled.travel_date
    )
    select id from cancelled
  `);

  return Boolean(result.rows[0]);
}

/** System-initiated cancel for a booking whose payment failed, expired, or was never completed -- no owning user to check. */
export async function cancelBookingForUnpaidPayment(bookingId: number): Promise<boolean> {
  return restoreInventoryAndCancelBooking(bookingId);
}

/** Cancel initiated from the vendor dashboard -- caller (src/db/queries/vendors.ts) has already verified the vendor owns this booking's route. */
export async function cancelBookingForVendor(bookingId: number): Promise<boolean> {
  return restoreInventoryAndCancelBooking(bookingId);
}

/** Cancel initiated from the admin panel -- no ownership check, admin can act on any booking. */
export async function cancelBookingForAdmin(bookingId: number): Promise<boolean> {
  return restoreInventoryAndCancelBooking(bookingId);
}

export interface BookingDetail {
  bookingReference: string;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seats: number;
  priceAtBooking: string;
  status: "confirmed" | "cancelled";
  createdAt: Date;
  trip: TripDepartureDetail;
  /** From the linked `payments` row, if any -- this design keeps `bookings.status` as a plain reservation flag and tracks payment truth separately (see src/db/queries/payments.ts). Null means no payment attempt was ever recorded for this booking. */
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled" | null;
}

export async function getLatestPaymentStatus(bookingId: number) {
  const [payment] = await db
    .select({ status: payments.status })
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment?.status ?? null;
}

export async function getBookingByReference(reference: string): Promise<BookingDetail | null> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingReference, reference))
    .limit(1);

  if (!booking) return null;

  const [trip, paymentStatus] = await Promise.all([
    getTripDepartureById(booking.tripDepartureId),
    getLatestPaymentStatus(booking.id),
  ]);
  if (!trip) return null;

  return {
    bookingReference: booking.bookingReference,
    travelDate: booking.travelDate,
    passengerName: booking.passengerName,
    passengerPhone: booking.passengerPhone,
    passengerEmail: booking.passengerEmail,
    seats: booking.seats,
    priceAtBooking: booking.priceAtBooking,
    status: booking.status,
    createdAt: booking.createdAt,
    trip,
    paymentStatus,
  };
}

export async function getBookingsForUser(userId: number): Promise<BookingDetail[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt));

  const results: BookingDetail[] = [];
  for (const row of rows) {
    const [trip, paymentStatus] = await Promise.all([
      getTripDepartureById(row.tripDepartureId),
      getLatestPaymentStatus(row.id),
    ]);
    if (!trip) continue;
    results.push({
      bookingReference: row.bookingReference,
      travelDate: row.travelDate,
      passengerName: row.passengerName,
      passengerPhone: row.passengerPhone,
      passengerEmail: row.passengerEmail,
      seats: row.seats,
      priceAtBooking: row.priceAtBooking,
      status: row.status,
      createdAt: row.createdAt,
      trip,
      paymentStatus,
    });
  }
  return results;
}

export type CancelUserBookingResult = "ok" | "not_found" | "already_paid";

export async function cancelUserBooking(userId: number, bookingReference: string): Promise<CancelUserBookingResult> {
  const [booking] = await db
    .select({ id: bookings.id, userId: bookings.userId, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.bookingReference, bookingReference))
    .limit(1);

  if (!booking || booking.userId !== userId || booking.status !== "confirmed") return "not_found";

  // A paid booking needs a refund, not a silent cancel -- self-service
  // cancellation would otherwise restore the seat while quietly keeping the
  // customer's money captured, with nothing surfacing that a refund is owed.
  const paymentStatus = await getLatestPaymentStatus(booking.id);
  if (paymentStatus === "paid") return "already_paid";

  const cancelled = await restoreInventoryAndCancelBooking(booking.id, { requireUserId: userId });
  return cancelled ? "ok" : "not_found";
}

export interface BookingEmailDetail {
  bookingReference: string;
  travelDate: string;
  passengerName: string;
  passengerEmail: string;
  seats: number;
  priceAtBooking: string;
  manageToken: string | null;
  locale: string;
  trip: TripDepartureDetail;
}

/**
 * For the confirmation email, sent once payment settles as paid (see
 * verifyAndSettlePokPayment) -- that trigger only has a bookingId, not a
 * reference. Also doubles as the "does this booking even have anywhere to
 * email" check: a manual vendor booking with no passengerEmail on file
 * returns null here, and the caller skips sending entirely rather than
 * emailing an empty address.
 */
export async function getBookingEmailDetail(bookingId: number): Promise<BookingEmailDetail | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || !booking.passengerEmail) return null;

  const trip = await getTripDepartureById(booking.tripDepartureId);
  if (!trip) return null;

  return {
    bookingReference: booking.bookingReference,
    travelDate: booking.travelDate,
    passengerName: booking.passengerName,
    passengerEmail: booking.passengerEmail,
    seats: booking.seats,
    priceAtBooking: booking.priceAtBooking,
    manageToken: booking.manageToken,
    locale: booking.locale,
    trip,
  };
}

function manageTokenMatches(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Every self-service manage action (view, cancel, edit contact details) on
 * the emailed link goes through this first -- it's the only thing standing
 * between the public, guessable booking reference and being able to touch
 * someone else's reservation. Constant-time compare against the per-booking
 * secret so mismatched attempts can't be timed to narrow down the token.
 */
async function verifyManageToken(
  reference: string,
  token: string
): Promise<{ id: number; status: "confirmed" | "cancelled" } | null> {
  const [booking] = await db
    .select({ id: bookings.id, status: bookings.status, manageToken: bookings.manageToken })
    .from(bookings)
    .where(eq(bookings.bookingReference, reference))
    .limit(1);

  if (!booking || !booking.manageToken || !manageTokenMatches(token, booking.manageToken)) return null;
  return { id: booking.id, status: booking.status };
}

export async function getBookingForManage(reference: string, token: string): Promise<BookingDetail | null> {
  const verified = await verifyManageToken(reference, token);
  if (!verified) return null;
  return getBookingByReference(reference);
}

export type ManageActionResult = "ok" | "invalid_token" | "already_cancelled" | "already_paid";

export async function cancelBookingByToken(reference: string, token: string): Promise<ManageActionResult> {
  const verified = await verifyManageToken(reference, token);
  if (!verified) return "invalid_token";
  if (verified.status !== "confirmed") return "already_cancelled";

  // Same already-paid guard as the logged-in self-service cancel -- a paid
  // booking needs a refund, not a silent seat release.
  const paymentStatus = await getLatestPaymentStatus(verified.id);
  if (paymentStatus === "paid") return "already_paid";

  const cancelled = await restoreInventoryAndCancelBooking(verified.id);
  return cancelled ? "ok" : "already_cancelled";
}

export interface UpdatePassengerDetailsInput {
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
}

export async function updatePassengerDetailsByToken(
  reference: string,
  token: string,
  data: UpdatePassengerDetailsInput
): Promise<ManageActionResult> {
  const verified = await verifyManageToken(reference, token);
  if (!verified) return "invalid_token";
  if (verified.status !== "confirmed") return "already_cancelled";

  await db
    .update(bookings)
    .set({
      passengerName: data.passengerName,
      passengerPhone: data.passengerPhone,
      passengerEmail: data.passengerEmail,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, verified.id));

  return "ok";
}
