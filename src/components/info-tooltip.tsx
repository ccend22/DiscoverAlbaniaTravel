"use client";

import { useEffect, useRef, useState } from "react";
import { InfoIcon } from "./icons";

/**
 * A small "i" trigger that reveals a short explanation on click/tap --
 * click-to-toggle rather than hover, so it works the same on touch screens
 * as it does with a mouse.
 */
export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
      >
        <InfoIcon width={14} height={14} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-xs font-normal leading-snug text-muted shadow-[var(--shadow-sm)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
