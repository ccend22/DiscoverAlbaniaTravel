"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { ChevronDownIcon, LogOutIcon, SettingsIcon } from "./icons";
import { logoutVendorAction } from "@/app/vendor/actions";

interface NavLink {
  href: string;
  label: string;
}

const MAIN_LINKS: NavLink[] = [
  { href: "/vendor", label: "Overview" },
  { href: "/vendor/calendar", label: "Calendar" },
  { href: "/vendor/bookings", label: "Bookings" },
  { href: "/vendor/scanner", label: "Scan tickets" },
  { href: "/vendor/reports", label: "Reports" },
];

const SETTINGS_LINKS: NavLink[] = [
  { href: "/vendor/profile", label: "Profile" },
  { href: "/vendor/routes", label: "Routes & stops" },
  { href: "/vendor/departures", label: "Departures" },
  { href: "/vendor/users", label: "Users" },
];

function isActive(pathname: string, href: string) {
  if (href === "/vendor") return pathname === "/vendor";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkItem({ pathname, link }: { pathname: string; link: NavLink }) {
  const active = isActive(pathname, link.href);
  return (
    <Link
      href={link.href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
        active ? "bg-teal/15 text-teal" : "text-muted hover:bg-brand-soft hover:text-foreground"
      }`}
    >
      {link.label}
    </Link>
  );
}

export function VendorSidebar() {
  const pathname = usePathname();
  const onSettingsPage = SETTINGS_LINKS.some((link) => isActive(pathname, link.href));
  const [settingsOpen, setSettingsOpen] = useState(onSettingsPage);
  // Auto-expand on navigation into a Settings page, without fighting a
  // manual collapse elsewhere -- adjusting state during render (React's
  // documented alternative to an effect here) rather than after the fact.
  const [trackedOnSettingsPage, setTrackedOnSettingsPage] = useState(onSettingsPage);
  if (onSettingsPage !== trackedOnSettingsPage) {
    setTrackedOnSettingsPage(onSettingsPage);
    if (onSettingsPage) setSettingsOpen(true);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-[var(--shadow-xs)] backdrop-blur-md print:hidden lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/vendor" aria-label="Discover Albania Transport vendor portal" className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Vendor</span>
          </Link>
          <form action={logoutVendorAction}>
            <button aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground">
              <LogOutIcon width={17} height={17} />
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Vendor sections">
          {[...MAIN_LINKS, ...SETTINGS_LINKS].map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                  active ? "bg-teal/15 text-teal" : "text-muted hover:bg-brand-soft hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-sunken text-foreground print:hidden lg:flex">
        <Link href="/vendor" aria-label="Discover Albania Transport vendor portal" className="group flex flex-col items-start gap-1.5 border-b border-border px-5 py-5">
          <BrandMark size={26} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Transport · Vendor</span>
        </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Vendor sections">
        <div className="flex flex-col gap-0.5">
          {MAIN_LINKS.map((link) => (
            <NavLinkItem key={link.href} pathname={pathname} link={link} />
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
              onSettingsPage ? "text-teal" : "text-muted hover:bg-brand-soft hover:text-foreground"
            }`}
          >
            <SettingsIcon width={16} height={16} />
            <span className="flex-1 text-left">Settings</span>
            <ChevronDownIcon
              width={14}
              height={14}
              className={`transition-transform duration-[var(--dur-fast)] ${settingsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {settingsOpen && (
            <div className="mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
              {SETTINGS_LINKS.map((link) => (
                <NavLinkItem key={link.href} pathname={pathname} link={link} />
              ))}
            </div>
          )}
        </div>
      </nav>

      <form action={logoutVendorAction} className="border-t border-border p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-[var(--dur-fast)] hover:bg-brand-soft hover:text-foreground">
          <LogOutIcon width={16} height={16} />
          Sign out
        </button>
      </form>
      </aside>
    </>
  );
}
