import Link from "next/link";
import { loginVendorAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/password-input";

interface VendorLoginPageProps {
  searchParams: Promise<{ error?: string; pending?: string }>;
}

export default async function VendorLoginPage({ searchParams }: VendorLoginPageProps) {
  const { error, pending } = await searchParams;

  return (
    <div className="public-page mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-teal underline">
        Kthehu te kërkimi
      </Link>
      <p className="mt-6 animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">Operator autobusësh</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">Hyrje për operatorë</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">
        Menaxho profilin e operatorit dhe nisjet publike.
      </p>

      {pending && (
        <div className="mt-5">
          <Alert tone="success">
            Aplikimi u pranua. Një administrator duhet të aprovojë kompaninë tënde përpara se të mund të hysh.
          </Alert>
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form action={loginVendorAction} className="public-card mt-6 flex animate-fade-up flex-col gap-4 p-5 [animation-delay:140ms] sm:p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className="public-input min-h-11 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Fjalëkalimi</span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            suppressHydrationWarning
            className="public-input min-h-11 px-3 py-2"
          />
        </label>
        <Button type="submit">Hyr</Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Nuk ke llogari?{" "}
        <Link href="/vendor/signup" className="text-teal underline">
          Apliko këtu
        </Link>
      </p>
    </div>
  );
}
