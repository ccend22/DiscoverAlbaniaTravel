import { notFound } from "next/navigation";
import Link from "next/link";
import { getDestinationById } from "@/db/queries/destinations";
import { getAllRoutePairs } from "@/db/queries/trips";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import { slugify } from "@/lib/slug";
import { ArrowRightIcon } from "@/components/icons";
import type { Metadata } from "next";

interface DestinationDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DestinationDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const destination = await getDestinationById(Number(id));
  if (!destination) return { title: "Destination Not Found", robots: { index: false } };

  return {
    title: destination.name,
    description: destination.description.slice(0, 160),
    alternates: { canonical: `/destinations/${destination.id}` },
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

  return (
    <div className="public-page mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <Link
        href="/destinations"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-teal"
      >
        <span className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:-translate-x-0.5">←</span>
        <span className="relative">
          {dd.allDestinations}
          <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
        </span>
      </Link>
      <article className="public-hero-panel mt-6 animate-fade-up p-7 sm:p-12">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime">{dd.allDestinations}</p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-[-0.04em] sm:text-6xl">{destination.name}</h1>
        <p className="mt-6 max-w-3xl leading-8 text-white/70">{destination.description}</p>
        <Link
          href={`/search?destination=${encodeURIComponent(destination.name)}`}
          className="mt-8 inline-flex min-h-14 w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lime px-7 font-bold text-brand-deep shadow-[0_14px_30px_rgba(180,220,91,0.2)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_38px_rgba(255,255,255,0.16)] active:translate-y-0 active:scale-[0.97]"
        >
          {formatMessage(dd.findBusesTo, { name: destination.name })}
        </Link>
      </article>

      {routesFromHere.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl font-black text-brand-navy">
            {formatMessage(dd.busRoutesFrom, { name: destination.name })}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {routesFromHere.map((pair) => (
              <Link
                key={`${pair.fromCity}-${pair.toCity}`}
                href={`/routes/${slugify(pair.fromCity)}/${slugify(pair.toCity)}`}
                className="public-card group flex items-center justify-between p-4 transition-[border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-teal/35"
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
  );
}
