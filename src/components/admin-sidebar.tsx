"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { LogOutIcon } from "./icons";
import { logoutAdminAction } from "@/app/admin/actions";

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

export function AdminSidebar() {
  const pathname = usePathname();
  const flatLinks = SECTIONS.flatMap((section) => section.links);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-[var(--shadow-xs)] backdrop-blur-md print:hidden lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/admin" aria-label="Discover Albania Transport admin" className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Admin</span>
          </Link>
          <form action={logoutAdminAction}>
            <button aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground">
              <LogOutIcon width={17} height={17} />
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin sections">
          {flatLinks.map((link) => {
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
        <Link href="/admin" aria-label="Discover Albania Transport admin" className="group flex flex-col items-start gap-1.5 border-b border-border px-5 py-5">
          <BrandMark size={26} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Transport · Admin</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
          {SECTIONS.map((section) => (
            <div key={section.label || "root"} className="mb-4 last:mb-0">
              {section.label && (
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted/70">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                        active
                          ? "bg-teal/15 text-teal"
                          : "text-muted hover:bg-brand-soft hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

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
