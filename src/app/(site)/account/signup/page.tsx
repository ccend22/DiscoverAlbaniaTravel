import Link from "next/link";
import { signupUserAction } from "../actions";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GoogleIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;
  const { dict } = await getLocaleAndDictionary();
  const sp = dict.signupPage;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{sp.kicker}</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">{sp.title}</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">
        {sp.subtitle}
      </p>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form action={signupUserAction} className="mt-6 flex animate-fade-up flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] [animation-delay:140ms] sm:p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{sp.fullName}</span>
          <input
            name="name"
            required
            minLength={2}
            autoComplete="name"
            suppressHydrationWarning
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{sp.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{sp.phone}</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            suppressHydrationWarning
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{sp.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            suppressHydrationWarning
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <Button type="submit">{sp.createAccount}</Button>

        <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {sp.orDivider}
          <span className="h-px flex-1 bg-border" />
        </div>

        <LinkButton href="/account/google" variant="outline" className="w-full" native>
          <GoogleIcon />
          {sp.continueWithGoogle}
        </LinkButton>
      </form>

      <p className="mt-6 text-sm text-muted">
        {sp.alreadyHaveAccount}{" "}
        <Link href="/account/login" className="text-teal underline">
          {sp.signIn}
        </Link>
      </p>
    </div>
  );
}
