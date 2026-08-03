"use server";

import { redirect } from "next/navigation";
import { createTaxiRideRequest } from "@/db/queries/taxi";
import { getActiveUserSessionId } from "@/lib/user-session";
import { taxiRideRequestSchema } from "@/lib/validation";
import { albaniaLocalDateTimeToDate } from "@/lib/timezone";

export async function requestTaxiAction(formData: FormData) {
  const parsed = taxiRideRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    destination: formData.get("destination"),
    pickupDate: formData.get("pickupDate"),
    pickupTime: formData.get("pickupTime"),
    passengers: formData.get("passengers"),
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    redirect(`/taxi?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Please check the form")}`);
  }

  const pickupAt = albaniaLocalDateTimeToDate(parsed.data.pickupDate, parsed.data.pickupTime);
  if (Number.isNaN(pickupAt.getTime()) || pickupAt.getTime() < Date.now() + 15 * 60 * 1000) {
    redirect("/taxi?error=Choose%20a%20pickup%20time%20at%20least%2015%20minutes%20from%20now");
  }

  const reference = await createTaxiRideRequest({
    pickupLocation: parsed.data.pickupLocation,
    destination: parsed.data.destination,
    pickupAt,
    passengers: parsed.data.passengers,
    passengerName: parsed.data.passengerName,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: parsed.data.passengerEmail,
    notes: parsed.data.notes?.trim() || null,
    userId: await getActiveUserSessionId(),
  });

  redirect(`/taxi/request/${reference}`);
}
