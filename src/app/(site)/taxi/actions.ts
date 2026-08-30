"use server";

import { createTaxiRideRequest, cancelTaxiRequestForUnpaidPayment } from "@/db/queries/taxi";
import { createPendingPayment } from "@/db/queries/payments";
import { createSdkOrder, PokConfigError } from "@/lib/pok-payments";
import { getUserById } from "@/db/queries/users";
import { getActiveUserSessionId } from "@/lib/user-session";
import { taxiRideRequestSchema } from "@/lib/validation";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM } from "@/lib/taxi-service";
import { albaniaLocalDateTimeToDate } from "@/lib/timezone";
import { findDirectTaxiRoute } from "@/lib/taxi-fares";
import { estimateTaxiPriceEur } from "@/lib/taxi-pricing";
import { getSiteOrigin } from "@/lib/google-oauth";
import { calculateTaxiServiceFeeEur } from "@/lib/service-fees";
import { bookingsArePaused, BOOKINGS_PAUSED_MESSAGE } from "@/lib/booking-availability";

export type TaxiRequestActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "checkout"; confirmUrl: string; requestReference: string };

export async function requestTaxiAction(
  _previousState: TaxiRequestActionState,
  formData: FormData
): Promise<TaxiRequestActionState> {
  if (bookingsArePaused()) {
    return { status: "error", message: BOOKINGS_PAUSED_MESSAGE };
  }

  const parsed = taxiRideRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    exactPickupPoint: formData.get("exactPickupPoint") || undefined,
    destination: formData.get("destination"),
    pickupLatitude: formData.get("pickupLatitude"),
    pickupLongitude: formData.get("pickupLongitude"),
    destinationLatitude: formData.get("destinationLatitude"),
    destinationLongitude: formData.get("destinationLongitude"),
    pickupDate: formData.get("pickupDate"),
    pickupTime: formData.get("pickupTime"),
    passengers: formData.get("passengers") || undefined,
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail"),
    notes: formData.get("notes") || undefined,
    pricingSource: formData.get("pricingSource") || "map",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const distanceKm = calculateDistanceKm(
    { lat: parsed.data.pickupLatitude, lng: parsed.data.pickupLongitude },
    { lat: parsed.data.destinationLatitude, lng: parsed.data.destinationLongitude }
  );
  const directRoute =
    parsed.data.pricingSource === "direct"
      ? findDirectTaxiRoute(parsed.data.pickupLocation, parsed.data.destination)
      : null;
  if (!directRoute && distanceKm < MIN_INTERCITY_TAXI_DISTANCE_KM) {
    return {
      status: "error",
      message: `Intercity taxi requests require a journey of at least ${MIN_INTERCITY_TAXI_DISTANCE_KM} km.`,
    };
  }

  // Price every taxi journey from the server-calculated distance. The form's
  // displayed estimate is informational; the client never controls the
  // amount or currency sent to POK.
  const estimate = estimateTaxiPriceEur(distanceKm);
  const amount = estimate
    ? estimate.priceEur + calculateTaxiServiceFeeEur(estimate.priceEur, parsed.data.passengers)
    : null;
  const currency = estimate ? "EUR" : null;

  if (amount === null || currency === null) {
    return { status: "error", message: "We couldn't price this journey. Please adjust your route and try again." };
  }

  const userId = await getActiveUserSessionId();
  const user = userId ? await getUserById(userId) : null;
  const pickupAt = albaniaLocalDateTimeToDate(parsed.data.pickupDate, parsed.data.pickupTime);

  const result = await createTaxiRideRequest({
    pickupLocation: parsed.data.pickupLocation,
    exactPickupPoint: parsed.data.exactPickupPoint || null,
    destination: parsed.data.destination,
    pickupAt,
    passengers: parsed.data.passengers,
    passengerName: user?.name ?? null,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: parsed.data.passengerEmail,
    notes: parsed.data.notes || null,
    preferredTaxiCompany: null,
    userId,
  });

  // The request row now exists (status "requested"). From here, any failure
  // must cancel it again -- drizzle's neon-http driver can't hold a
  // transaction open across the network round-trip to POK, so this is a
  // compensating action, not a rollback.
  const returnUrl = `${getSiteOrigin()}/pay/return?ref=${encodeURIComponent(result.reference)}&embedded=1`;

  try {
    const order = await createSdkOrder({
      amount,
      currencyCode: currency,
      description: `Taxi transfer · ${parsed.data.pickupLocation} → ${parsed.data.destination} · ${result.reference}`,
      merchantCustomReference: result.reference,
      webhookUrl: `${getSiteOrigin()}/pay/webhook`,
      redirectUrl: returnUrl,
      failRedirectUrl: returnUrl,
      expiresAfterMinutes: 30,
    });

    await createPendingPayment({
      taxiRideRequestId: result.id,
      amount,
      currency,
      sdkOrder: order,
    });

    return { status: "checkout", confirmUrl: order.confirmUrl, requestReference: result.reference };
  } catch (error) {
    console.error("[pok-payments] failed to start taxi checkout, cancelling request", {
      requestReference: result.reference,
      error: error instanceof PokConfigError ? error.message : error,
    });
    try {
      await cancelTaxiRequestForUnpaidPayment(result.id);
    } catch (cleanupError) {
      console.error("[pok-payments] failed to cancel taxi request after checkout setup failed", {
        requestReference: result.reference,
        cleanupError,
      });
    }
    return { status: "error", message: "We couldn't start payment for this booking. Please try again." };
  }
}
