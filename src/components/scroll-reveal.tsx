"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fades content up into place the first time it scrolls into view, reusing
 * the site's existing `animate-fade-up` keyframe (and its reduced-motion
 * handling in globals.css) instead of firing on mount. Pass a Tailwind
 * arbitrary `[animation-delay:Xms]` in className for a staggered cascade,
 * same convention as the rest of the codebase's mount-triggered fade-ups.
 */
export function ScrollReveal({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${visible ? "animate-fade-up" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}
