"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { CloseIcon, LogOutIcon, MenuIcon } from "./icons";
import { logoutAdminAction } from "@/app/admin/actions";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";

interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  { label: "", links: [{ href: "/admin", label: "Overview" }] },
  {
    label: "Catalog",
    links: [
      { href: "/admin/operators", label: "Operators" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/stations", label: "Stations" },
      { href: "/admin/destinations", label: "Destinations" },
      { href: "/admin/blog", label: "Blog" },
    ],
  },
  {
    label: "People",
    links: [
      { href: "/admin/users", label: "Travelers" },
      { href: "/admin/vendors", label: "Vendors" },
      { href: "/admin/admins", label: "Admins" },
    ],
  },
  {
    label: "Commerce",
    links: [
      { href: "/admin/bookings", label: "Bus bookings" },
      { href: "/admin/bus-payments", label: "Bus payments" },
      { href: "/admin/taxi-requests", label: "Taxi bookings" },
      { href: "/admin/taxi-payments", label: "Taxi payments" },
      { href: "/admin/scan-log", label: "Scan log" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkItem({ pathname, link, onNavigate }: { pathname: string; link: NavLink; onNavigate?: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
        active ? "bg-teal/15 text-teal" : "text-muted hover:bg-brand-soft hover:text-foreground"
      }`}
    >
      {link.label}
    </Link>
  );
}

function SectionedNav({
  pathname,
  onNavigate,
  navLabel,
  className = "",
}: {
  pathname: string;
  onNavigate?: () => void;
  navLabel: string;
  className?: string;
}) {
  return (
    <nav className={`flex-1 overflow-y-auto px-3 py-4 ${className}`} aria-label={navLabel}>
      {SECTIONS.map((section) => (
        <div key={section.label || "root"} className="mb-4 last:mb-0">
          {section.label && (
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted/70">
              {section.label}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {section.links.map((link) => (
              <NavLinkItem key={link.href} pathname={pathname} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation (link tap, back/forward) -- adjusting
  // state during render rather than in an effect.
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    setDrawerOpen(false);
  }

  useBodyScrollLock(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-[var(--shadow-xs)] backdrop-blur-md print:hidden lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/admin" aria-label="Discover Albania Transport admin" className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Admin</span>
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground"
          >
            <MenuIcon width={20} height={20} />
          </button>
        </div>
      </header>

      <div
        className={`touch-manipulation fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        {...tapToDismiss(closeDrawer)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
        className={`fixed inset-0 z-50 flex h-[100dvh] max-w-full flex-col overflow-hidden bg-surface-sunken text-foreground transition-transform duration-500 ease-[var(--ease-out-expo)] print:hidden lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-border px-5 pb-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <span className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Admin</span>
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            {...tapToDismiss(closeDrawer)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-brand-soft"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <SectionedNav pathname={pathname} onNavigate={closeDrawer} navLabel="Admin sections" className="overlay-scroll" />

        <form
          action={logoutAdminAction}
          className="shrink-0 border-t border-border p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-[var(--dur-fast)] hover:bg-brand-soft hover:text-foreground">
            <LogOutIcon width={16} height={16} />
            Sign out
          </button>
        </form>
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-sunken text-foreground print:hidden lg:flex">
        <Link href="/admin" aria-label="Discover Albania Transport admin" className="group flex flex-col items-start gap-1.5 border-b border-border px-5 py-5">
          <BrandMark size={26} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Transport · Admin</span>
        </Link>

        <SectionedNav pathname={pathname} navLabel="Admin sections" />

        <form action={logoutAdminAction} className="border-t border-border p-3">
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-[var(--dur-fast)] hover:bg-brand-soft hover:text-foreground">
            <LogOutIcon width={16} height={16} />
            Sign out
          </button>
        </form>
      </aside>
    </>
  );
}
