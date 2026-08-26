import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listTaxiRequestsForAdmin } from "@/db/queries/admin";
import { formatCurrency } from "@/lib/format";
import { updateTaxiRequestStatusAction, deleteTaxiRequestAction } from "@/app/admin/actions";
import { formatAlbaniaDateTime } from "@/lib/timezone";

const STATUS_LABELS: Record<string, string> = {
  requested: "Booked",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function AdminTaxiRequestsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [requests, params] = await Promise.all([listTaxiRequestsForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Taxi bookings</h1>
      {params.saved && <div className="mt-6"><Alert tone="success">Booking updated.</Alert></div>}{params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]"><table className="w-full min-w-[1040px] text-sm"><thead className="border-b border-border text-left text-muted"><tr><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Journey</th><th className="px-4 py-3 font-medium">Pickup</th><th className="px-4 py-3 font-medium">Passenger</th><th className="px-4 py-3 font-medium">Quote</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Update</th><th className="px-4 py-3"><span className="sr-only">Delete</span></th></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-b border-border align-top last:border-0"><td className="px-4 py-3 font-mono text-xs">{request.requestReference}</td><td className="px-4 py-3"><p className="font-medium">{request.pickupLocation}</p><p className="text-muted">to {request.destination}</p></td><td className="px-4 py-3">{formatAlbaniaDateTime(request.pickupAt)}</td><td className="px-4 py-3"><p>{[request.passengerName, request.passengers].filter(Boolean).join(" · ")}</p><p className="text-xs text-muted">{request.passengerPhone}</p>{request.passengerEmail && <p className="text-xs text-muted">{request.passengerEmail}</p>}</td><td className="px-4 py-3">{request.quotedPrice ? <p className="font-medium">{formatCurrency(request.quotedPrice)}</p> : <p className="text-muted">Not quoted</p>}</td><td className="px-4 py-3"><Badge tone={request.status === "accepted" || request.status === "completed" ? "success" : request.status === "cancelled" || request.status === "declined" ? "danger" : "warning"}>{STATUS_LABELS[request.status] ?? request.status}</Badge></td><td className="px-4 py-3"><form action={updateTaxiRequestStatusAction} className="flex gap-2"><input type="hidden" name="requestId" value={request.id} /><select name="status" defaultValue={request.status} className="rounded-md border border-border bg-background px-2 py-1.5"><option value="requested">Booked</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><Button variant="outline" size="sm">Save</Button></form></td><td className="px-4 py-3"><form action={deleteTaxiRequestAction}><input type="hidden" name="requestId" value={request.id} /><Button variant="danger" size="sm">Delete</Button></form></td></tr>)}</tbody></table>{requests.length === 0 && <p className="p-6 text-center text-sm text-muted">No taxi bookings yet.</p>}</div>
    </div>
  );
}
