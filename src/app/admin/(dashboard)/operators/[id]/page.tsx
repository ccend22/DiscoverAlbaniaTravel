import { notFound } from "next/navigation";
import Link from "next/link";
import { VendorDeparturesTable } from "@/components/vendor-departures-table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  getOperatorForAdmin,
  listDeparturesForAdminOperator,
  listRoutesForAdminOperator,
} from "@/db/queries/admin";
import { listStationOptions } from "@/db/queries/vendors";
import {
  updateAdminDepartureAction,
  updateAdminOperatorAction,
  updateAdminRouteAction,
  deleteAdminOperatorAction,
  createAdminRouteAction,
  deleteAdminRouteAction,
  createAdminDepartureAction,
  deleteAdminDepartureAction,
} from "@/app/admin/actions";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export default async function AdminOperatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const operatorId = Number(id);
  if (!Number.isInteger(operatorId)) notFound();
  const [operator, routes, departures, stationOptions, query] = await Promise.all([
    getOperatorForAdmin(operatorId),
    listRoutesForAdminOperator(operatorId),
    listDeparturesForAdminOperator(operatorId),
    listStationOptions(),
    searchParams,
  ]);
  if (!operator) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/operators" className="text-sm text-teal hover:underline">← Back to operators</Link>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground">{operator.name}</h1>
      {query.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {query.error && <div className="mt-6"><Alert tone="error">{query.error}</Alert></div>}

      <section className="py-8">
        <h2 className="text-lg font-semibold">Operator profile</h2>
        <form action={updateAdminOperatorAction} className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2">
          <input type="hidden" name="operatorId" value={operator.id} />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Name</span><input name="name" required defaultValue={operator.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Phone</span><input name="phone" defaultValue={operator.phone ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" defaultValue={operator.email ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Street</span><input name="street" defaultValue={operator.street ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">City</span><input name="city" defaultValue={operator.city ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <div className="sm:col-span-2"><Button type="submit">Save operator</Button></div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold">Routes</h2>
        <div className="mt-4 grid gap-3">
          {routes.map((route) => (
            <div key={route.id} className="card-lift grid gap-3 rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)] sm:grid-cols-[180px_1fr_auto_auto]">
              <form id={`route-${route.id}`} action={updateAdminRouteAction} className="contents">
                <input type="hidden" name="operatorId" value={operator.id} />
                <input type="hidden" name="routeId" value={route.id} />
                <input name="code" required defaultValue={route.code} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input name="longName" required defaultValue={route.longName} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </form>
              <Button form={`route-${route.id}`} variant="outline" size="sm">Save route</Button>
              <form action={deleteAdminRouteAction}>
                <input type="hidden" name="operatorId" value={operator.id} />
                <input type="hidden" name="routeId" value={route.id} />
                <Button variant="danger" size="sm">Delete</Button>
              </form>
            </div>
          ))}
        </div>

        <details className="mt-4 rounded-md border border-border bg-surface-sunken p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Add a new route</summary>
          <form action={createAdminRouteAction} className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <input type="hidden" name="operatorId" value={operator.id} />
            <input name="code" required placeholder="e.g. TR12" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input name="longName" required placeholder="Route name" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <Button type="submit" size="sm">Create route</Button>
          </form>
        </details>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold">Departures</h2>
        <div className="mt-4">
          <VendorDeparturesTable
            departures={departures}
            updateAction={updateAdminDepartureAction}
            deleteAction={deleteAdminDepartureAction}
            operatorId={operator.id}
          />
        </div>

        <details className="mt-4 rounded-md border border-border bg-surface-sunken p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Add a new departure</summary>
          <form action={createAdminDepartureAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="operatorId" value={operator.id} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Route</span>
              <select name="routeId" required className="rounded-md border border-border bg-background px-3 py-2">
                {routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.longName}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">From station</span>
                <select name="fromStationId" required className="rounded-md border border-border bg-background px-3 py-2">
                  {stationOptions.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">To station</span>
                <select name="toStationId" required className="rounded-md border border-border bg-background px-3 py-2">
                  {stationOptions.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Departure time</span><input name="departureTime" type="time" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Arrival time</span><input name="arrivalTime" type="time" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Duration (min)</span><input name="durationMin" type="number" step="1" min="1" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Distance (km)</span><input name="distanceKm" type="number" step="0.1" min="1" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Base price</span><input name="basePrice" type="number" step="0.01" min="0" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Planned seats</span><input name="plannedSeats" type="number" min="1" max="500" required defaultValue={50} className="rounded-md border border-border bg-background px-3 py-2" /></label>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Operating days</p>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((day) => (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <input name="weekdays" type="checkbox" value={day.value} className="accent-teal" />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><Button type="submit" size="sm">Create departure</Button></div>
          </form>
        </details>
      </section>

      <section className="border-t border-border py-8">
        <div className="rounded-md border border-red/30 bg-red-soft/40 p-5">
          <p className="text-sm font-semibold text-red">Danger zone</p>
          <p className="mt-1 text-sm text-red/80">Deleting an operator fails safely while it still has routes.</p>
          <form action={deleteAdminOperatorAction} className="mt-3">
            <input type="hidden" name="operatorId" value={operator.id} />
            <Button type="submit" variant="danger">Delete operator</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
