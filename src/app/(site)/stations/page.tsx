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
    <div className="overflow-hidden bg-[#f4f7f8] text-foreground">
      <section className="relative isolate min-h-[560px] border-b border-[#dbe8eb] bg-[linear-gradient(135deg,#e8f6f7_0%,#f6fbfc_48%,#eaf5fa_100%)]">
        <div className="absolute -left-32 top-8 h-80 w-80 rounded-full bg-cyan/15 blur-3xl" aria-hidden="true" />
        <div className="absolute right-[5%] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-lime/20 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f4f7f8] to-transparent" aria-hidden="true" />

        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="relative z-10 max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky shadow-[0_8px_24px_rgba(43,127,168,0.1)]">
              <MapPinIcon width={15} height={15} />
              {sp.kicker}
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] text-brand-navy sm:text-6xl lg:text-7xl">
              {sp.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {formatMessage(sp.subtitleCount, { count: stations.length })}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#stations-map"
                className="group inline-flex min-h-13 items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(46,59,85,0.24)] transition-all duration-300 hover:-translate-y-1 hover:bg-brand-deep hover:shadow-[0_20px_42px_rgba(46,59,85,0.32)]"
              >
                {sp.exploreMap}
                <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <div className="flex items-center gap-3 rounded-full border border-white bg-white px-5 py-3 shadow-[0_10px_30px_rgba(7,52,60,0.1)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-lime-foreground">
                  <BusIcon width={16} height={16} />
                </span>
                <span className="text-sm font-bold text-brand-navy">{cityCount} {sp.citiesConnected}</span>
              </div>
            </div>
          </div>

          <div className="relative hidden h-[500px] items-center justify-center lg:flex" aria-hidden="true">
            <div className="absolute h-[410px] w-[410px] rounded-full border border-white bg-white/55 shadow-[0_30px_80px_rgba(7,52,60,0.12),inset_0_1px_0_white] backdrop-blur-xl" />
            <div className="absolute h-[330px] w-[330px] rounded-full border border-teal/10" />
            <AlbaniaMapVisual className="relative h-[470px] w-auto text-teal drop-shadow-[0_24px_36px_rgba(0,128,128,0.18)]" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <StationsExplorer stations={stations} dict={dict} />
      </section>
    </div>
  );
}
