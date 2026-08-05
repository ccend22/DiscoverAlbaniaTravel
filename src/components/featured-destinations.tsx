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
}

export function FeaturedDestinations({ places, photoCredit }: { places: FeaturedPlace[]; photoCredit: string }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {places.map((place) => (
          <Link
            key={place.name}
            href={place.destinationId ? `/destinations/${place.destinationId}` : "/destinations"}
            className="group relative aspect-[3/4] overflow-hidden rounded-lg shadow-[var(--shadow-sm)] sm:aspect-[4/5]"
          >
            <Image
              src={place.image}
              alt={place.name}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent transition-opacity duration-[var(--dur-base)] group-hover:from-black/90" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-3 sm:p-4">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] shadow-[var(--shadow-xs)] ${TAGLINE_STYLES[place.tone]}`}>
                {place.tagline}
              </span>
              <p className="font-display text-lg font-bold text-white sm:text-xl">{place.name}</p>
            </div>
            <span className="absolute right-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowRightIcon width={16} height={16} />
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">{photoCredit}</p>
    </div>
  );
}
