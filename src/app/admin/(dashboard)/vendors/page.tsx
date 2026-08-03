import Link from "next/link";
import { listPendingVendors } from "@/db/queries/vendors";
import { approveVendorAction, rejectVendorAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface AdminVendorsPageProps {
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminVendorsPage({ searchParams }: AdminVendorsPageProps) {
  const [pending, params] = await Promise.all([listPendingVendors(), searchParams]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Vendor approvals</h1>

      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">Decision saved.</Alert>
        </div>
      )}

      <div className="mt-6">
        {pending.length === 0 ? (
          <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-xs)]">
            No pending vendor applications.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {vendor.operatorName}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <p>{vendor.name}</p>
                      <p className="text-xs text-muted">{vendor.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        vendor.createdAt
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={approveVendorAction}>
                          <input type="hidden" name="vendorUserId" value={vendor.id} />
                          <Button size="sm">Approve</Button>
                        </form>
                        <form action={rejectVendorAction}>
                          <input type="hidden" name="vendorUserId" value={vendor.id} />
                          <Button size="sm" variant="outline">Reject</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-muted">
        Looking for approved vendor accounts to edit or remove?{" "}
        <Link href="/admin/vendors/all" className="text-teal hover:underline">
          View all vendor accounts
        </Link>
        .
      </p>
    </div>
  );
}
