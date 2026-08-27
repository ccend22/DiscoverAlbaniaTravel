import type { Locale } from "./locale";
import { getDictionary } from "./dictionary";

export function formatWeekdays(weekdays: number[], locale: Locale = "en"): string {
  const names = getDictionary(locale).common.weekdayShort;
  const sorted = [...weekdays].sort((a, b) => a - b);
  if (sorted.length === 7) return getDictionary(locale).common.everyDay;

  const isContiguous = sorted.every((w, i) => i === 0 || w === sorted[i - 1] + 1);
  if (isContiguous && sorted.length > 1) {
    return `${names[sorted[0] - 1]} to ${names[sorted[sorted.length - 1] - 1]}`;
  }
  return sorted.map((w) => names[w - 1]).join(", ");
}

/** Postgres `time` columns come back as "HH:MM:SS" — trim the seconds nobody needs. */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatPrice(
  price: string | number | null,
  seats: number = 1,
  locale: Locale = "en"
): string {
  if (price === null) return getDictionary(locale).common.priceUnavailable;
  const total = Number(price) * seats;
  return `€${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDuration(
  durationMin: string | number,
  locale: Locale = "en"
): string {
  const minutes = Math.round(Number(durationMin));
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return getDictionary(locale).common.durationUnavailable;
  }
  return `${minutes.toLocaleString(locale === "al" ? "sq-AL" : "en-US")} min`;
}

export function formatCurrency(price: string | number, currency: "EUR" | "ALL" = "EUR"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(price));
}

// Bus payments taken before the Aug 26 2026 switch to EUR checkout ("Switch
// bus ticket pricing from Lek to EUR") were genuinely charged in ALL -- the
// stored amount/currency is an accurate settlement record and stays
// untouched. This is purely a reporting-currency conversion so the admin
// payments list can read consistently in EUR, at the same rate that
// migration used to derive EUR fares from their ALL equivalents.
const LEGACY_ALL_TO_EUR_RATE = 100;

/** Formats a payment amount for admin display, always in EUR -- converting a legacy ALL-denominated payment at the fixed historical rate rather than relabeling its digits. */
export function formatPaymentAmountInEur(amount: string | number, currency: string): string {
  const eurAmount = currency === "ALL" ? Number(amount) / LEGACY_ALL_TO_EUR_RATE : Number(amount);
  return formatCurrency(eurAmount, "EUR");
}

// Built manually from the dictionary rather than via `Intl.DateTimeFormat(locale, ...)`:
// some browsers ship without full ICU locale data for "sq" (Albanian), which would
// silently fall back to English client-side and cause SSR/hydration text mismatches
// wherever this runs inside a client component (e.g. DatePicker).
export function formatDateLong(dateStr: string, locale: Locale = "en"): string {
  const dict = getDictionary(locale);
  const date = new Date(`${dateStr}T00:00:00Z`);
  const weekday = dict.common.weekdayFull[date.getUTCDay()];
  const month = dict.datePicker.monthsFull[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return locale === "al" ? `${weekday}, ${day} ${month} ${year}` : `${weekday}, ${month} ${day}, ${year}`;
}

/** Drops the weekday for tight spaces (e.g. a side-by-side date-range summary) -- the day number stays intact rather than being the first thing lost to a `truncate`. */
export function formatDateShort(dateStr: string, locale: Locale = "en"): string {
  const dict = getDictionary(locale);
  const date = new Date(`${dateStr}T00:00:00Z`);
  const month = dict.datePicker.monthsFull[date.getUTCMonth()].slice(0, 3);
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return locale === "al" ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}
