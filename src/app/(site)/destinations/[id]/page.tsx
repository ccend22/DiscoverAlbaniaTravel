import { notFound } from "next/navigation";
import Link from "next/link";
import { getDestinationById } from "@/db/queries/destinations";
import { LinkButton } from "@/components/ui/button";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";

interface DestinationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DestinationDetailPage({ params }: DestinationDetailPageProps) {
  const { id } = await params;
  const destination = await getDestinationById(Number(id));
  if (!destination) notFound();
  const { dict } = await getLocaleAndDictionary();
  const dd = dict.destinationDetail;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
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
      <h1 className="mt-4 animate-fade-up font-display text-3xl font-bold">{destination.name}</h1>
      <p className="mt-4 animate-fade-up leading-relaxed text-foreground/90 [animation-delay:60ms]">{destination.description}</p>
      <LinkButton
        href={`/search?destination=${encodeURIComponent(destination.name)}`}
        className="mt-8 animate-fade-up [animation-delay:120ms]"
      >
        {formatMessage(dd.findBusesTo, { name: destination.name })}
      </LinkButton>
    </div>
  );
}
