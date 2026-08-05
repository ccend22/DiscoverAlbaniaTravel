import { listStationLocations } from "@/db/queries/stations";
import { StationsExplorer } from "@/components/stations-explorer";
import { MapPinIcon } from "@/components/icons";
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex animate-fade-up items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky shadow-[var(--shadow-xs)]">
          <MapPinIcon width={18} height={18} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-sky">{sp.kicker}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{sp.title}</h1>
        </div>
      </div>
      <p className="mt-3 animate-fade-up text-muted [animation-delay:120ms]">
        {formatMessage(sp.subtitleCount, { count: stations.length })}
      </p>
      <div className="mt-8">
        <StationsExplorer stations={stations} dict={dict} />
      </div>
    </div>
  );
}
