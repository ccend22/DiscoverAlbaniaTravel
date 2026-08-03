import { redirect } from "next/navigation";
import { getVendorContext, listStationOptions, listVendorDepartures, listVendorRoutes } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { VendorDeparturesTable } from "@/components/vendor-departures-table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  logoutVendorAction,
  createVendorDepartureAction,
  createVendorRouteAction,
  updateVendorDepartureAction,
  updateVendorOperatorAction,
} from "./actions";

interface VendorPageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function VendorPage({ searchParams }: VendorPageProps) {
  const vendorUserId = await requireVendorSession();
  const [context, departures, vendorRoutes, stationOptions, params] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorDepartures(vendorUserId),
    listVendorRoutes(vendorUserId),
    listStationOptions(),
    searchParams,
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

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
        <h2 className="font-display text-lg font-semibold text-foreground">Operator profile</h2>
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
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Phone</span>
            <input
              name="phone"
              defaultValue={context.operatorPhone ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={context.operatorEmail ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Street</span>
            <input
              name="street"
              defaultValue={context.operatorStreet ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">City</span>
            <input
              name="city"
              defaultValue={context.operatorCity ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Save operator</Button>
          </div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Add service</h2>
        <p className="mt-1 text-sm text-muted">Create a route first, then add one or more scheduled departures.</p>
        <form action={createVendorRouteAction} className="mt-4 grid gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-[180px_1fr_auto]">
          <input name="code" required placeholder="Route code" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="longName" required placeholder="Route name, e.g. Tirana to Vlore" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Add route</Button>
        </form>

        <form action={createVendorDepartureAction} className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Route</span><select name="routeId" required className="rounded-md border border-border bg-background px-3 py-2"><option value="">Choose route</option>{vendorRoutes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.longName}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Origin</span><select name="fromStationId" required className="rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Destination</span><select name="toStationId" required className="rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Seats</span><input name="plannedSeats" type="number" min="1" max="500" defaultValue="50" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Departure</span><input name="departureTime" type="time" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Arrival</span><input name="arrivalTime" type="time" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Duration (minutes)</span><input name="durationMin" type="number" min="1" max="1440" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Distance (km)</span><input name="distanceKm" type="number" min="0.1" step="0.1" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Price (ALL)</span><input name="basePrice" type="number" min="0" step="0.01" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <fieldset className="lg:col-span-3"><legend className="text-sm font-medium">Operating days</legend><div className="mt-2 flex flex-wrap gap-3">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <label key={day} className="flex items-center gap-1.5 text-sm"><input name="weekdays" type="checkbox" value={index + 1} className="accent-teal" />{day}</label>)}</div></fieldset>
          <div className="lg:col-span-4"><Button type="submit" size="sm" disabled={vendorRoutes.length === 0}>Add departure</Button></div>
        </form>
      </section>

      <section className="py-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Departures</h2>
        <p className="mt-1 text-sm text-muted">
          Manage price, seats, schedule, and boarding status for your own routes.
        </p>
        <div className="mt-4">
          <VendorDeparturesTable
            departures={departures}
            updateAction={updateVendorDepartureAction}
          />
        </div>
      </section>
    </div>
  );
}
