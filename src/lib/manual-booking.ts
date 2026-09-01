export const BOOKING_CHANNEL_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "touch_screen", label: "Touch screen" },
] as const;

export type ManualBookingChannel = (typeof BOOKING_CHANNEL_OPTIONS)[number]["value"];
