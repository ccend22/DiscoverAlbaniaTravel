import { listPaymentsForAdmin } from "@/db/queries/admin";
import { AdminPaymentsTable } from "@/components/admin-payments-table";

export default async function AdminBusPaymentsPage() {
  const payments = await listPaymentsForAdmin(100, "bus");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Bus payments</h1>
      <p className="mt-1 text-sm text-muted">Gateway-ready transaction ledger for bus bookings. Card details are never stored here.</p>
      <AdminPaymentsTable payments={payments} kind="bus" />
    </div>
  );
}
