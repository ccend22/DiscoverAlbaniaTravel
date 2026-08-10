import { listStationLocations } from "@/db/queries/stations";
import { StationsExplorer } from "@/components/stations-explorer";
import { BusIcon, MapPinIcon } from "@/components/icons";
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
      <section className="relative isolate -mt-20 overflow-hidden border-b border-[#dfe8eb] bg-[linear-gradient(180deg,#eaf5f4_0%,#f4f8f7_58%)] pt-20 md:-mt-24 md:pt-24">
        <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-teal/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:px-8">
          <div className="public-kicker mx-auto w-fit animate-fade-up">
            <MapPinIcon width={15} height={15} />
            {sp.kicker}
          </div>
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-black leading-[0.98] tracking-[-0.04em] text-brand-navy sm:text-6xl">
            {sp.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
            {formatMessage(sp.subtitleCount, { count: stations.length })}
          </p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-brand-navy shadow-sm">
            <BusIcon width={14} height={14} className="text-teal" />
            {cityCount} {sp.citiesConnected}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <StationsExplorer stations={stations} dict={dict} />
      </section>
    </div>
  );
}
