"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "./icons";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  primaryLinks: NavItem[];
  utilityLinks: NavItem[];
  openMenuLabel: string;
}

export function MobileNav({ primaryLinks, utilityLinks, openMenuLabel }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-white transition-colors duration-[var(--dur-fast)] hover:bg-white/10 active:bg-white/15 lg:hidden"
        aria-label={openMenuLabel}
        aria-expanded={isOpen}
      >
        <MenuIcon width={22} height={22} />
      </button>

      <div
        className={`touch-manipulation fixed inset-0 z-40 bg-black/50 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        {...tapToDismiss(close)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={openMenuLabel}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col bg-surface text-foreground shadow-[var(--shadow-lg)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className="flex shrink-0 items-center justify-end border-b border-border px-3 pb-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            {...tapToDismiss(close)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-sunken"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <nav
          className="overlay-scroll flex-1 overflow-y-auto p-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="block min-h-12 rounded-md px-3 py-3.5 text-base font-medium transition-colors duration-[var(--dur-fast)] active:bg-green-50 active:text-green-700"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-2 border-t border-border" />
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="block min-h-12 rounded-md px-3 py-3.5 text-base text-muted transition-colors duration-[var(--dur-fast)] active:bg-green-50 active:text-green-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
