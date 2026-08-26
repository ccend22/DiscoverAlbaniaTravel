import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listOperatorReportsForAdmin } from "@/db/queries/reviews";
import { resolveOperatorReportAction } from "@/app/admin/actions";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [reports, params] = await Promise.all([listOperatorReportsForAdmin(), searchParams]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted">Private complaints customers sent about a trip -- also visible to the operator.</p>
      {params.saved && <div className="mt-6"><Alert tone="success">Report updated.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <div className="mt-6 flex flex-col gap-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{report.operatorName}</p>
                <p className="text-xs text-muted">
                  {report.reporterName} · {report.reporterEmail}
                  {report.bookingReference && ` · ${report.bookingReference}`}
                </p>
              </div>
              <Badge tone={report.status === "open" ? "warning" : "success"}>{report.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground">{report.message}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(report.createdAt)}</p>
              {report.status === "open" && (
                <form action={resolveOperatorReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <Button variant="outline" size="sm">Mark resolved</Button>
                </form>
              )}
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">No reports yet.</p>}
      </div>
    </div>
  );
}
