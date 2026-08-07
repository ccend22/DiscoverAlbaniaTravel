"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import type { AdminOperatorRow } from "@/db/queries/vendors";
import Link from "next/link";

export function AdminOperatorsTable({ operators }: { operators: AdminOperatorRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.vat.toLowerCase().includes(q) ||
        (o.city ?? "").toLowerCase().includes(q)
    );
  }, [operators, query]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Showing {filtered.length} of {operators.length} operators
        </p>
        <label className="relative w-full sm:w-72">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search operator, VAT, or city"
            aria-label="Search operators"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Operator</th>
              <th className="px-4 py-3 font-medium">VAT</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Routes</th>
              <th className="px-4 py-3"><span className="sr-only">Manage</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((operator) => (
              <tr key={operator.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{operator.name}</td>
                <td className="px-4 py-3 text-muted">{operator.vat}</td>
                <td className="px-4 py-3 text-muted">{operator.city ?? "Not available"}</td>
                <td className="px-4 py-3 text-muted">{operator.phone ?? "Not available"}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{operator.routeCount}</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/operators/${operator.id}`} className="group inline-flex items-center gap-1 text-sm font-medium text-teal"><span className="relative">Manage<span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" /></span></Link></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No operators match &quot;{query}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
