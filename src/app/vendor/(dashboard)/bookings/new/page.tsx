import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getVendorContext,
  listVendorDepartures,
  listVendorRouteStopOptions,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createManualBookingAction } from "../../../actions";

export default async function NewManualBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [context, departures, routeStopOptions, { error }] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorDepartures(vendorUserId),
    listVendorRouteStopOptions(vendorUserId),
    searchParams,
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/vendor/bookings" className="text-sm text-teal hover:underline">← Back to bookings</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New manual booking</h1>
      <p className="mt-1 text-sm text-muted">
        Record a reservation taken by phone or in person. It&apos;s marked paid immediately -- no online payment is collected.
      </p>
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <form action={createManualBookingAction} className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Departure</span>
          <select name="tripDepartureId" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2">
            <option value="">Choose departure</option>
            {departures.map((departure) => (
              <option key={departure.id} value={departure.id}>
                {departure.routeCode} · {departure.fromStationName} · {departure.departureTime}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Travel date</span>
          <input name="travelDate" type="date" min={today} required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Seats</span>
          <input name="seats" type="number" min="1" max="9" defaultValue="1" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Boarding stop <span className="font-normal text-muted">(optional -- leave blank to board at the route&apos;s start)</span></span>
          <select name="routeStopId" className="min-h-11 rounded-md border border-border bg-background px-3 py-2">
            <option value="">Full route (default fare)</option>
            {routeStopOptions.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.routeCode} · board at {stop.stationName}
                {stop.priceToDestination ? ` · ${stop.priceToDestination}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Passenger name</span>
          <input name="passengerName" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Phone</span>
          <input name="passengerPhone" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email <span className="font-normal text-muted">(optional)</span></span>
          <input name="passengerEmail" type="email" className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Create booking</Button>
        </div>
      </form>
    </div>
  );
}
