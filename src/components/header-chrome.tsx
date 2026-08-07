"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "./brand-mark";
import { LanguageToggle } from "./language-toggle";
import { MobileNav } from "./mobile-nav";
import { UserIcon } from "./icons";
import type { Locale } from "@/lib/locale";

interface NavItem {
  href: string;
  label: string;
}

interface HeaderChromeProps {
  primaryLinks: NavItem[];
  utilityLinks: NavItem[];
  locale: Locale;
  openMenuLabel: string;
}

const TEXT_SHADOW = "[text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_1px_8px_rgba(0,0,0,0.5)]";

function BrandLockup({ dark }: { dark: boolean }) {
  return (
    <span className="group inline-flex items-center transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:scale-105">
      <BrandMark size={32} inverted={dark} />
    </span>
  );
}

function NavLink({ href, label, dark, active }: { href: string; label: string; dark: boolean; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center px-1 text-xs font-black uppercase tracking-[0.13em] transition-colors duration-300 ease-out ${
        dark
          ? `${TEXT_SHADOW} ${active ? "text-teal" : "text-white/75 hover:text-lime"}`
          : active
            ? "text-teal"
            : "text-muted hover:text-lime-strong"
      }`}
    >
      {label}
      <span
        className={`pointer-events-none absolute inset-x-1 -bottom-0.5 h-[2px] origin-left rounded-full transition-transform duration-300 ease-[var(--ease-out-expo)] ${
          active ? "scale-x-100 bg-teal" : "scale-x-0 bg-lime-strong group-hover:scale-x-100"
        }`}
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Every public route starts with the same dark navbar and turns solid white
 * once the visitor scrolls. Routes with their own full-bleed dark hero
 * (home, destinations, stations) let that hero show through — the header
 * stays truly transparent there. Every other route has no dark backdrop of
 * its own, so the header supplies one (a solid brand-deep fill) instead of
 * sitting invisibly over light page content.
 */
const HERO_BACKDROP_ROUTES = ["/", "/destinations", "/stations"];

export function HeaderChrome({ primaryLinks, utilityLinks, locale, openMenuLabel }: HeaderChromeProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 80);
    }

    const frame = window.requestAnimationFrame(handleScroll);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  const dark = !scrolled;
  const hasHeroBackdrop = HERO_BACKDROP_ROUTES.includes(pathname);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300 ${
        scrolled
          ? "border-b border-border bg-white shadow-[0_8px_30px_rgba(0,32,34,0.08)]"
          : hasHeroBackdrop
            ? "bg-transparent shadow-none"
            : "bg-brand-deep shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      }`}
    >
      <div className="relative mx-auto flex h-20 max-w-7xl items-center gap-6 px-4 sm:px-6 md:h-24">
        <Link href="/" aria-label="Discover Albania home" className="shrink-0 rounded-sm">
          <BrandLockup dark={dark} />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-12 text-sm lg:flex" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} dark={dark} active={pathname === link.href} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {utilityLinks.map((link) =>
            dark ? (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/10 text-white shadow-[0_1px_6px_rgba(0,0,0,0.35)] transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-lime-strong hover:bg-lime-strong/15 hover:text-lime-strong lg:flex"
              >
                <UserIcon width={18} height={18} />
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-sunken text-foreground/75 transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-px hover:border-lime-strong/40 hover:bg-lime-soft hover:text-lime-strong lg:flex"
              >
                <UserIcon width={18} height={18} />
              </Link>
            )
          )}
          <span className={`mx-1 hidden h-5 w-px lg:block ${dark ? "bg-white/20" : "bg-border"}`} aria-hidden="true" />
          <LanguageToggle locale={locale} dark={dark} />
          <MobileNav
            primaryLinks={primaryLinks}
            utilityLinks={utilityLinks}
            openMenuLabel={openMenuLabel}
            transparentTrigger={dark}
          />
        </div>
      </div>
    </header>
  );
}
