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
import { slugify } from "@/lib/slug";

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
    { label: dict.home.statOperators, value: stats.operatorCount, Icon: BuildingIcon },
    { label: dict.home.statStations, value: stats.stationCount, Icon: MapPinIcon },
    { label: dict.home.statRoutes, value: stats.routeCount, Icon: BusIcon },
  ];

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
            <span className="inline-flex rounded-full border border-white/25 bg-brand-deep/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-lime shadow-lg backdrop-blur-md">
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

      <section className="relative z-10 border-b border-border bg-[#f4f8f7]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-3 sm:px-6 sm:py-12">
          {statItems.map(({ label, value, Icon }) => {
            return (
              <div
                key={label}
                className="public-card card-lift group relative overflow-hidden px-6 py-7 text-left hover:border-teal/30"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-soft text-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:scale-105">
                    <Icon width={20} height={20} />
                  </span>
                  <div>
                    <p className="font-display text-3xl font-black leading-none text-brand-navy">{value}</p>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {popularRoutes.length > 0 && (
        <section className="relative overflow-hidden bg-white py-16 sm:py-20">
          <div
            className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-teal-soft opacity-70 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-teal">{dict.home.searchKicker}</span>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
                {dict.home.popularRoutesTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{dict.home.popularRoutesSubtitle}</p>
            </div>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularRoutes.map((route) => {
              return (
                <Link
                  key={`${route.fromCity}-${route.toCity}`}
                  href={`/routes/${slugify(route.fromCity)}/${slugify(route.toCity)}`}
                  className="public-card group flex min-h-28 items-center justify-between p-5 transition-[border-color,box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-teal/35"
                >
                  <div>
                    <p className="flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                      {route.fromCity}
                      <ArrowRightIcon width={16} height={16} className="text-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
                      {route.toCity}
                    </p>
                    <p className="mt-2 text-xs font-medium text-muted">
                      {route.tripCount} {route.tripCount === 1 ? dict.home.scheduledDeparture : dict.home.scheduledDepartures}
                    </p>
                  </div>
                  <ArrowRightIcon
                    width={18}
                    height={18}
                    className="text-teal opacity-60 transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </Link>
              );
            })}
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
              <Link href="/destinations" className="group inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-teal px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,128,128,0.2)] transition hover:-translate-y-1 hover:bg-brand-strong">
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
          <CompassIcon
            aria-hidden="true"
            strokeWidth={1}
            className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 text-white opacity-[0.08] sm:h-72 sm:w-72"
          />

          <div className="relative flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12 lg:p-14">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-lime">
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
