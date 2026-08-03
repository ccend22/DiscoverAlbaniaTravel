import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { bookings, tripInventories } from "../schema";
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
  | { ok: true; reference: string }
  | { ok: false; error: "invalid_date" | "trip_not_found" | "sold_out" };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const trip = await getTripDepartureById(input.tripDepartureId);
  if (!trip) {
    return { ok: false, error: "trip_not_found" };
  }

  const validOnDate = await isDepartureValidOnDate(input.tripDepartureId, input.travelDate);
  if (!validOnDate) {
    return { ok: false, error: "invalid_date" };
  }

  const reference = generateBookingReference();

  const initialSeats = Math.min(trip.freeSeats, trip.plannedSeats);
  if (input.seats > initialSeats) return { ok: false, error: "sold_out" };
  const result = await db.execute<{ booking_reference: string }>(sql`
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
      returning ${sql.identifier(bookings.bookingReference.name)}
    )
    select ${sql.identifier(bookings.bookingReference.name)} from created
  `);

  return result.rows[0] ? { ok: true, reference } : { ok: false, error: "sold_out" };
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
}

export async function getBookingByReference(reference: string): Promise<BookingDetail | null> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingReference, reference))
    .limit(1);

  if (!booking) return null;

  const trip = await getTripDepartureById(booking.tripDepartureId);
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
    const trip = await getTripDepartureById(row.tripDepartureId);
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
    });
  }
  return results;
}

export async function cancelUserBooking(userId: number, bookingReference: string): Promise<boolean> {
  const [booking] = await db
    .select({ id: bookings.id, userId: bookings.userId, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.bookingReference, bookingReference))
    .limit(1);

  if (!booking || booking.userId !== userId || booking.status !== "confirmed") return false;

  const result = await db.execute<{ id: number }>(sql`
    with cancelled as (
      update ${bookings}
      set ${sql.identifier(bookings.status.name)} = 'cancelled', ${sql.identifier(bookings.updatedAt.name)} = now()
      where ${bookings.id} = ${booking.id}
        and ${bookings.userId} = ${userId}
        and ${bookings.status} = 'confirmed'
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
