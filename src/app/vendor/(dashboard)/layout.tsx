import { requireVendorSession } from "@/lib/vendor-session";
import { VendorSidebar } from "@/components/vendor-sidebar";

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireVendorSession();

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <VendorSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
