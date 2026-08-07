import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export type FeaturedPlaceTone = "teal" | "coral" | "gold" | "sky";

const CARD_LAYOUTS = [
  "col-span-2 min-h-[390px] md:col-span-7 md:row-span-2 md:min-h-[540px]",
  "col-span-2 min-h-[340px] md:col-span-5 md:row-span-2 md:min-h-[540px]",
  "col-span-1 min-h-[300px] md:col-span-3 md:min-h-[330px]",
  "col-span-1 min-h-[300px] md:col-span-3 md:min-h-[330px]",
  "col-span-1 min-h-[300px] md:col-span-3 md:min-h-[330px]",
  "col-span-1 min-h-[300px] md:col-span-3 md:min-h-[330px]",
];

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
      <div className="grid grid-cols-2 gap-4 md:auto-rows-[165px] md:grid-cols-12">
        {places.map((place, index) => (
          <Link
            key={place.name}
            href={place.destinationId ? `/destinations/${place.destinationId}` : "/destinations"}
            className={`public-card group flex h-full flex-col overflow-hidden transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-teal/25 hover:shadow-[0_24px_52px_rgba(5,43,52,0.14)] ${CARD_LAYOUTS[index] ?? CARD_LAYOUTS[5]}`}
          >
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <Image
                src={place.image}
                alt={place.name}
                fill
                sizes={index < 2 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out-expo)] group-hover:scale-105"
              />
            </div>

            <div className="flex shrink-0 items-end justify-between gap-3 bg-white p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal">{place.tagline}</p>
                <p className="mt-1.5 font-display text-xl font-black text-brand-navy sm:text-2xl">{place.name}</p>
                {place.description && index < 2 && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted sm:text-sm">{place.description}</p>
                )}
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal transition-all duration-[var(--dur-base)] group-hover:bg-teal group-hover:text-white">
                <ArrowRightIcon width={15} height={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">{photoCredit}</p>
    </div>
  );
}
