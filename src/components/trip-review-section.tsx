"use client";

import { useActionState, useState } from "react";
import {
  submitTripReviewAction,
  submitTripReportAction,
  type ReviewActionState,
  type ReportActionState,
} from "@/app/(site)/booking/[reference]/actions";
import { Button } from "@/components/ui/button";

const STARS = [1, 2, 3, 4, 5];

function StarRatingForm({ reference, initialRating }: { reference: string; initialRating: number | null }) {
  const [state, formAction, isPending] = useActionState<ReviewActionState, FormData>(
    submitTripReviewAction.bind(null, reference),
    { status: "idle" }
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState(initialRating ?? 0);

  const submitted = state.status === "success" || initialRating !== null;

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="rating" value={selected} />
      <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
        {STARS.map((star) => {
          const filled = (hovered ?? selected) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={isPending}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onMouseEnter={() => setHovered(star)}
              onClick={() => setSelected(star)}
              className="p-0.5 text-2xl leading-none transition-transform hover:scale-110"
            >
              <span className={filled ? "text-gold" : "text-border"}>★</span>
            </button>
          );
        })}
      </div>
      {selected > 0 && (
        <Button type="submit" size="sm" disabled={isPending}>
          {submitted && state.status !== "error" ? "Update rating" : "Submit rating"}
        </Button>
      )}
      {state.status === "success" && <p className="text-xs text-success">Thanks for rating your trip.</p>}
      {state.status === "error" && <p className="text-xs text-red">{state.message}</p>}
    </form>
  );
}

function ReportForm({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ReportActionState, FormData>(
    submitTripReportAction.bind(null, reference),
    { status: "idle" }
  );

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-muted underline hover:text-foreground">
        Report an issue with this trip
      </button>
    );
  }

  if (state.status === "success") {
    return <p className="text-sm text-success">Thanks -- your report was sent to the operator and to us.</p>;
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-surface-sunken p-4">
      <p className="text-sm font-medium text-foreground">Report an issue</p>
      <p className="text-xs text-muted">Sent privately to the operator and to Discover Albania -- not shown publicly.</p>
      <input name="reporterName" placeholder="Your name" required className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <input name="reporterEmail" type="email" placeholder="Your email" required className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <textarea name="message" placeholder="What happened?" required rows={3} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
      {state.status === "error" && <p className="text-xs text-red">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Send report</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function TripReviewSection({ reference, initialRating }: { reference: string; initialRating: number | null }) {
  return (
    <div className="public-card mt-4 animate-fade-up p-5 sm:p-6">
      <p className="text-sm font-semibold text-foreground">Rate your trip</p>
      <div className="mt-2">
        <StarRatingForm reference={reference} initialRating={initialRating} />
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <ReportForm reference={reference} />
      </div>
    </div>
  );
}
