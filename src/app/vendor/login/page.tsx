import Link from "next/link";
import { loginVendorAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface VendorLoginPageProps {
  searchParams: Promise<{ error?: string; pending?: string }>;
}

export default async function VendorLoginPage({ searchParams }: VendorLoginPageProps) {
  const { error, pending } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-teal underline">
        Back to search
      </Link>
      <p className="mt-6 animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">Bus operations</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">Vendor sign in</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">
        Manage your operator profile and public departures.
      </p>

      {pending && (
        <div className="mt-5">
          <Alert tone="success">
            Application received. An admin needs to approve your company before you can sign in.
          </Alert>
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form action={loginVendorAction} className="mt-6 flex animate-fade-up flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] [animation-delay:140ms] sm:p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            suppressHydrationWarning
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <Button type="submit">Sign in</Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/vendor/signup" className="text-teal underline">
          Apply here
        </Link>
      </p>
    </div>
  );
}
