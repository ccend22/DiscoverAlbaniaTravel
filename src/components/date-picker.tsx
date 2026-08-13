"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateLong } from "@/lib/format";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale";
import { CalendarIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { useVisualViewport } from "@/lib/use-visual-viewport";

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
  rangeStart?: string;
  rangeEnd?: string;
  /** Larger day cells for thumb-friendly tapping in the mobile bottom sheet. */
  compact?: boolean;
}

function CalendarContent({
  value,
  min,
  onSelectDay,
  dict,
  rangeStart,
  rangeEnd,
  compact = true,
}: CalendarContentProps) {
  const selected = parseDate(value);
  const minParsed = parseDate(min);
  const [mode, setMode] = useState<"calendar" | "wheel">("calendar");
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  const isAtMinMonth = viewYear === minParsed.year && viewMonth === minParsed.month;
  const cellSize = compact ? "h-9 w-9" : "aspect-square w-full max-w-11";
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
          <div key={`${label}-${i}`} className="flex min-h-6 items-center justify-center">
            <span className="sm:hidden">{label.slice(0, 2)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {leadingBlanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {dayCells.map((day) => {
          const dateStr = formatDate(viewYear, viewMonth, day);
          const isRangeStart = !!rangeStart && dateStr === rangeStart;
          const isRangeEnd = !!rangeEnd && dateStr === rangeEnd;
          const isRangeEdge = isRangeStart || isRangeEnd;
          const isInRange = !!rangeStart && !!rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;
          const isSelected = rangeStart ? isRangeEdge : dateStr === value;
          const isToday = dateStr === todayStr;
          const isDisabled = dateStr < min;
          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              {...tapToDismiss(() => onSelectDay(dateStr))}
              className={`relative flex ${cellSize} items-center justify-center justify-self-center text-sm transition-all duration-[var(--dur-fast)] ease-[var(--ease-spring)] ${
                isSelected
                  ? "z-10 scale-105 rounded-full bg-teal font-semibold text-teal-foreground shadow-[var(--shadow-glow-teal)]"
                  : isDisabled
                    ? "cursor-not-allowed rounded-full text-muted/40"
                    : isInRange
                      ? "rounded-xl bg-teal/12 font-medium text-brand-navy"
                    : isToday
                      ? "rounded-full border border-teal text-teal"
                      : "rounded-full hover:scale-110 hover:bg-teal/10 active:bg-teal/15"
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnSelect?: boolean;
  rangeStart?: string;
  rangeEnd?: string;
  rangeStartLabel?: string;
  rangeEndLabel?: string;
  activeRangeBoundary?: "start" | "end";
  dialogLabel?: string;
  /** Shown inline before the date inside the button, replacing a separate caption above the field. */
  inlineLabel?: string;
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

interface RangeSummaryProps {
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  activeBoundary: "start" | "end";
  locale: Locale;
}

function RangeSummary({ start, end, startLabel, endLabel, activeBoundary, locale }: RangeSummaryProps) {
  return (
    <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl bg-surface-sunken p-1">
      <div className={`min-w-0 rounded-xl px-3 py-2 transition-colors ${activeBoundary === "start" ? "bg-white shadow-sm" : ""}`}>
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{startLabel}</span>
        <span className={`block truncate text-sm font-semibold ${activeBoundary === "start" ? "text-teal" : "text-brand-navy"}`}>
          {formatDateLong(start, locale)}
        </span>
      </div>
      <ArrowRange />
      <div className={`min-w-0 rounded-xl px-3 py-2 text-right transition-colors ${activeBoundary === "end" ? "bg-white shadow-sm" : ""}`}>
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{endLabel}</span>
        <span className={`block truncate text-sm font-semibold ${activeBoundary === "end" ? "text-teal" : "text-brand-navy"}`}>
          {formatDateLong(end, locale)}
        </span>
      </div>
    </div>
  );
}

function ArrowRange() {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5 px-1 text-teal/60">
      <span className="h-px w-2 bg-current" />
      <ChevronRightIcon width={12} height={12} />
    </span>
  );
}

export function DatePicker({
  name,
  value,
  min,
  onChange,
  dict,
  locale = "en",
  buttonClassName,
  iconClassName,
  open,
  onOpenChange,
  closeOnSelect = true,
  rangeStart,
  rangeEnd,
  rangeStartLabel,
  rangeEndLabel,
  activeRangeBoundary,
  dialogLabel,
  inlineLabel,
}: DatePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const sheetMode = isOpen && isMobile;
  const visualViewport = useVisualViewport(sheetMode);

  const setIsOpen = useCallback((next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }, [onOpenChange, open]);

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
  }, [isOpen, setIsOpen, sheetMode]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, setIsOpen]);

  function selectDay(dateStr: string) {
    onChange(dateStr);
    if (closeOnSelect) setIsOpen(false);
  }

  const todayStr = getAlbaniaDateInputValue();
  const tomorrowStr = addDays(todayStr, 1);
  const showRange = !!rangeStart && !!rangeEnd && !!rangeStartLabel && !!rangeEndLabel && !!activeRangeBoundary;
  const mobileSheetStyle = visualViewport
    ? (() => {
        const verticalGap = 8;
        const height = Math.max(0, Math.min(640, visualViewport.height - verticalGap));
        return {
          top: visualViewport.top + visualViewport.height - height,
          bottom: "auto",
          height,
          maxHeight: height,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        };
      })()
    : { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" };

  return (
    <div className="relative min-w-0 flex-1" ref={containerRef}>
      <input type="hidden" name={name} value={value} suppressHydrationWarning />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${name}-date-picker`}
        aria-label={`${inlineLabel ? `${inlineLabel}: ` : ""}${dict.jumpToMonth}: ${formatDateLong(value, locale)}`}
        className={`flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-left text-base outline-none transition-colors duration-[var(--dur-fast)] hover:border-muted/60 focus:border-teal ${buttonClassName ?? ""}`}
      >
        <CalendarIcon width={18} height={18} className={`shrink-0 ${iconClassName ?? "text-teal"}`} aria-hidden="true" />
        <span className="min-w-0 leading-tight">
          {inlineLabel && <span className="mr-1 font-bold uppercase tracking-[0.08em] text-black/60">{inlineLabel}</span>}
          {formatDateLong(value, locale)}
        </span>
      </button>

      {isOpen && !sheetMode && (
        <div id={`${name}-date-picker`} role="dialog" aria-modal="false" aria-label={dialogLabel ?? dict.chooseDate} className="overlay-scroll absolute right-0 z-50 mt-2 max-h-[calc(100dvh-2rem)] w-[28rem] max-w-[calc(100vw-2rem)] origin-top-right animate-fade-up overflow-y-auto overscroll-contain rounded-2xl border border-[#dce8e6] bg-white p-4 shadow-[var(--page-shadow-strong)]">
          {showRange && (
            <RangeSummary
              start={rangeStart}
              end={rangeEnd}
              startLabel={rangeStartLabel}
              endLabel={rangeEndLabel}
              activeBoundary={activeRangeBoundary}
              locale={locale}
            />
          )}
          <QuickPicks dict={dict} min={min} value={value} today={todayStr} tomorrow={tomorrowStr} onSelect={selectDay} />
          <p className="mb-1.5 text-xs font-medium text-muted">{dialogLabel ?? dict.chooseDate}</p>
          <CalendarContent
            value={value}
            min={min}
            onSelectDay={selectDay}
            dict={dict}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>
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
            id={`${name}-date-picker`}
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel ?? dict.chooseDate}
            className="animate-fade-in fixed inset-x-0 bottom-0 z-50 flex min-h-0 max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-[1.5rem] bg-surface shadow-[var(--shadow-lg)]"
            style={mobileSheetStyle}
          >
            <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-4 pb-3">
              <p className="text-sm font-semibold text-foreground">{dialogLabel ?? dict.chooseDate}</p>
              <button
                type="button"
                {...tapToDismiss(() => setIsOpen(false))}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-sunken"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>
            <div className="overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 sm:px-4">
              {showRange && (
                <RangeSummary
                  start={rangeStart}
                  end={rangeEnd}
                  startLabel={rangeStartLabel}
                  endLabel={rangeEndLabel}
                  activeBoundary={activeRangeBoundary}
                  locale={locale}
                />
              )}
              <QuickPicks dict={dict} min={min} value={value} today={todayStr} tomorrow={tomorrowStr} onSelect={selectDay} />
              <p className="mb-1.5 text-xs font-medium text-muted">{dialogLabel ?? dict.chooseDate}</p>
              <CalendarContent
                value={value}
                min={min}
                onSelectDay={selectDay}
                dict={dict}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                compact={false}
              />
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  );
}
