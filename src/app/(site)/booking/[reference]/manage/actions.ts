"use server";

import { redirect } from "next/navigation";
import { passengerDetailsSchema } from "@/lib/validation";
import { cancelBookingByToken, updatePassengerDetailsByToken } from "@/db/queries/bookings";

function manageUrl(reference: string, token: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ token, ...params });
  return `/booking/${reference}/manage?${search.toString()}`;
}

export async function updatePassengerDetailsAction(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const token = String(formData.get("token") ?? "");

  const parsed = passengerDetailsSchema.safeParse({
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details and try again.";
    redirect(manageUrl(reference, token, { error: message }));
  }

  const result = await updatePassengerDetailsByToken(reference, token, parsed.data);
  redirect(
    result === "ok"
      ? manageUrl(reference, token, { saved: "1" })
      : manageUrl(reference, token, { error: "Your details could not be updated." })
  );
}

export async function cancelBookingByTokenAction(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const token = String(formData.get("token") ?? "");

  const result = await cancelBookingByToken(reference, token);
  if (result === "ok") {
    redirect(manageUrl(reference, token, { cancelled: "1" }));
  }

  const message = result === "already_paid" ? "This booking is already paid. Contact us to cancel it." : "Booking could not be cancelled.";
  redirect(manageUrl(reference, token, { error: message }));
}
