import { redirect } from "next/navigation";
import { getVendorContext } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateVendorOperatorAction } from "../../actions";

export default async function VendorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [context, params] = await Promise.all([getVendorContext(vendorUserId), searchParams]);
  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Profili i operatorit</h1>
      {params.saved && (
        <div className="mt-6">
          <Alert tone="success">Ndryshimet u ruajtën.</Alert>
        </div>
      )}
      {params.error && (
        <div className="mt-6">
          <Alert tone="error">{params.error}</Alert>
        </div>
      )}
      <form
        action={updateVendorOperatorAction}
        className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Emri i operatorit</span>
          <input
            name="name"
            required
            defaultValue={context.operatorName}
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Telefoni</span>
          <input
            name="phone"
            defaultValue={context.operatorPhone ?? ""}
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={context.operatorEmail ?? ""}
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Rruga</span>
          <input
            name="street"
            defaultValue={context.operatorStreet ?? ""}
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Qyteti</span>
          <input
            name="city"
            defaultValue={context.operatorCity ?? ""}
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Ruaj operatorin</Button>
        </div>
      </form>
    </div>
  );
}
