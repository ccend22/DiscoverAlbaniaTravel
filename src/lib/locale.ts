export type Locale = "en" | "al";

export const LOCALE_COOKIE = "discover_albania_locale";
export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "al" ? "al" : DEFAULT_LOCALE;
}
