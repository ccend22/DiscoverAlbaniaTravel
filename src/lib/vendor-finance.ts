import type { VendorFinanceTransactionRow } from "@/db/queries/vendors";
import { paymentAmountInEur } from "@/lib/format";
import { BUS_BOOKING_SERVICE_FEE_EUR } from "@/lib/service-fees";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

export type VendorFinanceRange = "today" | "7d" | "30d" | "this_month" | "all" | "custom";

export interface VendorFinancePeriod {
  range: VendorFinanceRange;
  from: string | null;
  to: string | null;
  label: string;
}

export interface VendorFinanceTransaction extends VendorFinanceTransactionRow {
  financialDate: string;
  grossEur: number;
  platformFeeEur: number;
  operatorEarningsEur: number;
  state: "collected" | "pending" | "review" | "closed" | "missing";
}

export interface VendorFinanceView {
  transactions: VendorFinanceTransaction[];
  summary: {
    grossCollectedEur: number;
    platformFeesEur: number;
    operatorEarningsEur: number;
    pendingAmountEur: number;
    paidBookings: number;
    seatsSold: number;
    reviewCount: number;
    missingPaymentCount: number;
  };
  trend: Array<{ key: string; label: string; earningsEur: number }>;
  trendGranularity: "day" | "month";
  routes: Array<{
    routeCode: string;
    fromStationName: string;
    toStationName: string;
    earningsEur: number;
    bookings: number;
    seats: number;
    share: number;
  }>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value: string | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function shiftDate(dateInput: string, days: number): string {
  const date = new Date(`${dateInput}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatRangeDate(dateInput: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateInput}T00:00:00Z`));
}

export function resolveVendorFinancePeriod(
  requestedRange: string | undefined,
  requestedFrom: string | undefined,
  requestedTo: string | undefined,
  now = new Date()
): VendorFinancePeriod {
  const today = getAlbaniaDateInputValue(now);
  const allowedRanges: VendorFinanceRange[] = ["today", "7d", "30d", "this_month", "all", "custom"];
  const range = allowedRanges.includes(requestedRange as VendorFinanceRange)
    ? (requestedRange as VendorFinanceRange)
    : "this_month";

  if (range === "all") return { range, from: null, to: null, label: "All time" };
  if (range === "today") return { range, from: today, to: today, label: "Today" };
  if (range === "7d") {
    const from = shiftDate(today, -6);
    return { range, from, to: today, label: `${formatRangeDate(from)} – ${formatRangeDate(today)}` };
  }
  if (range === "30d") {
    const from = shiftDate(today, -29);
    return { range, from, to: today, label: `${formatRangeDate(from)} – ${formatRangeDate(today)}` };
  }
  if (range === "custom" && isValidDateInput(requestedFrom) && isValidDateInput(requestedTo) && requestedFrom <= requestedTo) {
    return {
      range,
      from: requestedFrom,
      to: requestedTo,
      label: `${formatRangeDate(requestedFrom)} – ${formatRangeDate(requestedTo)}`,
    };
  }

  const from = `${today.slice(0, 7)}-01`;
  return { range: "this_month", from, to: today, label: `${formatRangeDate(from)} – ${formatRangeDate(today)}` };
}

function financialDateFor(row: VendorFinanceTransactionRow): string {
  return getAlbaniaDateInputValue(row.paymentEffectiveAt ?? row.createdAt);
}

function transactionState(row: VendorFinanceTransactionRow): VendorFinanceTransaction["state"] {
  if (!row.paymentStatus) return row.bookingStatus === "confirmed" ? "missing" : "closed";
  if (row.paymentStatus === "paid" && row.bookingStatus === "confirmed") return "collected";
  if (row.paymentStatus === "paid" && row.bookingStatus === "cancelled") return "review";
  if ((row.paymentStatus === "pending" || row.paymentStatus === "authorized") && row.bookingStatus === "confirmed") return "pending";
  return "closed";
}

function addMonths(monthInput: string, amount: number): string {
  const date = new Date(`${monthInput}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

function buildTrend(transactions: VendorFinanceTransaction[], period: VendorFinancePeriod) {
  const collected = transactions.filter((transaction) => transaction.state === "collected");
  const today = getAlbaniaDateInputValue();
  const oldestDate = transactions.at(-1)?.financialDate ?? `${today.slice(0, 7)}-01`;
  const from = period.from ?? oldestDate;
  const to = period.to ?? today;
  const granularity: "day" | "month" = daysBetween(from, to) <= 45 ? "day" : "month";
  const totals = new Map<string, number>();

  for (const transaction of collected) {
    const key = granularity === "day" ? transaction.financialDate : transaction.financialDate.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + transaction.operatorEarningsEur);
  }

  const trend: Array<{ key: string; label: string; earningsEur: number }> = [];
  if (granularity === "day") {
    for (let key = from; key <= to; key = shiftDate(key, 1)) {
      const label = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
        new Date(`${key}T00:00:00Z`)
      );
      trend.push({ key, label, earningsEur: totals.get(key) ?? 0 });
    }
  } else {
    const lastMonth = to.slice(0, 7);
    for (let key = from.slice(0, 7); key <= lastMonth; key = addMonths(key, 1)) {
      const label = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
        new Date(`${key}-01T00:00:00Z`)
      );
      trend.push({ key, label, earningsEur: totals.get(key) ?? 0 });
    }
  }

  return { trend, granularity };
}

export function buildVendorFinanceView(
  rows: VendorFinanceTransactionRow[],
  period: VendorFinancePeriod
): VendorFinanceView {
  const transactions = rows
    .map<VendorFinanceTransaction>((row) => {
      const grossEur = row.paymentAmount && row.paymentCurrency
        ? paymentAmountInEur(row.paymentAmount, row.paymentCurrency)
        : 0;
      const state = transactionState(row);
      const platformFeeEur = state === "collected" ? Math.min(BUS_BOOKING_SERVICE_FEE_EUR, grossEur) : 0;
      return {
        ...row,
        financialDate: financialDateFor(row),
        grossEur,
        platformFeeEur,
        operatorEarningsEur: state === "collected" ? Math.max(0, grossEur - platformFeeEur) : 0,
        state,
      };
    })
    .filter((transaction) => {
      if (period.from && transaction.financialDate < period.from) return false;
      if (period.to && transaction.financialDate > period.to) return false;
      return true;
    })
    .sort((a, b) => b.financialDate.localeCompare(a.financialDate) || b.bookingId - a.bookingId);

  const collected = transactions.filter((transaction) => transaction.state === "collected");
  const pending = transactions.filter((transaction) => transaction.state === "pending");
  const operatorEarningsEur = collected.reduce((sum, transaction) => sum + transaction.operatorEarningsEur, 0);
  const { trend, granularity } = buildTrend(transactions, period);

  const routeMap = new Map<string, VendorFinanceView["routes"][number]>();
  for (const transaction of collected) {
    const existing = routeMap.get(transaction.routeCode) ?? {
      routeCode: transaction.routeCode,
      fromStationName: transaction.fromStationName,
      toStationName: transaction.toStationName,
      earningsEur: 0,
      bookings: 0,
      seats: 0,
      share: 0,
    };
    existing.earningsEur += transaction.operatorEarningsEur;
    existing.bookings += 1;
    existing.seats += transaction.seats;
    routeMap.set(transaction.routeCode, existing);
  }

  const routes = [...routeMap.values()]
    .map((route) => ({ ...route, share: operatorEarningsEur > 0 ? route.earningsEur / operatorEarningsEur : 0 }))
    .sort((a, b) => b.earningsEur - a.earningsEur);

  return {
    transactions,
    summary: {
      grossCollectedEur: collected.reduce((sum, transaction) => sum + transaction.grossEur, 0),
      platformFeesEur: collected.reduce((sum, transaction) => sum + transaction.platformFeeEur, 0),
      operatorEarningsEur,
      pendingAmountEur: pending.reduce((sum, transaction) => sum + transaction.grossEur, 0),
      paidBookings: collected.length,
      seatsSold: collected.reduce((sum, transaction) => sum + transaction.seats, 0),
      reviewCount: transactions.filter((transaction) => transaction.state === "review").length,
      missingPaymentCount: transactions.filter((transaction) => transaction.state === "missing").length,
    },
    trend,
    trendGranularity: granularity,
    routes,
  };
}
