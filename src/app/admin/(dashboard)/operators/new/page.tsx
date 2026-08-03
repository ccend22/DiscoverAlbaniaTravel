import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { createAdminOperatorAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export default async function NewOperatorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/operators" className="text-sm text-teal hover:underline">← Back to operators</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New operator</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={createAdminOperatorAction} className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">Name</span><input name="name" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="font-medium">VAT / tax number</span><input name="vat" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Phone</span><input name="phone" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Street</span><input name="street" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">City</span><input name="city" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <div className="sm:col-span-2"><Button type="submit">Create operator</Button></div>
      </form>
    </div>
  );
}
