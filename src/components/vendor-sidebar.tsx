"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { ChevronDownIcon, CloseIcon, LogOutIcon, MenuIcon, SettingsIcon } from "./icons";
import { logoutVendorAction } from "@/app/vendor/actions";
import { vendorHasPermission, type VendorPermission } from "@/lib/vendor-permissions";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";

interface NavLink {
  href: string;
  label: string;
  /** Omitted means every approved teammate sees it, regardless of permissions. */
  permission?: VendorPermission;
  /** Only the owner sees it -- team/permission management can't be delegated. */
  ownerOnly?: boolean;
}

const MAIN_LINKS: NavLink[] = [
  { href: "/vendor", label: "Overview" },
  { href: "/vendor/calendar", label: "Calendar", permission: "calendar" },
  { href: "/vendor/bookings", label: "Bookings", permission: "bookings" },
  { href: "/vendor/scanner", label: "Scan tickets", permission: "scanner" },
  { href: "/vendor/finance", label: "Finance", permission: "finance" },
];

const SETTINGS_LINKS: NavLink[] = [
  { href: "/vendor/profile", label: "Profile" },
  { href: "/vendor/routes", label: "Routes & stops", permission: "routes" },
  { href: "/vendor/departures", label: "Departures", permission: "departures" },
  { href: "/vendor/users", label: "Users", ownerOnly: true },
  { href: "/vendor/devices", label: "Devices", ownerOnly: true },
  { href: "/vendor/activity-log", label: "Activity Logs", permission: "scanner" },
];

function visibleLinks(links: NavLink[], vendor: { isOwner: boolean; permissions: string[] }): NavLink[] {
  return links.filter((link) => {
    if (link.ownerOnly) return vendor.isOwner;
    if (link.permission) return vendorHasPermission(vendor, link.permission);
    return true;
  });
}

function isActive(pathname: string, href: string) {
  if (href === "/vendor") return pathname === "/vendor";
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

export function VendorSidebar({ isOwner, permissions }: { isOwner: boolean; permissions: string[] }) {
  const pathname = usePathname();
  const mainLinks = visibleLinks(MAIN_LINKS, { isOwner, permissions });
  const settingsLinks = visibleLinks(SETTINGS_LINKS, { isOwner, permissions });
  const onSettingsPage = settingsLinks.some((link) => isActive(pathname, link.href));
  const [settingsOpen, setSettingsOpen] = useState(onSettingsPage);
  // Auto-expand on navigation into a Settings page, without fighting a
  // manual collapse elsewhere -- adjusting state during render (React's
  // documented alternative to an effect here) rather than after the fact.
  const [trackedOnSettingsPage, setTrackedOnSettingsPage] = useState(onSettingsPage);
  if (onSettingsPage !== trackedOnSettingsPage) {
    setTrackedOnSettingsPage(onSettingsPage);
    if (onSettingsPage) setSettingsOpen(true);
  }

  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation (link tap, back/forward) -- adjusting
  // state during render rather than in an effect, same as the Settings
  // auto-expand above.
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
          <Link href="/vendor" aria-label="Discover Albania Transport vendor portal" className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Vendor</span>
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
        aria-label="Vendor menu"
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
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Vendor</span>
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

        <nav className="overlay-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Vendor sections">
          <div className="flex flex-col gap-0.5">
            {mainLinks.map((link) => (
              <NavLinkItem key={link.href} pathname={pathname} link={link} onNavigate={closeDrawer} />
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
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
                {settingsLinks.map((link) => (
                  <NavLinkItem key={link.href} pathname={pathname} link={link} onNavigate={closeDrawer} />
                ))}
              </div>
            )}
          </div>
        </nav>

        <form
          action={logoutVendorAction}
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
        <Link href="/vendor" aria-label="Discover Albania Transport vendor portal" className="group flex flex-col items-start gap-1.5 border-b border-border px-5 py-5">
          <BrandMark size={26} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Transport · Vendor</span>
        </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Vendor sections">
        <div className="flex flex-col gap-0.5">
          {mainLinks.map((link) => (
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
              {settingsLinks.map((link) => (
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
