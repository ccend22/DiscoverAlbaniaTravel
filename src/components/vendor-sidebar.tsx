"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { LogOutIcon } from "./icons";
import { logoutVendorAction } from "@/app/vendor/actions";

interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  {
    label: "",
    links: [
      { href: "/vendor", label: "Overview" },
      { href: "/vendor/bookings", label: "Bookings" },
      { href: "/vendor/reports", label: "Reports" },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/vendor/profile", label: "Profile" },
      { href: "/vendor/routes", label: "Routes & stops" },
      { href: "/vendor/departures", label: "Departures" },
      { href: "/vendor/users", label: "Users" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/vendor") return pathname === "/vendor";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function VendorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-sunken text-foreground">
      <Link href="/vendor" aria-label="Discover Albania Transport vendor portal" className="group flex flex-col items-start gap-1.5 border-b border-border px-5 py-5">
        <BrandMark size={26} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Transport · Vendor</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Vendor sections">
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

      <form action={logoutVendorAction} className="border-t border-border p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-[var(--dur-fast)] hover:bg-brand-soft hover:text-foreground">
          <LogOutIcon width={16} height={16} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
