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
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Devices</h1>
      <p className="mt-1 text-sm text-muted">
        Ticket-agent app devices for {context.operatorName}. Generate a code, then enter it on the device to activate it.
      </p>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      {params.code && (
        <div className="mt-6">
          <Alert tone="success">
            Activation code: <span className="font-mono text-lg font-bold tracking-widest">{params.code}</span>
            {" "}— enter this on the device within 30 minutes. It can only be used once.
          </Alert>
        </div>
      )}

      <section className="py-8">
        <h2 className="text-lg font-semibold text-foreground">Add a device</h2>
        <form action={createDeviceActivationCodeAction} className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Device name</span>
            <input name="label" required placeholder="e.g. Driver tablet 1" className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <Button type="submit" size="sm">Generate activation code</Button>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Your devices</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-foreground">{device.label}</td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={device.status === "active" ? "success" : device.status === "revoked" ? "danger" : "warning"}>
                      {device.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-muted">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
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
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">No devices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
