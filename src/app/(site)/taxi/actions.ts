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
import { estimateMapTaxiPriceEur } from "@/lib/taxi-pricing";
import { getSiteOrigin } from "@/lib/google-oauth";

export type TaxiRequestActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "checkout"; confirmUrl: string; requestReference: string };

export async function requestTaxiAction(
  _previousState: TaxiRequestActionState,
  formData: FormData
): Promise<TaxiRequestActionState> {
  const parsed = taxiRideRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
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

  // The fare charged is always computed here from the submitted route, never
  // trusted from the client -- mirrors the direct-route/map-estimate split
  // shown in the form, preferring a real ALL-denominated fare when one
  // exists. Every booking now goes through POK for whatever this resolves
  // to, so a route with no computable fare can't proceed.
  const comparableDirectFares = directRoute
    ? Object.values(directRoute.fares).filter((fare): fare is NonNullable<typeof fare> => Boolean(fare))
    : [];
  const allFares = comparableDirectFares.filter((fare) => fare.currency === "ALL");
  const selectedDirectFare = (allFares.length > 0 ? allFares : comparableDirectFares).sort((a, b) => a.amount - b.amount)[0] ?? null;
  const mapEstimate = directRoute ? null : estimateMapTaxiPriceEur(distanceKm);
  const amount = selectedDirectFare?.amount ?? mapEstimate?.priceEur ?? null;
  const currency = selectedDirectFare?.currency ?? (mapEstimate ? "EUR" : null);

  if (amount === null || currency === null) {
    return { status: "error", message: "We couldn't price this journey. Please adjust your route and try again." };
  }

  const userId = await getActiveUserSessionId();
  const user = userId ? await getUserById(userId) : null;
  const pickupAt = albaniaLocalDateTimeToDate(parsed.data.pickupDate, parsed.data.pickupTime);

  const result = await createTaxiRideRequest({
    pickupLocation: parsed.data.pickupLocation,
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
