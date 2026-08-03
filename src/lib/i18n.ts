import { cookies } from "next/headers";
import { getDictionary, type Dictionary } from "./dictionary";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./locale";

export type { Locale };
export { LOCALE_COOKIE, normalizeLocale };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export { getDictionary };

export async function getLocaleAndDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
