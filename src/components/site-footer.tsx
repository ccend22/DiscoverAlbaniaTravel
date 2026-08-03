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
    <footer className="relative border-t border-white/10 bg-brand-deep text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/70 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark size={30} className="text-white" />
          <div className="text-[12px] font-extrabold leading-[0.94]">
            <p>DISCOVER</p>
            <p>ALBANIA</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-7 gap-y-3 text-sm" aria-label="Footer navigation">
          <FooterLink href="/destinations">{dict.footer.destinations}</FooterLink>
          <FooterLink href="/stations">{dict.footer.stations}</FooterLink>
          <FooterLink href="/account">{dict.footer.myAccount}</FooterLink>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{dict.footer.tagline}</p>
          <p>{dict.footer.department}</p>
        </div>
      </div>
    </footer>
  );
}
