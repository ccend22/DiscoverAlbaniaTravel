import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { MenuIcon } from "./icons";
import { LanguageToggle } from "./language-toggle";
import { getLocaleAndDictionary } from "@/lib/i18n";

function BrandLockup() {
  return (
    <span className="group flex min-w-0 items-center gap-2.5">
      <span className="relative flex shrink-0 items-center justify-center transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-110">
        <span className="absolute inset-0 -z-10 rounded-full bg-teal/0 blur-md transition-colors duration-[var(--dur-base)] group-hover:bg-teal/40" aria-hidden="true" />
        <BrandMark size={32} className="text-white" />
      </span>
      <span className="flex flex-col text-[13px] font-extrabold leading-[0.92] text-white">
        <span>DISCOVER</span>
        <span>ALBANIA</span>
      </span>
    </span>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      key={href}
      href={href}
      className="group relative flex h-full items-center px-3 font-medium text-white/78 transition-colors duration-[var(--dur-fast)] hover:text-green-300"
    >
      {label}
      <span
        className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-green-300 via-green-200 to-green-300 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100"
        aria-hidden="true"
      />
    </Link>
  );
}

export async function SiteHeader() {
  const { locale, dict } = await getLocaleAndDictionary();

  const primaryLinks = [
    { href: "/", label: dict.nav.busTickets },
    { href: "/taxi", label: dict.nav.taxi },
    { href: "/destinations", label: dict.nav.destinations },
    { href: "/stations", label: dict.nav.stations },
    { href: "/news", label: dict.nav.news },
  ];
  const utilityLinks = [{ href: "/account", label: dict.nav.myAccount }];

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-brand-deep/85 text-white shadow-[0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Discover Albania home" className="shrink-0 rounded-sm">
          <BrandLockup />
        </Link>

        <nav className="hidden h-full items-center gap-1 text-sm lg:flex" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
          <span className="mx-2 h-5 w-px bg-white/18" aria-hidden="true" />
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 font-medium text-white/72 transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:bg-white/8 hover:text-green-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />

          <details className="group relative lg:hidden">
            <summary
              className="flex h-11 w-11 list-none items-center justify-center rounded-md text-white transition-colors duration-[var(--dur-fast)] hover:bg-white/10 active:bg-white/15 [&::-webkit-details-marker]:hidden"
              aria-label={dict.nav.openMenu}
            >
              <MenuIcon width={22} height={22} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-open:rotate-90" />
            </summary>
            <nav className="absolute right-0 z-50 mt-2 w-60 origin-top-right animate-fade-up rounded-md border border-border bg-surface p-2 text-foreground shadow-[var(--shadow-lg)]">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block min-h-11 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] hover:bg-green-50 hover:text-green-700 active:bg-green-50 active:text-green-700"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              {utilityLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block min-h-11 rounded-md px-3 py-2.5 text-sm text-muted transition-colors duration-[var(--dur-fast)] hover:bg-green-50 hover:text-green-700 active:bg-green-50 active:text-green-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
