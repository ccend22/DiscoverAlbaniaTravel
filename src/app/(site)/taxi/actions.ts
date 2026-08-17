"use server";

import { redirect } from "next/navigation";
import { createTaxiRideRequest } from "@/db/queries/taxi";
import { getUserById } from "@/db/queries/users";
import { getActiveUserSessionId } from "@/lib/user-session";
import { taxiRideRequestSchema } from "@/lib/validation";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM } from "@/lib/taxi-service";
import { albaniaLocalDateTimeToDate } from "@/lib/timezone";
import { findDirectTaxiRoute, formatDirectTaxiFare } from "@/lib/taxi-fares";
import { estimateMapTaxiPriceEur } from "@/lib/taxi-pricing";
import { sendTaxiReservationNotification } from "@/lib/email";

export interface TaxiRequestActionState {
  error: string | null;
}

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
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const distanceKm = calculateDistanceKm(
    { lat: parsed.data.pickupLatitude, lng: parsed.data.pickupLongitude },
    { lat: parsed.data.destinationLatitude, lng: parsed.data.destinationLongitude }
  );
  const submittedDirectRoute =
    parsed.data.pricingSource === "direct"
      ? findDirectTaxiRoute(parsed.data.pickupLocation, parsed.data.destination)
      : null;
  if (!submittedDirectRoute && distanceKm < MIN_INTERCITY_TAXI_DISTANCE_KM) {
    return {
      error: `Intercity taxi requests require a journey of at least ${MIN_INTERCITY_TAXI_DISTANCE_KM} km.`,
    };
  }

  const userId = await getActiveUserSessionId();
  const user = userId ? await getUserById(userId) : null;
  const pickupAt = albaniaLocalDateTimeToDate(parsed.data.pickupDate, parsed.data.pickupTime);
  const directRoute = submittedDirectRoute;
  const comparableDirectFares = directRoute
    ? Object.values(directRoute.fares).filter((fare): fare is NonNullable<typeof fare> => Boolean(fare))
    : [];
  const allFares = comparableDirectFares.filter((fare) => fare.currency === "ALL");
  const selectedDirectFare = (allFares.length > 0 ? allFares : comparableDirectFares)
    .sort((a, b) => a.amount - b.amount)[0] ?? null;
  const mapEstimate = directRoute ? null : estimateMapTaxiPriceEur(distanceKm);
  const estimatedFare = selectedDirectFare
    ? formatDirectTaxiFare(selectedDirectFare)
    : mapEstimate
      ? `~€${mapEstimate.priceEur}`
      : null;

  const reference = await createTaxiRideRequest({
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

  // The reservation is already safely stored at this point. Email remains
  // best-effort so a temporary SMTP outage never loses or duplicates it.
  try {
    await sendTaxiReservationNotification({
      requestReference: reference,
      pickupLocation: parsed.data.pickupLocation,
      destination: parsed.data.destination,
      pickupAt,
      passengers: parsed.data.passengers,
      passengerName: user?.name ?? null,
      passengerPhone: parsed.data.passengerPhone,
      passengerEmail: parsed.data.passengerEmail,
      preferredTaxiCompany: null,
      estimatedFare,
      pricingSource: directRoute ? "direct" : "map",
      notes: parsed.data.notes || null,
    });
  } catch (emailError) {
    console.error("[email] failed to send taxi reservation notification", {
      requestReference: reference,
      emailError,
    });
  }

  redirect(`/taxi/request/${reference}`);
}
