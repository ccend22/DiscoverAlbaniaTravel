import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listOperatorDevices } from "@/db/queries/mobile";
import { requireVendorOwner } from "@/lib/vendor-access";
import { RevokeDeviceButton } from "@/components/revoke-device-button";
import { createDeviceActivationCodeAction, revokeDeviceAction } from "../../actions";

export default async function VendorDevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; code?: string; expiresAt?: string }>;
}) {
  const { vendorUserId, context } = await requireVendorOwner();
  const [devices, params] = await Promise.all([listOperatorDevices(vendorUserId), searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Pajisjet</h1>
      <p className="mt-1 text-sm text-muted">
        Pajisjet me aplikacionin e biletarisë për {context.operatorName}. Gjenero një kod, pastaj vendose në pajisje për ta aktivizuar.
      </p>
      {params.saved && <div className="mt-6"><Alert tone="success">Ndryshimet u ruajtën.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      {params.code && (
        <div className="mt-6">
          <Alert tone="success">
            Kodi i aktivizimit: <span className="font-mono text-lg font-bold tracking-widest">{params.code}</span>
            {" "}— vendose në pajisje brenda 30 minutave. Mund të përdoret vetëm një herë.
          </Alert>
        </div>
      )}

      <section className="py-8">
        <h2 className="text-lg font-semibold text-foreground">Shto një pajisje</h2>
        <form action={createDeviceActivationCodeAction} className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Emri i pajisjes</span>
            <input name="label" required placeholder="p.sh. Tableti i shoferit 1" className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <Button type="submit" size="sm">Gjenero kodin e aktivizimit</Button>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Pajisjet e tua</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Emri</th>
                <th className="px-4 py-3 font-medium">Statusi</th>
                <th className="px-4 py-3 font-medium">Parë së fundmi</th>
                <th className="px-4 py-3"><span className="sr-only">Veprime</span></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-foreground">{device.label}</td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={device.status === "active" ? "success" : device.status === "revoked" ? "danger" : "warning"}>
                      {device.status === "active" ? "aktive" : device.status === "revoked" ? "e revokuar" : device.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-muted">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Kurrë"}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {device.status === "active" && (
                      <RevokeDeviceButton deviceId={device.id} label={device.label} action={revokeDeviceAction} />
                    )}
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">Ende pa pajisje.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
