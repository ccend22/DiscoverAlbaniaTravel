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
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/taxi-requests", label: "Taxi requests" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#061516] text-white">
      <Link href="/admin" className="group flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <BrandMark size={26} className="text-white transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110" />
        <span className="flex flex-col text-[11px] font-extrabold leading-[0.92]">
          <span>DISCOVER ALBANIA</span>
          <span className="font-medium tracking-[0.18em] text-white/45">ADMIN</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        {SECTIONS.map((section) => (
          <div key={section.label || "root"} className="mb-4 last:mb-0">
            {section.label && (
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">
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
                        ? "bg-teal/20 text-white"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
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

      <form action={logoutAdminAction} className="border-t border-white/10 p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-white/65 transition-colors duration-[var(--dur-fast)] hover:bg-white/8 hover:text-white">
          <LogOutIcon width={16} height={16} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
