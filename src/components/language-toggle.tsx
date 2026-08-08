"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

export function LanguageToggle({ locale, dark = true }: { locale: Locale; dark?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  const base = "relative z-10 flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 text-xs font-bold transition-colors duration-300";
  const activeText = dark ? "text-brand-deep" : "text-brand-foreground";
  const inactiveClass = dark ? "text-white/65 hover:text-white" : "text-muted hover:text-foreground";

  return (
    <div
      className={`relative inline-flex items-center gap-0.5 rounded-full p-0.5 ${dark ? "border border-white/20 bg-white/5" : "border border-border bg-surface-sunken"} ${isPending ? "opacity-60" : ""}`}
      role="group"
      aria-label="Language"
    >
      <span
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full shadow-sm transition-transform duration-300 ease-[var(--ease-spring)] ${dark ? "bg-white" : "bg-brand"} ${
          locale === "al" ? "translate-x-full" : "translate-x-0"
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`${base} ${locale === "en" ? activeText : inactiveClass}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("al")}
        aria-pressed={locale === "al"}
        className={`${base} ${locale === "al" ? activeText : inactiveClass}`}
      >
        AL
      </button>
    </div>
  );
}
