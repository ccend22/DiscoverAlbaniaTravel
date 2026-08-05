import { redirect } from "next/navigation";
import {
  getVendorContext,
  listStationOptions,
  listVendorBookings,
  listVendorDepartures,
  listVendorRoutes,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { VendorDeparturesTable } from "@/components/vendor-departures-table";
import { VendorBookingsTable } from "@/components/vendor-bookings-table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BuildingIcon, BusIcon, MapPinIcon, TicketIcon, UsersIcon } from "@/components/icons";
import {
  logoutVendorAction,
  createVendorDepartureAction,
  createVendorRouteAction,
  updateVendorDepartureAction,
  updateVendorOperatorAction,
} from "./actions";

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const STAT_ACCENTS = {
  teal: { badge: "bg-teal-soft text-teal", bar: "bg-teal", glow: "hover:shadow-[var(--shadow-glow-teal)]" },
  sky: { badge: "bg-sky-soft text-sky", bar: "bg-sky", glow: "hover:shadow-[var(--shadow-glow-sky)]" },
  coral: { badge: "bg-coral-soft text-coral", bar: "bg-coral", glow: "hover:shadow-[var(--shadow-glow-coral)]" },
  gold: { badge: "bg-gold-soft text-gold", bar: "bg-gold", glow: "hover:shadow-[var(--shadow-glow-gold)]" },
} as const;

function SectionHeading({
  icon: Icon,
  tone,
  title,
  subtitle,
}: {
  icon: (props: { width?: number; height?: number }) => React.ReactNode;
  tone: keyof typeof STAT_ACCENTS;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${STAT_ACCENTS[tone].badge}`}>
        <Icon width={17} height={17} />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

interface VendorPageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function VendorPage({ searchParams }: VendorPageProps) {
  const vendorUserId = await requireVendorSession();
  const [context, departures, vendorRoutes, stationOptions, vendorBookings, params] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorDepartures(vendorUserId),
    listVendorRoutes(vendorUserId),
    listStationOptions(),
    listVendorBookings(vendorUserId),
    searchParams,
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
      <div className="flex animate-fade-up flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">Bus operations</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{context.operatorName}</h1>
          <p className="mt-1 text-sm text-muted">{context.vendorEmail}</p>
        </div>
        <form action={logoutVendorAction}>
          <Button variant="outline">Sign out</Button>
        </form>
      </div>

      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">Changes saved.</Alert>
        </div>
      )}
      {params.error && (
        <div className="mt-6">
          <Alert tone="error">{params.error}</Alert>
        </div>
      )}

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
        <SectionHeading icon={BuildingIcon} tone="teal" title="Operator profile" />
        <form
          action={updateVendorOperatorAction}
          className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Operator name</span>
            <input
              name="name"
              required
              defaultValue={context.operatorName}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Phone</span>
            <input
              name="phone"
              defaultValue={context.operatorPhone ?? ""}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={context.operatorEmail ?? ""}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Street</span>
            <input
              name="street"
              defaultValue={context.operatorStreet ?? ""}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">City</span>
            <input
              name="city"
              defaultValue={context.operatorCity ?? ""}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Save operator</Button>
          </div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <SectionHeading icon={MapPinIcon} tone="sky" title="Add service" subtitle="Create a route first, then add one or more scheduled departures." />

        <form action={createVendorRouteAction} className="mt-4 grid gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-[180px_1fr_auto]">
          <input name="code" required placeholder="Route code" className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="longName" required placeholder="Route name, e.g. Tirana to Vlore" className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="sm:self-center">Add route</Button>
        </form>

        <form action={createVendorDepartureAction} className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Route</span><select name="routeId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose route</option>{vendorRoutes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.longName}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Origin</span><select name="fromStationId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Destination</span><select name="toStationId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Seats</span><input name="plannedSeats" type="number" min="1" max="500" defaultValue="50" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Departure</span><input name="departureTime" type="time" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Arrival</span><input name="arrivalTime" type="time" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Duration (minutes)</span><input name="durationMin" type="number" min="1" max="1440" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Distance (km)</span><input name="distanceKm" type="number" min="0.1" step="0.1" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Price (ALL)</span><input name="basePrice" type="number" min="0" step="0.01" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <fieldset className="lg:col-span-3"><legend className="text-sm font-medium">Operating days</legend><div className="mt-2 flex flex-wrap gap-3">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <label key={day} className="flex items-center gap-1.5 text-sm"><input name="weekdays" type="checkbox" value={index + 1} className="accent-teal" />{day}</label>)}</div></fieldset>
          <div className="lg:col-span-4"><Button type="submit" size="sm" disabled={vendorRoutes.length === 0}>Add departure</Button></div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <SectionHeading icon={BusIcon} tone="gold" title="Departures" subtitle="Manage price, seats, schedule, and boarding status for your own routes." />
        <div className="mt-4">
          <VendorDeparturesTable
            departures={departures}
            updateAction={updateVendorDepartureAction}
          />
        </div>
      </section>

      <section className="border-t border-border py-8">
        <SectionHeading icon={TicketIcon} tone="coral" title="Bookings" subtitle="Passengers who booked a seat on your departures." />
        <div className="mt-4">
          <VendorBookingsTable bookings={vendorBookings} />
        </div>
      </section>
    </div>
  );
}
