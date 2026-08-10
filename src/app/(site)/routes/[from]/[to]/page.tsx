import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAllRoutePairs, searchTripDepartures } from "@/db/queries/trips";
import { TripResultCard } from "@/components/trip-result-card";
import { ArrowRightIcon, BusIcon, ClockIcon, CalendarIcon, BuildingIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import { slugify } from "@/lib/slug";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import type { Metadata } from "next";

interface RouteDetailPageProps {
  params: Promise<{ from: string; to: string }>;
}

async function resolvePair(fromSlug: string, toSlug: string) {
  const pairs = await getAllRoutePairs();
  return pairs.find((pair) => slugify(pair.fromCity) === fromSlug && slugify(pair.toCity) === toSlug) ?? null;
}

export async function generateMetadata({ params }: RouteDetailPageProps): Promise<Metadata> {
  const { from, to } = await params;
  const pair = await resolvePair(from, to);
  if (!pair) return { title: "Route Not Found", robots: { index: false } };

  const title = `${pair.fromCity} to ${pair.toCity} Bus Tickets — Schedule & Prices`;
  const priceClause =
    pair.minPrice === null
      ? "no online payment available"
      : `tickets from ${Math.round(pair.minPrice).toLocaleString("en-US")} ALL`;
  const description = `Compare ${pair.tripCount} weekly departures from ${pair.fromCity} to ${pair.toCity}. ${priceClause[0].toUpperCase()}${priceClause.slice(1)}, ${pair.minDurationMin}–${pair.maxDurationMin} min journey, run by ${pair.operatorCount} operator${pair.operatorCount === 1 ? "" : "s"}.`;

  return {
    title,
    description,
    alternates: { canonical: `/routes/${from}/${to}` },
    openGraph: { title, description, url: `/routes/${from}/${to}` },
  };
}

export default async function RouteDetailPage({ params }: RouteDetailPageProps) {
  const { from, to } = await params;
  const pair = await resolvePair(from, to);
  if (!pair) notFound();

  const { locale, dict } = await getLocaleAndDictionary();
  const rd = dict.routeDetail;
  const today = getAlbaniaDateInputValue();

  const todayOutcome = await searchTripDepartures(pair.fromCity, pair.toCity, today);
  const todayTrips = todayOutcome.results.slice(0, 4);

  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: rd.breadcrumbHome, item: baseUrl },
      { "@type": "ListItem", position: 2, name: rd.allRoutes, item: `${baseUrl}/routes` },
      { "@type": "ListItem", position: 3, name: `${pair.fromCity} → ${pair.toCity}`, item: `${baseUrl}/routes/${from}/${to}` },
    ],
  };

  const subtitle = formatMessage(pair.operatorCount === 1 ? rd.subtitleOne : rd.subtitleMany, {
    from: pair.fromCity,
    to: pair.toCity,
    count: pair.operatorCount,
  });

  const stats = [
    {
      Icon: BusIcon,
      label: rd.statPrice,
      value:
        pair.minPrice === null || pair.maxPrice === null
          ? rd.priceRangeUnavailable
          : formatMessage(rd.priceRange, {
              min: Math.round(pair.minPrice).toLocaleString("en-US"),
              max: Math.round(pair.maxPrice).toLocaleString("en-US"),
            }),
      tone: "teal" as const,
    },
    {
      Icon: ClockIcon,
      label: rd.statDuration,
      value: formatMessage(rd.durationRange, { min: pair.minDurationMin, max: pair.maxDurationMin }),
      tone: "gold" as const,
    },
    { Icon: CalendarIcon, label: rd.statFrequency, value: String(pair.tripCount), tone: "sky" as const },
    { Icon: BuildingIcon, label: rd.statOperators, value: String(pair.operatorCount), tone: "coral" as const },
  ];

  const TONE_CLASSES: Record<"teal" | "gold" | "sky" | "coral", string> = {
    teal: "bg-teal-soft text-teal",
    gold: "bg-gold-soft text-gold",
    sky: "bg-sky-soft text-sky",
    coral: "bg-coral-soft text-coral",
  };

  return (
    <div className="public-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="relative isolate -mt-20 overflow-hidden pt-20 md:-mt-24 md:pt-24">
        <Image
          src="/images/destinations/durres.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,22,31,0.94)_0%,rgba(4,31,38,0.86)_45%,rgba(4,31,38,0.68)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f4f8f7] to-transparent" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pb-28 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/60">
            <Link href="/" className="hover:text-lime">{rd.breadcrumbHome}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/routes" className="hover:text-lime">{rd.allRoutes}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/85">{pair.fromCity} → {pair.toCity}</span>
          </nav>

          <div className="public-kicker-dark mt-6 animate-fade-up">
            <BusIcon width={15} height={15} />
            {rd.kicker}
          </div>
          <h1 className="mt-5 font-display text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl">
            {pair.fromCity} <ArrowRightIcon width={30} height={30} className="inline-block -translate-y-1 text-lime" /> {pair.toCity}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">{subtitle}</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={`/search?origin=${encodeURIComponent(pair.fromCity)}&destination=${encodeURIComponent(pair.toCity)}&date=${today}`}
              className="group inline-flex h-14 w-fit items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-brand-navy shadow-[0_14px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)]"
            >
              {rd.searchCta}
              <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href={`/routes/${slugify(pair.toCity)}/${slugify(pair.fromCity)}`} className="group text-sm font-medium text-white/70 hover:text-lime">
              {rd.reverseRouteCta}{" "}
              <span className="relative text-lime">
                {formatMessage(rd.reverseRouteLink, { from: pair.fromCity, to: pair.toCity })}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-lime transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ Icon, label, value, tone }) => (
            <div key={label} className="public-card px-4 py-5 text-center">
              <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
                <Icon width={16} height={16} />
              </span>
              <p className="mt-2 text-sm font-bold text-brand-navy">{value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-black tracking-[-0.02em] text-brand-navy sm:text-3xl">{rd.todaySchedule}</h2>
          {todayTrips.length > 0 ? (
            <div className="mt-6 flex flex-col gap-3">
              {todayTrips.map((trip) => (
                <TripResultCard key={trip.tripDepartureId} trip={trip} travelDate={today} dict={dict} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="public-card mt-6 p-6 text-center text-sm text-muted">{rd.noDeparturesToday}</p>
          )}
        </div>
      </div>
    </div>
  );
}
