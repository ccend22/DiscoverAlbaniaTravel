import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, MapPinIcon } from "./icons";
import { getDestinationImage } from "@/lib/destination-images";

interface DestinationRow {
  id: number;
  name: string;
  description: string;
}

interface DestinationsGridProps {
  destinations: DestinationRow[];
  fallbackDescription: string;
}

export function DestinationsGrid({ destinations, fallbackDescription }: DestinationsGridProps) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((destination) => {
        const image = getDestinationImage(destination.name);
        return (
          <Link
            key={destination.id}
            href={`/destinations/${destination.id}`}
            className="public-card card-lift group flex flex-col overflow-hidden"
          >
            <div className="relative h-40 shrink-0 overflow-hidden">
              {image ? (
                <>
                  <Image
                    src={image}
                    alt={destination.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-soft to-white">
                  <MapPinIcon width={26} height={26} className="text-teal/35" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-black tracking-[-0.02em] text-brand-navy">
                  {destination.name}
                </h3>
                <ArrowRightIcon
                  width={16}
                  height={16}
                  className="mt-1.5 shrink-0 text-teal opacity-60 transition-all duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:opacity-100"
                />
              </div>
              <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted">
                {destination.description || fallbackDescription}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
