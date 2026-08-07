import { listAdminUsersForAdmin } from "@/db/queries/admin-accounts";
import { Alert } from "@/components/ui/alert";
import { requireAdminSession } from "@/lib/admin-session";
import { updateAdminUserAction, deleteAdminUserAction } from "./actions";
import { LinkButton, Button } from "@/components/ui/button";

export default async function AdminAdminsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [admins, currentAdminId, params] = await Promise.all([
    listAdminUsersForAdmin(),
    requireAdminSession(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Admin accounts</h1>
        <LinkButton href="/admin/admins/new" size="sm">New admin</LinkButton>
      </div>
      <p className="mt-1 text-sm text-muted">Full platform access. Only share with trusted staff.</p>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <div className="mt-6 flex flex-col gap-3">
        {admins.map((admin) => (
          <div key={admin.id} className="rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
            <form action={updateAdminUserAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="adminUserId" value={admin.id} />
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Name</span><input name="name" required defaultValue={admin.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" required defaultValue={admin.email} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">New password <span className="font-normal text-muted">(optional)</span></span><input name="password" type="password" placeholder="Leave blank to keep current" className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <Button type="submit" size="sm">Save</Button>
            </form>
            {admin.id !== currentAdminId && (
              <form action={deleteAdminUserAction} className="mt-3 border-t border-border pt-3">
                <input type="hidden" name="adminUserId" value={admin.id} />
                <Button type="submit" variant="danger" size="sm">Remove admin</Button>
              </form>
            )}
            {admin.id === currentAdminId && <p className="mt-3 border-t border-border pt-3 text-xs text-muted">This is your account. Sign in as another admin to remove it.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
