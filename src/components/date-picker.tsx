"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateLong } from "@/lib/format";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";
import { CalendarIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const COLUMN_PADDING = (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDate(dateStr);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Monday-first weekday index (0 = Monday .. 6 = Sunday) for the 1st of the given month. */
function firstWeekdayIndex(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

interface WheelColumnProps {
  items: { value: number; label: string }[];
  selected: number;
  onSelect: (value: number) => void;
}

function WheelColumn({ items, selected, onSelect }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressScrollHandling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = items.findIndex((item) => item.value === selected);
    if (index === -1) return;

    suppressScrollHandling.current = true;
    container.scrollTop = index * ITEM_HEIGHT;
    const timeout = setTimeout(() => {
      suppressScrollHandling.current = false;
    }, 100);
    return () => clearTimeout(timeout);
  }, [selected, items]);

  function handleScroll() {
    if (suppressScrollHandling.current) return;
    const container = containerRef.current;
    if (!container) return;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const index = Math.min(
        Math.max(Math.round(container.scrollTop / ITEM_HEIGHT), 0),
        items.length - 1
      );
      const item = items[index];
      if (item && item.value !== selected) {
        onSelect(item.value);
      }
    }, 120);
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overlay-scroll h-[180px] w-20 overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        scrollSnapType: "y mandatory",
        paddingTop: COLUMN_PADDING,
        paddingBottom: COLUMN_PADDING,
      }}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelect(item.value)}
          className={`flex h-9 w-full items-center justify-center text-sm transition ${
            item.value === selected ? "font-semibold text-teal" : "text-muted"
          }`}
          style={{ scrollSnapAlign: "center" }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface CalendarContentProps {
  value: string;
  min: string;
  onSelectDay: (dateStr: string) => void;
  dict: Dictionary["datePicker"];
  /** Larger day cells for thumb-friendly tapping in the mobile bottom sheet. */
  compact?: boolean;
}

function CalendarContent({ value, min, onSelectDay, dict, compact = true }: CalendarContentProps) {
  const selected = parseDate(value);
  const minParsed = parseDate(min);
  const [mode, setMode] = useState<"calendar" | "wheel">("calendar");
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  const isAtMinMonth = viewYear === minParsed.year && viewMonth === minParsed.month;
  const cellSize = compact ? "h-9 w-9" : "h-11 w-11";
  const navSize = compact ? "h-9 w-9" : "h-11 w-11";

  function goPrevMonth() {
    if (isAtMinMonth) return;
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = Array.from({ length: firstWeekdayIndex(viewYear, viewMonth) });
  const dayCells = Array.from({ length: totalDays }, (_, i) => i + 1);
  const todayStr = getAlbaniaDateInputValue();

  const yearItems = [minParsed.year, minParsed.year + 1].map((y) => ({
    value: y,
    label: String(y),
  }));
  const monthItems = dict.monthsFull.map((label, i) => ({ value: i + 1, label: label.slice(0, 3) }));

  return mode === "calendar" ? (
    <>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={isAtMinMonth}
          aria-label={dict.previousMonth}
          className={`flex ${navSize} items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft disabled:opacity-30`}
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={() => setMode("wheel")}
          className="min-h-9 rounded px-2 text-sm font-medium transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft"
        >
          {dict.monthsFull[viewMonth - 1]} {viewYear}
        </button>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label={dict.nextMonth}
          className={`flex ${navSize} items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft`}
        >
          <ChevronRightIcon width={16} height={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[7px] font-medium leading-tight tracking-tight text-muted sm:text-[10px]">
        {dict.weekdayLabels.map((label, i) => (
          <div key={`${label}-${i}`} className="flex min-h-6 items-center justify-center">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {leadingBlanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {dayCells.map((day) => {
          const dateStr = formatDate(viewYear, viewMonth, day);
          const isSelected = dateStr === value;
          const isToday = dateStr === todayStr;
          const isDisabled = dateStr < min;
          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              {...tapToDismiss(() => onSelectDay(dateStr))}
              className={`flex ${cellSize} items-center justify-center justify-self-center rounded-full text-sm transition-all duration-[var(--dur-fast)] ease-[var(--ease-spring)] ${
                isSelected
                  ? "scale-110 bg-teal font-semibold text-teal-foreground shadow-[var(--shadow-glow-teal)]"
                  : isDisabled
                    ? "cursor-not-allowed text-muted/40"
                    : isToday
                      ? "border border-teal text-teal"
                      : "hover:scale-110 hover:bg-teal/10 active:bg-teal/15"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </>
  ) : (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{dict.jumpToMonth}</span>
        <button type="button" onClick={() => setMode("calendar")} className="text-sm font-medium text-teal">
          {dict.done}
        </button>
      </div>
      <div className="relative flex justify-center gap-2">
        <WheelColumn items={monthItems} selected={viewMonth} onSelect={setViewMonth} />
        <WheelColumn items={yearItems} selected={viewYear} onSelect={setViewYear} />
        <div
          className="pointer-events-none absolute inset-x-0 rounded-md border-y border-teal/60 bg-teal/5"
          style={{ top: COLUMN_PADDING, height: ITEM_HEIGHT }}
        />
      </div>
    </>
  );
}

interface DatePickerProps {
  name: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
  dict: Dictionary["datePicker"];
  locale?: Locale;
  buttonClassName?: string;
  iconClassName?: string;
}

interface QuickPicksProps {
  dict: Dictionary["datePicker"];
  min: string;
  value: string;
  today: string;
  tomorrow: string;
  onSelect: (value: string) => void;
}

function QuickPicks({ dict, min, value, today, tomorrow, onSelect }: QuickPicksProps) {
  return (
    <div className="mb-3 flex gap-2">
      {[
        { label: dict.today, dateStr: today },
        { label: dict.tomorrow, dateStr: tomorrow },
      ].map(({ label, dateStr }) => {
        const disabled = dateStr < min;
        const active = dateStr === value;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(dateStr)}
          className={`min-h-9 flex-1 rounded-xl border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "border-teal bg-teal/10 text-teal"
                : "border-border text-foreground hover:border-teal hover:bg-brand-soft hover:text-teal"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function DatePicker({ name, value, min, onChange, dict, locale = "en", buttonClassName, iconClassName }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const sheetMode = isOpen && isMobile;

  useBodyScrollLock(sheetMode);

  useEffect(() => {
    if (!isOpen || sheetMode) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, sheetMode]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function selectDay(dateStr: string) {
    onChange(dateStr);
    setIsOpen(false);
  }

  const todayStr = getAlbaniaDateInputValue();
  const tomorrowStr = addDays(todayStr, 1);

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name={name} value={value} suppressHydrationWarning />
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${name}-date-picker`}
        aria-label={`${dict.jumpToMonth}: ${formatDateLong(value, locale)}`}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-left text-base outline-none transition-colors duration-[var(--dur-fast)] hover:border-muted/60 focus:border-teal ${buttonClassName ?? ""}`}
      >
        <CalendarIcon width={18} height={18} className={`shrink-0 ${iconClassName ?? "text-teal"}`} aria-hidden="true" />
        <span>{formatDateLong(value, locale)}</span>
      </button>

      {isOpen && !sheetMode && (
        <div id={`${name}-date-picker`} role="dialog" aria-modal="false" className="overlay-scroll absolute right-0 z-50 mt-2 max-h-[calc(100dvh-2rem)] w-[28rem] max-w-[calc(100vw-2rem)] origin-top-right animate-fade-up overflow-y-auto overscroll-contain rounded-2xl border border-[#dce8e6] bg-white p-4 shadow-[var(--page-shadow-strong)]">
          <QuickPicks dict={dict} min={min} value={value} today={todayStr} tomorrow={tomorrowStr} onSelect={selectDay} />
          <p className="mb-1.5 text-xs font-medium text-muted">{dict.chooseDate}</p>
          <CalendarContent value={value} min={min} onSelectDay={selectDay} dict={dict} />
        </div>
      )}

      {sheetMode && (
        <>
          <div
            className="animate-sheet-fade touch-manipulation fixed inset-0 z-40 bg-foreground/40"
            aria-hidden="true"
            {...tapToDismiss(() => setIsOpen(false))}
          />
          <div
            id={`${name}-date-picker`}
            role="dialog"
            aria-modal="true"
            className="animate-sheet-up fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-lg)]"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-4 pb-3">
              <p className="text-sm font-semibold text-foreground">{dict.jumpToMonth}</p>
              <button
                type="button"
                {...tapToDismiss(() => setIsOpen(false))}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-sunken"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>
            <div className="overlay-scroll overflow-y-auto px-4 pb-4">
              <QuickPicks dict={dict} min={min} value={value} today={todayStr} tomorrow={tomorrowStr} onSelect={selectDay} />
              <p className="mb-1.5 text-xs font-medium text-muted">{dict.chooseDate}</p>
              <CalendarContent value={value} min={min} onSelectDay={selectDay} dict={dict} compact={false} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
