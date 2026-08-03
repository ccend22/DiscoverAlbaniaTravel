import { listBookingsForAdmin } from "@/db/queries/admin";
import { AdminBookingsTable } from "@/components/admin-bookings-table";
import { deleteAdminBookingAction } from "@/app/admin/actions";

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [bookings, params] = await Promise.all([listBookingsForAdmin(100), searchParams]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Bookings</h1>
      <p className="mt-1 text-sm text-muted">Most recent {bookings.length} bookings platform-wide.</p>
      {params.error && <p className="mt-6 rounded-md border border-red/30 bg-red-soft p-3 text-sm text-red">{params.error}</p>}

      <div className="mt-4">
        <AdminBookingsTable bookings={bookings} deleteAction={deleteAdminBookingAction} />
      </div>
    </div>
  );
}
