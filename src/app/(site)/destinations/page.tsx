import Link from "next/link";
import { listDestinations } from "@/db/queries/destinations";
import { ArrowRightIcon, MapPinIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const CARD_ACCENTS = [
  { icon: "text-teal", hoverBorder: "hover:border-teal", hoverBg: "hover:bg-teal-soft/40" },
  { icon: "text-coral", hoverBorder: "hover:border-coral", hoverBg: "hover:bg-coral-soft/40" },
  { icon: "text-gold", hoverBorder: "hover:border-gold", hoverBg: "hover:bg-gold-soft/40" },
  { icon: "text-sky", hoverBorder: "hover:border-sky", hoverBg: "hover:bg-sky-soft/40" },
] as const;

export default async function DestinationsPage() {
  const [destinations, { dict }] = await Promise.all([listDestinations(), getLocaleAndDictionary()]);
  const dp = dict.destinationsPage;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{dp.kicker}</p>
      <h1 className="mt-2 animate-fade-up font-display text-3xl font-bold [animation-delay:60ms]">{dp.title}</h1>
      <p className="mt-2 max-w-2xl animate-fade-up text-muted [animation-delay:120ms]">{dp.subtitle}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {destinations.map((destination, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
          return (
            <Link
              key={destination.id}
              href={`/destinations/${destination.id}`}
              className={`card-lift group rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] ${accent.hoverBorder} ${accent.hoverBg}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <MapPinIcon width={17} height={17} className={`transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:scale-110 ${accent.icon}`} />
                  {destination.name}
                </h2>
                <ArrowRightIcon width={17} height={17} className={`shrink-0 opacity-50 transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:opacity-100 ${accent.icon}`} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{destination.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
