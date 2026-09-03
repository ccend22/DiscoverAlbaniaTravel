import Link from "next/link";
import {
  listVendorDepartures,
  listVendorRouteStopOptions,
} from "@/db/queries/vendors";
import { requireVendorPermission } from "@/lib/vendor-access";
import { Alert } from "@/components/ui/alert";
import { VendorManualBookingForm } from "@/components/vendor-manual-booking-form";
import { createManualBookingAction } from "../../../actions";
import { getAlbaniaDateInputValue } from "@/lib/timezone";

export default async function NewManualBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { vendorUserId } = await requireVendorPermission("bookings");
  const [departures, routeStopOptions, { error, mode }] = await Promise.all([
    listVendorDepartures(vendorUserId),
    listVendorRouteStopOptions(vendorUserId),
    searchParams,
  ]);

  const touchScreenMode = mode === "touch_screen";

  const today = getAlbaniaDateInputValue();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/vendor/bookings" className="text-sm text-teal hover:underline">← Kthehu te rezervimet</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        {touchScreenMode ? "Rezervim me ekran prekës" : "Rezervim i ri manual"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {touchScreenMode
          ? "Krijo një rezervim nga banaku ose kioska me kontrolle të mëdha me prekje, pastaj shfaq dhe printo biletën me kod QR."
          : "Regjistro një rezervim të marrë me telefon ose personalisht."}
      </p>
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <VendorManualBookingForm
        departures={departures}
        routeStopOptions={routeStopOptions}
        todayDate={today}
        initialChannel={touchScreenMode ? "touch_screen" : "walk_in"}
        touchScreenMode={touchScreenMode}
        action={createManualBookingAction}
      />
    </div>
  );
}
