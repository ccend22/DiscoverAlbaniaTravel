import { listScanLogForAdmin } from "@/db/queries/admin";
import { Badge } from "@/components/ui/badge";
import { formatAlbaniaDateTime } from "@/lib/timezone";

const RESULT_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  valid: { label: "Valid", tone: "success" },
  valid_off_hours: { label: "Valid (off hours)", tone: "warning" },
  already_used: { label: "Already used", tone: "warning" },
  too_early: { label: "Too early", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  unpaid: { label: "Unpaid", tone: "warning" },
  wrong_route: { label: "Wrong line", tone: "neutral" },
  wrong_operator: { label: "Different line", tone: "neutral" },
  invalid_code: { label: "Invalid code", tone: "danger" },
  not_found: { label: "Not found", tone: "danger" },
};

export default async function AdminScanLogPage() {
  const scans = await listScanLogForAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Scan log</h1>
      <p className="mt-1 text-sm text-muted">Most recent {scans.length} ticket scans platform-wide -- every attempt, not just successful check-ins.</p>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Scanned at</th>
              <th className="px-4 py-3 font-medium">Operator</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => {
              const info = RESULT_LABELS[scan.result] ?? { label: scan.result, tone: "neutral" as const };
              return (
                <tr key={scan.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{formatAlbaniaDateTime(scan.scannedAt)}</td>
                  <td className="px-4 py-3 text-foreground">{scan.operatorName}</td>
                  <td className="px-4 py-3 text-foreground">{scan.vendorUserName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{scan.bookingReference ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{scan.routeCode ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={info.tone}>{info.label}</Badge></td>
                </tr>
              );
            })}
            {scans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No scans yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
