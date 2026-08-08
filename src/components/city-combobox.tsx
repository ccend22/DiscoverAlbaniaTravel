"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MapPinIcon } from "./icons";

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
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openDropdown() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < 260 && spaceAbove > spaceBelow ? "up" : "down");
    }
    setIsOpen(true);
  }

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [value, options]);

  const hasExactOption = useMemo(
    () => options.some((option) => option.toLowerCase() === value.trim().toLowerCase()),
    [options, value]
  );

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.setCustomValidity(
      requireOption && value.trim() && !hasExactOption
        ? "Select an available place from the list."
        : ""
    );
  }, [hasExactOption, requireOption, value]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={`${name}-listbox`}
        aria-activedescendant={isOpen && filtered[highlighted] ? `${name}-option-${highlighted}` : undefined}
        className={`min-h-11 w-full rounded-2xl border border-border bg-surface py-2 pr-3 text-base outline-none transition-colors duration-[var(--dur-fast)] hover:border-muted/60 focus:border-teal ${inputClassName ?? (leadingIcon ? "pl-10" : "pl-3")}`}
        suppressHydrationWarning
      />

      {isOpen && filtered.length > 0 && (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          className={`absolute left-0 z-50 max-h-[min(18rem,45dvh)] w-full min-w-0 animate-fade-up overscroll-contain overflow-y-auto rounded-2xl border border-[#dce8e6] bg-white p-2 shadow-[var(--page-shadow)] sm:w-[min(22rem,calc(100vw-2rem))] ${
            openDirection === "up" ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
          }`}
        >
          {filtered.map((option, index) => (
            <li key={option} role="none">
              <button
                id={`${name}-option-${index}`}
                role="option"
                aria-selected={index === highlighted}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors duration-[var(--dur-fast)] active:bg-teal-soft sm:min-h-10 sm:py-2 sm:text-sm ${
                  index === highlighted ? "bg-teal-soft text-teal" : "text-foreground hover:bg-surface-sunken"
                }`}
              >
                <MapPinIcon width={15} height={15} className="shrink-0 opacity-60" />
                <span className="truncate">{option}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && value.trim() && filtered.length === 0 && (
        <div
          className={`absolute left-0 z-50 w-full min-w-0 animate-fade-up rounded-2xl border border-[#dce8e6] bg-white p-4 text-sm text-muted shadow-[var(--page-shadow)] sm:w-[min(22rem,calc(100vw-2rem))] ${
            openDirection === "up" ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
          }`}
        >
          {noMatchesLabel ?? "No matching stations. You can still search with this text."}
        </div>
      )}
    </div>
  );
}
