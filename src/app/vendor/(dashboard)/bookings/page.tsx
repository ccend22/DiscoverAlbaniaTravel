import { redirect } from "next/navigation";
import { getVendorContext, listVendorBookings } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { VendorBookingsTable } from "@/components/vendor-bookings-table";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cancelVendorBookingAction, markVendorBookingPaidAction, updateVendorBookingAction } from "../../actions";

export default async function VendorBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [context, vendorBookings, params] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorBookings(vendorUserId),
    searchParams,
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex animate-fade-up items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Bookings</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <LinkButton href="/vendor/bookings/new?mode=touch_screen" variant="outline" size="sm">Touch-screen booking</LinkButton>
          <LinkButton href="/vendor/bookings/new" size="sm">New manual booking</LinkButton>
        </div>
      </div>
      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">
            {params.saved === "1" ? "Changes saved." : `Booking ${params.saved} created.`}
          </Alert>
        </div>
      )}
      {params.error && (
        <div className="mt-6">
          <Alert tone="error">{params.error}</Alert>
        </div>
      )}
      <div className="mt-6">
        <VendorBookingsTable
          bookings={vendorBookings}
          updateAction={updateVendorBookingAction}
          cancelAction={cancelVendorBookingAction}
          markPaidAction={markVendorBookingPaidAction}
        />
      </div>
    </div>
  );
}
