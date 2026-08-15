"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createBookingAction, type CreateBookingActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ChevronLeftIcon } from "@/components/icons";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
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

  useBodyScrollLock(showCheckout);

  useEffect(() => {
    if (!showCheckout) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDismissed(true);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showCheckout]);

  if (showCheckout) {
    // A hosted third-party checkout page (POK's own branding, colors, and
    // layout -- an iframe can't be restyled to match the site) reads as
    // broken when it's inline in the page's own content flow, competing
    // directly with the site's look. Presenting it as its own full-screen
    // sheet -- the same modal language this app already uses for the date
    // and location pickers -- sets the opposite expectation instead: this is
    // a distinct, secure step, not a mis-styled part of the page.
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
        <div
          className="animate-sheet-fade fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]"
          aria-hidden="true"
          {...tapToDismiss(() => setDismissed(true))}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={bp.completePaymentHeading}
          className="animate-sheet-up relative flex h-[min(720px,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-white/70 bg-surface shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:animate-fade-up sm:h-[min(720px,92dvh)] sm:rounded-[2rem]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex shrink-0 items-center border-b border-border bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              {...tapToDismiss(() => setDismissed(true))}
              className="flex items-center gap-1 rounded-full py-1 pr-2 text-sm font-medium text-teal"
            >
              <ChevronLeftIcon width={18} height={18} />
              {bp.goBack}
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
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
              src={state.confirmUrl}
              title={bp.completePaymentHeading}
              onLoad={() => setIframeLoaded(true)}
              className={`h-full w-full transition-opacity duration-[var(--dur-base)] ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>
      </div>,
      document.body
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
