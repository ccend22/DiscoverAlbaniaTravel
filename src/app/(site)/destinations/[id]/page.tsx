import { notFound } from "next/navigation";
import Link from "next/link";
import { getDestinationById } from "@/db/queries/destinations";
import { LinkButton } from "@/components/ui/button";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
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
  const destination = await getDestinationById(Number(id));
  if (!destination) notFound();
  const { dict } = await getLocaleAndDictionary();
  const dd = dict.destinationDetail;

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
        <LinkButton href={`/search?destination=${encodeURIComponent(destination.name)}`} className="mt-8 bg-lime text-brand-deep hover:bg-white">
          {formatMessage(dd.findBusesTo, { name: destination.name })}
        </LinkButton>
      </article>
    </div>
  );
}
