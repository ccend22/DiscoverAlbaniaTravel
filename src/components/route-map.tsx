"use client";

import dynamic from "next/dynamic";
import type { RouteMapProps, RouteSegment } from "./route-map-inner";

export type { RouteMapProps, RouteSegment };

const RouteMapInner = dynamic(() => import("./route-map-inner").then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[50vh] min-h-[320px] w-full items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
      Loading map…
    </div>
  ),
});

export function RouteMap(props: RouteMapProps) {
  return <RouteMapInner {...props} />;
}
