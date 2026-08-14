import Image from "next/image";
import { getAllRoutePairs } from "@/db/queries/trips";
import { RoutesGrid } from "@/components/routes-grid";
import { ArrowRightIcon, BusIcon, MapPinIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Bus Routes",
  description: "Browse every scheduled bus itinerary across Albania, with live prices, journey times, and weekly departure counts.",
  alternates: { canonical: "/routes" },
};

export default async function RoutesPage() {
  const [pairs, { dict }] = await Promise.all([getAllRoutePairs(), getLocaleAndDictionary()]);
  const rp = dict.routesPage;
  const cityCount = new Set(pairs.flatMap((pair) => [pair.fromCity, pair.toCity])).size;

  return (
    <div className="public-page">
      <section className="relative isolate -mt-20 min-h-[560px] overflow-hidden pt-20 md:-mt-24 md:pt-24">
        <Image
          src="/images/destinations/durres.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,22,31,0.92)_0%,rgba(4,31,38,0.72)_43%,rgba(4,31,38,0.18)_72%,rgba(4,31,38,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,22,31,0.7)_0%,transparent_42%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f4f8f7] to-transparent" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[480px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl animate-fade-up">
            <div className="public-kicker-dark">
              <BusIcon width={15} height={15} />
              {rp.kicker}
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              {rp.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">{rp.subtitle}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#all-routes"
                className="group inline-flex h-14 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-brand-navy shadow-[0_14px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)]"
              >
                {rp.exploreCta}
                <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <div className="flex h-14 items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 backdrop-blur-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
                  <MapPinIcon width={16} height={16} />
                </span>
                <span className="text-sm font-bold text-white">{cityCount} {rp.citiesConnected}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="all-routes" className="relative z-10 mx-auto -mt-10 max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-6 lg:px-8">
        <RoutesGrid
          pairs={pairs}
          dict={{
            searchLabel: rp.searchLabel,
            filterPlaceholder: rp.filterPlaceholder,
            clearFilterAria: rp.clearFilterAria,
            tripsPerWeek: rp.tripsPerWeek,
            priceFrom: rp.priceFrom,
            priceUnavailable: dict.common.priceUnavailable,
            viewRoute: rp.viewRoute,
            loadMore: rp.loadMore,
            noRoutesMatch: rp.noRoutesMatch,
          }}
        />
      </section>
    </div>
  );
}
