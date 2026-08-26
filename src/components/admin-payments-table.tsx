import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { deleteAdminPaymentAction } from "@/app/admin/actions";
import type { listPaymentsForAdmin } from "@/db/queries/admin";

type PaymentRow = Awaited<ReturnType<typeof listPaymentsForAdmin>>[number];
type PaymentStatus = PaymentRow["status"];

const STATUS_LABELS: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  paid: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  authorized: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  refunded: { label: "Refunded", tone: "info" },
};

export function AdminPaymentsTable({ payments, kind }: { payments: PaymentRow[]; kind: "bus" | "taxi" }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Passenger</th>
            <th className="px-4 py-3 font-medium">Gateway</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3"><span className="sr-only">Delete</span></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const status = STATUS_LABELS[payment.status];
            return (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top font-mono text-xs">{payment.bookingReference ?? payment.taxiRequestReference}</td>
                <td className="px-4 py-3 align-top text-foreground">
                  <p className="font-medium">{payment.passengerName || "Not provided"}</p>
                  <p className="text-xs text-muted">{payment.passengerPhone}</p>
                  {payment.passengerEmail && <p className="text-xs text-muted">{payment.passengerEmail}</p>}
                </td>
                <td className="px-4 py-3 align-top">
                  <p>{payment.provider}</p>
                  <p className="font-mono text-xs text-muted">{payment.providerPaymentId ?? "Pending"}</p>
                </td>
                <td className="px-4 py-3 align-top font-medium">{formatCurrency(payment.amount, payment.currency === "ALL" ? "ALL" : "EUR")}</td>
                <td className="px-4 py-3 align-top"><Badge tone={status.tone}>{status.label}</Badge></td>
                <td className="px-4 py-3 align-top text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(payment.createdAt)}</td>
                <td className="px-4 py-3 align-top text-right">
                  <form action={deleteAdminPaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="redirectTo" value={kind} />
                    <Button variant="danger" size="sm">Delete</Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {payments.length === 0 && (
        <p className="p-6 text-center text-sm text-muted">
          No {kind === "bus" ? "bus" : "taxi"} payment records yet. They will appear here after a payment gateway is connected.
        </p>
      )}
    </div>
  );
}
