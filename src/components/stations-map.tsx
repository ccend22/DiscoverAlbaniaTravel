"use client";

import dynamic from "next/dynamic";
import type { StationsMapProps, StationSelection } from "./stations-map-inner";

export type { StationsMapProps, StationSelection };

const StationsMapInner = dynamic(
  () => import("./stations-map-inner").then((mod) => mod.StationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] min-h-[420px] w-full items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Loading map…
      </div>
    ),
  }
);

export function StationsMap(props: StationsMapProps) {
  return <StationsMapInner {...props} />;
}
