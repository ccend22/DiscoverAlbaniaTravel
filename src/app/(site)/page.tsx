import Link from "next/link";
import Image from "next/image";
import { HeroBookingWidget } from "@/components/hero-booking-widget";
import { FeaturedDestinations, type FeaturedPlace } from "@/components/featured-destinations";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ArrowRightIcon, BuildingIcon, MapPinIcon, BusIcon, CompassIcon } from "@/components/icons";
import {
  getStationNames,
  getOriginDestinationMap,
  getPopularRoutes,
  getPlatformStats,
} from "@/db/queries/trips";
import { getDestinationsByNames } from "@/db/queries/destinations";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { getActiveUserSessionId } from "@/lib/user-session";
import { getUserById } from "@/db/queries/users";

// Tailwind's scanner needs complete literal class strings, so color variants
// are looked up from this static map rather than built with `bg-${color}`
// template interpolation (which it can't statically detect).
const ACCENT_STYLES = {
  teal: { bar: "bg-teal", badge: "bg-teal-soft text-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]", text: "text-teal" },
  coral: { bar: "bg-coral", badge: "bg-coral-soft text-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]", text: "text-coral" },
  gold: { bar: "bg-gold", badge: "bg-gold-soft text-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]", text: "text-gold" },
  sky: { bar: "bg-sky", badge: "bg-sky-soft text-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]", text: "text-sky" },
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

interface HomePageProps {
  searchParams: Promise<{ tab?: string; taxiError?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { locale, dict } = await getLocaleAndDictionary();
  const [stations, originToDestinations, popularRoutes, stats, featuredDestinationRows, userId, params] = await Promise.all([
    getStationNames(),
    getOriginDestinationMap(),
    getPopularRoutes(6),
    getPlatformStats(),
    getDestinationsByNames(FEATURED_PLACE_META.map((p) => p.name)),
    getActiveUserSessionId(),
    searchParams,
  ]);
  const user = userId ? await getUserById(userId) : null;
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
      <section id="search" className="relative -mt-20 scroll-mt-20 flex min-h-dvh flex-col bg-brand-deep md:-mt-24 md:scroll-mt-24">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/destinations/The_best_of_south_tour.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Full-viewport photo moment, styled after discoveralbania.al's
              hero: a dark brand-ink scrim (not flat black) for legible white
              type, with the booking widget as this site's own focal point in
              place of their two CTA buttons. */}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,17,33,0.75)_0%,rgba(11,17,33,0.55)_18%,rgba(11,17,33,0.3)_48%,rgba(11,17,33,0.8)_100%)]"
            aria-hidden="true"
          />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-start px-4 pb-16 pt-28 text-center sm:px-6 sm:pt-32">
          <ScrollReveal>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-lime">
              {dict.home.kicker}
            </span>
          </ScrollReveal>
          <ScrollReveal className="[animation-delay:80ms]">
            {/* Brand name, not translated content — matches the header/footer
                wordmark treatment, which keeps "Discover Albania Transport" as
                a fixed proper noun across locales. */}
            <h1 className="mt-6 font-hero text-6xl font-normal uppercase leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-8xl">
              <span className="block">Discover</span>
              <span className="block">Albania Transport</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal className="mt-10 w-full max-w-5xl [animation-delay:220ms]">
            <HeroBookingWidget
              cityOptions={cityOptions}
              originToDestinations={originToDestinations}
              dict={dict}
              locale={locale}
              user={user}
              initialMode={params.tab === "taxi" ? "taxi" : "bus"}
              taxiError={params.taxiError}
            />
          </ScrollReveal>
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
        <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-80 rounded-[2rem] bg-[linear-gradient(120deg,var(--teal-soft),var(--sky-soft)_45%,var(--coral-soft)_100%)] opacity-70 blur-2xl"
            aria-hidden="true"
          />
          <h2 className="relative font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {dict.home.popularRoutesTitle}
          </h2>
          <p className="relative mt-1.5 text-sm text-muted">
            {dict.home.popularRoutesSubtitle}
          </p>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularRoutes.map((route, index) => {
              const accent = ACCENT_STYLES[routeAccents[index % routeAccents.length]];
              return (
                <Link
                  key={`${route.fromCity}-${route.toCity}`}
                  href={`/search?origin=${encodeURIComponent(route.fromCity)}&destination=${encodeURIComponent(route.toCity)}&date=${today}`}
                  className={`group flex min-h-20 items-center justify-between rounded-md border border-l-4 border-white/50 border-l-lime bg-white/50 p-4 backdrop-blur-md shadow-[var(--shadow-sm)] transition-[background-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] hover:bg-white/75 ${accent.glow}`}
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
        <div className="relative overflow-hidden rounded-2xl border border-border bg-brand-soft shadow-[var(--shadow-lg)]">
          {/* A bold, contained card instead of an edge-to-edge banner — the
              one spotlighted moment on an otherwise neutral page, so the
              handoff to the sister brand reads as deliberate, not a strip. */}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,var(--lime)_145%)] opacity-[0.28]"
            aria-hidden="true"
          />
          <CompassIcon
            aria-hidden="true"
            strokeWidth={1}
            className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 text-brand-navy opacity-[0.08] sm:h-72 sm:w-72"
          />

          <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-strong/30 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-lime-strong backdrop-blur-sm">
                <CompassIcon width={13} height={13} />
                {dict.home.toursKicker}
              </span>
              <h2 className="mt-4 max-w-lg font-display text-2xl font-bold text-brand-navy sm:text-3xl">
                {dict.home.toursHeading}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-foreground/70 sm:text-base">
                {dict.home.toursBody}
              </p>
            </div>
            <a
              href="https://www.discoveralbania.al/tours"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-teal px-5 py-2.5 font-semibold text-teal-foreground shadow-[var(--shadow-xs)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.97]"
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
