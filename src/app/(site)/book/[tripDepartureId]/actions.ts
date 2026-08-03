"use server";

import { redirect } from "next/navigation";
import { bookingFormSchema } from "@/lib/validation";
import { createBooking } from "@/db/queries/bookings";
import { getActiveUserSessionId } from "@/lib/user-session";

export async function createBookingAction(formData: FormData) {
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
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    redirect(`/book/${tripDepartureId}?date=${travelDate}&error=${encodeURIComponent(message)}`);
  }

  const userId = await getActiveUserSessionId();
  const result = await createBooking({ ...parsed.data, userId });

  if (!result.ok) {
    const message = result.error === "invalid_date"
      ? "This departure doesn't run on the selected date."
      : result.error === "sold_out"
        ? "There are not enough seats available for this date."
        : "This departure could not be found.";
    redirect(
      `/book/${parsed.data.tripDepartureId}?date=${parsed.data.travelDate}&error=${encodeURIComponent(message)}`
    );
  }

  redirect(`/booking/${result.reference}`);
}
