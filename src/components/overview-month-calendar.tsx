"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export interface OverviewCalendarDay {
  date: string;
  departuresRunning: number;
  bookingsCount: number;
  seatsBooked: number;
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function shiftMonth(month: string, delta: number): string {
  const [year, mo] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, mo - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function OverviewMonthCalendar({
  selectedDate,
  month,
  today,
  days,
}: {
  selectedDate: string;
  month: string;
  today: string;
  days: OverviewCalendarDay[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [year, mo] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, mo - 1, 1));
  // getUTCDay() is 0=Sunday..6=Saturday; shift so the grid starts on Monday.
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(firstOfMonth);

  const cells: (OverviewCalendarDay | null)[] = [...Array.from({ length: leadingBlanks }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  function goTo(next: { date?: string; month?: string }) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? selectedDate);
    params.set("month", next.month ?? month);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo({ month: shiftMonth(month, -1) })}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-sunken hover:text-foreground"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <p className="font-display text-sm font-bold text-foreground">{monthLabel}</p>
        <div className="flex items-center gap-1">
          {(selectedDate !== today || month !== today.slice(0, 7)) && (
            <button
              type="button"
              onClick={() => goTo({ date: today, month: today.slice(0, 7) })}
              className="mr-1 text-xs font-semibold text-teal hover:underline"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo({ month: shiftMonth(month, 1) })}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-sunken hover:text-foreground"
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted/70">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === today;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => goTo({ date: cell.date, month })}
              aria-current={isSelected ? "date" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 text-xs transition-colors duration-[var(--dur-fast)] ${
                isSelected
                  ? "bg-teal text-white"
                  : isToday
                    ? "bg-teal-soft text-teal"
                    : "text-foreground hover:bg-surface-sunken"
              }`}
            >
              <span className="font-semibold tabular-nums">{Number(cell.date.slice(-2))}</span>
              <span className={`tabular-nums ${isSelected ? "text-white/85" : cell.departuresRunning > 0 ? "text-muted" : "text-muted/40"}`}>
                {cell.departuresRunning}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted/70">Number below each day = departures scheduled</p>
    </div>
  );
}
