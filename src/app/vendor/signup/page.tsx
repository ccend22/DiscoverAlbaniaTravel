import Link from "next/link";
import { listClaimableOperators } from "@/db/queries/vendors";
import { VendorSignupForm } from "@/components/vendor-signup-form";
import { signupClaimOperatorAction, signupNewOperatorAction } from "../actions";

interface VendorSignupPageProps {
  searchParams: Promise<{ mode?: string; error?: string }>;
}

export default async function VendorSignupPage({ searchParams }: VendorSignupPageProps) {
  const [operators, { mode, error }] = await Promise.all([listClaimableOperators(), searchParams]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/vendor/login" className="text-sm text-teal underline">
        Back to sign in
      </Link>
      <p className="mt-6 animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">Bus operations</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">
        Apply for a vendor account
      </h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:100ms]">
        Tell us about your company. An admin reviews every application before it can sign in.
      </p>

      <div className="mt-6 animate-fade-up [animation-delay:140ms]">
        <VendorSignupForm
          operators={operators}
          defaultMode={mode === "new" ? "new" : "claim"}
          error={error}
          claimAction={signupClaimOperatorAction}
          newOperatorAction={signupNewOperatorAction}
        />
      </div>
    </div>
  );
}
