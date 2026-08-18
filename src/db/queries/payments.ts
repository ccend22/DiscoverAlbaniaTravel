import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "../index";
import { bookings, payments, taxiRideRequests } from "../schema";
import { getSdkOrder, type PokSdkOrder } from "@/lib/pok-payments";
import { cancelBookingForUnpaidPayment, getBookingEmailDetail } from "./bookings";
import { cancelTaxiRequestForUnpaidPayment, getTaxiReservationEmailDetail } from "./taxi";
import { sendBookingConfirmationEmail, sendTaxiReservationNotification } from "@/lib/email";

/** Exactly one of bookingId/taxiRideRequestId must be set -- matches the `payments_single_target` check constraint. */
export interface CreatePendingPaymentInput {
  bookingId?: number;
  taxiRideRequestId?: number;
  amount: string | number;
  currency: string;
  sdkOrder: PokSdkOrder;
}

export async function createPendingPayment(input: CreatePendingPaymentInput): Promise<{ id: number }> {
  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: input.bookingId ?? null,
      taxiRideRequestId: input.taxiRideRequestId ?? null,
      provider: "pok",
      providerPaymentId: input.sdkOrder.id,
      amount: String(input.amount),
      currency: input.currency,
      status: "pending",
      expiresAt: input.sdkOrder.expiresAt ? new Date(input.sdkOrder.expiresAt) : null,
    })
    .returning({ id: payments.id });
  return payment;
}

export async function findPaymentIdByProviderPaymentId(providerPaymentId: string): Promise<number | null> {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.providerPaymentId, providerPaymentId))
    .limit(1);
  return payment?.id ?? null;
}

/**
 * Resolves a booking or taxi request reference to its (at most one, in this
 * design -- no retry/resume flow) payment row, for the redirect-return
 * handler and the dev fake-payment escape hatch. Taxi request references are
 * always prefixed "TX-" (see createTaxiRideRequest) and booking references
 * never are, so the prefix alone reliably tells the two apart.
 */
export async function findPaymentIdForReference(reference: string): Promise<number | null> {
  if (reference.startsWith("TX-")) {
    const [payment] = await db
      .select({ id: payments.id })
      .from(payments)
      .innerJoin(taxiRideRequests, eq(payments.taxiRideRequestId, taxiRideRequests.id))
      .where(eq(taxiRideRequests.requestReference, reference))
      .limit(1);
    return payment?.id ?? null;
  }

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(eq(bookings.bookingReference, reference))
    .limit(1);
  return payment?.id ?? null;
}

export type SettleOutcome = "paid" | "failed" | "already_settled" | "not_found";

/** Shared by the real POK settle path and the dev-only fake-payment path below -- both need the exact same "record paid, then best-effort notification" behavior, for either target type. */
async function markPaymentPaidAndNotify(
  paymentId: number,
  target: { bookingId: number | null; taxiRideRequestId: number | null }
): Promise<boolean> {
  // Never flip a booking/request that's already been cancelled back on a
  // late "paid" result (e.g. sweep beat a slow webhook) -- the seat may
  // already be back in the pool. Record the payment as paid anyway (money
  // was actually captured, don't lose that) but this then shows up as a
  // paid-payment-on-a-cancelled mismatch in the admin ledger, which is a
  // real operator-must-refund case, not something to hide.
  const [updated] = await db
    .update(payments)
    .set({ status: "paid", updatedAt: new Date() })
    .where(and(eq(payments.id, paymentId), inArray(payments.status, ["pending", "authorized"])))
    .returning({ id: payments.id });
  if (!updated) return false;

  // Best-effort: a broken SMTP config or a transient send failure must
  // never undo (or even appear to undo) a payment that already settled.
  try {
    if (target.bookingId) {
      const [booking] = await db
        .select({ status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, target.bookingId))
        .limit(1);
      if (booking?.status !== "confirmed") {
        console.error("[pok-payments] paid payment targets a cancelled booking; confirmation suppressed", {
          paymentId,
          bookingId: target.bookingId,
        });
        return true;
      }
      const detail = await getBookingEmailDetail(target.bookingId);
      if (detail) await sendBookingConfirmationEmail(detail);
    } else if (target.taxiRideRequestId) {
      const [taxiRequest] = await db
        .select({ status: taxiRideRequests.status })
        .from(taxiRideRequests)
        .where(eq(taxiRideRequests.id, target.taxiRideRequestId))
        .limit(1);
      if (!taxiRequest || taxiRequest.status === "cancelled") {
        console.error("[pok-payments] paid payment targets a cancelled taxi booking; confirmation suppressed", {
          paymentId,
          taxiRideRequestId: target.taxiRideRequestId,
        });
        return true;
      }
      const detail = await getTaxiReservationEmailDetail(target.taxiRideRequestId);
      if (detail) await sendTaxiReservationNotification(detail);
    }
  } catch (error) {
    console.error("[email] failed to send payment confirmation", { paymentId, target, error });
  }
  return true;
}

/**
 * The one place that turns a POK order's live status into our own state --
 * every trigger (the redirect-return route, the webhook, and the sweep)
 * calls this instead of each re-implementing "check status and maybe
 * cancel." Re-fetches the order from POK itself rather than trusting
 * whatever the caller was told (no webhook signature exists to verify), and
 * is gated on the payment's *current* status so it's safe to call more than
 * once for the same payment (webhook and return-redirect commonly race).
 * Works for either a booking or a taxi-request payment -- whichever target
 * column is set on the payment row.
 */
export async function verifyAndSettlePokPayment(paymentId: number): Promise<SettleOutcome> {
  const [payment] = await db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      taxiRideRequestId: payments.taxiRideRequestId,
      status: payments.status,
      providerPaymentId: payments.providerPaymentId,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || (!payment.bookingId && !payment.taxiRideRequestId) || !payment.providerPaymentId) return "not_found";
  if (payment.status !== "pending" && payment.status !== "authorized") return "already_settled";

  const order = await getSdkOrder(payment.providerPaymentId);

  if (order.isCompleted) {
    const didSettle = await markPaymentPaidAndNotify(paymentId, {
      bookingId: payment.bookingId,
      taxiRideRequestId: payment.taxiRideRequestId,
    });
    return didSettle ? "paid" : "already_settled";
  }

  const isDead = order.isCanceled || (order.expiresAt !== null && new Date(order.expiresAt) < new Date());
  if (isDead) {
    const [updated] = await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(payments.id, paymentId), inArray(payments.status, ["pending", "authorized"])))
      .returning({ id: payments.id });
    if (!updated) return "already_settled";
    if (payment.bookingId) await cancelBookingForUnpaidPayment(payment.bookingId);
    else if (payment.taxiRideRequestId) await cancelTaxiRequestForUnpaidPayment(payment.taxiRideRequestId);
    return "failed";
  }

  // Still genuinely pending (customer hasn't finished on POK's page yet) --
  // leave it as-is for the next trigger to re-check.
  return "already_settled";
}

/**
 * Lets a developer complete the checkout flow on localhost without a real
 * POK charge -- skips calling POK entirely and marks the payment paid
 * directly. Hard-gated on NODE_ENV so this can never fire in production,
 * even if a request somehow reaches it there.
 */
export async function devMarkPaymentPaid(reference: string): Promise<SettleOutcome> {
  if (process.env.NODE_ENV === "production") return "not_found";

  const paymentId = await findPaymentIdForReference(reference);
  if (!paymentId) return "not_found";

  const [payment] = await db
    .select({ id: payments.id, bookingId: payments.bookingId, taxiRideRequestId: payments.taxiRideRequestId, status: payments.status })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || (!payment.bookingId && !payment.taxiRideRequestId)) return "not_found";
  if (payment.status !== "pending" && payment.status !== "authorized") return "already_settled";

  const didSettle = await markPaymentPaidAndNotify(payment.id, {
    bookingId: payment.bookingId,
    taxiRideRequestId: payment.taxiRideRequestId,
  });
  return didSettle ? "paid" : "already_settled";
}

/** Sweep target: pending payments whose provider order has expired but no trigger (redirect/webhook) ever settled them -- the customer likely abandoned checkout entirely. */
export async function findPendingPaymentsPastExpiry(): Promise<{ id: number }[]> {
  return db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.status, "pending"), lt(payments.expiresAt, new Date())));
}

/** Sweep target: bookings that stayed "confirmed" with no payment row at all, well past any normal checkout window -- covers order-creation or payment-row-insert failing outright, with the immediate compensating cancel also failing. Grace period is generous since this is the "something broke" branch, not the normal abandonment branch. */
export async function findConfirmedBookingsMissingPayment(graceMinutes: number): Promise<{ id: number }[]> {
  const cutoff = new Date(Date.now() - graceMinutes * 60_000);
  return db
    .select({ id: bookings.id })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.status, "confirmed"), isNull(payments.id), lt(bookings.createdAt, cutoff)));
}
