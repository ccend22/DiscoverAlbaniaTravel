"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Positions a sliding highlight behind the active item in a segmented
 * control by measuring the item's real DOM box, instead of assuming every
 * option is exactly 1/N of the container's width. Toggle labels are rarely
 * the same length ("Bus tickets" vs "Taxi"), so a fixed-percentage pill
 * drifts off the actual button and overlaps its neighbor.
 */
export function useSlidingIndicator(activeKey: string) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [style, setStyle] = useState<{ left: number; width: number } | null>(null);

  function registerRef(key: string) {
    return (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(key, el);
      else itemRefs.current.delete(key);
    };
  }

  useLayoutEffect(() => {
    function measure() {
      const el = itemRefs.current.get(activeKey);
      if (!el) return;
      setStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeKey]);

  return { registerRef, style };
}
