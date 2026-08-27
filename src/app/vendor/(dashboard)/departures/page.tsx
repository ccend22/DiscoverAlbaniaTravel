import Link from "next/link";
import {
  listStationOptions,
  listVendorDepartures,
  listVendorRoutes,
} from "@/db/queries/vendors";
import { requireVendorPermission } from "@/lib/vendor-access";
import { VendorDeparturesTable } from "@/components/vendor-departures-table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createVendorDepartureAction, updateVendorDepartureAction } from "../../actions";

export default async function VendorDeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { vendorUserId } = await requireVendorPermission("departures");
  const [departures, vendorRoutes, stationOptions, params] = await Promise.all([
    listVendorDepartures(vendorUserId),
    listVendorRoutes(vendorUserId),
    listStationOptions(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Departures</h1>
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
        <h2 className="text-lg font-semibold text-foreground">Add a departure</h2>
        <p className="mt-1 text-sm text-muted">
          Need a new route first?{" "}
          <Link href="/vendor/routes" className="font-medium text-teal hover:underline">
            Create one here
          </Link>
          .
        </p>
        <form action={createVendorDepartureAction} className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Route</span><select name="routeId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose route</option>{vendorRoutes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.longName}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Origin</span><select name="fromStationId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Destination</span><select name="toStationId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2"><option value="">Choose station</option>{stationOptions.map((station) => <option key={station.id} value={station.id}>{station.city} · {station.name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Seats</span><input name="plannedSeats" type="number" min="1" max="500" defaultValue="50" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Departure</span><input name="departureTime" type="time" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Arrival</span><input name="arrivalTime" type="time" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Duration (minutes)</span><input name="durationMin" type="number" min="1" max="1440" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Distance (km)</span><input name="distanceKm" type="number" min="0.1" step="0.1" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Price (EUR)</span><input name="basePrice" type="number" min="0" step="0.01" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" /></label>
          <fieldset className="lg:col-span-3"><legend className="text-sm font-medium">Operating days</legend><div className="mt-2 flex flex-wrap gap-3">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <label key={day} className="flex items-center gap-1.5 text-sm"><input name="weekdays" type="checkbox" value={index + 1} className="accent-teal" />{day}</label>)}</div></fieldset>
          <div className="lg:col-span-4"><Button type="submit" size="sm" disabled={vendorRoutes.length === 0}>Add departure</Button></div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Your departures</h2>
        <p className="mt-1 text-sm text-muted">Manage price, seats, schedule, and boarding status for your own routes.</p>
        <div className="mt-4">
          <VendorDeparturesTable departures={departures} updateAction={updateVendorDepartureAction} />
        </div>
      </section>
    </div>
  );
}
