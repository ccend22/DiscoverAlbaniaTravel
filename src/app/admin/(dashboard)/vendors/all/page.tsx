import Link from "next/link";
import { listAllVendorUsersForAdmin } from "@/db/queries/vendors";
import { updateVendorUserAction, deleteVendorUserAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export default async function AllVendorsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [vendorUsers, params] = await Promise.all([listAllVendorUsersForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/vendors" className="text-sm text-teal hover:underline">← Back to pending approvals</Link>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground">All vendor accounts</h1>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <div className="mt-6 flex flex-col gap-3">
        {vendorUsers.map((vendor) => (
          <div key={vendor.id} className="card-lift rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{vendor.operatorName}</p>
              <Badge tone={vendor.status === "approved" ? "success" : vendor.status === "rejected" ? "danger" : "warning"}>{vendor.status}</Badge>
            </div>
            <form action={updateVendorUserAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <input type="hidden" name="vendorUserId" value={vendor.id} />
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Contact name</span><input name="name" required defaultValue={vendor.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" required defaultValue={vendor.email} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">New password</span><input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Leave unchanged" className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <Button type="submit" size="sm">Save</Button>
            </form>
            <form action={deleteVendorUserAction} className="mt-3 border-t border-border pt-3">
              <input type="hidden" name="vendorUserId" value={vendor.id} />
              <Button type="submit" variant="danger" size="sm">Remove account</Button>
            </form>
          </div>
        ))}
        {vendorUsers.length === 0 && <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">No vendor accounts yet.</p>}
      </div>
    </div>
  );
}
