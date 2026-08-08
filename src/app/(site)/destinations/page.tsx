import Image from "next/image";
import Link from "next/link";
import { listDestinations } from "@/db/queries/destinations";
import { ArrowRightIcon, BusIcon, CompassIcon, MapPinIcon } from "@/components/icons";
import { DestinationsGrid } from "@/components/destinations-grid";
import { getLocaleAndDictionary } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Explore destinations across Albania and find intercity bus connections for your trip.",
  alternates: { canonical: "/destinations" },
};

const DESTINATION_IMAGES: Record<string, string> = {
  berat: "/images/destinations/berat.jpg",
  durres: "/images/destinations/durres.jpg",
  sarande: "/images/destinations/sarande.jpg",
  shkoder: "/images/destinations/shkoder.jpg",
  tirane: "/images/destinations/tirana.jpg",
  vlore: "/images/destinations/vlore.jpg",
};

function normalizeDestinationName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default async function DestinationsPage() {
  const [destinations, { dict }] = await Promise.all([listDestinations(), getLocaleAndDictionary()]);
  const dp = dict.destinationsPage;
  const featured = destinations
    .filter((destination) => DESTINATION_IMAGES[normalizeDestinationName(destination.name)])
    .slice(0, 6);

  return (
    <div className="public-page">
      <section className="relative isolate -mt-20 min-h-[640px] overflow-hidden pt-20 sm:min-h-[700px] md:-mt-24 md:pt-24">
        <Image
          src="/images/destinations/sarande.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,22,31,0.92)_0%,rgba(4,31,38,0.72)_43%,rgba(4,31,38,0.18)_72%,rgba(4,31,38,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,22,31,0.7)_0%,transparent_42%)]" />
        <div className="absolute -left-24 bottom-[-12rem] h-96 w-96 rounded-full bg-teal/25 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-16 sm:min-h-[620px] sm:px-6 lg:px-8">
          <div className="max-w-3xl animate-fade-up text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur-md">
              <CompassIcon width={15} height={15} className="text-lime" />
              {dp.kicker}
            </div>
            <h1 className="mt-6 max-w-2xl font-display text-5xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl lg:text-8xl">
              {dp.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">{dp.heroSubtitle}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#all-destinations"
                className="group inline-flex h-14 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-brand-navy shadow-[0_14px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)]"
              >
                {dp.exploreAll}
                <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <div className="inline-flex h-14 items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
                  <BusIcon width={16} height={16} />
                </span>
                {destinations.length} {dp.connectedPlaces}
              </div>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">{dp.featuredKicker}</p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-black tracking-[-0.03em] text-brand-navy sm:text-5xl">
                {dp.featuredTitle}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-muted sm:text-right">{dp.featuredSubtitle}</p>
          </div>

          <div className="grid auto-rows-[240px] gap-4 md:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[260px]">
            {featured.map((destination, index) => {
              const image = DESTINATION_IMAGES[normalizeDestinationName(destination.name)];
              const layout =
                index === 0
                  ? "md:col-span-2 lg:col-span-7 lg:row-span-2"
                  : index === 1 || index === 2
                    ? "lg:col-span-5"
                    : "lg:col-span-4";
              return (
                <Link
                  key={destination.id}
                  href={`/destinations/${destination.id}`}
                  className={`group relative isolate overflow-hidden rounded-[2rem] bg-brand-deep shadow-[0_18px_45px_rgba(7,35,43,0.16)] ${layout}`}
                >
                  <Image
                    src={image}
                    alt={destination.name}
                    fill
                    sizes={index === 0 ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw"}
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/95 via-brand-deep/18 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                    <div className="min-w-0">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-lime">
                        <MapPinIcon width={13} height={13} />
                        {dp.connectedByBus}
                      </p>
                      <h3 className={`font-display font-black tracking-[-0.03em] text-white ${index === 0 ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
                        {destination.name}
                      </h3>
                      {index === 0 && destination.description && (
                        <p className="mt-3 hidden max-w-xl line-clamp-2 text-sm leading-6 text-white/70 sm:block">
                          {destination.description}
                        </p>
                      )}
                    </div>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy shadow-lg transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:scale-110">
                      <ArrowRightIcon width={18} height={18} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section id="all-destinations" className="scroll-mt-24 border-t border-[#dfe8eb] bg-[#f4f8f7] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">{dp.directoryKicker}</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.03em] text-brand-navy sm:text-5xl">{dp.title}</h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted">{dp.subtitle}</p>
          </div>

          <DestinationsGrid destinations={destinations} fallbackDescription={dp.fallbackDescription} loadMoreLabel={dp.loadMore} />
        </div>
      </section>
    </div>
  );
}
