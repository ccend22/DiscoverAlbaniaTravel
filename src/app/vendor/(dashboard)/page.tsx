import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getVendorContext,
  getVendorDailyOverview,
  listVendorBookings,
  listVendorRoutes,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { vendorHasPermission } from "@/lib/vendor-permissions";
import { BusIcon, MapPinIcon, PlusIcon, QrCodeIcon, TicketIcon, UsersIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import { DateNavInput } from "@/components/date-nav-input";
import { VendorBookingsTable } from "@/components/vendor-bookings-table";
import { formatDateLong } from "@/lib/format";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import {
  cancelVendorBookingAction,
  getVendorBookingTicketAction,
  markVendorBookingPaidAction,
  updateVendorBookingAction,
} from "../actions";

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
  searchParams: Promise<{ date?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const today = getAlbaniaDateInputValue();
  const { date: dateParam } = await searchParams;
  const date = dateParam || today;

  const [context, vendorRoutes, daily, dateBookings] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorRoutes(vendorUserId),
    getVendorDailyOverview(vendorUserId, date),
    listVendorBookings(vendorUserId, date),
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  const canScan = vendorHasPermission(context, "scanner");
  const canBook = vendorHasPermission(context, "bookings");

  const statItems = [
    { label: "Linja", value: vendorRoutes.length, icon: MapPinIcon, tone: "teal" as const },
    { label: "Nisje sot", value: daily?.departuresRunning ?? 0, icon: BusIcon, tone: "sky" as const },
    { label: "Rezervime sot", value: daily?.bookingsCount ?? 0, icon: TicketIcon, tone: "coral" as const },
    {
      label: "Vende të rezervuara sot",
      value: daily?.seatsBooked ?? 0,
      sublabel: daily ? `${daily.checkedIn} check-in · ${daily.occupancyPercent}% e mbushur` : undefined,
      icon: UsersIcon,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="animate-fade-up flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">Operator autobusësh</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{context.operatorName}</h1>
            {context.operatorRatingCount > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-sm font-semibold text-gold">
                <span aria-hidden="true">★</span>
                {Number(context.operatorRating).toFixed(1)}
                <span className="font-normal text-gold/80">({context.operatorRatingCount})</span>
              </span>
            ) : (
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-muted">Ende pa vlerësime</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{context.vendorEmail}</p>
        </div>
        {(canScan || canBook) && (
          <div className="flex flex-wrap gap-2">
            {canScan && (
              <LinkButton href="/vendor/scanner" variant="outline" size="sm">
                <QrCodeIcon width={16} height={16} />
                Skano biletën
              </LinkButton>
            )}
            {canBook && (
              <LinkButton href="/vendor/bookings/new" size="sm">
                <PlusIcon width={16} height={16} />
                Rezervim i ri manual
              </LinkButton>
            )}
          </div>
        )}
      </div>

      <section className="pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <DateNavInput date={date} />
          {date !== today && (
            <Link href="/vendor" className="text-sm font-medium text-teal hover:underline">
              Sot
            </Link>
          )}
          <p className="text-sm text-muted">Duke shfaqur {formatDateLong(date, "al")}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      {vendorHasPermission(context, "bookings") && (
        <section className="border-t border-border py-8">
          <h2 className="text-lg font-semibold text-foreground">Rezervimet më {formatDateLong(date, "al")}</h2>
          <div className="mt-4">
            <VendorBookingsTable
              bookings={dateBookings}
              updateAction={updateVendorBookingAction}
              cancelAction={cancelVendorBookingAction}
              markPaidAction={markVendorBookingPaidAction}
              loadTicket={getVendorBookingTicketAction}
            />
          </div>
        </section>
      )}

      {(vendorHasPermission(context, "routes") || vendorHasPermission(context, "departures")) && (
        <section className="border-t border-border py-8">
          <h2 className="text-lg font-semibold text-foreground">Lidhje të shpejta</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {vendorHasPermission(context, "routes") && (
              <Link href="/vendor/routes" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
                <p className="font-medium text-foreground">Menaxho linjat dhe stacionet</p>
                <p className="mt-1 text-sm text-muted">Shto ndalesa të ndërmjetme me kohë dhe çmime.</p>
              </Link>
            )}
            {vendorHasPermission(context, "departures") && (
              <Link href="/vendor/departures" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
                <p className="font-medium text-foreground">Menaxho nisjet</p>
                <p className="mt-1 text-sm text-muted">Përshtat orarin, çmimin, vendet dhe hipjen.</p>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
