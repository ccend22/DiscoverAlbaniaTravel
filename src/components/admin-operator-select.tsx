"use client";

import { useRouter } from "next/navigation";

export function AdminOperatorSelect({
  operators,
  selectedOperatorId,
}: {
  operators: { id: number; name: string }[];
  selectedOperatorId: number | null;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={selectedOperatorId ?? ""}
      onChange={(e) => router.push(`/admin/calendar?operatorId=${e.target.value}`)}
      className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm"
    >
      <option value="" disabled>
        Choose an operator
      </option>
      {operators.map((operator) => (
        <option key={operator.id} value={operator.id}>{operator.name}</option>
      ))}
    </select>
  );
}
