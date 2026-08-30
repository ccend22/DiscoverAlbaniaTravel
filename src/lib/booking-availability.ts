/**
 * Kill switch for taking online payments offline temporarily (e.g. while
 * fixing something) without a code change -- flip BOOKINGS_PAUSED on the
 * live service and both the bus and taxi checkout actions refuse to create
 * a new booking or start a payment, before touching the database or POK.
 */
export function bookingsArePaused(): boolean {
  return process.env.BOOKINGS_PAUSED === "true";
}

export const BOOKINGS_PAUSED_MESSAGE =
  "Online booking is temporarily paused while we make some updates. Please check back shortly.";
