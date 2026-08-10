"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapPinIcon, SearchIcon, CloseIcon } from "./icons";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { normalizeSearchText } from "@/lib/search-normalize";
import { useVisualViewport } from "@/lib/use-visual-viewport";

interface CityComboboxProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  requireOption?: boolean;
  className?: string;
  inputClassName?: string;
  noMatchesLabel?: string;
  leadingIcon?: ReactNode;
  leadingIconClassName?: string;
}

interface OptionListProps {
  options: string[];
  highlighted: number;
  rowHeightClassName: string;
  onSelect: (option: string) => void;
  onHover: (index: number) => void;
  idPrefix: string;
}

function OptionList({ options, highlighted, rowHeightClassName, onSelect, onHover, idPrefix }: OptionListProps) {
  return (
    <>
      {options.map((option, index) => (
        <li key={option} role="none">
          <button
            id={`${idPrefix}-option-${index}`}
            role="option"
            aria-selected={index === highlighted}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(option)}
            onMouseEnter={() => onHover(index)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] transition-colors duration-[var(--dur-fast)] active:bg-teal-soft ${rowHeightClassName} ${
              index === highlighted ? "bg-teal-soft text-teal ring-1 ring-inset ring-teal/15" : "text-foreground hover:bg-surface-sunken"
            }`}
          >
            <MapPinIcon width={14} height={14} className="shrink-0 opacity-50" />
            <span className="truncate">{option}</span>
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

export function CityCombobox({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  requireOption = false,
  className,
  inputClassName,
  noMatchesLabel,
  leadingIcon,
  leadingIconClassName,
}: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<"down" | "up">("down");
  const [panelPos, setPanelPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const sheetMode = isOpen && isMobile;
  const visualViewport = useVisualViewport(sheetMode);

  useBodyScrollLock(sheetMode);

  // The desktop panel is portalled to <body> (see below) and positioned in
  // viewport coordinates, so it can render on top of ancestors that clip
  // overflow — e.g. the homepage hero widget's height-transition wrapper —
  // instead of being cropped by them.
  function updatePanelPosition() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const direction = spaceBelow < 260 && spaceAbove > spaceBelow ? "up" : "down";
    setOpenDirection(direction);
    setPanelPos(
      direction === "up"
        ? { bottom: window.innerHeight - rect.top + 8, left: rect.left, width: rect.width }
        : { top: rect.bottom + 8, left: rect.left, width: rect.width }
    );
  }

  function openDropdown() {
    updatePanelPosition();
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
  }, [isOpen, sheetMode]);

  const filtered = useMemo(() => {
    const query = normalizeSearchText(value);
    if (!query) return options;
    return options.filter((option) => normalizeSearchText(option).includes(query));
  }, [value, options]);

  const hasExactOption = useMemo(
    () => options.some((option) => normalizeSearchText(option) === normalizeSearchText(value)),
    [options, value]
  );

  // Finalized once the field is no longer being actively edited (dropdown
  // closed) rather than on every keystroke, so native constraint-validation
  // state isn't churned while the user is still typing.
  useEffect(() => {
    if (!inputRef.current || isOpen) return;
    inputRef.current.setCustomValidity(
      requireOption && value.trim() && !hasExactOption
        ? "Select an available place from the list."
        : ""
    );
  }, [hasExactOption, requireOption, value, isOpen]);

  useEffect(() => {
    if (!isOpen || sheetMode) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // The panel is portalled to <body>, so it's outside containerRef in
      // the DOM even while open — check it separately via its own id so a
      // click on an option isn't mistaken for an outside click.
      const panel = document.getElementById(`${name}-desktop-panel`);
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(panel && panel.contains(target))
      ) {
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
    if (sheetMode) sheetInputRef.current?.focus();
  }, [sheetMode]);

  function selectOption(option: string) {
    onChange(option);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      openDropdown();
      return;
    }
    if (!isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      if (filtered[highlighted]) {
        event.preventDefault();
        selectOption(filtered[highlighted]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showResultCount = value.trim().length > 0 && filtered.length > 0;
  const emptyLabel = noMatchesLabel ?? "No matching places. You can still search with this text.";
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
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      {leadingIcon && (
        <span className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${leadingIconClassName ?? "text-teal"}`} aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        name={name}
        required={required}
        autoComplete="off"
        readOnly={isMobile}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          openDropdown();
          setHighlighted(0);
        }}
        onFocus={() => {
          openDropdown();
          setHighlighted(0);
        }}
        onBlur={(e) => {
          // On open, focus programmatically moves from this field to the
          // mobile sheet's own search input — a legitimate internal shift,
          // not the user leaving the component, so only close when focus
          // actually lands outside it (Tab away, click elsewhere without a
          // mousedown for the outside-click handler to catch). The sheet is
          // portalled to <body> for correct fixed-position behavior, so it's
          // no longer a DOM descendant of containerRef — check it directly.
          const related = e.relatedTarget as Node | null;
          if (containerRef.current?.contains(related) || related === sheetInputRef.current) return;
          setIsOpen(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={`${name}-listbox`}
        aria-activedescendant={isOpen && filtered[highlighted] ? `${name}-option-${highlighted}` : undefined}
        className={`min-h-11 w-full cursor-pointer rounded-2xl border border-border bg-surface py-2 pr-3 text-base outline-none transition-colors duration-[var(--dur-fast)] hover:border-muted/60 focus:border-teal ${inputClassName ?? (leadingIcon ? "pl-10" : "pl-3")}`}
        suppressHydrationWarning
      />

      {isOpen &&
        !sheetMode &&
        panelPos &&
        createPortal(
          <div
            id={`${name}-desktop-panel`}
            className={`fixed z-50 animate-fade-up rounded-2xl border border-[#dce8e6] bg-white shadow-[var(--page-shadow-strong)] ${
              openDirection === "up" ? "origin-bottom" : "origin-top"
            }`}
            style={{ top: panelPos.top, bottom: panelPos.bottom, left: panelPos.left, width: panelPos.width }}
          >
            {filtered.length > 0 ? (
              <>
                {showResultCount && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    {filtered.length} {filtered.length === 1 ? "match" : "matches"}
                  </p>
                )}
                <ul
                  id={`${name}-listbox`}
                  role="listbox"
                  className={`overscroll-contain overflow-y-auto rounded-2xl p-2 ${showResultCount ? "max-h-[min(16rem,42dvh)] pt-0" : "max-h-[min(18rem,45dvh)]"}`}
                >
                  <OptionList
                    options={filtered}
                    highlighted={highlighted}
                    rowHeightClassName="min-h-11 py-2"
                    onSelect={selectOption}
                    onHover={setHighlighted}
                    idPrefix={name}
                  />
                </ul>
              </>
            ) : (
              <EmptyState label={emptyLabel} />
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
              id={`${name}-listbox-sheet`}
              role="dialog"
              aria-modal="true"
              className="animate-fade-in fixed inset-x-0 bottom-0 z-50 flex min-h-0 max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[1.5rem] bg-surface shadow-[var(--shadow-lg)]"
              style={mobileSheetStyle}
            >
              <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex shrink-0 items-center gap-2 px-3 pb-3 sm:px-4">
                <div className="relative min-w-0 flex-1">
                  <SearchIcon width={16} height={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={sheetInputRef}
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setHighlighted(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
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
                  <ul id={`${name}-listbox`} role="listbox" className="p-2 pt-0">
                    <OptionList
                      options={filtered}
                      highlighted={highlighted}
                      rowHeightClassName="min-h-12 py-2.5"
                      onSelect={selectOption}
                      onHover={setHighlighted}
                      idPrefix={name}
                    />
                  </ul>
                ) : (
                  <EmptyState label={emptyLabel} />
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
