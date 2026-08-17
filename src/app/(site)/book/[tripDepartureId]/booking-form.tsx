"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBookingAction, type CreateBookingActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ChevronLeftIcon } from "@/components/icons";
import type { Dictionary } from "@/lib/dictionary";

interface BookingFormProps {
  tripDepartureId: number;
  date: string;
  defaultSeats: number;
  profile: { name: string; email: string; phone: string | null } | null;
  bp: Dictionary["bookPage"];
}

const initialState: CreateBookingActionState = { status: "idle" };

export function BookingForm({ tripDepartureId, date, defaultSeats, profile, bp }: BookingFormProps) {
  const [state, formAction, isPending] = useActionState(createBookingAction, initialState);
  const [dismissed, setDismissed] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [devOverrideSrc, setDevOverrideSrc] = useState<string | null>(null);
  const router = useRouter();
  const showCheckout = state.status === "checkout" && !dismissed;

  useEffect(() => {
    if (state.status !== "checkout") return;
    const bookingReference = state.bookingReference;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "pok-payment-return") return;
      if (event.data.bookingReference === bookingReference) {
        router.push(`/booking/${bookingReference}`);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [state, router]);

  if (showCheckout) {
    return (
      <div className="public-card flex animate-fade-up flex-col gap-2 p-3 sm:gap-3 sm:p-8">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-sm font-medium text-teal"
        >
          <ChevronLeftIcon width={18} height={18} />
          {bp.goBack}
        </button>
        <div className="relative h-[1010px] overflow-hidden rounded-[1.25rem] border border-[var(--page-line)] sm:h-[840px]">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col gap-3 bg-surface p-4" aria-busy="true" aria-live="polite">
              <span className="sr-only">{bp.loadingPayment}</span>
              <div className="h-16 w-full animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-12 w-full animate-pulse rounded-full bg-surface-sunken" />
              <div className="mt-1 flex flex-col gap-3">
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
                <div className="flex gap-3">
                  <div className="h-14 w-1/2 animate-pulse rounded-xl bg-surface-sunken" />
                  <div className="h-14 w-1/2 animate-pulse rounded-xl bg-surface-sunken" />
                </div>
                <div className="h-14 w-full animate-pulse rounded-xl bg-surface-sunken" />
              </div>
              <div className="mt-auto h-12 w-full animate-pulse rounded-full bg-surface-sunken" />
            </div>
          )}
          <iframe
            src={devOverrideSrc ?? state.confirmUrl}
            title={bp.completePaymentHeading}
            allow="payment"
            onLoad={() => setIframeLoaded(true)}
            className={`h-full w-full transition-opacity duration-[var(--dur-base)] ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={() =>
              setDevOverrideSrc(`/pay/return?ref=${encodeURIComponent(state.bookingReference)}&embedded=1&dev=1`)
            }
            className="mt-1 rounded-xl border border-dashed border-warning/50 bg-warning-soft px-3 py-2 text-xs font-medium text-warning"
          >
            Dev only: simulate payment success (no real charge)
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="public-card flex flex-col gap-5 p-6 sm:p-8">
      <input type="hidden" name="tripDepartureId" value={tripDepartureId} />
      <input type="hidden" name="travelDate" value={date} />

      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">{bp.fullName}</span>
          <input
            name="passengerName"
            required
            minLength={2}
            autoComplete="name"
            defaultValue={profile?.name}
            className="public-input min-h-13 rounded-2xl px-4 py-3"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{bp.phone}</span>
          <input
            name="passengerPhone"
            required
            type="tel"
            minLength={6}
            autoComplete="tel"
            defaultValue={profile?.phone ?? undefined}
            className="public-input min-h-13 rounded-2xl px-4 py-3"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{bp.email}</span>
          <input
            name="passengerEmail"
            required
            type="email"
            autoComplete="email"
            defaultValue={profile?.email}
            className="public-input min-h-13 rounded-2xl px-4 py-3"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">{bp.seats}</span>
          <input
            name="seats"
            required
            type="number"
            min={1}
            max={9}
            defaultValue={defaultSeats}
            className="public-input min-h-13 w-24 rounded-2xl px-4 py-3"
          />
        </label>
      </div>

      <Button type="submit" className="mt-2" disabled={isPending}>
        {isPending ? bp.startingPayment : bp.continueToPayment}
      </Button>
      <p className="text-xs text-muted">{bp.paymentNote}</p>
    </form>
  );
}
