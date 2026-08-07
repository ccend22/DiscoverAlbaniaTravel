"use server";

import { redirect } from "next/navigation";
import { createTaxiRideRequest } from "@/db/queries/taxi";
import { getUserById } from "@/db/queries/users";
import { getActiveUserSessionId } from "@/lib/user-session";
import { taxiRideRequestSchema } from "@/lib/validation";

const REQUEST_DISPATCH_BUFFER_MS = 30 * 60 * 1000;

export async function requestTaxiAction(formData: FormData) {
  const parsed = taxiRideRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    destination: formData.get("destination"),
    passengerPhone: formData.get("passengerPhone"),
  });

  if (!parsed.success) {
    redirect(`/?tab=taxi&taxiError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Please check the form")}#search`);
  }

  const userId = await getActiveUserSessionId();
  const user = userId ? await getUserById(userId) : null;

  const reference = await createTaxiRideRequest({
    pickupLocation: parsed.data.pickupLocation,
    destination: parsed.data.destination,
    pickupAt: new Date(Date.now() + REQUEST_DISPATCH_BUFFER_MS),
    passengers: 1,
    passengerName: user?.name ?? null,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: user?.email ?? null,
    notes: null,
    userId,
  });

  redirect(`/taxi/request/${reference}`);
}
