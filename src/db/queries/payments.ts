import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "../index";
import { bookings, payments } from "../schema";
import { getSdkOrder, type PokSdkOrder } from "@/lib/pok-payments";
import { cancelBookingForUnpaidPayment } from "./bookings";

export interface CreatePendingPaymentInput {
  bookingId: number;
  amount: string | number;
  currency: string;
  sdkOrder: PokSdkOrder;
}

export async function createPendingPaymentForBooking(input: CreatePendingPaymentInput): Promise<{ id: number }> {
  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: input.bookingId,
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

/** Resolves a booking reference to its (at most one, in this design -- no retry/resume flow) payment row, for the redirect-return handler. */
export async function findPaymentIdForBookingReference(bookingReference: string): Promise<number | null> {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(eq(bookings.bookingReference, bookingReference))
    .limit(1);
  return payment?.id ?? null;
}

export type SettleOutcome = "paid" | "failed" | "already_settled" | "not_found";

/**
 * The one place that turns a POK order's live status into our own state --
 * every trigger (the redirect-return route, the webhook, and the sweep)
 * calls this instead of each re-implementing "check status and maybe
 * cancel." Re-fetches the order from POK itself rather than trusting
 * whatever the caller was told (no webhook signature exists to verify), and
 * is gated on the payment's *current* status so it's safe to call more than
 * once for the same payment (webhook and return-redirect commonly race).
 */
export async function verifyAndSettlePokPayment(paymentId: number): Promise<SettleOutcome> {
  const [payment] = await db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      status: payments.status,
      providerPaymentId: payments.providerPaymentId,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || !payment.bookingId || !payment.providerPaymentId) return "not_found";
  if (payment.status !== "pending" && payment.status !== "authorized") return "already_settled";

  const order = await getSdkOrder(payment.providerPaymentId);

  if (order.isCompleted) {
    // Never flip a booking that's already been cancelled back to confirmed
    // on a late "paid" result (e.g. sweep beat a slow webhook) -- the seat
    // may already be back in the pool. Record the payment as paid anyway
    // (money was actually captured, don't lose that) but this then shows up
    // as a paid-payment-on-a-cancelled-booking mismatch in the admin ledger,
    // which is a real operator-must-refund case, not something to hide.
    await db.update(payments).set({ status: "paid", updatedAt: new Date() }).where(eq(payments.id, paymentId));
    return "paid";
  }

  const isDead = order.isCanceled || (order.expiresAt !== null && new Date(order.expiresAt) < new Date());
  if (isDead) {
    await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, paymentId));
    await cancelBookingForUnpaidPayment(payment.bookingId);
    return "failed";
  }

  // Still genuinely pending (customer hasn't finished on POK's page yet) --
  // leave it as-is for the next trigger to re-check.
  return "already_settled";
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
