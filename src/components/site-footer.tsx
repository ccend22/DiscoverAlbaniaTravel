import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { getLocaleAndDictionary } from "@/lib/i18n";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative text-muted transition-colors duration-[var(--dur-fast)] hover:text-foreground"
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
    <footer className="relative border-t border-border bg-surface-sunken font-sans text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/70 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:gap-8 lg:py-20">
        <div className="md:col-span-2 lg:pr-12">
          <Link href="/" aria-label="Discover Albania Transport home" className="inline-flex items-center gap-2">
            <BrandMark size={40} />
          </Link>
          <p className="mt-7 max-w-sm text-sm leading-7 text-muted">{dict.footer.tagline}</p>
          <a
            href="https://www.discoveralbania.al/tours"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex rounded-full bg-teal px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-teal-foreground transition-all hover:-translate-y-px hover:bg-brand-strong"
          >
            Explore guided tours
          </a>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-muted/70">Explore</h3>
          <nav className="mt-6 flex flex-col items-start gap-4 text-sm">
            <FooterLink href="/destinations">{dict.footer.destinations}</FooterLink>
            <FooterLink href="/stations">{dict.footer.stations}</FooterLink>
            <FooterLink href="/routes">{dict.nav.routes}</FooterLink>
            <FooterLink href="/news">{dict.nav.news}</FooterLink>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-muted/70">Account</h3>
          <nav className="mt-6 flex flex-col items-start gap-4 text-sm">
            <FooterLink href="/account">{dict.footer.myAccount}</FooterLink>
            <FooterLink href="/account/login">Sign in</FooterLink>
            <FooterLink href="/vendor/login">Partner login</FooterLink>
            <FooterLink href="/terms-and-conditions">{dict.footer.termsAndConditions}</FooterLink>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.24em] text-muted/70">{dict.footer.contacts}</h3>
          <address className="mt-6 flex flex-col items-start gap-4 text-sm not-italic leading-6 text-muted">
            <a href="tel:+355696583870" className="transition-colors hover:text-teal">+355 69 658 3870</a>
            <a href="mailto:info@discoveralbania.al" className="break-all transition-colors hover:text-teal">info@discoveralbania.al</a>
            <p>Rr. Myslym Shyri, P.24, Sh 1/4, Tirana, Albania</p>
          </address>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm font-bold text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Discover Albania Transport</p>
          <div className="flex flex-col gap-2 sm:items-end">
            <p>A Licensed &amp; Bonded Travel Operator.</p>
            <p>
              Made by{" "}
              <a
                href="https://bluesquareai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground transition-colors hover:text-teal"
              >
                bluesquare AI
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
