import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getVendorContext,
  getVendorDailyOverview,
  getVendorMonthOverview,
  listVendorRoutes,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { vendorHasPermission } from "@/lib/vendor-permissions";
import { BusIcon, MapPinIcon, PlusIcon, QrCodeIcon, TicketIcon, UsersIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import { OverviewMonthCalendar } from "@/components/overview-month-calendar";
import { formatDateLong } from "@/lib/format";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const STAT_ACCENTS = {
  teal: { badge: "bg-teal-soft text-teal", bar: "bg-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]" },
  sky: { badge: "bg-sky-soft text-sky", bar: "bg-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]" },
  coral: { badge: "bg-coral-soft text-coral", bar: "bg-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]" },
  gold: { badge: "bg-gold-soft text-gold", bar: "bg-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]" },
} as const;

export default async function VendorOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const today = getAlbaniaDateInputValue();
  const { date: dateParam, month: monthParam } = await searchParams;
  const date = dateParam || today;
  const month = monthParam || date.slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);

  const [context, vendorRoutes, daily, monthDays] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorRoutes(vendorUserId),
    getVendorDailyOverview(vendorUserId, date),
    getVendorMonthOverview(vendorUserId, year, monthNum),
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  const canScan = vendorHasPermission(context, "scanner");
  const canBook = vendorHasPermission(context, "bookings");

  const statItems = [
    { label: "Routes", value: vendorRoutes.length, icon: MapPinIcon, tone: "teal" as const },
    { label: "Departures today", value: daily?.departuresRunning ?? 0, icon: BusIcon, tone: "sky" as const },
    { label: "Bookings today", value: daily?.bookingsCount ?? 0, icon: TicketIcon, tone: "coral" as const },
    {
      label: "Seats booked today",
      value: daily?.seatsBooked ?? 0,
      sublabel: daily ? `${daily.checkedIn} checked in · ${daily.occupancyPercent}% occupancy` : undefined,
      icon: UsersIcon,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="animate-fade-up flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">Bus operations</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{context.operatorName}</h1>
            {context.operatorRatingCount > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-sm font-semibold text-gold">
                <span aria-hidden="true">★</span>
                {Number(context.operatorRating).toFixed(1)}
                <span className="font-normal text-gold/80">({context.operatorRatingCount})</span>
              </span>
            ) : (
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-muted">No ratings yet</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{context.vendorEmail}</p>
        </div>
        {(canScan || canBook) && (
          <div className="flex flex-wrap gap-2">
            {canScan && (
              <LinkButton href="/vendor/scanner" variant="outline" size="sm">
                <QrCodeIcon width={16} height={16} />
                Scan ticket
              </LinkButton>
            )}
            {canBook && (
              <LinkButton href="/vendor/bookings/new" size="sm">
                <PlusIcon width={16} height={16} />
                New manual booking
              </LinkButton>
            )}
          </div>
        )}
      </div>

      <section className="pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <OverviewMonthCalendar selectedDate={date} month={month} today={today} days={monthDays} />

          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Showing {formatDateLong(date)}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {statItems.map(({ label, value, sublabel, icon: Icon, tone }) => {
                const accent = STAT_ACCENTS[tone];
                return (
                  <div
                    key={label}
                    className={`card-lift relative overflow-hidden rounded-lg border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-sm)] ${accent.glow}`}
                  >
                    <span className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} aria-hidden="true" />
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${accent.badge}`}>
                      <Icon width={18} height={18} />
                    </span>
                    <p className="mt-3 font-display text-2xl font-bold text-brand-strong">{value}</p>
                    <p className="mt-1 text-sm text-muted">{label}</p>
                    {sublabel && <p className="mt-0.5 text-xs text-muted/80">{sublabel}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {(vendorHasPermission(context, "routes") || vendorHasPermission(context, "departures")) && (
        <section className="border-t border-border py-8">
          <h2 className="text-lg font-semibold text-foreground">Quick links</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {vendorHasPermission(context, "routes") && (
              <Link href="/vendor/routes" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
                <p className="font-medium text-foreground">Manage routes & stops</p>
                <p className="mt-1 text-sm text-muted">Add intermediate stops with timing and fares.</p>
              </Link>
            )}
            {vendorHasPermission(context, "departures") && (
              <Link href="/vendor/departures" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
                <p className="font-medium text-foreground">Manage departures</p>
                <p className="mt-1 text-sm text-muted">Adjust schedule, price, seats, and boarding.</p>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
