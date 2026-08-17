import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
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
import { slugify } from "@/lib/slug";
import { buildCityOptions } from "@/lib/city-options";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURED_PLACE_META: Omit<FeaturedPlace, "destinationId" | "tagline">[] = [
  { name: "Tiranë", image: "/images/destinations/tirana.jpg" },
  { name: "Durrës", image: "/images/destinations/durres.jpg" },
  { name: "Sarandë", image: "/images/destinations/sarande.jpg" },
  { name: "Vlorë", image: "/images/destinations/vlore.jpg" },
  { name: "Shkodër", image: "/images/destinations/shkoder.jpg" },
  { name: "Berat", image: "/images/destinations/berat.jpg" },
];

interface HomePageProps {
  searchParams: Promise<{
    tab?: string;
    taxiError?: string;
  }>;
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
  const cityOptions = buildCityOptions(stations);
  const popularCities = FEATURED_PLACE_META.map((p) => p.name);
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
    { label: dict.home.statOperators, value: stats.operatorCount, Icon: BuildingIcon, tone: "teal" as const },
    { label: dict.home.statStations, value: stats.stationCount, Icon: MapPinIcon, tone: "sky" as const },
    { label: dict.home.statRoutes, value: stats.routeCount, Icon: BusIcon, tone: "gold" as const },
  ];
  // Reuses the same teal/sky/gold stat-tone system already established on
  // the destination detail page, instead of inventing a new palette.
  const STAT_TONE_CLASSES: Record<"teal" | "sky" | "gold", { icon: string; rule: string }> = {
    teal: { icon: "text-teal-hover", rule: "bg-teal-hover/70" },
    sky: { icon: "text-sky", rule: "bg-sky/70" },
    gold: { icon: "text-gold", rule: "bg-gold/70" },
  };

  return (
    <div>
      <section id="search" className="relative z-20 -mt-20 flex min-h-[820px] scroll-mt-20 flex-col bg-brand-deep md:-mt-24 md:min-h-[900px] md:scroll-mt-24">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/destinations/The_best_of_south_tour.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-[1.02] object-cover object-center"
          />
          {/* Full-viewport photo moment, styled after discoveralbania.al's
              hero: a dark brand-ink scrim (not flat black) for legible white
              type, with the booking widget as this site's own focal point in
              place of their two CTA buttons. */}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,27,35,0.82)_0%,rgba(6,39,48,0.52)_34%,rgba(4,30,39,0.3)_58%,rgba(5,27,34,0.9)_100%)]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,transparent_0%,rgba(0,25,31,0.12)_48%,rgba(0,20,27,0.48)_100%)]" aria-hidden="true" />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-start px-4 pb-20 pt-40 text-center sm:px-6 sm:pt-44 md:pt-48">
          <ScrollReveal>
            <span className="public-kicker-dark">
              {dict.home.kicker}
            </span>
          </ScrollReveal>
          <ScrollReveal className="[animation-delay:80ms]">
            {/* Brand name, not translated content — matches the header/footer
                wordmark treatment, which keeps "Discover Albania Transport" as
                a fixed proper noun across locales. */}
            <h1 className="mt-7 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-0.035em] text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.3)] sm:text-7xl lg:text-[6.5rem]">
              <span className="block">Discover</span>
              <span className="block">Albania Transport</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-6 text-white/80 sm:text-base sm:leading-7">
              {dict.home.searchSubtitle}
            </p>
          </ScrollReveal>
          <ScrollReveal className="relative z-30 mt-10 w-full max-w-7xl [animation-delay:220ms]">
            <HeroBookingWidget
              cityOptions={cityOptions}
              popularCities={popularCities}
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

      <section className="relative z-10 border-b border-[var(--page-line)] bg-[var(--page-canvas)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[var(--page-line)] px-6 py-14 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-10 sm:py-20">
          {statItems.map(({ label, value, Icon, tone }) => (
            <div
              key={label}
              className="group flex flex-col items-center px-4 py-8 text-center first:pt-0 last:pb-0 sm:py-0"
            >
              <Icon
                width={22}
                height={22}
                className={`transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:-translate-y-0.5 ${STAT_TONE_CLASSES[tone].icon}`}
              />
              <p className="mt-5 font-display text-5xl font-black leading-none text-brand-navy tabular-nums sm:text-6xl">
                {value}
              </p>
              <span className={`mt-4 h-px w-8 ${STAT_TONE_CLASSES[tone].rule}`} aria-hidden="true" />
              <p className="mt-4 text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {popularRoutes.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.65fr)] lg:items-end lg:justify-between">
              <h2 className="max-w-xl font-display text-4xl font-black tracking-[-0.035em] text-brand-navy sm:text-5xl">
                {dict.home.popularRoutesTitle}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted lg:justify-self-end lg:text-right sm:text-base sm:leading-7">
                {dict.home.popularRoutesSubtitle}
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
              {popularRoutes[0] && (
                <Link
                  href={`/routes/${slugify(popularRoutes[0].fromCity)}/${slugify(popularRoutes[0].toCity)}`}
                  className="public-card-muted group relative flex min-h-[23rem] flex-col justify-between overflow-hidden p-7 transition-[border-color,box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-teal/30 hover:shadow-[var(--page-shadow)] sm:min-h-[26rem] sm:p-10"
                >
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/55"
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex min-h-8 items-center rounded-full bg-gold-soft px-3.5 text-[10px] font-black uppercase tracking-[0.12em] text-gold ring-1 ring-inset ring-gold/15">
                      {dict.home.mostPopular}
                    </span>
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-teal shadow-[var(--shadow-xs)] transition-[background-color,color,transform] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:bg-teal group-hover:text-white">
                      <ArrowRightIcon width={16} height={16} />
                    </span>
                  </div>

                  <div className="relative my-9">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                      <p className="min-w-0 break-words font-display text-3xl font-black leading-[1.05] tracking-[-0.03em] text-brand-navy sm:text-5xl">
                        {popularRoutes[0].fromCity}
                      </p>
                      <ArrowRightIcon width={20} height={20} className="shrink-0 text-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
                      <p className="min-w-0 break-words text-right font-display text-3xl font-black leading-[1.05] tracking-[-0.03em] text-brand-navy sm:text-5xl">
                        {popularRoutes[0].toCity}
                      </p>
                    </div>

                    <div className="mt-9 flex items-center" aria-hidden="true">
                      <span className="h-3 w-3 shrink-0 rounded-full bg-white ring-2 ring-teal" />
                      <span className="h-px flex-1 bg-teal/25" />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-teal shadow-[var(--shadow-sm)]">
                        <BusIcon width={18} height={18} />
                      </span>
                      <span className="h-px flex-1 bg-teal/25" />
                      <span className="h-3 w-3 shrink-0 rounded-full bg-teal ring-4 ring-white" />
                    </div>
                  </div>

                  <div className="border-t border-[var(--page-line)] pt-6">
                    <p className="text-sm font-medium text-muted sm:text-base">
                      <span className="mr-2 font-display text-3xl font-black leading-none tabular-nums text-brand-navy sm:text-4xl">
                        {popularRoutes[0].tripCount}
                      </span>
                      {popularRoutes[0].tripCount === 1 ? dict.home.scheduledDeparture : dict.home.scheduledDepartures}
                    </p>
                  </div>
                </Link>
              )}

              <div className="public-card overflow-hidden">
                {popularRoutes.slice(1).map((route) => (
                  <Link
                    key={`${route.fromCity}-${route.toCity}`}
                    href={`/routes/${slugify(route.fromCity)}/${slugify(route.toCity)}`}
                    className="group grid min-h-[5.8rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--page-line)] px-5 py-4 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] last:border-b-0 hover:bg-teal-soft/60 sm:gap-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-display text-lg font-bold tracking-[-0.02em] text-brand-navy sm:text-xl">
                        <span className="min-w-0 truncate">{route.fromCity}</span>
                        <ArrowRightIcon width={14} height={14} className="shrink-0 text-teal" />
                        <span className="min-w-0 truncate">{route.toCity}</span>
                      </p>
                      <p className="mt-1.5 text-xs font-medium leading-5 text-muted">
                        <span className="tabular-nums text-brand-navy">{route.tripCount}</span>{" "}
                        {route.tripCount === 1 ? dict.home.scheduledDeparture : dict.home.scheduledDepartures}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal transition-[background-color,color,transform] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:bg-teal group-hover:text-white">
                      <ArrowRightIcon width={15} height={15} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="public-card-muted mt-20 p-5 sm:p-9 lg:p-12">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-10 bg-coral" aria-hidden="true" />
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-coral">{dict.home.exploreTitle}</span>
                  </div>
                  <h2 className="mt-4 max-w-2xl font-display text-3xl font-black tracking-[-0.035em] text-brand-navy sm:text-5xl">{dict.home.popularDestinationsTitle}</h2>
                  <p className="mt-4 text-sm leading-6 text-muted sm:text-base">{dict.home.popularDestinationsSubtitle}</p>
                </div>
                <Link href="/destinations" className="public-primary-action group w-fit px-6 text-sm">
                  {dict.home.browseDestinations}
                  <ArrowRightIcon width={16} height={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="mt-10">
                <FeaturedDestinations places={featuredPlaces} photoCredit={dict.home.photoCredit} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#f4f8f7] px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-brand-deep shadow-[0_28px_70px_rgba(4,38,46,0.2)]">
          {/* A bold, contained card instead of an edge-to-edge banner — the
              one spotlighted moment on an otherwise neutral page, so the
              handoff to the sister brand reads as deliberate, not a strip. */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,var(--teal)_0%,transparent_68%)] opacity-30"
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12 lg:p-14">
            <div>
              <span className="public-kicker-dark">
                <CompassIcon width={13} height={13} />
                {dict.home.toursKicker}
              </span>
              <h2 className="mt-5 max-w-xl font-display text-3xl font-black text-white sm:text-4xl">
                {dict.home.toursHeading}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                {dict.home.toursBody}
              </p>
            </div>
            <a
              href="https://www.discoveralbania.al/tours"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lime px-7 py-3 font-bold text-brand-deep shadow-[0_14px_30px_rgba(180,220,91,0.2)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_38px_rgba(255,255,255,0.16)] active:translate-y-0 active:scale-[0.97]"
            >
              {dict.home.toursCta} <ArrowRightIcon width={16} height={16} />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
