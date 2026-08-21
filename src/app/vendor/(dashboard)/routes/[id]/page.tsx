import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVendorRoute,
  listStationOptions,
  listVendorRouteStops,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { Alert } from "@/components/ui/alert";
import { VendorAddRouteStopForm } from "@/components/vendor-add-route-stop-form";
import {
  createVendorRouteStopAction,
  createVendorRouteStopAtNewLocationAction,
  deleteVendorRouteStopAction,
  updateVendorRouteStopAction,
} from "../../../actions";

export default async function VendorRouteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [{ id }, { saved, error }] = await Promise.all([params, searchParams]);
  const routeId = Number(id);
  if (!Number.isInteger(routeId)) notFound();

  const route = await getVendorRoute(vendorUserId, routeId);
  if (!route) notFound();

  const [stops, stationOptions] = await Promise.all([
    listVendorRouteStops(vendorUserId, routeId),
    listStationOptions(),
  ]);

  const usedStationIds = new Set(stops.map((s) => s.stationId));
  const availableStations = stationOptions.filter((s) => !usedStationIds.has(s.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/vendor/routes" className="text-sm text-teal hover:underline">← Back to routes</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{route.code} · {route.longName}</h1>
      <p className="mt-1 text-sm text-muted">
        Intermediate stops along this route, with the earliest a customer could miss the bus (use a conservative time) and the fare from that stop to the final destination.
      </p>

      {saved && (
        <div className="mt-6">
          <Alert tone="success">Changes saved.</Alert>
        </div>
      )}
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <section className="py-8">
        <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Station</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Minutes from departure</th>
                <th className="px-4 py-3 font-medium">Price to destination</th>
                <th className="px-4 py-3"><span className="sr-only">Save</span></th>
                <th className="px-4 py-3"><span className="sr-only">Delete</span></th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop) => (
                <tr key={stop.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-foreground">{stop.stationName}</td>
                  <td className="px-4 py-3 align-top">
                    <form id={`stop-${stop.id}`} action={updateVendorRouteStopAction}>
                      <input type="hidden" name="routeId" value={routeId} />
                      <input type="hidden" name="routeStopId" value={stop.id} />
                      <input
                        name="sequenceOrder"
                        type="number"
                        min="1"
                        required
                        defaultValue={stop.sequenceOrder}
                        className="w-16 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                      />
                    </form>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      form={`stop-${stop.id}`}
                      name="minutesFromDeparture"
                      type="number"
                      min="0"
                      required
                      defaultValue={stop.minutesFromDeparture}
                      className="w-24 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      form={`stop-${stop.id}`}
                      name="priceToDestination"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Same as full fare"
                      defaultValue={stop.priceToDestination ?? ""}
                      className="w-32 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-teal"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      form={`stop-${stop.id}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-brand-strong hover:shadow-[var(--shadow-sm)] active:translate-y-0"
                    >
                      Save
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <form action={deleteVendorRouteStopAction}>
                      <input type="hidden" name="routeId" value={routeId} />
                      <input type="hidden" name="routeStopId" value={stop.id} />
                      <button className="rounded-md border border-red/30 px-3 py-1.5 text-sm font-medium text-red transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:-translate-y-px hover:bg-red-soft hover:shadow-[var(--shadow-xs)]">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {stops.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">No stops on this route yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Add a stop</h2>
        <p className="mt-1 text-sm text-muted">Pick one of the existing stations, or search a new location on the map if the stop isn&apos;t listed yet.</p>
        <div className="mt-4">
          <VendorAddRouteStopForm
            routeId={routeId}
            nextSequenceOrder={stops.length + 1}
            availableStations={availableStations}
            existingStationAction={createVendorRouteStopAction}
            newLocationAction={createVendorRouteStopAtNewLocationAction}
          />
        </div>
      </section>
    </div>
  );
}
