import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { listDestinationsForAdmin } from "@/db/queries/admin-destinations";
import { LinkButton } from "@/components/ui/button";

export default async function AdminDestinationsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [destinationsList, params] = await Promise.all([listDestinationsForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Destinations</h1>
        <LinkButton href="/admin/destinations/new" size="sm">New destination</LinkButton>
      </div>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {destinationsList.map((destination) => (
          <Link key={destination.id} href={`/admin/destinations/${destination.id}`} className="card-lift rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-xs)] hover:border-teal">
            <p className="font-medium text-foreground">{destination.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{destination.description}</p>
          </Link>
        ))}
        {destinationsList.length === 0 && <p className="col-span-2 rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">No destinations yet.</p>}
      </div>
    </div>
  );
}
