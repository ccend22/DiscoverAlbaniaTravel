"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MapPinIcon } from "./icons";

interface CityComboboxProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  noMatchesLabel?: string;
}

export function CityCombobox({ name, value, onChange, options, placeholder, required, className, noMatchesLabel }: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [value, options]);

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
      setIsOpen(true);
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
      <input
        type="text"
        name={name}
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={`${name}-listbox`}
        aria-activedescendant={isOpen && filtered[highlighted] ? `${name}-option-${highlighted}` : undefined}
        className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-base outline-none transition-colors duration-[var(--dur-fast)] hover:border-muted/60 focus:border-teal"
        suppressHydrationWarning
      />

      {isOpen && filtered.length > 0 && (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full min-w-[220px] origin-top animate-fade-up overflow-y-auto rounded-md border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
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
                className={`flex min-h-12 w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-[15px] transition-colors duration-[var(--dur-fast)] active:bg-teal-soft sm:min-h-9 sm:py-2 sm:text-sm ${
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
        <div className="absolute z-30 mt-1.5 w-full origin-top animate-fade-up rounded-md border border-border bg-surface p-3 text-sm text-muted shadow-[var(--shadow-lg)]">
          {noMatchesLabel ?? "No matching stations — you can still search with this text."}
        </div>
      )}
    </div>
  );
}
