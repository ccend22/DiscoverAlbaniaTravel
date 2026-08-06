import Link from "next/link";
import Image from "next/image";
import { SearchWidget } from "@/components/search-widget";
import { FeaturedDestinations, type FeaturedPlace } from "@/components/featured-destinations";
import { ScrollReveal } from "@/components/scroll-reveal";
import { LinkButton } from "@/components/ui/button";
import { ArrowRightIcon, BuildingIcon, MapPinIcon, BusIcon, CompassIcon, SearchIcon } from "@/components/icons";
import {
  getStationNames,
  getOriginDestinationMap,
  getPopularRoutes,
  getPlatformStats,
} from "@/db/queries/trips";
import { getDestinationsByNames } from "@/db/queries/destinations";
import { getLocaleAndDictionary } from "@/lib/i18n";

// Tailwind's scanner needs complete literal class strings, so color variants
// are looked up from this static map rather than built with `bg-${color}`
// template interpolation (which it can't statically detect).
const ACCENT_STYLES = {
  teal: { bar: "bg-teal", badge: "bg-teal-soft text-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]", text: "text-teal", border: "border-teal" },
  coral: { bar: "bg-coral", badge: "bg-coral-soft text-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]", text: "text-coral", border: "border-coral" },
  gold: { bar: "bg-gold", badge: "bg-gold-soft text-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]", text: "text-gold", border: "border-gold" },
  sky: { bar: "bg-sky", badge: "bg-sky-soft text-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]", text: "text-sky", border: "border-sky" },
} as const;
type AccentColor = keyof typeof ACCENT_STYLES;

const FEATURED_PLACE_META: Omit<FeaturedPlace, "destinationId" | "tagline">[] = [
  { name: "Tiranë", image: "/images/destinations/tirana.jpg", tone: "teal" },
  { name: "Durrës", image: "/images/destinations/durres.jpg", tone: "sky" },
  { name: "Sarandë", image: "/images/destinations/sarande.jpg", tone: "coral" },
  { name: "Vlorë", image: "/images/destinations/vlore.jpg", tone: "gold" },
  { name: "Shkodër", image: "/images/destinations/shkoder.jpg", tone: "sky" },
  { name: "Berat", image: "/images/destinations/berat.jpg", tone: "coral" },
];

export default async function HomePage() {
  const { locale, dict } = await getLocaleAndDictionary();
  const [stations, originToDestinations, popularRoutes, stats, featuredDestinationRows] = await Promise.all([
    getStationNames(),
    getOriginDestinationMap(),
    getPopularRoutes(6),
    getPlatformStats(),
    getDestinationsByNames(FEATURED_PLACE_META.map((p) => p.name)),
  ]);
  const cityOptions = Array.from(new Set(stations.flatMap((s) => [s.city, s.name]))).sort();
  const today = new Date().toISOString().slice(0, 10);
  const featuredPlaces: FeaturedPlace[] = FEATURED_PLACE_META.map((place) => {
    const row = featuredDestinationRows.find((r) => r.name === place.name);
    return {
      ...place,
      tagline: dict.places[place.name as keyof typeof dict.places].tagline,
      destinationId: row?.id,
      description: row?.description,
    };
  });

  const statItems = [
    { label: dict.home.statOperators, value: stats.operatorCount, Icon: BuildingIcon, color: "teal" as const },
    { label: dict.home.statStations, value: stats.stationCount, Icon: MapPinIcon, color: "coral" as const },
    { label: dict.home.statRoutes, value: stats.routeCount, Icon: BusIcon, color: "gold" as const },
  ];

  const routeAccents: AccentColor[] = ["teal", "coral", "gold", "sky"];

  return (
    <div>
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-brand-deep">
        <Image
          src="/images/destinations/shkoder.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-150 object-cover object-[center_38%]"
        />
        {/* Full-viewport photo moment, no form in sight — the search card
            lives in its own section below so this stays a single, dominant
            first impression instead of competing with a data-entry card. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/55 to-brand-deep/35"
          aria-hidden="true"
        />

        <div className="relative flex flex-1 flex-col items-center justify-start px-4 pt-24 text-center sm:px-6 sm:pt-28">
          <ScrollReveal>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
              {dict.home.kicker}
            </span>
          </ScrollReveal>
          <ScrollReveal className="[animation-delay:80ms]">
            {/* Brand name, not translated content — matches the header/footer
                wordmark treatment, which keeps "Discover Albania Travel" as
                a fixed proper noun across locales. */}
            <h1 className="mt-6 font-hero text-6xl font-normal uppercase leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-8xl">
              <span className="block">Discover</span>
              <span className="block">Albania Travel</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal className="[animation-delay:160ms]">
            <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
              {dict.home.subtitle}
            </p>
          </ScrollReveal>
          <ScrollReveal className="mt-20 flex flex-col gap-3 [animation-delay:220ms] sm:flex-row">
            <a
              href="#search"
              className="inline-flex min-h-16 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-teal px-9 text-lg font-semibold text-teal-foreground shadow-[var(--shadow-md)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-lg)] active:translate-y-0 active:scale-[0.97]"
            >
              <SearchIcon width={21} height={21} />
              {dict.home.heroPrimaryCta}
            </a>
            <Link
              href="/taxi"
              className="inline-flex min-h-16 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-9 text-lg font-semibold text-white backdrop-blur-md transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-white/15 active:translate-y-0 active:scale-[0.97]"
            >
              {dict.home.heroSecondaryCta}
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section id="search" className="relative scroll-mt-16 border-b border-border bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">{dict.home.searchKicker}</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {dict.home.searchHeading}
          </h2>
          <p className="mt-1.5 text-sm text-muted">{dict.home.searchSubtitle}</p>
          <div className="mt-6">
            <SearchWidget
              cityOptions={cityOptions}
              originToDestinations={originToDestinations}
              dict={dict}
              locale={locale}
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_60%_100%_at_100%_50%,var(--coral-soft),transparent)] opacity-80"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-4">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral shadow-[var(--shadow-xs)] sm:flex">
              <MapPinIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-coral">{dict.home.taxiKicker}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{dict.home.taxiHeading}</h2>
              <p className="mt-1 text-sm text-muted">{dict.home.taxiBody}</p>
            </div>
          </div>
          <LinkButton href="/taxi" className="w-fit">
            {dict.home.taxiCta} <ArrowRightIcon width={16} height={16} />
          </LinkButton>
        </div>
      </section>

      <section className="border-b border-border bg-surface-sunken">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-9 sm:grid-cols-3 sm:px-6">
          {statItems.map(({ label, value, Icon, color }) => {
            const accent = ACCENT_STYLES[color];
            return (
              <div
                key={label}
                className={`card-lift group relative overflow-hidden rounded-lg border border-border/70 bg-surface px-6 py-6 text-center shadow-[var(--shadow-sm)] ${accent.glow}`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} aria-hidden="true" />
                <span
                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:scale-110 ${accent.badge}`}
                >
                  <Icon width={19} height={19} />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-brand-strong sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {popularRoutes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {dict.home.popularRoutesTitle}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {dict.home.popularRoutesSubtitle}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularRoutes.map((route, index) => {
              const accent = ACCENT_STYLES[routeAccents[index % routeAccents.length]];
              return (
                <Link
                  key={`${route.fromCity}-${route.toCity}`}
                  href={`/search?origin=${encodeURIComponent(route.fromCity)}&destination=${encodeURIComponent(route.toCity)}&date=${today}`}
                  className={`group flex min-h-20 items-center justify-between rounded-md border border-l-4 border-border bg-surface p-4 transition-[background-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] hover:bg-surface-sunken/60 ${accent.border} ${accent.glow}`}
                >
                  <div>
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      {route.fromCity}
                      <ArrowRightIcon width={16} height={16} className={`transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1 ${accent.text}`} />
                      {route.toCity}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {route.tripCount} {route.tripCount === 1 ? dict.home.scheduledDeparture : dict.home.scheduledDepartures}
                    </p>
                  </div>
                  <ArrowRightIcon
                    width={18}
                    height={18}
                    className={`opacity-60 transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:opacity-100 ${accent.text}`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="mt-12 border-t border-border pt-10">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">{dict.home.popularDestinationsTitle}</h2>
            <p className="mt-1.5 text-sm text-muted">{dict.home.popularDestinationsSubtitle}</p>
            <div className="mt-6">
              <FeaturedDestinations places={featuredPlaces} photoCredit={dict.home.photoCredit} />
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-2xl bg-brand-deep shadow-[var(--shadow-lg)]">
          {/* A bold, contained card instead of an edge-to-edge banner — the
              one dark moment on an otherwise light page, so the handoff to
              the sister brand reads as a deliberate spotlight, not a strip. */}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,var(--lime)_145%)] opacity-[0.22]"
            aria-hidden="true"
          />
          <CompassIcon
            aria-hidden="true"
            strokeWidth={1}
            className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 text-white opacity-[0.06] sm:h-72 sm:w-72"
          />

          <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-lime backdrop-blur-sm">
                <CompassIcon width={13} height={13} />
                {dict.home.toursKicker}
              </span>
              <h2 className="mt-4 max-w-lg font-display text-2xl font-bold text-white sm:text-3xl">
                {dict.home.toursHeading}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                {dict.home.toursBody}
              </p>
            </div>
            <a
              href="https://www.discoveralbania.al/tours"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#008080] px-5 py-2.5 font-semibold text-white shadow-[var(--shadow-xs)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.97]"
            >
              {dict.home.toursCta} <ArrowRightIcon width={16} height={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border bg-surface-sunken">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-soft opacity-70 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-sky-soft opacity-60 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {dict.home.exploreTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {dict.home.exploreSubtitle}
          </p>
          <Link
            href="/destinations"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal"
          >
            <span className="relative">
              {dict.home.browseDestinations}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
            </span>
            <ArrowRightIcon width={16} height={16} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
