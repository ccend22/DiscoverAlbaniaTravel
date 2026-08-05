"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SearchIcon, MapPinIcon, BuildingIcon } from "@/components/icons";
import type { ClaimableOperator } from "@/db/queries/vendors";

type Mode = "claim" | "new";

interface VendorSignupFormProps {
  operators: ClaimableOperator[];
  defaultMode: Mode;
  error?: string;
  claimAction: (formData: FormData) => void;
  newOperatorAction: (formData: FormData) => void;
}

export function VendorSignupForm({ operators, defaultMode, error, claimAction, newOperatorAction }: VendorSignupFormProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClaimableOperator | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operators.slice(0, 30);
    return operators.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.city ?? "").toLowerCase().includes(q)
    );
  }, [operators, query]);

  return (
    <div>
      <div
        className="relative inline-flex w-full rounded-lg bg-surface-sunken p-1 text-sm shadow-inner sm:w-fit"
        role="group"
        aria-label="Signup mode"
      >
        <span
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-brand shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] ${
            mode === "new" ? "translate-x-full" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => setMode("claim")}
          aria-pressed={mode === "claim"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2.5 font-medium transition-colors duration-[var(--dur-base)] ${
            mode === "claim" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          My company is listed
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          aria-pressed={mode === "new"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2.5 font-medium transition-colors duration-[var(--dur-base)] ${
            mode === "new" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          Register a new company
        </button>
      </div>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {mode === "claim" ? (
        <form
          action={claimAction}
          className="mt-6 flex flex-col gap-5 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6"
        >
          <input type="hidden" name="operatorId" value={selected?.id ?? ""} suppressHydrationWarning />

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                <BuildingIcon width={15} height={15} />
              </span>
              <h2 className="font-display text-base font-bold text-foreground">Find your company</h2>
            </div>

            <label className="relative mt-4 block">
              <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Search by company name or city"
                suppressHydrationWarning
                className="min-h-11 w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-base outline-none focus:border-teal"
              />
            </label>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted">No unclaimed company matches that search.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((operator) => (
                    <li key={operator.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(operator)}
                        className={`flex min-h-12 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors duration-[var(--dur-fast)] ${
                          selected?.id === operator.id ? "bg-teal-soft text-teal" : "hover:bg-surface-sunken"
                        }`}
                      >
                        <MapPinIcon width={14} height={14} className="shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate">
                          {operator.name}
                          {operator.city && <span className="text-muted"> · {operator.city}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!selected && <p className="mt-2 text-xs text-muted">Select your company from the list above.</p>}
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="font-display text-base font-bold text-foreground">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Your full name</span>
                <input name="name" required minLength={2} autoComplete="name" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input name="email" type="email" required autoComplete="email" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Password</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <Button type="submit" disabled={!selected}>
            Submit application
          </Button>
        </form>
      ) : (
        <form
          action={newOperatorAction}
          className="mt-6 flex flex-col gap-5 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                <BuildingIcon width={15} height={15} />
              </span>
              <h2 className="font-display text-base font-bold text-foreground">Company details</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Company name</span>
                <input name="operatorName" required minLength={2} autoComplete="organization" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">VAT / tax number</span>
                <input name="vat" required minLength={3} suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Phone</span>
                <input name="phone" type="tel" autoComplete="tel" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Street</span>
                <input name="street" autoComplete="street-address" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">City</span>
                <input name="city" autoComplete="address-level2" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="font-display text-base font-bold text-foreground">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Your full name</span>
                <input name="name" required minLength={2} autoComplete="name" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input name="email" type="email" required autoComplete="email" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Password</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <Button type="submit">Submit application</Button>
        </form>
      )}
    </div>
  );
}
