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

  const base = "flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 text-xs font-bold transition-colors duration-[var(--dur-fast)]";
  const activeClass = dark ? "bg-white text-brand-deep" : "bg-brand text-brand-foreground";
  const inactiveClass = dark ? "text-white/65 hover:text-white" : "text-muted hover:text-foreground";

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full p-0.5 ${dark ? "border border-white/20 bg-white/5" : "border border-border bg-surface-sunken"} ${isPending ? "opacity-60" : ""}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`${base} ${locale === "en" ? activeClass : inactiveClass}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("al")}
        aria-pressed={locale === "al"}
        className={`${base} ${locale === "al" ? activeClass : inactiveClass}`}
      >
        AL
      </button>
    </div>
  );
}
