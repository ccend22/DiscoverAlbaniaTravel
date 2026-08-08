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

export function formatPrice(price: string | number, seats: number = 1): string {
  const total = Number(price) * seats;
  return `${total.toLocaleString("en-US")} ALL`;
}

export function formatDuration(
  durationMin: string | number,
  locale: Locale = "en"
): string {
  const minutes = Number(durationMin);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return getDictionary(locale).common.durationUnavailable;
  }
  return `${minutes.toLocaleString(locale === "al" ? "sq-AL" : "en-US", {
    maximumFractionDigits: 1,
  })} min`;
}

export function formatCurrency(price: string | number, currency: "EUR" | "ALL" = "EUR"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(price));
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
