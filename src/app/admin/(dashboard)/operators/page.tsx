import { listAllOperators } from "@/db/queries/vendors";
import { AdminOperatorsTable } from "@/components/admin-operators-table";
import { LinkButton } from "@/components/ui/button";

export default async function AdminOperatorsPage() {
  const operatorsList = await listAllOperators();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Operators</h1>
        <LinkButton href="/admin/operators/new" size="sm">
          New operator
        </LinkButton>
      </div>

      <div className="mt-6">
        <AdminOperatorsTable operators={operatorsList} />
      </div>
    </div>
  );
}
