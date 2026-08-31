import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listVendorTeamUsers } from "@/db/queries/vendors";
import { requireVendorOwner } from "@/lib/vendor-access";
import { VENDOR_PERMISSIONS, vendorPermissionLabel } from "@/lib/vendor-permissions";
import { PermissionToggle } from "@/components/permission-toggle";
import { PasswordInput } from "@/components/password-input";
import { RemoveTeamUserButton } from "@/components/remove-team-user-button";
import { EditTeamUserPermissionsButton } from "@/components/edit-team-user-permissions-button";
import { createVendorTeamUserAction, deleteVendorTeamUserAction, updateVendorTeamUserPermissionsAction } from "../../actions";

export default async function VendorUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { vendorUserId, context } = await requireVendorOwner();
  const [teamUsers, params] = await Promise.all([listVendorTeamUsers(vendorUserId), searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Users</h1>
      <p className="mt-1 text-sm text-muted">Teammates who can sign in to manage {context.operatorName}&apos;s bookings and routes.</p>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <section className="py-8">
        <h2 className="text-lg font-semibold text-foreground">Add a teammate</h2>
        <form action={createVendorTeamUserAction} className="mt-4 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Full name</span>
            <input name="name" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input name="email" type="email" required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Password</span>
            <PasswordInput name="password" minLength={8} required className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium">Access</span>
            <p className="mt-0.5 text-xs text-muted">Choose which pages this teammate can see and use. They&apos;ll only get their own view of the vendor panel based on this.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VENDOR_PERMISSIONS.map((permission) => (
                <PermissionToggle key={permission.key} name="permissions" value={permission.key} label={permission.label} />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">Add teammate</Button>
          </div>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Your team</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {teamUsers.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 align-top text-muted">{user.email}</td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={user.status === "approved" ? "success" : user.status === "rejected" ? "danger" : "warning"}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {user.isOwner ? (
                      <Badge tone="info">Owner · full access</Badge>
                    ) : user.permissions.length === 0 ? (
                      <span className="text-xs text-muted">No pages yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.map((key) => (
                          <Badge key={key} tone="neutral">{vendorPermissionLabel(key)}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {!user.isOwner && (
                      <div className="flex justify-end gap-2">
                        <EditTeamUserPermissionsButton
                          targetUserId={user.id}
                          name={user.name}
                          permissions={user.permissions}
                          action={updateVendorTeamUserPermissionsAction}
                        />
                        {user.id !== vendorUserId && (
                          <RemoveTeamUserButton targetUserId={user.id} name={user.name} action={deleteVendorTeamUserAction} />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {teamUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">No teammates yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
