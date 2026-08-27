import { requireVendorSession } from "@/lib/vendor-session";
import { getVendorContext } from "@/db/queries/vendors";
import { VendorSidebar } from "@/components/vendor-sidebar";

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const vendorUserId = await requireVendorSession();
  // Not-yet-approved vendors can still reach this layout before the page
  // itself redirects them -- render the sidebar with no elevated access
  // rather than crash on a null context.
  const context = await getVendorContext(vendorUserId);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <VendorSidebar isOwner={context?.isOwner ?? false} permissions={context?.permissions ?? []} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
