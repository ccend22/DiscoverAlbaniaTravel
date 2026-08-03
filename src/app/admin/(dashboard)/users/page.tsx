import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listUsersForAdmin } from "@/db/queries/admin";
import { setUserStatusAction, updateTravelerAction, deleteTravelerAction } from "@/app/admin/actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [users, params] = await Promise.all([listUsersForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Travelers</h1>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}

      <div className="mt-6 flex flex-col gap-3">
        {users.map((user) => (
          <div key={user.id} className="card-lift rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-muted">
                <Badge tone={user.status === "active" ? "success" : "danger"}>{user.status}</Badge>
                <span>{Number(user.bookingCount)} bus bookings</span>
                <span>{Number(user.taxiRequestCount)} taxi requests</span>
              </div>
              <div className="flex gap-2">
                <form action={setUserStatusAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="status" value={user.status === "active" ? "suspended" : "active"} />
                  <Button size="sm" variant={user.status === "active" ? "danger" : "primary"}>
                    {user.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                </form>
                <form action={deleteTravelerAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button size="sm" variant="danger">Remove</Button>
                </form>
              </div>
            </div>
            <form action={updateTravelerAction} className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="userId" value={user.id} />
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Name</span><input name="name" required defaultValue={user.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" required defaultValue={user.email} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Phone</span><input name="phone" defaultValue={user.phone ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <Button size="sm" variant="outline">Save</Button>
            </form>
          </div>
        ))}
        {users.length === 0 && <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-xs)]">No traveler accounts yet.</p>}
      </div>
    </div>
  );
}
