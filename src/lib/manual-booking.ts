/** Flat charge added on top of the fare for a vendor-entered (walk-in/phone/kiosk) booking. */
export const MANUAL_BOOKING_SERVICE_FEE_EUR = "2.00";

export const BOOKING_CHANNEL_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "touch_screen", label: "Touch screen" },
] as const;

export type ManualBookingChannel = (typeof BOOKING_CHANNEL_OPTIONS)[number]["value"];
