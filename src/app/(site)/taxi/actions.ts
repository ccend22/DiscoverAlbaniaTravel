"use server";

import { redirect } from "next/navigation";
import { createTaxiRideRequest } from "@/db/queries/taxi";
import { getUserById } from "@/db/queries/users";
import { getActiveUserSessionId } from "@/lib/user-session";
import { taxiRideRequestSchema } from "@/lib/validation";
import { calculateDistanceKm, MIN_INTERCITY_TAXI_DISTANCE_KM } from "@/lib/taxi-service";
import { albaniaLocalDateTimeToDate } from "@/lib/timezone";

export async function requestTaxiAction(formData: FormData) {
  const parsed = taxiRideRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    destination: formData.get("destination"),
    pickupLatitude: formData.get("pickupLatitude"),
    pickupLongitude: formData.get("pickupLongitude"),
    destinationLatitude: formData.get("destinationLatitude"),
    destinationLongitude: formData.get("destinationLongitude"),
    pickupDate: formData.get("pickupDate"),
    pickupTime: formData.get("pickupTime"),
    passengerPhone: formData.get("passengerPhone"),
  });

  if (!parsed.success) {
    redirect(`/?tab=taxi&taxiError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Please check the form")}#search`);
  }

  const distanceKm = calculateDistanceKm(
    { lat: parsed.data.pickupLatitude, lng: parsed.data.pickupLongitude },
    { lat: parsed.data.destinationLatitude, lng: parsed.data.destinationLongitude }
  );
  if (distanceKm < MIN_INTERCITY_TAXI_DISTANCE_KM) {
    redirect(
      `/?tab=taxi&taxiError=${encodeURIComponent(
        `Intercity taxi requests require a journey of at least ${MIN_INTERCITY_TAXI_DISTANCE_KM} km.`
      )}#search`
    );
  }

  const userId = await getActiveUserSessionId();
  const user = userId ? await getUserById(userId) : null;

  const reference = await createTaxiRideRequest({
    pickupLocation: parsed.data.pickupLocation,
    destination: parsed.data.destination,
    pickupAt: albaniaLocalDateTimeToDate(parsed.data.pickupDate, parsed.data.pickupTime),
    passengers: 1,
    passengerName: user?.name ?? null,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: user?.email ?? null,
    notes: null,
    userId,
  });

  redirect(`/taxi/request/${reference}`);
}
