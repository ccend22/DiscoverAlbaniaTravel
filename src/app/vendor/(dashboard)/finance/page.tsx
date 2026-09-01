import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AlertCircleIcon, InfoIcon } from "@/components/icons";
import { listVendorFinanceTransactions } from "@/db/queries/vendors";
import { requireVendorPermission } from "@/lib/vendor-access";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { BUS_BOOKING_SERVICE_FEE_EUR } from "@/lib/service-fees";
import {
  buildVendorFinanceView,
  resolveVendorFinancePeriod,
  type VendorFinanceRange,
  type VendorFinanceTransaction,
} from "@/lib/vendor-finance";

const RANGE_OPTIONS: Array<{ value: VendorFinanceRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "this_month", label: "This month" },
  { value: "all", label: "All time" },
];

const CHANNEL_LABELS: Record<VendorFinanceTransaction["channel"], string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  touch_screen: "Touch screen",
  mobile: "Mobile app",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function financeHref(range: VendorFinanceRange): string {
  return range === "this_month" ? "/vendor/finance" : `/vendor/finance?range=${range}`;
}

function paymentBadge(transaction: VendorFinanceTransaction): { label: string; tone: BadgeTone } {
  if (transaction.state === "collected") return { label: "Paid", tone: "success" };
  if (transaction.state === "review") return { label: "Refund review", tone: "danger" };
  if (transaction.state === "missing") return { label: "No payment", tone: "warning" };
  if (transaction.paymentStatus === "authorized") return { label: "Authorized", tone: "info" };
  if (transaction.paymentStatus === "pending") return { label: "Pending", tone: "warning" };
  if (transaction.paymentStatus === "refunded") return { label: "Refunded", tone: "neutral" };
  if (transaction.paymentStatus === "failed") return { label: "Failed", tone: "danger" };
  if (transaction.paymentStatus === "cancelled") return { label: "Cancelled", tone: "neutral" };
  return { label: "Closed", tone: "neutral" };
}

interface VendorFinanceDashboardProps {
  operatorName: string;
  rows: Awaited<ReturnType<typeof listVendorFinanceTransactions>>;
  params: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
}

function VendorFinanceDashboard({
  operatorName,
  rows,
  params,
}: {
  operatorName: VendorFinanceDashboardProps["operatorName"];
  rows: VendorFinanceDashboardProps["rows"];
  params: VendorFinanceDashboardProps["params"];
}) {
  const period = resolveVendorFinancePeriod(
    firstParam(params.range),
    firstParam(params.from),
    firstParam(params.to)
  );
  const finance = buildVendorFinanceView(rows, period);
  const { summary } = finance;
  const maxTrendValue = Math.max(...finance.trend.map((item) => item.earningsEur), 0);
  const needsAttention = summary.reviewCount + summary.missingPaymentCount;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="animate-fade-up border-b border-border pb-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-[-0.025em] text-foreground">Finance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Paid ticket income for {operatorName}, with platform fees separated from your operator earnings.
            </p>
          </div>
          <nav className="flex flex-wrap gap-1.5" aria-label="Finance period">
            {RANGE_OPTIONS.map((option) => {
              const active = period.range === option.value;
              return (
                <Link
                  key={option.value}
                  href={financeHref(option.value)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)] ${
                    active
                      ? "bg-brand text-brand-foreground shadow-[var(--shadow-xs)]"
                      : "bg-surface-sunken text-muted hover:bg-brand-soft hover:text-foreground"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 rounded-xl bg-surface-sunken p-3 sm:flex-row sm:items-end">
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">From</span>
            <input
              type="date"
              name="from"
              defaultValue={period.range === "custom" ? period.from ?? "" : ""}
              required
              className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">To</span>
            <input
              type="date"
              name="to"
              defaultValue={period.range === "custom" ? period.to ?? "" : ""}
              required
              className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>
          <button className="min-h-11 rounded-md bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
            Apply dates
          </button>
        </form>
      </header>

      <p className="mt-6 text-sm font-medium text-muted">Showing {period.label}</p>

      <section className="mt-3 grid overflow-hidden rounded-xl bg-brand-deep text-white shadow-[var(--shadow-md)] lg:grid-cols-[1.15fr_1fr]" aria-labelledby="finance-summary-title">
        <div className="flex min-h-[250px] flex-col justify-between p-6 sm:p-8">
          <div>
            <h2 id="finance-summary-title" className="text-sm font-semibold text-white/75">Operator earnings</h2>
            <p className="mt-3 font-display text-4xl font-bold tracking-[-0.035em] tabular-nums sm:text-5xl">
              {formatCurrency(summary.operatorEarningsEur)}
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
              Money collected from paid, confirmed tickets after the {formatCurrency(BUS_BOOKING_SERVICE_FEE_EUR)} platform service fee. Fuel, salaries, taxes, and other operating costs are not tracked yet.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-sm">
            <p><span className="block text-white/60">Paid bookings</span><strong className="mt-0.5 block text-lg tabular-nums">{summary.paidBookings}</strong></p>
            <p><span className="block text-white/60">Seats sold</span><strong className="mt-0.5 block text-lg tabular-nums">{summary.seatsSold}</strong></p>
          </div>
        </div>

        <dl className="grid border-t border-white/15 bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
          <div className="p-5 sm:p-6">
            <dt className="text-sm text-white/65">Gross collected</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(summary.grossCollectedEur)}</dd>
            <p className="mt-1 text-xs text-white/55">Customer payments received</p>
          </div>
          <div className="border-t border-white/15 p-5 sm:border-l sm:border-t-0 sm:p-6 lg:border-l-0 lg:border-t">
            <dt className="text-sm text-white/65">Platform fees</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">−{formatCurrency(summary.platformFeesEur)}</dd>
            <p className="mt-1 text-xs text-white/55">{formatCurrency(BUS_BOOKING_SERVICE_FEE_EUR)} per paid booking</p>
          </div>
          <div className="border-t border-white/15 p-5 sm:border-l sm:border-t-0 sm:p-6 lg:border-l-0 lg:border-t">
            <dt className="text-sm text-white/65">Awaiting payment</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-gold-soft">{formatCurrency(summary.pendingAmountEur)}</dd>
            <p className="mt-1 text-xs text-white/55">Not included in earnings</p>
          </div>
        </dl>
      </section>

      {needsAttention > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
          <AlertCircleIcon width={20} height={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{needsAttention} transaction{needsAttention === 1 ? "" : "s"} need attention</p>
            <p className="mt-1 leading-6 text-warning/85">
              {summary.reviewCount > 0 && `${summary.reviewCount} paid cancelled booking${summary.reviewCount === 1 ? "" : "s"} may need a refund. `}
              {summary.missingPaymentCount > 0 && `${summary.missingPaymentCount} confirmed booking${summary.missingPaymentCount === 1 ? " has" : "s have"} no payment record.`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 grid min-w-0 max-w-full gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className="min-w-0" aria-labelledby="earnings-trend-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="earnings-trend-title" className="text-lg font-semibold text-foreground">Earnings trend</h2>
              <p className="mt-1 text-sm text-muted">Operator earnings grouped by {finance.trendGranularity}.</p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-teal">{formatCurrency(summary.operatorEarningsEur)} total</p>
          </div>

          <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            {finance.trend.some((item) => item.earningsEur > 0) ? (
              <div
                className="flex h-64 items-end gap-2"
                style={{ minWidth: `${Math.max(560, finance.trend.length * 44)}px` }}
                role="img"
                aria-label={`Operator earnings trend for ${period.label}`}
              >
                {finance.trend.map((item) => {
                  const height = maxTrendValue > 0 ? Math.max(3, (item.earningsEur / maxTrendValue) * 100) : 0;
                  return (
                    <div key={item.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end text-center" title={`${item.label}: ${formatCurrency(item.earningsEur)}`}>
                      <span className="sr-only">{item.label}: {formatCurrency(item.earningsEur)}</span>
                      <span className="mb-2 hidden text-[11px] font-semibold tabular-nums text-foreground group-hover:block sm:group-focus-within:block">
                        {item.earningsEur > 0 ? formatCurrency(item.earningsEur) : ""}
                      </span>
                      <span
                        aria-hidden="true"
                        className="min-h-0 rounded-t-md bg-teal transition-[filter] duration-[var(--dur-fast)] group-hover:brightness-110"
                        style={{ height: `${height}%` }}
                      />
                      <span className="mt-2 truncate text-[11px] text-muted">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <p className="font-medium text-foreground">No paid income in this period</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted">Paid and confirmed bookings will appear here as soon as a payment is recorded.</p>
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0" aria-labelledby="route-performance-title">
          <h2 id="route-performance-title" className="text-lg font-semibold text-foreground">Route performance</h2>
          <p className="mt-1 text-sm text-muted">Ranked by operator earnings.</p>
          <div className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            {finance.routes.length > 0 ? (
              <ol className="space-y-5">
                {finance.routes.slice(0, 6).map((route) => (
                  <li key={route.routeCode}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{route.routeCode}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{route.fromStationName} → {route.toStationName}</p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrency(route.earningsEur)}</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${Math.max(3, route.share * 100)}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{route.bookings} booking{route.bookings === 1 ? "" : "s"} · {route.seats} seat{route.seats === 1 ? "" : "s"}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <p className="font-medium text-foreground">No route income yet</p>
                <p className="mt-1 text-sm leading-6 text-muted">This ranking starts after the first paid booking.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 min-w-0 max-w-full border-t border-border pt-8" aria-labelledby="transaction-ledger-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="transaction-ledger-title" className="text-lg font-semibold text-foreground">Transaction ledger</h2>
            <p className="mt-1 text-sm text-muted">Latest payment state for each booking in this period.</p>
          </div>
          <div className="text-xs text-muted sm:text-right">
            <p>Showing up to 100 most recent entries</p>
            <p className="mt-1 sm:hidden">Swipe sideways to see status and amounts.</p>
          </div>
        </div>

        <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="border-b border-border bg-surface-sunken/70 text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Payment date</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 text-right font-medium">Platform fee</th>
                <th className="px-4 py-3 text-right font-medium">Operator earnings</th>
              </tr>
            </thead>
            <tbody>
              {finance.transactions.slice(0, 100).map((transaction) => {
                const badge = paymentBadge(transaction);
                return (
                  <tr key={transaction.bookingId} className="border-b border-border last:border-0 hover:bg-surface-sunken/60">
                    <td className="px-4 py-3 text-muted">{formatDateShort(transaction.financialDate)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/ticket/${transaction.bookingReference}`} target="_blank" rel="noreferrer" title="Open and print QR ticket" className="font-mono text-xs font-semibold text-teal underline decoration-teal/30 underline-offset-4 hover:decoration-teal">
                        {transaction.bookingReference}
                      </Link>
                      <p className="mt-1 text-xs text-muted">Travel {formatDateShort(transaction.travelDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{transaction.routeCode}</p>
                      <p className="mt-0.5 max-w-[210px] truncate text-xs text-muted">{transaction.fromStationName} → {transaction.toStationName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{CHANNEL_LABELS[transaction.channel]}</td>
                    <td className="px-4 py-3"><Badge tone={badge.tone}>{badge.label}</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {transaction.paymentAmount ? formatCurrency(transaction.grossEur) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {transaction.state === "collected" ? `−${formatCurrency(transaction.platformFeeEur)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {transaction.state === "collected" ? formatCurrency(transaction.operatorEarningsEur) : "—"}
                    </td>
                  </tr>
                );
              })}
              {finance.transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="font-medium text-foreground">No transactions in this period</p>
                    <p className="mt-1 text-sm text-muted">Choose another date range to review older activity.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="mt-6 flex items-start gap-3 text-sm leading-6 text-muted">
        <InfoIcon width={18} height={18} className="mt-0.5 shrink-0 text-teal" />
        <p>
          Finance uses the latest payment attempt per booking and the payment settlement date. “Operator earnings” means collected ticket income after the platform service fee, before your own operating costs; it is not accounting profit.
        </p>
      </aside>
    </div>
  );
}

export default async function VendorFinancePage({
  searchParams,
}: {
  searchParams: Promise<VendorFinanceDashboardProps["params"]>;
}) {
  const { vendorUserId, context } = await requireVendorPermission("finance");
  const [rows, params] = await Promise.all([
    listVendorFinanceTransactions(vendorUserId),
    searchParams,
  ]);

  return <VendorFinanceDashboard operatorName={context.operatorName} rows={rows} params={params} />;
}
