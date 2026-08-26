import { Alert } from "@/components/ui/alert";
import { listTaxiRequestsForAdmin } from "@/db/queries/admin";
import { deleteTaxiRequestAction } from "@/app/admin/actions";
import { AdminTaxiRequestsTable } from "@/components/admin-taxi-requests-table";

export default async function AdminTaxiRequestsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [requests, params] = await Promise.all([listTaxiRequestsForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Taxi bookings</h1>
      {params.saved && <div className="mt-6"><Alert tone="success">Booking updated.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      <div className="mt-6">
        <AdminTaxiRequestsTable requests={requests} deleteAction={deleteTaxiRequestAction} />
      </div>
    </div>
  );
}
