import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { getStationForAdmin } from "@/db/queries/admin-stations";
import { updateStationAction, deleteStationAction } from "../actions";
import { Button } from "@/components/ui/button";

export default async function StationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const stationId = Number(id);
  if (!Number.isInteger(stationId)) notFound();
  const station = await getStationForAdmin(stationId);
  if (!station) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/stations" className="text-sm text-teal hover:underline">← Back to stations</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{station.name}</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={updateStationAction} className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:grid-cols-2">
        <input type="hidden" name="stationId" value={station.id} />
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Name</span><input name="name" required defaultValue={station.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Code</span><input name="code" required defaultValue={station.code} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">City</span><input name="city" required defaultValue={station.city} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Address</span><input name="address" defaultValue={station.address ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Latitude</span><input name="latitude" type="number" step="any" required defaultValue={station.latitude} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Longitude</span><input name="longitude" type="number" step="any" required defaultValue={station.longitude} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Category</span>
          <select name="category" defaultValue={station.category} className="rounded-md border border-border bg-background px-3 py-2">
            <option value="terminus">Terminus</option>
            <option value="intermediate">Intermediate stop</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Description <span className="font-normal text-muted">(optional)</span></span><textarea name="description" rows={3} defaultValue={station.description ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Photos <span className="font-normal text-muted">(one URL per line, optional)</span></span><textarea name="photoUrls" rows={3} defaultValue={station.photoUrls.join("\n")} placeholder="https://..." className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <div className="sm:col-span-2"><Button type="submit">Save station</Button></div>
      </form>

      <div className="mt-8 rounded-md border border-red/30 bg-red-soft/40 p-5">
        <p className="text-sm font-semibold text-red">Danger zone</p>
        <p className="mt-1 text-sm text-red/80">Deleting a station fails safely if departures still reference it.</p>
        <form action={deleteStationAction} className="mt-3">
          <input type="hidden" name="stationId" value={station.id} />
          <Button type="submit" variant="danger">Delete station</Button>
        </form>
      </div>
    </div>
  );
}
