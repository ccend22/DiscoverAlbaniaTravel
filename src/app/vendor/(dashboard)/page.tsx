import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getVendorContext,
  listVendorBookings,
  listVendorDepartures,
  listVendorRoutes,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { BusIcon, MapPinIcon, TicketIcon, UsersIcon } from "@/components/icons";

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const STAT_ACCENTS = {
  teal: { badge: "bg-teal-soft text-teal", bar: "bg-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]" },
  sky: { badge: "bg-sky-soft text-sky", bar: "bg-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]" },
  coral: { badge: "bg-coral-soft text-coral", bar: "bg-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]" },
  gold: { badge: "bg-gold-soft text-gold", bar: "bg-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]" },
} as const;

export default async function VendorOverviewPage() {
  const vendorUserId = await requireVendorSession();
  const [context, departures, vendorRoutes, vendorBookings] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorDepartures(vendorUserId),
    listVendorRoutes(vendorUserId),
    listVendorBookings(vendorUserId),
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = vendorBookings.filter((b) => b.status === "confirmed" && b.travelDate >= today);
  const upcomingSeats = upcomingBookings.reduce((sum, b) => sum + b.seats, 0);

  const statItems = [
    { label: "Routes", value: vendorRoutes.length, icon: MapPinIcon, tone: "teal" as const },
    { label: "Departures", value: departures.length, icon: BusIcon, tone: "sky" as const },
    { label: "Upcoming bookings", value: upcomingBookings.length, icon: TicketIcon, tone: "coral" as const },
    { label: "Seats booked (upcoming)", value: upcomingSeats, icon: UsersIcon, tone: "gold" as const },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="animate-fade-up border-b border-border pb-6">
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

      <section className="py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon, tone }) => {
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
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Quick links</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Link href="/vendor/routes" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            <p className="font-medium text-foreground">Manage routes & stops</p>
            <p className="mt-1 text-sm text-muted">Add intermediate stops with timing and fares.</p>
          </Link>
          <Link href="/vendor/departures" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            <p className="font-medium text-foreground">Manage departures</p>
            <p className="mt-1 text-sm text-muted">Adjust schedule, price, seats, and boarding.</p>
          </Link>
          <Link href="/vendor/bookings/new" className="card-lift rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            <p className="font-medium text-foreground">Add a manual booking</p>
            <p className="mt-1 text-sm text-muted">Record a phone-in or walk-in reservation.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
