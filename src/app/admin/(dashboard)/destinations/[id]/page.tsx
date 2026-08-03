import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { getDestinationForAdmin } from "@/db/queries/admin-destinations";
import { updateDestinationAction, deleteDestinationAction } from "../actions";
import { Button } from "@/components/ui/button";

export default async function DestinationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const destinationId = Number(id);
  if (!Number.isInteger(destinationId)) notFound();
  const destination = await getDestinationForAdmin(destinationId);
  if (!destination) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/destinations" className="text-sm text-teal hover:underline">← Back to destinations</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{destination.name}</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={updateDestinationAction} className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <input type="hidden" name="destinationId" value={destination.id} />
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Name</span><input name="name" required defaultValue={destination.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Description</span><textarea name="description" required rows={6} defaultValue={destination.description} className="resize-y rounded-md border border-border bg-background px-3 py-2" /></label>
        <div><Button type="submit">Save destination</Button></div>
      </form>

      <div className="mt-8 rounded-md border border-red/30 bg-red-soft/40 p-5">
        <p className="text-sm font-semibold text-red">Danger zone</p>
        <form action={deleteDestinationAction} className="mt-3">
          <input type="hidden" name="destinationId" value={destination.id} />
          <Button type="submit" variant="danger">Delete destination</Button>
        </form>
      </div>
    </div>
  );
}
