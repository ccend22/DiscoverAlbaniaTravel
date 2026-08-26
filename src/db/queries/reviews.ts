import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { bookings, tripDepartures, routes, operators, operatorReports, vendorUsers } from "../schema";

export type SubmitReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Public 1-5 star rating, no text -- updates the operator's rolling
 * rating/ratingCount. A resubmission for the same booking edits its
 * previous contribution instead of double-counting it (see
 * bookings.reviewRating).
 */
export async function submitOperatorReview(bookingReference: string, rating: number): Promise<SubmitReviewResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose a rating from 1 to 5 stars." };
  }

  const result = await db.execute<{ id: number }>(sql`
    with target as (
      select b.id as booking_id, o.id as operator_id, b.review_rating as previous_rating
      from ${bookings} b
      join ${tripDepartures} td on td.id = b.trip_departure_id
      join ${routes} r on r.id = td.route_id
      join ${operators} o on o.id = r.operator_id
      where b.booking_reference = ${bookingReference}
      limit 1
    ),
    updated_operator as (
      update ${operators} o
      set
        rating = case
          when target.previous_rating is null
            then round((o.rating * o.rating_count + ${rating}) / (o.rating_count + 1), 2)
          else round((o.rating * o.rating_count - target.previous_rating + ${rating}) / o.rating_count, 2)
        end,
        rating_count = case when target.previous_rating is null then o.rating_count + 1 else o.rating_count end
      from target
      where o.id = target.operator_id
      returning o.id
    ),
    updated_booking as (
      update ${bookings} b
      set review_rating = ${rating}
      from target
      where b.id = target.booking_id
      returning b.id
    )
    select id from updated_booking
  `);

  return result.rows[0] ? { ok: true } : { ok: false, error: "We couldn't find a booking with that reference." };
}

export async function getBookingReviewRating(bookingReference: string): Promise<number | null> {
  const [row] = await db
    .select({ reviewRating: bookings.reviewRating })
    .from(bookings)
    .where(eq(bookings.bookingReference, bookingReference))
    .limit(1);
  return row?.reviewRating ?? null;
}

export async function submitOperatorReport(input: {
  bookingReference: string;
  reporterName: string;
  reporterEmail: string;
  message: string;
}): Promise<SubmitReviewResult> {
  const [booking] = await db
    .select({ id: bookings.id, operatorId: operators.id })
    .from(bookings)
    .innerJoin(tripDepartures, eq(bookings.tripDepartureId, tripDepartures.id))
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(operators, eq(routes.operatorId, operators.id))
    .where(eq(bookings.bookingReference, input.bookingReference))
    .limit(1);

  if (!booking) return { ok: false, error: "We couldn't find a booking with that reference." };

  await db.insert(operatorReports).values({
    operatorId: booking.operatorId,
    bookingId: booking.id,
    reporterName: input.reporterName,
    reporterEmail: input.reporterEmail,
    message: input.message,
  });

  return { ok: true };
}

export interface OperatorReportRow {
  id: number;
  operatorName: string;
  bookingReference: string | null;
  reporterName: string;
  reporterEmail: string;
  message: string;
  status: "open" | "resolved";
  createdAt: Date;
}

export async function listOperatorReportsForAdmin(): Promise<OperatorReportRow[]> {
  const rows = await db
    .select({
      id: operatorReports.id,
      operatorName: operators.name,
      bookingReference: bookings.bookingReference,
      reporterName: operatorReports.reporterName,
      reporterEmail: operatorReports.reporterEmail,
      message: operatorReports.message,
      status: operatorReports.status,
      createdAt: operatorReports.createdAt,
    })
    .from(operatorReports)
    .innerJoin(operators, eq(operatorReports.operatorId, operators.id))
    .leftJoin(bookings, eq(operatorReports.bookingId, bookings.id))
    .orderBy(desc(operatorReports.createdAt));
  return rows.map((row) => ({ ...row, bookingReference: row.bookingReference ?? null }));
}

export async function resolveOperatorReportForAdmin(reportId: number): Promise<void> {
  await db.update(operatorReports).set({ status: "resolved" }).where(eq(operatorReports.id, reportId));
}

export async function listOperatorReportsForVendor(vendorUserId: number): Promise<OperatorReportRow[]> {
  const [vendor] = await db
    .select({ operatorId: vendorUsers.operatorId })
    .from(vendorUsers)
    .where(eq(vendorUsers.id, vendorUserId))
    .limit(1);
  if (!vendor) return [];

  const rows = await db
    .select({
      id: operatorReports.id,
      operatorName: operators.name,
      bookingReference: bookings.bookingReference,
      reporterName: operatorReports.reporterName,
      reporterEmail: operatorReports.reporterEmail,
      message: operatorReports.message,
      status: operatorReports.status,
      createdAt: operatorReports.createdAt,
    })
    .from(operatorReports)
    .innerJoin(operators, eq(operatorReports.operatorId, operators.id))
    .leftJoin(bookings, eq(operatorReports.bookingId, bookings.id))
    .where(eq(operatorReports.operatorId, vendor.operatorId))
    .orderBy(desc(operatorReports.createdAt));
  return rows.map((row) => ({ ...row, bookingReference: row.bookingReference ?? null }));
}
