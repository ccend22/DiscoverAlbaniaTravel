"use server";

import { bookingFormSchema } from "@/lib/validation";
import { createBooking, cancelBookingForUnpaidPayment } from "@/db/queries/bookings";
import { createPendingPayment } from "@/db/queries/payments";
import { createSdkOrder, PokConfigError } from "@/lib/pok-payments";
import { getActiveUserSessionId } from "@/lib/user-session";
import { getSiteOrigin } from "@/lib/google-oauth";
import { getLocale } from "@/lib/i18n";

export type CreateBookingActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "checkout"; confirmUrl: string; bookingReference: string };

export async function createBookingAction(
  _prevState: CreateBookingActionState,
  formData: FormData
): Promise<CreateBookingActionState> {
  const tripDepartureId = formData.get("tripDepartureId");
  const travelDate = formData.get("travelDate");

  const parsed = bookingFormSchema.safeParse({
    tripDepartureId,
    travelDate,
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail"),
    seats: formData.get("seats"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const [userId, locale] = await Promise.all([getActiveUserSessionId(), getLocale()]);
  const result = await createBooking({ ...parsed.data, userId, locale });

  if (!result.ok) {
    const message = result.error === "invalid_date"
      ? "This departure doesn't run on the selected date."
      : result.error === "sold_out"
        ? "There are not enough seats available for this date."
        : result.error === "price_unavailable"
          ? "Online booking isn't available for this route yet."
          : "This departure could not be found.";
    return { status: "error", message };
  }

  // The seat is now held (createBooking already reserved it). From here,
  // any failure must release it again -- drizzle's neon-http driver can't
  // hold a transaction open across the network round-trip to POK, so this
  // is a compensating action, not a rollback.
  const amount = Number(result.priceAtBooking) * parsed.data.seats;
  const returnUrl = `${getSiteOrigin()}/pay/return?ref=${encodeURIComponent(result.reference)}&embedded=1`;

  try {
    const order = await createSdkOrder({
      amount,
      currencyCode: "ALL",
      description: `Bus ticket · ${parsed.data.seats} seat(s) · ${result.reference}`,
      merchantCustomReference: result.reference,
      webhookUrl: `${getSiteOrigin()}/pay/webhook`,
      redirectUrl: returnUrl,
      failRedirectUrl: returnUrl,
      expiresAfterMinutes: 30,
    });

    await createPendingPayment({
      bookingId: result.bookingId,
      amount,
      currency: "ALL",
      sdkOrder: order,
    });

    return { status: "checkout", confirmUrl: order.confirmUrl, bookingReference: result.reference };
  } catch (error) {
    console.error("[pok-payments] failed to start checkout, releasing held seat", {
      bookingId: result.bookingId,
      error: error instanceof PokConfigError ? error.message : error,
    });
    await cancelBookingForUnpaidPayment(result.bookingId);
    return { status: "error", message: "We couldn't start payment for this booking. Please try again." };
  }
}
