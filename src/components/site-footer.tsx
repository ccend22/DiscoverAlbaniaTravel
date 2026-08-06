import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { getLocaleAndDictionary } from "@/lib/i18n";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative text-white/70 transition-colors duration-[var(--dur-fast)] hover:text-white"
    >
      {children}
      <span
        className="pointer-events-none absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100"
        aria-hidden="true"
      />
    </Link>
  );
}

export async function SiteFooter() {
  const { dict } = await getLocaleAndDictionary();

  return (
    <footer className="relative border-t border-white/10 bg-brand-deep font-sans text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/70 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:gap-8 lg:py-20">
        <div className="md:col-span-2 lg:pr-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <BrandMark size={42} className="text-white" />
            <span className="whitespace-nowrap text-sm font-black leading-[0.94] tracking-tight">
              <span className="block">DISCOVER</span>
              <span className="block">ALBANIA TRAVEL</span>
            </span>
          </Link>
          <p className="mt-7 max-w-sm text-sm leading-7 text-white/55">{dict.footer.tagline}</p>
          <a
            href="https://www.discoveralbania.al/tours"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-brand-deep transition-all hover:-translate-y-px hover:bg-lime"
          >
            Explore guided tours
          </a>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Explore</h3>
          <nav className="mt-6 flex flex-col items-start gap-4 text-sm">
            <FooterLink href="/destinations">{dict.footer.destinations}</FooterLink>
            <FooterLink href="/stations">{dict.footer.stations}</FooterLink>
            <FooterLink href="/news">{dict.nav.news}</FooterLink>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Travel</h3>
          <nav className="mt-6 flex flex-col items-start gap-4 text-sm">
            <FooterLink href="/">{dict.nav.busTickets}</FooterLink>
            <FooterLink href="/taxi">{dict.nav.taxi}</FooterLink>
            <FooterLink href="/booking">Booking lookup</FooterLink>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Account</h3>
          <nav className="mt-6 flex flex-col items-start gap-4 text-sm">
            <FooterLink href="/account">{dict.footer.myAccount}</FooterLink>
            <FooterLink href="/account/login">Sign in</FooterLink>
            <FooterLink href="/vendor/login">Partner login</FooterLink>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Discover Albania Travel</p>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            <p>{dict.footer.department}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
