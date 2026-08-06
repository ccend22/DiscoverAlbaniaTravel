"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "./icons";
import { BrandMark } from "./brand-mark";
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
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white transition-colors duration-[var(--dur-fast)] hover:bg-white/10 active:bg-white/15 lg:hidden"
        aria-label={openMenuLabel}
        aria-expanded={isOpen}
      >
        <MenuIcon width={22} height={22} />
      </button>

      <div
        className={`touch-manipulation fixed inset-0 z-40 bg-brand-deep/70 backdrop-blur-sm transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:hidden ${
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
        className={`fixed inset-0 z-50 flex flex-col bg-surface text-foreground transition-transform duration-500 ease-[var(--ease-out-expo)] lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-border px-5 pb-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <span className="flex items-center gap-3 text-brand-navy">
            <span className="rounded-xl bg-brand-navy p-2"><BrandMark size={26} /></span>
            <span className="font-serif text-lg font-black leading-none">Discover Albania</span>
          </span>
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
          className="overlay-scroll flex-1 overflow-y-auto px-6 py-8"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="group flex min-h-16 items-center justify-between border-b border-border py-4 font-serif text-3xl font-black tracking-tight text-brand-navy transition-colors duration-[var(--dur-fast)] active:text-brand"
            >
              {link.label}
              <span className="font-sans text-xl font-normal text-brand">→</span>
            </Link>
          ))}
          <div className="my-6" />
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="block rounded-full bg-brand-navy px-6 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white shadow-[var(--shadow-md)] transition-colors duration-[var(--dur-fast)] active:bg-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
