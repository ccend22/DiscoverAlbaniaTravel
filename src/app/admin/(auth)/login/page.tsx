import { loginAdminAction } from "@/app/admin/actions";
import { AlertCircleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-center text-xl font-bold text-white">Sign in to administer the platform</h1>
      <p className="mt-2 text-center text-sm text-white/55">Restricted to Discover Albania staff.</p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-md border border-red/40 bg-red-soft p-3 text-sm text-red">
          <AlertCircleIcon width={16} height={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form
        action={loginAdminAction}
        className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            required
            autoFocus
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Password</span>
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <Button type="submit" className="mt-1 w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
