import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export type FeaturedPlaceTone = "teal" | "coral" | "gold" | "sky";

// Complete literal classes, keyed by tone — Tailwind's scanner can't resolve
// `bg-${tone}` template interpolation, so each full string must appear as-is.
const TAGLINE_STYLES: Record<FeaturedPlaceTone, string> = {
  teal: "bg-teal/90 text-white",
  coral: "bg-coral/90 text-white",
  gold: "bg-gold/90 text-white",
  sky: "bg-sky/90 text-white",
};

export interface FeaturedPlace {
  name: string;
  tagline: string;
  image: string;
  tone: FeaturedPlaceTone;
  destinationId?: number;
  description?: string;
}

export function FeaturedDestinations({ places, photoCredit }: { places: FeaturedPlace[]; photoCredit: string }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {places.map((place) => (
          <Link
            key={place.name}
            href={place.destinationId ? `/destinations/${place.destinationId}` : "/destinations"}
            className="card-lift group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]"
          >
            <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
              <Image
                src={place.image}
                alt={place.name}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out-expo)] group-hover:scale-105"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 sm:p-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] shadow-[var(--shadow-xs)] ${TAGLINE_STYLES[place.tone]}`}>
                  {place.tagline}
                </span>
                <span className="flex h-7 w-7 translate-y-1 items-center justify-center rounded-full bg-white/85 text-foreground opacity-0 shadow-[var(--shadow-xs)] backdrop-blur-sm transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100 sm:hidden sm:group-hover:flex">
                  <ArrowRightIcon width={14} height={14} />
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
              <p className="font-display text-base font-bold text-foreground sm:text-lg">{place.name}</p>
              {place.description && (
                <p className="line-clamp-2 text-xs text-muted sm:text-sm">{place.description}</p>
              )}
              <div className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-teal">
                View destination
                <ArrowRightIcon width={13} height={13} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">{photoCredit}</p>
    </div>
  );
}
