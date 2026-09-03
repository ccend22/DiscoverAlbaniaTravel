export const BOOKING_CHANNEL_OPTIONS = [
  { value: "walk_in", label: "Në sportel" },
  { value: "phone", label: "Telefon" },
  { value: "touch_screen", label: "Ekran prekës" },
] as const;

export type ManualBookingChannel = (typeof BOOKING_CHANNEL_OPTIONS)[number]["value"];
