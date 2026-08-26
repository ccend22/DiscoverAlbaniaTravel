import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getVendorContext } from "@/db/queries/vendors";
import { listOperatorReportsForVendor } from "@/db/queries/reviews";
import { requireVendorSession } from "@/lib/vendor-session";

export default async function VendorReportsPage() {
  const vendorUserId = await requireVendorSession();
  const [context, reports] = await Promise.all([
    getVendorContext(vendorUserId),
    listOperatorReportsForVendor(vendorUserId),
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted">Private complaints customers sent about a trip with your company. Discover Albania sees these too.</p>

      <div className="mt-6 flex flex-col gap-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {report.reporterName} · {report.reporterEmail}
                {report.bookingReference && ` · ${report.bookingReference}`}
              </p>
              <Badge tone={report.status === "open" ? "warning" : "success"}>{report.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground">{report.message}</p>
            <p className="mt-3 text-xs text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(report.createdAt)}</p>
          </div>
        ))}
        {reports.length === 0 && <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">No reports yet.</p>}
      </div>
    </div>
  );
}
