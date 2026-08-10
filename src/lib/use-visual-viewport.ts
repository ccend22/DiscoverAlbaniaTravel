"use client";

import { useEffect, useState } from "react";

export interface VisualViewportRect {
  top: number;
  height: number;
  keyboardOpen: boolean;
}

/**
 * Tracks the part of a mobile browser that is actually visible. Unlike
 * `100vh`, VisualViewport shrinks when the iOS/Android keyboard opens.
 */
export function useVisualViewport(active: boolean): VisualViewportRect | null {
  const [rect, setRect] = useState<VisualViewportRect | null>(null);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const height = viewport?.height ?? window.innerHeight;
        const layoutHeight = document.documentElement.clientHeight;
        setRect({
          top: viewport?.offsetTop ?? 0,
          height,
          keyboardOpen: height < layoutHeight * 0.78,
        });
      });
    }

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [active]);

  return active ? rect : null;
}
