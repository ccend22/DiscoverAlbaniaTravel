import Link from "next/link";
import { loginUserAction } from "../actions";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GoogleIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import { PasswordInput } from "@/components/password-input";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const { dict } = await getLocaleAndDictionary();
  const lp = dict.loginPage;

  return (
    <div className="public-page mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20">
      <p className="animate-fade-up text-[11px] font-black uppercase tracking-[0.2em] text-teal">{lp.kicker}</p>
      <h1 className="mt-3 animate-fade-up font-display text-4xl font-black tracking-[-0.035em] text-brand-navy [animation-delay:60ms]">{lp.title}</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">{lp.subtitle}</p>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form action={loginUserAction} className="public-card mt-8 flex animate-fade-up flex-col gap-5 p-6 [animation-delay:140ms] sm:p-8">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{lp.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className="public-input min-h-13 rounded-2xl px-4 py-3"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{lp.password}</span>
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            suppressHydrationWarning
            className="public-input min-h-13 rounded-2xl px-4 py-3"
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
