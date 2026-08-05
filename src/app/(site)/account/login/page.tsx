import Link from "next/link";
import { loginUserAction } from "../actions";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GoogleIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const { dict } = await getLocaleAndDictionary();
  const lp = dict.loginPage;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{lp.kicker}</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">{lp.title}</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">{lp.subtitle}</p>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form action={loginUserAction} className="mt-6 flex animate-fade-up flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] [animation-delay:140ms] sm:p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{lp.email}</span>
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
          <span className="font-medium text-foreground">{lp.password}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            suppressHydrationWarning
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <Button type="submit">{lp.signIn}</Button>

        <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {lp.orDivider}
          <span className="h-px flex-1 bg-border" />
        </div>

        <LinkButton href="/account/google" variant="outline" className="w-full" native>
          <GoogleIcon />
          {lp.continueWithGoogle}
        </LinkButton>
      </form>

      <p className="mt-6 text-sm text-muted">
        {lp.noAccount}{" "}
        <Link href="/account/signup" className="text-teal underline">
          {lp.createOne}
        </Link>
      </p>
    </div>
  );
}
