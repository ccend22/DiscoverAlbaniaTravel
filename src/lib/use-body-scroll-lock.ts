"use client";

import { useEffect } from "react";

/**
 * Locks background scroll while a full-screen sheet/drawer overlay is open.
 *
 * `overflow: hidden` on <body> alone doesn't fully stop iOS Safari from
 * rubber-banding the page behind a fixed overlay. When that happens, a tap
 * meant to close the sheet (backdrop, close button) can drift a few pixels
 * and get reinterpreted as the start of a scroll gesture instead of a tap —
 * its click never fires, so the sheet silently fails to close. Pinning the
 * body at its current scroll offset removes any background surface left to
 * scroll, so taps on the overlay stay taps.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
