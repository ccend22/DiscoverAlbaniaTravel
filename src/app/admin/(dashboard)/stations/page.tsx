import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { listStationsForAdmin } from "@/db/queries/admin-stations";
import { LinkButton } from "@/components/ui/button";

export default async function AdminStationsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [stationsList, params] = await Promise.all([listStationsForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Stations</h1>
        <LinkButton href="/admin/stations/new" size="sm">New station</LinkButton>
      </div>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr><th className="px-4 py-3 font-medium">Station</th><th className="px-4 py-3 font-medium">City</th><th className="px-4 py-3 font-medium">Address</th><th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3"><span className="sr-only">Manage</span></th></tr>
          </thead>
          <tbody>
            {stationsList.map((station) => (
              <tr key={station.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{station.name}</td>
                <td className="px-4 py-3 text-muted">{station.city}</td>
                <td className="px-4 py-3 text-muted">{station.address ?? "Not available"}</td>
                <td className="px-4 py-3 tabular-nums text-muted">{station.code}</td>
                <td className="px-4 py-3 text-muted capitalize">{station.category}</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/stations/${station.id}`} className="text-sm font-medium text-teal hover:underline">Manage</Link></td>
              </tr>
            ))}
            {stationsList.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No stations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
