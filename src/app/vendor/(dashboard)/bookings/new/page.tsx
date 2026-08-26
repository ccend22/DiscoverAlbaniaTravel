import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getVendorContext,
  listVendorDepartures,
  listVendorRouteStopOptions,
} from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { Alert } from "@/components/ui/alert";
import { VendorManualBookingForm } from "@/components/vendor-manual-booking-form";
import { MANUAL_BOOKING_SERVICE_FEE_EUR } from "@/lib/manual-booking";
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
        Record a reservation taken by phone, in person, or at a self-service kiosk.
      </p>
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <VendorManualBookingForm
        departures={departures}
        routeStopOptions={routeStopOptions}
        serviceFeeEur={MANUAL_BOOKING_SERVICE_FEE_EUR}
        todayDate={today}
        action={createManualBookingAction}
      />
    </div>
  );
}
