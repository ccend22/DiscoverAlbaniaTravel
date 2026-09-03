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
        className="relative inline-flex w-full rounded-full bg-[#edf4f3] p-1 text-sm sm:w-fit"
        role="group"
        aria-label="Mënyra e regjistrimit"
      >
        <span
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-brand-deep shadow-sm transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] ${
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
          Kompania ime është e listuar
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          aria-pressed={mode === "new"}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2.5 font-medium transition-colors duration-[var(--dur-base)] ${
            mode === "new" ? "text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          Regjistro një kompani të re
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
          className="public-card mt-6 flex flex-col gap-5 p-5 sm:p-6"
        >
          <input type="hidden" name="operatorId" value={selected?.id ?? ""} suppressHydrationWarning />

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                <BuildingIcon width={15} height={15} />
              </span>
              <h2 className="font-display text-base font-bold text-foreground">Gjej kompaninë tënde</h2>
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
                placeholder="Kërko sipas emrit të kompanisë ose qytetit"
                suppressHydrationWarning
                className="public-input min-h-11 w-full py-2 pl-9 pr-3 text-base"
              />
            </label>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted">Asnjë kompani e paregjistruar nuk përputhet me këtë kërkim.</p>
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
            {!selected && <p className="mt-2 text-xs text-muted">Zgjidh kompaninë tënde nga lista më sipër.</p>}
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="font-display text-base font-bold text-foreground">Të dhënat e tua</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Emri yt i plotë</span>
                <input name="name" required minLength={2} autoComplete="name" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input name="email" type="email" required autoComplete="email" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Fjalëkalimi</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <Button type="submit" disabled={!selected}>
            Dërgo aplikimin
          </Button>
        </form>
      ) : (
        <form
          action={newOperatorAction}
          className="public-card mt-6 flex flex-col gap-5 p-5 sm:p-6"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                <BuildingIcon width={15} height={15} />
              </span>
              <h2 className="font-display text-base font-bold text-foreground">Të dhënat e kompanisë</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Emri i kompanisë</span>
                <input name="operatorName" required minLength={2} autoComplete="organization" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">NIPT / numri tatimor</span>
                <input name="vat" required minLength={3} suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Telefoni</span>
                <input name="phone" type="tel" autoComplete="tel" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Rruga</span>
                <input name="street" autoComplete="street-address" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Qyteti</span>
                <input name="city" autoComplete="address-level2" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="font-display text-base font-bold text-foreground">Të dhënat e tua</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-foreground">Emri yt i plotë</span>
                <input name="name" required minLength={2} autoComplete="name" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input name="email" type="email" required autoComplete="email" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Fjalëkalimi</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" suppressHydrationWarning className="min-h-11 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-teal" />
              </label>
            </div>
          </div>

          <Button type="submit">Dërgo aplikimin</Button>
        </form>
      )}
    </div>
  );
}
