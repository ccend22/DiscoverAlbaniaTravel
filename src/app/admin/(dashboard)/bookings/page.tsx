import { listBookingsForAdmin } from "@/db/queries/admin";
import { AdminBookingsTable } from "@/components/admin-bookings-table";
import { Alert } from "@/components/ui/alert";
import {
  cancelAdminBookingAction,
  deleteAdminBookingAction,
  markAdminBookingPaidAction,
  updateAdminBookingAction,
} from "@/app/admin/actions";

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [bookings, params] = await Promise.all([listBookingsForAdmin(100), searchParams]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Bookings</h1>
      <p className="mt-1 text-sm text-muted">Most recent {bookings.length} bookings platform-wide.</p>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <div className="mt-4">
        <AdminBookingsTable
          bookings={bookings}
          updateAction={updateAdminBookingAction}
          cancelAction={cancelAdminBookingAction}
          markPaidAction={markAdminBookingPaidAction}
          deleteAction={deleteAdminBookingAction}
        />
      </div>
    </div>
  );
}
