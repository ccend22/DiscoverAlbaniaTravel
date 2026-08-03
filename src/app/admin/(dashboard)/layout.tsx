import { requireAdminSession } from "@/lib/admin-session";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
