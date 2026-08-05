"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a max-width media query. Starts `false` on both server and first
 * client render (so hydration always matches) and flips after mount — this
 * is what lets touch-only components (bottom sheets, full-screen pickers)
 * diverge from the desktop popover/dropdown layout without a hydration
 * warning.
 */
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
