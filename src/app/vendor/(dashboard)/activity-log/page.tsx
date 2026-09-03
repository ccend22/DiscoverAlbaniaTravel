import { listVendorScanLog } from "@/db/queries/vendors";
import { requireVendorPermission } from "@/lib/vendor-access";
import { Badge } from "@/components/ui/badge";
import { formatAlbaniaDateTime } from "@/lib/timezone";

const RESULT_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  valid: { label: "E vlefshme", tone: "success" },
  valid_off_hours: { label: "E vlefshme (jashtë orarit)", tone: "warning" },
  already_used: { label: "Tashmë e përdorur", tone: "warning" },
  too_early: { label: "Shumë herët", tone: "warning" },
  expired: { label: "E skaduar", tone: "danger" },
  cancelled: { label: "E anulluar", tone: "danger" },
  unpaid: { label: "E papaguar", tone: "warning" },
  wrong_route: { label: "Linjë e gabuar", tone: "neutral" },
  wrong_operator: { label: "Linjë tjetër", tone: "neutral" },
  invalid_code: { label: "Kod i pavlefshëm", tone: "danger" },
  not_found: { label: "Nuk u gjet", tone: "danger" },
};

export default async function VendorActivityLogPage() {
  const { vendorUserId } = await requireVendorPermission("scanner");
  const scans = await listVendorScanLog(vendorUserId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Regjistri i aktivitetit</h1>
      <p className="mt-1 text-sm text-muted">Çdo skanim bilete nga ekipi yt, më i fundit i pari -- kush e skanoi, kur, dhe rezultati.</p>

      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Skanuar më</th>
              <th className="px-4 py-3 font-medium">Stafi</th>
              <th className="px-4 py-3 font-medium">Referenca</th>
              <th className="px-4 py-3 font-medium">Linja</th>
              <th className="px-4 py-3 font-medium">Rezultati</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => {
              const info = RESULT_LABELS[scan.result] ?? { label: scan.result, tone: "neutral" as const };
              return (
                <tr key={scan.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{formatAlbaniaDateTime(scan.scannedAt, "al")}</td>
                  <td className="px-4 py-3 text-foreground">{scan.vendorUserName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{scan.bookingReference ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{scan.routeCode ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={info.tone}>{info.label}</Badge></td>
                </tr>
              );
            })}
            {scans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">Ende pa skanime.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
