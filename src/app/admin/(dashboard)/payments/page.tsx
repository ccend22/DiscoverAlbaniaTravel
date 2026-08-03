import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPaymentsForAdmin } from "@/db/queries/admin";
import { formatCurrency } from "@/lib/format";
import { deleteAdminPaymentAction } from "@/app/admin/actions";

export default async function AdminPaymentsPage() {
  const payments = await listPaymentsForAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Payments</h1>
      <p className="mt-1 text-sm text-muted">Gateway-ready transaction ledger. Card details are never stored here.</p>
      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]"><table className="w-full min-w-[860px] text-sm"><thead className="border-b border-border text-left text-muted"><tr><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Gateway</th><th className="px-4 py-3 font-medium">Gateway ID</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3"><span className="sr-only">Delete</span></th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono text-xs">{payment.bookingReference ?? payment.taxiRequestReference}</td><td className="px-4 py-3">{payment.provider}</td><td className="px-4 py-3 font-mono text-xs text-muted">{payment.providerPaymentId ?? "Pending"}</td><td className="px-4 py-3 font-medium">{formatCurrency(payment.amount, payment.currency === "ALL" ? "ALL" : "EUR")}</td><td className="px-4 py-3"><Badge tone={payment.status === "paid" ? "success" : payment.status === "failed" || payment.status === "cancelled" ? "danger" : payment.status === "refunded" ? "info" : "warning"}>{payment.status}</Badge></td><td className="px-4 py-3 text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(payment.createdAt)}</td><td className="px-4 py-3 text-right"><form action={deleteAdminPaymentAction}><input type="hidden" name="paymentId" value={payment.id} /><Button variant="danger" size="sm">Delete</Button></form></td></tr>)}</tbody></table>{payments.length === 0 && <p className="p-6 text-center text-sm text-muted">No payment records yet. They will appear here after a payment gateway is connected.</p>}</div>
    </div>
  );
}
