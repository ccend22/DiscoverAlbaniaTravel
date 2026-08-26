"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, SearchIcon, CloseIcon } from "./icons";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { normalizeSearchText } from "@/lib/search-normalize";
import { useVisualViewport } from "@/lib/use-visual-viewport";
import {
  COUNTRY_CALLING_CODES,
  POPULAR_COUNTRY_ISO2,
  flagEmoji,
  splitStoredPhone,
  type CountryCallingCode,
} from "@/lib/country-calling-codes";

interface CountryListProps {
  countries: CountryCallingCode[];
  highlighted: number;
  selectedIso2: string;
  rowHeightClassName: string;
  onSelect: (country: CountryCallingCode) => void;
  onHover: (index: number) => void;
  idPrefix: string;
  popularCount?: number;
  popularLabel?: string;
  allCountriesLabel?: string;
}

function SectionLabel({ children }: { children: string }) {
  return <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted first:pt-1">{children}</p>;
}

function CountryList({
  countries,
  highlighted,
  selectedIso2,
  rowHeightClassName,
  onSelect,
  onHover,
  idPrefix,
  popularCount = 0,
  popularLabel,
  allCountriesLabel,
}: CountryListProps) {
  return (
    <>
      {countries.map((country, index) => (
        <li key={country.iso2} role="none">
          {popularCount > 0 && index === 0 && popularLabel && <SectionLabel>{popularLabel}</SectionLabel>}
          {popularCount > 0 && index === popularCount && allCountriesLabel && <SectionLabel>{allCountriesLabel}</SectionLabel>}
          <button
            id={`${idPrefix}-option-${index}`}
            role="option"
            aria-selected={country.iso2 === selectedIso2}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(country)}
            onMouseEnter={() => onHover(index)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] transition-colors duration-[var(--dur-fast)] active:bg-teal-soft ${rowHeightClassName} ${
              index === highlighted ? "bg-teal-soft text-teal ring-1 ring-inset ring-teal/15" : "text-foreground hover:bg-surface-sunken"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {flagEmoji(country.iso2)}
            </span>
            <span className="min-w-0 flex-1 truncate">{country.name}</span>
            <span className="shrink-0 tabular-nums text-muted">+{country.dialCode}</span>
          </button>
        </li>
      ))}
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-muted">
        <SearchIcon width={16} height={16} />
      </span>
      <p className="max-w-[16rem] text-sm leading-6 text-muted">{label}</p>
    </div>
  );
}

interface PhoneInputProps {
  id?: string;
  name: string;
  required?: boolean;
  defaultValue?: string | null;
  placeholder?: string;
  onInput?: (event: FormEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  /** Classes for the bordered group that visually contains the prefix trigger + number field, e.g. matching a surrounding `.public-input` or a field-specific border/shadow treatment. */
  groupClassName?: string;
  /** Classes for the number `<input>` itself -- font size/weight/color, not border/background (the group owns those). */
  numberInputClassName?: string;
  ariaDescribedBy?: string;
  dialogLabel?: string;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
  popularLabel?: string;
  allCountriesLabel?: string;
  onInvalid?: (event: FormEvent<HTMLInputElement>) => void;
}

export function PhoneInput({
  id,
  name,
  required,
  defaultValue,
  placeholder,
  autoFocus,
  groupClassName,
  numberInputClassName,
  ariaDescribedBy,
  dialogLabel = "Choose a country",
  searchPlaceholder = "Search country or code",
  noMatchesLabel = "No matching countries",
  popularLabel = "Popular",
  allCountriesLabel = "All countries",
  onInvalid,
  onInput,
}: PhoneInputProps) {
  const initial = useMemo(() => splitStoredPhone(defaultValue), [defaultValue]);
  const [country, setCountry] = useState<CountryCallingCode>(initial.country);
  const [localNumber, setLocalNumber] = useState(initial.localNumber);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const sheetMode = isOpen && isMobile;
  const visualViewport = useVisualViewport(sheetMode);

  useBodyScrollLock(sheetMode);

  const combinedValue = localNumber.trim() ? `+${country.dialCode}${localNumber.replace(/[^\d]/g, "")}` : "";

  const updatePanelPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelPos({ top: rect.bottom + 8, left: rect.left });
  }, []);

  function openDropdown() {
    updatePanelPosition();
    setQuery("");
    setHighlighted(0);
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen || sheetMode) return;
    function handleReposition() {
      updatePanelPosition();
    }
    window.addEventListener("scroll", handleReposition, { capture: true, passive: true });
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, sheetMode, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen || sheetMode) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const panel = document.getElementById(`${name}-country-panel`);
      if (containerRef.current && !containerRef.current.contains(target) && !(panel && panel.contains(target))) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, sheetMode, name]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const { orderedCountries, availablePopularCount } = useMemo(() => {
    const popularSet = new Set(POPULAR_COUNTRY_ISO2);
    const popular = COUNTRY_CALLING_CODES.filter((c) => popularSet.has(c.iso2)).sort(
      (a, b) => POPULAR_COUNTRY_ISO2.indexOf(a.iso2) - POPULAR_COUNTRY_ISO2.indexOf(b.iso2)
    );
    const rest = COUNTRY_CALLING_CODES.filter((c) => !popularSet.has(c.iso2));
    return { orderedCountries: [...popular, ...rest], availablePopularCount: popular.length };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return orderedCountries;
    const digitsQuery = query.replace(/[^\d]/g, "");
    return COUNTRY_CALLING_CODES.filter(
      (c) => normalizeSearchText(c.name).includes(normalizedQuery) || (digitsQuery && c.dialCode.startsWith(digitsQuery))
    );
  }, [query, orderedCountries]);

  const popularCount = query.trim() ? 0 : availablePopularCount;

  function selectCountry(next: CountryCallingCode) {
    setCountry(next);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[highlighted]) selectCountry(filtered[highlighted]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const mobileSheetStyle = visualViewport
    ? (() => {
        const verticalGap = 8;
        const height = Math.max(0, visualViewport.height - verticalGap);
        return {
          top: visualViewport.top + verticalGap,
          bottom: "auto",
          height,
          maxHeight: height,
          paddingBottom: visualViewport.keyboardOpen ? "0.5rem" : "max(1rem, env(safe-area-inset-bottom))",
        };
      })()
    : { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" };

  return (
    <div ref={containerRef} className={`relative flex items-stretch ${groupClassName ?? ""}`}>
      <input type="hidden" name={name} value={combinedValue} />
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${dialogLabel}: ${country.name} +${country.dialCode}`}
        className="flex shrink-0 items-center gap-1 rounded-l-[inherit] py-2 pl-3.5 pr-2 text-sm font-semibold text-brand-navy outline-none transition-colors hover:text-teal"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          {flagEmoji(country.iso2)}
        </span>
        <span className="tabular-nums">+{country.dialCode}</span>
        <ChevronDownIcon width={12} height={12} className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <span className="my-2 w-px shrink-0 bg-[#dce8e6]" aria-hidden="true" />

      <input
        id={id}
        type="tel"
        required={required}
        autoComplete="tel-national"
        autoFocus={autoFocus}
        inputMode="tel"
        aria-describedby={ariaDescribedBy}
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value)}
        onInvalid={onInvalid}
        onInput={onInput}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-2 pr-1 outline-none placeholder:text-muted ${numberInputClassName ?? ""}`}
      />

      {isOpen &&
        !sheetMode &&
        panelPos &&
        createPortal(
          <div
            id={`${name}-country-panel`}
            role="dialog"
            aria-label={dialogLabel}
            className="fixed z-50 w-[19rem] max-w-[calc(100vw-2rem)] origin-top-left animate-fade-up rounded-2xl border border-[#dce8e6] bg-white shadow-[var(--page-shadow-strong)]"
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <div className="relative border-b border-[#eef4f2] p-2">
              <SearchIcon width={14} height={14} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                aria-expanded
                aria-controls={`${name}-country-listbox`}
                aria-activedescendant={filtered[highlighted] ? `${name}-option-${highlighted}` : undefined}
                className="min-h-10 w-full rounded-xl border border-transparent bg-surface-sunken py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:border-teal focus:bg-white"
              />
            </div>
            {filtered.length > 0 ? (
              <ul id={`${name}-country-listbox`} role="listbox" className="max-h-[min(18rem,45dvh)] overflow-y-auto overscroll-contain rounded-b-2xl p-2">
                <CountryList
                  countries={filtered}
                  highlighted={highlighted}
                  selectedIso2={country.iso2}
                  rowHeightClassName="min-h-11 py-2"
                  onSelect={selectCountry}
                  onHover={setHighlighted}
                  idPrefix={name}
                  popularCount={popularCount}
                  popularLabel={popularLabel}
                  allCountriesLabel={allCountriesLabel}
                />
              </ul>
            ) : (
              <EmptyState label={noMatchesLabel} />
            )}
          </div>,
          document.body
        )}

      {sheetMode &&
        createPortal(
          <>
            <div
              className="animate-sheet-fade touch-manipulation fixed inset-0 z-40 bg-foreground/40"
              aria-hidden="true"
              {...tapToDismiss(() => setIsOpen(false))}
            />
            <div
              id={`${name}-country-sheet`}
              role="dialog"
              aria-modal="true"
              aria-label={dialogLabel}
              className="animate-fade-in fixed inset-x-0 bottom-0 z-50 flex min-h-0 max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[1.5rem] bg-surface shadow-[var(--shadow-lg)] transition-[top,height] duration-[var(--dur-base)] ease-[var(--ease-out-expo)]"
              style={mobileSheetStyle}
            >
              <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex shrink-0 items-center gap-2 px-3 pb-3 sm:px-4">
                <div className="relative min-w-0 flex-1">
                  <SearchIcon width={16} height={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlighted(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className="min-h-12 w-full appearance-none rounded-2xl border border-border bg-surface-sunken pl-11 pr-4 text-base outline-none transition-colors duration-[var(--dur-fast)] focus:border-teal focus:bg-surface"
                  />
                </div>
                <button
                  type="button"
                  {...tapToDismiss(() => setIsOpen(false))}
                  aria-label="Close"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface-sunken text-muted transition-colors active:bg-brand-soft"
                >
                  <CloseIcon width={18} height={18} />
                </button>
              </div>
              <div className="overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
                {filtered.length > 0 ? (
                  <ul id={`${name}-country-listbox`} role="listbox" className="p-2 pt-0">
                    <CountryList
                      countries={filtered}
                      highlighted={highlighted}
                      selectedIso2={country.iso2}
                      rowHeightClassName="min-h-12 py-2.5"
                      onSelect={selectCountry}
                      onHover={setHighlighted}
                      idPrefix={name}
                      popularCount={popularCount}
                      popularLabel={popularLabel}
                      allCountriesLabel={allCountriesLabel}
                    />
                  </ul>
                ) : (
                  <EmptyState label={noMatchesLabel} />
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
