"use client";

import Link from "next/link";
import { useState } from "react";
import { requestTaxiAction } from "@/app/(site)/taxi/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MapPinIcon } from "@/components/icons";
import type { Dictionary } from "@/lib/dictionary";

function SwapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 7h11m0 0-3.5-3.5M18 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H6m0 0 3.5 3.5M6 17l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TaxiRequestFormProps {
  error?: string;
  minimumDate: string;
  user: { name: string; phone: string | null; email: string } | null;
  dict: Dictionary;
}

export function TaxiRequestForm({ error, minimumDate, user, dict }: TaxiRequestFormProps) {
  const tf = dict.taxiForm;
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [passengers, setPassengers] = useState(1);

  function handleSwap() {
    setPickupLocation(destination);
    setDestination(pickupLocation);
  }

  return (
    <form
      action={requestTaxiAction}
      className="relative z-10 flex animate-fade-up flex-col gap-8 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-lg)] sm:p-8"
    >
      {error && <Alert tone="error">{error}</Alert>}

      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral">
            <MapPinIcon width={15} height={15} />
          </span>
          <h2 className="font-display text-base font-bold text-foreground">{tf.yourJourney}</h2>
        </div>

        <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.pickupLocation}</span>
            <input
              name="pickupLocation"
              required
              minLength={3}
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder={tf.pickupLocationPlaceholder}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal"
            />
          </label>

          <button
            type="button"
            onClick={handleSwap}
            aria-label={tf.swapAria}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:border-teal hover:bg-brand-soft hover:text-teal sm:flex"
          >
            <SwapIcon />
          </button>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.destination}</span>
            <input
              name="destination"
              required
              minLength={3}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={tf.destinationPlaceholder}
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal"
            />
          </label>

          <button
            type="button"
            onClick={handleSwap}
            aria-label={tf.swapAria}
            className="flex h-11 w-11 items-center justify-center justify-self-center rounded-md border border-border bg-surface text-muted transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] hover:border-teal hover:bg-brand-soft hover:text-teal active:bg-brand-soft sm:hidden [&_svg]:rotate-90"
          >
            <SwapIcon />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.pickupDate}</span>
            <input
              name="pickupDate"
              type="date"
              min={minimumDate}
              required
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.pickupTime}</span>
            <input
              name="pickupTime"
              type="time"
              required
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal"
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.passengers}</span>
            <div className="flex min-h-11 items-center justify-between rounded-md border border-border bg-surface px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                disabled={passengers <= 1}
                aria-label={tf.decreasePassengers}
                className="flex h-9 w-9 items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft disabled:opacity-30"
              >
                −
              </button>
              <span className="tabular-nums font-medium">{passengers}</span>
              <button
                type="button"
                onClick={() => setPassengers((p) => Math.min(8, p + 1))}
                disabled={passengers >= 8}
                aria-label={tf.increasePassengers}
                className="flex h-9 w-9 items-center justify-center rounded text-muted transition hover:bg-brand-soft hover:text-teal active:bg-brand-soft disabled:opacity-30"
              >
                +
              </button>
            </div>
            <input type="hidden" name="passengers" value={passengers} />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4.5 20c.9-4 4-6.5 7.5-6.5s6.6 2.5 7.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="font-display text-base font-bold text-foreground">{tf.yourDetails}</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.yourName}</span>
            <input name="passengerName" required minLength={2} autoComplete="name" defaultValue={user?.name ?? ""} className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.phoneNumber}</span>
            <input name="passengerPhone" type="tel" required minLength={6} autoComplete="tel" defaultValue={user?.phone ?? ""} className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{tf.email}</span>
            <input name="passengerEmail" type="email" required autoComplete="email" defaultValue={user?.email ?? ""} className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal" />
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">
            {tf.notesForDriver} <span className="font-normal text-muted">{tf.optional}</span>
          </span>
          <textarea
            name="notes"
            rows={3}
            maxLength={500}
            placeholder={tf.notesPlaceholder}
            className="resize-y rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <Button type="submit" size="md" className="min-w-56">
          {tf.sendRequest}
        </Button>
        {!user && (
          <Link href="/account/signup" className="text-sm font-medium text-teal hover:underline">
            {tf.createAccountLink}
          </Link>
        )}
      </div>
    </form>
  );
}
