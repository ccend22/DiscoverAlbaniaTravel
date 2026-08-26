import { listPaymentsForAdmin } from "@/db/queries/admin";
import { AdminPaymentsTable } from "@/components/admin-payments-table";

export default async function AdminTaxiPaymentsPage() {
  const payments = await listPaymentsForAdmin(100, "taxi");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Taxi payments</h1>
      <p className="mt-1 text-sm text-muted">Gateway-ready transaction ledger for taxi bookings. Card details are never stored here.</p>
      <AdminPaymentsTable payments={payments} kind="taxi" />
    </div>
  );
}
