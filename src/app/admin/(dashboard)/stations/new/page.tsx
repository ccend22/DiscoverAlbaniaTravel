import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { createStationAction } from "../actions";
import { Button } from "@/components/ui/button";

export default async function NewStationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/stations" className="text-sm text-teal hover:underline">← Back to stations</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New station</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={createStationAction} className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Name</span><input name="name" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Code</span><input name="code" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">City</span><input name="city" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Address <span className="font-normal text-muted">(optional)</span></span><input name="address" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Latitude</span><input name="latitude" type="number" step="any" required placeholder="41.327500" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Longitude</span><input name="longitude" type="number" step="any" required placeholder="19.818900" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Category</span>
          <select name="category" defaultValue="terminus" className="rounded-md border border-border bg-background px-3 py-2">
            <option value="terminus">Terminus</option>
            <option value="intermediate">Intermediate stop</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Description <span className="font-normal text-muted">(optional)</span></span><textarea name="description" rows={3} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Photos <span className="font-normal text-muted">(one URL per line, optional)</span></span><textarea name="photoUrls" rows={3} placeholder="https://..." className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <div className="sm:col-span-2"><Button type="submit">Create station</Button></div>
      </form>
    </div>
  );
}
