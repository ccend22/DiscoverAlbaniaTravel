import Link from "next/link";
import { SearchWidget } from "@/components/search-widget";
import { AlbaniaMapVisual } from "@/components/albania-map-visual";
import { FeaturedDestinations, type FeaturedPlace } from "@/components/featured-destinations";
import { ScrollReveal } from "@/components/scroll-reveal";
import { LinkButton } from "@/components/ui/button";
import { ArrowRightIcon, BuildingIcon, MapPinIcon, BusIcon } from "@/components/icons";
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
  const featuredPlaces: FeaturedPlace[] = FEATURED_PLACE_META.map((place) => ({
    ...place,
    tagline: dict.places[place.name as keyof typeof dict.places].tagline,
    destinationId: featuredDestinationRows.find((row) => row.name === place.name)?.id,
  }));

  const statItems = [
    { label: dict.home.statOperators, value: stats.operatorCount, Icon: BuildingIcon, color: "teal" as const },
    { label: dict.home.statStations, value: stats.stationCount, Icon: MapPinIcon, color: "coral" as const },
    { label: dict.home.statRoutes, value: stats.routeCount, Icon: BusIcon, color: "gold" as const },
  ];

  const routeAccents: AccentColor[] = ["teal", "coral", "gold", "sky"];

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(255,255,255,0.1),transparent)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
          <div>
            <ScrollReveal>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/62">
                {dict.home.kicker}
              </p>
            </ScrollReveal>
            <ScrollReveal className="[animation-delay:80ms]">
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {dict.home.title}
              </h1>
            </ScrollReveal>
            <ScrollReveal className="[animation-delay:160ms]">
              <p className="mt-4 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
                {dict.home.subtitle}
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal className="hidden justify-self-end [animation-delay:220ms] lg:block">
            <AlbaniaMapVisual className="h-auto w-full max-w-[280px] text-white/65 drop-shadow-[0_20px_45px_rgba(0,0,0,0.35)]" />
          </ScrollReveal>
        </div>
      </section>

      <section className="relative border-b border-border">
        <div className="mx-auto -mt-8 max-w-7xl px-4 pb-10 sm:px-6">
          <SearchWidget cityOptions={cityOptions} originToDestinations={originToDestinations} dict={dict} locale={locale} />
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
          <h2 className="font-display text-xl font-bold text-foreground">
            {dict.home.popularRoutesTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
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
            <h2 className="font-display text-xl font-bold text-foreground">{dict.home.popularDestinationsTitle}</h2>
            <p className="mt-1 text-sm text-muted">{dict.home.popularDestinationsSubtitle}</p>
            <div className="mt-6">
              <FeaturedDestinations places={featuredPlaces} photoCredit={dict.home.photoCredit} />
            </div>
          </div>
        </section>
      )}

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
          <h2 className="font-display text-xl font-bold text-foreground">
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
