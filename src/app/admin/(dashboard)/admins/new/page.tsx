import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { createAdminUserAction } from "../actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";

export default async function NewAdminUserPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/admins" className="text-sm text-teal hover:underline">← Back to admins</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New admin account</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={createAdminUserAction} className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Name</span><input name="name" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Email</span><input name="email" type="email" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Password</span><PasswordInput name="password" required minLength={8} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <div><Button type="submit">Create admin</Button></div>
      </form>
    </div>
  );
}
