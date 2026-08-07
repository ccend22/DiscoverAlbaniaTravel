import { listStationLocations } from "@/db/queries/stations";
import { StationsExplorer } from "@/components/stations-explorer";
import { AlbaniaMapVisual } from "@/components/albania-map-visual";
import { ArrowRightIcon, BusIcon, MapPinIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/dictionary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bus Stations",
  description: "Find bus stations across Albania and start a route search from the interactive station map.",
  alternates: { canonical: "/stations" },
};

export default async function StationsPage() {
  const [stations, { dict }] = await Promise.all([listStationLocations(), getLocaleAndDictionary()]);
  const sp = dict.stationsPage;
  const cityCount = new Set(stations.map((station) => station.city.trim().toLocaleLowerCase())).size;

  return (
    <div className="public-page">
      <section className="relative isolate -mt-20 min-h-[640px] overflow-hidden border-b border-[#18363d] bg-brand-deep pt-20 text-white md:-mt-24 md:pt-24">
        <div className="absolute -left-32 top-8 h-80 w-80 rounded-full bg-teal/20 blur-3xl" aria-hidden="true" />
        <div className="absolute right-[5%] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-lime/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f4f8f7] to-transparent" aria-hidden="true" />

        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="relative z-10 max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime">
              <MapPinIcon width={15} height={15} />
              {sp.kicker}
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              {sp.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
              {formatMessage(sp.subtitleCount, { count: stations.length })}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#stations-map"
                className="public-primary-action group px-6 py-3 text-sm"
              >
                {sp.exploreMap}
                <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-lime-foreground">
                  <BusIcon width={16} height={16} />
                </span>
                <span className="text-sm font-bold text-white">{cityCount} {sp.citiesConnected}</span>
              </div>
            </div>
          </div>

          <div className="relative hidden h-[500px] items-center justify-center lg:flex" aria-hidden="true">
            <div className="absolute h-[410px] w-[410px] rounded-full border border-white/10 bg-white/[0.04]" />
            <div className="absolute h-[330px] w-[330px] rounded-full border border-lime/15" />
            <AlbaniaMapVisual className="relative h-[470px] w-auto text-teal drop-shadow-[0_24px_36px_rgba(0,128,128,0.3)]" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <StationsExplorer stations={stations} dict={dict} />
      </section>
    </div>
  );
}
