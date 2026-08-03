import { lookupBookingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getLocaleAndDictionary } from "@/lib/i18n";

interface BookingLookupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function BookingLookupPage({ searchParams }: BookingLookupPageProps) {
  const { error } = await searchParams;
  const { dict } = await getLocaleAndDictionary();
  const bl = dict.bookingLookup;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.1em] text-teal">{bl.kicker}</p>
      <h1 className="mt-2 animate-fade-up font-display text-2xl font-bold text-foreground [animation-delay:60ms]">{bl.title}</h1>
      <p className="mt-2 animate-fade-up text-sm text-muted [animation-delay:120ms]">
        {bl.subtitle}
      </p>
      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <form action={lookupBookingAction} className="mt-6 flex animate-fade-up flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)] [animation-delay:160ms] sm:p-6">
        <input
          name="reference"
          required
          placeholder={bl.referencePlaceholder}
          className="rounded-md border border-border bg-background px-3 py-2 uppercase outline-none placeholder:normal-case focus:border-teal"
        />
        <Button type="submit">{bl.findBooking}</Button>
      </form>
    </div>
  );
}
