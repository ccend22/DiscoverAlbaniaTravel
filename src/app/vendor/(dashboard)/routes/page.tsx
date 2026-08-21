import Link from "next/link";
import { redirect } from "next/navigation";
import { getVendorContext, listVendorRoutesWithStopCounts } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createVendorRouteAction } from "../../actions";

export default async function VendorRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [context, routesList, params] = await Promise.all([
    getVendorContext(vendorUserId),
    listVendorRoutesWithStopCounts(vendorUserId),
    searchParams,
  ]);

  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Routes & stops</h1>
      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">Changes saved.</Alert>
        </div>
      )}
      {params.error && (
        <div className="mt-6">
          <Alert tone="error">{params.error}</Alert>
        </div>
      )}

      <section className="py-8">
        <h2 className="text-lg font-semibold text-foreground">Add a route</h2>
        <form action={createVendorRouteAction} className="mt-4 grid gap-3 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-[180px_1fr_auto]">
          <input name="code" required placeholder="Route code" className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="longName" required placeholder="Route name, e.g. Tirana to Vlore" className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="sm:self-center">Add route</Button>
        </form>
      </section>

      <section className="border-t border-border py-8">
        <h2 className="text-lg font-semibold text-foreground">Your routes</h2>
        <p className="mt-1 text-sm text-muted">Open a route to add intermediate stops with boarding time and fare.</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Stops</th>
                <th className="px-4 py-3"><span className="sr-only">Manage</span></th>
              </tr>
            </thead>
            <tbody>
              {routesList.map((route) => (
                <tr key={route.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{route.code}</td>
                  <td className="px-4 py-3 text-muted">{route.longName}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{route.stopCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/vendor/routes/${route.id}`} className="text-sm font-medium text-teal hover:underline">
                      Manage stops
                    </Link>
                  </td>
                </tr>
              ))}
              {routesList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">No routes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
