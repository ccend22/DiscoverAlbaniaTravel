import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getDestinationById } from "@/db/queries/destinations";
import { getAllRoutePairs } from "@/db/queries/trips";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import { slugify } from "@/lib/slug";
import { getDestinationImage, normalizeDestinationName } from "@/lib/destination-images";
import { DESTINATION_IMAGE_CREDITS } from "@/lib/destination-image-credits";
import { ArrowRightIcon, BusIcon, CalendarIcon, MapPinIcon, TicketIcon } from "@/components/icons";
import type { Metadata } from "next";

interface DestinationDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DestinationDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const destination = await getDestinationById(Number(id));
  if (!destination) return { title: "Destination Not Found", robots: { index: false } };

  const description = destination.description.slice(0, 160);
  const image = getDestinationImage(destination.name);

  return {
    title: destination.name,
    description,
    alternates: { canonical: `/destinations/${destination.id}` },
    openGraph: {
      title: destination.name,
      description,
      url: `/destinations/${destination.id}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function DestinationDetailPage({ params }: DestinationDetailPageProps) {
  const { id } = await params;
  const [destination, { dict }, routePairs] = await Promise.all([
    getDestinationById(Number(id)),
    getLocaleAndDictionary(),
    getAllRoutePairs(),
  ]);
  if (!destination) notFound();
  const dd = dict.destinationDetail;
  const routesFromHere = routePairs
    .filter((pair) => pair.fromCity === destination.name)
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, 6);

  const image = getDestinationImage(destination.name);
  const imageCredit = DESTINATION_IMAGE_CREDITS[normalizeDestinationName(destination.name)];
  const weeklyDepartures = routesFromHere.reduce((sum, pair) => sum + pair.tripCount, 0);
  const pricedFares = routesFromHere
    .map((pair) => pair.minPrice)
    .filter((price): price is number => price !== null);
  const cheapestFare = pricedFares.length > 0 ? Math.min(...pricedFares) : null;

  const stats =
    routesFromHere.length > 0
      ? [
          { Icon: BusIcon, label: dd.statRoutesFromHere, value: String(routesFromHere.length), tone: "teal" as const },
          {
            Icon: TicketIcon,
            label: dict.routeDetail.statPrice,
            value: cheapestFare !== null ? `${Math.round(cheapestFare).toLocaleString("en-US")} ALL` : "—",
            tone: "gold" as const,
          },
          { Icon: CalendarIcon, label: dict.routeDetail.statFrequency, value: String(weeklyDepartures), tone: "sky" as const },
        ]
      : [];

  const TONE_CLASSES: Record<"teal" | "gold" | "sky", string> = {
    teal: "bg-teal-soft text-teal",
    gold: "bg-gold-soft text-gold",
    sky: "bg-sky-soft text-sky",
  };

  return (
    <div className="public-page">
      <section className={`relative isolate -mt-20 overflow-hidden pt-20 md:-mt-24 md:pt-24 ${image ? "" : "bg-[linear-gradient(180deg,#eaf5f4_0%,#f4f8f7_58%)]"}`}>
        {image && (
          <>
            <Image src={image} alt={`${destination.name}, Albania`} fill priority quality={90} sizes="100vw" className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,22,31,0.94)_0%,rgba(4,31,38,0.82)_45%,rgba(4,31,38,0.55)_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f4f8f7] to-transparent" aria-hidden="true" />
          </>
        )}

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 lg:px-8">
          <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-xs font-medium ${image ? "text-white/60" : "text-muted"}`}>
            <Link href="/" className={image ? "hover:text-lime" : "hover:text-teal"}>{dict.nav.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/destinations" className={image ? "hover:text-lime" : "hover:text-teal"}>{dd.allDestinations}</Link>
            <span aria-hidden="true">/</span>
            <span className={image ? "text-white/85" : "text-foreground/80"}>{destination.name}</span>
          </nav>

          <div className={`mt-6 animate-fade-up ${image ? "public-kicker-dark" : "public-kicker"}`}>
            <MapPinIcon width={15} height={15} />
            {dd.allDestinations}
          </div>
          <h1 className={`mt-5 font-display text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl ${image ? "text-white" : "text-brand-navy"}`}>
            {destination.name}
          </h1>
          <p className={`mt-5 max-w-2xl text-base leading-7 sm:text-lg ${image ? "text-white/70" : "text-muted"}`}>
            {destination.description}
          </p>

          <Link
            href={`/search?destination=${encodeURIComponent(destination.name)}`}
            className="public-primary-action mt-8 w-fit px-7"
          >
            {formatMessage(dd.findBusesTo, { name: destination.name })}
            <ArrowRightIcon width={16} height={16} />
          </Link>

          {imageCredit && (
            <a
              href={imageCredit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 block w-fit text-[11px] ${image ? "text-white/40 hover:text-white/70" : "text-muted hover:text-foreground"} transition-colors`}
            >
              Photo: {imageCredit.author} / Wikimedia Commons ({imageCredit.license})
            </a>
          )}
        </div>
      </section>

      <div className={`relative z-10 mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8 ${image ? "-mt-10" : "mt-2"}`}>
        {stats.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
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
        )}

        {routesFromHere.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-2xl font-black tracking-[-0.02em] text-brand-navy sm:text-3xl">
              {formatMessage(dd.busRoutesFrom, { name: destination.name })}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {routesFromHere.map((pair) => (
                <Link
                  key={`${pair.fromCity}-${pair.toCity}`}
                  href={`/routes/${slugify(pair.fromCity)}/${slugify(pair.toCity)}`}
                  className="public-card card-lift group flex items-center justify-between p-5 sm:p-6"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-brand-navy">
                    {pair.fromCity}
                    <ArrowRightIcon width={14} height={14} className="text-teal" />
                    {pair.toCity}
                  </span>
                  <ArrowRightIcon width={16} height={16} className="text-teal opacity-60 transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
