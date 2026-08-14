import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { bookings, payments, tripInventories } from "../schema";
import { generateBookingReference } from "@/lib/reference-code";
import { getTripDepartureById, isDepartureValidOnDate, type TripDepartureDetail } from "./trips";

export interface CreateBookingInput {
  tripDepartureId: number;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  seats: number;
  userId?: number | null;
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
        ${sql.identifier(bookings.priceAtBooking.name)}
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
        ${trip.basePrice}
      from reserved
      returning ${sql.identifier(bookings.id.name)}, ${sql.identifier(bookings.bookingReference.name)}
    )
    select id, booking_reference from created
  `);

  const row = result.rows[0];
  return row
    ? { ok: true, reference, bookingId: row.id, priceAtBooking: trip.basePrice }
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

export interface BookingDetail {
  bookingReference: string;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  seats: number;
  priceAtBooking: string;
  status: "confirmed" | "cancelled";
  createdAt: Date;
  trip: TripDepartureDetail;
  /** From the linked `payments` row, if any -- this design keeps `bookings.status` as a plain reservation flag and tracks payment truth separately (see src/db/queries/payments.ts). Null means no payment attempt was ever recorded for this booking. */
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled" | null;
}

async function getLatestPaymentStatus(bookingId: number) {
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
