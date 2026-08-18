import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cancelBookingForUnpaidPayment } from "@/db/queries/bookings";
import {
  findConfirmedBookingsMissingPayment,
  findPendingPaymentsPastExpiry,
  verifyAndSettlePokPayment,
} from "@/db/queries/payments";

// No customer ever hits this route -- it's meant to be called on a timer by
// an external scheduler (there's no cron/scheduled-task infrastructure in
// this app itself). Catches the cases the redirect-return and webhook paths
// can miss entirely: a customer who starts checkout and never comes back.
const GRACE_MINUTES_FOR_MISSING_PAYMENT = 60;

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.POK_SWEEP_SECRET;
  if (!expectedSecret) {
    console.error("[pok-payments] sweep: POK_SWEEP_SECRET is not configured");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!secretMatches(request.headers.get("x-sweep-secret"), expectedSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const [expiredPending, missingPayment] = await Promise.all([
    findPendingPaymentsPastExpiry(),
    findConfirmedBookingsMissingPayment(GRACE_MINUTES_FOR_MISSING_PAYMENT),
  ]);

  let settled = 0;
  for (const { id } of expiredPending) {
    try {
      await verifyAndSettlePokPayment(id);
      settled += 1;
    } catch (error) {
      console.error("[pok-payments] sweep: failed to settle expired payment", { paymentId: id, error });
    }
  }

  let cancelled = 0;
  for (const { id } of missingPayment) {
    try {
      const didCancel = await cancelBookingForUnpaidPayment(id);
      if (didCancel) cancelled += 1;
    } catch (error) {
      console.error("[pok-payments] sweep: failed to cancel booking with no payment", { bookingId: id, error });
    }
  }

  return NextResponse.json({
    ok: true,
    expiredPaymentsChecked: expiredPending.length,
    settled,
    cancelled,
  });
}
